# vokox API contract v1

Base URL `https://vokox.ai` (CLI: `VOKOX_API_URL`). JSON everywhere except uploads and
asset downloads. Auth: `Authorization: Bearer <token>` (device-flow token or API key `sk_…`).
Errors: `{ "error": { "code", "message", "topupUrl"?, "details"? } }` with HTTP 400/401/402/404/429/500.
The mock in `packages/mock-api` implements this contract; the real backend must keep it.

## Auth (RFC 8628 device flow)

| Method | Path | Body → Response |
| --- | --- | --- |
| POST | `/v1/auth/device/code` | `{client:"cli"}` → `{device_code, user_code, verification_uri, verification_uri_complete, expires_in, interval}` |
| POST | `/v1/auth/device/token` | `{device_code, grant_type}` → `{access_token, token_type, expires_in}` or `{error: "authorization_pending" \| "slow_down" \| "expired_token" \| "access_denied"}` (HTTP 400) |
| GET | `/v1/me` | → `{id, email, balance, balances, low, topupUrl, notice?, plan?}`; `notice` is a ready sentence when the balance is near zero |

The verification page (`/activate?user_code=`) signs the user in, claims the code for the session
(`GET /api/auth/device?user_code=`) and approves it (`POST /api/auth/device/approve`). Implemented with
Better Auth's device-authorization plugin; the CLI's `client_id` is `vokox-cli`. Tokens are opaque, 90 days, revocable from the web app.
API keys (`sk_…`) are created in the web app and never expire until revoked.

## Catalog

| Method | Path | Response |
| --- | --- | --- |
| GET | `/v1/models?class=` | `Model[]` (public; no auth needed) |
| POST | `/v1/price` | `{type, input}` → `{credits, model, breakdown?, freeTrial, balance, balances, enough, low, topupUrl, notice?}` |
| POST | `/v1/drone/plan` | `{photos:[assetId…1-4], preset?, words?, subject?, length?, speed?, tier?, height?, aspectRatio?}` → `{plan, refs, credits, summary, …funds}`; run it as `POST /v1/jobs {type:"plan", input:{plan, refs}}` |

`Model`: `{id, class, tier?, name, credits:{unit, amount, minSeconds?}, caps:{durations?, aspectRatios?, resolutions?, audio?, imageInput?, maxRefs?, languages?, maxChars?, voices?}, notes?, eta?}`.
`input.model` accepts a model id or `auto:<class>[.<tier>]`. Pricing is deterministic from
`(model, duration | n | text length | timeline)`, plus the seconds of any video reference (billed at the model's
"video ref" rate); a talking-photo model (`audioDriven`, e.g. `omnihuman-1.5`) is priced by its voice track's length.

## Assets

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/v1/uploads` | multipart `file` (≤ 50 MB: png/jpg/webp/mp4/mov/webm/mp3/wav) → `Asset` |
| GET | `/v1/assets/:id` | bytes; signed CDN URLs are also accepted in `Asset.url` |

`Asset`: `{id, url, mime, bytes?, width?, height?, duration?}`. Assets are kept 90 days, then
deleted. Jobs carry `expiresAt`; after it `output` is `{assets: [], expired: true}`.

## Jobs

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/v1/jobs` | `{type, input}` (+ optional `Idempotency-Key` header) → `Job`; HTTP 402 `insufficient_credits` |
| GET | `/v1/jobs/:id` | `Job` |
| GET | `/v1/jobs?limit=` | `Job[]` newest first |
| POST | `/v1/jobs/:id/cancel` | releases held credits if not finished |

`Job`: `{id, type, status: queued|running|succeeded|failed|canceled, model, creditsHeld, creditsCharged, progress?, createdAt, finishedAt?, error?:{code,message}, output?:{assets: Asset[], shareUrl?}}`.

Credit semantics: price is **held** on create, **captured** on success, **released** on failure or
cancel. `creditsCharged` is the captured amount. Idempotent creates return the existing job.
Every status change is a conditional update inside one transaction with the ledger row, under a
per-user advisory lock: cancel and worker completion can never both win, and a canceled job never
hands out output. `duration` is pinned server-side (`normalizeDuration`) and echoed by `/v1/price`;
`params` can never override priced fields (duration, n, size, resolution, refs).

### Job input by type

| type | required | optional |
| --- | --- | --- |
| image | prompt | model, refs, aspectRatio, resolution, n, seed, negativePrompt, params |
| video | prompt | model, refs, aspectRatio, duration, resolution, audio, seed, negativePrompt, params |
| gif | prompt | model, refs, aspectRatio, duration (2–4) |
| music | prompt | model, duration |
| tts | text | model, voice, language |
| transcribe | refs (one audio or video asset, ≤ 30 min) | model (`whisper`), language → `output.text` + `transcript.json` `{text, language, duration, words:[{text,start,end}]}`; 1 credit per started minute |
| recreate | template (gallery slug from `GET /v1/gallery`), refs (one product photo when the item needs it) | edit, script, language, draft → video (or image) + `output.keyframe` (+ `output.voice`); price = the item's listed credits |
| compose | timeline | model (`compose`) |

`GET /v1/gallery` (public): items with slug, title, category, tags, media, product (required|optional|none), credits and draftCredits.

Video results also carry `output.preview`: a 3×2 JPEG frame sheet for review (free).

`timeline`: `{aspectRatio?, clips:[{asset, trim?:{start?,end?}, transition?: cut|fade, speed?: 0.5–3}], voice?:{asset,start?,volume?}, clipAudio?:{volume?}, music?:{asset,volume?,duck?,fadeOut?}, captions?:{from?|text?, style?, language?}, titles?:[{text, start?, end?, position?: top|center|bottom}], output?:{format?: mp4|webm|gif, fps?}}`.
Music under a voice is ducked by default (`duck: false` keeps it level). Each clip's sound is padded or cut to its picture.

## Account and billing

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/v1/ledger?limit=` | credit history for the current user |
| GET | `/v1/billing/packs` | `{packs:[{id, usd, credits}], checkoutEnabled}` |
| POST | `/v1/billing/link` | `{packId?}` → `{url, kind: "checkout"\|"page", checkoutEnabled, packs, notice, …funds}`: the link an agent hands to the user |
| POST | `/v1/billing/checkout` | `{packId}` → `{url}` (Polar hosted checkout); 400 `checkout_unavailable` when Polar is not configured |
| POST | `/v1/enhance` | `{type: video\|image\|music, prompt, mode?, duration?, audio?}` → rewritten prompt |
| GET | `/app` | account page: balance, packs, API keys, gallery, ledger (session cookie) |
| POST/GET | `/mcp` | remote MCP (Streamable HTTP, stateless) with the same Bearer auth; tools `list_models`, `get_balance`, `get_topup_link`, `estimate_cost`, `generate`, `upload_from_url`, `list_uploads`, `drone_shot`, `list_gallery`, `like_example`, `recreate`, `analyze_reference`, `run_plan`, `compose`, `get_job`, `list_recent`, `library_index`, `library_search`, `library_get`. Paid tools wait about 50 s, then return the job still running: poll `get_job` |

Rate limits: 30/min per IP on auth endpoints, `RATE_PER_MINUTE` (120) per user on `/v1/*`; 429 with `retry-after`.
Uploads are type-sniffed (magic bytes); anything but png/jpg/webp/gif/mp4/mov/webm/mp3/wav/ogg is rejected.
