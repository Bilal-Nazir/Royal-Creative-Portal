import { PaymentCheckoutForm } from "@/components/project/PaymentCheckoutForm";

export function DepositCheckoutForm({ projectId, amount }: { projectId: string; amount: number }) {
  return <PaymentCheckoutForm apiPath={`/api/projects/${projectId}/deposit/pay`} amount={amount} />;
}
