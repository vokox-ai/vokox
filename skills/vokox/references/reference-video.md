# Studying a reference clip

Use this when the user sends a video and says "make one like this". The goal is not a copy. It is
an explanation of *why the clip works* that is precise enough to rebuild the same effect around
the user's product, face and words. Studying costs no credits; skipping it costs a full round of
generations that miss the point.

## 0. Get the file and set up

- A local file: copy it to `ref/<name>/source.mp4` in the project.
- Only a link: `vokox like <link>` downloads and studies it on the server (up to 60 s, 10 credits) and
  returns a breakdown, a frame sheet and a draft plan; often that is enough. For a deeper study ask the user
  to send the file. Downloading it yourself (e.g. `yt-dlp`) needs the user's explicit OK and is for analysis only.
- Folder layout: `ref/<name>/source.mp4`, `ref/<name>/sheets/` (images you made),
  `ref/<name>/study.md` (your findings). Write findings as you go, not at the end.

Local `ffmpeg` is required for everything below. None of these commands use `drawtext`, so a
minimal ffmpeg build works. If ffmpeg is missing, ask before installing it (`brew install ffmpeg`).

```bash
R=ref/cream-ad; mkdir -p $R/sheets
ffprobe -v error -show_entries format=duration:stream=codec_type,width,height,r_frame_rate \
  -of compact $R/source.mp4          # length, size, fps, and whether there is an audio stream
```

## 1. Whole first, then parts

Look at the clip end to end before zooming in. The overview sheet shows one frame per second;
open it (read the image file) and write a three-line gist in `study.md` before anything else:
what is being sold or said, where the turn happens, how it ends.

```bash
# 1 frame/s, 6 columns: a 30 s clip fits one 6x5 sheet. Cell k (row by row, from 0) = k seconds.
ffmpeg -y -loglevel error -i $R/source.mp4 \
  -vf "fps=1,scale=240:-2,tile=6x5:padding=4:margin=4" -frames:v 1 $R/sheets/overview_00-30.jpg

# Longer clips: page it. Next 30 s:
ffmpeg -y -loglevel error -ss 30 -t 30 -i $R/source.mp4 \
  -vf "fps=1,scale=240:-2,tile=6x5:padding=4:margin=4" -frames:v 1 $R/sheets/overview_30-60.jpg
```

Time labels are not burned in, so put the range in the filename and compute a cell's time as
`start + index / fps`. Keep the sheet's `fps` and `tile` product equal to the page length so
nothing is silently dropped.

## 2. Find the cuts

```bash
ffmpeg -hide_banner -i $R/source.mp4 -vf "select='gt(scene,0.3)',showinfo" -an -f null - 2>&1 \
  | grep -o "pts_time:[0-9.]*"
```

Each printed time is a hard cut. Lower the threshold to `0.2` if soft cuts are missed; dissolves
and whip pans often do not register, so confirm on the sheet. Cuts divided by duration give the
average shot length, which is the pacing you will need to match.

## 3. Close looks where something happens

Dense bursts show how a motion, a camera move or a transition actually unfolds; single full-size
frames show text, typography and product detail.

```bash
# 1.5 s around a moment at 8 frames/s -> 12 cells: reads the motion path and the camera
ffmpeg -y -loglevel error -ss 6.5 -t 1.5 -i $R/source.mp4 \
  -vf "fps=8,scale=320:-2,tile=4x3" -frames:v 1 $R/sheets/burst_06.5-08.0.jpg

# one exact frame at full resolution (captions, labels, UI)
ffmpeg -y -loglevel error -ss 7.2 -i $R/source.mp4 -frames:v 1 -q:v 2 $R/sheets/frame_07.2.jpg

# a short excerpt to watch in a player, re-encoded for an exact cut
ffmpeg -y -loglevel error -ss 6 -t 4 -i $R/source.mp4 -c:v libx264 -crf 18 -c:a aac $R/excerpt_06-10.mp4
```

Adjust range and density to the question: wide and sparse to follow the story, narrow and dense
to understand one handoff. Samples only show what is on screen at their instants; a flash between
two cells is invisible, so densify when neighbouring cells disagree.

## 4. Get the words

If the clip has speech, the words and their timing are half of the design. Pull the audio first:

```bash
ffmpeg -y -loglevel error -i $R/source.mp4 -vn -ac 1 -ar 16000 $R/audio.wav
```

Then, in order of preference:

1. **Burned-in captions** in the reference: read them from full-size frames. Often enough.
2. **Local Whisper**, if already installed (check `command -v whisper whisper-cli`):
   `whisper $R/audio.wav --language en --word_timestamps True --output_format json --output_dir $R`
   (openai-whisper) or `whisper-cli -m <model.bin> -f $R/audio.wav -l en -ml 1 -oj` (whisper.cpp; `-ml 1` gives word-level segments).
   Installing either downloads hundreds of MB of weights: ask first.
3. **`vokox transcribe`** (1 credit per started minute): the simplest route. It takes the video or
   the extracted audio and returns `transcript.json` with word timings plus the plain text:
   `vokox --json transcribe ref/cream-ad/source.mp4 --lang en --out ref/cream-ad`. Ask before
   spending if the user has not agreed a budget yet (a 30 s reference costs 1 credit).
   Older route, only if transcribe is unavailable: a one-clip compose with
   `captions.from` pointing at the extracted audio burns word-timed captions (3 words per line)
   into a copy of the reference. It costs 5 credits + 1 per 10 s and the clip must be ≤ 300 s;
   there is no transcript file, you read the words off a 2 fps sheet of the result. If the job
   warns `captions: transcription unavailable, skipped`, fall back to 4. Ask before spending.
   ```json
   { "aspectRatio": "9:16",
     "clips": [{ "asset": "file:./ref/cream-ad/source.mp4" }],
     "captions": { "from": "file:./ref/cream-ad/audio.wav", "style": "center-pop", "language": "en" } }
   ```
   `vokox --json compose ref/cream-ad/transcribe.json --out ref/cream-ad --estimate` first, then
   without `--estimate` after the OK. Set `aspectRatio` to the reference's own, or compose crops it.
4. Ask the user for the script, or transcribe by ear from the excerpt if they can play it for you.

## 5. Map the beats

Fill one row per beat (a beat is one job for the viewer, sometimes several shots):

| t | Shot & camera | What happens | Words | On-screen text | Sound | Job for the viewer |
| --- | --- | --- | --- | --- | --- | --- |
| 0.0–1.4 | ECU, handheld push | cream lid twists off, cream fills frame | "Stop scrolling if…" | none | pop SFX | pattern interrupt |
| 1.4–4.0 | MS, mirror, locked | she dabs it on, frowns at the mirror | "I had the same…" | "day 1" top | voice only | recognise the problem |

Also record once for the whole clip: aspect, total length, cut count and average shot length,
caption style (position, size, words per line, colour, emphasis), music (genre, when it enters,
drops, ends), how the last 2 s ask for action.

## 6. Explain why it works

Separate what you *see* from what you *think it does*, and say which is which. Questions that
usually find the mechanism:

- **Hook:** what happens in the first 1.5 s that makes someone stop? Motion, a question, a result
  shown before the process, an odd image, a face reacting?
- **Promise and payoff:** what does the start make the viewer want, and where is that paid off?
- **Proof:** what makes the claim believable? A demonstration, a texture close-up, a number?
- **Rhythm:** do cuts land on words? Does pace speed up toward the payoff?
- **Voice and attitude:** who speaks, to whom, in what mood?
- **Sound:** which cue marks each turn?

Write the answer as a short paragraph at the top of `study.md`, above the beat table.

## 7. Transform, do not trace

Keep the *relationships*, replace the *content*. For each beat ask what role it plays, then find
the thing in the user's world that can play that role.

| Reference role | Reference content | Our product (e.g. a shockproof phone case) |
| --- | --- | --- |
| Pattern interrupt | lid twist, cream fills frame | phone slips from a hand, camera follows it down |
| Relatable problem | frown at dry skin | cracked screen on a friend's phone |
| Proof | smooth skin close-up | phone bounces on tiles, screen intact, close-up |
| Payoff + CTA | smile, "link in bio" | she pockets it with a shrug, CTA caption |

Rules of thumb:

- A role can change form. If the reference proof is a face close-up and the product has no face,
  find a different visible proof, not a forced face.
- Fit shot lengths to what models can generate (5/8/10 s on most video models). A 1.4 s
  reference shot becomes a 5 s clip trimmed in compose (`"trim": {"start": 0.5, "end": 2.0}`).
- Words: keep the structure (question → confession → turn → verdict), rewrite every line for the
  new product and language. Then re-time: the new voice sets the new rhythm.
- Several references: state which job each one contributes ("pacing from A, caption style from B").

Put the mapped beats into the Treatment section of `brief.md` (see `brief.md`) and build the shot
list from it.

## Legal and ethical limits

- Do not reuse the reference's footage, music or voice in the deliverable, and do not recreate
  identifiable people from it (creators, actors, celebrities). Their look is not ours to cast.
- Do not copy brand logos, packaging or script lines from the reference. Structure, pacing, camera
  language and ideas are fair to learn from; the expression belongs to its author.
- Feeding the reference itself into a video model as a motion reference (`refs` with a video, on
  models whose price lists a "video ref" rate) is acceptable only for footage the user owns or
  generic motion, never to replicate a person. Reference seconds are billed too: trim the excerpt
  to the 3–5 s of motion you need.
