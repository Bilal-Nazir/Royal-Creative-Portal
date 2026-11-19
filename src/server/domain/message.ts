/** R10/R12 — simple per-project chat between client and agency. The full agency Messages inbox is a later phase. */
export interface ProjectMessage {
  id: string;
  projectId: string;
  authorId: string;
  authorName: string;
  authorRole: "client" | "agency";
  body: string;
  createdAt: string;
}
