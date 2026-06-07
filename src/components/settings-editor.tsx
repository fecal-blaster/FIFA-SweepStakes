"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, SectionHeader } from "@/components/ui";

type Settings = {
  siteName: string;
  homeEyebrow: string;
  homeTitle: string;
  homeDescription: string;
  homePills: string;
  infoEyebrow: string;
  infoTitle: string;
  infoDescription: string;
  footerText: string;
  logoDataUrl: string | null;
  backdropDataUrl: string | null;
};

export function SettingsEditor({ initial }: { initial: Settings }) {
  const router = useRouter();
  const [s, setS] = useState<Settings>(initial);
  const [pending, setPending] = useState(false);
  const [imgPending, setImgPending] = useState<"logo" | "backdrop" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function patch<K extends keyof Settings>(key: K, value: Settings[K]) {
    setS((prev) => ({ ...prev, [key]: value }));
  }

  async function saveText() {
    setPending(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          siteName: s.siteName,
          homeEyebrow: s.homeEyebrow,
          homeTitle: s.homeTitle,
          homeDescription: s.homeDescription,
          homePills: s.homePills,
          infoEyebrow: s.infoEyebrow,
          infoTitle: s.infoTitle,
          infoDescription: s.infoDescription,
          footerText: s.footerText
        })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed (${res.status})`);
      }
      setMsg("Saved. Refresh public pages to see the new text.");
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setPending(false);
    }
  }

  async function uploadImage(kind: "logo" | "backdrop", file: File | null) {
    setImgPending(kind);
    setErr(null);
    setMsg(null);
    try {
      let dataUrl: string | null = null;
      if (file) {
        if (file.size > 600_000) {
          throw new Error(
            "File is too large — keep under ~600KB so the encoded base64 fits the DB column"
          );
        }
        dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error("Failed to read file"));
          reader.readAsDataURL(file);
        });
      }
      const res = await fetch("/api/admin/settings/image", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, dataUrl })
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `Failed (${res.status})`);
      setS((prev) => ({
        ...prev,
        logoDataUrl: body.logoDataUrl,
        backdropDataUrl: body.backdropDataUrl
      }));
      setMsg(dataUrl ? `${kind} uploaded.` : `${kind} removed.`);
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setImgPending(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <SectionHeader eyebrow="Brand assets" title="Logo and backdrop" />
        <div className="grid sm:grid-cols-2 gap-4">
          <ImageSlot
            label="Logo"
            hint="Shown in the header. Square images work best. PNG/SVG/WebP, ~50KB sweet spot."
            currentDataUrl={s.logoDataUrl}
            pending={imgPending === "logo"}
            onPick={(file) => uploadImage("logo", file)}
            onClear={() => uploadImage("logo", null)}
            preview="logo"
          />
          <ImageSlot
            label="Hero backdrop"
            hint="Used behind the homepage hero. Landscape. Keep below 500KB."
            currentDataUrl={s.backdropDataUrl}
            pending={imgPending === "backdrop"}
            onPick={(file) => uploadImage("backdrop", file)}
            onClear={() => uploadImage("backdrop", null)}
            preview="backdrop"
          />
        </div>
      </Card>

      <Card>
        <SectionHeader eyebrow="Text" title="Site copy" />
        <div className="space-y-4">
          <Field label="Site name (shown in header + page titles)">
            <input
              type="text"
              value={s.siteName}
              onChange={(e) => patch("siteName", e.target.value)}
              className={inputCls}
            />
          </Field>

          <p className="text-[10px] uppercase tracking-[0.2em] text-white/45 mt-4">
            Homepage hero
          </p>
          <Field label="Eyebrow (small label above the title)">
            <input
              type="text"
              value={s.homeEyebrow}
              onChange={(e) => patch("homeEyebrow", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Title">
            <input
              type="text"
              value={s.homeTitle}
              onChange={(e) => patch("homeTitle", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Description (under the title)">
            <textarea
              value={s.homeDescription}
              onChange={(e) => patch("homeDescription", e.target.value)}
              rows={3}
              className={inputCls}
            />
          </Field>
          <Field label="Feature pills (one per line or comma-separated, max 8)">
            <textarea
              value={s.homePills}
              onChange={(e) => patch("homePills", e.target.value)}
              rows={4}
              className={inputCls}
            />
          </Field>

          <p className="text-[10px] uppercase tracking-[0.2em] text-white/45 mt-4">
            /info page hero
          </p>
          <Field label="Eyebrow">
            <input
              type="text"
              value={s.infoEyebrow}
              onChange={(e) => patch("infoEyebrow", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Title">
            <input
              type="text"
              value={s.infoTitle}
              onChange={(e) => patch("infoTitle", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Description">
            <textarea
              value={s.infoDescription}
              onChange={(e) => patch("infoDescription", e.target.value)}
              rows={3}
              className={inputCls}
            />
          </Field>

          <p className="text-[10px] uppercase tracking-[0.2em] text-white/45 mt-4">
            Footer
          </p>
          <Field label="Footer text">
            <input
              type="text"
              value={s.footerText}
              onChange={(e) => patch("footerText", e.target.value)}
              className={inputCls}
            />
          </Field>

          {err && <p className="text-sm text-live-400">{err}</p>}
          {msg && <p className="text-sm text-lime-400">{msg}</p>}

          <Button onClick={saveText} disabled={pending}>
            {pending ? "Saving…" : "Save text"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg bg-ink-900/80 ring-1 ring-white/10 px-3 py-2 text-white text-sm focus:outline-none focus:ring-lime-500/40";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-[0.18em] text-white/55">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function ImageSlot({
  label,
  hint,
  currentDataUrl,
  pending,
  onPick,
  onClear,
  preview
}: {
  label: string;
  hint: string;
  currentDataUrl: string | null;
  pending: boolean;
  onPick: (file: File) => void;
  onClear: () => void;
  preview: "logo" | "backdrop";
}) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] uppercase tracking-[0.18em] text-white/55">{label}</p>
      <div
        className={
          "rounded-lg bg-ink-900/80 ring-1 ring-white/10 overflow-hidden " +
          (preview === "logo" ? "h-24 w-24" : "h-32 w-full")
        }
      >
        {currentDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentDataUrl}
            alt={label}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-white/35">
            No image
          </div>
        )}
      </div>
      <p className="text-[11px] text-white/45">{hint}</p>
      <div className="flex gap-2">
        <label className="inline-flex items-center gap-2 rounded-lg bg-white/5 ring-1 ring-white/15 px-3 py-1.5 text-xs text-white cursor-pointer hover:bg-white/10">
          {pending ? "Uploading…" : "Choose file"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
            disabled={pending}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onPick(file);
              e.currentTarget.value = "";
            }}
            className="hidden"
          />
        </label>
        {currentDataUrl && (
          <button
            type="button"
            onClick={onClear}
            disabled={pending}
            className="inline-flex items-center gap-1 rounded-lg bg-white/5 ring-1 ring-white/15 px-3 py-1.5 text-xs text-white/70 hover:text-white hover:bg-white/10"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
