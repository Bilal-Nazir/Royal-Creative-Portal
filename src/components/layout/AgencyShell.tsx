import type { ReactNode } from "react";
import { Logo } from "../ui/Logo";
import { NavItem } from "../ui/NavItem";
import { MobileNav } from "./MobileNav";
import { ProjectJourney } from "./ProjectJourney";
import type { Stage } from "@/server/domain/stage";

const AGENCY_NAV_ITEMS = [
  { href: "/agency/dashboard", label: "Dashboard" },
  { href: "/agency/projects", label: "Projects" },
  { href: "/agency/payments", label: "Payments" },
  { href: "/agency/contacts", label: "Contacts" },
  { href: "/agency/messages", label: "Messages" },
  { href: "/agency/settings", label: "Settings" },
];

/**
 * Every stage page built on the agency side — see A16's deviation in
 * DESIGN_NOTES. "handover" is deliberately excluded: Figma has no agency
 * handover screen, so handover resources live on A13 (/launch) instead.
 */
const AGENCY_LINKABLE_STAGES: Stage[] = ["brief", "proposal", "deposit", "content", "design", "development", "launch"];

export interface AgencyShellProps {
  children: ReactNode;
  /** Shown as a "PROJECT JOURNEY" section in the sidebar when viewing a specific project (A16 and its stage pages). */
  journeyStage?: Stage;
  journeyProjectId?: string;
}

export function AgencyShell({ children, journeyStage, journeyProjectId }: AgencyShellProps) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <MobileNav
        eyebrow="AGENCY WORKSPACE"
        items={AGENCY_NAV_ITEMS}
        tagline={["Royal Creative", "Agency workspace"]}
      />

      <aside className="hidden w-[232px] shrink-0 flex-col gap-[9px] bg-surface p-[20px] lg:flex">
        <Logo width={184} />
        <p className="text-xs text-ink-secondary">AGENCY WORKSPACE</p>
        <nav className="flex flex-col gap-[9px]" aria-label="Agency navigation">
          {AGENCY_NAV_ITEMS.map((item) => (
            <NavItem key={item.href} href={item.href} label={item.label} />
          ))}
        </nav>
        {journeyStage ? (
          <>
            <p className="text-xs text-ink-secondary">PROJECT JOURNEY</p>
            <ProjectJourney
              currentStage={journeyStage}
              projectId={journeyProjectId}
              basePath="/agency/projects"
              linkableStages={AGENCY_LINKABLE_STAGES}
            />
          </>
        ) : null}
        <p className="text-xs leading-relaxed text-ink-secondary">
          Royal Creative
          <br />
          Agency workspace
        </p>
      </aside>

      <main className="flex-1 p-5 sm:p-8 lg:p-[32px]">
        <div className="mx-auto flex w-full max-w-[1144px] flex-col gap-6">{children}</div>
      </main>
    </div>
  );
}
