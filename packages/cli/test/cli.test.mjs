import { test, before, after, afterEach } from "node:test";
import assert from "node:assert/strict";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, mkdir, writeFile, readFile, stat } from "node:fs/promises";
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

async function cli(args, env = {}, opts = {}) {
  const { stdout, stderr } = await run("node", [CLI, ...args], { env: { ...process.env, VOKOX_API_URL: API, VOKOX_HOME: home, VOKOX_API_KEY: "sk_demo", ...env }, ...opts });
  return { stdout, stderr };
}
const balance = async () => JSON.parse((await cli(["--json", "balance"])).stdout).balance;
/** Queue canned failures in the mock (see MOCK_FAULTS in mock-api); returns the fault list with hit counts. */
const fault = async (f) => (await fetch(`${API}/__faults`, { method: "POST", body: JSON.stringify(f) })).json();
const clearFaults = async () => (await fetch(`${API}/__faults`, { method: "DELETE" })).json();
async function planDir(plan) {
  const dir = await mkdtemp(join(tmpdir(), "vokox-plan-"));
  await writeFile(join(dir, "plan.json"), JSON.stringify({ out: join(dir, "out"), ...plan }));
  return { dir, plan: join(dir, "plan.json"), manifest: () => readFile(join(dir, "out", "manifest.json"), "utf8").then(JSON.parse) };
}

before(async () => {
  home = await mkdtemp(join(tmpdir(), "vokox-home-"));
  server = spawn("node", [MOCK], { env: { ...process.env, PORT: String(PORT), MOCK_JOB_MS: "300", MOCK_FAIL_MODEL: "veo-3.1", MOCK_FAULTS: "1" }, stdio: ["ignore", "ignore", "pipe"] });
  await new Promise((r, j) => { server.stderr.on("data", (d) => { if (String(d).includes("mock api on")) r(); }); server.on("exit", j); });
});
after(() => server.kill());
afterEach(() => clearFaults()); // a failed assertion must not leave canned failures for the next test

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
  assert.equal(est.total, 8 + 25 + 12 + 30 + 6); // seedream, wan 720p 5 s, minimax tts, minimax music, compose
  const res = JSON.parse((await cli(["--json", "run", join(dir, "plan.json"), "--yes"])).stdout);
  assert.equal(res.totalCredits, est.total);
  assert.ok(Object.values(res.steps).every((s) => s.status === "succeeded"));
  const manifest = JSON.parse(await readFile(join(dir, "out", "manifest.json"), "utf8"));
  assert.ok(manifest.steps.final.assets[0].id.startsWith("ast_"));
  // shareUrl per step and the final step's at the top: the skill delivers the link from the manifest.
  assert.match(manifest.steps.final.shareUrl, /\/s\/job_/u);
  assert.equal(manifest.shareUrl, manifest.steps.final.shareUrl);
  assert.equal(res.shareUrl, manifest.shareUrl);
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

test("liked: the examples the user liked, add and remove by slug", async () => {
  const gallery = JSON.parse((await cli(["--json", "gallery"])).stdout);
  const slug = gallery[0].slug;
  assert.deepEqual(JSON.parse((await cli(["--json", "liked"])).stdout), []);
  assert.equal(JSON.parse((await cli(["--json", "liked", "add", slug])).stdout).liked, true);
  const list = JSON.parse((await cli(["--json", "liked"])).stdout);
  assert.deepEqual(list.map((g) => g.slug), [slug]);
  assert.ok(list[0].credits > 0 && list[0].title);
  assert.equal(JSON.parse((await cli(["--json", "liked", "remove", slug])).stdout).liked, false);
  assert.deepEqual(JSON.parse((await cli(["--json", "liked"])).stdout), []);
  await assert.rejects(cli(["--json", "liked", "add", "no-such-thing"]), (e) => e.stdout.includes("not_found"));
});

test("version: this build, the newest CLI and skill from the site, and how to update", async () => {
  const v = JSON.parse((await cli(["--json", "version"])).stdout);
  assert.equal(v.checked, true);
  // A local build has no stamp and is never told to update itself; a packed one (build.json) compares with the site,
  // whose mock says 2099: outdated, with the update command.
  if (v.cli.build === "dev") assert.equal(v.cli.outdated, false);
  else { assert.match(v.cli.build, /^\d{4}-\d\d-\d\dT\d\d:\d\d$/u); assert.equal(v.cli.outdated, true); assert.match(v.cli.update, /vokox-cli\.tgz/u); }
  assert.equal(v.skill.latest, "2099-01-01T00:00");
  assert.match(v.skill.update, /npx skills update vokox -y/u);
});

test("run: an interrupted run re-attaches to the submitted job instead of paying again", async () => {
  const p = await planDir({ name: "resume", steps: [{ id: "a", type: "image", prompt: "a cup", model: "z-image" }] });
  const before = await balance();
  const child = spawn("node", [CLI, "--json", "run", p.plan, "--yes"], { env: { ...process.env, VOKOX_API_URL: API, VOKOX_HOME: home, VOKOX_API_KEY: "sk_demo" }, stdio: "ignore" });
  // Kill it as soon as the job id is in the manifest, i.e. while it waits for the job.
  for (let i = 0; i < 200; i++) {
    const m = await p.manifest().catch(() => undefined);
    if (m?.steps?.a?.jobId) break;
    await new Promise((r) => setTimeout(r, 20));
  }
  child.kill("SIGKILL");
  await new Promise((r) => child.on("exit", r));
  const jobId = (await p.manifest()).steps.a.jobId;
  assert.ok(jobId);
  const res = JSON.parse((await cli(["--json", "run", p.plan, "--yes"])).stdout);
  assert.equal(res.steps.a.status, "succeeded");
  assert.equal(res.steps.a.jobId, jobId);
  assert.equal(await balance(), before - 2);
});

test("run: a failed download after the job succeeded is retried next run without paying again", async () => {
  const p = await planDir({ name: "dl", steps: [{ id: "a", type: "image", prompt: "a mug", model: "z-image" }] });
  const before = await balance();
  await fault({ method: "GET", path: "/v1/assets/", status: 500, count: 3 });
  await assert.rejects(cli(["--json", "run", p.plan, "--yes"]), (e) => e.code === 1);
  await clearFaults();
  const m = await p.manifest();
  assert.equal(m.steps.a.status, "failed");
  const res = JSON.parse((await cli(["--json", "run", p.plan, "--yes"])).stdout);
  assert.equal(res.steps.a.status, "succeeded");
  assert.equal(res.steps.a.jobId, m.steps.a.jobId);
  assert.equal(await balance(), before - 2);
});

test("client retries 503, 429 with retry-after and dropped connections on idempotent requests", async () => {
  await fault({ method: "POST", path: "/v1/price", status: 503, count: 2 });
  const est = JSON.parse((await cli(["--json", "gen", "image", "--prompt", "a red cup", "--model", "z-image", "--estimate"])).stdout);
  assert.equal(est.credits, 2);
  await fault({ method: "GET", path: "/v1/me", status: 429, headers: { "retry-after": "1" }, body: { error: { code: "rate_limited", message: "slow down" } }, count: 1 });
  await fault({ method: "GET", path: "/v1/me", destroy: true, count: 1 });
  const t0 = Date.now();
  assert.equal(typeof (await balance()), "number");
  assert.ok(Date.now() - t0 >= 1000, "retry-after was honoured");
  // gen sends an idempotency key, so a 502 on job creation is retried and charged once.
  const before = await balance();
  await fault({ method: "POST", path: "/v1/jobs", status: 502, count: 1 });
  const out = await mkdtemp(join(tmpdir(), "vokox-out-"));
  const res = JSON.parse((await cli(["--json", "gen", "image", "--prompt", "a red cup", "--model", "z-image", "--out", out])).stdout);
  assert.equal(res.status, "succeeded");
  assert.equal(await balance(), before - 2);
  const left = await clearFaults();
  assert.deepEqual(left, []);
  // Uploads are not idempotent: never retried.
  await fault({ method: "POST", path: "/v1/uploads", status: 503, count: 1 });
  const photo = join(out, "p.png"); await writeFile(photo, "x");
  await assert.rejects(cli(["--json", "gen", "image", "--prompt", "x", "--ref", photo, "--estimate"]), (e) => JSON.parse(e.stdout).error.status === 503);
  await clearFaults();
});

test("--json prints exactly one JSON object when a job fails", async () => {
  await assert.rejects(cli(["--json", "gen", "video", "--prompt", "x", "--model", "veo-3.1", "--duration", "4"]), (e) => {
    const body = JSON.parse(e.stdout); // throws on two concatenated objects
    assert.equal(e.code, 1);
    assert.equal(body.error.code, "provider_error");
    assert.equal(body.job.status, "failed");
    return true;
  });
});

test("run: out of credits mid-plan exits 3 with the code, notice and top-up link", async () => {
  const p = await planDir({ name: "broke", steps: [{ id: "a", type: "image", prompt: "a cup", model: "z-image" }, { id: "b", type: "image", prompt: "a mug", model: "z-image", refs: ["@a"] }] });
  await fault({ method: "POST", path: "/v1/jobs", status: 402, body: { error: { code: "insufficient_credits", message: "need 2 credits, balance 0", topupUrl: `${API}/topup`, notice: "Top up to run it" } }, count: 1 });
  await assert.rejects(cli(["--json", "run", p.plan, "--yes"]), (e) => {
    assert.equal(e.code, 3);
    const body = JSON.parse(e.stdout);
    assert.equal(body.error.code, "insufficient_credits");
    assert.ok(body.error.topupUrl.includes("/topup"));
    assert.equal(body.error.notice, "Top up to run it");
    return true;
  });
  await clearFaults();
});

test("run: file: uploads are re-sent when the file changes or the upload is about to expire", async () => {
  const p = await planDir({ name: "up", steps: [{ id: "a", type: "image", prompt: "v1", model: "z-image", refs: ["file:./ref.png"] }] });
  await writeFile(join(p.dir, "ref.png"), "one");
  const r1 = await cli(["run", p.plan, "--yes"]);
  assert.match(r1.stderr, /uploaded/u);
  // Same file, changed step: the cached upload is reused.
  await writeFile(p.plan, JSON.stringify({ out: join(p.dir, "out"), name: "up", steps: [{ id: "a", type: "image", prompt: "v2", model: "z-image", refs: ["file:./ref.png"] }] }));
  assert.doesNotMatch((await cli(["run", p.plan, "--yes"])).stderr, /uploaded/u);
  // Changed file: uploaded again.
  await writeFile(join(p.dir, "ref.png"), "two, longer");
  await writeFile(p.plan, JSON.stringify({ out: join(p.dir, "out"), name: "up", steps: [{ id: "a", type: "image", prompt: "v3", model: "z-image", refs: ["file:./ref.png"] }] }));
  assert.match((await cli(["run", p.plan, "--yes"])).stderr, /uploaded/u);
  // An upload older than 85 days (assets expire after 90) is dropped and re-sent.
  const m = await p.manifest();
  for (const u of Object.values(m.uploads)) u.uploadedAt = new Date(Date.now() - 86 * 86_400_000).toISOString();
  await writeFile(join(p.dir, "out", "manifest.json"), JSON.stringify(m));
  await writeFile(p.plan, JSON.stringify({ out: join(p.dir, "out"), name: "up", steps: [{ id: "a", type: "image", prompt: "v4", model: "z-image", refs: ["file:./ref.png"] }] }));
  assert.match((await cli(["run", p.plan, "--yes"])).stderr, /uploaded/u);
});

test("gen --ref @step: asks for --manifest when several manifests have the step, uses the only one otherwise", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "vokox-cwd-"));
  const write = async (name, steps) => { await mkdir(join(cwd, "vokox-out", name), { recursive: true }); await writeFile(join(cwd, "vokox-out", name, "manifest.json"), JSON.stringify({ steps })); };
  await write("a", { hero: { assets: [{ id: "ast_a" }] } });
  await write("b", { hero: { assets: [{ id: "ast_b" }] }, only: { assets: [{ id: "ast_only" }] } });
  await assert.rejects(cli(["--json", "gen", "image", "--prompt", "x", "--ref", "@hero", "--estimate"], {}, { cwd }), (e) => /--manifest/u.test(JSON.parse(e.stdout).error.message));
  const est = JSON.parse((await cli(["--json", "gen", "image", "--prompt", "x", "--ref", "@only", "--estimate"], {}, { cwd })).stdout);
  assert.ok(est.credits > 0);
});

test("run refuses a corrupt manifest instead of starting over", async () => {
  const p = await planDir({ name: "corrupt", steps: [{ id: "a", type: "image", prompt: "a cup", model: "z-image" }] });
  await mkdir(join(p.dir, "out"), { recursive: true });
  await writeFile(join(p.dir, "out", "manifest.json"), "{\"steps\": {\"a\": ");
  const before = await balance();
  await assert.rejects(cli(["--json", "run", p.plan, "--yes"]), (e) => /corrupt/u.test(JSON.parse(e.stdout).error.message));
  assert.equal(await balance(), before);
});

test("non-numeric --max-credits and --concurrency fail with a clear message", async () => {
  const p = await planDir({ name: "nums", steps: [{ id: "a", type: "image", prompt: "a cup", model: "z-image" }] });
  await assert.rejects(cli(["--json", "run", p.plan, "--estimate", "--max-credits", "abc"]), (e) => /--max-credits/u.test(JSON.parse(e.stdout).error.message));
  await assert.rejects(cli(["--json", "run", p.plan, "--estimate", "--concurrency", "x"]), (e) => /--concurrency/u.test(JSON.parse(e.stdout).error.message));
  await assert.rejects(cli(["--json", "drone", "ast_x", "--max-credits", "lots"]), (e) => /--max-credits/u.test(JSON.parse(e.stdout).error.message));
});

test("--max-credits caps what this run will spend, not what earlier runs spent", async () => {
  const p = await planDir({ name: "cap", steps: [{ id: "a", type: "image", prompt: "a cup", model: "z-image" }] });
  await cli(["--json", "run", p.plan, "--yes"]);
  await writeFile(p.plan, JSON.stringify({ out: join(p.dir, "out"), name: "cap", steps: [{ id: "a", type: "image", prompt: "a cup", model: "z-image" }, { id: "b", type: "image", prompt: "a mug", model: "z-image" }] }));
  const est = JSON.parse((await cli(["--json", "run", p.plan, "--estimate", "--max-credits", "1"])).stdout);
  assert.equal(est.total, 4);
  assert.equal(est.toRun, 2);
  assert.equal(est.overBudget, true);
  const res = JSON.parse((await cli(["--json", "run", p.plan, "--yes", "--max-credits", "3"])).stdout);
  assert.equal(res.steps.b.status, "succeeded");
});

test("not logged in: exit 2 with a JSON error on stdout", async () => {
  const empty = await mkdtemp(join(tmpdir(), "vokox-nohome-"));
  await assert.rejects(cli(["--json", "balance"], { VOKOX_API_KEY: "", VOKOX_HOME: empty }), (e) => e.code === 2 && JSON.parse(e.stdout).error.code === "not_logged_in");
});

test("run: a step skipped for a failed dependency keeps its attempt and job", async () => {
  const steps = (prompt) => [{ id: "a", type: "image", prompt, model: "z-image" }, { id: "b", type: "video", prompt: "x", model: "veo-3.1", duration: 4, refs: ["@a"] }];
  const p = await planDir({ name: "dep", steps: steps("one") });
  await assert.rejects(cli(["--json", "run", p.plan, "--yes"]));
  const first = (await p.manifest()).steps.b;
  assert.equal(first.attempt, 1);
  assert.ok(first.jobId);
  await writeFile(p.plan, JSON.stringify({ out: join(p.dir, "out"), name: "dep", steps: steps("two") }));
  await fault({ method: "POST", path: "/v1/jobs", status: 500, count: 1 });
  await assert.rejects(cli(["--json", "run", p.plan, "--yes"]));
  await clearFaults();
  const second = (await p.manifest()).steps.b;
  assert.match(second.error, /dependency failed/u);
  assert.equal(second.attempt, 1);
  assert.equal(second.jobId, first.jobId);
});

test("insufficient credits exits with code 3 and a topup link", async () => {
  // Three 270-credit jobs fit, the fourth does not, and 10 credits are left for the "near zero" test below.
  await fetch(`${API}/__balance`, { method: "PUT", body: JSON.stringify({ balance: 820 }) });
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
