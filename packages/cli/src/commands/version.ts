import type { Command } from "commander";
import { apiUrl, BUILD, VERSION } from "../config.js";
import { reportError } from "../context.js";
import { isJson, result } from "../output.js";

export const CLI_UPDATE = "npm i -g https://vokox.ai/cli/vokox-cli.tgz";
export const SKILL_UPDATE = "npx skills update vokox -y   (installed with -g: npx skills update vokox -g -y; or reinstall: npx skills add vokox-ai/vokox -y)";

/**
 * Newest CLI and skill, from the site. The skill file says which version it is ("Skill version: …"); the agent
 * compares it with `skill.latest` here and updates when it is older. VokoX ships often.
 */
export function registerVersion(program: Command): void {
  program.command("version").description("this CLI's build and the newest CLI and skill; how to update").action(async () => {
    try {
      let latest: { cli?: string; skill?: string } = {};
      try {
        const r = await fetch(`${apiUrl()}/cli/version.json`, { signal: AbortSignal.timeout(8000) });
        if (r.ok) latest = await r.json() as typeof latest;
      } catch { /* offline: report what we know */ }
      const outdated = BUILD !== "dev" && Boolean(latest.cli) && latest.cli! > BUILD;
      const out = {
        cli: { version: VERSION, build: BUILD, latest: latest.cli, outdated, ...(outdated ? { update: CLI_UPDATE } : {}) },
        skill: { latest: latest.skill, update: SKILL_UPDATE, note: "compare with the \"Skill version\" line of your SKILL.md; update when it is older" },
        checked: Boolean(latest.cli),
      };
      result(out, [
        `cli ${VERSION} (build ${BUILD})${latest.cli ? ` · newest ${latest.cli}` : " · could not reach the site"}${outdated ? `\nupdate: ${CLI_UPDATE}` : ""}`,
        `skill newest ${latest.skill ?? "?"} · update: ${SKILL_UPDATE}`,
      ].join("\n"));
    } catch (error) { reportError(error, isJson()); }
  });
}
