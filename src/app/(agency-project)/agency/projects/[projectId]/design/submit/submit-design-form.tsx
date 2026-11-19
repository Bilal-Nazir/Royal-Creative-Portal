"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/Field";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { FileDropField, type UploadedFileRef } from "@/components/project/FileDropField";

export interface SubmitDesignFormProps {
  projectId: string;
  /** Present when resubmitting (R05) — absent for the first version (A10). */
  respondsToRoundId?: string;
  isRevision: boolean;
}

export function SubmitDesignForm({ projectId, respondsToRoundId, isRevision }: SubmitDesignFormProps) {
  const router = useRouter();
  const [figmaLink, setFigmaLink] = useState("");
  const [message, setMessage] = useState("");
  const [whatChanged, setWhatChanged] = useState("");
  const [screenshots, setScreenshots] = useState<UploadedFileRef[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!figmaLink.trim()) {
      setError("Add a Figma or preview link.");
      return;
    }
    if (screenshots.length === 0) {
      setError("Upload at least one review screenshot.");
      return;
    }
    if (isRevision && !whatChanged.trim()) {
      setError("Describe what changed in this revision.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/design/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          figmaLink,
          screenshotFileIds: screenshots.map((f) => f.id),
          message: message || undefined,
          whatChanged: isRevision ? whatChanged : undefined,
          respondsToRoundId,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setError(data.error ?? "Couldn't share this design.");
        return;
      }
      router.push(`/agency/projects/${projectId}/design`);
      router.refresh();
    } catch {
      setError("Couldn't share this design.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Field label="Figma link" value={figmaLink} onChange={(e) => setFigmaLink(e.target.value)} placeholder="https://figma.com/design/…" />
      <FileDropField
        projectId={projectId}
        scope="design-screenshot"
        label={isRevision ? "Updated review screenshots" : "Review screenshots"}
        placeholder={isRevision ? "Upload the revised desktop and mobile frames" : "Upload the desktop and mobile frames to review"}
        accept="image/png,image/jpeg,image/webp"
        onFilesChange={setScreenshots}
      />
      {isRevision ? (
        <Field
          label="What changed"
          value={whatChanged}
          onChange={(e) => setWhatChanged(e.target.value)}
          placeholder="Reduced the hero heading and replaced the company description."
        />
      ) : null}
      <Textarea
        label="Message to client (optional)"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Add context or tell the client what to review…"
        textareaClassName="bg-white text-[#14141a] placeholder:text-[#6b6b76]"
        rows={4}
      />
      <Button type="button" variant="primary" disabled={submitting} onClick={handleSubmit} className="w-[220px]">
        {submitting ? "Sharing…" : isRevision ? "Submit revised design" : "Share with client"}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
