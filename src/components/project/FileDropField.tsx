"use client";

import { useRef, useState } from "react";
import type { UploadScope } from "@/server/domain/upload";

export interface UploadedFileRef {
  id: string;
  name: string;
}

export interface FileDropFieldProps {
  projectId: string;
  scope: UploadScope;
  label: string;
  placeholder: string;
  multiple?: boolean;
  accept?: string;
  onFilesChange: (files: UploadedFileRef[]) => void;
}

/** C11's "Drop files here or browse" / A10's "Updated review screenshots" — uploads through /api/files/upload, tracks the returned file ids. */
export function FileDropField({ projectId, scope, label, placeholder, multiple = true, accept, onFilesChange }: FileDropFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<UploadedFileRef[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded: UploadedFileRef[] = [];
      for (const file of Array.from(fileList)) {
        const formData = new FormData();
        formData.append("projectId", projectId);
        formData.append("scope", scope);
        formData.append("file", file);
        const response = await fetch("/api/files/upload", { method: "POST", body: formData });
        const data = await response.json();
        if (!response.ok || !data.ok) {
          setError(data.error ?? `Couldn't upload ${file.name}.`);
          continue;
        }
        uploaded.push({ id: data.file.id, name: data.file.originalName });
      }
      const next = multiple ? [...files, ...uploaded] : uploaded;
      setFiles(next);
      onFilesChange(next);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <label className="text-sm text-ink-secondary">{label}</label>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex h-[104px] w-full flex-col items-center justify-center gap-1 rounded-rc-control bg-surface-2 px-4 text-center disabled:opacity-60"
      >
        <span className="text-[13px] font-medium text-ink">{uploading ? "Uploading…" : placeholder}</span>
        {files.length > 0 ? (
          <span className="text-xs text-ink-secondary">{files.map((f) => f.name).join(", ")}</span>
        ) : null}
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        accept={accept}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
