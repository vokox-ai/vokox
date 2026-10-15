import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir, rename, stat } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { ApiClient, ApiError, outputName } from "./client.js";
import type { Asset, ComposeTimeline, Job, JobInput, JobStatus, JobType } from "./types.js";

/**
 * A plan is one JSON file an agent writes once; the CLI resolves dependencies,
 * prices everything up front, enforces a credit budget and runs steps in parallel.
 *
 * Reference syntax inside a step: "@stepId" → the first output asset of that step,
 * "@stepId[2]" → the third asset, "file:./path.png" → upload a local file.
 */
export interface PlanStep extends JobInput {
  id: string;
  type: JobType;
  /** Human note for the manifest; ignored by the API. */
  note?: string;
}

export interface Plan {
  version?: number;
  name?: string;
  out?: string;
  budget?: { maxCredits?: number };
  defaults?: Partial<JobInput>;
  steps: PlanStep[];
}

export interface StepRecord {
  id: string;
  type: JobType;
  /** Hash of the step definition: a changed step is re-run on the next `run`. */
  hash?: string;
  /** Bumped only after the job itself failed or was canceled; the same attempt reuses the idempotency key. */
  attempt?: number;
  jobId?: string;
  /** Last seen status of `jobId`: anything but failed/canceled is re-attached on the next run instead of paid again. */
  jobStatus?: JobStatus;
  /** Hash of the resolved input (asset ids included) the job was submitted with. */
  inputHash?: string;
  status: "pending" | "skipped" | "succeeded" | "failed";
  credits?: number;
  assets?: Asset[];
  files?: string[];
  /** Local 3×2 frame sheet of a video step, for review. */
  preview?: string;
  shareUrl?: string;
  error?: string;
}

export interface Manifest {
  plan: string;
  startedAt: string;
  updatedAt: string;
  totalCredits: number;
  /** Share link of the plan's last step: what the user gets. */
  shareUrl?: string;
  steps: Record<string, StepRecord>;
  /** Keyed by "<path>|<size>|<mtime>": an edited file is uploaded again. */
  uploads: Record<string, Asset & { uploadedAt?: string }>;
}

const REF = /^@([A-Za-z0-9_-]+)(?:\[(\d+)\])?$/u;
const TYPES: JobType[] = ["image", "video", "gif", "music", "tts", "transcribe", "compose", "recreate"]; // analyze and plan are whole workflows, not plan steps

export async function loadPlan(path: string): Promise<{ plan: Plan; baseDir: string; path: string }> {
  const abs = resolve(path);
  const plan = JSON.parse(await readFile(abs, "utf8")) as Plan;
  validatePlan(plan);
  return { plan, baseDir: dirname(abs), path: abs };
}

export function validatePlan(plan: Plan): void {
  if (!plan || !Array.isArray(plan.steps) || plan.steps.length === 0) throw new Error("plan.steps must be a non-empty array");
  const seen = new Set<string>();
  for (const step of plan.steps) {
    if (!step.id || !/^[A-Za-z0-9_-]+$/u.test(step.id)) throw new Error(`step id "${step.id}" must match [A-Za-z0-9_-]+`);
    if (seen.has(step.id)) throw new Error(`duplicate step id "${step.id}"`);
    if (!TYPES.includes(step.type)) throw new Error(`step "${step.id}": unknown type "${step.type}"`);
    for (const ref of collectRefs(step)) {
      const m = REF.exec(ref);
      if (m && !seen.has(m[1])) throw new Error(`step "${step.id}" references "@${m[1]}" which is not defined earlier in the plan`);
    }
    if (step.type === "compose" && !step.timeline) throw new Error(`step "${step.id}": compose needs "timeline"`);
    if ((step.type === "image" || step.type === "video" || step.type === "gif" || step.type === "music") && !step.prompt) {
      throw new Error(`step "${step.id}": ${step.type} needs "prompt"`);
    }
    if (step.type === "tts" && !step.text) throw new Error(`step "${step.id}": tts needs "text"`);
    seen.add(step.id);
  }
  const cap = plan.budget?.maxCredits;
  if (cap !== undefined && (typeof cap !== "number" || !Number.isFinite(cap) || cap < 0)) throw new Error("budget.maxCredits must be a number ≥ 0");
}

/** Every string that may be a reference: refs[], and asset fields inside a compose timeline. */
export function collectRefs(step: PlanStep): string[] {
  const out: string[] = [...(step.refs ?? [])];
  const t = step.timeline;
  if (t) {
    for (const c of t.clips ?? []) out.push(c.asset);
    if (t.voice) out.push(t.voice.asset);
    if (t.music) out.push(t.music.asset);
    if (t.captions?.from) out.push(t.captions.from);
  }
  return out.filter((v) => typeof v === "string");
}

export function dependencies(step: PlanStep): string[] {
  const deps = new Set<string>();
  for (const ref of collectRefs(step)) { const m = REF.exec(ref); if (m) deps.add(m[1]); }
  return [...deps];
}

export interface RunOptions {
  client: ApiClient;
  plan: Plan;
  baseDir: string;
  planPath: string;
  outDir: string;
  maxCredits?: number;
  concurrency?: number;
  force?: boolean;
  onEvent?: (event: RunEvent) => void;
}

export type RunEvent =
  | { kind: "estimate"; stepId: string; credits: number; model: string }
  | { kind: "upload"; path: string; asset: Asset }
  | { kind: "submit"; stepId: string; job: Job }
  | { kind: "resume"; stepId: string; jobId: string }
  | { kind: "progress"; stepId: string; job: Job }
  | { kind: "done"; stepId: string; job: Job; files: string[] }
  | { kind: "skip"; stepId: string }
  | { kind: "error"; stepId: string; error: Error };

/**
 * Plan defaults only reach the steps they make sense for: a video "720p" or a 5 s duration must not land on an
 * image, a music track or a voice-over (the API would reject or misprice them).
 */
function defaultsFor(type: string, defaults: Partial<JobInput> | undefined): Partial<JobInput> {
  if (!defaults) return {};
  const d = defaults as Record<string, unknown>;
  const pick = (...keys: string[]) => Object.fromEntries(keys.filter((k) => d[k] !== undefined).map((k) => [k, d[k]])) as Partial<JobInput>;
  switch (type) {
    case "video": case "gif": return { ...defaults };
    case "image": return pick("aspectRatio", ...(typeof d.resolution === "string" && /k$/iu.test(d.resolution) ? ["resolution"] : []));
    case "tts": return pick("language", "voice");
    case "compose": return pick("aspectRatio");
    default: return {};
  }
}

function stepInput(step: PlanStep, defaults: Partial<JobInput> | undefined): JobInput {
  const { id: _id, type, note: _note, ...rest } = step;
  return { ...defaultsFor(type, defaults), ...rest } as JobInput;
}

export function stepHash(step: PlanStep, defaults: Partial<JobInput> | undefined): string {
  return createHash("sha256").update(JSON.stringify({ type: step.type, input: stepInput(step, defaults) })).digest("hex").slice(0, 16);
}

/** Price every step without executing anything. Refs are not needed for pricing. */
export async function estimatePlan(client: ApiClient, plan: Plan): Promise<{ total: number; steps: { id: string; credits: number; model: string }[] }> {
  const steps: { id: string; credits: number; model: string }[] = [];
  let total = 0;
  for (const step of plan.steps) {
    const input = stepInput(step, plan.defaults);
    const price = await client.price({ type: step.type, input: stripRefs(input) });
    steps.push({ id: step.id, credits: price.credits, model: price.model });
    total += price.credits;
  }
  return { total, steps };
}

function stripRefs(input: JobInput): JobInput {
  // Pricing must not require uploads; keep counts so the server can price ref-dependent models.
  const { refs, timeline, ...rest } = input;
  return { ...rest, ...(refs ? { params: { ...(rest.params ?? {}), refCount: refs.length } } : {}), ...(timeline ? { timeline } : {}) };
}

/** Assets expire after 90 days; an upload older than this is sent again rather than referenced after deletion. */
const UPLOAD_TTL_MS = 85 * 86_400_000;

/** Missing → a fresh run. Unreadable → stop: the manifest is the record of what was paid for. */
async function readManifest(path: string): Promise<Manifest | undefined> {
  let text: string;
  try { text = await readFile(path, "utf8"); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined; throw error; }
  let manifest: Manifest;
  try {
    manifest = JSON.parse(text) as Manifest;
    if (!manifest || typeof manifest !== "object" || !manifest.steps || typeof manifest.steps !== "object") throw new Error("no \"steps\"");
  } catch (error) {
    throw new Error(`manifest ${path} is corrupt (${(error as Error).message}). It records the jobs already paid for, so the run stops instead of starting over: fix or move the file, or pass --force to redo (and pay for) every step.`);
  }
  manifest.uploads ??= {};
  manifest.totalCredits ??= 0;
  return manifest;
}

const failedJob = (rec: StepRecord | undefined) => rec?.jobStatus === "failed" || rec?.jobStatus === "canceled";

/**
 * Which steps are already done and which can re-attach to a job submitted by an interrupted run.
 * Mutates the manifest records of steps that must be redone.
 */
function prepare(plan: Plan, manifest: Manifest): { assetsByStep: Map<string, Asset[]>; reattach: Set<string> } {
  const assetsByStep = new Map<string, Asset[]>();
  const byId = new Map(plan.steps.map((s) => [s.id, s]));
  // The old job's result is not wanted any more; with an identical input the same key still finds it at no cost.
  const redo = (rec: StepRecord) => { rec.status = "pending"; delete rec.jobId; delete rec.jobStatus; delete rec.inputHash; };
  for (const [id, rec] of Object.entries(manifest.steps)) {
    const step = byId.get(id);
    if (rec.status === "succeeded" && rec.assets && step && rec.hash === stepHash(step, plan.defaults)) assetsByStep.set(id, rec.assets);
    else if (rec.status === "succeeded") redo(rec); // changed or removed step → redo
  }
  // A step whose dependency will be redone must be redone too.
  for (const step of plan.steps) if (assetsByStep.has(step.id) && dependencies(step).some((d) => !assetsByStep.has(d))) { assetsByStep.delete(step.id); redo(manifest.steps[step.id]); }
  // A submitted job that did not fail is still ours (paid or held): poll it instead of paying again, unless an
  // upstream step is redone (its new output would make this job stale; runStep re-checks the resolved input).
  const reattach = new Set<string>();
  for (const step of plan.steps) {
    const rec = manifest.steps[step.id];
    if (assetsByStep.has(step.id) || !rec?.jobId || failedJob(rec) || rec.hash !== stepHash(step, plan.defaults)) continue;
    if (dependencies(step).every((d) => assetsByStep.has(d) || reattach.has(d))) reattach.add(step.id);
  }
  return { assetsByStep, reattach };
}

/** For `run --estimate`: the steps a run would pay for now (not done, not re-attached), given the manifest in outDir. */
export async function stepsToPay(plan: Plan, outDir: string, force?: boolean): Promise<Set<string>> {
  const manifest = force ? undefined : await readManifest(join(outDir, "manifest.json"));
  if (!manifest) return new Set(plan.steps.map((s) => s.id));
  const { assetsByStep, reattach } = prepare(plan, manifest);
  return new Set(plan.steps.filter((s) => !assetsByStep.has(s.id) && !reattach.has(s.id)).map((s) => s.id));
}

function idempotencyKey(plan: Plan, step: PlanStep, startedAt: string, attempt: number, inputHash: string): string {
  // Short and fixed-length (the server keeps 160 chars); same run + attempt + resolved input → the same job.
  const digest = createHash("sha256").update(JSON.stringify([plan.name ?? "plan", step.id, startedAt, attempt, inputHash])).digest("hex").slice(0, 32);
  return `plan:${step.id.slice(0, 40)}:${digest}`;
}

const outOfCredits = (error: unknown): error is ApiError =>
  error instanceof ApiError && (error.code === "insufficient_credits" || error.code === "free_credits_restricted");

export async function runPlan(options: RunOptions): Promise<Manifest> {
  const { client, plan, baseDir, outDir } = options;
  const emit = options.onEvent ?? (() => undefined);
  const concurrency = Math.max(1, options.concurrency ?? 3);
  await mkdir(outDir, { recursive: true });
  const manifestPath = join(outDir, "manifest.json");
  const previous = options.force ? undefined : await readManifest(manifestPath);
  const manifest: Manifest = previous ?? {
    plan: options.planPath, startedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), totalCredits: 0, steps: {}, uploads: {},
  };
  // Saves run one at a time (parallel steps save concurrently) and land by rename, so a kill never leaves half a file.
  let saving: Promise<void> = Promise.resolve();
  const write = async () => {
    manifest.updatedAt = new Date().toISOString();
    const tmp = `${manifestPath}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(manifest, null, 2) + "\n");
    await rename(tmp, manifestPath);
  };
  const save = (): Promise<void> => (saving = saving.then(write, write));

  const { assetsByStep, reattach } = prepare(plan, manifest);

  for (const [k, v] of Object.entries(manifest.uploads)) {
    if (!v.uploadedAt || Date.now() - Date.parse(v.uploadedAt) > UPLOAD_TTL_MS) delete manifest.uploads[k];
  }
  const uploadCache = new Map<string, Promise<Asset>>(Object.entries(manifest.uploads).map(([k, v]) => [k, Promise.resolve(v)]));
  const resolveRef = async (ref: string): Promise<string> => {
    const m = REF.exec(ref);
    if (m) {
      const assets = assetsByStep.get(m[1]);
      const idx = m[2] ? Number(m[2]) : 0;
      const asset = assets?.[idx];
      if (!asset) throw new Error(`reference ${ref} has no asset (step failed or index out of range)`);
      return asset.id;
    }
    if (ref.startsWith("file:")) {
      const rel = ref.slice(5);
      const abs = isAbsolute(rel) ? rel : resolve(baseDir, rel);
      const st = await stat(abs);
      const key = `${abs}|${st.size}|${st.mtimeMs}`;
      let pending = uploadCache.get(key);
      if (!pending) {
        pending = (async () => {
          const asset = await client.upload(abs);
          for (const k of Object.keys(manifest.uploads)) if (k.startsWith(`${abs}|`)) delete manifest.uploads[k]; // the older version of this file
          manifest.uploads[key] = { ...asset, uploadedAt: new Date().toISOString() };
          emit({ kind: "upload", path: abs, asset }); await save(); return asset;
        })();
        uploadCache.set(key, pending);
      }
      return (await pending).id;
    }
    return ref; // already an asset id
  };

  const resolveInput = async (step: PlanStep): Promise<JobInput> => {
    const input = stepInput(step, plan.defaults);
    if (input.refs) input.refs = await Promise.all(input.refs.map(resolveRef));
    if (input.timeline) {
      const t: ComposeTimeline = structuredClone(input.timeline);
      for (const c of t.clips) c.asset = await resolveRef(c.asset);
      if (t.voice) t.voice.asset = await resolveRef(t.voice.asset);
      if (t.music) t.music.asset = await resolveRef(t.music.asset);
      if (t.captions?.from) t.captions.from = await resolveRef(t.captions.from);
      input.timeline = t;
    }
    return input;
  };

  // Budget guard: --max-credits caps what this run will pay for, i.e. the steps still to run minus re-attached jobs.
  const pending = plan.steps.filter((s) => !assetsByStep.has(s.id));
  let estimate = 0;
  const stepEstimate = new Map<string, number>();
  for (const step of pending) {
    if (reattach.has(step.id)) continue; // paid (or held) by the run that submitted it
    const price = await client.price({ type: step.type, input: stripRefs(stepInput(step, plan.defaults)) });
    estimate += price.credits;
    stepEstimate.set(step.id, price.credits);
    emit({ kind: "estimate", stepId: step.id, credits: price.credits, model: price.model });
  }
  const cap = options.maxCredits ?? plan.budget?.maxCredits;
  if (cap !== undefined && estimate > cap) {
    throw new ApiError(0, "over_budget", `This run is estimated at ${estimate} credits, above the budget of ${cap}. Raise --max-credits or trim the plan.`);
  }
  const me = await client.me();
  if (me.balance < estimate) throw new ApiError(402, "insufficient_credits", `balance ${me.balance} < estimate ${estimate}`, me.topupUrl, undefined, undefined, me.notice);

  const done = new Set<string>([...assetsByStep.keys()]);
  const failed = new Set<string>();
  const running = new Map<string, Promise<void>>();
  let fundsError: ApiError | undefined;

  const runStep = async (step: PlanStep): Promise<void> => {
    const prev = manifest.steps[step.id];
    const record: StepRecord = { id: step.id, type: step.type, status: "pending", hash: stepHash(step, plan.defaults), attempt: (prev?.attempt ?? 1) + (failedJob(prev) ? 1 : 0) };
    if (reattach.has(step.id)) Object.assign(record, { jobId: prev.jobId, jobStatus: prev.jobStatus, inputHash: prev.inputHash });
    manifest.steps[step.id] = record;
    const onProgress = (j: Job) => { record.jobStatus = j.status; emit({ kind: "progress", stepId: step.id, job: j }); };
    try {
      const input = await resolveInput(step);
      const inputHash = createHash("sha256").update(JSON.stringify({ type: step.type, input })).digest("hex").slice(0, 16);
      let finished: Job | undefined;
      if (record.jobId && record.inputHash === inputHash) {
        emit({ kind: "resume", stepId: step.id, jobId: record.jobId });
        try { finished = await client.waitJob(record.jobId, { onProgress }); }
        catch (error) {
          if (!(error instanceof ApiError && error.status === 404)) throw error;
          record.attempt! += 1; // the job is gone: a fresh key for a fresh job
        }
      }
      if (!finished) {
        // The estimate priced refs as plain images; with the real files some models cost more (video refs by their
        // seconds, a talking photo by its voice's length). Re-price now and keep the run inside the budget.
        if (cap !== undefined && input.refs?.length) {
          const real = (await client.price({ type: step.type, input })).credits;
          const was = stepEstimate.get(step.id) ?? real;
          if (real > was) {
            estimate += real - was;
            stepEstimate.set(step.id, real);
            if (estimate > cap) throw new ApiError(0, "over_budget", `${step.id} costs ${real} credits with its real files (estimated ${was}); the run would reach ${estimate}, above the budget of ${cap}. Raise --max-credits or trim the plan.`);
          }
        }
        const job = await client.createJob(step.type, input, idempotencyKey(plan, step, manifest.startedAt, record.attempt!, inputHash));
        Object.assign(record, { jobId: job.id, jobStatus: job.status, inputHash });
        emit({ kind: "submit", stepId: step.id, job });
        await save();
        finished = await client.waitJob(job.id, { onProgress });
      }
      record.jobStatus = finished.status;
      if (finished.status !== "succeeded") {
        throw new Error(finished.error ? `${finished.error.code}: ${finished.error.message}` : `job ${finished.status}`);
      }
      const assets = finished.output?.assets ?? [];
      const files: string[] = [];
      for (const [i, asset] of assets.entries()) {
        files.push(await client.download(asset, outputName(outDir, step.id, asset, i, assets.length)));
      }
      const preview = finished.output?.preview;
      if (preview) record.preview = await client.download(preview, `${outDir}/${step.id}.preview.jpg`).catch(() => undefined);
      record.status = "succeeded";
      record.credits = finished.creditsCharged;
      record.assets = assets;
      record.files = files;
      if (finished.output?.shareUrl) record.shareUrl = finished.output.shareUrl;
      manifest.totalCredits += finished.creditsCharged;
      assetsByStep.set(step.id, assets);
      done.add(step.id);
      emit({ kind: "done", stepId: step.id, job: finished, files });
    } catch (error) {
      // jobId and jobStatus stay: unless the job itself failed, the next run polls it instead of paying again.
      record.status = "failed";
      record.error = (error as Error).message;
      failed.add(step.id);
      // Out of credits, or the budget reached with real prices: stop starting steps, keep what's done, report it.
      if (outOfCredits(error) || (error instanceof ApiError && error.code === "over_budget")) fundsError ??= error as ApiError;
      emit({ kind: "error", stepId: step.id, error: error as Error });
    } finally {
      await save();
      running.delete(step.id);
    }
  };

  // Keep what an earlier run knew about the step (attempt, submitted job): only the status and the reason change.
  const markFailed = (step: PlanStep, error: string) => { manifest.steps[step.id] = { ...manifest.steps[step.id], id: step.id, type: step.type, status: "failed", error }; failed.add(step.id); };

  const queue = [...pending];
  for (const s of plan.steps) if (done.has(s.id)) emit({ kind: "skip", stepId: s.id });
  while (queue.length > 0 || running.size > 0) {
    // Start every step whose dependencies are satisfied, up to the concurrency limit; nothing new once credits ran out.
    for (let i = 0; !fundsError && i < queue.length && running.size < concurrency; ) {
      const step = queue[i];
      const deps = dependencies(step);
      if (deps.some((d) => failed.has(d))) {
        markFailed(step, `dependency failed: ${deps.filter((d) => failed.has(d)).join(", ")}`);
        emit({ kind: "error", stepId: step.id, error: new Error(manifest.steps[step.id].error!) });
        queue.splice(i, 1);
        continue;
      }
      if (deps.every((d) => done.has(d))) { running.set(step.id, runStep(step)); queue.splice(i, 1); continue; }
      i++;
    }
    if (running.size === 0 && queue.length > 0) {
      if (fundsError) break;
      // Nothing can start: remaining steps wait on steps that never ran (should not happen after validation).
      for (const step of queue) markFailed(step, "unresolvable dependencies");
      break;
    }
    if (running.size > 0) await Promise.race(running.values());
  }
  const last = manifest.steps[plan.steps[plan.steps.length - 1].id];
  if (last?.status === "succeeded" && last.shareUrl) manifest.shareUrl = last.shareUrl;
  else delete manifest.shareUrl;
  await save();
  // Out of credits is not a step failure: the agent must hand the user the top-up link (exit 3), then re-run.
  if (fundsError) throw fundsError;
  return manifest;
}
