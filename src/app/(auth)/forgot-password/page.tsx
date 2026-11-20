"use client";

import { useState, type FormEvent } from "react";
import { Logo } from "@/components/ui/Logo";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

/** Not in Figma — C17-style page for the real forgot-password flow (Phase 4a). See DESIGN_NOTES. */
export default function ForgotPasswordPage() {
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setError(data.error ?? "Something went wrong. Try again.");
        setSubmitting(false);
        return;
      }
      setSent(true);
    } catch {
      setError("Something went wrong. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg px-5 py-8 sm:px-8">
      <header className="flex items-center justify-between">
        <Logo width={180} />
        <Button href="/sign-in" variant="secondary" className="w-auto px-6">
          Back to sign in
        </Button>
      </header>

      <main className="flex flex-1 items-center justify-center py-10">
        <div className="flex w-full max-w-[520px] flex-col gap-4 rounded-rc border border-line bg-surface p-6">
          {sent ? (
            <div className="flex flex-col gap-2">
              <h1 className="font-heading text-[32px] font-semibold text-ink">Check your email</h1>
              <p className="text-sm text-ink-secondary">
                If an account exists for that email, we&apos;ve sent a link to reset your password.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <h1 className="font-heading text-[32px] font-semibold text-ink">Reset your password</h1>
                <p className="text-sm text-ink-secondary">Enter your email and we&apos;ll send you a reset link.</p>
              </div>

              <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
                <Field label="Email" id="email" name="email" type="email" placeholder="you@example.com" autoComplete="email" required />

                {error ? (
                  <p role="alert" className="text-sm text-danger">
                    {error}
                  </p>
                ) : null}

                <Button type="submit" variant="primary" disabled={submitting} className="w-[196px]">
                  {submitting ? "Sending…" : "Send reset link"}
                </Button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
