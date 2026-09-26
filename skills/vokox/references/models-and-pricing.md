# Models and pricing

Prices come from `vokox models --json`; this table is a snapshot for planning.
Ids are stable aliases owned by vokox; the provider behind them can change without notice.

## Images (per image)

| id | tier | credits | refs | notes |
| --- | --- | --- | --- | --- |
| `z-image` | fast | 2 | – | drafts, thumbnails, sticker bases; 1k only |
| `flux-2-klein` | fast | 3 | – | fast, decent typography |
| `qwen-image` | hq | 6 | 1 | text rendering, light edits |
| `seedream-4.5` | hq | 9 | 4 | photoreal people and products, up to 4k |
| `nano-banana-2` | hq | 15 | 3 | best edits and identity consistency |
| `gpt-image-2` | premium | 12 | 4 | instruction following, UGC phone look |
| `nano-banana-pro` | premium | 30 | 6 | top quality, 4k, complex scenes |

`auto:image.fast` → z-image · `auto:image.hq` → seedream-4.5 · `auto:image.premium` → nano-banana-pro.

## Video (per second; durations allowed)

| id | tier | cr/s | durations | audio | refs | notes |
| --- | --- | --- | --- | --- | --- | --- |
| `wan-2.2-fast` | fast | 3 (min 5 s) | 5, 8 | – | 1 | 480p drafts, GIF bases |
| `wan-2.2-fast-720p` | fast | 5 (min 5 s) | 5, 8 | – | 1 | cheapest usable 720p |
| `ltx-2-fast` | hq | 9 | 5, 8, 10 | yes | 1 | fast, native audio, long clips |
| `hailuo-2.3` | hq | 11 | 6, 10 | – | 1 | strong motion and physics; 768p/1080p |
| `seedance-2-fast` | hq | 21 | 5, 8, 10 | yes | 4 | multi-reference, lip-sync; default deliverable |
| `wan-2.5` | hq | 23 | 5, 10 | yes | 1 | native audio, stable characters |
| `seedance-2` | premium | 34 | 5–15 | yes | 9 | multi-shot, face/voice/video references |
| `kling-3-std` | premium | 28 | 5, 10 | yes | 4 | people, motion, multi-shot prompts |
| `veo-3.1-lite` | premium | 12 | 4, 6, 8 | yes | 3 | cheapest Veo, dialogue on a budget |
| `veo-3.1-fast` | premium | 23 | 4, 6, 8 | yes | 3 | dialogue, SFX, realism |
| `kling-3-pro` | premium | 38 | 5, 10 | yes | 4 | top motion quality, 1080p |
| `veo-3.1` | premium | 89 | 4, 6, 8 | yes | 3 | flagship; only on explicit request |

`auto:video.fast` → wan-2.2-fast-720p · `auto:video.hq` → seedance-2-fast · `auto:video.premium` → kling-3-std.

## GIF

`gif-loop` (`auto:gif`): 20 credits flat, 2–4 s, 1:1 / 9:16 / 16:9, one reference image.
Rendered as a seamless loop (first frame = last frame) and converted to GIF and WebP.

## Music (per track)

| id | credits | durations | notes |
| --- | --- | --- | --- |
| `lyria-3.5` | 15 | 30, 60 | licensed background music; prompt = genre, mood, tempo, instruments, "no vocals" |
| `stable-audio-2.5` | 45 | 30–180 | ambient beds, SFX-like textures, longer tracks |

## TTS (per 1 000 characters)

| id | credits | languages | notes |
| --- | --- | --- | --- |
| `kokoro` | 5 | en es fr ja zh | English narration at near-zero cost |
| `minimax-tts` | 14 | ru en es de fr pt it zh ja ko tr ar | good Russian, 30+ languages, emotion control; default |
| `eleven-v3` | 23 | ru en es de fr pt it zh ja | expressive, emotion tags like `[whispers]` |

Voice ids follow `<lang>-<gender>-<n>`: `ru-female-1`, `ru-male-1`, `en-female-1`, `en-male-2`.
`vokox models -c tts --json` lists the current voices under `caps`.

## Compose

`compose`: 5 credits + 1 credit per 10 s of output. Includes captions from the voice track,
music ducking, fades, aspect-ratio fitting, MP4/WebM/GIF output.

## Budget cheat sheet

| Deliverable | Steps | ≈ credits |
| --- | --- | --- |
| 1 product image, 4 variants | image.hq × 4 | 36 |
| Sticker pack, 8 GIFs | image.fast × 8 + gif × 8 | 176 |
| 15 s vertical ad, no voice | image.hq + 3 × video.hq 5 s + music + compose | 350 |
| 20 s UGC ad, speech from the clip | image.hq + 4 × seedance-2-fast 5 s + compose | 440 |
| 30 s talking head | face image + 3 × seedance-2 10 s + compose | 1 040 |
| 20 s cinematic, Kling Pro | 4 × kling-3-pro 5 s + music + compose | 790 |
| 20 s draft of any of the above | wan-2.2-fast-720p instead of Seedance | ≈ 130 |

Draft on `wan-2.2-fast-720p` or 480p first when the user is still deciding; switch to Seedance for the final.
