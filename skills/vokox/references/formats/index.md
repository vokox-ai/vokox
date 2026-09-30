# Format playbooks

A format is the shape of a whole short video: who carries it (a face, a voice, two people, the
product), how the beats are timed, and which of our steps build it. Pick the closest row, read the
file, then write `plan.json`. Formats mix: a ranking can open with a talking head, a showcase can end
on a before/after.

| Format | Use when | File |
| --- | --- | --- |
| UGC ad | a "real customer" recommends a product to camera, b-roll proves it | `../presets/ugc-ad.md` |
| Talking head | one person speaks straight to the viewer: opinion, tip, founder note | `talking-head.md` |
| Presenter explainer | a person explains while the picture shows the thing being explained | `presenter-explainer.md` |
| Narration demo | an off-screen voice walks through a product, app or process; no face | `narration-demo.md` |
| Ranking / top-N | "5 X ranked", countdown, comparison of several items | `ranking-listicle.md` |
| Short drama | a 20–45 s scene with two characters, conflict and a twist | `short-drama.md` |
| Street interview | interviewer with a mic asks a stranger; the answer is the payoff | `street-interview.md` |
| Two-person podcast | two hosts at mics trade lines; a claim, a doubt, a payoff | `two-person-podcast.md` |
| Product showcase | no people: hero loop, packshot reel, launch teaser, e-com video | `product-showcase.md` |
| Before / after | a visible change: room, object, design, app screen, cleaning, repair | `before-after.md` |

## Platform facts every format obeys

- **Canvas.** Compose renders 9:16 at 1080×1920 (16:9 → 1920×1080). Clips are scaled and
  **center-cropped** to fill it, so a landscape screen recording loses its sides; supply vertical media.
  For 16:9 put `"aspectRatio": "16:9"` inside `timeline` too, not only in `defaults`.
- **Hook.** TikTok asks for the proposition in the first 3 s and the hook inside 6 s. Our rule: the
  first frame already shows the subject, the first word lands before 0.5 s, no logo intro.
- **Length.** TikTok in-feed ads run 5–60 s, 9–15 s recommended; Shorts and Reels go to 3 min, but
  generated formats work best at 15–35 s. Longer means more clips and more credits, not more views.
- **Safe zone.** Meta asks to keep text and key elements out of the top ~14 %, bottom ~35 % and
  ~6 % at each side of a 9:16 frame; TikTok's zone is similar and moves with caption length. Frame
  faces and products in the upper-middle. On 9:16 our `bold-bottom` captions sit 30 % up, just
  above that band, and `minimal-top` sits just under the top band.
- **Sound on.** Every platform guide asks for sound. A clip without voice still gets music.
- **AI disclosure.** Realistic generated people and voices must carry the platform's AI label
  (TikTok may remove unlabeled realistic AIGC). Never present a generated interview or testimonial as a
  real person's words; never imitate a real, identifiable person.

## How compose treats sound (decides every plan)

Compose has one `voice` track, one `music` track and the clips' own audio. **If `voice` is set, the clips'
own sound is muted unless you set `clipAudio: { "volume": 0.2–0.4 }`**, which keeps ambience and SFX
under the voice. Without `voice`, clip audio is joined in order and music is mixed under it without
ducking (ducking listens to `voice` only). So each format uses one of two sound modes:

| Mode | Speech lives in | Use for | Music |
| --- | --- | --- | --- |
| **Voice-over** | one TTS step as `timeline.voice` | narration demo, ranking, showcase with VO | `volume 0.15–0.2, duck: true` |
| **Clip sound** | each clip (lip-sync or model dialogue) | talking head, podcast, drama, interview | `volume 0.06–0.1`, no ducking |

In clip-sound mode a `fade` crossfades picture and sound together (0.4 s), so lips stay in sync;
still prefer `cut` between speaking clips, a fade in the middle of a sentence reads as an edit. Set `"audio": false` on silent b-roll so its
generated ambience does not play; trim the dead tail of each clip with `trim.end`.

**Mixing both modes (nesting).** A compose output is a normal video asset. Build a voice-over
section as one compose, then put it in a second compose next to lip-synced clips with no `voice`:
every clip keeps its own sound. One extra compose ≈ 6 credits.

**Captions in clip-sound mode (two-pass).** `captions.from` transcribes one asset, timed from 0.
Compose the clips first, then a second compose with that output as its only clip and as
`captions.from` (≈ 6 credits). The transcriber accepts mp4; verify once on a draft.

## Which model does what (see `../models-and-pricing.md` for prices)

| Need | Models | Note |
| --- | --- | --- |
| Lip-sync to an exact TTS file | `seedance-2-fast`, `seedance-2-mini` (draft), `minimax-h3` | audio ref in `refs`; `seedance-2` is routed first to a provider that takes image refs only, so its audio ref can be lost |
| Voices a script written in the prompt | `veo-3.1-lite/fast`, Seedance family, `wan-2.5`, `ltx-2-fast` | words may drift; voice changes between clips unless a voice sample is a ref |
| Two speakers in one clip | `seedance-2-fast` (4 refs: 2 views + 2 voice samples), `minimax-h3` (9 refs) | dialogue as `A:`/`B:` lines in the prompt |
| First and last frame | `seedance-2-fast`, `seedance-2-mini`, `kling-3-std/pro` | `refs: ["@start", "@end"]`, two images, no audio ref; `minimax-h3` treats two images as references, not frames |
| Motion copied from a video | `seedance-2-*`, `minimax-h3` | reference seconds are billed on top; `run --estimate` does not add them |
| Silent b-roll, physics | `hailuo-2.3(-fast)`, `wan-2.2-fast-720p`, `kling-3-std` | Hailuo and Wan 2.2 have no audio track |

**Voice sample**: a `tts` step with 1–2 neutral sentences in the character's register, used only as
a timbre reference for a model that voices the prompt's dialogue itself. 12 credits each.

**Compose price**: `5 + ceil(max(10, 5 × clips) / 10)` at estimate time: 3–4 clips = 7, 5–6 = 8.

Sources: TikTok creative best practices (ads.tiktok.com/help/article/creative-best-practices);
TikTok in-feed ad specs (ads.tiktok.com/help/article/tiktok-reservation-in-feed-ads-reach-frequency);
YouTube Help, three-minute Shorts (support.google.com/youtube/answer/15424877); Meta Business Help,
Safe Zone for Stories and Reels ads (facebook.com/business/help/980593475366490); TikTok AIGC
label (support.tiktok.com/en/using-tiktok/creating-videos/ai-generated-content).
