"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";

export function ReviewActions({ projectId, submissionId }: { projectId: string; submissionId: string }) {
  const router = useRouter();
  const [requestingChanges, setRequestingChanges] = useState(false);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState<"accept" | "request_changes" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function review(action: "accept" | "request_changes") {
    if (action === "request_changes" && !requestingChanges) {
      setRequestingChanges(true);
      return;
    }
    setSubmitting(action);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/content/submissions/${submissionId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note: action === "request_changes" ? note : undefined }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setError(data.error ?? "Couldn't review this submission.");
        return;
      }
      router.refresh();
    } catch {
      setError("Couldn't review this submission.");
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {requestingChanges ? (
        <Textarea
          label="What needs changing?"
          hideLabel
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Tell the client what to update…"
          rows={2}
        />
      ) : null}
      <div className="flex gap-3">
        <Button type="button" variant="primary" disabled={submitting !== null} onClick={() => review("accept")} className="w-[160px]">
          {submitting === "accept" ? "Accepting…" : "Accept"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={submitting !== null}
          onClick={() => review("request_changes")}
          className="w-[180px]"
        >
          {requestingChanges ? (submitting === "request_changes" ? "Sending…" : "Send request") : "Request changes"}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
