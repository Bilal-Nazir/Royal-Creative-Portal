"use client";

import { useEffect, useState } from "react";
import { Card } from "../ui/Card";
import { Field } from "../ui/Field";
import { Button } from "../ui/Button";

export interface ChatMessageView {
  id: string;
  authorName: string;
  authorId: string;
  body: string;
}

export interface ChatPanelProps {
  projectId: string;
  initialMessages: ChatMessageView[];
  viewerUserId: string;
  /** R12 embeds this at sidebar width inside the review workspace; R10 renders it full-width standalone. */
  compact?: boolean;
  readOnly?: boolean;
  pollIntervalMs?: number;
  /** R09's "Discuss request" prefills the message box with a reference to the scope change. */
  initialDraft?: string;
}

/** R10/R12 — simple per-project chat, refreshed by polling (no websocket in this phase). */
export function ChatPanel({
  projectId,
  initialMessages,
  viewerUserId,
  compact = false,
  readOnly = false,
  pollIntervalMs = 5000,
  initialDraft = "",
}: ChatPanelProps) {
  const [messages, setMessages] = useState(initialMessages);
  const [body, setBody] = useState(initialDraft);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/messages`);
        const data = await response.json();
        if (response.ok && data.ok) setMessages(data.messages);
      } catch {
        // Silent — the next poll tries again; no need to surface a transient network blip.
      }
    }, pollIntervalMs);
    return () => clearInterval(interval);
  }, [projectId, pollIntervalMs]);

  async function handleSend() {
    if (!body.trim()) return;
    setSending(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setError(data.error ?? "Couldn't send that message.");
        return;
      }
      setMessages((prev) => [...prev, data.message]);
      setBody("");
    } catch {
      setError("Couldn't send that message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Card className={compact ? "flex w-full flex-col gap-4 p-6 lg:w-[324px] lg:shrink-0" : "flex w-full flex-col gap-4 p-6"}>
      <h2 className="font-heading text-xl font-semibold text-ink">Project conversation</h2>
      <div className="flex flex-col gap-2">
        {messages.map((message) => (
          <div key={message.id} className="flex flex-col gap-1 rounded-rc-control bg-surface-2 p-4">
            <p className="text-[13px] font-medium text-ink">{message.authorId === viewerUserId ? "You" : message.authorName}</p>
            <p className="text-xs text-ink-secondary">{message.body}</p>
          </div>
        ))}
        {messages.length === 0 ? <p className="text-sm text-ink-secondary">No messages yet.</p> : null}
      </div>
      {!readOnly ? (
        <>
          <Field
            label="Message"
            hideLabel
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write a message…"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSend();
            }}
          />
          <Button type="button" variant="primary" disabled={sending} onClick={handleSend} className="w-full">
            {sending ? "Sending…" : "Send message"}
          </Button>
        </>
      ) : (
        <p className="text-sm text-ink-secondary">Your Viewer role does not allow sending messages.</p>
      )}
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </Card>
  );
}
