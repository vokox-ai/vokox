# VokoX

**VokoX ([vokox.ai](https://vokox.ai)) is a cloud studio for coding agents** — not Voxox, not Vox AI. Claude Code, Codex, Cursor, claude.ai or ChatGPT make images, video clips, GIFs, voice-overs and music through one skill, CLI and MCP server, paid with credits.

Your agent (Claude Code, Codex, Cursor, claude.ai, ChatGPT) writes the shot list and prompts; VokoX runs 20+ generation models
in the cloud, stitches the result with captions and music, and bills credits. Nothing to install
locally except the CLI.

```bash
npx skills add vokox-ai/vokox         # the skill, for any agent
npm i -g https://vokox.ai/cli/vokox-cli.tgz                   # the CLI
vokox auth login                      # opens the browser once
```

Then, in your agent: *"Make a 20-second vertical ad for my coffee brand, English voice-over, here is
the product photo."* The agent writes `plan.json`, shows the price in credits, waits for your yes,
runs every shot in parallel and hands you `final.mp4`.

- Website and pricing: https://vokox.ai
- Every new account starts with 100 free credits, no card.
- MCP server for claude.ai / ChatGPT / Cursor: `https://vokox.ai/mcp` with a Bearer API key from your account.

## What is in this repository

| Path | What |
| --- | --- |
| `skills/vokox` | the agent skill: `SKILL.md`, prompting guides per model, presets, plan format, troubleshooting |
| `packages/cli` | the `vokox` CLI (TypeScript, Node ≥ 20): `auth`, `balance`, `topup`, `models`, `gen`, `run plan.json`, `drone`, `like`, `gallery`, `jobs`, `library` |
| `packages/catalog` | model catalog, prices in credits, `auto:` aliases, the Drone shot flight builder |
| `packages/mock-api` | in-memory mock of the API contract, used by the CLI tests |
| `.claude-plugin` | Claude Code plugin and marketplace manifests |
| `docs/API.md` | the HTTP contract the CLI and MCP talk to |

The service that runs generations, holds provider accounts and bills credits is not part of this
repository; the CLI talks to it at `https://vokox.ai`.

## How a plan looks

```json
{
  "name": "coffee-ugc",
  "budget": { "maxCredits": 120 },
  "steps": [
    { "id": "creator", "type": "image", "model": "seedream-4.5", "prompt": "candid iPhone selfie, …", "aspectRatio": "9:16" },
    { "id": "take", "type": "video", "model": "seedance-2-fast", "refs": ["@creator"], "duration": 5, "audio": true,
      "prompt": "quick voice note to a friend, brisk natural pace", "params": { "speech": "Okay, this is the coffee…" } },
    { "id": "final", "type": "compose", "timeline": { "clips": [{ "asset": "@take" }], "captions": { "from": "@take", "style": "center-pop" } } }
  ]
}
```

```bash
vokox run plan.json --estimate   # price every step before spending
vokox run plan.json --yes        # run; re-running skips finished steps
```

## Drone shot

A drone-style flight over one photo: fly in, circle around, rise and reveal, come down from the sky, or dive
from the planet in space down to the photo. The scene and people hold still; no drone ever appears in the frame.

```bash
vokox drone ./villa.jpg --preset circle              # price (a dry run)
vokox drone ./villa.jpg --preset orbit --speed fast -y
```

## Credits and top-up

Every new account gets 100 free credits for quick trial models. Balance and price answers carry a `notice`
the agent passes on when the balance is near zero or a job needs more, and `vokox topup` returns the payment
link. The agent hands the link over; it never pays for you.

## Development

```bash
npm ci && npm run build && npm test     # builds catalog, CLI and mock API, runs the CLI tests against the mock
```

## License

MIT. The videos, images and audio you generate belong to you; third-party models have their own terms.
