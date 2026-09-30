# Failure catalog: symptom → cause → fix

Use after review (`review.md`) finds a problem and before paying for a retake. Find the symptom,
confirm the cause on your review sheets, apply the fix at the most upstream cheap step, and change
one thing at a time. Prompting rules referenced here live in `prompting/`.

## Images

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Extra, fused or clawed fingers | Hands small in frame, complex grip, fingers wrapped around a small object | Simpler grip in words ("holds the bottle upright by its base, fingers together"), hands larger in frame or cropped out; repair only the hands with `nano-banana-2` + the image as ref ("fix the left hand to five natural fingers; keep everything else identical") |
| Label text garbled or invented | Model drew text itself; no product ref, or ref not first | Product photo first in `refs`, "keep the label identical to the reference"; new text only on `flux-2-klein`/`qwen-image`, ≤ 4 words in quotes; anything longer goes to compose captions |
| Product shape drifts (taller bottle, other cap, wrong colour) | Prose describes the product differently from the photo; several refs compete | Name the product exactly as it appears, do not describe its shape; product ref first; better still, place the real photo into a scene with an edit model instead of regenerating the product |
| Face does not look like the user | Low-res, side-angle or filtered reference; too many other refs; heavy style words | Frontal, evenly lit, uncropped face photo; fewer refs; "the same person as in the reference"; tone down stylisation; tighter framing |
| Generic "AI" face, plastic skin | Beauty/cinematic vocabulary, default model polish | UGC phone-look wording from `prompting/image.md`; `gpt-image-2` or `seedream-4.5`; drop "flawless", "perfect skin" |
| Two products where one was wanted | Product mentioned twice, or plural wording | One mention, singular noun, one product ref |
| Head or product cut by the edge | Wrong `aspectRatio`, or framing unspecified | Set aspect per step; ask for headroom and the product fully in frame |
| Series looks inconsistent | Prompts written separately, different models | One look sentence copied verbatim into every prompt, same model, same refs |
| Background junk (signs with gibberish, extra people) | Busy environment prompt | Name a simple setting; add `text, signage, people in background` to the negative prompt |
| `moderation` refusal | Real people, minors, brands you do not own, sensitive scenes | See `troubleshooting.md`; rephrase, remove brand names |

## Video

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Face morphs mid-clip | Big head turn, fast motion, long clip, low tier | keep the face pointed at the camera, small motion, 5 s, hq/premium tier; key frame with a frontal face |
| Product or label warps while turning | Rotation reveals a side the model never saw | Limit the turn ("rotates about 20 degrees"), give front and side photos on multi-ref models, or replace the turn with a slow push-in |
| Hands melt into the object | Grip plus motion in one close-up | Hands already holding at frame one; slower motion; or keep hands out of the shot |
| **Action without a cause** (object rises, falls, starts moving on its own) | The prompt asks for an outcome the start frame cannot lead to within the clip; the model skips the cause | Start the shot where the motion is already underway, or write the physical chain in order and make sure it fits the duration. **Our case:** key frame of an airliner standing on the runway + "takes off" → it lifted from a standstill. Fixed by starting on an airliner already climbing |
| **Something appears from nowhere** | A moving thing is not in the key frame, so the model materialises it | Everything that moves must be visible at frame one, with its source. **Our case:** in a serum shot the dropper and its drop popped into frame with nothing bringing them in. Fixed by a slow push-in on the bottle instead; if the drop is needed, start with the dropper in hand above the target and show the thumb squeezing the bulb |
| **Effect with no believable interaction** | Effect requested without the body that causes it | Show the cause in frame. **Our case:** a splash hitting a sneaker had no believable source and read as nonsense. Fixed by a runner filmed at foot level, so the motion itself carries the shot; if a splash is wanted, the foot must land in a visible puddle |
| Camera ignores the move | Model needs explicit camera (Kling); two moves requested; "static" contradicts "dolly" | One camera move, stated first; "camera locked off" when still; Seedance follows described moves more literally |
| Clip is nearly frozen | Vague action, too much "stays still", i2v with no verb | One clear verb with direction and speed; confirm with `freezedetect` |
| Motion is slow-motion or floaty | Models default to slow, dreamy motion | "real-time speed", "brisk", name the pace of the action |
| A cut or new scene inside one clip | "then", two actions, scene description changes | One action per clip; multi-shot only on `seedance-2` with timestamps |
| Gibberish subtitles or watermark burned in | UGC wording invites fake captions; on-screen text asked in prompt | No text in the prompt; negative `text, subtitles, watermark, logo`; captions in compose |
| Different wardrobe or light between clips | Key frames generated independently | Derive all key frames from one accepted image with edits, same look sentence, same lens |
| Subject changes direction between shots | Screen direction not specified | State direction in every prompt ("walks left to right") |
| Clip starts on a different face or product | Reference not bound: wrong `refs` order, or prompt tags do not match it (`@image1`…) | Face/product ref first, tags in the prompt in `refs` order; re-describing the subject in an i2v prompt also fights the ref |
| Lip-sync drifts or mouth moves in silence | No audio ref, wrong ref order, clip longer than the line, two faces on screen | Refs `["@face", "@voice"]`, "delivers the supplied audio with clear lip-sync; only the visible speaker moves their mouth", one speaker, clip length ≈ line length |
| Voice changes from clip to clip | Each native-audio clip invents its own voice | One TTS track as the audio ref for every talking clip; or native speech in one clip only |
| Wrong language or accent in native speech | Language not stated | "speaks Russian" plus the line in that language, in quotes |

## Audio

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Music drowns the speech | Ducking reacts only to the timeline's `voice` track; speech living in clip audio is not ducked | With a `voice` track: music 0.15–0.25, `duck: true`. With speech in clip audio: music 0.08–0.12 or no music |
| Music loops audibly or stops abruptly | Track shorter than the video is looped; fade too short | Lyria makes 30 s tracks: for longer videos use `stable-audio-2.5` (up to 180 s) or pick a loop-friendly genre; `fadeOut` 1.5–2 |
| Voice cut off at the end | Voice longer than the clip sum; compose trims to the video | Measure TTS duration first; shorten the script (EN 2.3–2.6, RU 2.0–2.3 words/s) or lengthen clips |
| Rushed or breathless delivery | Script too dense for the time | Cut words, not speed; commas for breaths |
| Names, numbers, brands mispronounced | Written form ambiguous for TTS | Spell as spoken ("тысяча четыреста девяносто"), transliterate brand names |
| Peaks near 0 dB, harsh sound | Hot source or stacked sources | `voice.volume` 0.85–0.9, lower music |
| Silence before the first word | TTS lead-in | Start the script with the words themselves; `voice.start` can only delay, not trim |

## Compose

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Clip dialogue or SFX vanished in the final | With a `voice` track the clips' own sound is muted by default | Add `"clipAudio": { "volume": 0.3 }` to the timeline to keep SFX/ambience under the voice; never under lip-synced clips that already carry the same speech |
| Talking clip out of sync after compose | The voice is one continuous track from `voice.start`; b-roll between talking clips shifts the words | Order and trim clips so each talking clip sits where its words fall, or split the voice into per-clip TTS and lip-sync each |
| Head or product cropped off | Compose fills the canvas by centre-crop; a 16:9 clip in a 9:16 timeline loses most of its width | Generate every clip in the target aspect |
| Captions hidden by platform UI | A face or product placed in the lower band where 9:16 captions sit (≈ 25–40 % up), or lines too long | Frame subjects higher, shorten lines, or `center-pop`; check the final sheet |
| Captions spell the brand wrong | Captions come from transcription of the voice | Use `captions.text` lines (shown evenly) or respell the script; check every name on the sheet |
| Captions missing | Transcription skipped or libass unavailable | Read `warnings` in the compose job JSON; fall back to `captions.text` |
| Cut lands mid-action or on a morph | Full 5 s clip used where 2–3 s were good | `trim` the good span; review sheets tell you which seconds |
| Final shorter than the clip sum | Each `fade` overlaps 0.4 s | Account for it, or use `cut` |
| Compose refused | More than 300 s of input clips | Trim or split |
| GIF has no sound | By design | Deliver MP4 if sound matters |

## When no row fits

Describe the symptom with timestamps, look at a dense burst around it, and ask: what did the model
have to *invent* that the prompt or key frame did not give it? The fix is almost always to supply
that missing thing (a cause, a reference, a direction, a duration) or to stop asking for it.
