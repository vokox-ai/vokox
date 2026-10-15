import type { Command } from "commander";
import { authedClient, reportError } from "../context.js";
import { isJson, result, table } from "../output.js";

/** `library [query]` lists guides; `library get <slug>` prints one with its prompt and plan fragment. */
export function registerLibrary(program: Command): void {
  const lib = program.command("library").description("members' library: guides, prompt formulas and plan snippets (paid accounts)");
  lib.command("search", { isDefault: true }).argument("[query...]", "words to search for").option("-c, --category <category>", "hooks | ugc | product | talking-head | stickers | explainers | trailers | captions | voice | music | platforms | models | workflow")
    .action(async (words: string[], opts: { category?: string }) => {
      try {
        const client = await authedClient();
        const r = await client.library(words.join(" "), opts.category);
        const rows = r.items.map((i) => [i.slug, i.category, i.title]);
        result(r, table(rows, ["slug", "category", "title"]) + (r.access ? "" : `\nGuides open with any paid plan or pack: ${r.upgradeUrl}`));
      } catch (error) { reportError(error, isJson()); }
    });
  lib.command("get").argument("<slug>").description("print one guide (markdown), its prompt and plan fragment")
    .action(async (slug: string) => {
      try {
        const client = await authedClient();
        const it = await client.libraryGet(slug);
        const human = [`# ${it.title}`, "", it.body, it.prompt ? `\n## Prompt\n\n${it.prompt}` : "", it.plan ? `\n## plan.json fragment\n\n${JSON.stringify(it.plan, null, 2)}` : ""].join("\n");
        result(it, human);
      } catch (error) { reportError(error, isJson()); }
    });
}
