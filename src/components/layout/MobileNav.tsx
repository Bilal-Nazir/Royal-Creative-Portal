"use client";

import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "../ui/Logo";
import { NavItem } from "../ui/NavItem";
import { ContactOwner } from "../ui/ContactOwner";

export interface MobileNavProps {
  eyebrow: string;
  items: { href: string; label: string }[];
  tagline: [string, string];
}

/**
 * Replaces the desktop sidebar on small screens. Figma's own mobile dashboard
 * frame (M01) has no drawer — it just drops the sidebar — but the portal has
 * more pages than that one frame covers, so this adds a hamburger + slide-over
 * drawer to keep every page reachable on mobile. Logged in DESIGN_NOTES.md.
 */
export function MobileNav({ eyebrow, items, tagline }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <div className="flex items-center justify-between border-b border-line bg-surface px-5 py-4 lg:hidden">
      <Logo width={120} />
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
        aria-expanded={open}
        aria-controls="mobile-nav-drawer"
        className="inline-flex size-11 items-center justify-center rounded-rc-control bg-surface-2 text-ink"
      >
        <Menu size={20} aria-hidden="true" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex">
          <button
            type="button"
            aria-label="Close navigation menu"
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
          />
          <div
            id="mobile-nav-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="relative ml-auto flex h-full w-[280px] flex-col gap-5 bg-surface p-5"
          >
            <div className="flex items-center justify-between">
              <Logo width={140} />
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation menu"
                className="inline-flex size-11 items-center justify-center rounded-rc-control bg-surface-2 text-ink"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <p className="text-xs text-ink-secondary">{eyebrow}</p>
            <nav className="flex flex-col gap-3.5" onClick={() => setOpen(false)}>
              {items.map((item) => (
                <NavItem key={item.href} href={item.href} label={item.label} />
              ))}
            </nav>
            <div className="mt-auto flex flex-col gap-4">
              <p className="text-xs leading-relaxed text-ink-secondary">
                {tagline[0]}
                <br />
                {tagline[1]}
              </p>
              <ContactOwner variant="compact" />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
