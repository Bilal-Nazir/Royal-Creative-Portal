import type { ReactNode } from "react";
import { ClientShell } from "@/components/layout/ClientShell";

// Every page under here reads live, per-session data from Mongo (settings, projects, ...) —
// never prerender it at build time (Phase 4a: that data used to be a local file read, now a network call).
export const dynamic = "force-dynamic";

export default function ClientGroupLayout({ children }: { children: ReactNode }) {
  return <ClientShell>{children}</ClientShell>;
}
