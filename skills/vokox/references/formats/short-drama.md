# Format: short drama (two characters, one scene, a twist)

**For:** micro-series episodes, story-driven ads ("the product saves the date"), relatable skits,
brand sketches. **Why it works:** people watch to learn what happens next; one want, one obstacle
and one reversal in 30 s hold attention better than any claim. Sound mode: **clip sound** (the
model voices the dialogue; voice samples keep each character's voice the same across clips).

## Beats (≈ 32 s, four 8 s clips)

| Clip | Dramatic job | Direction |
| --- | --- | --- |
| 1 | cold open in the middle of the conflict | a line that raises a question; no introductions |
| 2 | escalation | B pushes back; a look or a withheld answer says more than a line |
| 3 | reversal | new information: a message, an object, an admission; A's reaction carries it |
| 4 | payoff or cliffhanger | the consequence, one closing line, cut on the reaction |

Per clip: 12–18 words of dialogue in 8 s, leave room for the pause. Write cause and effect in the
action line: who moves first, who sees it, which object passes between them, what motivates each cut.

## Casting, world, continuity

1. **Character sheets**: one frame per person (`seedream-4.5`): age bracket, wardrobe with one
   memorable item, hair, a posture that says who they are. Plain background, face to camera.
2. **Two-shot in the location** (`nano-banana-2`, refs = both sheets): both people, the gaze line
   between them, the room with 3–4 story details (a packed suitcase says more than a caption).
3. **Singles derived from the two-shot** (`nano-banana-2`, ref = two-shot): over-the-shoulder on A
   with B's shoulder at the edge, and the reverse; opposite screen sides, same light and time of day.
4. A new place or time = a new two-shot with both sheets as refs, then its singles. Props that
   change state (ring on / off, cup full / empty) get a new frame, not a hopeful prompt.

## Models

| Step | Draft | Final |
| --- | --- | --- |
| sheets, two-shot, singles | `seedream-4.5`, `nano-banana-2` | same (images are cheap; do not draft identity) |
| dialogue clips | `seedance-2-mini` 720p, two-shot only, voices described in words | `seedance-2-fast` 720p, refs `[viewA, viewB, voiceA, voiceB]` |
| silent inserts (door, phone screen, hands) | `wan-2.2-fast-720p` | `kling-3-std` 5 s, `"audio": false` |
| alternative dialogue model | | `veo-3.1-fast` 8 s: strong acting and lip-sync, but no voice refs, so voices vary per clip |

## Plan skeleton

```json
{
  "name": "drama-ep1", "budget": { "maxCredits": 850 }, "defaults": { "aspectRatio": "9:16" },
  "steps": [
    { "id": "sheetA", "type": "image", "model": "seedream-4.5", "prompt": "{character A: woman, early thirties, …; plain grey background, face to camera}" },
    { "id": "sheetB", "type": "image", "model": "seedream-4.5", "prompt": "{character B: …}" },
    { "id": "two", "type": "image", "model": "nano-banana-2", "refs": ["@sheetA", "@sheetB"], "prompt": "@image1 and @image2 {in a small kitchen at night}, {A leans on the counter, B at the door}, looking at each other; {3 story details}; warm practical light, phone-video realism" },
    { "id": "viewA", "type": "image", "model": "nano-banana-2", "refs": ["@two"], "prompt": "same scene, over-the-shoulder close view on the woman, man's shoulder blurred at the right edge; same light and moment" },
    { "id": "viewB", "type": "image", "model": "nano-banana-2", "refs": ["@two"], "prompt": "reverse view: close on the man, woman's shoulder at the left edge; same light and moment" },
    { "id": "voiceA", "type": "tts", "model": "minimax-tts", "language": "{ru}", "voice": "{ru-female-2}", "text": "{two calm neutral sentences in her register}" },
    { "id": "voiceB", "type": "tts", "model": "minimax-tts", "language": "{ru}", "voice": "{ru-male-1}", "text": "{two calm neutral sentences in his register}" },
    { "id": "d1", "type": "video", "model": "seedance-2-fast", "duration": 8, "refs": ["@viewA", "@viewB", "@voiceA", "@voiceB"],
      "prompt": "Realistic vertical dramatic scene. @image1 is A's camera view, @image2 is B's; keep both people, clothes, room and camera sides. A speaks with the voice of @audio1, B with @audio2; only the speaker's mouth moves. Cut to whoever speaks. Speaks {Russian}. A: \"{line}\" B: \"{line}\" ACTION: {cause and effect of this beat}. No music, no on-screen text." },
    { "id": "d2", "type": "video", "model": "seedance-2-fast", "duration": 8, "refs": ["@viewA", "@viewB", "@voiceA", "@voiceB"], "prompt": "{d1 prompt with the escalation lines and ACTION}" },
    { "id": "d3", "type": "video", "model": "seedance-2-fast", "duration": 8, "refs": ["@viewA", "@viewB", "@voiceA", "@voiceB"], "prompt": "{d1 prompt with the reversal lines and ACTION}" },
    { "id": "d4", "type": "video", "model": "seedance-2-fast", "duration": 8, "refs": ["@viewA", "@viewB", "@voiceA", "@voiceB"], "prompt": "{d1 prompt with the payoff line and ACTION}" },
    { "id": "cut", "type": "compose", "timeline": { "clips": [{ "asset": "@d1" }, { "asset": "@d2" }, { "asset": "@d3" }, { "asset": "@d4" }] } },
    { "id": "final", "type": "compose", "timeline": { "clips": [{ "asset": "@cut" }], "captions": { "from": "@cut", "style": "center-pop", "language": "{ru}" } } }
  ]
}
```

Same refs in the same order in every clip. A voice sample is only a timbre reference:
the words come from the prompt, so read the transcript of each clip for changed or missing words.
Music, if any: a quiet bed on `cut` (0.06) or a sting only on the last clip.

## Credits

sheets 16 · two-shot 13 · singles 26 · voice samples 24 · dialogue 4×8 s×21 = 672 · compose 7 + 6
→ **≈ 764** ($7.64). Blocking draft (`seedance-2-mini` 720p, refs `[@two]`, voices in words):
4×8×5 = 160, plus sheets, two-shot and composes → **≈ 202**. Same cast at 480p `seedance-2-fast` (10/s): **≈ 412**.

## Typical failures

| Symptom | Fix |
| --- | --- |
| both mouths move / wrong person speaks | one line per turn with `A:`/`B:`; "only the speaker's mouth moves"; fewer turns per clip |
| voice changes between clips | same voice samples in the same ref order every clip; do not use Veo for recurring voices |
| faces drift after cuts | derive every view from the same two-shot; never describe faces in video prompts |
| characters swap sides | name the sides in the singles; keep A left / B right in every prompt |
| melodrama | direct intent ("she wants him to stay but will not ask"), not emotions to display |
| prop jumps | make a new frame for each changed prop state |
