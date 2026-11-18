import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "success" | "warning" | "info" | "danger";

const toneClass: Record<Tone, string> = {
  neutral: "text-ink",
  success: "text-success",
  warning: "text-brand-amber",
  info: "text-info",
  danger: "text-danger",
};

export interface BadgeProps {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}

export function Badge({ children, tone = "neutral", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-[30px] items-center whitespace-nowrap rounded-rc-pill bg-surface-2 pl-4 pr-4 text-[13px] font-medium",
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
