# Preset: 30-second talking head explainer (≈ 520 credits with seedance-2, ≈ 330 with seedance-2-fast)

Script ≈ 65 RU words split into three 10 s segments on sentence ends. One face image, one voice.

```json
{
  "name": "explainer", "budget": { "maxCredits": 600 }, "defaults": { "aspectRatio": "9:16", "resolution": "720p" },
  "steps": [
    { "id": "v1", "type": "tts", "language": "ru", "voice": "ru-male-1", "text": "{segment 1}" },
    { "id": "v2", "type": "tts", "language": "ru", "voice": "ru-male-1", "text": "{segment 2}" },
    { "id": "v3", "type": "tts", "language": "ru", "voice": "ru-male-1", "text": "{segment 3}" },
    { "id": "face", "type": "image", "model": "gpt-image-2", "prompt": "{kits/ugc-photo.md, desk setting, face straight to lens}" },
    { "id": "c1", "type": "video", "model": "seedance-2", "duration": 10, "refs": ["@face", "@v1"], "prompt": "{kits/talking-head.md; PERFORMANCE: calm authority, opening the topic}" },
    { "id": "c2", "type": "video", "model": "seedance-2", "duration": 10, "refs": ["@face", "@v2"], "prompt": "{kits/talking-head.md; PERFORMANCE: explaining with one open-hand gesture at the key point}" },
    { "id": "c3", "type": "video", "model": "seedance-2", "duration": 10, "refs": ["@face", "@v3"], "prompt": "{kits/talking-head.md; PERFORMANCE: conclusion, slight smile and nod}" },
    { "id": "final", "type": "compose", "timeline": {
      "clips": [{ "asset": "@c1" }, { "asset": "@c2" }, { "asset": "@c3" }],
      "captions": { "text": ["{caption line per segment}"], "style": "bold-bottom" } } }
  ]
}
```
Voice is inside each clip (lip-synced), so no separate `voice` track in compose.
