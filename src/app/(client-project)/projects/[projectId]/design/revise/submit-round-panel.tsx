"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ListRow } from "@/components/ui/ListRow";
import { pinLabel } from "@/server/domain/design";

export interface DraftCommentView {
  id: string;
  number: number;
  title?: string;
  body: string;
}

export interface SubmitRoundPanelProps {
  projectId: string;
  versionId: string;
  versionLabel: string;
  nextRoundNumber: number;
  comments: DraftCommentView[];
}

export function SubmitRoundPanel({ projectId, versionId, versionLabel, nextRoundNumber, comments }: SubmitRoundPanelProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/design/versions/${versionId}/revision-rounds`, { method: "POST" });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setError(data.error ?? "Couldn't submit this revision round.");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Couldn't submit this revision round.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <>
        <Badge>Submitted</Badge>
        <Card className="flex flex-col gap-4 p-6">
          <h2 className="font-heading text-xl font-semibold text-ink">Revision round {nextRoundNumber}</h2>
          <ListRow
            title={`${comments.length} comments submitted`}
            subtitle={`${versionLabel} · Submitted just now`}
            trailing={<Badge>With Royal Creative</Badge>}
          />
          <ListRow
            title="Next step"
            subtitle="Your project lead will review and assign the work"
            trailing={<Badge>Under review</Badge>}
          />
          <Button href={`/projects/${projectId}/design`} variant="primary" className="w-[196px]">
            View project overview
          </Button>
        </Card>
      </>
    );
  }

  return (
    <>
      <Badge>Ready to submit</Badge>
      <Card className="flex flex-col gap-4 p-6">
        <h2 className="font-heading text-xl font-semibold text-ink">{versionLabel}</h2>
        {comments.map((comment) => (
          <ListRow key={comment.id} title={pinLabel(comment)} subtitle={comment.body} />
        ))}
        <div className="flex gap-3">
          <Button type="button" variant="primary" disabled={submitting} onClick={handleSubmit} className="w-[196px]">
            {submitting ? "Submitting…" : "Submit revision round"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.push(`/projects/${projectId}/design`)} className="w-[196px]">
            Continue editing
          </Button>
        </div>
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}
      </Card>
      <Card className="flex flex-col gap-2 p-6">
        <h2 className="font-heading text-xl font-semibold text-ink">After you submit</h2>
        <p className="text-sm text-ink-secondary">
          Royal Creative is notified. Your submitted comments remain attached to this version. New feedback will be identified
          separately.
        </p>
      </Card>
    </>
  );
}
