/** @type {import('next').NextConfig} */
const nextConfig = {
  // Custom server (server.mjs) hosts Socket.IO alongside Next, so we use the
  // standard build layout rather than `output: "standalone"`.
  reactStrictMode: false,
  async headers() {
    // Stop Safari (and CDNs) from caching dev bundles aggressively — the cached
    // bundles can crash webpack HMR when modules change between sessions.
    if (process.env.NODE_ENV !== "production") {
      return [{ source: "/(.*)", headers: [{ key: "Cache-Control", value: "no-store" }] }];
    }
    return [];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "crests.football-data.org" },
      { protocol: "https", hostname: "flagcdn.com" }
    ]
  }
};

module.exports = nextConfig;
