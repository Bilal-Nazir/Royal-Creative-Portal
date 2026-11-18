import { projectRepository, activityRepository, attentionRepository } from "../repositories/container";
import type { SessionPayload } from "../auth/session";
import { filterProjectsForAgencyUser } from "./permissions";

export async function getClientDashboardData(clientId: string) {
  const [projects, activities, attentionTasks] = await Promise.all([
    projectRepository.listByClientId(clientId),
    activityRepository.listByClientId(clientId),
    attentionRepository.listByClientId(clientId),
  ]);
  return { projects, activities, attentionTasks };
}

export async function getProjectsForAgencyUser(session: SessionPayload) {
  const all = await projectRepository.listAll();
  return filterProjectsForAgencyUser(session, all);
}
