"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function FlagScopeButton({ projectId, roundId }: { projectId: string; roundId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/design/revision-rounds/${roundId}/flag-scope`, { method: "POST" });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setError(data.error ?? "Couldn't flag this round.");
        setSubmitting(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Couldn't flag this round.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" variant="primary" disabled={submitting} onClick={handleClick} className="w-[220px]">
        {submitting ? "Flagging…" : "Flag for scope decision"}
      </Button>
      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
