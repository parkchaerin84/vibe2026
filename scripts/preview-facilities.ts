// Local-only preview of the built static export plus the SAME Pages Function handler.
// Does not upload/deploy anything or write secrets to files. Bind localhost only.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { loadEnvConfig } from "@next/env";
import { onRequest } from "../functions/api/facilities/restrooms";

loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
const env = {
  SUBWAY_FACILITY_API_KEY: process.env.SUBWAY_FACILITY_API_KEY,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
};
const root = resolve("out");
const mime: Record<string, string> = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".ico": "image/x-icon", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8" };
const port = 3002;
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);
    if (url.pathname === "/api/facilities/restrooms") {
      const result = await onRequest({ request: new Request(url, { method: req.method }), env });
      res.writeHead(result.status, Object.fromEntries(result.headers));
      res.end(Buffer.from(await result.arrayBuffer())); return;
    }
    if (!["GET", "HEAD"].includes(req.method ?? "")) { res.writeHead(405); res.end(); return; }
    const path = resolve(root, "." + decodeURIComponent(url.pathname));
    if (path !== root && !path.startsWith(root + sep)) { res.writeHead(403); res.end(); return; }
    let file = "";
    for (const candidate of [path, path + ".html", resolve(path, "index.html")]) {
      try { if ((await stat(candidate)).isFile()) { file = candidate; break; } } catch { /* Try static export aliases. */ }
    }
    if (!file) { res.writeHead(404); res.end("Not found"); return; }
    res.writeHead(200, { "Content-Type": mime[extname(file)] ?? "application/octet-stream", "Cache-Control": "no-store" });
    res.end(req.method === "HEAD" ? undefined : await readFile(file));
  } catch { res.writeHead(500); res.end("Local preview request failed"); }
});
server.on("error", () => { console.error("Local preview could not start. Check whether port 3002 is available."); process.exitCode = 1; });
server.listen(port, "127.0.0.1", () => {
  console.log(`Facilities preview: http://127.0.0.1:${port}/facilities`);
  console.log(`Facility server key: ${env.SUBWAY_FACILITY_API_KEY?.trim() ? "configured (hidden)" : "missing"}`);
});
