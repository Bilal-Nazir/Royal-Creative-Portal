import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id" | "className"> {
  label: string;
  id?: string;
  hideLabel?: boolean;
  containerClassName?: string;
  textareaClassName?: string;
}

function slugify(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export function Textarea({
  label,
  id,
  name,
  hideLabel,
  containerClassName,
  textareaClassName,
  ...props
}: TextareaProps) {
  const fieldId = id ?? name ?? slugify(label);

  return (
    <div className={cn("flex w-full flex-col gap-2", containerClassName)}>
      <label htmlFor={fieldId} className={cn("text-sm text-ink-secondary", hideLabel && "sr-only")}>
        {label}
      </label>
      <textarea
        id={fieldId}
        name={name}
        rows={4}
        className={cn(
          "w-full resize-y rounded-rc-control bg-surface-2 p-4 text-[13px] font-medium text-ink placeholder:font-normal placeholder:text-ink-secondary",
          textareaClassName,
        )}
        {...props}
      />
    </div>
  );
}
