"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { X, CornerDownLeft, MessageSquare } from "lucide-react";
import { cn, readableTextColor } from "@/lib/utils";
import { Button } from "../ui/Button";
import { Field } from "../ui/Field";
import { Avatar } from "../ui/Avatar";
import { ColorSwatchPicker } from "../ui/ColorSwatchPicker";
import { AssigneePicker, type AssigneeOption } from "./AssigneePicker";
import { boardColumnIdFor, BOARD_COLUMN_COLORS, type ProjectBoardColumn } from "@/server/domain/project-board";
import type { Project } from "@/server/domain/project";

export interface ProjectsBoardProps {
  projects: Project[];
  columns: ProjectBoardColumn[];
  assignees: AssigneeOption[];
  currentUserId: string;
  /** Internal team-comment count per project id — the Trello-style badge shown on a card once someone's added something. */
  commentCounts: Record<string, number>;
}

/** A15 — drag-and-drop kanban board. Dragging a card only moves it between columns (boardColumnId) — it never touches the real stage/journey machine, so it can't skip a gate. Columns are freely addable/removable, same as the Contacts pipeline. Cards are intentionally minimal (title + assignee + comment count) — every other detail lives on the project's own page. */
export function ProjectsBoard({ projects: initialProjects, columns: initialColumns, assignees, currentUserId, commentCounts }: ProjectsBoardProps) {
  const router = useRouter();
  const [projects, setProjects] = useState(initialProjects);
  const [columns, setColumns] = useState(initialColumns);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);
  const [addingList, setAddingList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [newListColor, setNewListColor] = useState(BOARD_COLUMN_COLORS[0]);
  const [creatingInColumnId, setCreatingInColumnId] = useState<string | null>(null);
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [newProjectAssigneeId, setNewProjectAssigneeId] = useState(currentUserId);
  const [creatingBusy, setCreatingBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function openQuickCreate(columnId: string) {
    setCreatingInColumnId(columnId);
    setNewProjectTitle("");
    setNewProjectAssigneeId(currentUserId);
  }

  function closeQuickCreate() {
    setCreatingInColumnId(null);
    setNewProjectTitle("");
    setNewProjectAssigneeId(currentUserId);
  }

  async function handleQuickCreate() {
    if (!newProjectTitle.trim() || !creatingInColumnId) return;
    setCreatingBusy(true);
    setError(null);
    const response = await fetch("/api/agency/projects/quick-create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newProjectTitle.trim(), assigneeId: newProjectAssigneeId, boardColumnId: creatingInColumnId }),
    });
    const data = await response.json();
    setCreatingBusy(false);
    if (!response.ok || !data.ok) {
      setError(data.error ?? "Couldn't create the project.");
      return;
    }
    setProjects((prev) => [...prev, data.project]);
    closeQuickCreate();
  }

  async function moveProject(projectId: string, columnId: string) {
    const project = projects.find((p) => p.id === projectId);
    if (!project || boardColumnIdFor(project) === columnId) return;

    setProjects((prev) => prev.map((p) => (p.id === projectId ? { ...p, boardColumnId: columnId } : p)));
    const response = await fetch(`/api/projects/${projectId}/board-column`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ columnId }),
    });
    if (!response.ok) router.refresh();
  }

  async function handleAddList() {
    if (!newListName.trim()) return;
    setBusy(true);
    setError(null);
    const response = await fetch("/api/project-board-columns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newListName.trim(), color: newListColor }),
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok || !data.ok) {
      setError(data.error ?? "Couldn't add that list.");
      return;
    }
    setColumns((prev) => [...prev, data.column]);
    setNewListName("");
    setNewListColor(BOARD_COLUMN_COLORS[0]);
    setAddingList(false);
  }

  async function handleDeleteList(columnId: string) {
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/project-board-columns/${columnId}`, { method: "DELETE" });
    const data = await response.json();
    setBusy(false);
    if (!response.ok || !data.ok) {
      setError(data.error ?? "Couldn't delete that list.");
      return;
    }
    setColumns((prev) => prev.filter((c) => c.id !== columnId));
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
        {columns.map((column) => {
          const cards = projects.filter((p) => boardColumnIdFor(p) === column.id);
          const isDragOver = dragOverColumnId === column.id;
          return (
            <div
              key={column.id}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverColumnId(column.id);
              }}
              onDragLeave={() => setDragOverColumnId((prev) => (prev === column.id ? null : prev))}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverColumnId(null);
                if (draggingId) moveProject(draggingId, column.id);
              }}
              className="flex w-[85vw] shrink-0 snap-start flex-col sm:w-[270px]"
            >
              <div className={cn("flex flex-col gap-1.5 rounded-lg bg-surface p-2", isDragOver && "ring-2 ring-line")}>
                <div
                  className="flex h-9 shrink-0 items-center gap-2 rounded-md px-2.5"
                  style={{ backgroundColor: column.color, color: readableTextColor(column.color) }}
                >
                  <p className="text-sm font-semibold">{column.name}</p>
                  <p className="ml-auto text-xs opacity-80">{cards.length}</p>
                  <button
                    type="button"
                    aria-label={`Delete ${column.name} list`}
                    onClick={() => handleDeleteList(column.id)}
                    disabled={busy || cards.length > 0}
                    title={cards.length > 0 ? "Move or remove every project in this list first" : "Delete list"}
                    className="flex size-5 shrink-0 items-center justify-center rounded hover:bg-black/10 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <X size={13} />
                  </button>
                </div>

                <div className="flex flex-col gap-1.5">
                  {cards.map((project) => {
                    const commentCount = commentCounts[project.id] ?? 0;
                    return (
                      <Link
                        key={project.id}
                        href={`/agency/projects/${project.id}`}
                        draggable
                        onDragStart={() => setDraggingId(project.id)}
                        onDragEnd={() => setDraggingId(null)}
                        className="flex cursor-grab flex-col gap-2 rounded-md bg-[#232329] p-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.3)] transition-shadow hover:shadow-[0_2px_8px_rgba(0,0,0,0.4)] active:cursor-grabbing"
                      >
                        <p className="text-sm font-medium text-ink">{project.name}</p>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1 text-xs text-ink-secondary">
                            {commentCount > 0 ? (
                              <>
                                <MessageSquare size={12} />
                                {commentCount}
                              </>
                            ) : null}
                          </span>
                          <Avatar name={project.assigneeName} size={22} />
                        </div>
                      </Link>
                    );
                  })}
                </div>

                {creatingInColumnId === column.id ? (
                  <div className="flex flex-col gap-2 rounded-md border-2 border-[#4c6ef5] bg-[#232329] p-2.5">
                    <Field
                      label="Project title"
                      hideLabel
                      placeholder="What needs to be done?"
                      value={newProjectTitle}
                      onChange={(e) => setNewProjectTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleQuickCreate();
                        }
                        if (e.key === "Escape") closeQuickCreate();
                      }}
                      inputClassName="h-10"
                      autoFocus
                    />
                    <div className="flex items-center justify-between">
                      <AssigneePicker assignees={assignees} value={newProjectAssigneeId} onChange={setNewProjectAssigneeId} />
                      <button
                        type="button"
                        aria-label="Create project"
                        onClick={handleQuickCreate}
                        disabled={creatingBusy || !newProjectTitle.trim()}
                        className="flex size-9 items-center justify-center rounded-md bg-surface-2 text-ink hover:bg-line disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <CornerDownLeft size={16} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => openQuickCreate(column.id)}
                    className="flex h-9 w-full items-center justify-center rounded-md text-sm text-ink-secondary hover:bg-black/10"
                  >
                    + Create project
                  </button>
                )}
              </div>
            </div>
          );
        })}

        <div className="flex w-[85vw] shrink-0 snap-start flex-col gap-2 sm:w-[270px]">
          {addingList ? (
            <div className="flex flex-col gap-2 rounded-md bg-[#232329] p-[10px]">
              <Field
                label="List name"
                hideLabel
                placeholder="e.g. Accepted"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                inputClassName="h-10"
                autoFocus
              />
              <ColorSwatchPicker colors={BOARD_COLUMN_COLORS} value={newListColor} onChange={setNewListColor} />
              <div className="flex gap-2">
                <Button variant="primary" className="h-9 flex-1 px-3 text-xs" onClick={handleAddList} disabled={busy}>
                  Add list
                </Button>
                <Button
                  variant="secondary"
                  className="h-9 px-3 text-xs"
                  onClick={() => {
                    setAddingList(false);
                    setNewListName("");
                    setNewListColor(BOARD_COLUMN_COLORS[0]);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="secondary"
              className="h-11 w-full border border-dashed border-line bg-transparent"
              onClick={() => setAddingList(true)}
            >
              + Add another list
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
