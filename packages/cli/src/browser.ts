import { spawn } from "node:child_process";

/** Best-effort browser open; the URL is always printed too, so a missing opener is harmless. */
export function openInBrowser(url: string): void {
  const platform = process.platform;
  let command: string;
  let args: string[];
  if (platform === "darwin") { command = "open"; args = [url]; }
  else if (platform === "win32") { command = "cmd.exe"; args = ["/c", "start", "", url]; }
  else { command = "xdg-open"; args = [url]; }
  try {
    const child = spawn(command, args, { stdio: "ignore", detached: true });
    child.once("error", () => undefined);
    child.unref();
  } catch {
    // ignore
  }
}
