import { env } from "../env";
import { MockPaymentProvider } from "./mock-provider";
import { BankTransferProvider } from "./bank-transfer-provider";
import type { PaymentProvider } from "./provider";

/**
 * PAYMENT_DRIVER=bank (default, including production) or mock
 * (development/test convenience only — env.ts already refuses mock in
 * production at startup). Stripe later slots in here as a third branch.
 */
export const paymentProvider: PaymentProvider = env.PAYMENT_DRIVER === "mock" ? new MockPaymentProvider() : new BankTransferProvider();

export type { PaymentProvider, ChargeInput, ChargeResult } from "./provider";
