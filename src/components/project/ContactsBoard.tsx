"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { Field } from "../ui/Field";
import { Select } from "../ui/Select";
import { Button } from "../ui/Button";
import { ColorSwatchPicker } from "../ui/ColorSwatchPicker";
import { readableTextColor } from "@/lib/utils";
import { CONTACT_STAGE_COLORS, type Contact, type ContactStage } from "@/server/domain/contact";

export interface ContactsBoardProps {
  contacts: Contact[];
  stages: ContactStage[];
}

export function ContactsBoard({ contacts: initialContacts, stages: initialStages }: ContactsBoardProps) {
  const router = useRouter();
  const [contacts, setContacts] = useState(initialContacts);
  const [stages, setStages] = useState(initialStages);
  const [addingList, setAddingList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [newListColor, setNewListColor] = useState(CONTACT_STAGE_COLORS[0]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function moveContact(contactId: string, stageId: string) {
    setContacts((prev) => prev.map((c) => (c.id === contactId ? { ...c, stageId } : c)));
    const response = await fetch(`/api/contacts/${contactId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stageId }),
    });
    if (!response.ok) router.refresh();
  }

  async function handleAddList() {
    if (!newListName.trim()) return;
    setBusy(true);
    setError(null);
    const response = await fetch("/api/contact-stages", {
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
    setStages((prev) => [...prev, data.stage]);
    setNewListName("");
    setNewListColor(CONTACT_STAGE_COLORS[0]);
    setAddingList(false);
  }

  async function handleDeleteList(stageId: string) {
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/contact-stages/${stageId}`, { method: "DELETE" });
    const data = await response.json();
    setBusy(false);
    if (!response.ok || !data.ok) {
      setError(data.error ?? "Couldn't delete that list.");
      return;
    }
    setStages((prev) => prev.filter((s) => s.id !== stageId));
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
        {stages.map((stage) => {
          const cards = contacts.filter((c) => c.stageId === stage.id);
          return (
            <div key={stage.id} className="flex w-[85vw] shrink-0 snap-start flex-col sm:w-[270px]">
              <div className="flex flex-col gap-1.5 rounded-lg bg-surface p-2">
                <div
                  className="flex h-9 shrink-0 items-center gap-2 rounded-md px-2.5"
                  style={{ backgroundColor: stage.color, color: readableTextColor(stage.color) }}
                >
                  <p className="text-sm font-semibold">{stage.name}</p>
                  <p className="ml-auto text-xs opacity-80">{cards.length}</p>
                  <button
                    type="button"
                    aria-label={`Delete ${stage.name} list`}
                    onClick={() => handleDeleteList(stage.id)}
                    disabled={busy || cards.length > 0}
                    title={cards.length > 0 ? "Move or remove every contact in this list first" : "Delete list"}
                    className="flex size-5 shrink-0 items-center justify-center rounded hover:bg-black/10 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <X size={13} />
                  </button>
                </div>

                <div className="flex flex-col gap-1.5">
                  {cards.map((contact) => (
                    <div
                      key={contact.id}
                      className="flex flex-col gap-1.5 rounded-md bg-[#232329] p-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.3)] transition-shadow hover:shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
                    >
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

                <Button href="/agency/contacts/new" variant="secondary" className="h-10 w-full bg-transparent hover:bg-black/10">
                  + Add contact
                </Button>
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
                placeholder="e.g. Lost"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                inputClassName="h-10"
                autoFocus
              />
              <ColorSwatchPicker colors={CONTACT_STAGE_COLORS} value={newListColor} onChange={setNewListColor} />
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
                    setNewListColor(CONTACT_STAGE_COLORS[0]);
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
