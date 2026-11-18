"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/Textarea";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { NotImplementedButton } from "@/components/ui/NotImplementedButton";
import { CopyClientLinkButton } from "@/components/project/CopyClientLinkButton";
import { PreviewClientViewButton } from "@/components/project/PreviewClientViewButton";
import type { ProposalFields, PaymentScheduleItem } from "@/server/domain/proposal";

const FIELD_ORDER: Array<{ key: keyof ProposalFields; label: string; placeholder: string }> = [
  { key: "scope", label: "Scope", placeholder: "Website design & development, product catalogue, checkout…" },
  { key: "timeline", label: "Timeline", placeholder: "6 weeks from brief approval to launch." },
  { key: "revisions", label: "Revisions", placeholder: "Up to 2 rounds of revisions per stage." },
  { key: "exclusions", label: "Exclusions", placeholder: "Copywriting, paid ad campaigns, third-party licences." },
];

export interface ProposalEditorFormProps {
  projectId: string;
  initial: ProposalFields;
  initialFee: number;
  initialSchedule: PaymentScheduleItem[];
}

/** Replaces Figma's single free-text proposal textarea (5:445) with the structured ProposalFields the services already store. See DESIGN_NOTES. */
export function ProposalEditorForm({ projectId, initial, initialFee, initialSchedule }: ProposalEditorFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [submitting, setSubmitting] = useState<"draft" | "send" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [schedule, setSchedule] = useState<PaymentScheduleItem[]>(
    initialSchedule.length > 0
      ? initialSchedule
      : [
          { label: "Deposit", amount: 0 },
          { label: "Before launch", amount: 0 },
        ],
  );

  function readPayload() {
    const data = new FormData(formRef.current!);
    const fields = Object.fromEntries(
      FIELD_ORDER.map(({ key }) => [key, String(data.get(key) ?? "").trim()]),
    ) as unknown as ProposalFields;
    const fee = Number(data.get("fee") ?? 0);
    return { fields, fee, paymentSchedule: schedule };
  }

  async function handleSaveDraft() {
    setSubmitting("draft");
    setError(null);
    try {
      const { fields, fee, paymentSchedule } = readPayload();
      const response = await fetch(`/api/projects/${projectId}/proposal/save-draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...fields, fee, paymentSchedule }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setError(data.error ?? "Couldn't save the draft.");
        return;
      }
      router.refresh();
    } catch {
      setError("Couldn't save the draft.");
    } finally {
      setSubmitting(null);
    }
  }

  async function handleSend() {
    const { fields, fee, paymentSchedule } = readPayload();
    if (FIELD_ORDER.some(({ key }) => !fields[key])) {
      setError("Fill in every field before sending.");
      return;
    }
    if (paymentSchedule.some((item) => !item.label)) {
      setError("Label every payment schedule row.");
      return;
    }

    setSubmitting("send");
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/proposal/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...fields, fee, paymentSchedule }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setError(data.error ?? "Couldn't send the proposal.");
        return;
      }
      router.refresh();
    } catch {
      setError("Couldn't send the proposal.");
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <form ref={formRef} onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-4">
        {FIELD_ORDER.map(({ key, label, placeholder }) => (
          <Textarea key={key} label={label} id={key} name={key} defaultValue={initial[key]} placeholder={placeholder} rows={3} />
        ))}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Project fee" id="fee" name="fee" type="number" min={0} defaultValue={initialFee} inputClassName="w-[150px]" />
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm text-ink-secondary">Payment schedule</p>
          {schedule.map((item, index) => (
            <div key={index} className="flex gap-3">
              <Field
                label={`Payment ${index + 1} label`}
                hideLabel
                value={item.label}
                onChange={(e) =>
                  setSchedule((rows) => rows.map((row, i) => (i === index ? { ...row, label: e.target.value } : row)))
                }
                containerClassName="flex-1"
              />
              <Field
                label={`Payment ${index + 1} amount`}
                hideLabel
                type="number"
                min={0}
                value={item.amount}
                onChange={(e) =>
                  setSchedule((rows) =>
                    rows.map((row, i) => (i === index ? { ...row, amount: Number(e.target.value) } : row)),
                  )
                }
                inputClassName="w-[150px]"
              />
            </div>
          ))}
        </div>
      </form>

      <div className="flex flex-wrap items-center gap-3">
        <NotImplementedButton label="Add attachment" message="File attachments aren't built yet — it's coming in a later phase." />
        <Button type="button" variant="secondary" disabled={submitting !== null} onClick={handleSaveDraft} className="w-[196px]">
          {submitting === "draft" ? "Saving…" : "Save proposal draft"}
        </Button>
        <PreviewClientViewButton projectId={projectId} />
        <CopyClientLinkButton projectId={projectId} />
        <Button type="button" variant="primary" disabled={submitting !== null} onClick={handleSend} className="w-[196px]">
          {submitting === "send" ? "Sending…" : "Send proposal"}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
