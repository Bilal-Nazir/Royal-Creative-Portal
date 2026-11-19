"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

/**
 * R09: "Accept" is primary. "Discuss request" opens the project conversation
 * prefilled with a reference to this scope change (deviation — Figma's
 * "Discuss request" button has no defined behavior; interpreted as opening
 * the conversation rather than declining, see DESIGN_NOTES). "Decline" is a
 * small text-link below, not one of the two main buttons.
 */
export function DecideButtons({ projectId, scopeChangeId, title }: { projectId: string; scopeChangeId: string; title: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(action: "accept" | "decline") {
    setSubmitting(action);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/scope-changes/${scopeChangeId}/${action}`, { method: "POST" });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setError(data.error ?? "Couldn't record your decision.");
        return;
      }
      router.refresh();
    } catch {
      setError("Couldn't record your decision.");
    } finally {
      setSubmitting(null);
    }
  }

  function discuss() {
    const draft = `Re: scope change "${title}" — `;
    router.push(`/projects/${projectId}/conversation?draft=${encodeURIComponent(draft)}`);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-3">
        <Button type="button" variant="primary" disabled={submitting !== null} onClick={() => decide("accept")} className="w-[196px]">
          {submitting === "accept" ? "Approving…" : "Accept"}
        </Button>
        <Button type="button" variant="secondary" disabled={submitting !== null} onClick={discuss} className="w-[196px]">
          Discuss request
        </Button>
      </div>
      <button
        type="button"
        disabled={submitting !== null}
        onClick={() => decide("decline")}
        className="w-fit text-xs text-ink-secondary underline disabled:opacity-60"
      >
        {submitting === "decline" ? "Declining…" : "Decline"}
      </button>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
