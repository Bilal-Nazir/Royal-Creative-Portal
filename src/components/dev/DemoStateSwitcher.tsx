"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { STAGE_ORDER, STAGE_LABELS } from "@/server/domain/stage";

const ROYAL_TRENDSY_PROJECT_ID = "proj-royal-trendsy";

const BRIEF_STATUSES = ["draft", "sent", "changes_requested", "approved", "skipped"] as const;
const PROPOSAL_STATUSES = ["draft", "sent", "changes_requested", "accepted"] as const;
const INVOICE_STATUSES = ["scheduled", "unpaid", "promised", "unverified", "partially_paid", "paid", "overdue"] as const;
const CONTENT_SCENARIOS = ["baseline", "images_submitted", "images_changes_requested"] as const;
const DESIGN_SCENARIOS = ["none", "v1_shared", "v1_feedback_draft", "round1_submitted", "v2_ready", "approved"] as const;
const DEVELOPMENT_SCENARIOS = ["none", "v1_shared", "v1_feedback_draft", "round1_submitted", "v2_ready", "approved"] as const;
const LAUNCH_SCENARIOS = ["not_started", "checklist_in_progress", "checklist_complete"] as const;
const FINAL_INVOICE_STATUSES = ["scheduled", "unpaid", "promised", "unverified", "partially_paid", "paid", "overdue"] as const;
const HANDOVER_SCENARIOS = ["none", "resources_added"] as const;
const SCOPE_CHANGE_SCENARIOS = ["none", "pending", "accepted", "declined"] as const;

/** Dev-only — renders nothing outside development. Targets Royal Trendsy specifically, per spec. */
export function DemoStateSwitcher() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (process.env.NODE_ENV !== "development") return null;

  async function apply(patch: Record<string, string>) {
    setBusy(true);
    try {
      await fetch("/api/dev/demo-state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: ROYAL_TRENDSY_PROJECT_ID, ...patch }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col items-end gap-2 text-xs">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-rc-control border border-brand-amber bg-surface px-3 py-2 font-medium text-brand-amber"
      >
        Demo state {open ? "▾" : "▸"}
      </button>

      {open ? (
        <div className="flex w-72 flex-col gap-3 rounded-rc border border-line bg-surface p-4 text-ink shadow-xl">
          <p className="font-medium text-ink-secondary">Royal Trendsy website — dev only</p>

          <label className="flex flex-col gap-1">
            Stage
            <select
              disabled={busy}
              defaultValue=""
              onChange={(e) => e.target.value && apply({ stage: e.target.value })}
              className="rounded-rc-control bg-surface-2 p-2 text-ink"
            >
              <option value="" disabled>
                Set stage…
              </option>
              {STAGE_ORDER.map((stage) => (
                <option key={stage} value={stage}>
                  {STAGE_LABELS[stage]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            Brief status
            <select
              disabled={busy}
              defaultValue=""
              onChange={(e) => e.target.value && apply({ briefStatus: e.target.value })}
              className="rounded-rc-control bg-surface-2 p-2 text-ink"
            >
              <option value="" disabled>
                Set brief status…
              </option>
              {BRIEF_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            Proposal status
            <select
              disabled={busy}
              defaultValue=""
              onChange={(e) => e.target.value && apply({ proposalStatus: e.target.value })}
              className="rounded-rc-control bg-surface-2 p-2 text-ink"
            >
              <option value="" disabled>
                Set proposal status…
              </option>
              {PROPOSAL_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            Deposit invoice status
            <select
              disabled={busy}
              defaultValue=""
              onChange={(e) => e.target.value && apply({ invoiceStatus: e.target.value })}
              className="rounded-rc-control bg-surface-2 p-2 text-ink"
            >
              <option value="" disabled>
                Set invoice status…
              </option>
              {INVOICE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            Content scenario (images item)
            <select
              disabled={busy}
              defaultValue=""
              onChange={(e) => e.target.value && apply({ contentScenario: e.target.value })}
              className="rounded-rc-control bg-surface-2 p-2 text-ink"
            >
              <option value="" disabled>
                Set content scenario…
              </option>
              {CONTENT_SCENARIOS.map((scenario) => (
                <option key={scenario} value={scenario}>
                  {scenario}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            Design scenario
            <select
              disabled={busy}
              defaultValue=""
              onChange={(e) => e.target.value && apply({ designScenario: e.target.value })}
              className="rounded-rc-control bg-surface-2 p-2 text-ink"
            >
              <option value="" disabled>
                Set design scenario…
              </option>
              {DESIGN_SCENARIOS.map((scenario) => (
                <option key={scenario} value={scenario}>
                  {scenario}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            Development scenario
            <select
              disabled={busy}
              defaultValue=""
              onChange={(e) => e.target.value && apply({ developmentScenario: e.target.value })}
              className="rounded-rc-control bg-surface-2 p-2 text-ink"
            >
              <option value="" disabled>
                Set development scenario…
              </option>
              {DEVELOPMENT_SCENARIOS.map((scenario) => (
                <option key={scenario} value={scenario}>
                  {scenario}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            Launch scenario
            <select
              disabled={busy}
              defaultValue=""
              onChange={(e) => e.target.value && apply({ launchScenario: e.target.value })}
              className="rounded-rc-control bg-surface-2 p-2 text-ink"
            >
              <option value="" disabled>
                Set launch scenario…
              </option>
              {LAUNCH_SCENARIOS.map((scenario) => (
                <option key={scenario} value={scenario}>
                  {scenario}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            Final invoice status
            <select
              disabled={busy}
              defaultValue=""
              onChange={(e) => e.target.value && apply({ finalInvoiceStatus: e.target.value })}
              className="rounded-rc-control bg-surface-2 p-2 text-ink"
            >
              <option value="" disabled>
                Set final invoice status…
              </option>
              {FINAL_INVOICE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            Handover scenario
            <select
              disabled={busy}
              defaultValue=""
              onChange={(e) => e.target.value && apply({ handoverScenario: e.target.value })}
              className="rounded-rc-control bg-surface-2 p-2 text-ink"
            >
              <option value="" disabled>
                Set handover scenario…
              </option>
              {HANDOVER_SCENARIOS.map((scenario) => (
                <option key={scenario} value={scenario}>
                  {scenario}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            Scope change scenario
            <select
              disabled={busy}
              defaultValue=""
              onChange={(e) => e.target.value && apply({ scopeChangeScenario: e.target.value })}
              className="rounded-rc-control bg-surface-2 p-2 text-ink"
            >
              <option value="" disabled>
                Set scope change scenario…
              </option>
              {SCOPE_CHANGE_SCENARIOS.map((scenario) => (
                <option key={scenario} value={scenario}>
                  {scenario}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}
    </div>
  );
}
