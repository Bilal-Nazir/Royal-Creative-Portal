"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function AcceptActions({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/proposal/accept`, { method: "POST" });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setError(data.error ?? "Couldn't confirm acceptance.");
        setSubmitting(false);
        return;
      }
      router.push(`/projects/${projectId}/proposal`);
      router.refresh();
    } catch {
      setError("Couldn't confirm acceptance.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-3">
        <Button type="button" variant="primary" disabled={submitting} onClick={handleConfirm} className="w-[196px]">
          {submitting ? "Confirming…" : "Confirm acceptance"}
        </Button>
        <Button href={`/projects/${projectId}/proposal`} variant="secondary" className="w-[196px]">
          Back to proposal
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
