"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import type { ContactStage } from "@/server/domain/contact";

export interface AddContactFormProps {
  stages: ContactStage[];
  owners: Array<{ id: string; name: string }>;
}

export function AddContactForm({ stages, owners }: AddContactFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const company = String(formData.get("company") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const stageId = String(formData.get("stageId") ?? "").trim();
    const ownerId = String(formData.get("ownerId") ?? "").trim();
    const nextFollowUpAt = String(formData.get("nextFollowUpAt") ?? "").trim();
    const notes = String(formData.get("notes") ?? "").trim();

    if (!name || !email || !stageId) {
      setError("Fill in the contact's name, email and pipeline stage.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const owner = owners.find((o) => o.id === ownerId);
      const response = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          company,
          phone: phone || undefined,
          stageId,
          ownerId: owner?.id,
          ownerName: owner?.name,
          nextFollowUpAt: nextFollowUpAt || undefined,
          notes: notes || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setError(data.error ?? "Couldn't save the contact.");
        setSubmitting(false);
        return;
      }
      router.push(`/agency/contacts/${data.contact.id}`);
      router.refresh();
    } catch {
      setError("Couldn't save the contact.");
      setSubmitting(false);
    }
  }

  return (
    <Card className="flex flex-col gap-5 p-6">
      <h2 className="font-heading text-xl font-semibold text-ink">Contact details</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Full name" id="name" name="name" placeholder="First and last name" />
          <Field label="Company" id="company" name="company" placeholder="Company name" />
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Email" id="email" name="email" type="email" placeholder="name@company.com" />
          <Field label="Phone · optional" id="phone" name="phone" placeholder="Country code and phone number" />
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Select
            label="Pipeline stage"
            id="stageId"
            name="stageId"
            options={stages.map((s) => ({ value: s.id, label: s.name }))}
          />
          <Select
            label="Relationship owner"
            id="ownerId"
            name="ownerId"
            placeholder="Assign an employee"
            options={owners.map((o) => ({ value: o.id, label: o.name }))}
          />
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Next follow-up · optional" id="nextFollowUpAt" name="nextFollowUpAt" type="date" />
          <Textarea
            label="Notes · internal"
            id="notes"
            name="notes"
            placeholder="Record the enquiry and requirements"
            textareaClassName="h-12"
          />
        </div>
        <Button type="submit" variant="primary" disabled={submitting} className="w-[180px]">
          {submitting ? "Saving…" : "Save contact"}
        </Button>
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}
      </form>
    </Card>
  );
}
