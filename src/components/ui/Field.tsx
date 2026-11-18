import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "className"> {
  label: string;
  id?: string;
  hideLabel?: boolean;
  containerClassName?: string;
  inputClassName?: string;
}

function slugify(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export function Field({ label, id, name, hideLabel, containerClassName, inputClassName, ...props }: FieldProps) {
  const fieldId = id ?? name ?? slugify(label);

  return (
    <div className={cn("flex w-full flex-col gap-2", containerClassName)}>
      <label htmlFor={fieldId} className={cn("text-sm text-ink-secondary", hideLabel && "sr-only")}>
        {label}
      </label>
      <input
        id={fieldId}
        name={name}
        className={cn(
          "h-12 w-full rounded-rc-control bg-surface-2 pl-4 pr-4 text-[13px] font-medium text-ink placeholder:font-normal placeholder:text-ink-secondary",
          inputClassName,
        )}
        {...props}
      />
    </div>
  );
}
