/** R10/R12 — simple per-project chat between client and agency. A29/A15 (Phase 3) build the cross-project inbox on top of this. */
export interface ProjectMessage {
  id: string;
  projectId: string;
  authorId: string;
  authorName: string;
  authorRole: "client" | "agency";
  body: string;
  createdAt: string;
}

/**
 * A29/A15 — per-(project, reader) "last read" marker, so the inbox can show
 * unread counts without adding a per-recipient readAt to every message (a
 * conversation has two sides; a single shared readAt can't represent both).
 */
export interface ConversationRead {
  id: string;
  projectId: string;
  userId: string;
  lastReadAt: string;
}
