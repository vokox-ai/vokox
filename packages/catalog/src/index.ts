/**
 * Model catalog used by the mock server and mirrored in skills/vokox/references/models-and-pricing.md.
 * Prices are our sell prices in credits. What models cost us lives server-side (src/server.ts), never in this public module.
 * Pricing policy (27 Sep 2026), anchored on the market median of consumer platforms (docs/COSTS.md, "Рынок") at the Creator rate:
 *   - video models with a wide cost gap sit below the market median: Seedance 2.0 Fast and MiniMax H3 −10 %,
 *     Wan 2.5 −5 %, Seedance 2.0 −3 % (27 Sep 2026); other video models at most 5 % above it;
 *   - images, voice, music: about 30 % below the market median;
 *   - floor everywhere: at least 10 % gross margin on the cheapest plan (Studio annual, $0.00602/credit), which also
 *     covers the ~4 % payment fee; Kling, Veo and Hailuo sit on this floor, so they stay slightly above the market;
 *   - models without a market price: credits ≥ cost / $0.00602 / 0.75 (25 % margin on the cheapest plan).
 */
/**
 * A priced configuration of a model. `amount` is credits per unit (image or second); with `videoRef` the
 * seconds of reference video are billed on top of the output seconds, at this (lower) per-second rate,
 * because providers bill video input and output tokens together at a cheaper "input contains video" rate.
 * `cost` is our USD cost per unit on the primary route; `estimated` marks costs derived from the vendor's
 * price ratios rather than measured.
 */
export interface PriceVariant { resolution: string; videoRef?: boolean; amount: number; estimated?: boolean }

export interface CatalogModel {
  id: string; class: "image" | "video" | "gif" | "music" | "tts" | "transcribe" | "compose"; tier?: "fast" | "hq" | "premium"; name: string;
  /** `amount` is the price of the default resolution without video references; `variants` override it per configuration. */
  credits: { unit: "image" | "second" | "track" | "1k_chars" | "minute" | "flat"; amount: number; minSeconds?: number; variants?: PriceVariant[] };
  caps: { durations?: number[]; aspectRatios?: string[]; resolutions?: string[]; defaultResolution?: string; videoRefs?: boolean; requiresImage?: boolean; audio?: boolean; imageInput?: boolean; maxRefs?: number; languages?: string[]; maxChars?: number; voices?: string[] };
  notes?: string; eta?: number;
}

const AR = ["9:16", "16:9", "1:1", "4:5", "3:2"];

export const CATALOG: CatalogModel[] = [
  // images
  { id: "minimax-image-01", class: "image", tier: "fast", name: "MiniMax image-01", credits: { unit: "image", amount: 1 }, caps: { aspectRatios: ["1:1", "16:9", "4:3", "3:2", "2:3", "3:4", "9:16", "21:9"], resolutions: ["1k"], imageInput: true, maxRefs: 1 }, notes: "cheapest decent image; character reference for consistency", eta: 8 },
  { id: "z-image", class: "image", tier: "fast", name: "Z-Image Turbo", credits: { unit: "image", amount: 2 }, caps: { aspectRatios: AR, resolutions: ["1k"] }, notes: "drafts, thumbnails, sticker bases", eta: 4 },
  { id: "flux-2-klein", class: "image", tier: "fast", name: "FLUX 2 Klein", credits: { unit: "image", amount: 3 }, caps: { aspectRatios: AR, resolutions: ["1k"] }, notes: "fast drafts; short headlines only (use nano-banana-2 or gpt-image-2 for real typography)", eta: 5 },
  { id: "qwen-image", class: "image", tier: "hq", name: "Qwen-Image", credits: { unit: "image", amount: 6 }, caps: { aspectRatios: AR, resolutions: ["1k", "2k"], imageInput: true, maxRefs: 1 }, notes: "text rendering, edits", eta: 8 },
  { id: "seedream-4.5", class: "image", tier: "hq", name: "Seedream 4.5", credits: { unit: "image", amount: 8 }, caps: { aspectRatios: AR, resolutions: ["1k", "2k", "4k"], imageInput: true, maxRefs: 4 }, notes: "photoreal people and products", eta: 10 },
  { id: "nano-banana-2", class: "image", tier: "hq", name: "Nano Banana 2", credits: { unit: "image", amount: 13, variants: [{ resolution: "1k", amount: 13 }, { resolution: "2k", amount: 20 }] }, caps: { aspectRatios: AR, resolutions: ["1k", "2k"], defaultResolution: "1k", imageInput: true, maxRefs: 3 }, notes: "best edits and consistency with references", eta: 10 },
  { id: "gpt-image-2", class: "image", tier: "premium", name: "GPT Image 2", credits: { unit: "image", amount: 11, variants: [{ resolution: "1k", amount: 11 }, { resolution: "2k", amount: 18, estimated: true }] }, caps: { aspectRatios: ["1:1", "3:2", "2:3"], resolutions: ["1k", "2k"], defaultResolution: "1k", imageInput: true, maxRefs: 4 }, notes: "instruction following, UGC photo look", eta: 20 },
  { id: "nano-banana-pro", class: "image", tier: "premium", name: "Nano Banana Pro", credits: { unit: "image", amount: 25, variants: [{ resolution: "1k", amount: 25 }, { resolution: "2k", amount: 25 }, { resolution: "4k", amount: 45 }] }, caps: { aspectRatios: AR, resolutions: ["1k", "2k", "4k"], defaultResolution: "1k", imageInput: true, maxRefs: 6 }, notes: "top quality, 4K, complex scenes", eta: 25 },
  // video
  { id: "wan-2.2-fast", class: "video", tier: "fast", name: "Wan 2.2 Ultra Fast 480p", credits: { unit: "second", amount: 3, minSeconds: 5 }, caps: { durations: [5, 8], aspectRatios: ["9:16", "16:9", "1:1"], resolutions: ["480p"], imageInput: true, maxRefs: 1 }, notes: "drafts, GIF bases, previews", eta: 35 },
  { id: "wan-2.2-fast-720p", class: "video", tier: "fast", name: "Wan 2.2 Ultra Fast 720p", credits: { unit: "second", amount: 5, minSeconds: 5 }, caps: { durations: [5, 8], aspectRatios: ["9:16", "16:9", "1:1"], resolutions: ["720p"], imageInput: true, maxRefs: 1 }, notes: "cheapest usable 720p", eta: 50 },
  { id: "ltx-2-fast", class: "video", tier: "hq", name: "LTX-2 Fast", credits: { unit: "second", amount: 9 }, caps: { durations: [5, 8, 10], aspectRatios: ["9:16", "16:9", "1:1"], resolutions: ["1080p"], audio: true, imageInput: true, maxRefs: 1 }, notes: "fast, native audio, long clips", eta: 40 },
  { id: "hailuo-2.3", class: "video", tier: "hq", name: "Hailuo 2.3", credits: { unit: "second", amount: 9, variants: [{ resolution: "768p", amount: 9 }] }, caps: { durations: [6, 10], aspectRatios: ["9:16", "16:9", "1:1"], resolutions: ["768p"], defaultResolution: "768p", imageInput: true, maxRefs: 1 }, notes: "strong motion and physics", eta: 60 },
  { id: "hailuo-2.3-fast", class: "video", tier: "fast", name: "Hailuo 2.3 Fast", credits: { unit: "second", amount: 8, minSeconds: 6 }, caps: { durations: [6, 10], aspectRatios: ["9:16", "16:9", "1:1"], resolutions: ["768p"], imageInput: true, requiresImage: true, maxRefs: 1 }, notes: "image-to-video only; good motion for the price", eta: 60 },
  { id: "minimax-h3-draft", class: "video", tier: "fast", name: "MiniMax H3 Max 480p", credits: { unit: "second", amount: 12, minSeconds: 5 }, caps: { durations: [5, 8, 10], aspectRatios: ["9:16", "16:9", "1:1"], resolutions: ["480p"], audio: true, imageInput: true, maxRefs: 9 }, notes: "fast H3 drafts with sound; references only", eta: 60 },
  { id: "minimax-h3", class: "video", tier: "hq", name: "MiniMax H3", credits: { unit: "second", amount: 19, variants: [{ resolution: "768p", amount: 19 }, { resolution: "2k", amount: 31 }, { resolution: "768p", videoRef: true, amount: 19 }, { resolution: "2k", videoRef: true, amount: 31 }] }, caps: { durations: [5, 8, 10, 15], aspectRatios: ["9:16", "16:9", "1:1", "4:3", "3:4", "21:9"], resolutions: ["768p", "2k"], defaultResolution: "768p", videoRefs: true, audio: true, imageInput: true, maxRefs: 9 }, notes: "top of the Artificial Analysis arena (Sep 2026); native sound, image/video/audio references; 768p or 2K", eta: 120 },
  { id: "seedance-2-mini", class: "video", tier: "fast", name: "Seedance 2.0 Mini", credits: { unit: "second", amount: 5, variants: [{ resolution: "720p", amount: 5 }, { resolution: "480p", amount: 3 }, { resolution: "720p", videoRef: true, amount: 3, estimated: true }, { resolution: "480p", videoRef: true, amount: 2 }] }, caps: { durations: [5, 8, 10], aspectRatios: ["9:16", "16:9", "1:1", "4:3"], resolutions: ["480p", "720p"], defaultResolution: "720p", videoRefs: true, audio: true, imageInput: true, maxRefs: 2 }, notes: "cheapest Seedance with native sound; drafts, b-roll, volume content", eta: 120 },
  { id: "seedance-2-fast", class: "video", tier: "hq", name: "Seedance 2.0 Fast", credits: { unit: "second", amount: 21, variants: [{ resolution: "720p", amount: 21 }, { resolution: "480p", amount: 10 }, { resolution: "720p", videoRef: true, amount: 12, estimated: true }, { resolution: "480p", videoRef: true, amount: 6 }] }, caps: { durations: [5, 8, 10], aspectRatios: ["9:16", "16:9", "1:1", "4:3"], resolutions: ["480p", "720p"], defaultResolution: "720p", videoRefs: true, audio: true, imageInput: true, maxRefs: 4 }, notes: "multi-reference, lip-sync, best value for talking heads", eta: 70 },
  { id: "wan-2.5", class: "video", tier: "hq", name: "Wan 2.5", credits: { unit: "second", amount: 15, variants: [{ resolution: "720p", amount: 15 }, { resolution: "480p", amount: 8 }, { resolution: "1080p", amount: 23, estimated: true }] }, caps: { durations: [5, 10], aspectRatios: ["9:16", "16:9", "1:1"], resolutions: ["480p", "720p", "1080p"], defaultResolution: "720p", audio: true, imageInput: true, maxRefs: 1 }, notes: "native audio, stable characters", eta: 80 },
  { id: "seedance-2", class: "video", tier: "premium", name: "Seedance 2.0", credits: { unit: "second", amount: 32, variants: [{ resolution: "720p", amount: 32 }, { resolution: "480p", amount: 15, estimated: true }, { resolution: "1080p", amount: 79, estimated: true }, { resolution: "720p", videoRef: true, amount: 25, estimated: true }, { resolution: "480p", videoRef: true, amount: 12, estimated: true }] }, caps: { durations: [5, 8, 10, 15], aspectRatios: ["9:16", "16:9", "1:1", "4:3"], resolutions: ["480p", "720p", "1080p"], defaultResolution: "720p", videoRefs: true, audio: true, imageInput: true, maxRefs: 9 }, notes: "multi-shot, references for face/voice/video, cinematic", eta: 120 },
  { id: "kling-3-std", class: "video", tier: "premium", name: "Kling 3.0 Standard", credits: { unit: "second", amount: 20 }, caps: { durations: [5, 10], aspectRatios: ["9:16", "16:9", "1:1"], resolutions: ["720p", "1080p"], audio: true, imageInput: true, maxRefs: 4 }, notes: "people, motion, multi-shot", eta: 150 },
  { id: "veo-3.1-lite", class: "video", tier: "premium", name: "Veo 3.1 Lite", credits: { unit: "second", amount: 12, variants: [{ resolution: "720p", amount: 12 }, { resolution: "1080p", amount: 20 }] }, caps: { durations: [4, 6, 8], aspectRatios: ["9:16", "16:9"], resolutions: ["720p", "1080p"], defaultResolution: "720p", audio: true, imageInput: true, maxRefs: 3 }, notes: "cheapest Veo: realism and dialogue on a budget", eta: 60 },
  { id: "veo-3.1-fast", class: "video", tier: "premium", name: "Veo 3.1 Fast", credits: { unit: "second", amount: 19, variants: [{ resolution: "720p", amount: 19 }, { resolution: "1080p", amount: 23 }] }, caps: { durations: [4, 6, 8], aspectRatios: ["9:16", "16:9"], resolutions: ["720p", "1080p"], defaultResolution: "720p", audio: true, imageInput: true, maxRefs: 3 }, notes: "dialogue with lip-sync and SFX, realism", eta: 90 },
  { id: "kling-3-pro", class: "video", tier: "premium", name: "Kling 3.0 Pro", credits: { unit: "second", amount: 27 }, caps: { durations: [5, 10], aspectRatios: ["9:16", "16:9", "1:1"], resolutions: ["1080p"], audio: true, imageInput: true, maxRefs: 4 }, notes: "top motion quality", eta: 200 },
  { id: "veo-3.1", class: "video", tier: "premium", name: "Veo 3.1", credits: { unit: "second", amount: 74, variants: [{ resolution: "1080p", amount: 74 }, { resolution: "4k", amount: 111 }] }, caps: { durations: [4, 6, 8], aspectRatios: ["9:16", "16:9"], resolutions: ["1080p", "4k"], defaultResolution: "1080p", audio: true, imageInput: true, maxRefs: 3 }, notes: "flagship realism, use only when the client asks", eta: 150 },
  // gif
  { id: "gif-loop", class: "gif", tier: "fast", name: "GIF loop (Wan 2.2 480p + ffmpeg)", credits: { unit: "flat", amount: 20 }, caps: { durations: [2, 3, 4], aspectRatios: ["1:1", "9:16", "16:9"], imageInput: true, maxRefs: 1 }, notes: "first frame = last frame for seamless loops; stickers, reactions", eta: 45 },
  // music
  { id: "lyria-3.5", class: "music", tier: "hq", name: "Lyria 3.5", credits: { unit: "track", amount: 13 }, caps: { durations: [30] }, notes: "licensed background music (30 s tracks), prompt = genre + mood + tempo", eta: 30 },
  { id: "stable-audio-2.5", class: "music", tier: "hq", name: "Stable Audio 2.5", credits: { unit: "track", amount: 45 }, caps: { durations: [30, 60, 90, 180] }, notes: "ambient, SFX beds, longer tracks", eta: 40 },
  // tts
  { id: "kokoro", class: "tts", tier: "fast", name: "Kokoro", credits: { unit: "1k_chars", amount: 5 }, caps: { languages: ["en", "es", "fr", "ja", "zh"], maxChars: 5000, voices: ["en-female-1", "en-female-2", "en-male-1", "en-male-2"] }, notes: "English narration at near-zero cost", eta: 5 },
  { id: "minimax-tts", class: "tts", tier: "hq", name: "MiniMax Speech 2.8 Turbo", credits: { unit: "1k_chars", amount: 12 }, caps: { languages: ["ru", "en", "es", "de", "fr", "pt", "it", "zh", "ja", "ko", "tr", "ar"], maxChars: 5000, voices: ["ru-female-1", "ru-female-2", "ru-male-1", "ru-male-2", "en-female-1", "en-female-2", "en-male-1", "en-male-2"] }, notes: "good Russian, 30+ languages, emotion control", eta: 6 },
  { id: "eleven-v3", class: "tts", tier: "premium", name: "ElevenLabs v3", credits: { unit: "1k_chars", amount: 19 }, caps: { languages: ["ru", "en", "es", "de", "fr", "pt", "it", "zh", "ja"], maxChars: 5000, voices: ["ru-female-1", "ru-female-2", "ru-male-1", "ru-male-2", "en-female-1", "en-female-2", "en-male-1", "en-male-2"] }, notes: "expressive, emotion tags, voice cloning later", eta: 8 },
  // compose
  { id: "whisper", class: "transcribe", tier: "fast", name: "Whisper large-v3", credits: { unit: "minute", amount: 1 }, caps: {}, notes: "word-timed transcript (JSON) of an audio or video file up to 30 min, 99 languages; 1 credit per started minute", eta: 5 },
  { id: "compose", class: "compose", name: "Compose (cloud ffmpeg)", credits: { unit: "second", amount: 1 }, caps: { aspectRatios: AR }, notes: "5 credits + 1 credit per 10 s of output; captions from voice included", eta: 30 },
];

export const AUTO: Record<string, string> = {
  "auto:image.fast": "z-image", "auto:image.hq": "seedream-4.5", "auto:image.premium": "nano-banana-pro", "auto:image": "seedream-4.5",
  "auto:video.fast": "wan-2.2-fast-720p", "auto:video.hq": "seedance-2-fast", "auto:video.premium": "kling-3-std", "auto:video": "seedance-2-fast",
  "auto:gif": "gif-loop", "auto:music": "lyria-3.5", "auto:tts": "minimax-tts", "auto:tts.fast": "kokoro", "auto:tts.premium": "eleven-v3", "auto:compose": "compose", "auto:transcribe": "whisper",
};

export function resolveModel(type: string, requested?: string): CatalogModel | undefined {
  const id = requested ? (AUTO[requested] ?? requested) : AUTO[`auto:${type}`];
  const model = CATALOG.find((m) => m.id === id);
  return model && model.class === type ? model : undefined;
}

/** Pick the duration the provider will actually run: the requested one if allowed, else the model default. Throws on invalid input. */
export function normalizeDuration(model: CatalogModel, duration: number | undefined): number | undefined {
  if (model.class === "image" || model.class === "tts" || model.class === "compose") return undefined;
  const allowed = model.caps.durations;
  if (duration === undefined) return allowed?.[0] ?? 5;
  if (!Number.isInteger(duration) || duration <= 0 || duration > 300) throw new Error(`duration must be a positive integer of seconds`);
  if (allowed && !allowed.includes(duration)) throw new Error(`${model.id} supports durations ${allowed.join(", ")}s`);
  return duration;
}

export type PriceInput = { mediaSeconds?: number; duration?: number; n?: number; text?: string; resolution?: string; videoRefSeconds?: number; timeline?: { clips?: unknown[] } };

const RES_ALIASES: Record<string, string[]> = { "768p": ["720p"], "720p": ["768p"], "1k": ["1024", "1024p"], "2k": ["1440p", "2048"], "4k": ["2160p"] };

/**
 * Check a requested resolution against what we sell for this model and return the canonical name
 * (e.g. "720p" → "768p" on MiniMax). No request → the model default. Throws on anything unpriced, so a
 * provider can never be asked for a dearer resolution than the one we charged for.
 */
export function normalizeResolution(model: CatalogModel, resolution: string | undefined): string | undefined {
  const list = model.caps.resolutions;
  if (!list?.length) return undefined;
  const dflt = model.caps.defaultResolution ?? list[0];
  if (resolution === undefined || resolution === "") return dflt;
  const r = resolution.toLowerCase();
  const hit = list.find((x) => x === r || RES_ALIASES[x]?.includes(r));
  if (!hit) throw new Error(`${model.id} supports resolutions ${list.join(", ")}`);
  return hit;
}

/** Credits per unit for a resolution and reference mode, from the model's variants or its base price. */
export function unitPrice(model: CatalogModel, resolution: string | undefined, videoRef = false): number {
  const v = model.credits.variants;
  const res = resolution ?? model.caps.defaultResolution;
  if (!v?.length) {
    if (videoRef) throw new Error(`${model.id} does not take video references`);
    return model.credits.amount;
  }
  const hit = v.find((x) => x.resolution === res && Boolean(x.videoRef) === videoRef);
  if (hit) return hit.amount;
  throw new Error(videoRef ? `${model.id} does not take video references at ${res}` : `${model.id} has no price for ${res}`);
}

/** The cheapest per-unit price a model is sold at, across resolutions and reference modes ("from N"). */
export function lowestUnitPrice(model: CatalogModel): number {
  const v = model.credits.variants;
  return v?.length ? Math.min(...v.map((x) => x.amount)) : model.credits.amount;
}

export function priceFor(model: CatalogModel, input: PriceInput): { credits: number; breakdown: string } {
  if (input.n !== undefined && (!Number.isInteger(input.n) || input.n < 1 || input.n > 4)) throw new Error("n must be 1–4");
  if (input.duration !== undefined && (!Number.isInteger(input.duration) || input.duration <= 0)) throw new Error("duration must be a positive integer");
  if (input.videoRefSeconds !== undefined && (!(input.videoRefSeconds >= 0) || input.videoRefSeconds > 60)) throw new Error("reference video must be 60 s or shorter in total");
  const out = priceRaw(model, input);
  if (!Number.isInteger(out.credits) || out.credits <= 0) throw new Error(`invalid price ${out.credits} for ${model.id}`);
  return out;
}

function priceRaw(model: CatalogModel, input: PriceInput): { credits: number; breakdown: string } {
  const c = model.credits;
  const res = normalizeResolution(model, input.resolution);
  switch (c.unit) {
    case "image": { const n = input.n ?? 1; const a = unitPrice(model, res); return { credits: a * n, breakdown: `${a} × ${n} image(s)${res ? ` at ${res}` : ""}` }; }
    case "second": {
      if (model.class === "compose") { const secs = Math.max(10, (input.timeline?.clips?.length ?? 1) * 5); return { credits: 5 + Math.ceil(secs / 10), breakdown: `5 + ${Math.ceil(secs / 10)} (≈${secs}s output)` }; }
      const d = Math.max(input.duration ?? (model.caps.durations?.[0] ?? 5), c.minSeconds ?? 0);
      if (model.class === "gif") return { credits: c.amount, breakdown: "flat" };
      const ref = Math.ceil(input.videoRefSeconds ?? 0);
      if (ref > 0 && !model.caps.videoRefs) throw new Error(`${model.id} does not take video references`);
      const a = unitPrice(model, res, ref > 0);
      return ref > 0
        ? { credits: a * (d + ref), breakdown: `${a}/s × (${d}s output + ${ref}s reference video)${res ? ` at ${res}` : ""}` }
        : { credits: a * d, breakdown: `${a}/s × ${d}s${res ? ` at ${res}` : ""}` };
    }
    case "track": return { credits: c.amount, breakdown: `${c.amount} per track` };
    case "minute": { const m = Math.max(1, Math.ceil((input.mediaSeconds ?? 60) / 60)); return { credits: c.amount * m, breakdown: `${c.amount} × ${m} started minute(s)` }; }
    case "1k_chars": { const k = Math.max(1, Math.ceil((input.text?.length ?? 0) / 1000)); return { credits: c.amount * k, breakdown: `${c.amount} × ${k}k chars` }; }
    default: return { credits: c.amount, breakdown: "flat" };
  }
}


/** Credit packs as shown to agents (source of truth for checkout lives in the API). */
export const PACKS_HINT = [
  { id: "pack_10", usd: 10, credits: 1000 }, { id: "pack_25", usd: 25, credits: 2500 },
  { id: "pack_50", usd: 50, credits: 5250 }, { id: "pack_100", usd: 100, credits: 11000 },
];

/** Subscription plans: credits refreshed every month, spent before purchased credits. Annual = 20% off. */
export const PLANS = [
  { id: "starter", name: "Starter", usdMonth: 12, credits: 1400, blurb: "For trying the workflow on a few videos" },
  { id: "creator", name: "Creator", usdMonth: 29, credits: 3600, blurb: "For creators posting to every platform weekly", badge: "Recommended" },
  { id: "studio", name: "Studio", usdMonth: 79, credits: 10500, blurb: "For studios and agencies running several channels", badge: "Best value" },
] as const;
export const ANNUAL_DISCOUNT = 0.2;
/**
 * Trial (signup) credits pay only for these: the models that cost us least per credit at real purchase prices
 * (at most ≈ $0.33 per 100 credits). 100 trial credits = two 5 s Seedance 2 Fast clips at 480p, or dozens of images.
 * `true` = any resolution; a list = only those resolutions.
 */
export const FREE_TRIAL: Record<string, true | string[]> = {
  "seedance-2-fast": ["480p"], "flux-2-klein": true, "z-image": true, "qwen-image": true,
  "gif-loop": true, "lyria-3.5": true, "whisper": true, "compose": true,
};
export function freeTrialOk(model: CatalogModel, resolution?: string): boolean {
  const rule = FREE_TRIAL[model.id];
  if (!rule) return false;
  if (rule === true) return true;
  return rule.includes(normalizeResolution(model, resolution) ?? "");
}
export const FREE_TRIAL_HINT = "trial credits cover Seedance 2 Fast at 480p (a 5 s clip is 50 credits), FLUX 2 Klein, Z-Image and Qwen-Image images, Lyria music, GIF loops, transcripts, compose and reference breakdowns";

export * from "./gallery.js";
