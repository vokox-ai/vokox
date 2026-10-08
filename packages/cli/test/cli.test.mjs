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
  assert.equal(est.credits, 16); // seedream-4.5 auto = 8 × 2
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
  assert.equal(est.total, 8 + 25 + 12 + 13 + 6); // seedream, wan 720p 5 s, minimax tts, lyria, compose
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

test("drone: prices without --yes (a dry run), flies with --yes and saves the clip", async () => {
  const photo = join(home, "terrace.jpg");
  await writeFile(photo, Buffer.from([0xff, 0xd8, 0xff, 0xc0, 0, 17, 8, 3, 0, 5, 0x80, 3]));
  const before = JSON.parse((await cli(["--json", "balance"])).stdout).balance;
  const dry = await cli(["--json", "drone", photo, "--preset", "circle", "--speed", "fast", "--length", "8"]);
  const est = JSON.parse(dry.stdout);
  assert.equal(est.mode, "around"); // a circle is one continuous clip from the photo
  assert.ok(est.credits > 0);
  assert.equal(est.seconds, 5.3); // 8 s of footage played 1.5×
  assert.match(dry.stderr, /Dry run/u);
  assert.equal(JSON.parse((await cli(["--json", "balance"])).stdout).balance, before); // nothing spent
  const out = join(home, "drone-out");
  const flown = JSON.parse((await cli(["--json", "drone", est.photos[0], "--words", "облететь вокруг и посмотреть в лицо", "-y", "-o", out])).stdout);
  assert.equal(flown.status, "succeeded");
  assert.equal(flown.model, "plan:drone-shot");
  assert.ok((await stat(flown.files[0])).size > 0);
  await assert.rejects(cli(["--json", "drone", photo, "--preset", "nope"]), (e) => e.stdout.includes("--preset"));
});

test("topup gives a payment link with the packs and the balance", async () => {
  const link = JSON.parse((await cli(["--json", "topup", "--pack", "pack_25"])).stdout);
  assert.ok(link.url.includes("/topup") && link.url.includes("pack_25"));
  assert.equal(link.packs.length, 4);
  assert.equal(typeof link.balance, "number");
  assert.ok(link.notice);
  await assert.rejects(cli(["--json", "topup", "--pack", "pack_9"]), (e) => e.stdout.includes("packId"));
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

test("a balance near zero says so, with the top-up link, the way an agent should pass it on", async () => {
  const me = JSON.parse((await cli(["--json", "balance"])).stdout);
  assert.ok(me.balance < 60);
  assert.equal(me.low, true);
  assert.match(me.notice, /Top up/u);
  assert.ok(me.notice.includes(me.topupUrl));
  const est = await cli(["gen", "video", "--prompt", "x", "--model", "kling-3-pro", "--duration", "10", "--estimate"]);
  assert.match(est.stdout, /Top up to run it/u);
});
