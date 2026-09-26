import pc from "picocolors";

export interface OutputOptions { json: boolean; quiet: boolean }

let options: OutputOptions = { json: false, quiet: false };
export function configureOutput(next: Partial<OutputOptions>): void { options = { ...options, ...next }; }
export function isJson(): boolean { return options.json; }

/** Human-readable progress goes to stderr so `--json` stdout stays machine-clean. */
export function log(message: string): void {
  if (options.quiet) return;
  process.stderr.write(message + "\n");
}
export function info(message: string): void { log(pc.dim(message)); }
export function ok(message: string): void { log(pc.green("✔ ") + message); }
export function warn(message: string): void { log(pc.yellow("! ") + message); }
export function fail(message: string): void { process.stderr.write(pc.red("✖ ") + message + "\n"); }

/** Final result: JSON on stdout when --json, otherwise the human text. */
export function result(value: unknown, human?: string): void {
  if (options.json) process.stdout.write(JSON.stringify(value, null, 2) + "\n");
  else if (human !== undefined) process.stdout.write(human + "\n");
}

export function credits(n: number): string {
  return `${n} cr ($${(n / 100).toFixed(2)})`;
}

export function table(rows: string[][], header?: string[]): string {
  const all = header ? [header, ...rows] : rows;
  const widths = all[0].map((_, i) => Math.max(...all.map((r) => (r[i] ?? "").length)));
  const line = (r: string[]) => r.map((c, i) => (c ?? "").padEnd(widths[i])).join("  ").trimEnd();
  const out = all.map(line);
  if (header) out.splice(1, 0, widths.map((w) => "-".repeat(w)).join("  "));
  return out.join("\n");
}
