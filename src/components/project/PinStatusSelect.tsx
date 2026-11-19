"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUSES = ["open", "in_progress", "resolved"] as const;

export function PinStatusSelect({ apiPath, initialStatus }: { apiPath: string; initialStatus: string }) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [submitting, setSubmitting] = useState(false);

  async function handleChange(next: string) {
    setStatus(next);
    setSubmitting(true);
    try {
      await fetch(apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <select
      value={status}
      disabled={submitting}
      onChange={(e) => handleChange(e.target.value)}
      className="h-[30px] rounded-rc-pill bg-surface-2 px-4 text-[13px] font-medium text-ink"
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {s.replace("_", " ")}
        </option>
      ))}
    </select>
  );
}
