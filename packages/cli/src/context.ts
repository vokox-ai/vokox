import { ApiClient, ApiError } from "./client.js";
import { apiUrl } from "./config.js";
import { loadCredentials } from "./credentials.js";
import { fail, info, isJson } from "./output.js";
import type { Job } from "./types.js";

export async function anonymousClient(): Promise<ApiClient> {
  return new ApiClient({ apiUrl: apiUrl() });
}

/** Authenticated client or a clear exit with the login hint. */
export async function authedClient(): Promise<ApiClient> {
  const creds = await loadCredentials();
  if (!creds) {
    const message = "Not logged in. Run `vokox auth login` (opens the browser) or set VOKOX_API_KEY.";
    // Agents read stdout: without this line they get exit 2 and nothing to parse.
    if (isJson()) process.stdout.write(JSON.stringify({ error: { code: "not_logged_in", message } }) + "\n");
    fail(message);
    process.exitCode = 2;
    throw new ExitError(2);
  }
  return new ApiClient({ apiUrl: creds.apiUrl, token: creds.token });
}

/** Uniform error reporting: agents get a JSON object on stdout, humans get a red line. */
export function reportError(error: unknown, json: boolean): never {
  if (error instanceof ApiError) {
    if (json) process.stdout.write(JSON.stringify({ error: { code: error.code, message: error.message, topupUrl: error.topupUrl, notice: error.notice, status: error.status } }) + "\n");
    fail(`${error.code}: ${error.message}`);
    if (error.notice) info(error.notice);
    else if ((error.code === "insufficient_credits" || error.code === "free_credits_restricted") && error.topupUrl) info(`Top up: ${error.topupUrl}`);
    if (error.status === 401) info("Token rejected. Run `vokox auth login` again.");
    process.exitCode = error.code === "insufficient_credits" || error.code === "free_credits_restricted" ? 3 : 1;
    throw new ExitError(process.exitCode);
  }
  if (error instanceof JobFailedError) {
    // One object on stdout: the error and the finished job (status, refund) together.
    const { job } = error;
    if (json) process.stdout.write(JSON.stringify({ error: { code: job.error?.code ?? `job_${job.status}`, message: error.message }, job: { ...job, files: [] } }) + "\n");
    fail(error.message);
    if (job.creditsCharged === 0) info("no credits were charged");
    process.exitCode = 1;
    throw new ExitError(1);
  }
  if (error instanceof ExitError) throw error;
  const message = error instanceof Error ? error.message : String(error);
  if (json) process.stdout.write(JSON.stringify({ error: { code: "cli", message } }) + "\n");
  fail(message);
  process.exitCode = 1;
  throw new ExitError(1);
}

/** A job that ended failed or canceled; reportError prints it as one JSON object with the job. */
export class JobFailedError extends Error {
  constructor(readonly job: Job) { super(job.error ? `${job.error.code}: ${job.error.message}` : `job ${job.status}`); }
}

/** A numeric flag, or a clear error instead of a NaN that silently switches the check off. */
export function numberFlag(name: string, value: string | undefined, options: { min?: number; integer?: boolean } = {}): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  const { min = 0, integer = false } = options;
  if (value.trim() === "" || !Number.isFinite(n) || n < min || (integer && !Number.isInteger(n))) {
    throw new Error(`${name} must be ${integer ? "an integer" : "a number"} ≥ ${min}, got "${value}"`);
  }
  return n;
}

/** Thrown after the error was reported; stdout is flushed by a normal exit instead of process.exit(). */
export class ExitError extends Error { constructor(readonly code: number) { super(`exit ${code}`); } }
