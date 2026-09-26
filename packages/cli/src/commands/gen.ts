import type { Command } from "commander";
import { readFile } from "node:fs/promises";
import { outputName } from "../client.js";
import { authedClient, reportError } from "../context.js";
import { credits, info, isJson, ok, result, warn } from "../output.js";
import type { ComposeTimeline, Job, JobInput, JobType } from "../types.js";

interface GenFlags {
  prompt?: string; promptFile?: string; negative?: string; model?: string; ref?: string[]; ar?: string;
  duration?: string; resolution?: string; audio?: boolean; n?: string; seed?: string; text?: string; textFile?: string;
  voice?: string; lang?: string; out: string; manifest?: string; name?: string; wait: boolean; estimate?: boolean; yes?: boolean; param?: string[];
}

async function buildInput(type: JobType, flags: GenFlags, uploadRef: (ref: string) => Promise<string>): Promise<JobInput> {
  const input: JobInput = {};
  if (flags.model) input.model = flags.model;
  if (flags.promptFile) input.prompt = (await readFile(flags.promptFile, "utf8")).trim();
  else if (flags.prompt) input.prompt = flags.prompt;
  if (flags.negative) input.negativePrompt = flags.negative;
  if (flags.ar) input.aspectRatio = flags.ar;
  if (flags.duration) input.duration = Number(flags.duration);
  if (flags.resolution) input.resolution = flags.resolution;
  if (flags.audio !== undefined) input.audio = flags.audio;
  if (flags.n) input.n = Number(flags.n);
  if (flags.seed) input.seed = Number(flags.seed);
  if (flags.textFile) input.text = (await readFile(flags.textFile, "utf8")).trim();
  else if (flags.text) input.text = flags.text;
  if (flags.voice) input.voice = flags.voice;
  if (flags.lang) input.language = flags.lang;
  if (flags.param?.length) {
    input.params = {};
    for (const p of flags.param) { const [k, ...v] = p.split("="); input.params[k] = parseValue(v.join("=")); }
  }
  if (flags.ref?.length) input.refs = await Promise.all(flags.ref.map(uploadRef));
  if ((type === "image" || type === "video" || type === "gif" || type === "music") && !input.prompt) throw new Error(`${type} needs --prompt or --prompt-file`);
  if (type === "tts" && !input.text) throw new Error("tts needs --text or --text-file");
  return input;
}

function parseValue(v: string): unknown {
  if (v === "true") return true; if (v === "false") return false;
  if (v !== "" && !Number.isNaN(Number(v))) return Number(v);
  return v;
}

export async function submitAndCollect(type: JobType, input: JobInput, flags: Pick<GenFlags, "out" | "name" | "wait" | "estimate" | "yes">): Promise<void> {
  const client = await authedClient();
  const price = await client.price({ type, input });
  if (flags.estimate) {
    result({ credits: price.credits, model: price.model, breakdown: price.breakdown }, `${credits(price.credits)} · ${price.model}${price.breakdown ? " · " + price.breakdown : ""}`);
    return;
  }
  info(`estimate: ${credits(price.credits)} · ${price.model}`);
  const job = await client.createJob(type, input);
  if (!flags.wait) { result(job, `submitted ${job.id} (${job.status}); vokox jobs wait ${job.id}`); return; }
  const finished = await client.waitJob(job.id, { onProgress: (j: Job) => { if (j.status === "running" && j.progress !== undefined) info(`… ${Math.round(j.progress * 100)}%`); } });
  if (finished.status !== "succeeded") {
    const msg = finished.error ? `${finished.error.code}: ${finished.error.message}` : `job ${finished.status}`;
    if (finished.creditsCharged === 0) warn("no credits were charged");
    result({ ...finished, files: [] }, undefined);
    throw new Error(msg);
  }
  const assets = finished.output?.assets ?? [];
  const base = flags.name ?? `${type}-${finished.id.slice(0, 8)}`;
  const files: string[] = [];
  for (const [i, asset] of assets.entries()) files.push(await client.download(asset, outputName(flags.out, base, asset, i, assets.length)));
  ok(`${type} done · charged ${credits(finished.creditsCharged)} · ${files.join(", ")}`);
  result({ ...finished, files }, files.join("\n") + (finished.output?.shareUrl ? `\nshare: ${finished.output.shareUrl}` : ""));
}

function addCommonFlags(cmd: Command): Command {
  return cmd
    .option("-m, --model <id>", "model id or auto:<class>.<tier>, e.g. auto:video.fast")
    .option("-r, --ref <fileOrAssetId>", "reference image/video/audio (local file or asset id); repeatable", (v: string, prev: string[] = []) => [...prev, v])
    .option("-o, --out <dir>", "output directory", "./vokox-out")
    .option("--name <base>", "output file base name")
    .option("--no-wait", "submit and return the job id without waiting")
    .option("--estimate", "print the price and exit without generating")
    .option("--manifest <path>", "resolve @step references against a plan manifest (default: ./vokox-out/*/manifest.json)")
    .option("-p, --param <key=value>", "model-specific parameter; repeatable", (v: string, prev: string[] = []) => [...prev, v]);
}

export function registerGen(program: Command): void {
  const gen = program.command("gen").description("generate one asset: image | video | gif | music");

  for (const type of ["image", "video", "gif", "music"] as const) {
    const cmd = gen.command(type).description(`generate ${type === "gif" ? "a looping GIF" : type === "music" ? "a music track" : `a ${type}`}`);
    cmd.option("--prompt <text>", "prompt (English works best for all models)")
      .option("--prompt-file <path>", "read the prompt from a file")
      .option("--negative <text>", "negative prompt");
    if (type !== "music") cmd.option("--ar <ratio>", "aspect ratio: 9:16 | 16:9 | 1:1 | 4:5 | 3:2");
    if (type === "image") cmd.option("-n <count>", "number of images", "1").option("--resolution <r>", "1k | 2k | 4k");
    if (type === "video") cmd.option("--duration <seconds>", "clip length", "5").option("--resolution <r>", "480p | 720p | 1080p").option("--audio", "generate audio when the model supports it").option("--seed <n>", "seed");
    if (type === "gif") cmd.option("--duration <seconds>", "loop length", "3");
    if (type === "music") cmd.option("--duration <seconds>", "track length", "30");
    addCommonFlags(cmd).action(async (flags: GenFlags) => {
      try {
        const client = await authedClient();
        const input = await buildInput(type, flags, makeRefResolver(client, flags.manifest));
        await submitAndCollect(type, input, flags);
      } catch (error) { reportError(error, isJson()); }
    });
  }

  const tts = program.command("tts").description("text to speech");
  tts.option("--text <text>", "text to speak").option("--text-file <path>", "read the text from a file")
    .option("--voice <id>", "voice id (see docs: vokox models -c tts)").option("--lang <code>", "language code, e.g. ru, en");
  addCommonFlags(tts).action(async (flags: GenFlags) => {
    try {
      const client = await authedClient();
      const input = await buildInput("tts", flags, makeRefResolver(client, flags.manifest));
      await submitAndCollect("tts", input, flags);
    } catch (error) { reportError(error, isJson()); }
  });

  const compose = program.command("compose <timeline.json>").description("stitch clips, voice, music and captions into one video (cloud ffmpeg)");
  addCommonFlags(compose).action(async (path: string, flags: GenFlags) => {
    try {
      const client = await authedClient();
      const timeline = JSON.parse(await readFile(path, "utf8")) as ComposeTimeline;
      const fix = makeRefResolver(client, flags.manifest);
      for (const c of timeline.clips) c.asset = await fix(c.asset);
      if (timeline.voice) timeline.voice.asset = await fix(timeline.voice.asset);
      if (timeline.music) timeline.music.asset = await fix(timeline.music.asset);
      if (timeline.captions?.from) timeline.captions.from = await fix(timeline.captions.from);
      await submitAndCollect("compose", { timeline, model: flags.model }, { ...flags, name: flags.name ?? "final" });
    } catch (error) { reportError(error, isJson()); }
  });
}

/** "@step" or "@step[i]" → asset id from a manifest; "file:" or a path → upload; otherwise an asset id. */
export function makeRefResolver(client: { upload(path: string): Promise<{ id: string }> }, manifestPath?: string) {
  type Manifest = { steps?: Record<string, { assets?: { id: string }[] }> };
  let manifest: Manifest | undefined;
  const load = async (): Promise<Manifest> => {
    if (manifest) return manifest;
    const candidates = manifestPath ? [manifestPath] : await defaultManifests();
    for (const c of candidates) {
      try { const parsed = JSON.parse(await readFile(c, "utf8")) as Manifest; manifest = parsed; return parsed; } catch { /* next */ }
    }
    throw new Error("no manifest found for @step references; pass --manifest <path>");
  };
  return async (ref: string): Promise<string> => {
    const m = /^@([A-Za-z0-9_-]+)(?:\[(\d+)\])?$/u.exec(ref);
    if (m) {
      const man = await load();
      const asset = man.steps?.[m[1]]?.assets?.[m[2] ? Number(m[2]) : 0];
      if (!asset) throw new Error(`reference ${ref} not found in manifest`);
      return asset.id;
    }
    if (ref.startsWith("file:")) return (await client.upload(ref.slice(5))).id;
    return looksLikeFile(ref) ? (await client.upload(ref)).id : ref;
  };
}

async function defaultManifests(): Promise<string[]> {
  const { readdir } = await import("node:fs/promises");
  const { join } = await import("node:path");
  try {
    const dirs = await readdir("./vokox-out", { withFileTypes: true });
    return dirs.filter((d) => d.isDirectory()).map((d) => join("./vokox-out", d.name, "manifest.json"));
  } catch { return []; }
}

export function looksLikeFile(ref: string): boolean {
  return ref.startsWith("file:") ? true : /[\\/.]/u.test(ref) && !/^ast_/u.test(ref);
}
