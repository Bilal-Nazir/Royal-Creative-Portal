import type { ReactNode } from "react";
import { Logo } from "../ui/Logo";
import { NavItem } from "../ui/NavItem";
import { MobileNav } from "./MobileNav";

const AGENCY_NAV_ITEMS = [
  { href: "/agency/dashboard", label: "Dashboard" },
  { href: "/agency/projects", label: "Projects" },
  { href: "/agency/payments", label: "Payments" },
  { href: "/agency/contacts", label: "Contacts" },
  { href: "/agency/messages", label: "Messages" },
  { href: "/agency/settings", label: "Settings" },
];

export function AgencyShell({ children }: { children: ReactNode }) {
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
