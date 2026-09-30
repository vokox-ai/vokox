import { ApiClient, ApiError } from "./client.js";
import { apiUrl } from "./config.js";
import { loadCredentials } from "./credentials.js";
import { fail, info } from "./output.js";

export async function anonymousClient(): Promise<ApiClient> {
  return new ApiClient({ apiUrl: apiUrl() });
}

/** Authenticated client or a clear exit with the login hint. */
export async function authedClient(): Promise<ApiClient> {
  const creds = await loadCredentials();
  if (!creds) {
    fail("Not logged in. Run `vokox auth login` (opens the browser) or set VOKOX_API_KEY.");
    process.exitCode = 2;
    throw new ExitError(2);
  }
  return new ApiClient({ apiUrl: creds.apiUrl, token: creds.token });
}

/** Uniform error reporting: agents get a JSON object on stdout, humans get a red line. */
export function reportError(error: unknown, json: boolean): never {
  if (error instanceof ApiError) {
    if (json) process.stdout.write(JSON.stringify({ error: { code: error.code, message: error.message, topupUrl: error.topupUrl, status: error.status } }) + "\n");
    fail(`${error.code}: ${error.message}`);
    if (error.code === "insufficient_credits" && error.topupUrl) info(`Top up: ${error.topupUrl}`);
    if (error.status === 401) info("Token rejected. Run `vokox auth login` again.");
    process.exitCode = error.code === "insufficient_credits" ? 3 : 1;
    throw new ExitError(process.exitCode);
  }
  if (error instanceof ExitError) throw error;
  const message = error instanceof Error ? error.message : String(error);
  if (json) process.stdout.write(JSON.stringify({ error: { code: "cli", message } }) + "\n");
  fail(message);
  process.exitCode = 1;
  throw new ExitError(1);
}

/** Thrown after the error was reported; stdout is flushed by a normal exit instead of process.exit(). */
export class ExitError extends Error { constructor(readonly code: number) { super(`exit ${code}`); } }
