"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field } from "../ui/Field";
import { Textarea } from "../ui/Textarea";
import { Button } from "../ui/Button";
import { FileDropField, type UploadedFileRef } from "./FileDropField";

export interface VersionSubmitFormProps {
  projectId: string;
  /** `/api/projects/{id}/design` (default) or `/api/projects/{id}/development`. */
  apiBasePath: string;
  /** Where to return to after sharing — the design or development hub. */
  redirectPath: string;
  /** Present when resubmitting (R05/R18) — absent for the first version (A10/A11). */
  respondsToRoundId?: string;
  isRevision: boolean;
  linkLabel: string;
  linkPlaceholder: string;
  screenshotLabel: string;
  screenshotPlaceholder: string;
  revisedScreenshotLabel: string;
  revisedScreenshotPlaceholder: string;
  whatChangedLabel: string;
  whatChangedPlaceholder: string;
  submitLabel: string;
  resubmitLabel: string;
}

/** A10/R05 (design) and A11/R18 (development) — shares the Figma/staging link + required screenshots + message form. */
export function VersionSubmitForm({
  projectId,
  apiBasePath,
  redirectPath,
  respondsToRoundId,
  isRevision,
  linkLabel,
  linkPlaceholder,
  screenshotLabel,
  screenshotPlaceholder,
  revisedScreenshotLabel,
  revisedScreenshotPlaceholder,
  whatChangedLabel,
  whatChangedPlaceholder,
  submitLabel,
  resubmitLabel,
}: VersionSubmitFormProps) {
  const router = useRouter();
  const [link, setLink] = useState("");
  const [message, setMessage] = useState("");
  const [whatChanged, setWhatChanged] = useState("");
  const [screenshots, setScreenshots] = useState<UploadedFileRef[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!link.trim()) {
      setError(`Add a ${linkLabel.toLowerCase()}.`);
      return;
    }
    if (screenshots.length === 0) {
      setError("Upload at least one review screenshot.");
      return;
    }
    if (isRevision && !whatChanged.trim()) {
      setError("Describe what changed.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`${apiBasePath}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          figmaLink: link,
          screenshotFileIds: screenshots.map((f) => f.id),
          message: message || undefined,
          whatChanged: isRevision ? whatChanged : undefined,
          respondsToRoundId,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setError(data.error ?? "Couldn't share this.");
        return;
      }
      router.push(redirectPath);
      router.refresh();
    } catch {
      setError("Couldn't share this.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Field label={linkLabel} value={link} onChange={(e) => setLink(e.target.value)} placeholder={linkPlaceholder} />
      <FileDropField
        projectId={projectId}
        scope="design-screenshot"
        label={isRevision ? revisedScreenshotLabel : screenshotLabel}
        placeholder={isRevision ? revisedScreenshotPlaceholder : screenshotPlaceholder}
        accept="image/png,image/jpeg,image/webp"
        onFilesChange={setScreenshots}
      />
      {isRevision ? (
        <Field label={whatChangedLabel} value={whatChanged} onChange={(e) => setWhatChanged(e.target.value)} placeholder={whatChangedPlaceholder} />
      ) : null}
      <Textarea
        label="Message to client (optional)"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Add context or tell the client what to test…"
        textareaClassName="bg-white text-[#14141a] placeholder:text-[#6b6b76]"
        rows={4}
      />
      <Button type="button" variant="primary" disabled={submitting} onClick={handleSubmit} className="w-[220px]">
        {submitting ? "Sharing…" : isRevision ? resubmitLabel : submitLabel}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
