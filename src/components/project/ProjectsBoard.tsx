"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { STAGE_ORDER, STAGE_LABELS, type Stage } from "@/server/domain/stage";
import { formatDate } from "@/lib/format";
import { Field } from "../ui/Field";
import { Select } from "../ui/Select";
import type { Project } from "@/server/domain/project";

export interface ProjectsBoardProps {
  projects: Project[];
}

/**
 * Figma (5:104) only gave bullet colors for Proposal/Deposit/Content/Design/
 * Development — Brief/Launch/Handover are invented to extend the same
 * palette (warm start, teal launch, neutral close). See DESIGN_NOTES.
 */
const STAGE_DOT_COLOR: Record<Stage, string> = {
  brief: "#f2b84b",
  proposal: "#a3adc7",
  deposit: "#7aa3f7",
  content: "#b89cf7",
  design: "#73c79e",
  development: "#eb878f",
  launch: "#4fd1c5",
  handover: "#9ca3af",
};

export function ProjectsBoard({ projects }: ProjectsBoardProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");

  const statusOptions = useMemo(
    () => Array.from(new Set(projects.map((p) => p.statusLabel))).sort(),
    [projects],
  );
  const assigneeOptions = useMemo(
    () => Array.from(new Set(projects.map((p) => p.assigneeName))).sort(),
    [projects],
  );

  const filtered = projects.filter((project) => {
    const query = search.trim().toLowerCase();
    const matchesSearch =
      !query || project.name.toLowerCase().includes(query) || project.clientName.toLowerCase().includes(query);
    const matchesStatus = statusFilter === "all" || project.statusLabel === statusFilter;
    const matchesStage = stageFilter === "all" || project.stage === stageFilter;
    const matchesAssignee = assigneeFilter === "all" || project.assigneeName === assigneeFilter;
    return matchesSearch && matchesStatus && matchesStage && matchesAssignee;
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field
          label="Search client / project"
          hideLabel
          placeholder="Search client / project"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          inputClassName="h-11"
        />
        <Select
          label="Status"
          hideLabel
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[{ value: "all", label: "Status: All" }, ...statusOptions.map((s) => ({ value: s, label: s }))]}
          selectClassName="h-11"
        />
        <Select
          label="Stage"
          hideLabel
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          options={[
            { value: "all", label: "Stage: All" },
            ...STAGE_ORDER.map((stage) => ({ value: stage, label: STAGE_LABELS[stage] })),
          ]}
          selectClassName="h-11"
        />
        <Select
          label="Assignee"
          hideLabel
          value={assigneeFilter}
          onChange={(e) => setAssigneeFilter(e.target.value)}
          options={[{ value: "all", label: "Assignee: All" }, ...assigneeOptions.map((a) => ({ value: a, label: a }))]}
          selectClassName="h-11"
        />
      </div>

      <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2">
        {STAGE_ORDER.map((stage) => {
          const cards = filtered.filter((p) => p.stage === stage);
          return (
            <div key={stage} className="flex w-[85vw] shrink-0 snap-start flex-col gap-2 sm:w-[260px]">
              <div className="flex h-[42px] items-center gap-2 rounded-xl bg-[#1e1e24] p-[10px]">
                <span className="text-base" style={{ color: STAGE_DOT_COLOR[stage] }}>
                  ●
                </span>
                <p className="font-heading text-sm font-semibold text-ink">{STAGE_LABELS[stage]}</p>
                <p className="ml-auto text-xs text-ink-secondary">{cards.length}</p>
              </div>

              <div className="flex flex-col gap-2">
                {cards.map((project) => (
                  <Link
                    key={project.id}
                    href={`/agency/projects/${project.id}`}
                    className="flex flex-col gap-1.5 rounded-xl bg-[#1e1e24] p-[10px] hover:bg-line"
                  >
                    <p className="font-heading text-sm font-semibold text-ink">{project.name}</p>
                    <p className="text-xs text-ink-secondary">{project.clientName}</p>
                    <p className="text-xs text-ink-secondary">{project.statusLabel}</p>
                    <p className="text-xs text-ink-secondary">{project.assigneeName}</p>
                    <p className="text-[11px] text-ink-secondary">
                      Due · {formatDate(project.dueDate)} · {project.openRevisions} open revisions
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
