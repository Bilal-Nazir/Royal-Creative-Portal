"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export function InviteAcceptForm({ token }: { token: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setError(data.error ?? "Something went wrong. Try again.");
        setSubmitting(false);
        return;
      }
      router.push("/sign-in");
    } catch {
      setError("Something went wrong. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
      <Field label="Password" id="password" name="password" type="password" placeholder="At least 8 characters" autoComplete="new-password" required minLength={8} />
      <Field
        label="Confirm password"
        id="confirmPassword"
        name="confirmPassword"
        type="password"
        placeholder="Re-enter your password"
        autoComplete="new-password"
        required
        minLength={8}
      />

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      <Button type="submit" variant="primary" disabled={submitting} className="w-[196px]">
        {submitting ? "Saving…" : "Set password & continue"}
      </Button>
    </form>
  );
}
