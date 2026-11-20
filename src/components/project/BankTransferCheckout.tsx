"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Field } from "../ui/Field";
import { Textarea } from "../ui/Textarea";
import { Button } from "../ui/Button";
import { formatGBP } from "@/lib/format";

export interface BankTransferCheckoutProps {
  apiPath: string;
  amount: number;
  invoiceNumber: string;
  /** A20's free-text bank details/payment instructions — empty when the agency hasn't set them yet. */
  bankDetails: string;
}

/** Bank transfer checkout — PAYMENT_DRIVER=bank's replacement for the card demo form, shared by deposit (C08) and final-balance checkout. */
export function BankTransferCheckout({ apiPath, amount, invoiceNumber, bankDetails }: BankTransferCheckoutProps) {
  const router = useRouter();
  const [copied, setCopied] = useState<"reference" | "details" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function copy(value: string, which: "reference" | "details") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(which);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // clipboard access denied — not worth surfacing an error for a copy convenience button
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const transferDate = String(formData.get("transferDate") ?? "").trim();
    const note = String(formData.get("note") ?? "").trim();

    try {
      const response = await fetch(apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transferDate: transferDate || undefined, note: note || undefined }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setError(data.error ?? "Couldn't report this transfer.");
        setSubmitting(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Couldn't report this transfer.");
      setSubmitting(false);
    }
  }

  if (!bankDetails.trim()) {
    return (
      <p className="text-sm text-ink-secondary">Payment details coming soon — contact us to arrange payment.</p>
    );
  }

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex flex-col gap-2 rounded-rc-control bg-surface-2 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-ink-secondary">Amount due</p>
          <p className="font-heading text-lg font-semibold text-ink">{formatGBP(amount)}</p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-ink-secondary">Payment reference</p>
          <div className="flex items-center gap-2">
            <p className="font-heading text-base font-semibold text-ink">{invoiceNumber}</p>
            <Button type="button" variant="secondary" onClick={() => copy(invoiceNumber, "reference")} className="h-8 w-auto px-3 text-xs">
              {copied === "reference" ? "Copied!" : "Copy"}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-ink">Bank details</p>
          <Button type="button" variant="secondary" onClick={() => copy(bankDetails, "details")} className="h-8 w-auto px-3 text-xs">
            {copied === "details" ? "Copied!" : "Copy"}
          </Button>
        </div>
        <p className="whitespace-pre-wrap rounded-rc-control border border-line bg-white p-3 text-sm text-ink-secondary">{bankDetails}</p>
        <p className="text-xs text-ink-secondary">Use {invoiceNumber} as the payment reference so we can match your transfer.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 border-t border-line pt-4">
        <p className="text-sm font-medium text-ink">Already sent the transfer?</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Transfer date (optional)" id="transferDate" name="transferDate" type="date" />
        </div>
        <Textarea label="Note (optional)" id="note" name="note" placeholder="e.g. sent from a business account, reference included" rows={2} />
        <Button type="submit" variant="primary" disabled={submitting} className="w-full sm:w-[280px]">
          {submitting ? "Reporting…" : "I've made the transfer"}
        </Button>
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}
      </form>
    </div>
  );
}
