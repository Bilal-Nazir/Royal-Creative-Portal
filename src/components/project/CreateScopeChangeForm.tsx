"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field } from "../ui/Field";
import { Textarea } from "../ui/Textarea";
import { Button } from "../ui/Button";

export interface CreateScopeChangeFormProps {
  projectId: string;
  /** Set when created from R04/R18's "Flag for scope decision"; omitted when created from project detail (A16). */
  roundId?: string;
}

/** Created from R04/R18's "Flag for scope decision" or from project detail (A16) — no Figma screen for this creation form. */
export function CreateScopeChangeForm({ projectId, roundId }: CreateScopeChangeFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [additionalFee, setAdditionalFee] = useState("");
  const [timelineImpact, setTimelineImpact] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  if (sent) {
    return <p className="text-sm text-ink-secondary">Scope change sent to the client for review.</p>;
  }

  if (!open) {
    return (
      <Button type="button" variant="primary" onClick={() => setOpen(true)} className="w-[220px]">
        {roundId ? "Flag for scope decision" : "Create scope change"}
      </Button>
    );
  }

  async function handleSubmit() {
    if (!title.trim() || !description.trim()) {
      setError("Add a title and description.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/scope-changes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, additionalFee: Number(additionalFee) || 0, timelineImpact, flaggedFromRoundId: roundId }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setError(data.error ?? "Couldn't send this scope change.");
        return;
      }
      setSent(true);
      router.refresh();
    } catch {
      setError("Couldn't send this scope change.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Field label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="A request beyond the agreed scope" />
      <Textarea
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Client requested wholesale accounts, price lists and bulk ordering."
        rows={3}
      />
      <Field label="Additional fee" type="number" value={additionalFee} onChange={(e) => setAdditionalFee(e.target.value)} placeholder="650" />
      <Field label="Timeline impact" value={timelineImpact} onChange={(e) => setTimelineImpact(e.target.value)} placeholder="+5 days" />
      <div className="flex gap-3">
        <Button type="button" variant="primary" disabled={submitting} onClick={handleSubmit} className="w-[196px]">
          {submitting ? "Sending…" : "Send to client"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => setOpen(false)} className="w-[140px]">
          Cancel
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
