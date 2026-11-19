"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Field } from "../ui/Field";
import { PinOverlay, type OverlayPin } from "./PinOverlay";
import { pinLabel, PIN_TITLE_MAX_LENGTH, type PinCommentStatus } from "@/server/domain/design";

export interface WorkspacePin {
  id: string;
  number: number;
  xPercent: number;
  yPercent: number;
  title?: string;
  body: string;
  isDraft: boolean;
  status: PinCommentStatus;
}

export interface DesignReviewWorkspaceProps {
  projectId: string;
  versionId: string;
  versionLabel: string;
  screenshotUrl: string;
  figmaLink: string;
  pins: WorkspacePin[];
  draftCount: number;
  /** Viewers (read-only role) can see pins and comments but not add, ask for changes, or approve. */
  readOnly?: boolean;
}

/**
 * The shared "screenshot + numbered pins + feedback sidebar" workspace used
 * by C12/R01 (first review), R06 (revised review), and embedded in R12
 * (review with the chat drawer open) — Figma's three review frames only
 * differ in header copy around this same block.
 */
export function DesignReviewWorkspace({
  projectId,
  versionId,
  versionLabel,
  screenshotUrl,
  figmaLink,
  pins,
  draftCount,
  readOnly = false,
}: DesignReviewWorkspaceProps) {
  const router = useRouter();
  const [pendingPin, setPendingPin] = useState<{ xPercent: number; yPercent: number } | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const overlayPins: OverlayPin[] = pins.map((p) => ({
    id: p.id,
    number: p.number,
    xPercent: p.xPercent,
    yPercent: p.yPercent,
    isDraft: p.isDraft,
    status: p.status,
  }));
  if (pendingPin) {
    overlayPins.push({ id: "pending", number: pins.length + 1, xPercent: pendingPin.xPercent, yPercent: pendingPin.yPercent, isDraft: true, status: "open" });
  }

  async function handleAddComment() {
    if (!pendingPin) {
      setError("Click a spot on the screenshot first, then write a comment.");
      return;
    }
    if (!draftBody.trim()) {
      setError("Write a comment for this pin.");
      return;
    }
    if (draftTitle.length > PIN_TITLE_MAX_LENGTH) {
      setError(`Pin title must be ${PIN_TITLE_MAX_LENGTH} characters or fewer.`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/design/versions/${versionId}/pins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...pendingPin, title: draftTitle || undefined, body: draftBody }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setError(data.error ?? "Couldn't add that pin.");
        return;
      }
      setPendingPin(null);
      setDraftTitle("");
      setDraftBody("");
      router.refresh();
    } catch {
      setError("Couldn't add that pin.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprove() {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/design/versions/${versionId}/approve`, { method: "POST" });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setError(data.error ?? "Couldn't approve this design.");
        setSubmitting(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Couldn't approve this design.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
      <Card className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-xl font-semibold text-ink">{versionLabel}</h2>
          <Button href={figmaLink} variant="secondary" className="w-[180px]">
            Open original ↗
          </Button>
        </div>
        <PinOverlay
          screenshotUrl={screenshotUrl}
          alt={`${versionLabel} screenshot`}
          pins={overlayPins}
          placing={!readOnly}
          onPlacePin={(xPercent, yPercent) => setPendingPin({ xPercent, yPercent })}
        />
        <p className="text-xs text-ink-secondary">
          {pins.length > 0 ? `Pins 1–${pins.length} identify feedback areas on this version.` : "Click anywhere on the screenshot to drop a numbered pin."}
        </p>
      </Card>

      <Card className="flex w-full flex-col gap-4 p-6 lg:w-[324px] lg:shrink-0">
        <h2 className="font-heading text-xl font-semibold text-ink">Feedback</h2>
        <p className="text-sm text-ink-secondary">{draftCount} draft comment{draftCount === 1 ? "" : "s"}</p>

        <div className="flex flex-col gap-2">
          {pins.map((pin) => (
            <div key={pin.id} className="flex flex-col gap-2 rounded-rc-control bg-surface-2 p-4">
              <div className="flex flex-col gap-1">
                <p className="text-[13px] font-medium text-ink">
                  {pinLabel(pin)}
                  {pin.isDraft ? " · Draft" : ""}
                </p>
                <p className="text-xs text-ink-secondary">{pin.body}</p>
              </div>
              <Badge>{pin.status.replace("_", " ")}</Badge>
            </div>
          ))}
          {pins.length === 0 ? <p className="text-sm text-ink-secondary">No comments yet.</p> : null}
        </div>

        {!readOnly ? (
          <>
            <p className="text-[13px] font-medium text-ink">Add feedback</p>
            {pendingPin ? (
              <Field
                label="Pin title (optional)"
                hideLabel
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                placeholder="Short label, e.g. Hero heading"
                maxLength={PIN_TITLE_MAX_LENGTH}
              />
            ) : null}
            <Field
              label="Comment"
              hideLabel
              value={draftBody}
              onChange={(e) => setDraftBody(e.target.value)}
              placeholder={pendingPin ? "Describe what should change…" : "Select an area, then write a comment…"}
            />
            <Button type="button" variant="secondary" disabled={submitting} onClick={handleAddComment} className="w-full">
              {submitting ? "Adding…" : "Add comment"}
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={submitting || draftCount === 0}
              onClick={() => router.push(`/projects/${projectId}/design/revise`)}
              className="w-full"
            >
              Ask for changes
            </Button>
            <Button type="button" variant="secondary" disabled={submitting} onClick={handleApprove} className="w-full">
              Approve design
            </Button>
          </>
        ) : (
          <p className="text-sm text-ink-secondary">Your Viewer role does not allow adding feedback or approving.</p>
        )}
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}
      </Card>
    </div>
  );
}
