import { cn } from "@/lib/utils";

export interface ProgressBarProps {
  value: number;
  max?: number;
  label: string;
  className?: string;
}

export function ProgressBar({ value, max = 1, label, className }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-surface-2", className)}
    >
      <div className="h-full rounded-full rc-brand-gradient-bg" style={{ width: `${pct}%` }} />
    </div>
  );
}
