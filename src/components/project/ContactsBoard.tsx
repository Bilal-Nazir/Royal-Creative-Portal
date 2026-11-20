"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Field } from "../ui/Field";
import { Select } from "../ui/Select";
import { Button } from "../ui/Button";
import type { Contact, ContactStage } from "@/server/domain/contact";

export interface ContactsBoardProps {
  contacts: Contact[];
  stages: ContactStage[];
}

export function ContactsBoard({ contacts: initialContacts, stages }: ContactsBoardProps) {
  const router = useRouter();
  const [contacts, setContacts] = useState(initialContacts);
  const [search, setSearch] = useState("");

  const filtered = contacts.filter((c) => {
    const query = search.trim().toLowerCase();
    return !query || c.name.toLowerCase().includes(query) || c.email.toLowerCase().includes(query) || c.company.toLowerCase().includes(query);
  });

  async function moveContact(contactId: string, stageId: string) {
    setContacts((prev) => prev.map((c) => (c.id === contactId ? { ...c, stageId } : c)));
    const response = await fetch(`/api/contacts/${contactId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stageId }),
    });
    if (!response.ok) router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Field
          label="Search name / email"
          hideLabel
          placeholder="Search name / email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          containerClassName="sm:max-w-[320px]"
        />
        <Button href="/agency/contacts/settings" variant="secondary" className="w-[180px]">
          Contact settings
        </Button>
      </div>

      <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2">
        {stages.map((stage) => {
          const cards = filtered.filter((c) => c.stageId === stage.id);
          return (
            <div key={stage.id} className="flex w-[85vw] shrink-0 snap-start flex-col gap-2 sm:w-[260px]">
              <div className="flex h-[42px] items-center gap-2 rounded-xl bg-[#1e1e24] p-[10px]">
                <span className="text-base" style={{ color: stage.color }}>
                  ●
                </span>
                <p className="font-heading text-sm font-semibold text-ink">{stage.name}</p>
                <p className="ml-auto text-xs text-ink-secondary">{cards.length}</p>
              </div>

              <div className="flex flex-col gap-2">
                {cards.map((contact) => (
                  <div key={contact.id} className="flex flex-col gap-1.5 rounded-xl bg-[#1e1e24] p-[10px]">
                    <Link href={`/agency/contacts/${contact.id}`} className="flex flex-col gap-1">
                      <p className="font-heading text-sm font-semibold text-ink hover:underline">{contact.name}</p>
                      <p className="text-xs text-ink-secondary">{contact.company}</p>
                      <p className="text-xs text-ink-secondary">{contact.email}</p>
                      <p className="text-[11px] text-ink-secondary">
                        {contact.ownerName ? `Owner · ${contact.ownerName}` : "Unassigned"}
                      </p>
                    </Link>
                    <Select
                      label="Move to"
                      hideLabel
                      value={contact.stageId}
                      onChange={(e) => moveContact(contact.id, e.target.value)}
                      options={stages.map((s) => ({ value: s.id, label: s.name }))}
                      selectClassName="h-9 text-xs"
                    />
                  </div>
                ))}
              </div>

              <Button href="/agency/contacts/new" variant="secondary" className="h-11 w-full border border-dashed border-line bg-transparent">
                + Add contact
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
