/** "internal" is agency-only team notes — not shown to the client. targetVersionId is the projectId for these (there's one internal thread per project, not per version). */
export type CommentTargetType = "brief" | "proposal" | "internal";

export interface Comment {
  id: string;
  projectId: string;
  targetType: CommentTargetType;
  targetVersionId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
}
