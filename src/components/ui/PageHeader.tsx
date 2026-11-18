import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function PageHeader({ eyebrow, title, description, action, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="flex flex-col gap-4">
        {eyebrow ? (
          <p className="rc-brand-gradient-text text-xs font-normal uppercase tracking-wide">{eyebrow}</p>
        ) : null}
        <h1 className="font-heading text-[32px] font-semibold leading-tight text-ink">{title}</h1>
        {description ? <p className="max-w-2xl text-sm text-ink-secondary">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
