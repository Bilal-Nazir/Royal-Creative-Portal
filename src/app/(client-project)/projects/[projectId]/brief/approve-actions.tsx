"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function BriefApproveActions({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApprove() {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/brief/approve`, { method: "POST" });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setError(data.error ?? "Couldn't approve the brief.");
        setSubmitting(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Couldn't approve the brief.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 border-t border-line pt-3">
      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="primary" disabled={submitting} onClick={handleApprove} className="w-[156px]">
          {submitting ? "Approving…" : "Approve brief"}
        </Button>
        <Button href={`/projects/${projectId}/brief/revise`} variant="secondary" className="w-[174px]">
          Request revisions
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
