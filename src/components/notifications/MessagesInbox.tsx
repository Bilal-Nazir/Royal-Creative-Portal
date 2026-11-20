"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { ChatPanel, type ChatMessageView } from "@/components/project/ChatPanel";
import { cn } from "@/lib/utils";

export interface ConversationListItem {
  projectId: string;
  projectName: string;
  counterpartName: string;
  lastMessageBody: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface MessagesInboxProps {
  conversations: ConversationListItem[];
  viewerUserId: string;
  readOnly: boolean;
  /** "/agency/projects/" (agency) or "/projects/" (client) — for the "Open project" link. */
  projectHrefPrefix: string;
  /** Client projects have no bare `/projects/[id]` page — pass "/brief" to land somewhere real. */
  projectHrefSuffix?: string;
}

function listTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  const daysAgo = Math.round((now.getTime() - date.getTime()) / 86_400_000);
  if (daysAgo < 7) return date.toLocaleDateString("en-GB", { weekday: "long" });
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function MessagesInbox({
  conversations: initialConversations,
  viewerUserId,
  readOnly,
  projectHrefPrefix,
  projectHrefSuffix = "",
}: MessagesInboxProps) {
  const [conversations, setConversations] = useState(initialConversations);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [search, setSearch] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageView[]>([]);
  const [loading, setLoading] = useState(false);

  const unreadTotal = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return conversations
      .filter((c) => (filter === "unread" ? c.unreadCount > 0 : true))
      .filter(
        (c) =>
          !query ||
          c.counterpartName.toLowerCase().includes(query) ||
          c.projectName.toLowerCase().includes(query) ||
          c.lastMessageBody.toLowerCase().includes(query),
      );
  }, [conversations, filter, search]);

  const selected = conversations.find((c) => c.projectId === selectedProjectId) ?? null;

  async function selectConversation(projectId: string) {
    setSelectedProjectId(projectId);
    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/messages`);
      const data = await response.json();
      if (response.ok && data.ok) setMessages(data.messages);
      await fetch(`/api/projects/${projectId}/messages/read`, { method: "POST" });
      setConversations((prev) => prev.map((c) => (c.projectId === projectId ? { ...c, unreadCount: 0 } : c)));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="flex flex-col gap-4 p-6 lg:flex-row lg:gap-0 lg:p-0">
      <div className="flex w-full flex-col gap-4 border-line p-6 lg:w-[320px] lg:shrink-0 lg:border-r">
        <h2 className="font-heading text-xl font-semibold text-ink">Conversations</h2>
        <Field
          label="Search clients or messages"
          hideLabel
          placeholder="Search clients or messages"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex gap-4 text-xs text-ink-secondary">
          <button type="button" onClick={() => setFilter("all")} className={cn(filter === "all" && "font-medium text-ink")}>
            All · {conversations.length}
          </button>
          <button type="button" onClick={() => setFilter("unread")} className={cn(filter === "unread" && "font-medium text-ink")}>
            Unread · {unreadTotal}
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {visible.length === 0 ? (
            <p className="text-sm text-ink-secondary">No conversations match.</p>
          ) : (
            visible.map((c) => (
              <button
                key={c.projectId}
                type="button"
                onClick={() => selectConversation(c.projectId)}
                className={cn(
                  "flex flex-col gap-1 rounded-rc-control p-4 text-left hover:bg-line",
                  c.projectId === selectedProjectId ? "bg-line" : "bg-surface-2",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13px] font-medium text-ink">
                    {c.counterpartName} · {c.projectName}
                  </p>
                  {c.unreadCount > 0 ? (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-rose px-1.5 text-[11px] font-semibold text-white">
                      {c.unreadCount}
                    </span>
                  ) : null}
                </div>
                <p className="truncate text-xs text-ink-secondary">{c.lastMessageBody}</p>
                <p className="text-xs text-ink-secondary">{listTimestamp(c.lastMessageAt)}</p>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex w-full flex-1 flex-col gap-4 p-6">
        {!selected ? (
          <div className="flex flex-1 flex-col justify-center gap-2 py-16 text-center">
            <h3 className="font-heading text-xl font-semibold text-ink">Select a client to start</h3>
            <p className="text-sm text-ink-secondary">
              Your conversation will open here. Project approvals and revision submissions stay attached to their project.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-heading text-xl font-semibold text-ink">{selected.counterpartName}</h3>
                <p className="text-xs text-ink-secondary">Project: {selected.projectName}</p>
              </div>
              <Button href={`${projectHrefPrefix}${selected.projectId}${projectHrefSuffix}`} variant="secondary" className="w-[160px]">
                Open project
              </Button>
            </div>
            {loading ? (
              <p className="text-sm text-ink-secondary">Loading…</p>
            ) : (
              <ChatPanel
                key={selected.projectId}
                projectId={selected.projectId}
                initialMessages={messages}
                viewerUserId={viewerUserId}
                readOnly={readOnly}
              />
            )}
          </>
        )}
      </div>
    </Card>
  );
}
