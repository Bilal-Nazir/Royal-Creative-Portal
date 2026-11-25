/**
 * Agency-defined kanban columns for the Projects board (A15) — purely
 * organisational, independent of the real stage/journey machine
 * (domain/stage.ts). Dragging a card between these columns never touches
 * `Project.stage`, so it can't bypass a gate (deposit confirmed, content
 * accepted, ...). Mirrors domain/contact.ts's ContactStage.
 */
export interface ProjectBoardColumn {
  id: string;
  name: string;
  order: number;
  color: string;
}

/** Matches the plain card background (see ProjectsBoard.tsx) — the "no colour" default so a new list looks like every other card until the agency picks something else. */
export const DEFAULT_BOARD_COLUMN_COLOR = "#1e1e24";

/** Palette offered by the colour picker when adding a list — first entry (and the default) is "no colour". */
export const BOARD_COLUMN_COLORS = [
  DEFAULT_BOARD_COLUMN_COLOR,
  "#8b8fa3",
  "#7aa3f7",
  "#a78bfa",
  "#4ade80",
  "#f87171",
  "#f2b84b",
  "#4fd1c5",
  "#eb878f",
];

/** The column a project currently sits in — falls back to its real stage for projects created before board columns existed. Pure/dependency-free so it's safe to import from client components. */
export function boardColumnIdFor(project: { stage: string; boardColumnId?: string }): string {
  return project.boardColumnId ?? project.stage;
}
