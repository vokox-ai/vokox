import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { ApiClient, ApiError, outputName } from "./client.js";
import type { Asset, ComposeTimeline, Job, JobInput, JobType } from "./types.js";

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
  attempt?: number;
  jobId?: string;
  status: "pending" | "skipped" | "succeeded" | "failed";
  credits?: number;
  assets?: Asset[];
  files?: string[];
  error?: string;
}

export interface Manifest {
  plan: string;
  startedAt: string;
  updatedAt: string;
  totalCredits: number;
  steps: Record<string, StepRecord>;
  uploads: Record<string, Asset>;
}

const REF = /^@([A-Za-z0-9_-]+)(?:\[(\d+)\])?$/u;
const TYPES: JobType[] = ["image", "video", "gif", "music", "tts", "compose"];

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
  | { kind: "progress"; stepId: string; job: Job }
  | { kind: "done"; stepId: string; job: Job; files: string[] }
  | { kind: "skip"; stepId: string }
  | { kind: "error"; stepId: string; error: Error };

function stepInput(step: PlanStep, defaults: Partial<JobInput> | undefined): JobInput {
  const { id: _id, type: _type, note: _note, ...rest } = step;
  return { ...(defaults ?? {}), ...rest };
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

async function readManifest(path: string): Promise<Manifest | undefined> {
  try { return JSON.parse(await readFile(path, "utf8")) as Manifest; } catch { return undefined; }
}

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
  const save = async () => { manifest.updatedAt = new Date().toISOString(); await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n"); };

  const assetsByStep = new Map<string, Asset[]>();
  const byId = new Map(plan.steps.map((s) => [s.id, s]));
  for (const [id, rec] of Object.entries(manifest.steps)) {
    const step = byId.get(id);
    if (rec.status === "succeeded" && rec.assets && step && rec.hash === stepHash(step, plan.defaults)) assetsByStep.set(id, rec.assets);
    else if (rec.status === "succeeded") { rec.status = "pending"; } // changed or removed step → redo
  }
  // A step whose dependency will be redone must be redone too.
  for (const step of plan.steps) if (assetsByStep.has(step.id) && dependencies(step).some((d) => !assetsByStep.has(d))) { assetsByStep.delete(step.id); manifest.steps[step.id].status = "pending"; }

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
      const key = abs;
      let pending = uploadCache.get(key);
      if (!pending) {
        pending = (async () => { await stat(abs); const asset = await client.upload(abs); manifest.uploads[key] = asset; emit({ kind: "upload", path: abs, asset }); await save(); return asset; })();
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

  // Budget guard: estimate only the steps that still need to run.
  const pending = plan.steps.filter((s) => !assetsByStep.has(s.id));
  let estimate = 0;
  for (const step of pending) {
    const price = await client.price({ type: step.type, input: stripRefs(stepInput(step, plan.defaults)) });
    estimate += price.credits;
    emit({ kind: "estimate", stepId: step.id, credits: price.credits, model: price.model });
  }
  const cap = options.maxCredits ?? plan.budget?.maxCredits;
  if (cap !== undefined && manifest.totalCredits + estimate > cap) {
    throw new ApiError(0, "over_budget", `Already spent ${manifest.totalCredits} + estimated ${estimate} credits exceeds the budget of ${cap}. Raise --max-credits or trim the plan.`);
  }
  const me = await client.me();
  if (me.balance < estimate) throw new ApiError(402, "insufficient_credits", `balance ${me.balance} < estimate ${estimate}`, me.topupUrl);

  const done = new Set<string>([...assetsByStep.keys()]);
  const failed = new Set<string>();
  const running = new Map<string, Promise<void>>();

  const runStep = async (step: PlanStep): Promise<void> => {
    const attempt = (manifest.steps[step.id]?.attempt ?? 0) + 1;
    const record: StepRecord = { id: step.id, type: step.type, status: "pending", hash: stepHash(step, plan.defaults), attempt };
    manifest.steps[step.id] = record;
    try {
      const input = await resolveInput(step);
      // Attempt number and step hash in the key: a retried step never resolves to an earlier failed job.
      const job = await client.createJob(step.type, input, `${plan.name ?? "plan"}:${step.id}:${record.hash}:${manifest.startedAt}:${attempt}`);
      record.jobId = job.id;
      emit({ kind: "submit", stepId: step.id, job });
      await save();
      const finished = await client.waitJob(job.id, { onProgress: (j) => emit({ kind: "progress", stepId: step.id, job: j }) });
      if (finished.status !== "succeeded") {
        throw new Error(finished.error ? `${finished.error.code}: ${finished.error.message}` : `job ${finished.status}`);
      }
      const assets = finished.output?.assets ?? [];
      const files: string[] = [];
      for (const [i, asset] of assets.entries()) {
        files.push(await client.download(asset, outputName(outDir, step.id, asset, i, assets.length)));
      }
      record.status = "succeeded";
      record.credits = finished.creditsCharged;
      record.assets = assets;
      record.files = files;
      manifest.totalCredits += finished.creditsCharged;
      assetsByStep.set(step.id, assets);
      done.add(step.id);
      emit({ kind: "done", stepId: step.id, job: finished, files });
    } catch (error) {
      record.status = "failed";
      record.error = (error as Error).message;
      failed.add(step.id);
      emit({ kind: "error", stepId: step.id, error: error as Error });
    } finally {
      await save();
      running.delete(step.id);
    }
  };

  const queue = [...pending];
  for (const s of plan.steps) if (done.has(s.id)) emit({ kind: "skip", stepId: s.id });
  while (queue.length > 0 || running.size > 0) {
    // Start every step whose dependencies are satisfied, up to the concurrency limit.
    for (let i = 0; i < queue.length && running.size < concurrency; ) {
      const step = queue[i];
      const deps = dependencies(step);
      if (deps.some((d) => failed.has(d))) {
        manifest.steps[step.id] = { id: step.id, type: step.type, status: "failed", error: `dependency failed: ${deps.filter((d) => failed.has(d)).join(", ")}` };
        failed.add(step.id);
        emit({ kind: "error", stepId: step.id, error: new Error(manifest.steps[step.id].error!) });
        queue.splice(i, 1);
        continue;
      }
      if (deps.every((d) => done.has(d))) { running.set(step.id, runStep(step)); queue.splice(i, 1); continue; }
      i++;
    }
    if (running.size === 0 && queue.length > 0) {
      // Nothing can start: remaining steps wait on steps that never ran (should not happen after validation).
      for (const step of queue) { manifest.steps[step.id] = { id: step.id, type: step.type, status: "failed", error: "unresolvable dependencies" }; failed.add(step.id); }
      break;
    }
    if (running.size > 0) await Promise.race(running.values());
  }
  await save();
  return manifest;
}
