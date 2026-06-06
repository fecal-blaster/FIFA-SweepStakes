// Custom Next.js server that also hosts Socket.IO for live broadcasts.
// Boots in both `npm run dev` (via NODE_ENV=development) and production.

import { createServer } from "node:http";
import { parse } from "node:url";
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
