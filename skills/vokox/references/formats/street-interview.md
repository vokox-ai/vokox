# Format: street interview (vox pop)

**For:** "asking people on the street…" hooks, opinion polls as entertainment, product reveal through
a stranger's answer, brand quizzes. **Why it works:** a question makes the viewer answer in their
head; the stranger's answer is the payoff, and a surprising one gets shared. The stranger is the
star; the interviewer only opens doors. Sound mode: **clip sound**.

**Honesty rule:** a generated passer-by is a character. Label the video as AI (platform setting),
never caption it as a real survey or real person, never cast a recognizable public figure.

## Beats (≈ 28 s, three clips)

| Clip | Picture | Job |
| --- | --- | --- |
| 1 (10 s) | shared two-shot → guest close | the question (≤ 8 words, in the first 2 s) and a first answer |
| 2 (10 s) | guest close, one cut to interviewer close | follow-up; the interviewer's reaction to the surprising part |
| 3 (8 s) | guest close | the punchline, then the guest starts to turn away |

Opening life: the guest is busy with something (checking a bag, a coffee, a phone) and looks up at
the question. Ending life: after the last line the guest begins to leave. Middle: a couple of
motivated gestures (a shrug that dismisses, a laugh at their own answer), never constant motion.

## Three views, one encounter

1. **Shared view** (`seedream-4.5`): interviewer with a handheld mic and guest on a real-looking
   street, both in frame, facing each other at a slight angle, daylight, phone-footage realism.
2. **Guest close** (`nano-banana-2`, ref = shared): chest-up on the guest, the mic entering from the
   interviewer's side, guest looking just off-lens toward the interviewer.
3. **Interviewer close** (`nano-banana-2`, ref = shared): reverse angle, part of the guest's shoulder
   at the opposite edge so the exchange stays readable.

The mic never leaves the interviewer's hand; it just tilts to the person talking. Cuts jump between these
three setups only; no invented camera travel between them.

## Models

`seedance-2-fast` takes 4 refs, so each clip gets the two views it needs plus both voice samples.
`minimax-h3` (19/s at 768p, 9 refs) can take all three views and both voices in one clip.

| Step | Draft | Final |
| --- | --- | --- |
| views | `seedream-4.5`, `nano-banana-2` | same |
| clips | `seedance-2-fast` 480p (10/s) | `seedance-2-fast` 720p (21/s) or `minimax-h3` 768p (19/s) |

## Plan skeleton

```json
{
  "name": "street", "budget": { "maxCredits": 700 }, "defaults": { "aspectRatio": "9:16" },
  "steps": [
    { "id": "shared", "type": "image", "model": "seedream-4.5", "prompt": "{interviewer: …, holding a black handheld mic} and {guest: …, looking into a tote bag} on {a sunny shopping street}, both in frame facing each other, eye-level phone footage, background clearly visible" },
    { "id": "guest", "type": "image", "model": "nano-banana-2", "refs": ["@shared"], "prompt": "same moment, chest-up on the guest, the mic enters from the left edge, she looks just off-lens toward the interviewer" },
    { "id": "host", "type": "image", "model": "nano-banana-2", "refs": ["@shared"], "prompt": "reverse angle, chest-up on the interviewer holding the mic, the guest's shoulder at the right edge" },
    { "id": "voiceA", "type": "tts", "model": "minimax-tts", "language": "{ru}", "voice": "{ru-male-2}", "text": "{two lively neutral sentences}" },
    { "id": "voiceB", "type": "tts", "model": "minimax-tts", "language": "{ru}", "voice": "{ru-female-1}", "text": "{two neutral sentences}" },
    { "id": "q1", "type": "video", "model": "seedance-2-fast", "duration": 10, "refs": ["@shared", "@guest", "@voiceA", "@voiceB"],
      "prompt": "Realistic vertical street interview. @image1 is the shared two-person setup, @image2 the guest close setup; every shot is exactly one of them. A is the interviewer with the mic, voice @audio1; B is the guest, voice @audio2; only the speaker's mouth moves. A keeps the mic and tilts it toward B when B answers. Open in @image1: B looks into her bag, A steps in and asks; B looks up. Cut to @image2 for her answer. Slight handheld sway, street ambience, no music, no on-screen text. Speaks {Russian}. A: \"{question}\" B: \"{answer}\"" },
    { "id": "q2", "type": "video", "model": "seedance-2-fast", "duration": 10, "refs": ["@guest", "@host", "@voiceA", "@voiceB"], "prompt": "{q1 contract with @image1 = guest close, @image2 = interviewer close; follow-up question, answer, cut to the interviewer's disbelief}" },
    { "id": "q3", "type": "video", "model": "seedance-2-fast", "duration": 8, "refs": ["@shared", "@guest", "@voiceA", "@voiceB"], "prompt": "{q1 contract; punchline in @image2, then she smiles and starts to walk away}" },
    { "id": "cut", "type": "compose", "timeline": { "clips": [{ "asset": "@q1" }, { "asset": "@q2" }, { "asset": "@q3" }] } },
    { "id": "final", "type": "compose", "timeline": { "clips": [{ "asset": "@cut" }], "captions": { "from": "@cut", "style": "center-pop", "language": "{ru}" } } }
  ]
}
```

`q2` swaps the setups (guest and interviewer close), so its prompt must say which `@image` is which.
Skip music: street ambience from the clips is the bed.

## Credits

views 8 + 13 + 13 = 34 · voice samples 24 · clips (10 + 10 + 8) s × 21 = 588 · compose 7 + 6 →
**≈ 659** ($6.59). On `minimax-h3`: 28 × 19 = 532 → ≈ 603. Draft at 480p (10/s): **≈ 351**.

## Typical failures

| Symptom | Fix |
| --- | --- |
| mic jumps hands or vanishes | state mic ownership in every prompt; the mic is in all three views |
| a fourth "camera" appears | "every shot is exactly one of the supplied setups"; one or two cuts per clip |
| guest stares into the lens | the guest views must look off-lens toward the interviewer |
| answers feel scripted | short spoken sentences, a filler word, a laugh; the guest is allowed to disagree |
| background people talk or morph | fewer passers-by in the shared view; a quieter side street |
