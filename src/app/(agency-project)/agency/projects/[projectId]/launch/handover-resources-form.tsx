"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ListRow } from "@/components/ui/ListRow";
import { FileDropField, type UploadedFileRef } from "@/components/project/FileDropField";
import type { HandoverResource } from "@/server/domain/handover-resource";

const TYPE_OPTIONS = [
  { value: "pdf", label: "PDF" },
  { value: "video", label: "Video" },
  { value: "link", label: "Link" },
];

/** A13's agency "Handover resources" section — no Figma screen for this (see DESIGN_NOTES). Add/remove resources: title, type, file or URL. */
export function HandoverResourcesForm({ projectId, resources }: { projectId: string; resources: HandoverResource[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"pdf" | "video" | "link">("pdf");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<UploadedFileRef | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    if (!title.trim()) {
      setError("Give this resource a title.");
      return;
    }
    if (!file && !url.trim()) {
      setError("Attach a file or provide a URL.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/handover/resources`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, type, fileId: file?.id, url: file ? undefined : url || undefined }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setError(data.error ?? "Couldn't add that resource.");
        return;
      }
      setTitle("");
      setUrl("");
      setFile(null);
      router.refresh();
    } catch {
      setError("Couldn't add that resource.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(resourceId: string) {
    await fetch(`/api/projects/${projectId}/handover/resources/${resourceId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {resources.map((resource) => (
        <ListRow
          key={resource.id}
          title={resource.title}
          subtitle={resource.type.toUpperCase()}
          trailing={
            <Button type="button" variant="secondary" onClick={() => handleRemove(resource.id)} className="w-[100px]">
              Remove
            </Button>
          }
        />
      ))}
      {resources.length === 0 ? <p className="text-sm text-ink-secondary">No resources added yet.</p> : null}

      <Badge>Add a resource</Badge>
      <Field label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Website guide" />
      <Select label="Type" value={type} onChange={(e) => setType(e.target.value as "pdf" | "video" | "link")} options={TYPE_OPTIONS} />
      <FileDropField projectId={projectId} scope="content" label="File (optional)" placeholder="Upload a file" multiple={false} onFilesChange={(files) => setFile(files[0] ?? null)} />
      <Field label="URL (optional, if not attaching a file)" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
      <Button type="button" variant="primary" disabled={submitting} onClick={handleAdd} className="w-[196px]">
        {submitting ? "Adding…" : "Add resource"}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
