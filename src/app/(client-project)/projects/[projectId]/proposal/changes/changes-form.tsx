"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/Field";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";

export function ProposalChangesForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const text = String(formData.get("text") ?? "").trim();
    const attachmentUrl = String(formData.get("attachmentUrl") ?? "").trim();
    if (!text) {
      setError("Tell us what you'd like to change.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/proposal/changes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, attachmentUrl: attachmentUrl || undefined }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setError(data.error ?? "Couldn't submit your requested changes.");
        setSubmitting(false);
        return;
      }
      router.push(`/projects/${projectId}/proposal`);
      router.refresh();
    } catch {
      setError("Couldn't submit your requested changes.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      <p className="text-[13px] font-medium text-ink">Requested changes</p>
      <Textarea
        label="Requested changes"
        hideLabel
        id="text"
        name="text"
        rows={14}
        placeholder="Can we add a wholesale page and split the final payment into two milestones?"
        textareaClassName="bg-white text-[#14141a] placeholder:text-[#6b6b76]"
      />
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-[13px] font-medium text-ink">Attachment (optional)</p>
        <Field
          label="Attachment"
          hideLabel
          id="attachmentUrl"
          name="attachmentUrl"
          placeholder="Add an attachment"
          containerClassName="flex-1"
        />
        <Button type="submit" variant="primary" disabled={submitting} className="w-[196px]">
          {submitting ? "Submitting…" : "Submit requested changes"}
        </Button>
        <Button type="button" variant="secondary" disabled className="w-[196px]" title="Draft saving isn't built yet">
          Save draft
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
