import type { ReactNode } from "react";
import { Logo } from "../ui/Logo";
import { NavItem } from "../ui/NavItem";
import { ContactOwner } from "../ui/ContactOwner";
import { MobileNav } from "./MobileNav";
import { ProjectJourney } from "./ProjectJourney";
import { getAgencySettings } from "@/server/services/settings-service";
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

/** A20's owner contact fields drive this sidebar's "Contact owner" icons (Phase 3) — falls back to ContactOwner's own defaults if unset. */
export async function ClientShell({ children, journeyStage, journeyProjectId }: ClientShellProps) {
  const settings = await getAgencySettings();
  const phoneHref = settings.ownerPhone ? `tel:${settings.ownerPhone.replace(/\s+/g, "")}` : undefined;
  const whatsappHref = settings.ownerWhatsapp ? `https://wa.me/${settings.ownerWhatsapp.replace(/[^\d]/g, "")}` : undefined;

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
        <ContactOwner variant="compact" ownerName={settings.ownerName} phoneHref={phoneHref} whatsappHref={whatsappHref} />
      </aside>

      <main className="flex-1 p-5 sm:p-8 lg:p-[32px]">
        <div className="mx-auto flex w-full max-w-[1144px] flex-col gap-6">{children}</div>
      </main>
    </div>
  );
}
