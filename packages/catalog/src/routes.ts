/**
 * Model → provider route table. First healthy provider wins; the user price never changes.
 * Slugs verified 22.09.2026 against public model pages (fal.ai/models/<slug>, wavespeed.ai/models/<slug>)
 * and the public OpenRouter catalogs (/api/v1/images/models, /videos/models). Request parameter
 * names per endpoint still need a live-key smoke test (`node dist/scripts/verify-routes.js`).
 */
export type ProviderId = "mock" | "wavespeed" | "openrouter" | "fal" | "minimax" | "segmind" | "atlas" | "together";

export interface ProviderRoute {
  provider: ProviderId;
  /** Text-to-X model slug at the provider. */
  model: string;
  /** Image-to-video (or edit) slug when the provider uses a different endpoint with a reference. */
  refModel?: string;
  /** Static extra parameters merged into the provider request. */
  params?: Record<string, unknown>;
}

export const ROUTES: Record<string, ProviderRoute[]> = {
  // images
  "minimax-image-01": [{ provider: "minimax", model: "image-01" }],
  "z-image": [{ provider: "wavespeed", model: "wavespeed-ai/z-image/turbo" }],
  "flux-2-klein": [{ provider: "wavespeed", model: "wavespeed-ai/flux-2-klein-4b/text-to-image" }, { provider: "fal", model: "fal-ai/flux-2/klein/4b" }],
  "qwen-image": [{ provider: "wavespeed", model: "wavespeed-ai/qwen-image/text-to-image", refModel: "wavespeed-ai/qwen-image/edit" }, { provider: "fal", model: "fal-ai/qwen-image", refModel: "fal-ai/qwen-image-edit" }],
  "seedream-4.5": [{ provider: "openrouter", model: "bytedance-seed/seedream-4.5" }, { provider: "fal", model: "fal-ai/bytedance/seedream/v4.5/text-to-image", refModel: "fal-ai/bytedance/seedream/v4.5/edit" }],
  "nano-banana-2": [{ provider: "openrouter", model: "google/gemini-3.1-flash-image" }, { provider: "fal", model: "fal-ai/nano-banana-2", refModel: "fal-ai/nano-banana-2/edit" }],
  "gpt-image-2": [{ provider: "openrouter", model: "openai/gpt-image-2" }],
  "nano-banana-pro": [{ provider: "openrouter", model: "google/gemini-3-pro-image" }, { provider: "fal", model: "fal-ai/nano-banana-pro", refModel: "fal-ai/nano-banana-pro/edit" }],
  // video
  "minimax-h3": [{ provider: "minimax", model: "MiniMax-H3" }],
  "minimax-h3-draft": [{ provider: "minimax", model: "MiniMax-H3-Max" }],
  "hailuo-2.3-fast": [{ provider: "atlas", model: "minimax/hailuo-2.3/fast" }, { provider: "fal", model: "fal-ai/minimax/hailuo-2.3-fast/standard/image-to-video" }, { provider: "wavespeed", model: "minimax/hailuo-2.3/fast" }],
  "wan-2.2-fast": [{ provider: "wavespeed", model: "wavespeed-ai/wan-2.2/t2v-480p-ultra-fast", refModel: "wavespeed-ai/wan-2.2/i2v-480p-ultra-fast" }],
  "wan-2.2-fast-720p": [{ provider: "wavespeed", model: "wavespeed-ai/wan-2.2/t2v-720p-ultra-fast", refModel: "wavespeed-ai/wan-2.2/i2v-720p-ultra-fast" }],
  "ltx-2-fast": [{ provider: "fal", model: "fal-ai/ltx-2/fast", refModel: "fal-ai/ltx-2/image-to-video" }],
  "hailuo-2.3": [{ provider: "openrouter", model: "minimax/hailuo-2.3" }, { provider: "wavespeed", model: "minimax/hailuo-2.3/t2v-standard", refModel: "minimax/hailuo-2.3/i2v-standard" }, { provider: "fal", model: "fal-ai/minimax/hailuo-2.3/standard/text-to-video", refModel: "fal-ai/minimax/hailuo-2.3/standard/image-to-video" }],
  "seedance-2-fast": [{ provider: "atlas", model: "bytedance/seedance-2.0-fast/text-to-video", refModel: "bytedance/seedance-2.0-fast/image-to-video" }, { provider: "segmind", model: "seedance-2.0-fast" }, { provider: "openrouter", model: "bytedance/seedance-2.0-fast" }], // Atlas measured $0.0585/s (26.09); WaveSpeed dropped as loss-making
  "wan-2.5": [{ provider: "atlas", model: "alibaba/wan-2.5/text-to-video", refModel: "alibaba/wan-2.5/image-to-video" }, { provider: "fal", model: "fal-ai/wan-25-preview/text-to-video", refModel: "fal-ai/wan-25-preview/image-to-video" }, { provider: "wavespeed", model: "alibaba/wan-2.5/text-to-video", refModel: "alibaba/wan-2.5/image-to-video" }],
  "seedance-2": [{ provider: "openrouter", model: "bytedance/seedance-2.0" }, { provider: "atlas", model: "bytedance/seedance-2.0/text-to-video", refModel: "bytedance/seedance-2.0/image-to-video" }, { provider: "wavespeed", model: "bytedance/seedance-2.0/text-to-video", refModel: "bytedance/seedance-2.0/image-to-video" }], // Atlas measured $0.195/s, dearer than OpenRouter $0.151
  "kling-3-std": [{ provider: "atlas", model: "kwaivgi/kling-v3.0-std/text-to-video", refModel: "kwaivgi/kling-v3.0-std/image-to-video" }, { provider: "wavespeed", model: "kwaivgi/kling-v3.0-std/text-to-video", refModel: "kwaivgi/kling-v3.0-std/image-to-video" }, { provider: "openrouter", model: "kwaivgi/kling-v3.0-std" }, { provider: "fal", model: "fal-ai/kling-video/v3/standard/text-to-video", refModel: "fal-ai/kling-video/v3/standard/image-to-video" }],
  "veo-3.1-lite": [{ provider: "openrouter", model: "google/veo-3.1-lite" }],
  "veo-3.1-fast": [{ provider: "openrouter", model: "google/veo-3.1-fast" }, { provider: "fal", model: "fal-ai/veo3.1/fast", refModel: "fal-ai/veo3.1/fast/image-to-video" }],
  "kling-3-pro": [{ provider: "atlas", model: "kwaivgi/kling-v3.0-pro/text-to-video", refModel: "kwaivgi/kling-v3.0-pro/image-to-video" }, { provider: "wavespeed", model: "kwaivgi/kling-v3.0-pro/text-to-video", refModel: "kwaivgi/kling-v3.0-pro/image-to-video" }, { provider: "openrouter", model: "kwaivgi/kling-v3.0-pro" }, { provider: "fal", model: "fal-ai/kling-video/v3/pro/text-to-video", refModel: "fal-ai/kling-video/v3/pro/image-to-video" }],
  "veo-3.1": [{ provider: "fal", model: "fal-ai/veo3.1", refModel: "fal-ai/veo3.1/image-to-video" }, { provider: "openrouter", model: "google/veo-3.1" }],
  // gif: rendered from a fast i2v/t2v clip, then looped + converted by the compose worker
  "gif-loop": [{ provider: "wavespeed", model: "wavespeed-ai/wan-2.2/t2v-480p-ultra-fast", refModel: "wavespeed-ai/wan-2.2/i2v-480p-ultra-fast" }],
  // music
  "lyria-3.5": [{ provider: "fal", model: "fal-ai/lyria3" }],
  "stable-audio-2.5": [{ provider: "fal", model: "fal-ai/stable-audio-25/text-to-audio" }],
  // tts
  "kokoro": [{ provider: "together", model: "hexgrad/Kokoro-82M" }, { provider: "fal", model: "fal-ai/kokoro/american-english" }],
  "minimax-tts": [{ provider: "minimax", model: "speech-2.8-turbo" }, { provider: "atlas", model: "minimax/speech-2.6-turbo" }, { provider: "fal", model: "fal-ai/minimax/speech-2.6-turbo" }],
  "eleven-v3": [{ provider: "fal", model: "fal-ai/elevenlabs/tts/eleven-v3" }],
  // transcription for captions
  "whisper": [{ provider: "fal", model: "fal-ai/whisper" }],
};

/** Every model id gets the mock provider appended so PROVIDERS=mock runs the whole pipeline offline. */
export function routesFor(modelId: string, enabled: ProviderId[]): ProviderRoute[] {
  const list = [...(ROUTES[modelId] ?? []), { provider: "mock" as const, model: modelId }];
  return list.filter((r) => enabled.includes(r.provider));
}
