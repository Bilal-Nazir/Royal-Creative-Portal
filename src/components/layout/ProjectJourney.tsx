import Link from "next/link";
import { STAGE_ORDER, STAGE_LABELS, stageIndex, type Stage } from "@/server/domain/stage";
import { cn } from "@/lib/utils";

export interface ProjectJourneyProps {
  currentStage: Stage;
  className?: string;
  /** When given, done/current stages that have a built page become links so clients can move between them. */
  projectId?: string;
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
export function ProjectJourney({ currentStage, className, projectId }: ProjectJourneyProps) {
  const currentIndex = stageIndex(currentStage);

  return (
    <ol className={cn("flex flex-col gap-[14px]", className)}>
      {STAGE_ORDER.map((stage, index) => {
        const status = index < currentIndex ? "done" : index === currentIndex ? "current" : "upcoming";
        const glyph = status === "done" ? "✓" : status === "current" ? "●" : "○";
        const textClass = status === "current" ? "rc-brand-gradient-text" : "text-ink-secondary";
        const route = STAGE_ROUTES[stage];
        // Only brief/proposal/deposit have pages built — only those (and only
        // once reached) are navigable; everything else stays static text.
        const href = projectId && route && status !== "upcoming" ? `/projects/${projectId}/${route}` : null;

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
