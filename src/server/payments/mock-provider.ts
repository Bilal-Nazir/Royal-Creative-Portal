import type { PaymentProvider, ChargeInput, ChargeResult } from "./provider";

/**
 * Demo-mode payment provider. Never collects or stores real card data —
 * there is no card field this provider reads; the outcome is chosen directly
 * by the demo control on the checkout screen. Stripe (or another real
 * provider) replaces this in a later phase.
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly isDemo = true;

  async charge(input: ChargeInput): Promise<ChargeResult> {
    const outcome = input.simulateOutcome ?? "success";
    if (outcome === "success") {
      return { ok: true, chargeId: `demo_ch_${Math.abs(hashString(input.description + input.amount))}` };
    }
    return { ok: false, errorMessage: "Your card was declined (demo failure)." };
  }
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

export const paymentProvider: PaymentProvider = new MockPaymentProvider();
