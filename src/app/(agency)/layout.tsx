import type { ReactNode } from "react";
import { AgencyShell } from "@/components/layout/AgencyShell";

// Every page under here reads live, per-session data from Mongo — never prerender at build time.
export const dynamic = "force-dynamic";

export default function AgencyGroupLayout({ children }: { children: ReactNode }) {
  return <AgencyShell>{children}</AgencyShell>;
}
