import type { Command } from "commander";
import { openInBrowser } from "../browser.js";
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
      result({ balance: me.balance, balances: me.balances, low: me.low, plan, topupUrl: me.topupUrl, notice: me.notice }, `${credits(me.balance)}${parts.length ? ` = ${parts.join(" + ")}` : ""}\nplan: ${planLine} · top up: ${me.topupUrl}${me.notice ? `\n${me.notice}` : ""}`);
    } catch (error) { reportError(error, isJson()); }
  });

  program.command("topup")
    .description("a link where the user tops up credits (a direct checkout with --pack when card payments are on)")
    .option("--pack <id>", "pack_10 ($10 = 1000 credits) | pack_25 | pack_50 | pack_100")
    .option("--open", "open the link in the browser")
    .action(async (opts: { pack?: string; open?: boolean }) => {
      try {
        const client = await authedClient();
        const link = await client.paymentLink(opts.pack);
        const packs = link.packs.map((p) => `${p.id}: $${p.usd} = ${p.credits} credits`).join(" · ");
        result(link, `${link.url}\n${link.notice}\nbalance: ${credits(link.balance)}\npacks: ${packs}`);
        if (opts.open) openInBrowser(link.url);
      } catch (error) { reportError(error, isJson()); }
    });
}
