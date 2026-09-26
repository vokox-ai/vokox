import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const run = promisify(execFile);
const ROOT = resolve(import.meta.dirname, "../../..");
const CLI = join(ROOT, "packages/cli/dist/index.js");
const MOCK = join(ROOT, "packages/mock-api/dist/server.js");
const PORT = 8790 + Math.floor(Math.random() * 100);
const API = `http://127.0.0.1:${PORT}`;
let server;
let home;

async function cli(args, env = {}) {
  const { stdout, stderr } = await run("node", [CLI, ...args], { env: { ...process.env, VOKOX_API_URL: API, VOKOX_HOME: home, VOKOX_API_KEY: "sk_demo", ...env } });
  return { stdout, stderr };
}

before(async () => {
  home = await mkdtemp(join(tmpdir(), "vokox-home-"));
  server = spawn("node", [MOCK], { env: { ...process.env, PORT: String(PORT), MOCK_JOB_MS: "300", MOCK_FAIL_MODEL: "veo-3.1" }, stdio: ["ignore", "ignore", "pipe"] });
  await new Promise((r, j) => { server.stderr.on("data", (d) => { if (String(d).includes("mock api on")) r(); }); server.on("exit", j); });
});
after(() => server.kill());

test("models lists the catalog as json", async () => {
  const { stdout } = await cli(["--json", "models", "-c", "video"]);
  const models = JSON.parse(stdout);
  assert.ok(models.length >= 5);
  assert.ok(models.every((m) => m.class === "video"));
});

test("auth status works with an API key from env", async () => {
  const { stdout } = await cli(["--json", "auth", "status"]);
  assert.equal(JSON.parse(stdout).email, "demo@vokox.ai");
});

test("gen image --estimate prices without spending", async () => {
  const before = JSON.parse((await cli(["--json", "balance"])).stdout).balance;
  const { stdout } = await cli(["--json", "gen", "image", "--prompt", "a red cup", "--estimate", "-n", "2"]);
  const est = JSON.parse(stdout);
  assert.equal(est.credits, 18); // seedream-4.5 auto = 9 × 2
  const after = JSON.parse((await cli(["--json", "balance"])).stdout).balance;
  assert.equal(before, after);
});

test("gen image downloads the file and charges credits", async () => {
  const out = await mkdtemp(join(tmpdir(), "vokox-out-"));
  const { stdout } = await cli(["--json", "gen", "image", "--prompt", "a red cup", "--model", "z-image", "--out", out, "--name", "cup"]);
  const res = JSON.parse(stdout);
  assert.equal(res.status, "succeeded");
  assert.equal(res.creditsCharged, 2);
  assert.deepEqual(res.files, [join(out, "cup.png")]);
  assert.ok((await stat(join(out, "cup.png"))).size > 0);
});

test("run executes a plan with dependencies, budget and manifest resume", async () => {
  const dir = await mkdtemp(join(tmpdir(), "vokox-plan-"));
  await writeFile(join(dir, "ref.png"), Buffer.from("fake"));
  const plan = {
    name: "test-ad", out: join(dir, "out"), budget: { maxCredits: 500 },
    defaults: { aspectRatio: "9:16" },
    steps: [
      { id: "hero", type: "image", prompt: "product on a table", model: "auto:image.hq", refs: ["file:./ref.png"] },
      { id: "clip1", type: "video", prompt: "slow dolly in", model: "auto:video.fast", refs: ["@hero"], duration: 5 },
      { id: "voice", type: "tts", text: "Привет, это тест.", voice: "ru-1", language: "ru" },
      { id: "music", type: "music", prompt: "warm lo-fi, 90 bpm", duration: 30 },
      { id: "final", type: "compose", timeline: { clips: [{ asset: "@clip1" }], voice: { asset: "@voice" }, music: { asset: "@music", volume: 0.2 } } },
    ],
  };
  await writeFile(join(dir, "plan.json"), JSON.stringify(plan));
  const est = JSON.parse((await cli(["--json", "run", join(dir, "plan.json"), "--estimate"])).stdout);
  assert.equal(est.total, 9 + 25 + 14 + 15 + 6); // seedream, wan 720p 5 s, minimax tts, lyria, compose
  const res = JSON.parse((await cli(["--json", "run", join(dir, "plan.json"), "--yes"])).stdout);
  assert.equal(res.totalCredits, est.total);
  assert.ok(Object.values(res.steps).every((s) => s.status === "succeeded"));
  const manifest = JSON.parse(await readFile(join(dir, "out", "manifest.json"), "utf8"));
  assert.ok(manifest.steps.final.assets[0].id.startsWith("ast_"));
  assert.ok((await stat(join(dir, "out", "final.mp4"))).size > 0);
  // second run: everything skipped, nothing charged
  const again = JSON.parse((await cli(["--json", "run", join(dir, "plan.json"), "--yes"])).stdout);
  assert.equal(again.totalCredits, est.total);
});

test("run refuses a plan over budget before spending", async () => {
  const dir = await mkdtemp(join(tmpdir(), "vokox-plan-"));
  await writeFile(join(dir, "plan.json"), JSON.stringify({ steps: [{ id: "v", type: "video", prompt: "x", model: "kling-3-pro", duration: 10 }] }));
  await assert.rejects(cli(["--json", "run", join(dir, "plan.json"), "--yes", "--max-credits", "100"]), (e) => JSON.parse(e.stdout).error.code === "over_budget");
});

test("failed provider job refunds credits and reports the error", async () => {
  const before = JSON.parse((await cli(["--json", "balance"])).stdout).balance;
  await assert.rejects(cli(["--json", "gen", "video", "--prompt", "x", "--model", "veo-3.1", "--duration", "4"]), (e) => e.stdout.includes("provider_error"));
  const after = JSON.parse((await cli(["--json", "balance"])).stdout).balance;
  assert.equal(before, after);
});

test("insufficient credits exits with code 3 and a topup link", async () => {
  let rejected;
  for (let i = 0; i < 5 && !rejected; i++) {
    try { await cli(["--json", "gen", "video", "--prompt", "x", "--model", "kling-3-pro", "--duration", "10"]); }
    catch (e) { rejected = e; }
  }
  assert.ok(rejected, "expected the balance to run out");
  assert.equal(rejected.code, 3);
  const body = JSON.parse(rejected.stdout);
  assert.equal(body.error.code, "insufficient_credits");
  assert.ok(body.error.topupUrl.includes("/topup"));
});
