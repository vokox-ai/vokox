# plan.json

One file, executed by `vokox run`. Validated before anything is sent.

```json
{
  "version": 1,
  "name": "spring-sale",              // used for the default out dir and idempotency keys
  "out": "./out",                     // optional; default ./vokox-out/<name>
  "budget": { "maxCredits": 400 },    // abort before spending if the estimate is higher
  "defaults": { "aspectRatio": "9:16", "resolution": "720p" },
  "steps": [ … ]
}
```

## Step fields

| Field | Types | Meaning |
| --- | --- | --- |
| `id` | all | `[A-Za-z0-9_-]+`, unique; output file is `<out>/<id>.<ext>` |
| `type` | all | `image` `video` `gif` `music` `tts` `compose` |
| `model` | all | model id or `auto:<class>[.<tier>]`; omitted = `auto:<class>` |
| `prompt` | image video gif music | English, see prompting references |
| `negativePrompt` | image video | optional; describe what to avoid in nouns |
| `refs` | image video gif | `["@step", "@step[1]", "file:./a.png", "ast_…"]`; order matters for multi-reference models |
| `aspectRatio` | image video gif | `9:16` `16:9` `1:1` `4:5` `3:2` |
| `duration` | video gif music | seconds; must be in the model's `caps.durations` |
| `resolution` | image video | `1k` `2k` `4k` / `480p` `720p` `1080p` |
| `audio` | video | ask the model to generate sound (only `caps.audio` models) |
| `n` | image | number of variants |
| `seed` | image video | reproducibility |
| `text`, `voice`, `language` | tts | script, voice id, language code |
| `timeline` | compose | see below |
| `params` | all | pass-through model-specific options |
| `note` | all | free text kept in the manifest |

`defaults` are merged under every step. A step may reference only steps defined above it.

## References

- `@hero` → first asset of step `hero`; `@hero[2]` → third asset (for `n > 1`).
- `file:./relative/or/absolute` → uploaded once per plan run, cached in the manifest.
- A bare `ast_…` id → an existing asset (from a previous job or upload).

## Compose timeline

```json
{
  "aspectRatio": "9:16",
  "clips": [
    { "asset": "@clip1", "transition": "cut" },
    { "asset": "@clip2", "trim": { "start": 0, "end": 4 }, "transition": "fade" }
  ],
  "voice": { "asset": "@voice", "start": 0.3, "volume": 1 },
  "music": { "asset": "@music", "volume": 0.18, "duck": true, "fadeOut": 1.5 },
  "captions": { "from": "@voice", "style": "bold-bottom", "language": "ru" },
  "output": { "format": "mp4", "fps": 30 }
}
```
`captions.from` transcribes the voice track and burns word-timed captions; `captions.text` is an
array of lines shown evenly instead. Styles: `bold-bottom`, `center-pop`, `minimal-top`.
Clips are letterboxed or cropped to the aspect ratio; the output length is the clip sum, voice
and music are trimmed or faded to fit.

## Manifest and resume

`<out>/manifest.json` records every step: job id, status, credits, asset ids, local files, plus
uploads. Rerunning the same plan skips steps with `status: "succeeded"`; edit a step to redo it
(or delete its entry), `--force` redoes everything. Downstream steps that reference a redone step
must be redone too: delete their entries.

## Exit codes and output

`--json` prints one object on stdout: `{ outDir, totalCredits, steps }` on success, or
`{ error: { code, message, topupUrl? } }`. Exit 0 all steps done; 1 some failed or over budget;
2 not logged in; 3 insufficient credits.
