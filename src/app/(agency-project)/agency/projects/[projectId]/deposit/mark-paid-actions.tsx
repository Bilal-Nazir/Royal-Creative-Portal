"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function MarkPaidActions({ projectId, isUnverified }: { projectId: string; isUnverified: boolean }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleMarkPaid() {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/deposit/mark-paid`, { method: "POST" });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setError(data.error ?? "Couldn't update this payment.");
        setSubmitting(false);
        return;
      }
      router.push(`/agency/projects/${projectId}`);
      router.refresh();
    } catch {
      setError("Couldn't update this payment.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-3">
        <Button type="button" variant="primary" disabled={submitting} onClick={handleMarkPaid} className="w-[196px]">
          {submitting ? "Saving…" : isUnverified ? "Verify payment" : "Mark as paid"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push(`/agency/projects/${projectId}`)}
          className="w-[196px]"
        >
          Cancel
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
