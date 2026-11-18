import Link from "next/link";
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
}

const STAGE_ROUTES: Partial<Record<Stage, string>> = {
  brief: "brief",
  proposal: "proposal",
  deposit: "deposit",
};

/**
 * Sidebar "PROJECT JOURNEY" list — ✓ done / ● current (gradient) / ○ upcoming,
 * matching the exact text-glyph style used across C03–C10 and R11/R14 (not a
 * visual timeline with icons, as Phase 1 originally guessed before any screen
 * actually used this component).
 */
export function ProjectJourney({ currentStage, className, projectId, basePath = "/projects", linkableStages }: ProjectJourneyProps) {
  const currentIndex = stageIndex(currentStage);

  return (
    <ol className={cn("flex flex-col gap-[14px]", className)}>
      {STAGE_ORDER.map((stage, index) => {
        const status = index < currentIndex ? "done" : index === currentIndex ? "current" : "upcoming";
        const glyph = status === "done" ? "✓" : status === "current" ? "●" : "○";
        const textClass = status === "current" ? "rc-brand-gradient-text" : "text-ink-secondary";
        const route = STAGE_ROUTES[stage];
        // Only brief/proposal/deposit have pages built — only those are ever
        // navigable. Within that set, linkableStages (if given) always links;
        // otherwise only done/current stages do (the client-side convention).
        const isLinkable = linkableStages ? linkableStages.includes(stage) : status !== "upcoming";
        const href = projectId && route && isLinkable ? `${basePath}/${projectId}/${route}` : null;

        return (
          <li key={stage}>
            {href ? (
              <Link href={href} className={cn("text-[13px] font-medium hover:underline", textClass)}>
                {glyph}&nbsp;&nbsp;{STAGE_LABELS[stage]}
              </Link>
            ) : (
              <span className={cn("text-[13px] font-medium", textClass)}>
                {glyph}&nbsp;&nbsp;{STAGE_LABELS[stage]}
              </span>
            )}
            <span className="sr-only">
              {status === "done" ? " — completed" : status === "current" ? " — current stage" : " — upcoming"}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
