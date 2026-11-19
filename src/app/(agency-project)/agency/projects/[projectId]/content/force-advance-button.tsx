"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

/** The one UI entry point for forceAdvanceContentToDesign — the stage machine has allowed this since Phase 2a, but nothing called it. */
export function ForceAdvanceButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/content/force-advance`, { method: "POST" });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setError(data.error ?? "Couldn't force-advance this project.");
        setSubmitting(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Couldn't force-advance this project.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" variant="secondary" disabled={submitting} onClick={handleClick} className="w-[220px]">
        {submitting ? "Advancing…" : "Force-advance to Design"}
      </Button>
      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
