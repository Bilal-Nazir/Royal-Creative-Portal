"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { NotImplementedButton } from "@/components/ui/NotImplementedButton";
import { CopyClientLinkButton } from "@/components/project/CopyClientLinkButton";
import { PreviewClientViewButton } from "@/components/project/PreviewClientViewButton";
import type { BriefFields } from "@/server/domain/brief";

const FIELD_ORDER: Array<{ key: keyof BriefFields; label: string; placeholder: string }> = [
  { key: "objective", label: "Project objective", placeholder: "Launch a polished ecommerce website." },
  { key: "audience", label: "Audience", placeholder: "Who is this website for?" },
  { key: "pages", label: "Pages", placeholder: "Home, Shop, About, Contact…" },
  { key: "features", label: "Features", placeholder: "Wholesale enquiry form, product filters…" },
  { key: "deliverables", label: "Deliverables", placeholder: "Responsive design, development, launch and handover." },
];

/** Replaces Figma's single free-text brief textarea (5:366) with the structured BriefFields the services already store. See DESIGN_NOTES. */
export function BriefEditorForm({ projectId, initial }: { projectId: string; initial: BriefFields }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [submitting, setSubmitting] = useState<"draft" | "send" | null>(null);
  const [error, setError] = useState<string | null>(null);

  function readFields(): BriefFields {
    const data = new FormData(formRef.current!);
    return Object.fromEntries(FIELD_ORDER.map(({ key }) => [key, String(data.get(key) ?? "").trim()])) as unknown as BriefFields;
  }

  async function handleSaveDraft() {
    setSubmitting("draft");
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/brief/save-draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(readFields()),
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
    const fields = readFields();
    if (FIELD_ORDER.some(({ key }) => !fields[key])) {
      setError("Fill in every field before sending.");
      return;
    }

    setSubmitting("send");
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/brief/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setError(data.error ?? "Couldn't send the brief.");
        return;
      }
      router.refresh();
    } catch {
      setError("Couldn't send the brief.");
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <form ref={formRef} onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-4">
        {FIELD_ORDER.map(({ key, label, placeholder }) => (
          <Textarea
            key={key}
            label={label}
            id={key}
            name={key}
            defaultValue={initial[key]}
            placeholder={placeholder}
            rows={3}
          />
        ))}
      </form>

      <div className="flex flex-wrap items-center gap-3">
        <NotImplementedButton label="Add attachment" message="File attachments aren't built yet — it's coming in a later phase." />
        <Button type="button" variant="secondary" disabled={submitting !== null} onClick={handleSaveDraft} className="w-[196px]">
          {submitting === "draft" ? "Saving…" : "Save brief draft"}
        </Button>
        <PreviewClientViewButton projectId={projectId} />
        <CopyClientLinkButton projectId={projectId} />
        <Button type="button" variant="primary" disabled={submitting !== null} onClick={handleSend} className="w-[196px]">
          {submitting === "send" ? "Sending…" : "Send brief for review"}
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
