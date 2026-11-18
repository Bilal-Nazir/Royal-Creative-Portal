import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary";

const base =
  "inline-flex h-11 items-center justify-center whitespace-nowrap rounded-rc-control px-6 text-sm font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-40";

const variants: Record<Variant, string> = {
  primary: "rc-brand-gradient-bg text-ink hover:opacity-90",
  secondary: "bg-surface-2 text-ink hover:bg-line",
};

interface CommonProps {
  variant?: Variant;
  className?: string;
  children: ReactNode;
}

type ButtonAsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> & { href?: undefined };

type ButtonAsLink = CommonProps & {
  href: string;
  disabled?: boolean;
};

export type ButtonProps = ButtonAsButton | ButtonAsLink;

export function Button({ variant = "primary", className, children, ...props }: ButtonProps) {
  const classes = cn(base, variants[variant], className);

  if ("href" in props && props.href) {
    const { href, disabled } = props;
    if (disabled) {
      return (
        <span aria-disabled="true" className={cn(classes, "pointer-events-none opacity-40")}>
          {children}
        </span>
      );
    }
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  const buttonProps = props as Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">;
  return (
    <button type="button" className={classes} {...buttonProps}>
      {children}
    </button>
  );
}
