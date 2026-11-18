"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function VerifyPaymentButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleVerify() {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/deposit/verify`, { method: "POST" });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setError(data.error ?? "Couldn't verify this payment.");
        setSubmitting(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Couldn't verify this payment.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" variant="primary" disabled={submitting} onClick={handleVerify} className="w-[220px]">
        {submitting ? "Verifying…" : "Verify payment"}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
