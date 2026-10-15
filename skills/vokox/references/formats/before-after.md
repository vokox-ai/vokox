# Format: before / after (transformation)

**For:** interior and furniture makeovers, cleaning and detailing, repair, packaging and design
redesigns, landscaping, "our app turns this mess into this". **Why it works:** the viewer sees the
problem, feels the gap and waits for the reveal; the change itself is the proof, no claim needed.
Sound mode: **voice-over** or **music only**.

**Where not to use it:** bodies, skin, weight, hair loss, health. Generated "after" results for a
person are fabricated evidence, and ad policies (TikTok's weight-management and body-image rules,
for one) restrict this kind of content. Use it for objects, spaces and screens, or on the user's own real
photos where the after state is real.

## Beats (≈ 15 s)

| Time | Shot | Job |
| --- | --- | --- |
| 0–2 s | a flash of the after | the promise: the viewer now knows where this goes |
| 2–5 s | the before, a slow push on its worst detail | the problem, felt |
| 5–10 s | the transformation clip: before frame morphs into after frame | the payoff in motion |
| 10–15 s | the after, hero light, then the product / service / CTA | who did it and how to get it |

Hard rule: before and after are the **same camera, same angle, same framing**; only the thing that
changes may change. That is what makes the transformation read as real and the morph clean.

## Frames

1. **Before**: the user's real photo (`file:./before.jpg`) or `seedream-4.5`, 9:16, eye-level,
   the problem clearly visible (clutter, rust, faded paint), flat unflattering light.
2. **After**: `nano-banana-2` with ref = before: "keep camera, framing, walls, window and room
   geometry identical; change only {…}; warm daylight". One edit per change; chain edits if needed.
3. Optional **middle** frame (work in progress: tools, tape, half-painted wall) for a three-step
   story: two clips, before→middle and middle→after.

## Models

The transformation uses two images as first and last frame: `refs: ["@before", "@after"]`.
Supported: `seedance-2-fast`, `seedance-2-mini`, `kling-3-std/pro`. Not `minimax-h3` (two images
put it in reference mode) and no audio ref in that step (Seedance switches to reference mode too).

| Step | Draft | Final |
| --- | --- | --- |
| frames | `seedream-4.5`, `nano-banana-2` | same (the whole format lives on these two frames) |
| transformation | `seedance-2-mini` 720p 5 s | `seedance-2-fast` 5 s or `kling-3-std` 5 s |
| before / after holds | `seedance-2-mini` 720p | same (a slow push is enough) |
| voice | `kokoro` / `minimax-tts` | `minimax-tts` |

## Plan skeleton

```json
{
  "name": "makeover", "budget": { "maxCredits": 250 }, "defaults": { "aspectRatio": "9:16" },
  "steps": [
    { "id": "before", "type": "image", "model": "seedream-4.5", "prompt": "{small living room, worn beige sofa, cluttered shelves, bare bulb}, eye-level from the doorway, vertical, flat grey daylight, phone photo" },
    { "id": "after", "type": "image", "model": "nano-banana-2", "refs": ["@before"], "prompt": "keep the camera, framing, walls, window and floor identical; replace {the sofa with a green velvet one, clear the shelves, add a warm floor lamp}; soft warm evening light" },
    { "id": "vo", "type": "tts", "model": "minimax-tts", "language": "{ru}", "voice": "{ru-female-1}", "text": "{after-first hook. the problem. what we did. offer}" },
    { "id": "holdB", "type": "video", "model": "seedance-2-mini", "duration": 5, "refs": ["@before"], "prompt": "slow push in toward {the worst detail}, camera steady, nothing in the room moves" },
    { "id": "morph", "type": "video", "model": "seedance-2-fast", "duration": 5, "refs": ["@before", "@after"], "prompt": "locked-off camera; the room transforms from the first frame into the last frame: {old objects dissolve, new ones assemble}, light warms gradually; walls, window and floor stay fixed" },
    { "id": "holdA", "type": "video", "model": "seedance-2-mini", "duration": 5, "refs": ["@after"], "prompt": "slow push in, lamp light flickers softly, calm, nothing else moves" },
    { "id": "music", "type": "music", "duration": 30, "prompt": "{uplifting acoustic pop, 105 bpm, no vocals, builds at the middle}" },
    { "id": "final", "type": "compose", "timeline": {
      "clips": [{ "asset": "@holdA", "trim": { "end": 2 } }, { "asset": "@holdB", "trim": { "end": 3 } }, { "asset": "@morph" }, { "asset": "@holdA" }],
      "voice": { "asset": "@vo", "start": 0.2 },
      "music": { "asset": "@music", "volume": 0.2, "duck": true, "fadeOut": 1 },
      "captions": { "from": "@vo", "style": "center-pop", "language": "{ru}" } } }
  ]
}
```

Voice ≤ 14 s (≈ 30 RU / 35 EN words) for 15 s of picture. Without a voice: drop `vo` and the
captions; `captions.text` spaces lines evenly, so "BEFORE"/"AFTER" labels will not land on the cut.
Render such labels into the before and after frames instead (≤ 2 words, upper third).

## Credits

frames 8 + 13 = 21 · voice 12 · holds 2×25 = 50 · morph 105 · music 13 · compose 7 → **≈ 208**
($2.08). Draft (morph on `seedance-2-mini` 25): **≈ 128**. Three-step story with a middle frame:
+13 frame, +105 second morph, +1 compose ≈ 327.

## Typical failures

| Symptom | Fix |
| --- | --- |
| walls or window move during the morph | the after edit changed geometry; redo it with "keep … identical" and compare frames side by side |
| morph is a plain crossfade | describe the physical process ("objects slide out, new ones roll in"); or use `kling-3-std` |
| after looks fake / catalogue-perfect | keep some life (a mug, a throw), same daylight direction as before |
| before is too bad to be credible | one clear problem, not ten |
| reveal too late | show the after in the first 2 s; the story is how we got there |
