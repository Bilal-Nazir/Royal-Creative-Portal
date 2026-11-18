import { cn } from "@/lib/utils";

type Tone = "success" | "warning" | "neutral";

const toneClass: Record<Tone, string> = {
  success: "text-success",
  warning: "text-brand-amber",
  neutral: "text-ink-secondary",
};

export interface StatCardProps {
  label: string;
  value: string;
  deltaLabel: string;
  tone?: Tone;
  className?: string;
}

export function StatCard({ label, value, deltaLabel, tone = "neutral", className }: StatCardProps) {
  return (
    <div className={cn("flex flex-col gap-3.5 rounded-rc border border-line bg-surface p-5", className)}>
      <p className="text-xs text-ink-secondary">{label}</p>
      <p className="font-heading text-[32px] font-semibold text-ink">{value}</p>
      <p className={cn("text-xs", toneClass[tone])}>{deltaLabel}</p>
    </div>
  );
}
