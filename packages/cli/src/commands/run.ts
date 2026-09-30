import type { Command } from "commander";
import { resolve } from "node:path";
import { authedClient, reportError } from "../context.js";
import { credits, info, isJson, log, ok, result, table, warn } from "../output.js";
import { estimatePlan, loadPlan, runPlan } from "../plan.js";
import type { RunEvent } from "../plan.js";

export function registerRun(program: Command): void {
  program.command("run <plan.json>")
    .description("execute a multi-step plan (images → clips → voice → music → compose) with a credit budget")
    .option("--estimate", "price the plan and exit")
    .option("-y, --yes", "confirm the estimate and run")
    .option("--max-credits <n>", "abort if the estimate exceeds this (overrides plan.budget.maxCredits)")
    .option("-o, --out <dir>", "output directory (default: plan.out or ./vokox-out/<name>)")
    .option("--concurrency <n>", "parallel jobs", "3")
    .option("--force", "ignore an existing manifest and redo every step")
    .action(async (path: string, opts: { estimate?: boolean; yes?: boolean; maxCredits?: string; out?: string; concurrency: string; force?: boolean }) => {
      try {
        const client = await authedClient();
        const { plan, baseDir, path: planPath } = await loadPlan(path);
        const estimate = await estimatePlan(client, plan);
        const rows = estimate.steps.map((s) => [s.id, s.model, String(s.credits)]);
        const cap = opts.maxCredits ? Number(opts.maxCredits) : plan.budget?.maxCredits;
        const summary = `${table(rows, ["step", "model", "credits"])}\n\ntotal: ${credits(estimate.total)}${cap !== undefined ? ` · budget: ${cap}` : ""}`;
        if (opts.estimate || !opts.yes) {
          result({ total: estimate.total, budget: cap, steps: estimate.steps }, summary);
          if (!opts.estimate) warn("Dry run. Confirm the budget with the user, then re-run with --yes.");
          return;
        }
        log(summary);
        const outDir = resolve(opts.out ?? plan.out ?? `./vokox-out/${plan.name ?? "plan"}`);
        const manifest = await runPlan({
          client, plan, baseDir, planPath, outDir, maxCredits: cap, concurrency: Number(opts.concurrency), force: opts.force,
          onEvent: (e: RunEvent) => {
            switch (e.kind) {
              case "upload": info(`uploaded ${e.path} → ${e.asset.id}`); break;
              case "submit": info(`▶ ${e.stepId} · ${e.job.model} · job ${e.job.id}`); break;
              case "skip": info(`↷ ${e.stepId} already done (manifest)`); break;
              case "done": ok(`${e.stepId} · ${credits(e.job.creditsCharged)} · ${e.files.join(", ")}`); break;
              case "error": warn(`${e.stepId} failed: ${e.error.message}`); break;
              default: break;
            }
          },
        });
        const failed = Object.values(manifest.steps).filter((s) => s.status === "failed");
        const human = `${failed.length === 0 ? "all steps done" : `${failed.length} step(s) failed`} · charged ${credits(manifest.totalCredits)} · ${outDir}/manifest.json`;
        result({ outDir, totalCredits: manifest.totalCredits, steps: manifest.steps }, human);
        if (failed.length > 0) process.exitCode = 1;
      } catch (error) { reportError(error, isJson()); }
    });
}
