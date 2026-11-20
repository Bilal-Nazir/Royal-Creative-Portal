import type { PaymentProvider, ChargeInput, ChargeResult } from "./provider";

/**
 * Bank transfer has no "charge" to attempt — the real flow is client reports
 * a transfer (invoice-service.ts's `reportBankTransfer`, sets the invoice to
 * "unverified"), then an agency admin verifies it manually (A08, the
 * existing verify flow). `charge()` only exists to satisfy the shared
 * interface for any code path still built around "attempt an immediate
 * charge" (e.g. a future Stripe driver plugs into that exact seam) — nothing
 * in the bank-transfer checkout UI calls it.
 */
export class BankTransferProvider implements PaymentProvider {
  readonly isDemo = false;

  async charge(input: ChargeInput): Promise<ChargeResult> {
    return { ok: true, chargeId: `bank_${Date.now()}_${Math.abs(hashString(input.description))}` };
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
