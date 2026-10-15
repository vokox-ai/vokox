# Preset: 20-second UGC ad with voice (≈ 500 credits final, ≈ 150 as a draft)

Structure: hook (creator to camera, 5 s) → product b-roll under voice-over (2 × 5 s) → creator CTA
(5 s). Script ≈ 45 EN / 40 RU words, split into three TTS steps: the hook line, the middle, the CTA
line. Product photo supplied as `./product.png`.

Why three voice steps: a lip-synced clip follows the start of its audio reference, so each talking
clip gets exactly its own line. The b-roll pair is composed with its voice-over first, then the
final compose joins three clips that all carry their own sound (clip-sound mode, see
`formats/index.md`).

```json
{
  "name": "ugc-ad", "budget": { "maxCredits": 600 },
  "defaults": { "aspectRatio": "9:16", "resolution": "720p" },
  "steps": [
    { "id": "vo_hook", "type": "tts", "language": "ru", "voice": "ru-female-1", "text": "{hook sentence, ≤ 12 words}" },
    { "id": "vo_mid", "type": "tts", "language": "ru", "voice": "ru-female-1", "text": "{problem + proof, ≈ 22 words}" },
    { "id": "vo_cta", "type": "tts", "language": "ru", "voice": "ru-female-1", "text": "{CTA sentence, ≤ 10 words}" },
    { "id": "face", "type": "image", "model": "seedream-4.5", "n": 2,
      "prompt": "{kits/ugc-photo.md with the creator holding the product}", "refs": ["file:./product.png"] },
    { "id": "hero", "type": "image", "model": "seedream-4.5",
      "prompt": "{kits/product.md image prompt}", "refs": ["file:./product.png"] },
    { "id": "hook", "type": "video", "model": "seedance-2-fast", "duration": 5, "refs": ["@face", "@vo_hook"],
      "prompt": "{kits/talking-head.md; INTENTION: sharing a find she is excited about; quote the hook line}" },
    { "id": "broll1", "type": "video", "model": "seedance-2-fast", "duration": 5, "audio": false, "refs": ["@hero"],
      "prompt": "{kits/broll.md: slow push in, a hand enters and lifts the product}" },
    { "id": "broll2", "type": "video", "model": "seedance-2-fast", "duration": 5, "audio": false, "refs": ["@hero"],
      "prompt": "{kits/broll.md: gentle orbit, a light sweep crosses the label}" },
    { "id": "cta", "type": "video", "model": "seedance-2-fast", "duration": 5, "refs": ["@face", "@vo_cta"],
      "prompt": "{kits/talking-head.md; INTENTION: a warm, direct recommendation, small nod on the last word; quote the CTA line}" },
    { "id": "mid", "type": "compose", "timeline": {
      "clips": [{ "asset": "@broll1" }, { "asset": "@broll2", "transition": "cut" }],
      "voice": { "asset": "@vo_mid" } } },
    { "id": "music", "type": "music", "prompt": "{prompting/audio.md: upbeat, light, 100 bpm, instrumental}", "duration": 30 },
    { "id": "final", "type": "compose", "timeline": {
      "clips": [{ "asset": "@hook" }, { "asset": "@mid" }, { "asset": "@cta" }],
      "music": { "asset": "@music", "volume": 0.08, "fadeOut": 1.5 },
      "captions": { "text": ["{hook line}", "{middle, part 1}", "{middle, part 2}", "{CTA line}"], "style": "bold-bottom" } } }
  ]
}
```

- Captions use `text` because the speech lives inside three clips; write lines of similar spoken
  length so the evenly spread cues stay near their words (`prompting/captions.md`).
- Music ducking reacts only to a compose `voice` track, so in clip-sound mode keep music at 0.06–0.1.
- Draft first: the same plan with `seedance-2-mini` and `"resolution": "480p"` on the four video
  steps (≈ 150 credits) proves the hook, the lip-sync and the product motion; then run the final.
- Richer (≈ 900): `seedance-2` talking clips, `kling-3-std` b-roll, `eleven-v3` voice.
