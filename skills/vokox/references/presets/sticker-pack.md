# Preset: animated sticker pack, 8 emotions (≈ 176 credits)

One character sheet sentence reused in every prompt; only emotion and pose change.
Bases on `auto:image.fast` (2 each), loops on `auto:gif` (20 each).

```json
{
  "name": "stickers", "budget": { "maxCredits": 200 }, "defaults": { "aspectRatio": "1:1" },
  "steps": [
    { "id": "s1", "type": "image", "model": "auto:image.fast",
      "prompt": "{character sheet: flat vector sticker, round orange cat with big eyes, thick white outline, bold shapes, no gradients, plain white background, centred}; emotion: laughing hard, eyes closed" },
    { "id": "g1", "type": "gif", "refs": ["@s1"], "duration": 3,
      "prompt": "the cat bounces slightly while laughing, eyes squeeze, ears wiggle; seamless loop; background static" }
  ]
}
```
Repeat `s2…s8` / `g2…g8` with emotions: laughing, crying, love, angry, sleepy, thumbs up,
facepalm, party. Deliver the `.gif` and `.webp` files; for Telegram stickers convert to WebM
locally if ffmpeg exists (`ffmpeg -i g1.gif -c:v libvpx-vp9 -b:v 0 -crf 30 -an g1.webm`).
