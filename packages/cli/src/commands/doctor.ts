import type { Command } from "commander";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { apiUrl, CREDENTIALS_PATH, VERSION } from "../config.js";
import { loadCredentials } from "../credentials.js";
import { ApiClient } from "../client.js";
import { result } from "../output.js";

const run = promisify(execFile);

export function registerDoctor(program: Command): void {
  program.command("doctor").description("check node, network, credentials").action(async () => {
    const checks: Record<string, string> = { cli: VERSION, node: process.version, apiUrl: apiUrl(), credentialsPath: CREDENTIALS_PATH };
    const creds = await loadCredentials();
    checks.credentials = creds ? `${creds.kind}${creds.email ? " · " + creds.email : ""}` : "none";
    try { const client = new ApiClient({ apiUrl: apiUrl(), token: creds?.token }); const models = await client.models(); checks.api = `ok · ${models.length} models`; }
    catch (error) { checks.api = `unreachable: ${(error as Error).message}`; }
    try { await run("ffmpeg", ["-version"]); checks.ffmpeg = "present (optional, only for local trims)"; } catch { checks.ffmpeg = "absent (fine: composing runs in the cloud)"; }
    result(checks, Object.entries(checks).map(([k, v]) => `${k.padEnd(16)} ${v}`).join("\n"));
  });
}
