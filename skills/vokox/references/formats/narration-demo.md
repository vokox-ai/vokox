# Format: narration demo (voice-over product or app walkthrough)

**For:** app and SaaS demos, gadget and kitchen-tool demos, "how it works in 20 seconds", tutorials,
explainer reels where no face is needed. **Why it works:** one steady voice sets the pace; every cut
answers the sentence it sits under. Cheapest people-free format with a story. Sound mode:
**voice-over** (one TTS track, clips are picture only, captions straight from the voice).

## Beats (20–25 s)

| Time | Picture | Voice |
| --- | --- | --- |
| 0–3 s | the result or the pain, already in motion | the promise in one line |
| 3–8 s | context: hand picks up the device, app opens | who it is for, what it replaces |
| 8–18 s | 2–3 proof shots: the step, the screen change, the outcome | one claim per shot |
| 18–23 s | hero shot of product or final screen | the offer and the action |

Write the script first (≈ 50 EN / 45 RU words), mark which sentence each shot sits under, then
choose shot lengths from the sentence lengths. One shot per claim; a claim about speed needs a
visibly fast action, a claim about ease needs one hand doing it.

## Screens and UI

Models cannot draw a real interface reliably. In order of preference:
1. **Real screen recording** straight into compose: `{ "asset": "file:./screen.mp4" }`. Record it
   vertical (phone, or a 9:16 browser window); a landscape capture is center-cropped. Free except
   compose; keep to the part that matches the sentence with `trim`.
2. **Screenshot in a hand**: `nano-banana-2` with refs `[file:./screenshot.png]` places it on a phone
   held in a scene; animate with a slow push only (tapping makes the UI melt).
3. Generated UI only for abstract "dashboard" feelings, never for a feature claim.

## Models

| Step | Draft | Final |
| --- | --- | --- |
| voice | `kokoro` (EN, 5) / `minimax-tts` (12) | `minimax-tts`, `eleven-v3` |
| frames | `z-image` / `seedream-4.5` | `seedream-4.5`, `nano-banana-2` for screen and product placement |
| hands and device clips | `seedance-2-mini` 720p | `seedance-2-fast` or `kling-3-std` (hands, fabric) |
| physics shots (pour, spray, drop) | `wan-2.2-fast-720p` | `hailuo-2.3` 6 s |

Clip audio is discarded because a voice track is set, so the `audio` flag does not matter here.

## Plan skeleton

```json
{
  "name": "app-demo", "budget": { "maxCredits": 350 }, "defaults": { "aspectRatio": "9:16" },
  "steps": [
    { "id": "vo", "type": "tts", "model": "minimax-tts", "language": "{en}", "voice": "{en-female-1}", "text": "{script, ~50 words, promise first}" },
    { "id": "hero", "type": "image", "model": "seedream-4.5", "refs": ["file:./{product}.png"], "prompt": "{kits/product.md: in-hand, desk, morning light}" },
    { "id": "phone", "type": "image", "model": "nano-banana-2", "refs": ["file:./{screenshot}.png"], "prompt": "a hand holds a phone showing exactly this screen, {setting}, screen sharp and readable, natural light" },
    { "id": "b1", "type": "video", "model": "seedance-2-fast", "duration": 5, "refs": ["@hero"], "prompt": "{kits/broll.md: handheld follow, the hand lifts the product toward the lens}" },
    { "id": "b2", "type": "video", "model": "seedance-2-fast", "duration": 5, "refs": ["@phone"], "prompt": "slow push in on the phone; the hand stays still; the screen content does not change; soft daylight" },
    { "id": "b3", "type": "video", "model": "hailuo-2.3", "duration": 6, "refs": ["@hero"], "prompt": "{kits/broll.md: the outcome as physical action}" },
    { "id": "music", "type": "music", "duration": 30, "prompt": "{bright minimal pop, 110 bpm, no vocals, ends cleanly}" },
    { "id": "final", "type": "compose", "timeline": {
      "clips": [{ "asset": "@b3", "trim": { "end": 4 } }, { "asset": "@b1" }, { "asset": "file:./screen.mp4", "trim": { "start": 2, "end": 9 } }, { "asset": "@b2" }],
      "voice": { "asset": "@vo", "start": 0.2 },
      "music": { "asset": "@music", "volume": 0.18, "duck": true, "fadeOut": 1.5 },
      "captions": { "from": "@vo", "style": "bold-bottom", "language": "{en}" } } }
  ]
}
```

The output is as long as the clips, not the voice: here 4 + 5 + 7 + 5 = 21 s of picture
for a voice of ≤ 20.5 s or the last words are cut. Check `vo` length before choosing trims.

## Credits

voice 12 · frames 8 + 13 = 21 · b1 + b2 2×105 = 210 · b3 54 · screen recording 0 · music 13 ·
compose 7 → **≈ 317** ($3.17). Draft (`seedance-2-mini` 25 each, `wan-2.2-fast-720p` 25 for b3):
**≈ 128**.

## Typical failures

| Symptom | Fix |
| --- | --- |
| pictures are "wallpaper" under the words | each shot must show the claim of its sentence happening |
| UI text scrambled in a generated clip | real recording, or screenshot-in-hand with a camera move only |
| voice cut at the end | clips shorter than the voice; add a hero hold at the end |
| screen recording cropped | record vertical; compose fills and crops the center |
| captions unreadable over a busy screen | `minimal-top` over UI shots, or shorter lines in the script |
