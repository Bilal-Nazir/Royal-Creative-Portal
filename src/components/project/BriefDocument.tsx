import type { ReactNode } from "react";
import type { BriefFields } from "@/server/domain/brief";
import { cn } from "@/lib/utils";

export interface BriefDocumentProps {
  title: string;
  fields: BriefFields;
  variant: "dark" | "paper";
  action?: ReactNode;
  className?: string;
}

const FIELD_ORDER: Array<{ key: keyof BriefFields; label: string }> = [
  { key: "objective", label: "Objective" },
  { key: "audience", label: "Audience" },
  { key: "pages", label: "Pages" },
  { key: "features", label: "Features" },
  { key: "deliverables", label: "Deliverables" },
];

export function BriefDocument({ title, fields, variant, action, className }: BriefDocumentProps) {
  const isPaper = variant === "paper";

  return (
    <div
      className={cn(
        "flex w-full flex-col rounded-rc border border-line",
        isPaper ? "gap-[23px] bg-white px-6 py-[30px]" : "gap-4 bg-surface p-6",
        className,
      )}
    >
      <div className="flex h-11 w-full items-center justify-between">
        <h2
          className={cn(
            "font-heading text-xl font-semibold",
            isPaper ? "text-[#14141a]" : "text-ink",
          )}
        >
          {title}
        </h2>
        {action}
      </div>

      {FIELD_ORDER.map(({ key, label }) => (
        <div key={key} className="flex flex-col gap-[5px]">
          <p className={cn("font-heading text-base font-semibold", isPaper ? "text-[#14141a]" : "text-ink")}>
            {label}
          </p>
          <p
            className={cn(
              isPaper ? "text-[17px] leading-[26px] text-[#33333d]" : "text-sm text-ink-secondary",
            )}
          >
            {fields[key]}
          </p>
        </div>
      ))}
    </div>
  );
}
