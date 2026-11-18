"use client";

import { useState } from "react";
import Link from "next/link";
import { formatGBP, formatDate } from "@/lib/format";
import { Field } from "../ui/Field";
import { Select } from "../ui/Select";
import { Badge } from "../ui/Badge";
import { PaymentStatusMenu } from "./PaymentStatusMenu";
import type { InvoiceWithProject } from "@/server/services/invoice-service";
import type { InvoiceStatus } from "@/server/domain/invoice";

const STATUS_TONE: Record<InvoiceStatus, "neutral" | "success" | "warning" | "info" | "danger"> = {
  scheduled: "neutral",
  unpaid: "info",
  promised: "info",
  unverified: "info",
  partially_paid: "info",
  paid: "success",
  overdue: "warning",
};

export function InvoiceList({ rows }: { rows: InvoiceWithProject[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const statusOptions = Array.from(new Set(rows.map((r) => r.invoice.status))).sort();

  const filtered = rows.filter(({ invoice, project }) => {
    const query = search.trim().toLowerCase();
    const matchesSearch =
      !query ||
      project.clientName.toLowerCase().includes(query) ||
      project.name.toLowerCase().includes(query) ||
      invoice.invoiceNumber.toLowerCase().includes(query);
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field
          label="Search invoices"
          hideLabel
          placeholder="Search invoices"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          inputClassName="h-11"
        />
        <Select
          label="Status"
          hideLabel
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[{ value: "all", label: "Status: All" }, ...statusOptions.map((s) => ({ value: s, label: s.replace("_", " ") }))]}
          selectClassName="h-11"
        />
      </div>

      <div className="flex flex-col gap-2.5">
        {filtered.map(({ invoice, project }) => (
          <div key={invoice.id} className="flex items-center gap-4 rounded-[10px] bg-surface-2 p-3.5">
            <Link href={`/agency/projects/${project.id}/deposit`} className="flex flex-1 flex-col gap-1 hover:underline">
              <p className="text-[13px] font-medium text-ink">
                {project.clientName} · {invoice.type}
              </p>
              <p className="text-xs text-ink-secondary">
                {formatGBP(invoice.amount)} due · {formatDate(invoice.dueDate)} · {project.contactName}
              </p>
            </Link>
            <Badge tone={STATUS_TONE[invoice.status]}>{invoice.status.replace("_", " ")}</Badge>
            <PaymentStatusMenu invoiceId={invoice.id} />
          </div>
        ))}
        {filtered.length === 0 ? <p className="text-sm text-ink-secondary">No invoices match these filters.</p> : null}
      </div>
    </div>
  );
}
