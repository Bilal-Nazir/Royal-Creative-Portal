export interface ChargeInput {
  amount: number;
  description: string;
  /** Demo-only control — a real provider would never accept this. */
  simulateOutcome?: "success" | "failure";
}

export type ChargeResult = { ok: true; chargeId: string } | { ok: false; errorMessage: string };

/**
 * Behind an interface so a real Stripe-backed provider can replace
 * MockPaymentProvider in a later phase without touching invoice-service or
 * any UI code.
 */
export interface PaymentProvider {
  readonly isDemo: boolean;
  charge(input: ChargeInput): Promise<ChargeResult>;
}
