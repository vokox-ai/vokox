# Format: ranking / top-N listicle

**For:** "5 gadgets under $50 ranked", "tools I stopped using", tier lists, city or dish rankings,
product line comparisons. **Why it works:** the promise of a winner is an open loop; each item is a
small payoff and the viewer stays for number one. Comments argue with the order, which feeds reach.
Sound mode: **voice-over** (optionally a talking-head hook, see the end).

## Beats (≈ 25 s, top 5)

| Time | Picture | Voice |
| --- | --- | --- |
| 0–2.5 s | the best item, half hidden, or all five at once | the promise: what is ranked and by what yardstick |
| 2.5–20.5 s | items 5 → 2, 4.5 s each | number, name, one reason with an edge (price, fail, surprise) |
| 20.5–25.5 s | item 1, longest shot, hero light | why it wins, in one concrete line |
| last second | same shot | the ask: "which would you put first?" |

Count down, save the best for last, keep one yardstick for all items. Every reason is specific
("battery lasted 3 days", not "great battery"). ≈ 55 EN / 48 RU words, so the voice (≈ 24 s) ends before the
25.5 s of picture does.

## The "board" in our pipeline

There is no persistent graphics layer, so the ranking lives in three places:
- **the voice** says the number first ("Number three:"), and word-timed captions show it;
- **each item's frame** can carry the rank as big text: generate the photo, then a `qwen-image` edit
  with `"add a large bold white number \"3\" in the upper left, keep everything else identical"`;
  keep numbers out of the bottom 35 % and top 14 % (platform UI);
- **visual consistency**: every item shot on the same surface, light and angle so the list reads as
  one series (`kits/product.md`, change only the product line).

## Casting and look

Studio-series look for objects (same sweep or table), street-photo look for places, bold illustrated
cards for abstract items (apps, ideas). Real brands: use the user's product photos as `refs`; do not
let a model draw another company's logo.

## Models

| Step | Draft | Final |
| --- | --- | --- |
| voice | `kokoro` / `minimax-tts` | `minimax-tts`, `eleven-v3` for attitude |
| item frames | `z-image` | `seedream-4.5` with product refs; `qwen-image` edit for the number |
| item clips | `seedance-2-mini` 480p (3/s) | `hailuo-2.3-fast` 6 s (needs the frame) or `seedance-2-mini` 720p |
| winner clip | same | `seedance-2-fast` 5 s or `kling-3-std` 5 s |

Items only need a slow push, a turn or one small action: a premium model is wasted here.

## Plan skeleton

```json
{
  "name": "top5", "budget": { "maxCredits": 450 }, "defaults": { "aspectRatio": "9:16" },
  "steps": [
    { "id": "vo", "type": "tts", "model": "minimax-tts", "language": "{ru}", "voice": "{ru-male-2}", "text": "{promise. Number five: … Number one: … ask}" },
    { "id": "i5", "type": "image", "model": "seedream-4.5", "refs": ["file:./{item5}.png"], "prompt": "{kits/product.md: shared surface and light, item 5}" },
    { "id": "i4", "type": "image", "model": "seedream-4.5", "refs": ["file:./{item4}.png"], "prompt": "{kits/product.md: shared surface and light, item 4}" },
    { "id": "i3", "type": "image", "model": "seedream-4.5", "refs": ["file:./{item3}.png"], "prompt": "{kits/product.md: shared surface and light, item 3}" },
    { "id": "i2", "type": "image", "model": "seedream-4.5", "refs": ["file:./{item2}.png"], "prompt": "{kits/product.md: shared surface and light, item 2}" },
    { "id": "i1", "type": "image", "model": "seedream-4.5", "refs": ["file:./{item1}.png"], "prompt": "{kits/product.md: shared surface and light, item 1}" },
    { "id": "k5", "type": "video", "model": "hailuo-2.3-fast", "duration": 6, "refs": ["@i5"], "prompt": "slow push in, light glides across the object, background still" },
    { "id": "k4", "type": "video", "model": "hailuo-2.3-fast", "duration": 6, "refs": ["@i4"], "prompt": "slow push in, light glides across the object, background still" },
    { "id": "k3", "type": "video", "model": "hailuo-2.3-fast", "duration": 6, "refs": ["@i3"], "prompt": "slow push in, light glides across the object, background still" },
    { "id": "k2", "type": "video", "model": "hailuo-2.3-fast", "duration": 6, "refs": ["@i2"], "prompt": "slow push in, light glides across the object, background still" },
    { "id": "k1", "type": "video", "model": "seedance-2-fast", "duration": 5, "audio": false, "refs": ["@i1"], "prompt": "{kits/product.md turn clip}, a warm light sweep lands on it at the end" },
    { "id": "music", "type": "music", "duration": 30, "prompt": "{punchy minimal trap, 120 bpm, no vocals, small riser near the end}" },
    { "id": "final", "type": "compose", "timeline": {
      "clips": [{ "asset": "@k1", "trim": { "end": 2.5 } }, { "asset": "@k5", "trim": { "end": 4.5 } }, { "asset": "@k4", "trim": { "end": 4.5 } }, { "asset": "@k3", "trim": { "end": 4.5 } }, { "asset": "@k2", "trim": { "end": 4.5 } }, { "asset": "@k1" }],
      "voice": { "asset": "@vo", "start": 0.2 },
      "music": { "asset": "@music", "volume": 0.2, "duck": true },
      "captions": { "from": "@vo", "style": "center-pop", "language": "{ru}" } } }
  ]
}
```

The hook reuses the winner clip. For big rank numbers, add a `qwen-image` step per item between
`i‹n›` and `k‹n›` (refs `["@i‹n›"]`, the prompt quoted above) and point `k‹n›` at it: +6 each.

## Credits

voice 12 · frames 5×8 = 40 · items 4×48 = 192 · winner 105 · music 13 · compose 8 →
**≈ 370** ($3.70); with rank-number edits 5×6 → ≈ 400. Draft (`z-image` 5×2, `seedance-2-mini`
480p 5 s ×5 = 75): **≈ 118**.

**Talking-head hook variant:** a host says the promise on camera, the voice-over does the rest.
A voice track mutes clip audio, so nest two composes: `body` = the item clips with `voice` (the
script without the promise) and captions; `final` = `clips: [@host, @body]` with no `voice`, so both
keep their own sound. Host: `seedream-4.5` face 8 + hook TTS 12 + `seedance-2-fast` 5 s 105 + one
more compose 6 ≈ +131. The hook itself has no captions in this setup; keep it one short line.

## Typical failures

| Symptom | Fix |
| --- | --- |
| items look like five different videos | same surface, light, lens and framing words in every frame |
| number drifts or morphs in motion | camera move only; no hands, no object motion; or leave the number to captions |
| voice and pictures out of step | measure `vo`, then set each `trim.end` to its sentence length |
| boring reasons | one hard fact per item; cut adjectives |
| winner does not feel like a payoff | longest shot, different light, music accent at its start |
