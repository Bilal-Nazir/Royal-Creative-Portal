import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface TopBarProps {
  breadcrumb: string;
  action: ReactNode;
  className?: string;
}

/** Desktop-only breadcrumb row — the Figma mobile frames omit it entirely. */
export function TopBar({ breadcrumb, action, className }: TopBarProps) {
  return (
    <div className={cn("hidden items-start gap-5 lg:flex", className)}>
      <p className="flex-1 text-xs text-ink-secondary">{breadcrumb}</p>
      {action}
    </div>
  );
}
