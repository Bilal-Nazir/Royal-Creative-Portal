"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { isSafeReturnTo } from "@/lib/utils";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const returnToParam = searchParams.get("returnTo");
  const returnTo = isSafeReturnTo(returnToParam) ? returnToParam : null;
  const isBriefVariant = searchParams.get("variant") === "brief";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    try {
      const response = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        setError(data.error ?? "Something went wrong. Try again.");
        setSubmitting(false);
        return;
      }

      router.push(returnTo ?? data.redirectTo);
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg px-5 py-8 sm:px-8">
      <header className="flex items-center justify-between">
        <Logo width={180} />
        <Button href={returnTo ?? "/dashboard"} variant="secondary" className="w-auto px-6">
          {isBriefVariant ? "Back" : "Back to dashboard"}
        </Button>
      </header>

      <main className="flex flex-1 items-center justify-center py-10">
        <div className="flex w-full max-w-[520px] flex-col gap-4 rounded-rc border border-line bg-surface p-6">
          <div className="flex flex-col gap-2">
            <h1 className="font-heading text-[32px] font-semibold text-ink">
              {isBriefVariant ? "Sign in to continue" : "Sign in to Royal Creative"}
            </h1>
            <p className="text-sm text-ink-secondary">
              {isBriefVariant
                ? "Sign in to continue, leave a comment or request changes."
                : "Access your projects and see what needs your attention."}
            </p>
          </div>

          <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
            <Field
              label="Email"
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
            <Field
              label="Password"
              id="password"
              name="password"
              type="password"
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />

            {error ? (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            ) : null}

            <Button type="submit" variant="primary" disabled={submitting} className="w-[196px]">
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
            <a href="/forgot-password" className="text-sm text-ink-secondary hover:underline">
              Forgot your password?
            </a>
          </form>
        </div>
      </main>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
}
