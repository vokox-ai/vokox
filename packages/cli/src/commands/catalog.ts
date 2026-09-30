import type { Command } from "commander";
import { authedClient, reportError } from "../context.js";
import { credits, isJson, result, table } from "../output.js";
import type { JobType, Model } from "../types.js";

export function describeCredits(m: Model): string {
  const c = m.credits;
  const min = c.minSeconds ? ` (min ${c.minSeconds}s)` : "";
  switch (c.unit) {
    case "second": return `${c.amount}/s${min}`;
    case "image": return `${c.amount}/image`;
    case "track": return `${c.amount}/track`;
    case "1k_chars": return `${c.amount}/1k chars`;
    default: return `${c.amount} flat`;
  }
}

export function registerCatalog(program: Command): void {
  program.command("models")
    .description("list models with prices in credits (1 credit = $0.01)")
    .option("-c, --class <class>", "image | video | gif | music | tts | compose")
    .action(async (opts: { class?: JobType }) => {
      try {
        const client = await authedClient();
        const models = await client.models(opts.class);
        const rows = models.map((m) => [m.id, m.class, m.tier ?? "", describeCredits(m), m.caps.durations ? m.caps.durations.join("/") + "s" : "", m.notes ?? ""]);
        result(models, table(rows, ["id", "class", "tier", "credits", "durations", "notes"]));
      } catch (error) { reportError(error, isJson()); }
    });

  program.command("balance").description("show remaining credits").action(async () => {
    try {
      const client = await authedClient();
      const me = await client.me();
      const plan = typeof me.plan === "string" ? { id: me.plan, name: me.plan } : me.plan;
      const parts = me.balances ? [`plan ${me.balances.plan}`, `free ${me.balances.free} (fast/hq models only)`, `paid ${me.balances.paid}`] : [];
      const planLine = plan && plan.id !== "free" ? `${plan.name}${plan.renewsAt ? `, renews ${plan.renewsAt.slice(0, 10)}` : ""}${plan.cancelAtPeriodEnd ? " (ends at period end)" : ""}` : "Free";
      result({ balance: me.balance, balances: me.balances, plan, topupUrl: me.topupUrl }, `${credits(me.balance)}${parts.length ? ` = ${parts.join(" + ")}` : ""}\nplan: ${planLine} · top up: ${me.topupUrl}`);
    } catch (error) { reportError(error, isJson()); }
  });

  program.command("topup").description("print the top-up link").action(async () => {
    try {
      const client = await authedClient();
      const me = await client.me();
      result({ topupUrl: me.topupUrl }, me.topupUrl);
    } catch (error) { reportError(error, isJson()); }
  });
}
