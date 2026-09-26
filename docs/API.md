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
| GET | `/v1/me` | → `{id, email, balance, plan?, topupUrl}` |

The verification page (`/activate?user_code=`) signs the user in, claims the code for the session
(`GET /api/auth/device?user_code=`) and approves it (`POST /api/auth/device/approve`). Implemented with
Better Auth's device-authorization plugin; the CLI's `client_id` is `vokox-cli`. Tokens are opaque, 90 days, revocable from the web app.
API keys (`sk_…`) are created in the web app and never expire until revoked.

## Catalog

| Method | Path | Response |
| --- | --- | --- |
| GET | `/v1/models?class=` | `Model[]` (public; no auth needed) |
| POST | `/v1/price` | `{type, input}` → `{credits, model, breakdown?}` |

`Model`: `{id, class, tier?, name, credits:{unit, amount, minSeconds?}, caps:{durations?, aspectRatios?, resolutions?, audio?, imageInput?, maxRefs?, languages?, maxChars?, voices?}, notes?, eta?}`.
`input.model` accepts a model id or `auto:<class>[.<tier>]`. Pricing is deterministic from
`(model, duration | n | text length | timeline)`; refs never change the price.

## Assets

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/v1/uploads` | multipart `file` (≤ 50 MB: png/jpg/webp/mp4/mov/webm/mp3/wav) → `Asset` |
| GET | `/v1/assets/:id` | bytes; signed CDN URLs are also accepted in `Asset.url` |

`Asset`: `{id, url, mime, bytes?, width?, height?, duration?}`. Assets live 30 days (free) or
as long as the account is paid.

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
| compose | timeline | model (`compose`) |

`timeline`: `{aspectRatio?, clips:[{asset, trim?:{start?,end?}, transition?: cut|fade}], voice?:{asset,start?,volume?}, music?:{asset,volume?,duck?,fadeOut?}, captions?:{from?|text?, style?, language?}, output?:{format?: mp4|webm|gif, fps?}}`.

## Account, billing, admin (web app and ops)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/v1/ledger?limit=` | credit history for the current user |
| GET | `/v1/billing/packs` | `{packs:[{id, usd, credits}], checkoutEnabled}` |
| POST | `/v1/billing/checkout` | `{packId}` → `{url}` (Polar hosted checkout); 400 `checkout_unavailable` when Polar is not configured |
| POST | `/v1/enhance` | `{type: video\|image\|music, prompt, mode?, duration?, audio?}` → rewritten prompt (cheap LLM via OpenRouter; passthrough without a key) |
| POST | `/webhooks/polar` | Standard Webhooks signature; `order.paid` grants the pack once (dedup by order id) |
| POST | `/webhooks/:provider` | fal / OpenRouter completion callbacks only wake the poller; payload is never trusted |
| POST | `/admin/grant` | `Authorization: Bearer ADMIN_TOKEN`; `{email|userId, credits, ref}` manual sale or gift |
| GET | `/admin/stats`, `/admin/users` | 24h counters, queue depth, balances |
| GET | `/health`, `/metrics` | DB + Redis checks (503 when down); Prometheus text |
| GET | `/app` | account page: balance, packs, API keys, gallery, ledger (session cookie) |
| POST/GET | `/mcp` | remote MCP (Streamable HTTP, stateless) with the same Bearer auth; tools `list_models`, `estimate_cost`, `generate`, `compose`, `get_job`, `list_recent`, `get_balance` |

Rate limits: 30/min per IP on auth endpoints, `RATE_PER_MINUTE` (120) per user on `/v1/*`; 429 with `retry-after`.
Uploads are type-sniffed (magic bytes); anything but png/jpg/webp/gif/mp4/mov/webm/mp3/wav/ogg is rejected.

## Backend responsibilities (not visible to the CLI)

- **Router**: `auto:*` and every model id map to an ordered provider list
  (e.g. `kling-3-std` → Krea API → fal → Wavespeed); circuit breaker per provider; the first
  healthy one wins; price to the user never changes with the provider.
- **Moderation** of prompt and reference images before the hold (OpenAI omni-moderation).
- **Ledger**: append-only entries `purchase | hold | capture | release | refund | bonus`, balance
  derived. Never store a mutable balance number as the source of truth.
- **Storage**: outputs copied to R2 within the job; provider URLs expire.
- **Compose**: ffmpeg worker; captions via whisper on the voice track; output ≤ 60 s in v1.
- **Rate limits**: 429 with `retry-after`; CLI backs off.

## Assumed upstream cost (for margin tracking, Sept 2026)

| model | provider | cost | sell (credits) |
| --- | --- | --- | --- |
| z-image | Wavespeed | $0.005 | 2 |
| seedream-4.5 | fal / Wavespeed | $0.04 | 8 |
| nano-banana-2 | OpenRouter | $0.05–0.067 | 10 |
| nano-banana-pro | OpenRouter | $0.134 | 30 |
| gpt-image-2 | OpenRouter | $0.05 | 12 |
| wan-2.2-fast / 720p | Wavespeed | $0.01 / $0.02 per s | 3 / 5 per s |
| ltx-2-fast | fal | $0.03 per s | 8 |
| hailuo-2.3 | OpenRouter / Wavespeed / fal | $0.045 per s | 9 |
| seedance-2-fast | OpenRouter / Wavespeed | $0.04 per s | 10 |
| wan-2.5 | fal | $0.05 per s | 12 |
| seedance-2 | OpenRouter / Wavespeed | $0.067 per s | 16 |
| kling-3-std | Wavespeed / OpenRouter / fal | $0.084 per s | 18 |
| veo-3.1-lite | OpenRouter | $0.05 per s | 12 |
| veo-3.1-fast | Google / fal | $0.10–0.15 per s | 30 |
| kling-3-pro | fal | $0.224 per s | 45 |
| veo-3.1 | Google | $0.40 per s | 80 |
| gif-loop | Wavespeed + ffmpeg | $0.05 | 20 |
| lyria-3.5 | Gemini API | $0.08 | 15 |
| stable-audio-2.5 | fal | $0.20 | 35 |
| kokoro / minimax-tts / eleven-v3 | fal | $0.0007 / $0.06 / $0.10 per 1k | 1 / 10 / 20 |
