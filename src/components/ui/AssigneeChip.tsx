import { cn } from "@/lib/utils";

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export interface AssigneeChipProps {
  name: string;
  className?: string;
}

export function AssigneeChip({ name, className }: AssigneeChipProps) {
  return (
    <div className={cn("inline-flex h-9 items-center gap-2 rounded-[10px] bg-surface-2 p-[10px]", className)}>
      <span className="text-[11px] font-semibold text-[#a6b8ff]">{initials(name)}</span>
      <span className="text-sm text-ink">{name}</span>
    </div>
  );
}
