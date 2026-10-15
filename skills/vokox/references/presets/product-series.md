# Preset: product series, 6 images + 2 turn clips (≈ 170 credits)

```json
{
  "name": "product-series", "budget": { "maxCredits": 200 }, "defaults": { "aspectRatio": "4:5" },
  "steps": [
    { "id": "p1", "type": "image", "model": "seedream-4.5", "refs": ["file:./product.png"], "prompt": "{kits/product.md: matte black stone, soft top light, three-quarter}" },
    { "id": "p2", "type": "image", "model": "seedream-4.5", "refs": ["file:./product.png"], "prompt": "{kits/product.md: sunlit oak table, warm window light, straight-on}" },
    { "id": "p3", "type": "image", "model": "seedream-4.5", "refs": ["file:./product.png"], "prompt": "{kits/product.md: white studio sweep, soft even light, slightly above}" },
    { "id": "p4", "type": "image", "model": "seedream-4.5", "refs": ["file:./product.png"], "prompt": "{kits/product.md: in-hand lifestyle, kitchen, morning light}" },
    { "id": "p5", "type": "image", "model": "nano-banana-2", "refs": ["@p1"], "prompt": "replace the background with a rainy city window at dusk; keep the product, surface and light identical" },
    { "id": "p6", "type": "image", "model": "nano-banana-2", "refs": ["@p1"], "prompt": "add a thin ribbon of steam rising from the product; keep everything else identical" },
    { "id": "t1", "type": "video", "model": "auto:video.hq", "refs": ["@p1"], "duration": 5, "aspectRatio": "9:16", "prompt": "{kits/product.md turn clip}" },
    { "id": "t2", "type": "video", "model": "auto:video.hq", "refs": ["@p3"], "duration": 5, "aspectRatio": "9:16", "prompt": "{kits/product.md turn clip}" }
  ]
}
```
