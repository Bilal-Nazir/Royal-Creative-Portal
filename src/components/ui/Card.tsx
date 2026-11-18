import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface CardProps {
  children: ReactNode;
  className?: string;
}

/** No default padding — callers set it (p-6 for section cards, p-5 for stat cards) via className. */
export function Card({ children, className }: CardProps) {
  return <div className={cn("rounded-rc border border-line bg-surface", className)}>{children}</div>;
}
