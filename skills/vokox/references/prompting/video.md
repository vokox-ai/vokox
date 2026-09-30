# Directing video

A video prompt says what should change on screen over a few seconds. The reference image already
holds who and where; the prompt adds cause, motion, camera and sound. Read top to bottom the first
time; later jump to the section you need (per-model notes, worked examples, sources at the end).

## Structure of a prompt (60–110 words, present tense, prose, no lists)

1. **Shot and camera**: close-up / medium / wide; static, slow dolly in, handheld follow, orbit,
   crane up, whip pan. Name the lens feel when it matters (35mm wide, 85mm portrait, macro).
2. **Subject** with 2–4 concrete details (age bracket, wardrobe, material, colour).
3. **One action** with direction and speed ("turns the cup slowly toward camera", "walks left to
   right at a relaxed pace"). One action per clip. Two actions produce a morph.
4. **Setting and time of day**, **light** (golden hour, soft window light, rim light, neon).
5. **Style**: "shot on iPhone, natural colours" for UGC; "35mm film, shallow depth of field" for cinematic.
6. **What stays still** ("background static, camera locked off") when calm is wanted.
7. Optional audio, only on audio models: dialogue in quotes, `SFX: …`, `Ambient: …`.

Avoid: "4K, masterpiece, trending, cinematic lighting" filler; negatives phrased as "no X"
(describe the wanted state instead); numbers of people above three; text on screen (add captions
in compose instead); scene changes or "then" inside a single-shot clip.

## Image-to-video

The reference already defines who and where. Describe **only** motion, camera and atmosphere:
"Camera pushes in slowly; she lifts the cup, smiles at the lens, steam rises; soft window light,
gentle handheld sway." Re-describing the subject fights the image and drifts identity. The one
exception is the start state of the action (see "Ground the action"): say where the motion begins
when the frame could be read two ways.

## Give every input one job

Each input answers one question. When two inputs answer the same question they fight; when none
answers it the model guesses.

| Input | Its job | Not its job |
| --- | --- | --- |
| Key-frame / character image | the look: face, wardrobe, place, light, framing | motion, timing |
| Product / screen / logo image | facts that must stay exact (shape, label, UI) | where the product goes |
| Video reference | movement: a body action, a camera path, an effect's timing | who appears, what they wear |
| Audio reference | voice identity and timing of speech | what the room looks like |
| Quoted lines in the prompt | the exact words, who says them, in which language | performance by itself |
| Prompt prose | what changes: cause, action, camera, reaction, sound design | re-describing the picture |

Name each reference's role in the prompt ("the woman from @image1", "the camera path of @video1"),
in the same order as `refs`. A reference with no stated role is read as "copy everything".

## Choose the generation relationship

| Relationship | Use when | vokox models |
| --- | --- | --- |
| Text-to-video | no identity, product or composition must be kept; mood pieces, abstract b-roll | all except `hailuo-2.3-fast` |
| First frame (image-to-video) | the shot must start on an approved picture: product, face, set | all; one image ref |
| Multi-reference | identity, product and place come from separate images; no fixed first frame | `seedance-2*`, `minimax-h3*`, `kling-3-*`, `veo-3.1*` |
| Video reference | a specific camera move or body movement must be followed | `seedance-2-mini`, `seedance-2-fast`, `seedance-2`, `minimax-h3` |
| Audio reference | a voice must be kept or speech must be lip-synced | `seedance-2*`, `minimax-h3*` |

Default for controlled work: generate the key frame, approve it, animate it. Text-to-video is for
shots where nothing has to match. A video reference costs its own seconds on top of the output
(see `models-and-pricing.md`); trim it to the part that carries the movement before uploading.
Ready templates: `kits/camera-reference.md`, `kits/motion-reference.md`, `kits/video-call.md`,
`kits/talking-head.md`, `kits/broll.md`.

## Ground the action in what the start frame shows

The model animates forward from the first frame. It does not know the story before it; it only
sees the state. Write the action as the next few seconds of **that** state, with visible causes.

- **Read the frame first.** Where is the subject now: on the ground or in the air, holding the
  object or not, is the liquid already there? The verb must continue that state. "Takes off" on a
  frame where the plane is already airborne gives a jet that seems to leave from standstill in mid-air.
- **Every new thing needs a source on screen.** A drop must form at the dropper tip, swell, and
  fall; if the prompt just says "a drop falls", it pops into existence. Smoke needs something
  burning, a reflection needs a light, a splash needs water that is already in the frame.
- **Cause before effect, with contact.** A splash happens because a foot lands in water of a
  certain depth; spray goes away from the impact and falls back. Name the contact point, the
  direction and the settle. If the frame has no puddle, fix the frame, not the prompt.
- **Pick a physically plausible amount.** "A few drops", "a thin stream", "ankle-deep puddle" beat
  "splash" or "explosion of water". Scale words decide how much the model invents.
- **Finish the motion.** Say where it ends ("comes to rest", "settles back into the palm"). Open
  endings drift into a second, unwanted action in the last second.
- **Figurative words become objects.** "Her worries melt away" may literally melt something; "the
  app saves time" may spawn clocks. Translate ideas into a visible behaviour (she exhales, shoulders
  drop) before writing the prompt.
- **Gesture vs event.** A mimed rocket and a real one are different shots; write which one you mean.

## Direct the reason, not only the movement

Motion without a reason looks like a mannequin being operated. Give the subject a small want and
let the movement follow from it: she glances at her watch *because she is late* (quick glance, lips
tighten, pace picks up); he turns the jar *to read the label* (tilts it to the light, eyes narrow).
The reason decides speed, direction, where the eyes go and when the action stops, so one clause of
motivation replaces five clauses of choreography.

For a person on camera, state the relationship first: who they are talking to and how they feel
about the thing they say. "Letting a close friend in on a trick she is a little proud of" already
implies warmth, a quicker pace and a smile at the payoff. Then add at most one or two physical
accents tied to the line that deserves them. "Lively" or "calm" only says how loud the performance
is; the attitude says what it is about. Give both.

Let the clip overlap a bigger moment: the barista is mid-wipe when the shot opens, the courier is
already reaching for the door as it ends. Those edges make it look observed rather than posed.

## Restraint with a purpose

Stillness is a choice, not an absence. A doctor reading a result can barely move and still read as
concerned if the prompt says what she is weighing: "she reads the number twice, her jaw sets, she
looks up only at the last word". A bored teenager can be nearly motionless and still funny: "slumped,
he lets the pitch run on, then raises one eyebrow". A still body keeps breathing and blinking on its
own; what makes it acting is a clear opinion about what is said. Do not add gestures just
to fill a quiet shot, and do not ask hands to show exact numbers of fingers; the voice and captions
carry numbers better.

## Performance for people on camera (talking heads, UGC, dialogue)

- **Intention** in one sentence: to whom, about what, with which feeling ("reassuring a nervous
  first-time customer", "calling out a bad habit, half-joking").
- **Energy** that fits the platform: social hooks are brighter and faster; explainers are steadier.
- **Gaze**: at the lens for direct address; at a partner for dialogue; down at the product while
  demonstrating, back to the lens for the claim. Say when the eyes change.
- **One accent per passage**: the price, the reveal, the punchline. Tie it to the exact quoted words.
  Several accents in one 5-second clip read as twitching.
- **Delivery of quoted lines (audio models only)**: put the words in quotes, name the speaker and the
  tone in a short parenthesis, keep one language per clip: `The barista (dry, amused): "Oat milk
  again? Bold choice."` Speakers who are not talking stay silent but alive (nods, eyes following).
- **Listeners and reactions**: a silent reaction shot is often better than a second line of speech.
- **Language**: the published native-speech language lists (Seedance 1.5 Pro, Kling 3.0) omit Russian.
  For Russian speech generate the voice with TTS first and pass it as the audio reference, and test
  on `seedance-2-mini` before the final model.
- **Framing**: keep the talking frame stable (locked phone or light handheld) so the face has room
  to act; save camera moves for b-roll.

## Camera moves and cuts belong to the story

- **One camera move per shot.** Push in, orbit, pan: pick one. Stacking several destabilises the
  image (Seedance guide); treat one move as the default on every model.
- **Write the move as a path**: start framing → move → how far → end framing. "Starts on a medium
  shot of the counter, pushes in slowly until the jar fills the frame."
- **Motivate the move.** The camera goes where attention should go: pushes in on a realisation,
  pulls back to reveal scale, follows a hand to the product. A move with no reason reads as drift.
- **Talking heads cut in the edit.** Generate 5–10 s passages and join them in `compose`; the cut
  between two clips with the same key frame reads as a creator's jump cut and hides seams.
- **Cuts inside one generation** (Seedance, Kling, Veo and H3 support multi-shot): write
  `Shot 1: … Shot 2: …` in story order. Use it for a quick exchange or a reveal that must share one
  sound bed; generate separate clips when you may want to recut, retake or reorder later.

## One generation or separate clips

| Keep in one clip | Split into separate clips |
| --- | --- |
| one continuous action (pour, reveal, walk-and-talk) | a plot turn, a new place, a new time |
| a short two-line exchange with shared room sound | lines longer than the model's duration |
| a reaction that must answer a line directly | shots you may reorder or trim in the edit |
| an effect whose timing must stay intact | b-roll that covers different words of the voice-over |

Separate clips meet at cuts; a continuous action across two generations will not match pose to pose.
If the join must be seamless, either keep it in one clip or cut away (insert, reaction) at the seam.

## B-roll that illustrates the spoken idea

B-roll exists to show what the words claim: proof, a detail, an association, or the life of the
speaker. Choose per line:

- **Exact match**: the line names something the viewer must see ("scan the receipt") → one clip
  showing exactly that, cut in on the word. Only the visible part matters; a 5 s clip may show 2 s.
- **Montage over a thought**: the line describes a habit or a feeling ("every morning was chaos")
  → 2–4 short clips that together give the idea; nouns do not need to land on cuts.
- **People live in b-roll**: the same creator cooking, commuting, working makes an ad feel lived-in.
  They act and do not talk to camera; the voice-over carries speech.
- **Material mode**: practical phone footage, product beauty, filmed screen demo, proof (receipt,
  review, chart as a physical object), or a deliberate visual metaphor. State one per clip.
- **Sound**: b-roll under a voice-over is generated silent (`audio` off) or muted in compose, or it
  will fight the voice.
- **Cover every frame on purpose.** A clip shorter than its slot shows the layer underneath; trim
  clips in `compose`, do not stretch or freeze them to fill time.

## Continuity across clips

- **Same key frame, same words.** Reuse the exact reference image and copy the wardrobe, light and
  lens sentence verbatim into every prompt of the sequence.
- **Derive new angles from the master frame** (image edit with the master as ref) rather than
  generating each angle from scratch; place, palette and props then agree.
- **Screen direction and gaze.** If A looks right toward B, B's view looks left. Keep who holds what
  (phone in the left hand) and give every change of possession a visible cause.
- **Keep only what the cut needs.** A lifestyle montage may change clothes and place; a product
  close-up after a wide shot must keep the label, colour and light exact.
- **Judge in sequence.** Review consecutive clips back to back, not as single frames.

## Size duration and resolution to the delivery

- **Words decide seconds.** Speech: 2.3–2.6 words/s in English, 2.0–2.3 in Russian, plus room for
  the reaction. Round up to an allowed duration of the model (see `models-and-pricing.md`).
- **Do not pad.** A line that needs 3 s in an 8 s clip makes the model invent extra action or
  silence. Add a reaction beat or pair it with the next line instead.
- **Draft ladder**: explore on `seedance-2-mini` 480p or `wan-2.2-fast` → approve framing and
  motion → final on the chosen tier and 720p/1080p. Only the approved shots go to the final model.
- **Vertical social**: 3–5 s per shot, the first shot carries the hook. Product turns: 5 s.
  Talking head: 8–10 s passages cut on sentence ends. Keep the total under 25 s unless asked.
- **Video refs are billed** per reference second; a 4 s excerpt around the move beats a 15 s file.

## Per-model notes (from the official guides; our ids)

**Seedance 2.0 family** (`seedance-2-mini`, `seedance-2-fast`, `seedance-2`)
- Order: subject → action → environment → camera → style → constraints. Shortest unambiguous wins.
- Bind a subject to its image every time ("the woman from @image1") or define a label once
  ("call her the barista") and reuse only that label. Asset ids in prose mean nothing to the model.
- Complex clips: a `Shot 1 / Shot 2 / Shot 3` storyboard in event order. The guide warns that exact
  time ranges (`0–3 s`) are unstable; let the model pace the shots.
- Movements: name the body part, speed and amplitude ("slowly raises her right hand to shoulder
  height"); prefer slow, continuous moves; describe how one action flows into the next; show emotion
  as physical detail, not adjectives. One camera move per shot.
- References: the guide suggests 4–5 assets, not the maximum (1–2 character images, 1 scene, 1
  camera/motion video, 1 audio). Face: a clean headshot plus a full-body image; avoid turnaround
  sheets (they create twins). More than 4 people in frame gets unstable.
- Video refs: up to 3 clips, 15 s combined. Phrase as "follow the camera movement / motion of
  @video1". To edit or extend a clip, name it directly ("in @video1 replace …"), not "reference".
- Audio: native speech and SFX. Audio refs carry timbre; also describe the voice in words, keep the
  lines close in style to the reference, keep one language per clip. Narration can end with a click: fade
  the clip's audio tail in compose.
- Unwanted text: add "keep it subtitle-free, no text, no logo, no watermark"; 16:9 gets fewer stray
  subtitles than 9:16.
- Caps here: mini 2 refs, fast 4, 2.0 9 and 15 s; mini at 480p is the cheapest real draft.

**MiniMax H3** (`minimax-h3-draft`, `minimax-h3`)
- Omni-modal: text, images, video and audio are read as one context; native stereo sound, native
  multi-shot, motion transfer and editing. Up to 15 s; 768p or 2K.
- Assign references by index in one sentence: "follow the camera move of @video1, the woman from
  @image2 sings, her voice matching @audio1". Video refs on `minimax-h3` only, not on the draft.

**Kling 3.0** (`kling-3-std`, `kling-3-pro`)
- Write like scene direction, not a list of objects. Multi-shot up to six shots as
  `Shot 1, … Shot 2, …` with framing per shot, when the endpoint exposes it.
- Native audio in Chinese, English, Japanese, Korean, Spanish. Label each speaker and put tone in
  parentheses: `Grandmother (quietly, surprised): "…"`. Accents can be tagged the same way.
- Start frame plus a character reference is more consistent than a start frame alone.
- House notes: state the camera explicitly or it chooses for you; strong on people and fabric.
  Our ids take image refs (up to 4) and 5 or 10 s; no video refs.

**Veo 3.1** (`veo-3.1-lite`, `veo-3.1-fast`, `veo-3.1`)
- Formula: cinematography + subject + action + context + style and ambiance.
- Audio is always on. Dialogue in quotes with the speaker (`A man says, "…"`), `SFX: …`,
  `Ambient noise: …`. House note: name the spoken language when it is not English.
- Multi-shot pacing with timestamps is supported: `[00:00-00:02] … [00:02-00:04] …`.
- First and last frame for a controlled transition; up to 3 reference images of one person,
  character or product. Reference images and 1080p/4K require 8 s clips; prompt text is capped at
  1,024 tokens; 24 fps.
- Exclusions work best inside a positive description ("an empty beach with no people") rather than a
  bare "no people".

**Wan** (`wan-2.2-fast`, `wan-2.2-fast-720p`, `wan-2.5`)
- Base: entity + scene + motion; add aesthetic control (light, time, shot size, angle, lens,
  camera move, tone) and a style for richer results. With a first frame: motion + camera only.
- Sound (2.5 only, 2.2 is silent): voice = line + emotion + tone + speed + timbre + accent;
  SFX = material + action + ambience; music = style.
- The guide advises against rapid scene changes inside one clip, exact legible text and long
  choreographed sequences. Keep 2.2 prompts short and motion simple.

**Hailuo 2.3** (`hailuo-2.3`, `hailuo-2.3-fast`)
- Camera commands in square brackets: `[Truck left]`, `[Pan right]`, `[Push in]`, `[Pull out]`,
  `[Pedestal up]`, `[Tilt down]`, `[Zoom in]`, `[Shake]`, `[Tracking shot]`, `[Static shot]`.
  Up to 3 inside one bracket run together; sequential moves are joined with "then".
- Prompt up to 2,000 characters; no audio here. `hailuo-2.3-fast` needs a first frame.
- House notes: strong physics and dynamic motion (pours, jumps, cloth).

**LTX-2** (`ltx-2-fast`)
- One flowing paragraph of 4–8 sentences, present tense: shot, scene (light, palette, textures,
  atmosphere), action from beginning to end, characters with physical cues for emotion, camera
  relative to the subject and what is visible after the move, then audio.
- Dialogue in quotes, with language and accent when needed. More detail for close-ups than wides.
- House notes: cheap long clips with sound, good for b-roll and ambience, weaker on faces up close.

## Worked examples (weak → why → strong)

**1. Plane, first frame shows it already climbing** (`wan-2.5`)
- Weak: "The plane takes off from the runway into the sky."
- Why: the frame shows no runway contact; "takes off" makes it lurch upward from a standstill in the air.
- Strong: "Long-lens shot from the ground. The airliner, already climbing, keeps its steady climb
  away from camera; the landing gear folds into the belly; heat shimmer trails from the engines;
  the camera pans slowly to keep it centred. Clear late-afternoon sky, warm light on the fuselage."

**2. Serum dropper, macro** (`seedance-2-fast`, refs `["@frame"]`)
- Weak: "A drop falls from the dropper onto her fingertip."
- Why: no visible source, so the drop appears mid-air; nothing says how it lands.
- Strong: "Locked macro shot. A bead of amber serum swells at the glass tip of the dropper, stretches
  under its weight, detaches and lands on the fingertip below, spreading into a small glossy dome.
  The hand stays still; soft side light catches the liquid. Keep it subtitle-free."

**3. Sneaker and puddle** (`hailuo-2.3`)
- Weak (frame: sneaker on dry asphalt): "The sneaker splashes through water."
- Why: there is no water in the frame, so the splash is invented without a source or a direction.
- Strong: regenerate the frame with a shallow puddle one step ahead, then: "[Static shot] at ground
  level. The runner's right foot comes down flat into the ankle-deep puddle; water fans out sideways
  in a low spray and falls back; ripples spread to the edges; the foot lifts and exits frame right."

**4. Creator talking head** (`seedance-2-fast`, refs `["@face", "@voice"]`)
- Weak: "A woman talks enthusiastically about the app and gestures a lot."
- Why: energy without attitude produces generic arm-waving on every word.
- Strong: "She is telling a friend about a shortcut she found and is slightly proud of it. Warm,
  quick delivery, eyes on the lens. At 'two minutes' she taps the table once; the last line comes
  with a half-laugh. Phone on a stand, slight natural sway. Only she speaks."

**5. B-roll for the line "I stopped losing receipts"** (`seedance-2-mini`, silent)
- Weak: "A happy person using a finance app."
- Why: nothing shows the claim; "happy" becomes a stock smile.
- Strong: "Over-the-shoulder, locked. On a café table a hand flattens a crumpled paper receipt, holds
  a phone above it, and the phone screen shows the receipt framed by a capture outline; the hand
  lowers the phone and slides the receipt into a jacket pocket. Practical phone footage, daylight."

**6. Copy a camera move from a clip** (`seedance-2`, refs `["@hero", "file:./move.mp4"]`)
- Weak: "Make it like the video."
- Why: the model cannot tell whether to copy the person, the place, the motion or the camera.
- Strong: "The skater from @image1 in her own setting. Follow only the camera path of @video1: low
  start at ankle height, rising push-in that ends over her shoulder. Do not copy the person or body
  motion from @video1; she glides forward naturally."

## Negative prompt defaults

`blurry, low quality, distorted face, extra limbs, text, watermark, flicker, morphing`. On Seedance
also write the constraint in the prompt itself ("keep it subtitle-free, no logo, no watermark").

## Sources

- BytePlus ModelArk, Dreamina Seedance 2.0 series prompt guide: https://docs.byteplus.com/en/docs/ModelArk/2222480
- BytePlus ModelArk, Seedance 1.5 Pro prompt guide: https://docs.byteplus.com/en/docs/ModelArk/2168087
- Google Cloud blog, Ultimate prompting guide for Veo 3.1: https://cloud.google.com/blog/products/ai-machine-learning/ultimate-prompting-guide-for-veo-3-1
- Google AI for Developers, Veo 3.1 in the Gemini API: https://ai.google.dev/gemini-api/docs/veo
- Vertex AI, video generation prompt guide: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/video/video-gen-prompt-guide
- Kling AI, VIDEO 3.0 model user guide: https://kling.ai/quickstart/klingai-video-3-model-user-guide
- Kling AI, VIDEO 3.0 Omni user guide: https://kling.ai/quickstart/klingai-video-3-omni-model-user-guide
- Alibaba Cloud Model Studio, Wan text-to-video / image-to-video prompt guide: https://www.alibabacloud.com/help/en/model-studio/text-to-video-prompt
- Alibaba Cloud Model Studio, Wan first-frame image-to-video: https://www.alibabacloud.com/help/en/model-studio/image-to-video-guide
- MiniMax API docs, Hailuo text-to-video (camera commands): https://platform.minimax.io/docs/api-reference/video-generation-t2v
- MiniMax, H3 announcement: https://www.minimax.io/blog/minimax-h3
- Lightricks, prompting guide for LTX-2: https://ltx.io/blog/prompting-guide-for-ltx-2
