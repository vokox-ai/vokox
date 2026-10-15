import type { Command } from "commander";
import { ApiError } from "../client.js";
import { authedClient, numberFlag, reportError } from "../context.js";
import { credits, info, isJson, result, warn } from "../output.js";
import { submitAndCollect } from "./gen.js";

const PRESETS = ["in", "circle", "reveal", "top", "above", "orbit", "pull", "spin", "spiral", "past"];
const SPEEDS = ["calm", "normal", "fast", "rush"];

interface DroneFlags {
  preset?: string; stop?: string[]; words?: string; subject?: string; length?: string; speed?: string; tier?: string;
  height?: string; ar?: string; estimate?: boolean; yes?: boolean; maxCredits?: string; out: string; name?: string; wait: boolean;
}

export function registerDrone(program: Command): void {
  program.command("drone <photos...>")
    .description("drone-style flight over a photo: a preset (fly in, orbit, rise, pull back, spin, spiral, fly past, over the top, from the sky, from space) or the flight in your own words, read into camera moves; 2–4 photos fly from one to the next")
    .option("-p, --preset <id>", `one-click flight: ${PRESETS.join(" | ")} (default: in)`)
    .option("--stop <text>", "a stop of the route in your words, any language; repeatable, replaces the preset", (v: string, prev: string[] = []) => [...prev, v])
    .option("--words <text>", "the flight in your words, any language: \"отлетает назад, потом облетает его\" (read into moves: push in, pull back, orbit, spiral, rise, descend, over the top, spin, fly past, fly along, from the sky, from space)")
    .option("--subject <text>", "what the camera ends on, e.g. \"the lighthouse\"")
    .option("-l, --length <s>", "seconds of footage (the shortest the flight allows if omitted)")
    .option("--speed <id>", `${SPEEDS.join(" | ")} (fast plays 1.5×, rush 2×)`)
    .option("--tier <id>", "standard (Seedance 720p) | premium (Kling 3 Pro 1080p)")
    .option("--height <id>", "low | same | high | top")
    .option("--ar <ratio>", "16:9 | 9:16 | 1:1 (default: from the first photo)")
    .option("--estimate", "price the flight and exit")
    .option("-y, --yes", "confirm the price and fly")
    .option("--max-credits <n>", "abort if the price is above this")
    .option("-o, --out <dir>", "output directory", "./vokox-out")
    .option("--name <base>", "output file base name")
    .option("--no-wait", "submit and return the job id")
    .action(async (photos: string[], flags: DroneFlags) => {
      try {
        if (flags.preset && !PRESETS.includes(flags.preset)) throw new Error(`--preset: one of ${PRESETS.join(", ")}`);
        if (flags.speed && !SPEEDS.includes(flags.speed)) throw new Error(`--speed: one of ${SPEEDS.join(", ")}`);
        if (photos.length > 4) throw new Error("up to 4 photos");
        // Same rule as `run`: the cap is this flight's price, and a typo must not switch it off.
        const cap = numberFlag("--max-credits", flags.maxCredits);
        const length = numberFlag("--length", flags.length);
        const client = await authedClient();
        // Local files are uploaded; asset ids from earlier results pass as they are.
        const ids: string[] = [];
        for (const p of photos) {
          if (/^ast_[a-z0-9]+$/u.test(p)) { ids.push(p); continue; }
          const a = await client.upload(p);
          info(`uploaded ${p} → ${a.id}`);
          ids.push(a.id);
        }
        const words = [flags.words, ...(flags.stop ?? [])].filter(Boolean).join("\n") || undefined;
        const d = await client.dronePlan({ photos: ids, preset: flags.preset, words, subject: flags.subject, length, speed: flags.speed, tier: flags.tier, height: flags.height, aspectRatio: flags.ar });
        const s = d.summary;
        const human = `${s.understood ? `understood as: ${s.understood}\n` : ""}drone shot · ${s.mode} · ${s.seconds} s video (${s.clips.join(" + ")} s of footage${s.speed !== "normal" ? `, ${s.speed}` : ""}) · ${s.video} ${s.resolution} · ${s.aspectRatio}${s.trialSetup ? " · trial setup" : ""}\nprice: ${credits(d.credits)}${d.balance !== undefined ? ` · balance: ${credits(d.balance)}` : ""}${d.notice ? `\n${d.notice}` : ""}`;
        const overBudget = cap !== undefined && d.credits > cap;
        if (flags.estimate || !flags.yes) {
          result({ credits: d.credits, ...s, balance: d.balance, enough: d.enough, topupUrl: d.topupUrl, notice: d.notice, photos: ids, ...(cap !== undefined ? { budget: cap, overBudget } : {}) }, human + (overBudget ? `\nabove --max-credits ${cap}` : ""));
          if (!flags.estimate) warn("Dry run. Confirm the price with the user, then re-run with --yes.");
          return;
        }
        if (overBudget) throw new ApiError(0, "over_budget", `This flight costs ${d.credits} credits, above --max-credits ${cap}.`);
        info(human);
        await submitAndCollect("plan", { plan: d.plan, refs: d.refs } as never, { out: flags.out, name: flags.name ?? "drone", wait: flags.wait, yes: true });
      } catch (error) { reportError(error, isJson()); }
    });
}
