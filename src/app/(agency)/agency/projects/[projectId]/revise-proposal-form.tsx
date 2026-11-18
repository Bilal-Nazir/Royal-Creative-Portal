"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/Field";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import type { ProposalFields, PaymentScheduleItem } from "@/server/domain/proposal";

const FIELD_ORDER: Array<{ key: keyof ProposalFields; label: string }> = [
  { key: "scope", label: "Scope" },
  { key: "timeline", label: "Timeline" },
  { key: "revisions", label: "Revisions" },
  { key: "exclusions", label: "Exclusions" },
];

export function ReviseProposalForm({
  projectId,
  current,
  fee,
  paymentSchedule,
}: {
  projectId: string;
  current: ProposalFields;
  fee: number;
  paymentSchedule: PaymentScheduleItem[];
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const fields = Object.fromEntries(
      FIELD_ORDER.map(({ key }) => [key, String(formData.get(key) ?? "").trim()]),
    ) as unknown as ProposalFields;
    const newFee = Number(formData.get("fee"));
    const schedule: PaymentScheduleItem[] = paymentSchedule.map((item, index) => ({
      label: item.label,
      amount: Number(formData.get(`schedule-${index}`)),
    }));

    if (FIELD_ORDER.some(({ key }) => !fields[key]) || !newFee || newFee <= 0) {
      setError("Fill in every field with a valid fee.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/proposal/send-revision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...fields, fee: newFee, paymentSchedule: schedule }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setError(data.error ?? "Couldn't send the revised proposal.");
        setSubmitting(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Couldn't send the revised proposal.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3">
      {FIELD_ORDER.map(({ key, label }) => (
        <Textarea key={key} label={label} id={key} name={key} defaultValue={current[key]} rows={2} textareaClassName="bg-surface-2 text-ink" />
      ))}
      <Field label="Total fee (£)" id="fee" name="fee" type="number" min={1} defaultValue={fee} />
      <div className="flex gap-3">
        {paymentSchedule.map((item, index) => (
          <Field
            key={item.label}
            label={`${item.label} (£)`}
            id={`schedule-${index}`}
            name={`schedule-${index}`}
            type="number"
            min={0}
            defaultValue={item.amount}
            containerClassName="flex-1"
          />
        ))}
      </div>
      <Button type="submit" variant="primary" disabled={submitting} className="w-[220px]">
        {submitting ? "Sending…" : "Send revised proposal"}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </form>
  );
}
