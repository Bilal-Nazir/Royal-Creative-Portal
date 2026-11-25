import { projectBoardColumnRepository, projectRepository } from "../repositories/container";
import { ok, forbidden, notFound, badRequest, type ServiceResult } from "./result";
import type { SessionPayload } from "../auth/session";
import { boardColumnIdFor, BOARD_COLUMN_COLORS, type ProjectBoardColumn } from "../domain/project-board";
import type { Project } from "../domain/project";

export async function listBoardColumns(): Promise<ProjectBoardColumn[]> {
  return projectBoardColumnRepository.listAll();
}

export async function createBoardColumn(
  session: SessionPayload,
  name: string,
  color?: string,
): Promise<ServiceResult<ProjectBoardColumn>> {
  if (session.role !== "agency") return forbidden("Only agency staff can manage the board.");
  if (!name.trim()) return badRequest("Give the list a name.");

  const columns = await projectBoardColumnRepository.listAll();
  const column: ProjectBoardColumn = {
    id: `col-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name: name.trim(),
    order: columns.length,
    color: color && BOARD_COLUMN_COLORS.includes(color) ? color : BOARD_COLUMN_COLORS[columns.length % BOARD_COLUMN_COLORS.length],
  };
  await projectBoardColumnRepository.create(column);
  return ok(column);
}

/** A column can only be deleted when it's empty — explicit requirement, same as pipeline stages. */
export async function deleteBoardColumn(session: SessionPayload, id: string): Promise<ServiceResult<null>> {
  if (session.role !== "agency") return forbidden("Only agency staff can manage the board.");

  const column = await projectBoardColumnRepository.findById(id);
  if (!column) return notFound("List not found.");

  const projects = await projectRepository.listAll();
  if (projects.some((p) => boardColumnIdFor(p) === id)) {
    return badRequest("Move or remove every project in this list before deleting it.");
  }

  await projectBoardColumnRepository.delete(id);
  return ok(null);
}

/** Moves a project card to a different board column. Purely organisational — never touches the real stage/journey machine (domain/stage.ts), so this can't bypass a gate. */
export async function moveProjectToBoardColumn(
  session: SessionPayload,
  projectId: string,
  columnId: string,
): Promise<ServiceResult<Project>> {
  if (session.role !== "agency") return forbidden("Only agency staff can move projects.");

  const project = await projectRepository.findById(projectId);
  if (!project) return notFound("Project not found.");

  const column = await projectBoardColumnRepository.findById(columnId);
  if (!column) return badRequest("Unknown list.");

  const updated: Project = { ...project, boardColumnId: columnId };
  await projectRepository.update(updated);
  return ok(updated);
}
