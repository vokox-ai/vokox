import { createWriteStream } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { basename, dirname, extname, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { VERSION } from "./config.js";
import type {
  ApiErrorBody, Asset, DeviceCodeResponse, DeviceTokenResponse, Job, JobInput, JobType, Me, Model,
  PriceRequest, PriceResponse,
} from "./types.js";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly topupUrl?: string,
    readonly details?: unknown,
    readonly body?: unknown,
  ) { super(message); }
}

export interface ClientOptions { apiUrl: string; token?: string; fetch?: typeof globalThis.fetch }

export class ApiClient {
  readonly apiUrl: string;
  readonly token?: string;
  readonly #fetch: typeof globalThis.fetch;

  constructor(options: ClientOptions) {
    this.apiUrl = options.apiUrl;
    this.token = options.token;
    this.#fetch = options.fetch ?? globalThis.fetch;
  }

  async #request<T>(method: string, path: string, body?: unknown, init: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = { "user-agent": `vokox-cli/${VERSION}`, ...(init.headers as Record<string, string> | undefined) };
    if (this.token) headers.authorization = `Bearer ${this.token}`;
    let payload: BodyInit | undefined;
    if (body instanceof FormData) payload = body;
    else if (body !== undefined) { headers["content-type"] = "application/json"; payload = JSON.stringify(body); }
    let response: Response;
    try {
      response = await this.#fetch(`${this.apiUrl}${path}`, { ...init, method, headers, body: payload });
    } catch (error) {
      throw new ApiError(0, "network", `Cannot reach ${this.apiUrl}: ${(error as Error).message}`);
    }
    const text = await response.text();
    let parsed: unknown = undefined;
    if (text) { try { parsed = JSON.parse(text); } catch { parsed = text; } }
    if (!response.ok) {
      const err = (parsed as ApiErrorBody | undefined)?.error;
      const code = typeof err === "string" ? err : err?.code;
      const message = typeof err === "string" ? ((parsed as { error_description?: string }).error_description ?? err) : err?.message;
      throw new ApiError(response.status, code ?? `http_${response.status}`, message ?? `HTTP ${response.status}`, typeof err === "string" ? undefined : err?.topupUrl, typeof err === "string" ? undefined : err?.details, parsed);
    }
    return parsed as T;
  }

  // --- library ---
  library(query?: string, category?: string): Promise<{ access: boolean; categories: Record<string, string>; count: number; items: { slug: string; title: string; category: string; tags: string[]; summary: string }[]; upgradeUrl: string }> {
    const qs = new URLSearchParams(); if (query) qs.set("q", query); if (category) qs.set("category", category);
    return this.#request("GET", `/v1/library${qs.size ? `?${qs}` : ""}`);
  }
  libraryGet(slug: string): Promise<{ slug: string; title: string; category: string; summary: string; body: string; prompt?: string; plan?: unknown; models?: string[] }> {
    return this.#request("GET", `/v1/library/${encodeURIComponent(slug)}`);
  }

  // --- auth ---
  deviceCode(): Promise<DeviceCodeResponse> { return this.#request("POST", "/v1/auth/device/code", { client: "cli" }); }
  async deviceToken(deviceCode: string): Promise<DeviceTokenResponse> {
    try {
      return await this.#request("POST", "/v1/auth/device/token", { device_code: deviceCode, grant_type: "urn:ietf:params:oauth:grant-type:device_code" });
    } catch (error) {
      // RFC 8628: pending / slow_down / expired arrive as HTTP 400 with {error: "..."}.
      if (error instanceof ApiError && error.status === 400 && typeof (error.body as { error?: unknown })?.error === "string") {
        return { error: (error.body as { error: DeviceTokenResponse["error"] }).error };
      }
      throw error;
    }
  }
  me(): Promise<Me> { return this.#request("GET", "/v1/me"); }

  // --- catalog ---
  models(cls?: JobType): Promise<Model[]> { return this.#request("GET", `/v1/models${cls ? `?class=${cls}` : ""}`); }
  price(request: PriceRequest): Promise<PriceResponse> { return this.#request("POST", "/v1/price", request); }

  // --- assets ---
  async upload(filePath: string): Promise<Asset> {
    const bytes = await readFile(filePath);
    const form = new FormData();
    form.append("file", new Blob([bytes], { type: mimeFor(filePath) }), basename(filePath));
    return this.#request("POST", "/v1/uploads", form);
  }

  // --- jobs ---
  createJob(type: JobType, input: JobInput, idempotencyKey?: string): Promise<Job> {
    return this.#request("POST", "/v1/jobs", { type, input }, idempotencyKey ? { headers: { "idempotency-key": idempotencyKey } } : {});
  }
  job(id: string): Promise<Job> { return this.#request("GET", `/v1/jobs/${encodeURIComponent(id)}`); }
  jobs(limit = 20): Promise<Job[]> { return this.#request("GET", `/v1/jobs?limit=${limit}`); }
  cancel(id: string): Promise<Job> { return this.#request("POST", `/v1/jobs/${encodeURIComponent(id)}/cancel`); }

  async waitJob(id: string, options: { timeoutMs?: number; onProgress?: (job: Job) => void } = {}): Promise<Job> {
    const deadline = Date.now() + (options.timeoutMs ?? 20 * 60_000);
    let delay = 1500;
    for (;;) {
      const job = await this.job(id);
      options.onProgress?.(job);
      if (job.status === "succeeded" || job.status === "failed" || job.status === "canceled") return job;
      if (Date.now() > deadline) throw new ApiError(0, "timeout", `Job ${id} still ${job.status} after timeout`);
      await new Promise((r) => setTimeout(r, delay));
      delay = Math.min(delay * 1.4, 6000);
    }
  }

  /** Download one asset to a path; the extension follows the asset's mime type. */
  async download(asset: Asset, target: string): Promise<string> {
    const path = extname(target) ? target : `${target}${extFor(asset.mime)}`;
    await mkdir(dirname(path), { recursive: true });
    const url = asset.url.startsWith("http") ? asset.url : `${this.apiUrl}${asset.url}`;
    const headers: Record<string, string> = {};
    if (this.token && url.startsWith(this.apiUrl)) headers.authorization = `Bearer ${this.token}`;
    const response = await this.#fetch(url, { headers });
    if (!response.ok || !response.body) throw new ApiError(response.status, "download_failed", `Download failed: HTTP ${response.status}`);
    await pipeline(Readable.fromWeb(response.body as import("node:stream/web").ReadableStream), createWriteStream(path));
    return path;
  }
}

export function extFor(mime: string): string {
  const map: Record<string, string> = {
    "image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp", "image/gif": ".gif",
    "video/mp4": ".mp4", "video/webm": ".webm", "audio/mpeg": ".mp3", "audio/wav": ".wav", "audio/ogg": ".ogg",
    "application/json": ".json",
  };
  return map[mime] ?? "";
}

export function mimeFor(path: string): string {
  const map: Record<string, string> = {
    ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif",
    ".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime", ".mp3": "audio/mpeg", ".wav": "audio/wav",
  };
  return map[extname(path).toLowerCase()] ?? "application/octet-stream";
}

export function outputName(dir: string, base: string, asset: Asset, index: number, total: number): string {
  const suffix = total > 1 ? `-${index + 1}` : "";
  return join(dir, `${base}${suffix}${extFor(asset.mime)}`);
}
