"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Field } from "../ui/Field";
import { Button } from "../ui/Button";
import { formatGBP } from "@/lib/format";

export interface PaymentCheckoutFormProps {
  apiPath: string;
  amount: number;
  payLabel?: string;
}

/** C08/C09/C10's deposit checkout, generalized for reuse by the final-balance checkout (no Figma screen — see DESIGN_NOTES). */
export function PaymentCheckoutForm({ apiPath, amount, payLabel }: PaymentCheckoutFormProps) {
  const router = useRouter();
  const [outcome, setOutcome] = useState<"success" | "failure">("success");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setError(data.error ?? "Something went wrong.");
        setSubmitting(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Something went wrong.");
      setSubmitting(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-1 rounded-rc-control border border-brand-amber bg-surface-2 p-3">
        <p className="text-[13px] font-medium text-brand-amber">Demo mode — no real payment is processed</p>
        <p className="text-xs text-ink-secondary">
          This checkout never collects or stores real card details. Choose what the demo payment provider should simulate, then submit.
        </p>
      </div>

      <div className="flex flex-col gap-[10px]">
        <p className="text-sm text-ink-secondary">Email</p>
        <Field label="Email" hideLabel id="email" name="email" placeholder="you@example.com" inputClassName="w-full sm:w-[560px]" />
        <p className="text-sm text-ink-secondary">Card number</p>
        <Field
          label="Card number"
          hideLabel
          id="cardNumber"
          name="cardNumber"
          placeholder="1234 1234 1234 1234"
          disabled
          inputClassName="w-full sm:w-[560px]"
        />
        <div className="flex gap-3">
          <div className="flex flex-col gap-1.5">
            <p className="text-sm text-ink-secondary">Expiry date</p>
            <Field label="Expiry date" hideLabel id="expiry" name="expiry" placeholder="MM / YY" disabled inputClassName="w-[274px]" />
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-sm text-ink-secondary">Security code</p>
            <Field label="Security code" hideLabel id="cvc" name="cvc" placeholder="CVC" disabled inputClassName="w-[274px]" />
          </div>
        </div>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-[13px] font-medium text-ink">Demo outcome</legend>
        <div className="flex gap-4 text-sm text-ink">
          <label className="flex items-center gap-2">
            <input type="radio" name="outcome" value="success" checked={outcome === "success"} onChange={() => setOutcome("success")} />
            Simulate success
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="outcome" value="failure" checked={outcome === "failure"} onChange={() => setOutcome("failure")} />
            Simulate failure
          </label>
        </div>
      </fieldset>

      <Button type="submit" variant="primary" disabled={submitting} className="w-full sm:w-[560px]">
        {submitting ? "Processing…" : `${payLabel ?? "Pay"} ${formatGBP(amount)}`}
      </Button>

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </form>
  );
}
