"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/Field";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";

export function ReviseForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const text = String(formData.get("text") ?? "").trim();
    const attachmentUrl = String(formData.get("attachmentUrl") ?? "").trim();
    if (!text) {
      setError("Tell us what needs changing.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/brief/revise`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, attachmentUrl: attachmentUrl || undefined }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setError(data.error ?? "Couldn't submit your revisions.");
        setSubmitting(false);
        return;
      }
      router.push(`/projects/${projectId}/brief`);
      router.refresh();
    } catch {
      setError("Couldn't submit your revisions.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      <p className="text-[13px] font-medium text-ink">What needs changing?</p>
      <Textarea
        label="What needs changing?"
        hideLabel
        id="text"
        name="text"
        rows={14}
        placeholder="Please add a wholesale enquiry page and clarify the delivery regions."
        textareaClassName="bg-white text-[#14141a] placeholder:text-[#6b6b76]"
      />
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-[13px] font-medium text-ink">Attachments</p>
        <Field
          label="Attachments"
          hideLabel
          id="attachmentUrl"
          name="attachmentUrl"
          placeholder="Upload a file or paste a reference link"
          containerClassName="flex-1"
        />
        <Button type="submit" variant="primary" disabled={submitting} className="w-[196px]">
          {submitting ? "Submitting…" : "Submit brief revisions"}
        </Button>
        <Button type="button" variant="secondary" disabled className="w-[196px]" title="Draft saving isn't built yet">
          Save feedback draft
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </form>
  );
}
