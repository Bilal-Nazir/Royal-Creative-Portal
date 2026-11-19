"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/Select";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

const WORKFLOW_STATUSES = [
  { value: "submitted", label: "Submitted" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
];

export interface TrackingFormProps {
  projectId: string;
  roundId: string;
  assignees: Array<{ id: string; name: string }>;
  initialAssigneeId?: string;
  initialTargetDate?: string;
  initialWorkflowStatus: string;
}

export function TrackingForm({ projectId, roundId, assignees, initialAssigneeId, initialTargetDate, initialWorkflowStatus }: TrackingFormProps) {
  const router = useRouter();
  const [assigneeId, setAssigneeId] = useState(initialAssigneeId ?? "");
  const [targetDate, setTargetDate] = useState(initialTargetDate ?? "");
  const [workflowStatus, setWorkflowStatus] = useState(initialWorkflowStatus);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const assigneeName = assignees.find((a) => a.id === assigneeId)?.name;
      const response = await fetch(`/api/projects/${projectId}/design/revision-rounds/${roundId}/tracking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigneeId: assigneeId || undefined, assigneeName, targetDate: targetDate || undefined, workflowStatus }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setError(data.error ?? "Couldn't update this round.");
        return;
      }
      router.refresh();
    } catch {
      setError("Couldn't update this round.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Select
        label="Assigned to"
        value={assigneeId}
        onChange={(e) => setAssigneeId(e.target.value)}
        placeholder="Select an assignee"
        options={assignees.map((a) => ({ value: a.id, label: a.name }))}
      />
      <Field label="Target date" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
      <Select
        label="Workflow status"
        value={workflowStatus}
        onChange={(e) => setWorkflowStatus(e.target.value)}
        options={WORKFLOW_STATUSES}
      />
      <Button type="button" variant="primary" disabled={submitting} onClick={handleSubmit} className="w-[220px]">
        {submitting ? "Updating…" : "Update revision status"}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
