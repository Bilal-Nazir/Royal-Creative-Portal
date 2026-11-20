"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

/** A16's "Skip brief" — owner/admin only, enforced again in skipBrief() (see DESIGN_NOTES). Only rendered while the brief is still a draft. */
export function SkipBriefButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (!window.confirm("Skip the brief and move straight to the proposal? This can't be undone.")) return;

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/brief/skip`, { method: "POST" });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setError(data.error ?? "Couldn't skip the brief.");
        setSubmitting(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Couldn't skip the brief.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" variant="secondary" disabled={submitting} onClick={handleClick} className="w-[196px]">
        {submitting ? "Skipping…" : "Skip brief"}
      </Button>
      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
