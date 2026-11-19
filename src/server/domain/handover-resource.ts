export type HandoverResourceType = "pdf" | "video" | "link";

/**
 * A13 (agency "Handover resources" section, no Figma screen) / C15 (client
 * handover pack). Either fileId (an uploaded file) or url is set, never both.
 */
export interface HandoverResource {
  id: string;
  projectId: string;
  title: string;
  type: HandoverResourceType;
  fileId?: string;
  url?: string;
  addedByName: string;
  addedAt: string;
}
