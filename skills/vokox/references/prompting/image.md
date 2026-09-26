# Directing images

## Structure (40–80 words, one paragraph)

`[subject and key details] → [pose or action] → [framing: close-up / medium / wide, centred or
rule of thirds] → [environment] → [light] → [medium: camera + lens + film, or illustration
technique] → [palette and mood]`. Concrete nouns and materials ("brushed aluminium", "wet
cobblestone") beat adjectives ("beautiful", "premium").

## Casting anchors that work

- Start with `a woman` / `a man` + a real adult age bracket ("in her early thirties"); add one
  presence cue ("with the ease of a seasoned presenter") and one physical anchor ("broad shoulders,
  good head-to-shoulder proportion"). Vague "attractive" produces generic faces.
- Face toward the lens, no head tilt, when the image will be animated or lip-synced.
- Wardrobe and background in plain words; avoid brand names you do not own.

## UGC phone look (for ads that must feel real)

"A photograph captured as a single frame from a video shot on an iPhone, with the texture of real
phone footage. Looks real, no oily over-processed finish. Background clearly visible, no
depth-of-field blur. Natural fine skin texture. Slight handheld tilt." Add the person, the product
in hand, the room. Works best on `gpt-image-2` and `seedream-4.5`.

## Product shots

Name the product exactly as the reference shows it and put the reference first in `refs`.
"Keep the product identical to the reference: shape, label, colours." Then surface, light,
props, angle: "on a matte black stone slab, soft top light with a thin rim, 85mm, shallow focus,
three-quarter angle from slightly above". Variants: change surface and light, keep the product line.

## Editing with references (`nano-banana-2`, `nano-banana-pro`, `qwen-image`)

Describe only the change: "replace the background with a sunlit kitchen; keep the person, pose,
clothing and lighting identical". Never re-describe the whole image.

## Text in images

`flux-2-klein` and `qwen-image` render short text reliably: put the exact text in double quotes,
say the font feel ("bold sans, white on dark"), keep it under 4 words. For anything longer use
captions in compose.

## Illustration, 3D, stickers

Commit to the medium's vocabulary: "flat vector sticker, thick white outline, bold shapes, no
gradients, transparent background feel, centred, plain background" for sticker bases; "soft
clay 3D render, pastel palette, studio light" for 3D icons. Sticker packs: same character sheet
words in every prompt, vary only the emotion and pose.

## Negative prompt defaults

`text, watermark, logo, blurry, extra fingers, deformed hands, cropped face`.
