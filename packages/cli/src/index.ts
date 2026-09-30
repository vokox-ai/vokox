#!/usr/bin/env node
import { Command } from "commander";
import { registerAuth } from "./commands/auth.js";
import { registerCatalog } from "./commands/catalog.js";
import { registerDoctor } from "./commands/doctor.js";
import { registerGen } from "./commands/gen.js";
import { registerJobs } from "./commands/jobs.js";
import { registerLibrary } from "./commands/library.js";
import { registerRun } from "./commands/run.js";
import { PRODUCT, VERSION } from "./config.js";
import { configureOutput } from "./output.js";

const program = new Command();
program
  .name(PRODUCT)
  .description(`${PRODUCT}: images, video, GIFs, music and voice for coding agents. 1 credit = $0.01.`)
  .version(VERSION)
  .option("--json", "machine-readable output on stdout (progress goes to stderr)")
  .option("-q, --quiet", "no progress output")
  .hook("preAction", (cmd) => {
    const opts = cmd.optsWithGlobals() as { json?: boolean; quiet?: boolean };
    configureOutput({ json: Boolean(opts.json), quiet: Boolean(opts.quiet) });
  });

registerAuth(program);
registerCatalog(program);
registerGen(program);
registerJobs(program);
registerLibrary(program);
registerRun(program);
registerDoctor(program);

program.addHelpText("after", `
Typical agent flow:
  ${PRODUCT} auth login                         # once; opens the browser
  ${PRODUCT} models -c video --json             # pick a model or use auto:video.fast
  ${PRODUCT} run plan.json --estimate           # price the whole plan
  ${PRODUCT} run plan.json --yes --json         # execute after the user confirms the budget
  ${PRODUCT} gen image --prompt "..." --ar 9:16 # one-off generation
`);

import { ExitError } from "./context.js";
program.parseAsync(process.argv).catch((error) => {
  if (error instanceof ExitError) { process.exitCode = error.code; return; }
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
