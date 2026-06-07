// Custom Next.js server that also hosts Socket.IO for live broadcasts and
// spawns the background fixture/score sync worker on startup.
// Boots in both `npm run dev` (via NODE_ENV=development) and production.

import { createServer } from "node:http";
import { parse } from "node:url";
import { spawn } from "node:child_process";
import next from "next";
import { Server as IOServer } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT ?? "3000", 10);
const hostname = process.env.HOSTNAME ?? "0.0.0.0";

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

await app.prepare();

const server = createServer((req, res) => {
  const parsed = parse(req.url ?? "/", true);
  handle(req, res, parsed);
});

const io = new IOServer(server, {
  path: "/socket.io",
  cors: { origin: true }
});

io.on("connection", (socket) => {
  socket.on("subscribe:tournament", (slug) => {
    if (typeof slug === "string" && slug.length < 100) socket.join(`t:${slug}`);
  });
});

// Expose for API routes (runtime-shared via globalThis).
globalThis.fifaIo = io;

server.listen(port, hostname, () => {
  console.log(`> FIFA Sweepstakes ready on http://${hostname}:${port}`);
});

// Background sync worker — pulls fresh fixtures/scores from the football data
// provider on a fixed cadence. Skip in development unless explicitly enabled
// so local hacking doesn't burn through API quota, and skip entirely when
// DISABLE_AUTO_SYNC=1 (useful if you run sync as a separate sidecar).
const autoSyncEnabled =
  process.env.DISABLE_AUTO_SYNC !== "1" &&
  (process.env.NODE_ENV === "production" || process.env.ENABLE_AUTO_SYNC === "1");

if (autoSyncEnabled) {
  const interval = process.env.SYNC_INTERVAL_SECONDS ?? "60";
  console.log(`> auto-sync enabled (interval ${interval}s)`);
  const child = spawn("npx", ["tsx", "scripts/sync-loop.ts", interval], {
    stdio: "inherit",
    env: process.env
  });
  child.on("exit", (code, signal) => {
    console.log(`> sync-loop exited (code=${code} signal=${signal ?? ""})`);
  });
  const shutdown = () => {
    try {
      child.kill("SIGTERM");
    } catch {}
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
