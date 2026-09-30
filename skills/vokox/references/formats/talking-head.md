# Format: talking head (one person to camera)

**For:** opinions, tips, founder messages, "3 mistakes" advice, replies to comments. **Why it
works:** a face looking into the lens reads as a person talking to you, not an ad; attitude carries
the watch time. Sound mode: **clip sound** (see `index.md`). Close relative: `../presets/talking-head.md`.

## Beats (24 s, three 8 s clips)

| Time | Beat | Script job |
| --- | --- | --- |
| 0–3 s | hook | a claim, a number or a contradiction in one breath; first word before 0.5 s |
| 3–16 s | body | two points, each with one concrete example; one physical accent per point |
| 16–24 s | payoff | the takeaway in one line, then a short ask (follow, comment a word, link) |

Script ≈ 55 EN / 48 RU words. Split on sentence ends into three pieces of ≤ 7.5 s of speech so each
fits an 8 s clip with a breath to spare. Every clip is a fresh take from the same frame: the small
posture change at each cut reads as a creator's jump cut, which is the look we want.

## Casting and look

One frame for the whole video (`kits/ugc-photo.md`): chest-up, face straight to the lens, head in
the upper-middle third, clear air above the head, a room with 2–3 details that say who this person is
(bookshelf and mic for a coach, a workbench for a craftsman). Hands relaxed or holding one prop.
Pick one voice and keep it. Real person? Pass `file:./face.jpg` into the frame step and say "the
person is @image1, keep identity exactly".

## Models

| Step | Draft | Final |
| --- | --- | --- |
| frame | `seedream-4.5`, `n: 2` | same (or `nano-banana-2` from a supplied photo) |
| voice | `kokoro` (EN) / `minimax-tts` | `minimax-tts`, `eleven-v3` for emotion tags |
| clips | `seedance-2-mini` 720p (2 refs: face + voice) | `seedance-2-fast` 720p |

The clip prompt is `kits/talking-head.md`; only PERFORMANCE and CAMERA change per clip.

## Plan skeleton

```json
{
  "name": "talking-head", "budget": { "maxCredits": 650 }, "defaults": { "aspectRatio": "9:16" },
  "steps": [
    { "id": "face", "type": "image", "model": "seedream-4.5", "n": 2, "prompt": "{kits/ugc-photo.md: person, setting; chest-up, face to lens, head in the upper-middle third}" },
    { "id": "s1", "type": "tts", "model": "minimax-tts", "language": "{ru}", "voice": "{ru-female-1}", "text": "{hook + point 1}" },
    { "id": "s2", "type": "tts", "model": "minimax-tts", "language": "{ru}", "voice": "{ru-female-1}", "text": "{point 2}" },
    { "id": "s3", "type": "tts", "model": "minimax-tts", "language": "{ru}", "voice": "{ru-female-1}", "text": "{payoff + ask}" },
    { "id": "c1", "type": "video", "model": "seedance-2-fast", "duration": 8, "refs": ["@face", "@s1"], "prompt": "{kits/talking-head.md; PERFORMANCE: {confident, slightly provocative; eyebrows lift on the number}}" },
    { "id": "c2", "type": "video", "model": "seedance-2-fast", "duration": 8, "refs": ["@face", "@s2"], "prompt": "{kits/talking-head.md; PERFORMANCE: {explaining, one open palm toward the lens at the example}}" },
    { "id": "c3", "type": "video", "model": "seedance-2-fast", "duration": 8, "refs": ["@face", "@s3"], "prompt": "{kits/talking-head.md; PERFORMANCE: {warm, sure; small nod on the last word}}" },
    { "id": "music", "type": "music", "duration": 30, "prompt": "{prompting/audio.md: soft minimal beat, 90 bpm, no vocals}" },
    { "id": "cut", "type": "compose", "timeline": {
      "clips": [{ "asset": "@c1", "trim": { "end": 7.4 } }, { "asset": "@c2", "trim": { "end": 7.2 } }, { "asset": "@c3" }],
      "music": { "asset": "@music", "volume": 0.08, "fadeOut": 1 } } },
    { "id": "final", "type": "compose", "timeline": {
      "clips": [{ "asset": "@cut" }], "captions": { "from": "@cut", "style": "center-pop", "language": "{ru}" } } }
  ]
}
```

Set each `trim.end` to that clip's speech length + 0.2 s after listening (first run without trims is
fine). If the second face variant is better, change `@face` to `@face[1]` in all three clips.

## Credits

face 2×8 = 16 · voice 3×12 = 36 · clips 3×8 s×21 = 504 · music 13 · compose 7 + 6 → **≈ 582**
($5.82). Draft on `seedance-2-mini`: clips 3×8×5 = 120 → **≈ 198**. `seedance-2-fast` at 480p:
clips 240 → ≈ 318.

## Typical failures

| Symptom | Fix |
| --- | --- |
| words swallowed or lips late at the end | speech longer than the clip; shorten the segment or go to 10 s |
| face changes between clips | same `@face` asset in every clip; never re-describe the face in the prompt |
| stiff, repeated head bob | give an attitude plus one accent, not a list of gestures |
| hands melt | keep hands low or holding one object; avoid counting on fingers |
| music fights the voice | clip sound is not ducked: 0.06–0.1 or no music |
| captions over the mouth | face in the upper third; `center-pop` sits mid-frame |
