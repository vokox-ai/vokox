import type { Command } from "commander";
import { openInBrowser } from "../browser.js";
import { ApiClient } from "../client.js";
import { apiUrl } from "../config.js";
import { clearCredentials, loadCredentials, saveCredentials } from "../credentials.js";
import { anonymousClient, authedClient, reportError } from "../context.js";
import { info, isJson, log, ok, result } from "../output.js";

export function registerAuth(program: Command): void {
  const auth = program.command("auth").description("log in, check or remove credentials");

  auth.command("login")
    .description("log in through the browser (device flow) or store an API key")
    .option("--api-key <key>", "store an API key instead of using the browser")
    .option("--no-open", "print the URL only, do not open a browser")
    .action(async (opts: { apiKey?: string; open: boolean }) => {
      try {
        if (opts.apiKey) {
          const client = new ApiClient({ apiUrl: apiUrl(), token: opts.apiKey });
          const me = await client.me();
          await saveCredentials({ apiUrl: apiUrl(), token: opts.apiKey, kind: "apikey", email: me.email });
          ok(`Logged in as ${me.email} (API key)`);
          result({ email: me.email, balance: me.balance, kind: "apikey" });
          return;
        }
        const anon = await anonymousClient();
        const code = await anon.deviceCode();
        log(`Open this link and confirm the code ${code.user_code}:`);
        log(`  ${code.verification_uri_complete}`);
        if (opts.open) openInBrowser(code.verification_uri_complete);
        const deadline = Date.now() + code.expires_in * 1000;
        let interval = Math.max(2, code.interval) * 1000;
        for (;;) {
          if (Date.now() > deadline) throw new Error("Login timed out. Run `vokox auth login` again.");
          await new Promise((r) => setTimeout(r, interval));
          const token = await anon.deviceToken(code.device_code);
          if (token.access_token) {
            const client = new ApiClient({ apiUrl: apiUrl(), token: token.access_token });
            const me = await client.me();
            await saveCredentials({
              apiUrl: apiUrl(), token: token.access_token, kind: "device", email: me.email,
              expiresAt: token.expires_in ? Date.now() + token.expires_in * 1000 : undefined,
            });
            ok(`Logged in as ${me.email}. Balance: ${me.balance} credits.`);
            result({ email: me.email, balance: me.balance, kind: "device" });
            return;
          }
          if (token.error === "slow_down") interval += 2000;
          else if (token.error === "expired_token" || token.error === "access_denied") throw new Error(`Login ${token.error.replace("_", " ")}.`);
          info("waiting for confirmation…");
        }
      } catch (error) { reportError(error, isJson()); }
    });

  auth.command("status").description("show who is logged in and the balance").action(async () => {
    try {
      const creds = await loadCredentials();
      if (!creds) { result({ loggedIn: false }, "Not logged in."); return; }
      const client = await authedClient();
      const me = await client.me();
      result({ loggedIn: true, email: me.email, balance: me.balance, plan: me.plan, apiUrl: creds.apiUrl, kind: creds.kind },
        `${me.email} · ${me.balance} credits · ${creds.apiUrl} (${creds.kind})`);
    } catch (error) { reportError(error, isJson()); }
  });

  auth.command("logout").description("remove stored credentials").action(async () => {
    await clearCredentials();
    ok("Credentials removed.");
    result({ loggedIn: false });
  });
}
