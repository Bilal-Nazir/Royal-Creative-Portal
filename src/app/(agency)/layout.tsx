import type { ReactNode } from "react";
import { AgencyShell } from "@/components/layout/AgencyShell";

export default function AgencyGroupLayout({ children }: { children: ReactNode }) {
  return <AgencyShell>{children}</AgencyShell>;
}
