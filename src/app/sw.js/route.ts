// Serve a self-unregistering service worker at /sw.js. If anything previously
// installed a SW on this origin (very common on `localhost:3000` after running
// other Next.js / PWA projects), it'll fetch this file on update and then
// remove itself, which clears the stale interception that breaks HMR in Safari.

export const dynamic = "force-static";

const body = `
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const regs = await self.registration ? [self.registration] : [];
    for (const reg of regs) { try { await reg.unregister(); } catch {} }
    const clientsList = await self.clients.matchAll({ type: "window" });
    for (const c of clientsList) c.navigate(c.url);
  })());
});
`;

export function GET() {
  return new Response(body, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
