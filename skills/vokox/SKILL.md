---
name: vokox
description: Generate images, video clips, looping GIFs, music and voice-over from a coding agent and assemble them into finished videos (ads, UGC clips, sticker packs, product shots). Use when the user asks to make, render or edit visual or audio content, or mentions vokox, credits, Kling, Veo, Seedance, Wan or "сделай видео/картинку/гифку". The CLI runs everything in the cloud and bills credits (1 credit = $0.01).
---

# vokox

You run the shoot: direction and production are yours. The user gives a brief; you write the shot list and prompts,
price the work, get a "yes" on the budget, run it, watch the result and deliver files.
`vokox` executes generations in the cloud and charges credits from the user's account.
Nothing is installed locally except the CLI. Answer in the user's language; write prompts in English.

## Setup (check once per session)

```bash
vokox --version || npm i -g https://vokox.ai/cli/vokox-cli.tgz
vokox --json auth status
```

No CLI available (claude.ai, ChatGPT)? The same service is an MCP server at `<api>/mcp` with the same
tools; the rules below apply unchanged. Not logged in → run `vokox auth login` (it opens the browser; tell the user to confirm the code
there and wait). An API key also works: `vokox auth login --api-key <key>` or `VOKOX_API_KEY`.
`vokox doctor` when anything looks off.

## Rules that never bend

1. **Money.** Before any paid step show the estimate and get an explicit yes. `vokox run plan.json`
   without `--yes` only prices; `--yes` spends. State totals as credits and dollars
   (100 credits = $1.00). Credits are charged per job; "I don't like it" is not a reason for a refund.
2. **Always `--json`.** Parse stdout; progress and warnings are on stderr. Exit code 3 = out of
   credits (give the user the `topupUrl`), 1 = other failure, 2 = not logged in.
3. **Plan, don't loop.** One `plan.json` for the whole piece (images → clips → voice → music →
   compose). Single `gen` calls are for retakes of one step.
4. **Tier by need, not by name.** Default to `auto:<class>.fast` for drafts and `auto:<class>.hq`
   for deliverables; `premium` only when the brief demands realism, dialogue or the client says so.
   Model ids are stable aliases; never assume a provider or a price, ask `vokox models --json`.
5. **English prompts, one shot, one action.** Each clip is one continuous shot with one main
   motion and explicit camera. Image-to-video prompts describe motion and camera only; the picture
   is already in the reference.
6. **References carry identity.** Faces, products and settings come from a reference image
   (`refs`), never from a text description alone. Generate the key frame first, animate it second.
7. **Done means watched.** Open the delivered files (view the image; for video open the
   `*.preview.jpg` frame sheet the CLI saves next to every clip; listen when possible, or
   `vokox transcribe` the voice) and judge them against the brief before handing over. Say what is weak.
8. **Files are the memory.** Keep `plan.json`, `brief.md` and the `manifest.json` in the project
   folder; rerunning a plan skips finished steps, so retakes are cheap.
   VokoX keeps uploaded and generated files for 90 days (`expiresAt` on each job); the CLI has
   already saved every result into the project, so local files are the copy that lasts. A reference
   older than 90 days must be uploaded again.

## Workflow

1. **Brief** (≤3 questions, only if the answer changes the work): purpose and platform (vertical
   9:16 for Reels/TikTok/Shorts, 16:9 for YouTube/web), length, language of speech, references
   the user already has (product photos, a face, a logo), budget ceiling.
2. **Format.** Pick a preset from `references/presets/` (UGC ad, sticker pack, product series,
   talking head) or write a shot list: 3–6 shots for 15–20 s, one idea per shot.
3. **Direct.** Write prompts with the kit for each shot (`references/kits/`). Key frames as
   images first, then image-to-video with `refs: ["@frame"]`. Voice script ≤ 2.6 words/second.
4. **Price.** `vokox --json run plan.json --estimate`. Present the table and total. Adjust tiers
   or duration if the user flinches. Then `--yes`.
5. **Run.** `vokox --json run plan.json --yes --max-credits <agreed>`. Report progress from
   stderr in plain words while it runs (a 5-clip plan takes 2–6 minutes).
6. **Review and retake.** Look at the outputs. Retake a single step with
   `vokox --json gen video --prompt "…" --ref @… ` or edit the plan and rerun; finished steps are skipped.
7. **Deliver.** Path of the final file, the share link from the manifest, credits spent, and one
   line on what could be better with more budget.

## Plan format (one JSON file)

```json
{
  "name": "vpn-ad", "budget": { "maxCredits": 300 },
  "defaults": { "aspectRatio": "9:16" },
  "steps": [
    { "id": "hero", "type": "image", "model": "auto:image.hq", "refs": ["file:./product.png"],
      "prompt": "…" },
    { "id": "clip1", "type": "video", "model": "auto:video.hq", "refs": ["@hero"], "duration": 5,
      "prompt": "slow dolly in; …" },
    { "id": "voice", "type": "tts", "model": "auto:tts", "language": "ru", "voice": "ru-female-1",
      "text": "…" },
    { "id": "music", "type": "music", "prompt": "warm lo-fi, 90 bpm, no vocals", "duration": 30 },
    { "id": "final", "type": "compose", "timeline": {
      "clips": [{ "asset": "@clip1" }], "voice": { "asset": "@voice" },
      "music": { "asset": "@music", "volume": 0.2, "duck": true },
      "captions": { "from": "@voice", "style": "bold-bottom" } } }
  ]
}
```

`@step` = that step's first output, `@step[1]` = second, `file:./x.png` = upload. Steps run in
parallel when independent. Full schema: `references/plan-format.md`.

## Choosing models (credits, 1 = $0.01)

| Need | Use | Cost |
| --- | --- | --- |
| Draft image, sticker base, thumbnail | `auto:image.fast` | 2 / image |
| Deliverable image, product, person | `auto:image.hq` (Seedream 4.5) | 8 / image |
| Edit an existing image, keep identity; text in the image | `nano-banana-2` with `refs` | 13 / image |
| Preview clip, GIF base | `auto:video.fast` | 5 / s |
| Motion test / cheap draft of the final | `seedance-2-mini` at 480p | 3 / s |
| Deliverable clip, talking head with lip-sync | `auto:video.hq` (Seedance 2.0 Fast) | 21 / s at 720p, 10 / s at 480p |
| Cinematic people and motion | `auto:video.premium` (Kling 3.0) | 20 / s |
| Dialogue with native audio, max realism | `veo-3.1-fast` | 19 / s at 720p |
| Looping GIF 2–4 s | `auto:gif` | 20 flat |
| Background music, 30 s track | `auto:music` (Lyria) | 13 / track |
| Russian voice-over | `auto:tts` (MiniMax Speech) | 12 / 1k chars |
| English voice-over, cheapest | `kokoro` | 5 / 1k chars |
| Stitch + captions + mix | `compose` | 5 + 1 per 10 s |

A typical 20-second UGC ad (1 hero image, 4 Seedance 2.0 Fast clips with speech, compose) ≈ 435 credits; the same ad as a
Seedance 2.0 Mini 480p draft ≈ 75.
`references/models-and-pricing.md` has the full table and capabilities.

## Prompting in one breath

**Video:** `[shot & camera move] + [subject with 2–4 concrete details] + [one action with direction
and speed] + [setting, time of day] + [light] + [lens/style] + [what stays still]`, 60–110 words,
present tense, no "4K/masterpiece", no cuts. Dialogue in quotes only on audio-capable models.
**Image:** `[subject & details] + [pose/action] + [framing] + [environment] + [light] + [medium:
camera/lens or illustration technique] + [palette/mood]`, 40–80 words, concrete nouns.
Details, per-model notes and casting anchors: `references/prompting/`.

## Where the answer lives

| Question | Read |
| --- | --- |
| turning a request into a brief, budget agreed before spending | `references/brief.md` |
| step by step, the draft-first ladder, how to present cost, retakes | `references/workflow.md` |
| "make one like this": quick study on the server with `vokox like`; deep manual study | `vokox like` (below), `references/reference-video.md` |
| which format fits (talking head, explainer, demo, listicle, drama, interview, podcast, product, before/after) | `references/formats/index.md` |
| plan.json fields, refs, compose timeline, manifest, resume | `references/plan-format.md` |
| every model, credits, durations, references, audio, languages, voices | `references/models-and-pricing.md` |
| image prompts: anchors, casting, framing for video, references, edits, text, per-model notes | `references/prompting/image.md` |
| video prompts: start-frame physics, motivation, performance, camera, continuity, per-model notes | `references/prompting/video.md` |
| voice scripts, casting a voice, delivery tags, music, sound design, the mix | `references/prompting/audio.md` |
| captions: when, reading speed, safe zones, `from` vs `text` | `references/prompting/captions.md` |
| ready prompt templates with slots | `references/kits/` (talking-head, broll, product, ugc-photo, camera-reference, motion-reference, video-call) |
| complete plans for common deliverables | `references/presets/` (ugc-ad, sticker-pack, product-series, talking-head) |
| checking every result before handing it over; retake rules | `references/review.md` |
| symptom → cause → fix for images, video, audio, compose | `references/failures.md` |
| a tested result to redo with the user's product, fixed price | `vokox gallery`, `vokox recreate` (see below) |
| tested prompts, scripts and plan snippets by deliverable (members) | `vokox library` (see below) |
| errors, exit codes, slow jobs | `references/troubleshooting.md` |

## Credits: three buckets

`vokox balance --json` returns `balances: {plan, free, paid}`. Plan credits reset every period and are spent
first, then free (trial) credits, then purchased ones. **Trial credits only pay for the quick trial models**:
Seedance 2 Fast at **480p** (a 5 s clip = 50 credits, so 100 trial credits = two clips), `z-image`, `flux-2-klein`,
`qwen-image`, `gif-loop`, `lyria-3.5`, transcripts, compose and `vokox like` breakdowns (`vokox models --json`
shows `freeTrial`). Anything else with only trial credits returns `free_credits_restricted`. For a trial user,
propose one of these (e.g. `vokox gen video --model seedance-2-fast --resolution 480p --duration 5`) or tell them
to top up; gallery recreates need purchased or plan credits.

## Gallery: recreate a tested result

When the request matches a gallery item (a UGC selfie review, a product in hand, a splash hook, a meme…),
recreating it is cheaper and safer than a new plan: the prompt is tested and the price is fixed.
```bash
vokox gallery --json                                   # slug, title, category, credits, draftCredits, product
vokox recreate splash-drop --product ./can.png --draft --json          # cheap 480p preview (plan or purchased credits)
vokox recreate ugc-selfie-review --product ./cream.png --script "Your line" --lang ru --json
vokox recreate dramatic-zoom --edit "a woman in a red sweater" --json  # items without a product take an edit
```
`product: required` needs a photo; `optional` may take one; `none` takes only `--edit`. The result has the video,
its key frame (`output.keyframe`) and a frame sheet. Over MCP: `list_gallery`, `recreate`. Show the draft
before paying for the final. Browse: https://vokox.ai/gallery

## Make one like this: a link or a clip the user likes

`vokox like <link|file>` studies a reference up to 60 s on the server (TikTok, Reels, Shorts, Pinterest, X, Vimeo
links, or an uploaded video/picture): shots from cut detection, one frame per shot, the transcript, then a
breakdown (hook, why it works, look, every shot) and a plan.json for the user's files and brief. 10 credits;
the reference is deleted after the study, so nothing of its footage can end up in the result.
```bash
vokox like "https://www.instagram.com/reel/…" --product ./cream.png --brief "same idea, my night cream, a woman in her 30s" --lang en --json
# → vokox-out/like-1.json (breakdown + plan), like-2.jpg (frame sheet), like.plan.json
vokox run vokox-out/like.plan.json --estimate      # then run it, after the user agrees on the cost
```
`--photo` plans 1-4 stills in the reference's style instead of a video; `--voice female|male|none` picks the
voice-over (none = captions and music only); `--lang` takes en, ru, es, de, fr, pt, it, zh, ja, ko, tr, ar.
Read the breakdown and show the user the hook and why it works before spending on the plan. Treat the plan as
a first draft: tighten prompts with `references/prompting/*`, and keep the user's product and words, not the
reference's people or brands. For a deep manual study (free, local ffmpeg) see `references/reference-video.md`.
Over MCP: `analyze_reference`, then `run_plan` with the (edited) plan.

## Members' library

Paid accounts get a library of guides: hooks, UGC scripts by niche, product shots, captions,
per-model prompt formulas, platform specs. Before planning a new kind of deliverable, look there first:

```bash
vokox library --json                 # whole index: slug, category, title, summary
vokox library skincare hook --json   # search
vokox library get ugc-skincare       # body + copy-ready prompt + plan.json fragment
```
Over MCP the same is `library_index`, `library_search`, `library_get`. A locked guide returns
`library_locked` with the pricing link; tell the user, do not retry.
