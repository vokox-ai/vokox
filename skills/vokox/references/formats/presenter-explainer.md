# Format: presenter explainer (a person explains, the picture demonstrates)

**For:** how something works, a feature walkthrough with a face, "why X beats Y", mini-lessons.
**Why it works:** the presenter gives trust and tempo; the cutaways give proof. The viewer hears one
person the whole time while the picture keeps changing to what is being said. Sound mode: **clip
sound**. If nobody needs to appear on camera, use `narration-demo.md` instead: it is cheaper.

## Beats (≈ 27 s)

| Time | Picture | Job |
| --- | --- | --- |
| 0–8 s | presenter to camera | hook: the question or the surprising result |
| 8–18 s | presenter, then a cutaway inside the same clip | the mechanism: show the object doing it while the voice keeps going |
| 18–22 s | silent demonstration beat | the proof: result, comparison, before/after of the process; music only |
| 22–27 s | presenter back | the takeaway and the ask |

Rule for every cutaway: it shows the claim happening (a hand does the step, the screen changes, the
result appears), not a stock picture of the noun just spoken.

## Our tools for "cover the presenter with a demo"

There is no overlay or picture-in-picture layer. Three ways that work:
1. **Cutaway inside the clip.** Give the video model the presenter frame, a demo frame and the
   speech; direct the cut with timestamps: `[0-4s] presenter to camera; [4-8s] close-up of @image2
   as the voice continues off-screen`. Speech stays continuous because it is one generation.
   Timestamps are documented for `seedance-2`; on `seedance-2-fast` keep to one cutaway per clip.
2. **Silent beat between sentences.** A demo clip with `"audio": false` between two speaking clips;
   the music carries it. Keep it 3–6 s, give it a visible event.
3. **Graphics as frames.** A diagram, number or 2–4 word label is an image (`flux-2-klein`,
   `qwen-image`: exact text in quotes), animated with a slow push. Longer text goes in captions.

## Casting and look

Presenter frame as in `talking-head.md` but mid-shot with room at the side for gestures toward the
demo. Demo frames share the presenter's palette and light (same room, same desk) so cuts feel like
one shoot. Real product or UI: pass it as a ref to the demo frame; never let a model invent a logo.

## Models

| Step | Draft | Final |
| --- | --- | --- |
| presenter frame, demo frames | `seedream-4.5`; edits `nano-banana-2` | same |
| speaking clips, cutaway clip | `seedance-2-fast` 480p | `seedance-2-fast` 720p (up to 4 refs: face, demo, speech) |
| silent demo beat | `wan-2.2-fast-720p` 5 s | `hailuo-2.3-fast` 6 s (physics, needs an image) |

## Plan skeleton

```json
{
  "name": "explainer", "budget": { "maxCredits": 700 }, "defaults": { "aspectRatio": "9:16" },
  "steps": [
    { "id": "face", "type": "image", "model": "seedream-4.5", "n": 2, "prompt": "{kits/ugc-photo.md: presenter mid-shot at a desk, room on the left for gestures}" },
    { "id": "demo1", "type": "image", "model": "nano-banana-2", "refs": ["@face", "file:./{product}.png"], "prompt": "close-up of the same desk: {the product doing the step}; same light and palette" },
    { "id": "demo2", "type": "image", "model": "seedream-4.5", "prompt": "{the result as a visible state}" },
    { "id": "s1", "type": "tts", "model": "minimax-tts", "language": "{ru}", "voice": "{ru-male-1}", "text": "{hook}" },
    { "id": "s2", "type": "tts", "model": "minimax-tts", "language": "{ru}", "voice": "{ru-male-1}", "text": "{mechanism, ≤ 9 s}" },
    { "id": "s3", "type": "tts", "model": "minimax-tts", "language": "{ru}", "voice": "{ru-male-1}", "text": "{takeaway + ask}" },
    { "id": "c1", "type": "video", "model": "seedance-2-fast", "duration": 8, "refs": ["@face", "@s1"], "prompt": "{kits/talking-head.md; PERFORMANCE: curious, leans in on the question}" },
    { "id": "c2", "type": "video", "model": "seedance-2-fast", "duration": 10, "refs": ["@face", "@demo1", "@s2"], "prompt": "@image1 is the presenter, @image2 the close-up of the desk, @audio1 the speech with clear lip-sync. [0-4s] presenter explains to the lens; [4-10s] cut to @image2: {hands perform the step}, the voice continues off-screen, nobody on screen speaks. No on-screen text." },
    { "id": "c3", "type": "video", "model": "hailuo-2.3-fast", "duration": 6, "audio": false, "refs": ["@demo2"], "prompt": "{kits/broll.md: slow push in, the result settles, practical real footage}" },
    { "id": "c4", "type": "video", "model": "seedance-2-fast", "duration": 5, "refs": ["@face", "@s3"], "prompt": "{kits/talking-head.md; PERFORMANCE: settled, sure, small nod}" },
    { "id": "music", "type": "music", "duration": 30, "prompt": "{light curious electronic, 100 bpm, no vocals, ends cleanly}" },
    { "id": "cut", "type": "compose", "timeline": {
      "clips": [{ "asset": "@c1" }, { "asset": "@c2" }, { "asset": "@c3", "trim": { "end": 4 } }, { "asset": "@c4" }],
      "music": { "asset": "@music", "volume": 0.08 } } },
    { "id": "final", "type": "compose", "timeline": { "clips": [{ "asset": "@cut" }], "captions": { "from": "@cut", "style": "center-pop", "language": "{ru}" } } }
  ]
}
```

## Credits

images 16 + 13 + 8 = 37 · voice 36 · c1 168 · c2 210 · c3 48 · c4 105 · music 13 · compose 7 + 6
→ **≈ 630** ($6.30). Draft (speaking clips at 480p = 10/s, c3 on `wan-2.2-fast-720p` 25):
**≈ 354**.

## Typical failures

| Symptom | Fix |
| --- | --- |
| presenter still talking on the cutaway | say "the voice continues off-screen, nobody on screen speaks"; put the cut on a sentence break |
| cutaway ignored, one long shot | shorter first shot, name the reference: "cut to @image2"; retake on `seedance-2` |
| demo looks unrelated to the room | derive the demo frame from `@face` with `nano-banana-2`, same light words |
| label text garbled | ≤ 4 words on `flux-2-klein`/`qwen-image`, or move it to captions |
| silent beat feels dead | give it a visible event and a music accent; keep it under 5 s |
