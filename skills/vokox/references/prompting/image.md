# Directing images

Most images in a VokoX plan are not the final product: they are key frames that a video model
will animate, product plates for a series, or sticker bases. Write each prompt for the job the
picture will do next. Model notes below come from the vendors' own guides (see Sources).

## Structure

Simple image (object, icon, sticker, thumbnail): one paragraph, 40–80 words.
`[subject and key details] → [pose or action] → [framing: close-up / medium / wide, centred or
rule of thirds] → [environment] → [light] → [medium: camera + lens + film, or illustration
technique] → [palette and mood]`. Concrete nouns and materials ("brushed aluminium", "wet
cobblestone") beat adjectives ("beautiful", "premium").

Person in a place (key frame for UGC, talking head, lifestyle): 90–180 words in up to four short
paragraphs, each doing one job. Leave a paragraph out when a reference already covers it.

| Paragraph | Job | Typical content |
| --- | --- | --- |
| Look | What kind of image is this? | Medium and capture: phone video frame, editorial film, studio packshot, flat vector. For phone footage use `kits/ugc-photo.md` word for word. |
| Subject | Who or what do we want to look at? | Casting, appeal, build, hair, makeup, wardrobe; or the product with its exact features. |
| Shot | Where is the camera, and what is the subject doing? | Framing, distance, posture, where the face sits, gaze, hands, props, a foreground object. |
| Place | Where are we? | A nameable location, its palette, 3–5 physical features that give depth. |

These are jobs, not forms to fill. One phrase can settle hair ("a sleek low bun"); a style label
plus one signature item can settle an outfit. Write the paragraphs as one picture: the jacket is
part of the palette, the table explains why the person sits off-centre.

## Pick the few choices that decide the picture

Before writing, name the handful of decisions that change the whole image and commit to each:
who (background, age, how striking), what look (a style idea), which place, which colour pair,
where the face sits. "A guy in a café" leaves every one of them to chance, and the
model fills them with its most average guess. A short prompt with firm choices beats a long one
with vague ones.

Spend detail only where it protects something: an exact label, the logo lettering, a watch that
must stay visible under a rolled cuff, a shoulder line that keeps the proportions right. Leave
incidental things (the number of leaves on a plant, the exact fold of a sleeve) to the model.
When adapting a reference image, first say in one line what makes it work ("relaxed preppy
styling, warm tungsten café, subject framed by a doorway"), then keep only the details the new
picture actually needs. Copying every observed detail makes prompts longer, not more faithful.

## Describe the picture, not the concept

The model draws what the words literally name. Translate the plan into visible consequences:

- Later a caption will sit on the left → "she stands in the right third; a plain plaster wall
  fills the left side". The caption itself is not in the image prompt; compose adds it.
- "Showing off the new blender" → pick the actual action: "one hand on the lid, the jug half full
  of green smoothie".
- Figurative words become props. "Drowning in emails" may produce water; "Crushing it" may
  produce a crushed object. Rewrite them as what the camera would see.
- Role words ("founder", "creator", "expert") describe a job, not a face. Keep the role if it
  matters, then still cast and dress the person.
- State the use when it sets the polish level: "vertical hero image for a skincare ad", "main
  photo for a marketplace listing", "sticker for a messenger pack". Seedream's and OpenAI's
  guides both recommend naming the application.

## Look: name the capture concretely

Choose one medium and use its vocabulary: a still from phone video, a 35mm street photo, a
medium-format fashion editorial, a clean e-commerce packshot on white sweep, a flat vector
sticker, a soft clay 3D render. Camera and lens words ("85mm, f/1.8, low angle", "wide 24mm")
steer look and perspective on every model we sell; treat them as style direction, not physics.

**UGC phone look:** `kits/ugc-photo.md` (fixed capture paragraph + Subject, Shot, Place). Best on
`gpt-image-2` (OpenAI's guide: "iPhone photo" / "real photograph" push realism; ask for real
texture, not studio polish) and `seedream-4.5`.

Do not bolt on "realism" by default: grain, dim light, harsh shadows, blown highlights and tired
skin are aesthetic choices, not proof of authenticity. For phone-footage frames the kit already
carries the whole capture paragraph; add light only when the scene has a real light event
("late sun through blinds throws stripes across the desk").

## Casting a person worth watching

- Open with background and a real adult age bracket: "a Brazilian man in his late twenties".
  State complexion when you are choosing it; a nationality alone does not decide it.
- Say how striking the person is and in what way, with a comparison type: "strikingly handsome,
  with the easy looks of a surf-brand campaign model", "remarkably pretty, the polished look of a
  young sitcom lead". Plain "attractive" or "well-groomed" gives a generic face; appeal is a
  deliberate casting goal, and realism does not require making someone plain.
- Use a current style label to settle hair, makeup, clothes and attitude at once: old-money,
  gorpcore, dark academia, Y2K, quiet luxury, skater, athleisure. Then add one or two specific
  items ("a cream cable-knit over a collared shirt, thin gold chain").
- For half-body presenters add a build anchor, because models often shrink shoulders under a
  large head: "a wide, strong shoulder line, head in natural proportion to the shoulders". Keep
  it in every view of that person.
- A supplied face (`refs`) owns identity; the prompt only develops styling and mood around it.
  Wardrobe and background in plain words; avoid brand names you do not own.

## Shot: how the camera meets the subject

For a frame the person will speak from (talking head, UGC reaction), settle each of these:

| Decide | Example wording | Why |
| --- | --- | --- |
| Framing and distance | "vertical medium close-up, chest up, camera about an arm's length away" | Framing sets what is visible; distance sets intimacy. |
| Posture | "perched on a kitchen stool" / "standing at the counter" | Tells the model where the body is and how it rests. |
| Address | "talking to the viewer, mid-sentence" | Creates an ongoing exchange the video can continue. |
| Hands | "one hand holding the jar, the other open in a small explaining gesture" | Hands with a job look natural; skip finger-level choreography. |
| Face direction | "face square to the lens, head level, eyes on the camera" | Required when the frame will be lip-synced or animated. |
| Placement | "face in the upper third, slightly left of centre" | Chosen for the crop and the caption space. |
| Foreground anchor | "the corner of a marble counter enters the lower right" | Balances an off-centre subject and explains the pose. |

Two people: say who looks at whom ("he looks toward her, three-quarter to camera") and keep the
axis in every derived view. Use "screen-left / screen-right" (as the viewer sees it), never
"her left", which flips between angles.

### Start from a resting state

A key frame should hold a state the video can move out of, not the peak of an action. A person
mid-conversation, relaxed and engaged, can go anywhere; a frozen shout or a half-thrown punch
locks the clip into one beat and often animates badly. Put the peak (the laugh, the pour, the
reveal) in the video prompt. Choose a story moment in the still only when the still is the
final deliverable.

## Frame for what the image will become

- **First frame for video.** Leave room for the planned motion: headroom for a stand-up,
  space ahead of a walk, the whole product in frame before an orbit. Nothing important touching
  the edge. Keep the face frontal if speech is coming.
- **Crop-safe.** Generate at the delivery ratio (`aspectRatio` in the plan: `9:16`, `4:5`, `1:1`,
  `16:9`, `3:2`). If one image must serve several ratios, keep the subject and any text inside
  the central square so 9:16, 1:1 and 16:9 crops all survive.
- **Captions and UI.** In 9:16, the bottom ~20 % is covered by captions and platform buttons and
  the top ~10 % by the username bar: keep faces and products out of those bands. Ask for calm,
  low-detail area where text will go ("the upper third is open sky").

## Place: a nameable location and a few real features

Start with a place the model knows ("a tiled Lisbon tram stop", "a narrow Tbilisi bakery with a
clay tone oven", "a bike repair shop in Amsterdam"), give it a palette, then add 3–5 physical
features. Prefer features that build depth (an open doorway, a staircase, a window with the
street beyond, a shelf aisle running back) over flat surface decoration; a wall of posters is
still one wall. One object can carry story and colour at once: a half-eaten slice of cake says
"visit in progress". Stop there and let the model finish the architecture.

### One clear colour relationship

Choose the palette on purpose, looking at complexion, hair colour and outfit as part of it. The big areas
need a relationship (contrast or harmony); small things accent: "mustard knit against teal
tiles and dark wood", "rust overshirt, slate-blue wall, brass fittings". Name hues directly. Avoid the
default of white clothes on a white wall, which merges the person into the background; a real
material (tile, timber, linen, foliage) gives variation that "textured" alone cannot. Keep exact
product and wardrobe colours and choose the surroundings to support them. FLUX.2 also accepts
hex codes tied to a named object ("a mug in color #1566E8").

## Product shots

Name the product exactly as the reference shows it and put the reference first in `refs`.
"Keep the product identical to the reference: shape, label, colours." Then surface, light,
props, angle: "on a matte black stone slab, soft top light with a thin rim, 85mm, shallow focus,
three-quarter angle from slightly above". Variants: change surface and light, keep the product
line. Template: `kits/product.md`.

## References own facts, prompts own the rest

A reference is the only reliable source for identity: a real face, the exact product, a logo,
an existing location. Text cannot reproduce them. So:

- Give every reference a role, by position, in the order of `refs`: "Image 1 is the product, keep
  it identical; Image 2 is the woman, keep her face and hair; Image 3 is only the colour mood".
  Google, OpenAI, Seedream and BFL all advise naming each input's role this way.
- Say what goes where ("the jacket from Image 2 on the man from Image 1"); unlabelled references
  get blended unpredictably.
- Naming an image in the text is not attaching it; it must be in `refs`. A derived view (closer crop,
  product now in hand, other angle of the same room) can be short: what stays, what changes.
  Another angle shows another part of the same place, not a mirror copy of the first background.
- Reference limits (`models-and-pricing.md`): `z-image` and `flux-2-klein` none; `minimax-image-01`
  and `qwen-image` one; `nano-banana-2` 3; `seedream-4.5`, `gpt-image-2` 4; `nano-banana-pro` 6.

## Editing: describe only the change

`nano-banana-2`, `nano-banana-pro`, `gpt-image-2`, `seedream-4.5`, `qwen-image` with the source in
`refs`. Start with the verb, name the target without pronouns, then list what stays: "replace the
background with a sunlit kitchen; keep the person, pose, clothing and lighting identical".
Never re-describe the whole image. OpenAI's guide: "change only X, keep everything else the same"
and repeat the keep-list on every round, or details drift. Seedream accepts arrows, boxes or
scribbles drawn on the reference to mark the region ("put a lamp where the red box is"). If a
result is mostly right, edit it rather than regenerate from scratch.

## Text in images

- Exact words in double quotes, then font feel, size, colour and position: `the headline
  "BLUE HOUR" in tall condensed sans, cream, across the top third`. Describe hierarchy for
  multiple lines (headline, subline, small date).
- Spell unusual brand words letter by letter for `gpt-image-2`; add "no other text, no extra
  characters" when copy must be exact.
- Best for real layouts: `nano-banana-pro` (posters, menus, infographics, translating text into
  another language), `gpt-image-2`, `qwen-image` (English and Chinese, multi-line layouts),
  `seedream-4.5`. `z-image` renders short English/Chinese strings in quotes. `flux-2-klein`:
  keep it to a short headline.
- Burned-in text is costly to fix or translate later; for subtitles or anything over ~8 words
  use `captions` in compose. For "no text at all", say so positively ("a plain unmarked label").

## Illustration, 3D, stickers

Commit to the medium's vocabulary: "flat vector sticker, thick white outline, bold shapes, no
gradients, transparent background feel, centred, plain background" for sticker bases; "soft
clay 3D render, pastel palette, studio light" for 3D icons. Sticker packs: same character sheet
words in every prompt, vary only the emotion and pose. Seedream can generate a consistent set
(its guide lists storyboards, icon sets and emoji packs); across plan steps keep the shared
character and style words identical and change only what differs per item.

## Series: keep what worked

- Keep an accepted image's exact prompt, model, seed, refs and aspect (plan + manifest). The next
  image starts from that text, not from memory or a "cleaned-up" rewrite. Change one decision per
  variant, keep the rest verbatim; reuse the accepted image as a ref for a recurring person.
- Judge first by the person, the appeal and the feeling, then by framing, colour and whether the
  hands and props suit the next step. Do not turn the lucky details of one render (a reflection,
  a tile pattern) into requirements for the next.
- For views meant to cut together, check them side by side: same person, same palette, gaze
  axes that agree, props that stay in the same hand unless something moved them.

## Negative prompts

`negativePrompt` default: `text, watermark, logo, blurry, extra fingers, deformed hands, cropped
face`. It is ignored by `flux-2-klein` (FLUX.2 has no negative prompt) and `z-image` (the Turbo
pipeline runs without guidance), and Google's Nano Banana guide asks for positive phrasing too.
On those models, and as a habit, describe the wanted state: "an empty street", not "no cars".

## Per-model notes

| id | Best at | How to prompt it |
| --- | --- | --- |
| `minimax-image-01` | Cheapest usable image; same character across many scenes | One reference only, a character (subject) reference; a clear portrait works best. The vendor's own example is a compact list of descriptors, so short prompts are fine. Good for drafts of a recurring persona. |
| `z-image` | Fast photoreal drafts, thumbnails, sticker bases; bilingual text | Distilled Turbo model: negative prompt ignored, so phrase every constraint positively. Put quoted text in English or Chinese. Detailed descriptive prompts help; no refs in our catalog. |
| `flux-2-klein` | Speed and volume; clean design shots | FLUX.2 reads the start of the prompt most: subject → action → style → context. 30–80 words is the sweet spot. Klein does no prompt expansion, so write the full description yourself. Quoted text with placement and size; hex colours tied to objects. No negatives; no refs in our catalog. |
| `qwen-image` | Text-heavy layouts in English/Chinese; edits with one ref | Quote every string and say where it sits. The authors append ", Ultra HD, 4K, cinematic composition." to English prompts; optional. Native ratios include 1:1, 16:9, 9:16, 4:3, 3:2. |
| `seedream-4.5` | Photoreal people and products; consistent sets; multi-ref composites | Full sentences (subject + action + setting, then style, colour, light, composition), not tag lists. Concise and precise beats piled adjectives. Name the use. Quotes for text. Edits: short, no vague pronouns, state what stays. Up to 4 refs here; say what each contributes. |
| `nano-banana-2` | Edits and consistency with references; general quality at 1–2K | Narrative description, not keywords. Lead with a strong verb for the operation. Positive phrasing. Give every ref an explicit role. Iterate on a near-miss instead of rerolling. 1K default; 2K priced separately. |
| `gpt-image-2` | Instruction following, UGC realism, text, identity-safe edits | Order: scene → subject → key details → constraints, plus the intended use; line breaks between labelled parts are fine. "Photorealistic", "real photograph", "iPhone photo" push realism; ask for pores, fabric wear, candid moments. Refs by index and description. Reliable up to 2K. |
| `nano-banana-pro` | Hardest scenes, dense text, infographics, 4K, many refs | Same prompting as Nano Banana 2; it reasons through complex, multi-element prompts, so a detailed layout description pays off. Best choice for posters and localised text. Up to 6 refs here. |

## Worked examples

**Product (seedream-4.5, refs = [bottle photo], 4:5)**
Weak: "A beautiful premium bottle of olive oil on a table, high quality, 4K."
Why: adjectives instead of choices, no surface/light/angle, product not tied to the reference.
Strong: "The olive oil bottle from Image 1, identical shape, label and green glass. It stands
on a weathered limestone ledge beside a sprig of rosemary and half a lemon, three-quarter angle
from slightly above. Low late-afternoon sun from the left, long soft shadow, warm backlight
through the oil. Terracotta wall behind, out of focus. Editorial food still life, 85mm. Main
image for a marketplace listing; bottle centred with space above."

**UGC key frame (gpt-image-2, 9:16, then lip-synced)**
Weak: "A young influencer holding a skincare product in her room, realistic."
Why: no casting, no shot, the room and palette unchosen, face direction unknown for lip-sync.
Strong: capture paragraph from `kits/ugc-photo.md`, then: "A Vietnamese-Australian woman in her
mid-twenties, remarkably pretty with a fresh, open face, clean glowy makeup, glossy dark bob,
cream ribbed tank top, wide strong shoulder line." / "Vertical medium close-up at arm's length.
She sits cross-legged on her bed, face square to the lens, head level, mid-sentence, holding a
small amber serum bottle beside her cheek, other hand in a light explaining gesture. Face in
the upper third." / "A small bedroom: sage-green wall, rattan headboard, a window with sheer
curtains on the right, a stack of books on the side table."

**Food (flux-2-klein, 4:5, headline added in compose)**
Weak: "Delicious khachapuri, food photography, appetizing."
Why: "delicious" is not visible; nothing says what the frame looks like or where text goes.
Strong: "Adjarian khachapuri, boat-shaped bread with a bright raw yolk and a square of butter
melting into bubbling cheese, on a dark cast-iron pan. Overhead 45-degree angle, pan in the
lower two-thirds, a linen towel and a glass of amber wine at the edges. Soft window light from
the right, deep charcoal tabletop. Upper third left calm and dark for a headline."

**Fashion with two refs (nano-banana-2, 3:2)**
Weak: "Model wearing our jacket in the city, cool vibe."
Why: which jacket and which face? "Cool vibe" is a mood, not a picture.
Strong: "Put the man from Image 1 in the quilted olive jacket from Image 2; keep his face,
hair and the jacket's stitching and zip exactly. He walks toward the camera across a zebra
crossing in the evening, hands in pockets, full body visible, feet included. A wet Tokyo side
street with neon shop signs, blue hour, reflections on the asphalt. Street-style editorial,
35mm, eye level. Olive jacket against cool blue and magenta."

**Poster with text (nano-banana-pro, 4:5)**
Weak: "Poster for a jazz night called Blue Hour on Friday."
Why: no exact copy, no hierarchy, no layout, so the model invents words and placement.
Strong: "Design a vertical concert poster. A double-bass player seen from behind on a small
stage, lit by one deep-blue spotlight, smoke in the beam; flat screen-print style, two inks:
navy and warm cream. Top third: the title "BLUE HOUR" in tall condensed sans, cream. Below it,
smaller: "Live jazz · Friday 9 PM". Bottom edge, small caps: "THE CELLAR, 12 DOCK STREET". No
other text."

## Sources

- Google, Gemini API image generation: https://ai.google.dev/gemini-api/docs/image-generation
- Google Cloud, Nano Banana prompting guide: https://cloud.google.com/blog/products/ai-machine-learning/ultimate-prompting-guide-for-nano-banana
- Google, Nano Banana Pro tips: https://blog.google/products-and-platforms/products/gemini/prompting-tips-nano-banana-pro/
- OpenAI, GPT Image prompting guide: https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide
- BytePlus ModelArk, Seedream 4.0–4.5 prompt guide: https://docs.byteplus.com/en/docs/ModelArk/1829186
- Black Forest Labs, FLUX.2 prompting guide: https://docs.bfl.ai/guides/prompting_guide_flux2
- Black Forest Labs, FLUX.2 overview (klein): https://docs.bfl.ai/flux_2/flux2_overview
- Qwen, Qwen-Image model card: https://huggingface.co/Qwen/Qwen-Image
- Tongyi-MAI, Z-Image-Turbo model card: https://huggingface.co/Tongyi-MAI/Z-Image-Turbo
- MiniMax, image generation guide: https://platform.minimax.io/docs/guides/image-generation
