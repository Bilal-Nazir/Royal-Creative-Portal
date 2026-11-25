"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { STAGE_ORDER, STAGE_LABELS, stageIndex, type Stage } from "@/server/domain/stage";
import { cn } from "@/lib/utils";

export interface ProjectJourneyProps {
  currentStage: Stage;
  className?: string;
  /** When given, linkable stages that have a built page become links so users can move between them. */
  projectId?: string;
  /** Base path the stage route is appended to — "/projects" for clients, "/agency/projects" for agency. */
  basePath?: string;
  /**
   * Explicit allow-list of stages that should always be links, regardless of
   * done/current/upcoming status. A16's agency journey links brief/proposal/
   * deposit unconditionally (Figma node 41:1109–41:1115); the client-side
   * convention (omit this prop) only links done+current stages instead.
   */
  linkableStages?: Stage[];
  /** When true, the brief stage renders as "– Brief · Skipped" — muted, not a link — regardless of done/current/upcoming status. */
  briefSkipped?: boolean;
}

const STAGE_ROUTES: Partial<Record<Stage, string>> = {
  brief: "brief",
  proposal: "proposal",
  deposit: "deposit",
  content: "content",
  design: "design",
  development: "development",
  launch: "launch",
  handover: "handover",
};

/**
 * Sidebar "PROJECT JOURNEY" list — ✓ done / ● current (gradient) / ○ upcoming,
 * matching the exact text-glyph style used across C03–C10 and R11/R14 (not a
 * visual timeline with icons, as Phase 1 originally guessed before any screen
 * actually used this component).
 */
export function ProjectJourney({
  currentStage,
  className,
  projectId,
  basePath = "/projects",
  linkableStages,
  briefSkipped,
}: ProjectJourneyProps) {
  const currentIndex = stageIndex(currentStage);
  const pathname = usePathname();

  return (
    <ol className={cn("flex flex-col gap-[14px]", className)}>
      {STAGE_ORDER.map((stage, index) => {
        if (stage === "brief" && briefSkipped) {
          return (
            <li key={stage}>
              <span className="text-[13px] font-medium text-ink-secondary">– Brief · Skipped</span>
            </li>
          );
        }

        const status = index < currentIndex ? "done" : index === currentIndex ? "current" : "upcoming";
        const glyph = status === "done" ? "✓" : status === "current" ? "●" : "○";
        const textClass = status === "current" ? "rc-brand-gradient-text" : "text-ink-secondary";
        const route = STAGE_ROUTES[stage];
        // Only stages with a built page are ever navigable (see STAGE_ROUTES).
        // Within that set, linkableStages (if given) always links; otherwise
        // only done/current stages do (the client-side convention).
        const isLinkable = linkableStages ? linkableStages.includes(stage) : status !== "upcoming";
        const href = projectId && route && isLinkable ? `${basePath}/${projectId}/${route}` : null;
        // The page you're actually viewing — independent of status, which reflects the project's real progress, not navigation.
        const isViewing = !!href && !!pathname && (pathname === href || pathname.startsWith(`${href}/`));

        return (
          <li key={stage}>
            {href ? (
              <Link
                href={href}
                aria-current={isViewing ? "page" : undefined}
                className={cn(
                  "text-[13px] font-medium hover:underline",
                  textClass,
                  isViewing && "-mx-2 rounded-md bg-surface-2 px-2 py-1 no-underline",
                )}
              >
                {glyph}&nbsp;&nbsp;{STAGE_LABELS[stage]}
              </Link>
            ) : (
              <span className={cn("text-[13px] font-medium", textClass)}>
                {glyph}&nbsp;&nbsp;{STAGE_LABELS[stage]}
              </span>
            )}
            <span className="sr-only">
              {status === "done" ? " — completed" : status === "current" ? " — current stage" : " — upcoming"}
              {isViewing ? " — currently viewing" : ""}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
