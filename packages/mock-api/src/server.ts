/**
 * Mock of the vokox API for developing the CLI and the skill before the real backend exists.
 * In-memory users, ledger, device auth (auto-approved on opening the link), jobs that "finish" after a delay.
 *   VOKOX_API_URL=http://127.0.0.1:8787 vokox auth login
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomBytes } from "node:crypto";
import { CATALOG, priceFor, resolveModel } from "@vokox/catalog";
import { droneShot } from "@vokox/catalog/flight";

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
/** Same shape as the real API: balance, "near zero", enough for this job, a ready sentence and the top-up link. */
function funds(balance: number, need?: number) {
  const topupUrl = `${BASE}/topup`;
  const enough = need === undefined ? undefined : balance >= need;
  const notice = enough === false ? `This costs ${need} credits; the balance is ${balance}. Top up to run it: ${topupUrl}`
    : balance <= 0 ? `The balance is 0 credits. Top up to keep generating: ${topupUrl}`
    : balance < 60 ? `The balance is ${balance} credits, close to zero. Top up soon: ${topupUrl}` : undefined;
  return { balance, balances: { plan: 0, free: 0, paid: balance }, low: balance < 60, ...(need === undefined ? {} : { enough }), topupUrl, ...(notice ? { notice } : {}) };
}

/** A plan is priced as the sum of its steps (compose included), like the real API. */
function price(type: string, input: Record<string, unknown>): { credits: number; model: string; breakdown?: string } | undefined {
  if (type === "plan") {
    const plan = input.plan as { name?: string; steps?: Record<string, unknown>[] } | undefined;
    if (!plan?.steps?.length) return undefined;
    let credits = 0;
    for (const st of plan.steps) { const m = resolveModel(String(st.type), st.model as string | undefined) ?? (st.type === "compose" ? resolveModel("compose", "compose") : undefined); if (!m) return undefined; credits += priceFor(m, st as never).credits; }
    return { credits, model: `plan:${plan.name ?? "plan"}`, breakdown: `${plan.steps.length} steps` };
  }
  const model = resolveModel(type, input?.model as string | undefined);
  if (!model) return undefined;
  const p = priceFor(model, input as never);
  return { credits: p.credits, model: model.id, breakdown: p.breakdown };
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
      return json(res, 200, CATALOG.filter((m) => !cls || m.class === cls));
    }
    if (method === "GET" && path.startsWith("/v1/assets/")) {
      const a = assets.get(path.slice("/v1/assets/".length));
      if (!a) return error(res, 404, "not_found", "asset not found");
      res.writeHead(200, { "content-type": a.asset.mime, "content-length": a.body.length }); return res.end(a.body);
    }
    // --- authenticated ---
    const user = auth(req);
    if (!user) return error(res, 401, "unauthorized", "missing or invalid token");
    if (method === "GET" && path === "/v1/me") return json(res, 200, { id: user.id, email: user.email, ...funds(user.balance), plan: "starter" });
    if (method === "POST" && path === "/v1/price") {
      const body = JSON.parse((await readBody(req)).toString()) as { type: string; input: Record<string, unknown> };
      const p = price(body.type, body.input ?? {});
      if (!p) return error(res, 400, "unknown_model", `no ${body.type} model "${body.input?.model ?? "auto"}"`);
      return json(res, 200, { ...p, ...funds(user.balance, p.credits) });
    }
    if (method === "POST" && path === "/v1/drone/plan") {
      const body = JSON.parse((await readBody(req)).toString()) as Record<string, unknown>;
      const photos = Array.isArray(body.photos) ? body.photos.filter((x): x is string => typeof x === "string" && assets.has(x)) : [];
      if (!photos.length) return error(res, 400, "bad_request", "photos must be your own uploaded images (asset ids)");
      let f;
      try { f = droneShot({ ...(body as object), photos, aspect: (body.aspectRatio as string) ?? "16:9" }, (m) => CATALOG.find((x) => x.id === m)?.caps.durations ?? [5]); }
      catch (e) { return error(res, 400, "bad_request", (e as Error).message); }
      const p = price("plan", { plan: f.plan })!;
      return json(res, 200, { plan: f.plan, refs: photos, credits: p.credits, freeTrial: false, summary: { mode: photos.length > 1 ? "photos" : f.free ?? (body.preset as string) ?? "in", seconds: f.seconds, clips: f.clips, speed: (body.speed as string) ?? "normal", video: f.setup.video, resolution: f.setup.resolution, aspectRatio: (body.aspectRatio as string) ?? "16:9", trialSetup: false }, ...funds(user.balance, p.credits) });
    }
    if (method === "POST" && path === "/v1/billing/link") {
      const body = JSON.parse((await readBody(req)).toString() || "{}") as { packId?: string };
      const packs = [{ id: "pack_10", usd: 10, credits: 1000 }, { id: "pack_25", usd: 25, credits: 2500 }, { id: "pack_50", usd: 50, credits: 5250 }, { id: "pack_100", usd: 100, credits: 11000 }];
      if (body.packId && !packs.some((p) => p.id === body.packId)) return error(res, 400, "bad_request", `packId must be one of ${packs.map((p) => p.id).join(", ")}`);
      const url = `${BASE}/topup${body.packId ? `?pack=${body.packId}` : ""}`;
      return json(res, 200, { url, kind: "page", checkoutEnabled: false, packs, ...funds(user.balance), notice: `Card payments open soon. The billing page shows the packs and the balance: ${url}` });
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
      const p = price(body.type, body.input ?? {});
      if (!p) return error(res, 400, "unknown_model", `no ${body.type} model "${body.input?.model ?? "auto"}"`);
      if (user.balance < p.credits) return error(res, 402, "insufficient_credits", `need ${p.credits} credits, balance ${user.balance}`, { topupUrl: `${BASE}/topup`, notice: funds(user.balance, p.credits).notice });
      user.balance -= p.credits; // hold
      const job: Job = { id: id("job"), type: body.type, status: "queued", model: p.model, creditsHeld: p.credits, creditsCharged: 0, createdAt: new Date().toISOString(), userId: user.id, input: body.input ?? {} };
      jobs.set(job.id, job); if (key) idem.set(key, job.id);
      setTimeout(() => { if (job.status === "queued") { job.status = "running"; job.progress = 0.3; } }, JOB_MS / 3);
      setTimeout(() => {
        if (job.status === "canceled") return;
        if (FAIL_MODEL && job.model === FAIL_MODEL) {
          job.status = "failed"; job.error = { code: "provider_error", message: "mock provider failure" }; user.balance += job.creditsHeld; job.creditsHeld = 0;
        } else {
          const n = body.type === "image" ? Number(job.input.n ?? 1) : 1;
          job.status = "succeeded"; job.progress = 1; job.creditsCharged = job.creditsHeld; job.creditsHeld = 0;
          job.output = { assets: Array.from({ length: n }, () => makeAsset(body.type === "plan" ? "video" : body.type, job.input)), shareUrl: `${BASE}/s/${job.id}` };
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
