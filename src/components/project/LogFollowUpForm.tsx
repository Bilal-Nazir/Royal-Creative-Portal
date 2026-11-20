"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Field } from "../ui/Field";
import { Button } from "../ui/Button";

export interface LogFollowUpFormProps {
  contactId: string;
}

export function LogFollowUpForm({ contactId }: LogFollowUpFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim()) {
      setError("Write a note first.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const response = await fetch(`/api/contacts/${contactId}/follow-up`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      setError(data.error ?? "Couldn't log that follow-up.");
      setSubmitting(false);
      return;
    }
    setBody("");
    setOpen(false);
    setSubmitting(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button variant="secondary" className="w-[196px]" onClick={() => setOpen(true)}>
        Log follow-up
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <Field
        label="Follow-up note"
        hideLabel
        placeholder="What happened?"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        containerClassName="sm:min-w-[280px]"
      />
      <Button type="submit" variant="primary" disabled={submitting} className="w-[160px]">
        {submitting ? "Saving…" : "Save note"}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </form>
  );
}
