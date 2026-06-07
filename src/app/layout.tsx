import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { Inter, JetBrains_Mono } from "next/font/google";
import { getSiteSettings } from "@/lib/settings";

// Single readable sans-serif throughout. The "display" class adds weight and
// tracking but uses the same family so everything stays legible.
const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap"
});
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "FIFA Sweepstakes",
  description: "Fair, transparent, auditable FIFA tournament sweepstakes."
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings();
  return (
    <html lang="en" className={`dark ${sans.variable} ${mono.variable}`}>
      <head>
        {/* Unregister stale service workers from previous localhost apps.
            Without this Safari can intercept our JS bundle and crash with
            'originalFactory.call' in webpack's runtime. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
                navigator.serviceWorker.getRegistrations().then(function (regs) {
                  if (regs.length === 0) return;
                  Promise.all(regs.map(function (r) { return r.unregister(); }))
                    .then(function () {
                      if (window.caches && caches.keys) {
                        return caches.keys().then(function (keys) {
                          return Promise.all(keys.map(function (k) { return caches.delete(k); }));
                        });
                      }
                    })
                    .then(function () { location.reload(); })
                    .catch(function () {});
                }).catch(function () {});
              }
            `
          }}
        />
      </head>
      <body className="min-h-screen font-sans antialiased relative">
        <header className="relative z-30 border-b border-white/5 bg-ink-950/60 backdrop-blur-xl sticky top-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              {settings.logoDataUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={settings.logoDataUrl}
                  alt={settings.siteName}
                  className="w-10 h-10 rounded-lg object-cover"
                />
              ) : (
                <span
                  className="relative inline-flex w-10 h-10 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15 text-base"
                  aria-hidden
                >
                  ⚽
                </span>
              )}
              <div className="flex flex-col leading-none">
                <span className="display text-xl text-white">{settings.siteName}</span>
              </div>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <NavLink href="/">Tournaments</NavLink>
              <NavLink href="/info">How it works</NavLink>
              <NavLink href="/admin">Admin</NavLink>
              <NavLink href="/admin/settings">Settings</NavLink>
            </nav>
          </div>
        </header>
        <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8">{children}</main>
        <footer className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-10 text-xs text-white/40">
          <div className="divider mb-6" />
          <p>{settings.footerText}</p>
        </footer>
      </body>
    </html>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-3 py-1.5 rounded-md text-white/70 hover:text-white hover:bg-white/5 transition"
    >
      {children}
    </Link>
  );
}
