"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import type { BriefFields } from "@/server/domain/brief";

const FIELD_ORDER: Array<{ key: keyof BriefFields; label: string }> = [
  { key: "objective", label: "Objective" },
  { key: "audience", label: "Audience" },
  { key: "pages", label: "Pages" },
  { key: "features", label: "Features" },
  { key: "deliverables", label: "Deliverables" },
];

export function ReviseBriefForm({ projectId, current }: { projectId: string; current: BriefFields }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const fields = Object.fromEntries(FIELD_ORDER.map(({ key }) => [key, String(formData.get(key) ?? "").trim()])) as unknown as BriefFields;

    if (FIELD_ORDER.some(({ key }) => !fields[key])) {
      setError("Fill in every field.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/brief/send-revision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setError(data.error ?? "Couldn't send the revised brief.");
        setSubmitting(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Couldn't send the revised brief.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3">
      {FIELD_ORDER.map(({ key, label }) => (
        <Textarea
          key={key}
          label={label}
          id={key}
          name={key}
          defaultValue={current[key]}
          rows={2}
          textareaClassName="bg-surface-2 text-ink"
        />
      ))}
      <Button type="submit" variant="primary" disabled={submitting} className="w-[220px]">
        {submitting ? "Sending…" : "Send revised brief"}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </form>
  );
}
