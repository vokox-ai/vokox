# Workflow in detail

Companion files: `brief.md` (turning a request into a brief, money agreement, treatment),
`reference-video.md` (when the user sends a clip to imitate), `review.md` (how to check every
output), `failures.md` (symptom → cause → fix before a retake).

## 1. Brief

Ask only what changes the work. Good questions: "Reels 9:16 or YouTube 16:9?", "Do you have a
product photo / your face / a logo I should use?", "Speech in Russian or English, or no voice?",
"Budget ceiling? A 20-second ad is usually 150–700 credits, a Mini draft to a Seedance 2.0 final". Skip questions the message
already answers. Write `brief.md` in the project folder: goal, platform, length, language,
references, budget, decisions. Full guidance and a template: `brief.md`. If the user sent a
reference video, study it first (`reference-video.md`); the study feeds the treatment.

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

## 3a. Draft first: the ladder

Climb one rung at a time and get the user's reaction before the next. Each rung is far cheaper
than the one above and catches a different class of mistake.

| Rung | What | Typical models | ≈ credits (4-shot, 20 s) | Catches |
| --- | --- | --- | --- | --- |
| 0. Words | treatment in 4–6 lines + shot list + script | — | 0 | wrong idea, wrong facts, wrong length |
| 1. Storyboard | one still per shot, composition only | `z-image` (2), `minimax-image-01` (1, one ref) | 4–8 | framing, story order, casting direction |
| 2. Key frames | the real first frames, with face/product refs | `seedream-4.5` (8), `nano-banana-2` (13) | 32–52 | identity, product truth, label, light |
| 3. Motion test | every shot animated cheaply + draft voice + rough compose | `seedance-2-mini` 480p (3/s), `wan-2.2-fast` (3/s) | 60–80 | physics, cause and effect, camera, timing, pacing |
| 4. Final | approved shots only, deliverable tier, same key frames and prompts | `seedance-2-fast`, `seedance-2`, `kling-3-*`, `veo-3.1-*` | 350–700 | — (review still applies) |

- Key frames from rung 2 are the actual inputs of rung 4; they are paid once. For small jobs merge
  rungs 1 and 2 (go straight to key frames).
- The motion test proves that the action reads and the physics hold. It does not preview the
  final's exact pixels: another model interprets the same prompt its own way. Draft inside the
  same family as the final when possible (`seedance-2-mini` → `seedance-2-fast`/`seedance-2`)
  so behaviour carries over; say this to the user so an occasional final retake is no surprise.
- Advance only the shots that passed. A failed shot goes back one rung (`failures.md`), the rest
  move on.
- Skip the ladder for single images (render `n` 2–4 at hq), sticker packs and GIFs (fast is the
  final), budgets under about 100 credits, or when the user explicitly wants the final now and
  accepts the risk. Say you are skipping it.

Plan mechanics: keep two plans, `plan.draft.json` (`"name": "<project>-draft"`) and `plan.json`
(`"name": "<project>"`), so they have separate out dirs and manifests. In the final plan, point
at the approved key frames by their `ast_…` ids from the draft manifest (valid 90 days) instead
of regenerating them. Do not flip one plan from draft to final by editing `defaults`: every step
inheriting the changed field gets a new hash and reruns, key frames included.

## 4. Price and confirm

```bash
vokox --json run plan.json --estimate
```
Show the table: step, model, credits; the total in credits and dollars; the budget cap. If the
user set a ceiling, pass it as `--max-credits`. Offer one cheaper variant (fast tier, shorter
clips) when the total is above the ceiling. Do not run until the user says yes.

The money agreement (details in `brief.md`): before the first paid step, agree the draft-round
budget, the final estimate and a retake reserve (about 20–30 % of the final), and record them in
`brief.md` under Money. A yes covers the scope that was described; extra shots, a higher tier,
another variant or retakes beyond the reserve need a new yes. `--estimate` prices every step in
the plan, including ones the manifest will skip; on a rerun, quote the user only the steps that
will actually run (changed steps and everything that depends on them).

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
Full checklists and ffmpeg commands for images, clips, audio and the final file: `review.md`.
Before paying for any retake, find the symptom and its cause in `failures.md` and change one
variable at a time. Editing a step reruns it and every step that uses it, automatically.
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
