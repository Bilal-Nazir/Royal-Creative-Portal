"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import type { ClientDirectoryEntry } from "@/server/repositories/in-memory/seed-data-phase2a";

export interface NewProjectFormProps {
  assignees: Array<{ id: string; name: string }>;
  clients: ClientDirectoryEntry[];
}

/** The client/contact selector isn't in Figma (5:283) — added so a project has a real client to attach to. See DESIGN_NOTES. */
export function NewProjectForm({ assignees, clients }: NewProjectFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const comment = String(formData.get("comment") ?? "").trim();
    const dueDate = String(formData.get("dueDate") ?? "").trim();
    const assigneeId = String(formData.get("assigneeId") ?? "").trim();
    const clientId = String(formData.get("clientId") ?? "").trim();

    if (!name || !dueDate || !assigneeId || !clientId) {
      setError("Fill in the project name, client, due date and assignee.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/agency/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, dueDate, assigneeId, clientId }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setError(data.error ?? "Couldn't create the project.");
        setSubmitting(false);
        return;
      }

      if (comment) {
        await fetch(`/api/projects/${data.project.id}/internal-comments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: comment }),
        });
      }

      router.push(`/agency/projects/${data.project.id}`);
      router.refresh();
    } catch {
      setError("Couldn't create the project.");
      setSubmitting(false);
    }
  }

  return (
    <Card className="flex flex-col gap-5 p-6">
      <h2 className="font-heading text-xl font-semibold text-ink">Project details</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Field label="Project name" id="name" name="name" placeholder="e.g. Royal Trendsy website" />

        <Select
          label="Client"
          id="clientId"
          name="clientId"
          placeholder="Select a client"
          options={clients.map((c) => ({ value: c.clientId, label: `${c.clientName} · ${c.contactName}` }))}
        />

        <Textarea
          label="Description"
          id="description"
          name="description"
          placeholder="What is this project about?"
          textareaClassName="h-[120px]"
        />

        <Textarea
          label="Comments (optional)"
          id="comment"
          name="comment"
          placeholder="Add a note for your team"
          textareaClassName="h-[88px]"
        />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Due date" id="dueDate" name="dueDate" type="date" />
          <Select
            label="Assignee"
            id="assigneeId"
            name="assigneeId"
            placeholder="Select an assignee"
            options={assignees.map((a) => ({ value: a.id, label: a.name }))}
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" variant="primary" disabled={submitting} className="w-[196px]">
            {submitting ? "Creating…" : "Create project"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.push("/agency/projects")} className="w-[180px]">
            Cancel
          </Button>
        </div>
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}
      </form>
    </Card>
  );
}
