"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

const LINKS = [
  { href: "/", label: "Tournaments" },
  { href: "/info", label: "How it works" },
  { href: "/admin", label: "Admin" },
  { href: "/admin/settings", label: "Settings" }
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Auto-close when navigating between routes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll while the sheet is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        className="sm:hidden inline-flex w-10 h-10 items-center justify-center rounded-md text-white/80 hover:bg-white/5"
      >
        <span className="sr-only">Menu</span>
        {open ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )}
      </button>

      {open && (
        <div
          className="sm:hidden fixed inset-0 z-40 bg-ink-950/95 backdrop-blur-md pt-16"
          onClick={() => setOpen(false)}
        >
          <nav className="px-4 py-4 flex flex-col gap-1">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`px-4 py-3 rounded-lg text-base font-medium ring-1 transition ${
                  pathname === l.href
                    ? "bg-white/10 text-white ring-white/15"
                    : "text-white/80 hover:bg-white/5 ring-white/5"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}
