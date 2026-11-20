"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { AgencySettings } from "@/server/domain/settings";

export interface AgencySettingsFormProps {
  initialSettings: AgencySettings;
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (next: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex flex-1 items-center justify-between rounded-rc-control bg-surface-2 p-3.5 text-left"
    >
      <span className="text-[13px] font-medium text-ink">{label}</span>
      <span className={cn("text-xs font-medium", value ? "text-success" : "text-ink-secondary")}>{value ? "On" : "Off"}</span>
    </button>
  );
}

export function AgencySettingsForm({ initialSettings }: AgencySettingsFormProps) {
  const router = useRouter();
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof AgencySettings>(key: K, value: AgencySettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const response = await fetch("/api/agency/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    const data = await response.json();
    setSaving(false);
    if (!response.ok || !data.ok) {
      setError(data.error ?? "Couldn't save your changes.");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="flex flex-col gap-4 p-6">
          <h2 className="font-heading text-xl font-semibold text-ink">Agency details</h2>
          <Field label="Agency name" value={settings.agencyName} onChange={(e) => update("agencyName", e.target.value)} />
          <Field label="Default currency" value={settings.defaultCurrency} onChange={(e) => update("defaultCurrency", e.target.value)} />
          <Textarea
            label="Payment instructions"
            value={settings.paymentInstructions}
            onChange={(e) => update("paymentInstructions", e.target.value)}
            textareaClassName="h-[88px]"
          />
        </Card>

        <Card className="flex flex-col gap-4 p-6">
          <h2 className="font-heading text-xl font-semibold text-ink">Client contact options</h2>
          <Field label="Owner name" value={settings.ownerName} onChange={(e) => update("ownerName", e.target.value)} />
          <Field
            label="Call number"
            placeholder="Add number with country code"
            value={settings.ownerPhone ?? ""}
            onChange={(e) => update("ownerPhone", e.target.value)}
          />
          <Field
            label="WhatsApp number"
            placeholder="Add number with country code"
            value={settings.ownerWhatsapp ?? ""}
            onChange={(e) => update("ownerWhatsapp", e.target.value)}
          />
          <p className="text-xs text-ink-secondary">Shown as compact icons in the client sidebar footer.</p>
        </Card>
      </div>

      <Card className="flex flex-col gap-4 p-6">
        <h2 className="font-heading text-xl font-semibold text-ink">Notifications</h2>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Toggle label="Email alerts" value={settings.notifications.emailAlerts} onChange={(v) => update("notifications", { ...settings.notifications, emailAlerts: v })} />
          <Toggle label="In-app alerts" value={settings.notifications.inAppAlerts} onChange={(v) => update("notifications", { ...settings.notifications, inAppAlerts: v })} />
          <Toggle
            label="Payment-date reminders"
            value={settings.notifications.paymentDateReminders}
            onChange={(v) => update("notifications", { ...settings.notifications, paymentDateReminders: v })}
          />
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <Button variant="primary" className="w-[180px]" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
        {saved ? <p className="text-sm text-success">Saved.</p> : null}
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}
      </div>
    </>
  );
}
