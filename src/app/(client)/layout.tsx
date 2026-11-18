import type { ReactNode } from "react";
import { ClientShell } from "@/components/layout/ClientShell";

export default function ClientGroupLayout({ children }: { children: ReactNode }) {
  return <ClientShell>{children}</ClientShell>;
}
