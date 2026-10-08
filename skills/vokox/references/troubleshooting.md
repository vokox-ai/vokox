# Troubleshooting

| Symptom | Meaning | Do |
| --- | --- | --- |
| exit 2, "Not logged in" | no credentials | `vokox auth login` (browser) or `--api-key` |
| exit 3, `insufficient_credits` / `free_credits_restricted` | balance below the price, or only free credits for a paid model | pass on `notice` with the link (`vokox topup`); nothing was charged; a trial model may fit |
| `over_budget` | estimate above `--max-credits` / `budget.maxCredits` | cut duration, use fast tier, or raise the cap with the user |
| `unknown_model` | wrong id or class | `vokox models --json`; use `auto:` aliases |
| `content_blocked` / `moderation` | the model or our filter refused the content | rephrase (no minors, no real people in sensitive scenes, no logos of brands you do not own); the message says what to change |
| `unavailable` | the model is down at every provider right now; credits returned | retry in a few minutes or pick another model of the same class (`vokox models --json`) |
| `timeout` | job ran > 20 min | `vokox jobs status <id>`; premium video can take 3–5 min per clip, do not resubmit blindly |
| `network` | API unreachable | `vokox doctor`; check `VOKOX_API_URL` |
| 401 | token expired or revoked | `vokox auth login` again |
| dependency failed | an upstream step failed | fix that step, rerun the plan; finished steps are skipped |
| file too large | reference > 50 MB | resize the image or trim the video first |

Reading job output without `--json` is fine for humans, but agents should always parse JSON.
Held credits are released on cancel (`vokox jobs cancel <id>`) and on failure.
