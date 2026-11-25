"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Select } from "../ui/Select";
import { Field } from "../ui/Field";
import { Button } from "../ui/Button";
import { AssigneeChip } from "../ui/AssigneeChip";
import { AssigneePicker, type AssigneeOption } from "./AssigneePicker";
import { formatDate } from "@/lib/format";
import type { ProjectType } from "@/server/domain/project";

export interface ProjectDetailsEditorProps {
  projectId: string;
  clientId: string;
  clientName: string;
  projectType: ProjectType;
  projectTypes: readonly ProjectType[];
  dueDate: string;
  assigneeId: string;
  assigneeName: string;
  assignees: AssigneeOption[];
  clients: Array<{ clientId: string; clientName: string; contactName: string }>;
  /** Whether this session can edit these fields — owner/admin, or the assignee on their own project. Enforced again server-side. */
  canEdit: boolean;
}

/**
 * Fixes up the client/project type/due date a Jira-style quick-created
 * project (A15) had to guess — these fields have no other edit path anywhere
 * in the app (see project-service.ts's quickCreateProject).
 */
export function ProjectDetailsEditor({
  projectId,
  clientId,
  clientName,
  projectType,
  projectTypes,
  dueDate,
  assigneeId,
  assigneeName,
  assignees,
  clients,
  canEdit,
}: ProjectDetailsEditorProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draftClientId, setDraftClientId] = useState(clientId);
  const [draftProjectType, setDraftProjectType] = useState(projectType);
  const [draftDueDate, setDraftDueDate] = useState(dueDate);
  const [draftAssigneeId, setDraftAssigneeId] = useState(assigneeId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: draftClientId,
        projectType: draftProjectType,
        dueDate: draftDueDate,
        assigneeId: draftAssigneeId,
      }),
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok || !data.ok) {
      setError(data.error ?? "Couldn't save those details.");
      return;
    }
    setEditing(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-4">
          <AssigneeChip name={assigneeName} />
          <p className="text-sm text-ink-secondary">{clientName}</p>
          <p className="text-sm text-ink-secondary">{projectType}</p>
          <p className="text-sm text-ink-secondary">Due · {formatDate(dueDate)}</p>
        </div>
        {canEdit ? (
          <Button variant="secondary" className="h-9 w-[140px] px-3 text-xs" onClick={() => setEditing(true)}>
            Edit details
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Select
          label="Client"
          value={draftClientId}
          onChange={(e) => setDraftClientId(e.target.value)}
          options={clients.map((c) => ({ value: c.clientId, label: `${c.clientName} · ${c.contactName}` }))}
        />
        <Select
          label="Project type"
          value={draftProjectType}
          onChange={(e) => setDraftProjectType(e.target.value as ProjectType)}
          options={projectTypes.map((t) => ({ value: t, label: t }))}
        />
        <Field label="Due date" type="date" value={draftDueDate} onChange={(e) => setDraftDueDate(e.target.value)} />
        <div className="flex flex-col gap-2">
          <p className="text-sm text-ink-secondary">Assignee</p>
          <AssigneePicker assignees={assignees} value={draftAssigneeId} onChange={setDraftAssigneeId} />
        </div>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button variant="primary" className="h-9 w-[100px] px-3 text-xs" onClick={handleSave} disabled={busy}>
          Save
        </Button>
        <Button variant="secondary" className="h-9 w-[100px] px-3 text-xs" onClick={() => setEditing(false)} disabled={busy}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
