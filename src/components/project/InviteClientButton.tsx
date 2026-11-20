"use client";

import { useState, type FormEvent } from "react";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export interface InviteClientButtonProps {
  clientId: string;
  defaultName?: string;
  defaultEmail?: string;
}

/** A16/A18's "Invite client" — reuses the same invite-token flow as A20's team invite (server/services/invite-service.ts). */
export function InviteClientButton({ clientId, defaultName, defaultEmail }: InviteClientButtonProps) {
  const [inviting, setInviting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();

    try {
      const response = await fetch("/api/agency/clients/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, clientId }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setError(data.error ?? "Couldn't send the invite.");
        setSubmitting(false);
        return;
      }
      setSentTo(data.invite.email as string);
      setInviting(false);
    } catch {
      setError("Couldn't send the invite.");
    } finally {
      setSubmitting(false);
    }
  }

  if (sentTo) {
    return <p className="text-sm text-ink-secondary">Invite sent to {sentTo}.</p>;
  }

  if (!inviting) {
    return (
      <Button type="button" variant="secondary" onClick={() => setInviting(true)} className="w-[196px]">
        Invite client
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-rc-control bg-surface-2 p-4">
      <Field label="Name" id="name" name="name" placeholder="Full name" defaultValue={defaultName} />
      <Field label="Email" id="email" name="email" type="email" placeholder="name@example.com" defaultValue={defaultEmail} />
      <div className="flex gap-3">
        <Button type="submit" variant="primary" disabled={submitting} className="w-[160px]">
          {submitting ? "Sending…" : "Send invite"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => setInviting(false)} className="w-[120px]">
          Cancel
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
