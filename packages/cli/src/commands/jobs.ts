import type { Command } from "commander";
import { outputName } from "../client.js";
import { authedClient, reportError } from "../context.js";
import { credits, info, isJson, ok, result, table } from "../output.js";

export function registerJobs(program: Command): void {
  const jobs = program.command("jobs").description("inspect, wait for, download or cancel jobs");

  jobs.command("list").option("-n <limit>", "how many", "20").description("recent jobs").action(async (opts: { n: string }) => {
    try {
      const client = await authedClient();
      const list = await client.jobs(Number(opts.n));
      result(list, table(list.map((j) => [j.id, j.type, j.model, j.status, String(j.creditsCharged || j.creditsHeld), j.createdAt]), ["id", "type", "model", "status", "credits", "created"]));
    } catch (error) { reportError(error, isJson()); }
  });

  jobs.command("status <id>").description("one job").action(async (id: string) => {
    try { const client = await authedClient(); const job = await client.job(id); result(job, `${job.id} · ${job.type} · ${job.model} · ${job.status}${job.error ? " · " + job.error.message : ""}`); }
    catch (error) { reportError(error, isJson()); }
  });

  jobs.command("wait <id>").description("block until the job finishes").option("--timeout <minutes>", "give up after", "20").action(async (id: string, opts: { timeout: string }) => {
    try {
      const client = await authedClient();
      const job = await client.waitJob(id, { timeoutMs: Number(opts.timeout) * 60_000, onProgress: (j) => { if (j.progress !== undefined) info(`… ${Math.round(j.progress * 100)}%`); } });
      result(job, `${job.id} · ${job.status} · charged ${credits(job.creditsCharged)}`);
      if (job.status !== "succeeded") process.exitCode = 1;
    } catch (error) { reportError(error, isJson()); }
  });

  jobs.command("download <id>").description("download a finished job's outputs").option("-o, --out <dir>", "output directory", "./vokox-out").option("--name <base>", "file base name").action(async (id: string, opts: { out: string; name?: string }) => {
    try {
      const client = await authedClient();
      const job = await client.job(id);
      if (job.status !== "succeeded" || !job.output) throw new Error(`job ${id} is ${job.status}`);
      const files: string[] = [];
      for (const [i, a] of job.output.assets.entries()) files.push(await client.download(a, outputName(opts.out, opts.name ?? `${job.type}-${job.id.slice(0, 8)}`, a, i, job.output.assets.length)));
      ok(files.join(", "));
      result({ id, files }, files.join("\n"));
    } catch (error) { reportError(error, isJson()); }
  });

  jobs.command("cancel <id>").description("cancel a queued or running job (held credits are released)").action(async (id: string) => {
    try { const client = await authedClient(); const job = await client.cancel(id); result(job, `${job.id} · ${job.status}`); }
    catch (error) { reportError(error, isJson()); }
  });
}
