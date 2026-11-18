import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface ListRowProps {
  title: string;
  subtitle: string;
  trailing?: ReactNode;
  className?: string;
  /** When given, the row becomes a link (e.g. into a project's brief/proposal/deposit area). */
  href?: string;
}

export function ListRow({ title, subtitle, trailing, className, href }: ListRowProps) {
  const rowClass = cn(
    "flex w-full flex-col items-start gap-3 rounded-rc-control bg-surface-2 p-4 sm:flex-row",
    href && "hover:bg-line",
    className,
  );
  const content = (
    <>
      <div className="flex flex-1 flex-col gap-1">
        <p className="text-[13px] font-medium text-ink">{title}</p>
        <p className="text-xs text-ink-secondary">{subtitle}</p>
      </div>
      {trailing}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={rowClass}>
        {content}
      </Link>
    );
  }

  return <div className={rowClass}>{content}</div>;
}
