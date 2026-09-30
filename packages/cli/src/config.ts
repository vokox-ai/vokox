import { homedir } from "node:os";
import { join } from "node:path";

/** Rename here when the product name is final. */
export const PRODUCT = "vokox";
export const ENV_PREFIX = "VOKOX";
export const DEFAULT_API_URL = "https://vokox.ai";
export const HOME_DIR = process.env[`${ENV_PREFIX}_HOME`] ?? join(homedir(), `.${PRODUCT}`);
export const CREDENTIALS_PATH = join(HOME_DIR, "credentials.json");
export const VERSION = "0.1.0";

export function apiUrl(): string {
  return (process.env[`${ENV_PREFIX}_API_URL`] ?? DEFAULT_API_URL).replace(/\/+$/u, "");
}
