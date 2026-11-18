import { agencyStatsRepository } from "../repositories/container";

export async function getAgencyOverview() {
  return agencyStatsRepository.getOverview();
}
