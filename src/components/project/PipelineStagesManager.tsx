"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field } from "../ui/Field";
import { Button } from "../ui/Button";
import { ColorSwatchPicker } from "../ui/ColorSwatchPicker";
import { CONTACT_STAGE_COLORS } from "@/server/domain/contact";
import { cn } from "@/lib/utils";

export interface StageRow {
  id: string;
  name: string;
  color: string;
  contactCount: number;
}

export interface PipelineStagesManagerProps {
  initialStages: StageRow[];
}

export function PipelineStagesManager({ initialStages }: PipelineStagesManagerProps) {
  const router = useRouter();
  const [stages, setStages] = useState(initialStages);
  const [newStageName, setNewStageName] = useState("");
  const [newStageColor, setNewStageColor] = useState(CONTACT_STAGE_COLORS[0]);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleAddStage() {
    if (!newStageName.trim()) return;
    setBusy(true);
    setError(null);
    const response = await fetch("/api/contact-stages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newStageName.trim(), color: newStageColor }),
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok || !data.ok) {
      setError(data.error ?? "Couldn't add that stage.");
      return;
    }
    setStages((prev) => [...prev, { ...data.stage, contactCount: 0 }]);
    setNewStageName("");
    setNewStageColor(CONTACT_STAGE_COLORS[0]);
  }

  async function handleRename(id: string) {
    if (!renameValue.trim()) return;
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/contact-stages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: renameValue.trim() }),
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok || !data.ok) {
      setError(data.error ?? "Couldn't rename that stage.");
      return;
    }
    setStages((prev) => prev.map((s) => (s.id === id ? { ...s, name: data.stage.name } : s)));
    setRenamingId(null);
  }

  async function handleReorder(index: number, direction: -1 | 1) {
    const next = [...stages];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setStages(next);
    await fetch("/api/contact-stages/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: next.map((s) => s.id) }),
    });
  }

  async function handleDelete(id: string) {
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/contact-stages/${id}`, { method: "DELETE" });
    const data = await response.json();
    setBusy(false);
    if (!response.ok || !data.ok) {
      setError(data.error ?? "Couldn't delete that stage.");
      return;
    }
    setStages((prev) => prev.filter((s) => s.id !== id));
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4 rounded-rc border border-line bg-surface p-6">
      <h2 className="font-heading text-xl font-semibold text-ink">Pipeline stages</h2>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field
          label="Stage name"
          hideLabel
          placeholder="Stage name"
          value={newStageName}
          onChange={(e) => setNewStageName(e.target.value)}
          containerClassName="sm:max-w-[280px]"
        />
        <ColorSwatchPicker colors={CONTACT_STAGE_COLORS} value={newStageColor} onChange={setNewStageColor} />
        <Button variant="secondary" className="w-[140px]" onClick={handleAddStage} disabled={busy}>
          + Add stage
        </Button>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        {stages.map((stage, index) => (
          <div key={stage.id} className="flex items-center gap-3 rounded-rc-control bg-surface-2 p-4">
            <span style={{ color: stage.color }}>●</span>
            {renamingId === stage.id ? (
              <Field
                label="Stage name"
                hideLabel
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                containerClassName="flex-1"
              />
            ) : (
              <p className="flex-1 text-[13px] font-medium text-ink">{stage.name}</p>
            )}
            <p className="text-xs text-ink-secondary">
              {stage.contactCount} contact{stage.contactCount === 1 ? "" : "s"}
            </p>
            <div className="flex gap-1.5">
              <button
                type="button"
                aria-label="Move up"
                onClick={() => handleReorder(index, -1)}
                disabled={index === 0}
                className={cn("flex size-8 items-center justify-center rounded-rc-control bg-surface text-ink", index === 0 && "opacity-30")}
              >
                ↑
              </button>
              <button
                type="button"
                aria-label="Move down"
                onClick={() => handleReorder(index, 1)}
                disabled={index === stages.length - 1}
                className={cn(
                  "flex size-8 items-center justify-center rounded-rc-control bg-surface text-ink",
                  index === stages.length - 1 && "opacity-30",
                )}
              >
                ↓
              </button>
              {renamingId === stage.id ? (
                <Button variant="primary" className="h-8 w-[90px] px-3 text-xs" onClick={() => handleRename(stage.id)} disabled={busy}>
                  Save
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  className="h-8 w-[90px] px-3 text-xs"
                  onClick={() => {
                    setRenamingId(stage.id);
                    setRenameValue(stage.name);
                  }}
                >
                  Rename
                </Button>
              )}
              <Button
                variant="secondary"
                className="h-8 w-[90px] px-3 text-xs"
                onClick={() => handleDelete(stage.id)}
                disabled={busy || stage.contactCount > 0}
                title={stage.contactCount > 0 ? "Move or remove every contact in this stage first" : undefined}
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
