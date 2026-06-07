import { getSiteSettings } from "@/lib/settings";
import { SettingsEditor } from "@/components/settings-editor";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const s = await getSiteSettings();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-white">Site settings</h1>
      <p className="text-sm text-white/65 max-w-2xl">
        Text and images that appear across the public site. Changes apply
        immediately for new page loads — refresh after saving to see them.
      </p>
      <SettingsEditor initial={s} />
    </div>
  );
}
