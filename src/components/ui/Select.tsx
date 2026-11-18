import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "id" | "className"> {
  label: string;
  options: SelectOption[];
  placeholder?: string;
  id?: string;
  hideLabel?: boolean;
  containerClassName?: string;
  selectClassName?: string;
}

function slugify(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

/** Same sizing/surface as Field, for the filter controls and the A04 assignee/client selectors. */
export function Select({
  label,
  options,
  placeholder,
  id,
  name,
  hideLabel,
  containerClassName,
  selectClassName,
  ...props
}: SelectProps) {
  const fieldId = id ?? name ?? slugify(label);

  return (
    <div className={cn("flex w-full flex-col gap-2", containerClassName)}>
      <label htmlFor={fieldId} className={cn("text-sm text-ink-secondary", hideLabel && "sr-only")}>
        {label}
      </label>
      <select
        id={fieldId}
        name={name}
        className={cn(
          "h-12 w-full rounded-rc-control bg-surface-2 pl-4 pr-4 text-[13px] font-medium text-ink",
          selectClassName,
        )}
        {...props}
      >
        {placeholder ? (
          <option value="" disabled hidden>
            {placeholder}
          </option>
        ) : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
