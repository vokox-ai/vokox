# VokoX

Images, video clips, looping GIFs, music and voice-over for coding agents. Your agent (Claude Code,
Codex, Cursor, claude.ai, ChatGPT) writes the shot list and prompts; VokoX runs 20+ generation models
in the cloud, stitches the result with captions and music, and bills credits. Nothing to install
locally except the CLI.

```bash
npx skills add vokox-ai/vokox         # the skill, for any agent
npm i -g @vokox/cli                   # the CLI
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
| `packages/cli` | the `vokox` CLI (TypeScript, Node ≥ 20): `auth`, `models`, `price`, `gen`, `run plan.json`, `jobs`, `library` |
| `packages/catalog` | model catalog, prices in credits, `auto:` aliases |
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

## Development

```bash
npm ci && npm run build && npm test     # builds catalog, CLI and mock API, runs the CLI tests against the mock
```

## License

MIT. The videos, images and audio you generate belong to you; third-party models have their own terms.
