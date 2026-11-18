import type { ReactNode } from "react";
import { Logo } from "../ui/Logo";
import { NavItem } from "../ui/NavItem";
import { ContactOwner } from "../ui/ContactOwner";
import { MobileNav } from "./MobileNav";
import { ProjectJourney } from "./ProjectJourney";
import type { Stage } from "@/server/domain/stage";

const CLIENT_NAV_ITEMS = [
  { href: "/dashboard", label: "My projects" },
  { href: "/messages", label: "Messages" },
  { href: "/files", label: "Files" },
  { href: "/payments", label: "Payments" },
];

export interface ClientShellProps {
  children: ReactNode;
  /** Shown as a "PROJECT JOURNEY" section in the sidebar when viewing a specific project (brief/proposal/deposit pages). */
  journeyStage?: Stage;
  journeyProjectId?: string;
}

export function ClientShell({ children, journeyStage, journeyProjectId }: ClientShellProps) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <MobileNav
        eyebrow="CLIENT PORTAL"
        items={CLIENT_NAV_ITEMS}
        tagline={["Royal Creative", "Your project, in one place."]}
      />

      <aside className="hidden w-[232px] shrink-0 flex-col gap-[14px] bg-surface p-[20px] lg:flex">
        <Logo width={184} />
        <p className="text-xs text-ink-secondary">CLIENT PORTAL</p>
        <nav className="flex flex-col gap-[14px]" aria-label="Client navigation">
          {CLIENT_NAV_ITEMS.map((item) => (
            <NavItem key={item.href} href={item.href} label={item.label} />
          ))}
        </nav>
        {journeyStage ? (
          <>
            <p className="text-xs text-ink-secondary">PROJECT JOURNEY</p>
            <ProjectJourney currentStage={journeyStage} projectId={journeyProjectId} />
          </>
        ) : null}
        <p className="text-xs leading-relaxed text-ink-secondary">
          Royal Creative
          <br />
          Your project, in one place.
        </p>
        <div className="flex-1" />
        <ContactOwner variant="compact" />
      </aside>

      <main className="flex-1 p-5 sm:p-8 lg:p-[32px]">
        <div className="mx-auto flex w-full max-w-[1144px] flex-col gap-6">{children}</div>
      </main>
    </div>
  );
}
