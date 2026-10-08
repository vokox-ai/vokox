# Review: nothing reaches the user unwatched

A job that "succeeded" only means the provider returned a file. Whether it serves the brief is
your call, and you make it by looking. Review happens at three gates; the earlier the gate, the
cheaper the fix:

1. **Key-frame gate** — every image before it is animated. A wrong face or label in a still is
   copied into every clip made from it. Fixing a still costs 2–13 credits; fixing the clips costs
   50–200.
2. **Clip gate** — every clip before compose.
3. **Final gate** — the composed file, watched as the viewer will see it.

Put review images in `<out>/review/` so they survive the session. Read (open) every image you
make: a sheet you generated but did not look at is not a review.

## Images

Open the file. For product or face work, build a side-by-side with the supplied reference and
judge them together:

```bash
mkdir -p out/review
ffmpeg -y -loglevel error -i in/bottle-front.jpg -i out/hero.png \
  -filter_complex "[0]scale=-2:720[a];[1]scale=-2:720[b];[a][b]hstack" out/review/hero_vs_ref.jpg
# zoom into a region (here: lower-middle, where a label usually sits) to read small text
ffmpeg -y -loglevel error -i out/hero.png -vf "crop=iw/2:ih/4:iw/4:ih*0.6,scale=iw*2:-2" out/review/hero_label.jpg
```

Check, in this order:

- **Identity:** face shape, hairline, eyes, age, skin tone match the reference photo. "Similar
  person" is a fail when the user supplied their own face.
- **Product truth:** silhouette, proportions, cap, colour, label layout, logo position, number of
  items. Compare against the photo, not memory.
- **Text:** read every visible word letter by letter. Invented or garbled letters are a fail even
  when small.
- **Hands:** finger count, plausible grip, no fused fingers around the product.
- **Framing:** aspect as ordered; head and product not cut by the edge; for 9:16 leave the lower
  fifth and the right edge calm because platform UI and captions sit there.
- **Set consistency:** within a series, the same light direction, palette and lens feel.
- **Realism level:** plastic skin or oversharpening is a fail when the brief asked for a
  phone-captured look.

With `n > 1`, pick the best variant, say why in one line, and use it as `@step[i]`.

## Video clips

Never judge a clip from its first frame. Sample it:

```bash
f=out/clip2.mp4; b=out/review/clip2; d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")

# start / middle / end strip: identity drift and product drift show up side by side
for p in 0.03 0.5 0.97; do t=$(awk -v d="$d" -v p="$p" 'BEGIN{printf "%.2f", d*p}')
  ffmpeg -y -loglevel error -ss "$t" -i "$f" -frames:v 1 -vf scale=-2:640 "${b}_$p.png"; done
ffmpeg -y -loglevel error -i ${b}_0.03.png -i ${b}_0.5.png -i ${b}_0.97.png \
  -filter_complex hstack=inputs=3 ${b}_strip.jpg

# Every video result already comes with a 3×2 frame sheet: `output.preview` in the job JSON,
# saved by the CLI as <name>.preview.jpg (plan runs: <step>.preview.jpg, path in manifest `preview`).
# Open it first; it is enough to spot morphs, pop-ins and wrong endings. Over MCP, open output.preview.url.
# The ffmpeg sheets below are for a closer look when ffmpeg is installed.
# whole clip at 4 frames/s: a 5 s clip = 20 cells; this is where morphs and pop-ins show
ffmpeg -y -loglevel error -i "$f" -vf "fps=4,scale=200:-2,tile=5x4" -frames:v 1 ${b}_sheet.jpg

# mechanical checks: frozen stretches, black frames, audio presence and level
ffmpeg -hide_banner -i "$f" -vf "freezedetect=n=0.003:d=1,blackdetect=d=0.1" -an -f null - 2>&1 \
  | grep -oE "(freeze|black)_[a-z]+: ?[0-9.]+"
ffprobe -v error -show_entries stream=codec_type -of csv=p=0 "$f"     # expect "audio" if ordered
```

Look for:

- **Start matches the key frame.** If the clip opens on a different face or product than the
  approved still, the reference did not bind; check `refs` order.
- **Identity and product hold to the end** (strip: first vs last cell).
- **Morphing:** fingers merging, objects melting into each other, a label rewriting itself while
  the product turns.
- **Cause and effect:** every motion has a visible cause, objects do not appear from nowhere,
  weight and speed feel physical. This is the most common way a clean-looking clip is still wrong.
- **Camera** did what the prompt said (push, orbit, locked), once.
- **Motion exists:** a freeze longer than 1 s in a 5 s clip usually means the prompt's action
  did not register.
- **Continuity with neighbours:** wardrobe, light direction, screen direction of movement, which
  side of the product faces camera.
- **Clean tail:** the last half second is usable for a cut (no half-started new action).
- **Speech clips:** mouth moves only while the voice speaks, closes on "m/b/p" sounds, only the
  intended person talks, the language is right. Watch a 2–3 s excerpt at normal speed; a sheet
  cannot judge sync.

## Audio (voice, music, native sound)

You usually cannot listen, so measure and say what you checked.

```bash
a=out/voice.mp3
ffprobe -v error -show_entries format=duration -of csv=p=0 "$a"                  # length vs plan
ffmpeg -hide_banner -i "$a" -af volumedetect -vn -f null - 2>&1 | grep -E "max_volume|mean_volume"
ffmpeg -hide_banner -i "$a" -af ebur128=peak=true -vn -f null - 2>&1 | sed -n '/Summary/,$p' | grep -E "I:|Peak:"
ffmpeg -hide_banner -i "$a" -af silencedetect=noise=-40dB:d=0.5 -vn -f null - 2>&1 | grep -oE "silence_(start|end): [0-9.]+"
```

- **Length:** a voice track longer than the clip sum is cut at the end by compose. Measure the
  TTS before fixing clip durations.
- **Level:** `max_volume` at about 0 dB means likely clipping; social delivery sits near −14 LUFS
  integrated. Very quiet voice (mean below −30 dB) usually means a failed or near-silent render.
- **Gaps:** long silence at the start or in the middle of a voice track shifts every caption.
- **Words:** transcribe the TTS back (`vokox --json transcribe out/voice.mp3 --lang ru`, 1 credit)
  and compare with the script to catch skipped words and mangled names before building clips on it.

## Final file

```bash
f=out/final.mp4
ffmpeg -y -loglevel error -i "$f" -vf "fps=2,scale=180:-2,tile=8x5" -frames:v 1 out/review/final_sheet.jpg  # 20 s
ffmpeg -y -loglevel error -ss 0 -t 2 -i "$f" -vf "fps=6,scale=240:-2,tile=6x2" -frames:v 1 out/review/final_hook.jpg
```

- **Hook:** something moves or is said in the first 1–2 s; the first frame is not a static title.
- **Captions:** readable, match the spoken words (brand names are the usual casualty), not over
  a face or the product, not under platform UI.
- **Balance:** music under the voice, not competing (see failures.md on ducking).
- **Ending:** the voice is not cut mid-word; the CTA has time to be read.
- **Length and aspect** as briefed; compose warnings in the job JSON read and handled.

## Verdict per item

| Verdict | When | Cost |
| --- | --- | --- |
| Accept | Meets must-haves; flaws are taste-level | 0 |
| Fix in compose | Bad moment is at the head or tail (use `trim`), order/caption/music level is off | compose price only (≈5–7) |
| Retake | A must-have fails inside the shot | the step's price + everything downstream of it |
| Rethink | The shot works technically but the idea does not land | back to the Treatment, then retake |

## Retake discipline

- **Diagnose first.** Find the symptom in `failures.md` and name the cause before spending.
  Rerunning an unchanged prompt is a lottery ticket; allow it at most once (new seed) and say so.
- **One variable per retake:** prompt clause, seed, model, reference, or duration. Record which in
  the Status section of `brief.md`, so the next attempt learns from this one.
- **Retake the smallest upstream thing.** A bad face in the clip often comes from the key frame:
  redo the image, not the video. Editing a step in `plan.json` reruns that step and, automatically,
  every step that uses it; so edit as far down the chain as the fault allows.
- **Test fixes cheaply.** Try the fix on the draft tier (`seedance-2-mini` 480p, `wan-2.2-fast`)
  and only then render the final tier once.
- **Two strikes, redesign.** Two failed retakes of one shot means the shot asks for something the
  model does badly. Simplify the action, change the angle, or cover the moment with a cut.
- **Stay inside the reserve.** Announce each retake's price; beyond the agreed reserve, ask.

## Telling the user

Say what you checked, what is weak, where, and what fixing it would cost. Numbers and timestamps
beat adjectives. Never call a result "perfect".

- "Clip 3: the label smears for about half a second while the bottle turns (2.1–2.6 s). I trimmed
  that part out in compose; the shot is now 2 s shorter and the label stays sharp."
- "The CTA face is close to your photo but the jaw is softer. A retake on Seedance 2.0 with a
  second angle of your face would cost about 160 credits. Keep it or retake?"
- "I can't listen to audio. I checked the voice for length (18.4 s, fits), peaks (−1.2 dB, no
  clipping) and gaps (none). Please give the voice a quick listen before I animate the talking shots."
