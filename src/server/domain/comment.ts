export type CommentTargetType = "brief" | "proposal";

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
