"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PasswordFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "className" | "type"> {
  label: string;
  id?: string;
  containerClassName?: string;
  inputClassName?: string;
}

function slugify(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

/** Same look as Field, but for password inputs — adds an eye toggle to reveal what was typed. */
export function PasswordField({ label, id, name, containerClassName, inputClassName, ...props }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const fieldId = id ?? name ?? slugify(label);

  return (
    <div className={cn("flex w-full flex-col gap-2", containerClassName)}>
      <label htmlFor={fieldId} className="text-sm text-ink-secondary">
        {label}
      </label>
      <div className="relative">
        <input
          id={fieldId}
          name={name}
          type={visible ? "text" : "password"}
          className={cn(
            "h-12 w-full rounded-rc-control bg-surface-2 pl-4 pr-12 text-[13px] font-medium text-ink placeholder:font-normal placeholder:text-ink-secondary",
            inputClassName,
          )}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-secondary hover:text-ink"
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}
