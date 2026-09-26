# Troubleshooting

| Symptom | Meaning | Do |
| --- | --- | --- |
| exit 2, "Not logged in" | no credentials | `vokox auth login` (browser) or `--api-key` |
| exit 3, `insufficient_credits` | balance below the estimate | show `topupUrl` to the user; nothing was charged |
| `over_budget` | estimate above `--max-credits` / `budget.maxCredits` | cut duration, use fast tier, or raise the cap with the user |
| `unknown_model` | wrong id or class | `vokox models --json`; use `auto:` aliases |
| `provider_error` / `moderation` | upstream refused | rephrase (no minors, no real people in sensitive scenes, no logos of brands you do not own) |
| `timeout` | job ran > 20 min | `vokox jobs status <id>`; premium video can take 3–5 min per clip, do not resubmit blindly |
| `network` | API unreachable | `vokox doctor`; check `VOKOX_API_URL` |
| 401 | token expired or revoked | `vokox auth login` again |
| dependency failed | an upstream step failed | fix that step, rerun the plan; finished steps are skipped |
| file too large | reference > 50 MB | resize the image or trim the video first |

Reading job output without `--json` is fine for humans, but agents should always parse JSON.
Held credits are released on cancel (`vokox jobs cancel <id>`) and on failure.
