"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { FileDropField, type UploadedFileRef } from "@/components/project/FileDropField";

export function ContentSubmissionForm({ projectId, checklistItemId }: { projectId: string; checklistItemId: string }) {
  const router = useRouter();
  const [files, setFiles] = useState<UploadedFileRef[]>([]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/content/items/${checklistItemId}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileIds: files.map((f) => f.id), notes: notes || undefined }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setError(data.error ?? "Couldn't submit this item.");
        return;
      }
      router.refresh();
    } catch {
      setError("Couldn't submit this item.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <FileDropField
        projectId={projectId}
        scope="content"
        label="Files"
        placeholder="Drop files here or browse"
        onFilesChange={setFiles}
      />
      <Field
        label="Description (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Tell us which pages these assets are for"
      />
      <Button type="button" variant="primary" disabled={submitting} onClick={handleSubmit} className="w-[196px]">
        {submitting ? "Submitting…" : "Submit for review"}
      </Button>
      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
