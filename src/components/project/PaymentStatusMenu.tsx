"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { InvoiceStatus } from "@/server/domain/invoice";

const STATUS_OPTIONS: Array<{ value: InvoiceStatus; label: string }> = [
  { value: "unpaid", label: "Unpaid" },
  { value: "partially_paid", label: "Partially paid" },
  { value: "paid", label: "Paid" },
];

/** A07's "⋯" quick-action popover (Figma node 161:587) — a direct status override, no confirmation page. */
export function PaymentStatusMenu({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSelect(status: InvoiceStatus) {
    setSubmitting(true);
    try {
      await fetch(`/api/invoices/${invoiceId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      router.refresh();
    } finally {
      setSubmitting(false);
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Change payment status"
        className="flex size-9 items-center justify-center rounded-lg bg-surface-2 text-lg text-ink hover:bg-line"
      >
        ⋯
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-10 mt-1 flex w-[160px] flex-col gap-0.5 rounded-lg bg-[#1c1c22] p-2">
          <p className="px-2 py-1 text-xs text-ink-secondary">Payment status</p>
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={submitting}
              onClick={() => handleSelect(option.value)}
              className="h-[34px] rounded-lg pl-2 text-left text-xs text-ink hover:bg-surface-2 disabled:opacity-40"
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
