/**
 * Model catalog used by the mock server and mirrored in skills/vokox/references/models-and-pricing.md.
 * Prices are our sell prices in credits. `cost` = USD per unit at the primary route, audited 25 Sep 2026
 * against wavespeed.ai, fal.ai, openrouter.ai/api/v1/videos/models and ai.google.dev pricing. Rule: credits ≥ cost / $0.00602
 * (best plan rate, Studio annual) / 0.75 → at least 25 % gross margin on every plan and pack. Derived from provider cost
 * (docs/API.md lists the assumed upstream cost per model).
 */
export interface CatalogModel {
  id: string; class: "image" | "video" | "gif" | "music" | "tts" | "compose"; tier?: "fast" | "hq" | "premium"; name: string;
  credits: { unit: "image" | "second" | "track" | "1k_chars" | "flat"; amount: number; minSeconds?: number };
  caps: { durations?: number[]; aspectRatios?: string[]; resolutions?: string[]; audio?: boolean; imageInput?: boolean; maxRefs?: number; languages?: string[]; maxChars?: number };
  notes?: string; eta?: number; cost?: number;
}

const AR = ["9:16", "16:9", "1:1", "4:5", "3:2"];

export const CATALOG: CatalogModel[] = [
  // images
  { id: "minimax-image-01", class: "image", tier: "fast", name: "MiniMax image-01", credits: { unit: "image", amount: 1 }, caps: { aspectRatios: ["1:1", "16:9", "4:3", "3:2", "2:3", "3:4", "9:16", "21:9"], resolutions: ["1k"], imageInput: true, maxRefs: 1 }, notes: "cheapest decent image; character reference for consistency", eta: 8, cost: 0.0035 },
  { id: "z-image", class: "image", tier: "fast", name: "Z-Image Turbo", credits: { unit: "image", amount: 2 }, caps: { aspectRatios: AR, resolutions: ["1k"] }, notes: "drafts, thumbnails, sticker bases", eta: 4, cost: 0.005 },
  { id: "flux-2-klein", class: "image", tier: "fast", name: "FLUX 2 Klein", credits: { unit: "image", amount: 3 }, caps: { aspectRatios: AR, resolutions: ["1k"] }, notes: "fast, good typography", eta: 5, cost: 0.005 },
  { id: "qwen-image", class: "image", tier: "hq", name: "Qwen-Image", credits: { unit: "image", amount: 6 }, caps: { aspectRatios: AR, resolutions: ["1k", "2k"], imageInput: true, maxRefs: 1 }, notes: "text rendering, edits", eta: 8, cost: 0.02 },
  { id: "seedream-4.5", class: "image", tier: "hq", name: "Seedream 4.5", credits: { unit: "image", amount: 9 }, caps: { aspectRatios: AR, resolutions: ["1k", "2k", "4k"], imageInput: true, maxRefs: 4 }, notes: "photoreal people and products", eta: 10, cost: 0.04 },
  { id: "nano-banana-2", class: "image", tier: "hq", name: "Nano Banana 2", credits: { unit: "image", amount: 15 }, caps: { aspectRatios: AR, resolutions: ["1k", "2k"], imageInput: true, maxRefs: 3 }, notes: "best edits and consistency with references", eta: 10, cost: 0.067 },
  { id: "gpt-image-2", class: "image", tier: "premium", name: "GPT Image 2", credits: { unit: "image", amount: 12 }, caps: { aspectRatios: ["1:1", "3:2", "2:3"], resolutions: ["1k", "2k"], imageInput: true, maxRefs: 4 }, notes: "instruction following, UGC photo look", eta: 20, cost: 0.053 },
  { id: "nano-banana-pro", class: "image", tier: "premium", name: "Nano Banana Pro", credits: { unit: "image", amount: 30 }, caps: { aspectRatios: AR, resolutions: ["1k", "2k", "4k"], imageInput: true, maxRefs: 6 }, notes: "top quality, 4K, complex scenes", eta: 25, cost: 0.134 },
  // video
  { id: "wan-2.2-fast", class: "video", tier: "fast", name: "Wan 2.2 Ultra Fast 480p", credits: { unit: "second", amount: 3, minSeconds: 5 }, caps: { durations: [5, 8], aspectRatios: ["9:16", "16:9", "1:1"], resolutions: ["480p"], imageInput: true, maxRefs: 1 }, notes: "drafts, GIF bases, previews", eta: 35, cost: 0.01 },
  { id: "wan-2.2-fast-720p", class: "video", tier: "fast", name: "Wan 2.2 Ultra Fast 720p", credits: { unit: "second", amount: 5, minSeconds: 5 }, caps: { durations: [5, 8], aspectRatios: ["9:16", "16:9", "1:1"], resolutions: ["720p"], imageInput: true, maxRefs: 1 }, notes: "cheapest usable 720p", eta: 50, cost: 0.02 },
  { id: "ltx-2-fast", class: "video", tier: "hq", name: "LTX-2 Fast", credits: { unit: "second", amount: 9 }, caps: { durations: [5, 8, 10], aspectRatios: ["9:16", "16:9", "1:1"], resolutions: ["720p", "1080p"], audio: true, imageInput: true, maxRefs: 1 }, notes: "fast, native audio, long clips", eta: 40, cost: 0.04 },
  { id: "hailuo-2.3", class: "video", tier: "hq", name: "Hailuo 2.3", credits: { unit: "second", amount: 11 }, caps: { durations: [6, 10], aspectRatios: ["9:16", "16:9", "1:1"], resolutions: ["768p", "1080p"], imageInput: true, maxRefs: 1 }, notes: "strong motion and physics", eta: 60, cost: 0.047 },
  { id: "hailuo-2.3-fast", class: "video", tier: "fast", name: "Hailuo 2.3 Fast", credits: { unit: "second", amount: 8, minSeconds: 6 }, caps: { durations: [6, 10], aspectRatios: ["9:16", "16:9", "1:1"], resolutions: ["768p"], imageInput: true, maxRefs: 1 }, notes: "image-to-video only; good motion for the price", eta: 60, cost: 0.032 },
  { id: "minimax-h3-draft", class: "video", tier: "fast", name: "MiniMax H3 Max 480p", credits: { unit: "second", amount: 12, minSeconds: 5 }, caps: { durations: [5, 8, 10], aspectRatios: ["9:16", "16:9", "1:1"], resolutions: ["480p"], audio: true, imageInput: true, maxRefs: 9 }, notes: "fast H3 drafts with sound; references only", eta: 60, cost: 0.05 },
  { id: "minimax-h3", class: "video", tier: "hq", name: "MiniMax H3", credits: { unit: "second", amount: 18 }, caps: { durations: [5, 8, 10, 15], aspectRatios: ["9:16", "16:9", "1:1", "4:3", "3:4", "21:9"], resolutions: ["720p"], audio: true, imageInput: true, maxRefs: 9 }, notes: "top of the Artificial Analysis arena (Sep 2026); native sound, image/video/audio references; 768p", eta: 120, cost: 0.08 },
  { id: "seedance-2-fast", class: "video", tier: "hq", name: "Seedance 2.0 Fast", credits: { unit: "second", amount: 14 }, caps: { durations: [5, 8, 10], aspectRatios: ["9:16", "16:9", "1:1", "4:3"], resolutions: ["480p", "720p"], audio: true, imageInput: true, maxRefs: 4 }, notes: "multi-reference, lip-sync, best value for talking heads", eta: 70, cost: 0.0605 },
  { id: "wan-2.5", class: "video", tier: "hq", name: "Wan 2.5", credits: { unit: "second", amount: 16 }, caps: { durations: [5, 10], aspectRatios: ["9:16", "16:9", "1:1"], resolutions: ["720p", "1080p"], audio: true, imageInput: true, maxRefs: 1 }, notes: "native audio, stable characters", eta: 80, cost: 0.07 },
  { id: "seedance-2", class: "video", tier: "premium", name: "Seedance 2.0", credits: { unit: "second", amount: 34 }, caps: { durations: [5, 8, 10, 15], aspectRatios: ["9:16", "16:9", "1:1", "4:3"], resolutions: ["720p", "1080p"], audio: true, imageInput: true, maxRefs: 9 }, notes: "multi-shot, references for face/voice/video, cinematic", eta: 120, cost: 0.151 },
  { id: "kling-3-std", class: "video", tier: "premium", name: "Kling 3.0 Standard", credits: { unit: "second", amount: 24 }, caps: { durations: [5, 10], aspectRatios: ["9:16", "16:9", "1:1"], resolutions: ["720p", "1080p"], audio: true, imageInput: true, maxRefs: 4 }, notes: "people, motion, multi-shot", eta: 150, cost: 0.107 },
  { id: "veo-3.1-lite", class: "video", tier: "premium", name: "Veo 3.1 Lite", credits: { unit: "second", amount: 12 }, caps: { durations: [4, 6, 8], aspectRatios: ["9:16", "16:9"], resolutions: ["720p", "1080p"], audio: true, imageInput: true, maxRefs: 3 }, notes: "cheapest Veo: realism and dialogue on a budget", eta: 60, cost: 0.05 },
  { id: "veo-3.1-fast", class: "video", tier: "premium", name: "Veo 3.1 Fast", credits: { unit: "second", amount: 23 }, caps: { durations: [4, 6, 8], aspectRatios: ["9:16", "16:9"], resolutions: ["720p", "1080p"], audio: true, imageInput: true, maxRefs: 3 }, notes: "dialogue with lip-sync and SFX, realism", eta: 90, cost: 0.1 },
  { id: "kling-3-pro", class: "video", tier: "premium", name: "Kling 3.0 Pro", credits: { unit: "second", amount: 32 }, caps: { durations: [5, 10], aspectRatios: ["9:16", "16:9", "1:1"], resolutions: ["1080p"], audio: true, imageInput: true, maxRefs: 4 }, notes: "top motion quality", eta: 200, cost: 0.1428 },
  { id: "veo-3.1", class: "video", tier: "premium", name: "Veo 3.1", credits: { unit: "second", amount: 89 }, caps: { durations: [4, 6, 8], aspectRatios: ["9:16", "16:9"], resolutions: ["1080p", "4k"], audio: true, imageInput: true, maxRefs: 3 }, notes: "flagship realism, use only when the client asks", eta: 150, cost: 0.4 },
  // gif
  { id: "gif-loop", class: "gif", tier: "fast", name: "GIF loop (Wan 2.2 480p + ffmpeg)", credits: { unit: "flat", amount: 20 }, caps: { durations: [2, 3, 4], aspectRatios: ["1:1", "9:16", "16:9"], imageInput: true, maxRefs: 1 }, notes: "first frame = last frame for seamless loops; stickers, reactions", eta: 45, cost: 0.05 },
  // music
  { id: "lyria-3.5", class: "music", tier: "hq", name: "Lyria 3.5", credits: { unit: "track", amount: 15 }, caps: { durations: [30, 60] }, notes: "licensed background music, prompt = genre + mood + tempo", eta: 30, cost: 0.04 },
  { id: "stable-audio-2.5", class: "music", tier: "hq", name: "Stable Audio 2.5", credits: { unit: "track", amount: 45 }, caps: { durations: [30, 60, 90, 180] }, notes: "ambient, SFX beds, longer tracks", eta: 40, cost: 0.2 },
  // tts
  { id: "kokoro", class: "tts", tier: "fast", name: "Kokoro", credits: { unit: "1k_chars", amount: 5 }, caps: { languages: ["en", "es", "fr", "ja", "zh"], maxChars: 5000 }, notes: "English narration at near-zero cost", eta: 5, cost: 0.02 },
  { id: "minimax-tts", class: "tts", tier: "hq", name: "MiniMax Speech 2.8 Turbo", credits: { unit: "1k_chars", amount: 14 }, caps: { languages: ["ru", "en", "es", "de", "fr", "pt", "it", "zh", "ja", "ko", "tr", "ar"], maxChars: 5000 }, notes: "good Russian, 30+ languages, emotion control", eta: 6, cost: 0.06 },
  { id: "eleven-v3", class: "tts", tier: "premium", name: "ElevenLabs v3", credits: { unit: "1k_chars", amount: 23 }, caps: { languages: ["ru", "en", "es", "de", "fr", "pt", "it", "zh", "ja"], maxChars: 5000 }, notes: "expressive, emotion tags, voice cloning later", eta: 8, cost: 0.1 },
  // compose
  { id: "compose", class: "compose", name: "Compose (cloud ffmpeg)", credits: { unit: "second", amount: 1 }, caps: { aspectRatios: AR }, notes: "5 credits + 1 credit per 10 s of output; captions from voice included", eta: 30, cost: 0.002 },
];

export const AUTO: Record<string, string> = {
  "auto:image.fast": "z-image", "auto:image.hq": "seedream-4.5", "auto:image.premium": "nano-banana-pro", "auto:image": "seedream-4.5",
  "auto:video.fast": "wan-2.2-fast-720p", "auto:video.hq": "seedance-2-fast", "auto:video.premium": "kling-3-std", "auto:video": "seedance-2-fast",
  "auto:gif": "gif-loop", "auto:music": "lyria-3.5", "auto:tts": "minimax-tts", "auto:tts.fast": "kokoro", "auto:tts.premium": "eleven-v3", "auto:compose": "compose",
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

export function priceFor(model: CatalogModel, input: { duration?: number; n?: number; text?: string; timeline?: { clips?: unknown[] } }): { credits: number; breakdown: string } {
  const c = model.credits;
  if (input.n !== undefined && (!Number.isInteger(input.n) || input.n < 1 || input.n > 4)) throw new Error("n must be 1–4");
  if (input.duration !== undefined && (!Number.isInteger(input.duration) || input.duration <= 0)) throw new Error("duration must be a positive integer");
  const out = priceRaw(model, input);
  if (!Number.isInteger(out.credits) || out.credits <= 0) throw new Error(`invalid price ${out.credits} for ${model.id}`);
  return out;
}

function priceRaw(model: CatalogModel, input: { duration?: number; n?: number; text?: string; timeline?: { clips?: unknown[] } }): { credits: number; breakdown: string } {
  const c = model.credits;
  switch (c.unit) {
    case "image": { const n = input.n ?? 1; return { credits: c.amount * n, breakdown: `${c.amount} × ${n} image(s)` }; }
    case "second": {
      if (model.class === "compose") { const secs = Math.max(10, (input.timeline?.clips?.length ?? 1) * 5); return { credits: 5 + Math.ceil(secs / 10), breakdown: `5 + ${Math.ceil(secs / 10)} (≈${secs}s output)` }; }
      const d = Math.max(input.duration ?? (model.caps.durations?.[0] ?? 5), c.minSeconds ?? 0);
      if (model.class === "gif") return { credits: c.amount, breakdown: "flat" };
      return { credits: c.amount * d, breakdown: `${c.amount}/s × ${d}s` };
    }
    case "track": return { credits: c.amount, breakdown: `${c.amount} per track` };
    case "1k_chars": { const k = Math.max(1, Math.ceil((input.text?.length ?? 0) / 1000)); return { credits: c.amount * k, breakdown: `${c.amount} × ${k}k chars` }; }
    default: return { credits: c.amount, breakdown: "flat" };
  }
}

export * from "./routes.js";

/** Credit packs as shown to agents (source of truth for checkout lives in the API). */
export const PACKS_HINT = [
  { id: "pack_10", usd: 10, credits: 1000 }, { id: "pack_25", usd: 25, credits: 2750 },
  { id: "pack_50", usd: 50, credits: 6000 }, { id: "pack_100", usd: 100, credits: 13000 },
];

/** Subscription plans: credits refreshed every month, spent before purchased credits. Annual = 20% off. */
export const PLANS = [
  { id: "starter", name: "Starter", usdMonth: 12, credits: 1400, blurb: "For trying the workflow on a few videos" },
  { id: "creator", name: "Creator", usdMonth: 29, credits: 3600, blurb: "For creators posting to every platform weekly", badge: "Recommended" },
  { id: "studio", name: "Studio", usdMonth: 79, credits: 10500, blurb: "For studios and agencies running several channels", badge: "Best value" },
] as const;
export const ANNUAL_DISCOUNT = 0.2;
