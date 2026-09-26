# Preset: 20-second UGC ad with voice (≈ 240 credits)

Structure: hook (creator to camera, 5 s) → problem/product b-roll (5 s) → proof b-roll (5 s) →
creator CTA (5 s). Voice ≈ 45 EN / 40 RU words. Product photo supplied as `./product.png`.

```json
{
  "name": "ugc-ad", "budget": { "maxCredits": 320 },
  "defaults": { "aspectRatio": "9:16", "resolution": "720p" },
  "steps": [
    { "id": "voice", "type": "tts", "language": "ru", "voice": "ru-female-1",
      "text": "{script, ~40 words, hook in the first sentence}" },
    { "id": "face", "type": "image", "model": "gpt-image-2", "n": 2,
      "prompt": "{kits/ugc-photo.md with the creator holding the product}",
      "refs": ["file:./product.png"] },
    { "id": "hero", "type": "image", "model": "seedream-4.5",
      "prompt": "{kits/product.md image prompt}", "refs": ["file:./product.png"] },
    { "id": "hook", "type": "video", "model": "seedance-2-fast", "duration": 5,
      "refs": ["@face", "@voice"],
      "prompt": "{kits/talking-head.md; PERFORMANCE: eager, sharing a find; delivers the first two sentences of @audio1}" },
    { "id": "broll1", "type": "video", "model": "auto:video.hq", "duration": 5, "refs": ["@hero"],
      "prompt": "{kits/broll.md: slow push in, hand picks up the product, practical real footage}" },
    { "id": "broll2", "type": "video", "model": "auto:video.hq", "duration": 5, "refs": ["@hero"],
      "prompt": "{kits/broll.md: gentle orbit, product beauty, light glides across the label}" },
    { "id": "cta", "type": "video", "model": "seedance-2-fast", "duration": 5,
      "refs": ["@face", "@voice"],
      "prompt": "{kits/talking-head.md; PERFORMANCE: warm, direct recommendation, small nod at the end; delivers the last sentence of @audio1}" },
    { "id": "music", "type": "music", "prompt": "{prompting/audio.md: upbeat, light, 100 bpm, no vocals}", "duration": 30 },
    { "id": "final", "type": "compose", "timeline": {
      "clips": [{ "asset": "@hook" }, { "asset": "@broll1", "transition": "cut" }, { "asset": "@broll2" }, { "asset": "@cta" }],
      "voice": { "asset": "@voice" },
      "music": { "asset": "@music", "volume": 0.18, "duck": true, "fadeOut": 1.5 },
      "captions": { "from": "@voice", "style": "bold-bottom", "language": "ru" } } }
  ]
}
```

Cheaper (≈ 140): drop `cta`, use `auto:video.fast` for b-roll, `kokoro` for English voice.
Richer (≈ 600): `seedance-2` 10 s talking segments, `kling-3-std` b-roll, `eleven-v3` voice.
