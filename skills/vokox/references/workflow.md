# Workflow in detail

## 1. Brief

Ask only what changes the work. Good questions: "Reels 9:16 or YouTube 16:9?", "Do you have a
product photo / your face / a logo I should use?", "Speech in Russian or English, or no voice?",
"Budget ceiling? A 20-second ad is usually 200–400 credits ($2–4)". Skip questions the message
already answers. Write `brief.md` in the project folder: goal, platform, length, language,
references, budget, decisions.

## 2. Format and shot list

Pick the closest preset (`presets/`) or write a shot list. For 15–20 s vertical: 4–6 shots of
3–5 s. Each shot has one job: hook (0–2 s), problem, product, proof, call to action. Write the
voice script first when there is speech; the shots follow the words. Speech pace: 2.3–2.6 words
per second in English, 2.0–2.3 in Russian. 20 s ≈ 45 English words.

## 3. Direct

- Key frames first: generate each shot's first frame as an image (`auto:image.hq`, with the
  product/face as `refs`). Check them. Only then animate with `refs: ["@frame"]`.
- Image-to-video prompts describe motion, camera and atmosphere; do not re-describe the subject.
- Same character across shots: the same reference image in every step, same wording for
  wardrobe and light, same lens.
- Talking head: `seedance-2-fast` or `seedance-2` with the face image and the voice track as refs
  (`refs: ["@face", "@voice"]`), prompt from `kits/talking-head.md`. Lip-sync follows the audio.
- Music last, voice before clips when clips must match speech length.

## 4. Price and confirm

```bash
vokox --json run plan.json --estimate
```
Show the table: step, model, credits; the total in credits and dollars; the budget cap. If the
user set a ceiling, pass it as `--max-credits`. Offer one cheaper variant (fast tier, shorter
clips) when the total is above the ceiling. Do not run until the user says yes.

## 5. Run

```bash
vokox --json run plan.json --yes --max-credits 300
```
Independent steps run three at a time. Narrate stderr lines in plain words ("hero frame done,
animating 4 clips, about 3 minutes"). If a step fails, the CLI reports it; dependent
steps are marked failed, the rest continue. Fix the prompt or model and rerun the same plan:
finished steps are skipped via `manifest.json`.

## 6. Review

Open the outputs. For video, sample frames (`ffmpeg -i final.mp4 -vf fps=1 frames/%02d.png` if
ffmpeg exists locally, otherwise judge the share page). Check: faces stable, product legible,
motion matches the prompt, captions readable, audio not clipping, hook lands in 2 seconds.
Retake one step: edit the plan step (prompt, seed, model) and rerun, or
`vokox --json gen video --ref @frame --manifest ./out/manifest.json --prompt "…" --model auto:video.hq --out ./retakes`.

## 7. Deliver

Give the file path, the `shareUrl` from `manifest.json` (or the job output), credits charged,
and one honest line about the weakest part and what a higher tier would change.

## Single-shot commands

```bash
vokox --json gen image --prompt "…" --ar 9:16 -n 2 --model auto:image.hq --ref ./product.png
vokox --json gen video --prompt "…" --ref ast_… --duration 5 --model auto:video.hq --audio
vokox --json gen gif --prompt "…" --ref ./sticker.png --duration 3
vokox --json gen music --prompt "…" --duration 30
vokox --json tts --text-file script.txt --lang ru --voice ru-female-1
vokox --json compose timeline.json --out ./out
vokox --json jobs wait job_…   # if you submitted with --no-wait
```
`--estimate` on any of them prints the price and exits.
