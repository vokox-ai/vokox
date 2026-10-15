import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/** Rename here when the product name is final. */
export const PRODUCT = "vokox";
export const ENV_PREFIX = "VOKOX";
export const DEFAULT_API_URL = "https://vokox.ai";
export const HOME_DIR = process.env[`${ENV_PREFIX}_HOME`] ?? join(homedir(), `.${PRODUCT}`);
export const CREDENTIALS_PATH = join(HOME_DIR, "credentials.json");
export const VERSION = "0.1.0";
/**
 * When this CLI build was made, as the time of the last change to the CLI ("2026-10-10T14:05"), stamped into
 * build.json by scripts/pack-cli.sh; "dev" in a local build. Compared with https://vokox.ai/cli/version.json.
 */
export const BUILD: string = (() => {
  try { return (JSON.parse(readFileSync(new URL("../build.json", import.meta.url), "utf8")) as { cli?: string }).cli ?? "dev"; }
  catch { return "dev"; }
})();

export function apiUrl(): string {
  return (process.env[`${ENV_PREFIX}_API_URL`] ?? DEFAULT_API_URL).replace(/\/+$/u, "");
}
