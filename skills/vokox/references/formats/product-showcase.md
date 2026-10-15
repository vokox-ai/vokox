# Format: product showcase (no people)

**For:** e-commerce hero videos, launch teasers, marketplace cards, looping website headers,
packshot reels for a new colour or flavour. **Why it works:** the product is the only subject, so
every frame sells it; motion and light show material and scale better than a still. Loops keep
playing and rack up watch time. Sound mode: **music only** (or voice-over, see `narration-demo.md`).

## Beats (10–15 s)

| Time | Shot | Job |
| --- | --- | --- |
| 0–2 s | the most striking detail in motion (macro, splash, light hit) | stop the scroll |
| 2–7 s | hero turn or push in on the full product | shape, label, scale |
| 7–11 s | material or use: pour, fold, click, texture, a hand places it | why it is good |
| 11–15 s | packshot hold on the hero frame | recognition; this frame can loop to the start |

Cut on the beat of the music; vary the camera move from shot to shot (push, orbit, static macro).
Text: at most one 2–4 word line per shot, burned via `captions.text` or rendered into a frame.

## Look

One set for the whole piece: surface, light direction and palette written the same way in every
frame (`kits/product.md`, keep its first sentence verbatim). The product photo supplied by the
user is the first ref of every frame. Dark stone + rim light for premium, white sweep for
marketplaces, a sunlit table for food and home.

## Seamless loop

Give a clip the same frame at both ends: `refs: ["@hero", "@hero"]` on `seedance-2-fast`,
`seedance-2-mini` or `kling-3-std` (two images = first and last frame, no audio ref).
Prompt a closed move: "a full slow orbit that returns to the starting angle". For a website header,
compose a single clip with `"output": { "format": "webm" }` or use `auto:gif` for a 2–4 s GIF.

## Models

| Step | Draft | Final |
| --- | --- | --- |
| frames | `seedream-4.5` (product refs) | same; `nano-banana-2` for edits of one frame |
| turns, pushes, loops | `seedance-2-mini` 720p | `seedance-2-fast` 720p, `"audio": false` |
| liquids, powders, cloth | `hailuo-2.3-fast` 6 s | `hailuo-2.3` 6 s or `kling-3-pro` 5 s |
| music | `lyria-3.5` | same |

`"audio": false` matters here: Seedance and Kling add generated sound by default, and with no voice
track compose plays clip audio under the music.

## Plan skeleton

```json
{
  "name": "showcase", "budget": { "maxCredits": 330 }, "defaults": { "aspectRatio": "9:16" },
  "steps": [
    { "id": "hero", "type": "image", "model": "seedream-4.5", "refs": ["file:./{product}.png"], "prompt": "{kits/product.md: matte black stone, soft top light with thin rim, three-quarter}" },
    { "id": "macro", "type": "image", "model": "seedream-4.5", "refs": ["file:./{product}.png"], "prompt": "{kits/product.md first sentence}; extreme close-up of {texture/cap/label edge}, same stone and light" },
    { "id": "use", "type": "image", "model": "seedream-4.5", "refs": ["file:./{product}.png"], "prompt": "{kits/product.md first sentence}; {liquid about to pour / hand placing it}, same stone and light" },
    { "id": "m1", "type": "video", "model": "seedance-2-fast", "duration": 5, "audio": false, "refs": ["@macro"], "prompt": "static macro, a thin line of light slides across the surface left to right, nothing else moves" },
    { "id": "m2", "type": "video", "model": "seedance-2-fast", "duration": 5, "audio": false, "refs": ["@hero", "@hero"], "prompt": "slow full orbit around the product at constant speed, returning to the starting angle; background and surface still" },
    { "id": "m3", "type": "video", "model": "hailuo-2.3", "duration": 6, "refs": ["@use"], "prompt": "{the pour / the placement} in slow motion, drops catch the rim light, camera locked off" },
    { "id": "music", "type": "music", "duration": 30, "prompt": "{minimal deep house, 118 bpm, no vocals, clean ending}" },
    { "id": "final", "type": "compose", "timeline": {
      "clips": [{ "asset": "@m1", "trim": { "end": 2 } }, { "asset": "@m2" }, { "asset": "@m3", "trim": { "end": 4 } }, { "asset": "@m2", "trim": { "end": 3 } }],
      "music": { "asset": "@music", "volume": 0.9, "fadeOut": 1 },
      "captions": { "text": ["{name}", "{material}", "{benefit}", "{price or CTA}"], "style": "minimal-top" } } }
  ]
}
```

`captions.text` spreads the lines evenly over the whole output; four lines on four similar-length
shots line up roughly. `minimal-top` sits inside the top UI band of TikTok/Reels: fine for web
and marketplaces; for paid social render the line into a frame instead. Music is the only sound
here, so it can sit near full volume.

## Credits

frames 3×8 = 24 · m1 + m2 2×105 = 210 · m3 54 · music 13 · compose 7 → **≈ 308** ($3.08). Draft
(`seedance-2-mini` 720p 25 each, `hailuo-2.3-fast` 48): **≈ 142**. A single 5 s loop for a
website: hero 8 + one `seedance-2-fast` loop 105 + compose 6 ≈ 119.

## Typical failures

| Symptom | Fix |
| --- | --- |
| label or logo warps in motion | slower move, shorter orbit (90° instead of 360°), product ref first |
| product differs between shots | same product photo as ref and the same first sentence in every frame |
| loop jumps at the seam | same frame as first and last ref; a closed camera move; avoid liquid in loop clips |
| looks like a render, not a product | real surface texture, one imperfection (crumb, drop), practical light |
| clip noise under music | `"audio": false` on every video step |
