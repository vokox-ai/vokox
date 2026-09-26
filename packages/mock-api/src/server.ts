/**
 * Mock of the vokox API for developing the CLI and the skill before the real backend exists.
 * In-memory users, ledger, device auth (auto-approved on opening the link), jobs that "finish" after a delay.
 *   VOKOX_API_URL=http://127.0.0.1:8787 vokox auth login
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomBytes } from "node:crypto";
import { CATALOG, priceFor, resolveModel } from "@vokox/catalog";

const PORT = Number(process.env.PORT ?? 8787);
const BASE = process.env.PUBLIC_URL ?? `http://127.0.0.1:${PORT}`;
const JOB_MS = Number(process.env.MOCK_JOB_MS ?? 1500);
const FAIL_MODEL = process.env.MOCK_FAIL_MODEL; // make one model always fail, to test refunds

interface User { id: string; email: string; balance: number; tokens: Set<string> }
interface Device { code: string; userCode: string; approved: boolean; user?: User; expiresAt: number }
interface Job { id: string; type: string; status: string; model: string; creditsHeld: number; creditsCharged: number; progress?: number; createdAt: string; finishedAt?: string; error?: { code: string; message: string }; output?: { assets: Asset[]; shareUrl?: string }; userId: string; input: Record<string, unknown> }
interface Asset { id: string; url: string; mime: string; bytes?: number; duration?: number }

const users = new Map<string, User>();
const tokens = new Map<string, User>();
const devices = new Map<string, Device>();
const jobs = new Map<string, Job>();
const assets = new Map<string, { asset: Asset; body: Buffer }>();
const idem = new Map<string, string>();

const demo: User = { id: "usr_demo", email: "demo@vokox.ai", balance: Number(process.env.MOCK_BALANCE ?? 1000), tokens: new Set(["sk_demo"]) };
users.set(demo.id, demo); tokens.set("sk_demo", demo);

const id = (p: string) => `${p}_${randomBytes(6).toString("hex")}`;
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "content-type": "application/json" }); res.end(JSON.stringify(body));
}
function error(res: ServerResponse, status: number, code: string, message: string, extra: Record<string, unknown> = {}): void {
  json(res, status, { error: { code, message, ...extra } });
}
async function readBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = []; for await (const c of req) chunks.push(c as Buffer); return Buffer.concat(chunks);
}
function auth(req: IncomingMessage): User | undefined {
  const h = req.headers.authorization ?? ""; const t = h.startsWith("Bearer ") ? h.slice(7) : ""; return tokens.get(t);
}
function makeAsset(type: string, input: Record<string, unknown>): Asset {
  const a = id("ast");
  const mime = type === "image" ? "image/png" : type === "gif" ? "image/gif" : type === "music" || type === "tts" ? "audio/mpeg" : "video/mp4";
  const body = type === "image" ? PNG : Buffer.from(`mock ${type} ${JSON.stringify(input).slice(0, 200)}`);
  const asset: Asset = { id: a, url: `${BASE}/v1/assets/${a}`, mime, bytes: body.length, duration: typeof input.duration === "number" ? input.duration : undefined };
  assets.set(a, { asset, body });
  return asset;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", BASE);
  const path = url.pathname;
  const method = req.method ?? "GET";
  try {
    // --- device flow ---
    if (method === "POST" && path === "/v1/auth/device/code") {
      const d: Device = { code: id("dev"), userCode: randomBytes(3).toString("hex").toUpperCase(), approved: false, expiresAt: Date.now() + 600_000 };
      devices.set(d.code, d);
      return json(res, 200, { device_code: d.code, user_code: d.userCode, verification_uri: `${BASE}/activate`, verification_uri_complete: `${BASE}/activate?code=${d.code}`, expires_in: 600, interval: 2 });
    }
    if (method === "GET" && path === "/activate") {
      const d = devices.get(url.searchParams.get("code") ?? "");
      if (!d) { res.writeHead(404); return res.end("unknown code"); }
      d.approved = true; d.user = demo;
      res.writeHead(200, { "content-type": "text/html" });
      return res.end(`<h1>vokox (mock)</h1><p>Device ${d.userCode} approved for ${demo.email}. You can close this tab.</p>`);
    }
    if (method === "POST" && path === "/v1/auth/device/token") {
      const body = JSON.parse((await readBody(req)).toString() || "{}") as { device_code?: string };
      const d = devices.get(body.device_code ?? "");
      if (!d) return json(res, 400, { error: "expired_token" });
      if (!d.approved || !d.user) return json(res, 400, { error: "authorization_pending" });
      const t = id("tok"); tokens.set(t, d.user); d.user.tokens.add(t); devices.delete(d.code);
      return json(res, 200, { access_token: t, token_type: "bearer", expires_in: 60 * 60 * 24 * 90 });
    }
    // --- public catalog ---
    if (method === "GET" && path === "/v1/models") {
      const cls = url.searchParams.get("class");
      return json(res, 200, CATALOG.filter((m) => !cls || m.class === cls).map(({ cost: _c, ...m }) => m));
    }
    if (method === "GET" && path.startsWith("/v1/assets/")) {
      const a = assets.get(path.slice("/v1/assets/".length));
      if (!a) return error(res, 404, "not_found", "asset not found");
      res.writeHead(200, { "content-type": a.asset.mime, "content-length": a.body.length }); return res.end(a.body);
    }
    // --- authenticated ---
    const user = auth(req);
    if (!user) return error(res, 401, "unauthorized", "missing or invalid token");
    if (method === "GET" && path === "/v1/me") return json(res, 200, { id: user.id, email: user.email, balance: user.balance, plan: "starter", topupUrl: `${BASE}/topup` });
    if (method === "POST" && path === "/v1/price") {
      const body = JSON.parse((await readBody(req)).toString()) as { type: string; input: Record<string, unknown> };
      const model = resolveModel(body.type, body.input?.model as string | undefined);
      if (!model) return error(res, 400, "unknown_model", `no ${body.type} model "${body.input?.model ?? "auto"}"`);
      const p = priceFor(model, body.input as never);
      return json(res, 200, { credits: p.credits, model: model.id, breakdown: p.breakdown });
    }
    if (method === "POST" && path === "/v1/uploads") {
      const body = await readBody(req);
      const a = id("ast"); const asset: Asset = { id: a, url: `${BASE}/v1/assets/${a}`, mime: "application/octet-stream", bytes: body.length };
      assets.set(a, { asset, body });
      return json(res, 200, asset);
    }
    if (method === "POST" && path === "/v1/jobs") {
      const key = req.headers["idempotency-key"] as string | undefined;
      if (key && idem.has(key)) return json(res, 200, jobs.get(idem.get(key)!));
      const body = JSON.parse((await readBody(req)).toString()) as { type: string; input: Record<string, unknown> };
      const model = resolveModel(body.type, body.input?.model as string | undefined);
      if (!model) return error(res, 400, "unknown_model", `no ${body.type} model "${body.input?.model ?? "auto"}"`);
      const p = priceFor(model, body.input as never);
      if (user.balance < p.credits) return error(res, 402, "insufficient_credits", `need ${p.credits} credits, balance ${user.balance}`, { topupUrl: `${BASE}/topup` });
      user.balance -= p.credits; // hold
      const job: Job = { id: id("job"), type: body.type, status: "queued", model: model.id, creditsHeld: p.credits, creditsCharged: 0, createdAt: new Date().toISOString(), userId: user.id, input: body.input ?? {} };
      jobs.set(job.id, job); if (key) idem.set(key, job.id);
      setTimeout(() => { if (job.status === "queued") { job.status = "running"; job.progress = 0.3; } }, JOB_MS / 3);
      setTimeout(() => {
        if (job.status === "canceled") return;
        if (FAIL_MODEL && job.model === FAIL_MODEL) {
          job.status = "failed"; job.error = { code: "provider_error", message: "mock provider failure" }; user.balance += job.creditsHeld; job.creditsHeld = 0;
        } else {
          const n = body.type === "image" ? Number(job.input.n ?? 1) : 1;
          job.status = "succeeded"; job.progress = 1; job.creditsCharged = job.creditsHeld; job.creditsHeld = 0;
          job.output = { assets: Array.from({ length: n }, () => makeAsset(body.type, job.input)), shareUrl: `${BASE}/s/${job.id}` };
        }
        job.finishedAt = new Date().toISOString();
      }, JOB_MS);
      return json(res, 200, job);
    }
    if (method === "GET" && path === "/v1/jobs") {
      const limit = Number(url.searchParams.get("limit") ?? 20);
      return json(res, 200, [...jobs.values()].filter((j) => j.userId === user.id).reverse().slice(0, limit));
    }
    const m = /^\/v1\/jobs\/([^/]+)(\/cancel)?$/u.exec(path);
    if (m) {
      const job = jobs.get(m[1]);
      if (!job || job.userId !== user.id) return error(res, 404, "not_found", "job not found");
      if (m[2] && method === "POST") { if (job.status === "queued" || job.status === "running") { job.status = "canceled"; user.balance += job.creditsHeld; job.creditsHeld = 0; } return json(res, 200, job); }
      return json(res, 200, job);
    }
    return error(res, 404, "not_found", `no route ${method} ${path}`);
  } catch (e) {
    return error(res, 500, "internal", (e as Error).message);
  }
});

server.listen(PORT, () => { console.error(`vokox mock api on ${BASE} (demo key: sk_demo, balance ${demo.balance})`); });
