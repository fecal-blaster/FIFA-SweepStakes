import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import Link from "next/link";
import { flagEmoji } from "@/lib/flags";

export function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(...inputs));
}

export function Card({
  className,
  children,
  glow = false
}: {
  className?: string;
  children: React.ReactNode;
  glow?: boolean;
}) {
  return (
    <div
      className={cn(
        glow ? "glass-strong" : "glass",
        "relative rounded-2xl p-5 shadow-lift overflow-hidden",
        className
      )}
    >
      {children}
    </div>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  right
}: {
  eyebrow?: string;
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-3 mb-3">
      <div>
        {eyebrow && (
          <p className="text-[10px] uppercase tracking-[0.3em] text-lime-500/80">{eyebrow}</p>
        )}
        <h2 className="display text-2xl text-white mt-0.5">{title}</h2>
      </div>
      {right}
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
  accent = "default"
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  accent?: "default" | "lime" | "gold" | "cyan";
}) {
  const accents: Record<string, string> = {
    default: "text-white",
    lime: "text-lime-400",
    gold: "text-gold-400",
    cyan: "text-cyan-400"
  };
  return (
    <Card className="flex flex-col gap-1">
      <div className="text-[10px] uppercase tracking-[0.25em] text-white/45">{label}</div>
      <div className={cn("scoreboard-num text-4xl leading-none", accents[accent])}>{value}</div>
      {hint && <div className="text-xs text-white/50">{hint}</div>}
    </Card>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    DRAFT: "bg-white/5 text-white/60 ring-1 ring-white/10",
    REGISTRATION_OPEN: "bg-lime-500/10 text-lime-400 ring-1 ring-lime-500/30",
    DRAW_READY: "bg-gold-500/10 text-gold-400 ring-1 ring-gold-500/30",
    LIVE: "bg-live-500/15 text-live-400 ring-1 ring-live-500/40",
    COMPLETED: "bg-white/5 text-white/60 ring-1 ring-white/10",
    CANCELLED: "bg-live-500/10 text-live-400/60 ring-1 ring-live-500/20"
  };
  const isLive = status === "LIVE";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium uppercase tracking-[0.2em]",
        map[status] ?? "bg-white/5 text-white/60"
      )}
    >
      {isLive && <span className="live-dot" />}
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function Button({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: {
  href?: string;
  variant?: "primary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  className?: string;
  children: React.ReactNode;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "size">) {
  const styles = {
    primary:
      "bg-gradient-to-br from-lime-400 to-lime-600 text-ink-950 hover:from-lime-400 hover:to-lime-500 shadow-glow font-semibold",
    ghost: "bg-white/5 text-white ring-1 ring-white/10 hover:bg-white/10 hover:ring-white/20",
    outline: "bg-transparent text-lime-400 ring-1 ring-lime-500/40 hover:bg-lime-500/10",
    danger: "bg-live-500/90 text-white hover:bg-live-500 ring-1 ring-live-500/40"
  } as const;
  const sizes = {
    sm: "px-2.5 py-1.5 text-xs rounded-md",
    md: "px-3.5 py-2 text-sm rounded-lg",
    lg: "px-5 py-3 text-base rounded-xl"
  } as const;
  const cls = cn(
    "inline-flex items-center justify-center gap-2 transition focus:outline-none focus:ring-2 focus:ring-lime-500/40 disabled:opacity-40 disabled:cursor-not-allowed font-medium",
    styles[variant],
    sizes[size],
    className
  );
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button className={cls} {...props}>
      {children}
    </button>
  );
}

export function Flag({
  code,
  size = "md"
}: {
  code: string | null | undefined;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const cls = {
    sm: "text-base",
    md: "text-xl",
    lg: "text-2xl",
    xl: "text-3xl"
  }[size];
  return (
    <span
      className={cn(cls, "inline-flex items-center justify-center leading-none")}
      style={{ fontFamily: '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif' }}
      aria-hidden
    >
      {flagEmoji(code)}
    </span>
  );
}
