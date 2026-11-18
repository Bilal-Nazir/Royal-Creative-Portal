import type { ProposalFields } from "@/server/domain/proposal";
import { cn } from "@/lib/utils";

export interface ProposalDocumentProps {
  title: string;
  fields: ProposalFields;
  className?: string;
}

const FIELD_ORDER: Array<{ key: keyof ProposalFields; label: string }> = [
  { key: "scope", label: "Scope" },
  { key: "timeline", label: "Timeline" },
  { key: "revisions", label: "Revisions" },
  { key: "exclusions", label: "Exclusions" },
];

export function ProposalDocument({ title, fields, className }: ProposalDocumentProps) {
  return (
    <div className={cn("flex w-full flex-col gap-[22px] rounded-rc border border-line bg-white p-8", className)}>
      <h2 className="font-heading text-[28px] font-semibold text-[#14141a]">{title}</h2>
      {FIELD_ORDER.map(({ key, label }) => (
        <div key={key} className="flex flex-col gap-[7px] pb-[10px]">
          <p className="font-heading text-lg font-semibold text-[#14141a]">{label}</p>
          <p className="text-[17px] leading-[27px] text-[#33333d]">{fields[key]}</p>
        </div>
      ))}
    </div>
  );
}
