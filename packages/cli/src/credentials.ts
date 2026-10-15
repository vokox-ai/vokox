import { mkdir, readFile, rm, writeFile, chmod } from "node:fs/promises";
import { CREDENTIALS_PATH, ENV_PREFIX, HOME_DIR, apiUrl } from "./config.js";

export interface Credentials {
  apiUrl: string;
  token: string;
  kind: "device" | "apikey";
  email?: string;
  expiresAt?: number;
}

function missing(error: unknown): boolean {
  return error instanceof Error && "code" in error && (error as { code?: string }).code === "ENOENT";
}

/** Env var wins over the file so CI and agents can inject a key without touching disk. */
export async function loadCredentials(): Promise<Credentials | undefined> {
  const envKey = process.env[`${ENV_PREFIX}_API_KEY`];
  if (envKey) return { apiUrl: apiUrl(), token: envKey, kind: "apikey" };
  try {
    const raw = JSON.parse(await readFile(CREDENTIALS_PATH, "utf8")) as Partial<Credentials>;
    if (typeof raw.token !== "string" || !raw.token) return undefined;
    if (raw.expiresAt && raw.expiresAt < Date.now()) return undefined;
    return { apiUrl: raw.apiUrl ?? apiUrl(), token: raw.token, kind: raw.kind ?? "device", email: raw.email, expiresAt: raw.expiresAt };
  } catch (error) {
    if (missing(error)) return undefined;
    throw error;
  }
}

export async function saveCredentials(value: Credentials): Promise<void> {
  await mkdir(HOME_DIR, { recursive: true, mode: 0o700 });
  await writeFile(CREDENTIALS_PATH, JSON.stringify(value, null, 2) + "\n", { mode: 0o600 });
  await chmod(CREDENTIALS_PATH, 0o600);
}

export async function clearCredentials(): Promise<void> {
  await rm(CREDENTIALS_PATH, { force: true });
}
