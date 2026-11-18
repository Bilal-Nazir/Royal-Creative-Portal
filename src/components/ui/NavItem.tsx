"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export interface NavItemProps {
  href: string;
  label: string;
}

export function NavItem({ href, label }: NavItemProps) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-11 w-full items-center rounded-rc-control pl-4 text-[13px] font-medium",
        active ? "rc-brand-gradient-text border border-brand-rose bg-surface-2" : "bg-surface-2 text-ink hover:bg-line",
      )}
    >
      {label}
    </Link>
  );
}
