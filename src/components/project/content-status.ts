import type { ContentItemStatus } from "@/server/domain/content";

export const CONTENT_STATUS_LABEL: Record<ContentItemStatus, string> = {
  not_started: "Missing",
  submitted: "Awaiting review",
  changes_requested: "Needs clarification",
  accepted: "Accepted",
};

export const CONTENT_STATUS_TONE: Record<ContentItemStatus, "neutral" | "success" | "warning" | "info" | "danger"> = {
  not_started: "warning",
  submitted: "info",
  changes_requested: "warning",
  accepted: "success",
};
