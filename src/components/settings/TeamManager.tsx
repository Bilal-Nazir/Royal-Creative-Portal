"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import type { AgencyUser, AgencyRole } from "@/server/domain/user";

const ROLE_LABELS: Record<AgencyRole, string> = { owner: "Owner", admin: "Admin", member: "Team member" };

export interface TeamManagerProps {
  initialTeam: AgencyUser[];
  currentUserId: string;
  isOwner: boolean;
}

export function TeamManager({ initialTeam, currentUserId, isOwner }: TeamManagerProps) {
  const router = useRouter();
  const [team, setTeam] = useState(initialTeam);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [roleValue, setRoleValue] = useState<AgencyRole>("member");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteSentTo, setInviteSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleInvite(formData: FormData) {
    setBusy(true);
    setError(null);
    const response = await fetch("/api/agency/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        email: formData.get("email"),
        agencyRole: formData.get("agencyRole"),
      }),
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok || !data.ok) {
      setError(data.error ?? "Couldn't invite that person.");
      return;
    }
    // Not a real team member yet — they only show up in `team` once they accept the invite and sign in for the first time.
    setInviteSentTo(data.invite.email as string);
    setInviting(false);
  }

  async function handleSaveRole(userId: string) {
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/agency/team/${userId}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agencyRole: roleValue }),
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok || !data.ok) {
      setError(data.error ?? "Couldn't change that role.");
      return;
    }
    setTeam((prev) => prev.map((u) => (u.id === userId ? { ...u, agencyRole: roleValue } : u)));
    setEditingId(null);
  }

  async function handleRemove(userId: string) {
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/agency/team/${userId}`, { method: "DELETE" });
    const data = await response.json();
    setBusy(false);
    if (!response.ok || !data.ok) {
      setError(data.error ?? "Couldn't remove that person.");
      return;
    }
    setTeam((prev) => prev.filter((u) => u.id !== userId));
    router.refresh();
  }

  return (
    <Card className="flex flex-col gap-4 p-6">
      <h2 className="font-heading text-xl font-semibold text-ink">Team &amp; access</h2>
      <p className="text-sm text-ink-secondary">Manage who can access the workspace and its projects.</p>

      <div className="flex flex-col gap-2">
        {team.map((member) => (
          <div key={member.id} className="flex flex-wrap items-center justify-between gap-3 rounded-rc-control bg-surface-2 p-4">
            <p className="text-[13px] font-medium text-ink">{member.name}</p>
            {editingId === member.id ? (
              <div className="flex items-center gap-2">
                <Select
                  label="Role"
                  hideLabel
                  value={roleValue}
                  onChange={(e) => setRoleValue(e.target.value as AgencyRole)}
                  options={[
                    { value: "owner", label: "Owner" },
                    { value: "admin", label: "Admin" },
                    { value: "member", label: "Team member" },
                  ]}
                  selectClassName="h-9"
                />
                <Button variant="primary" className="h-9 w-[90px] px-3 text-xs" onClick={() => handleSaveRole(member.id)} disabled={busy}>
                  Save
                </Button>
              </div>
            ) : (
              <p className="text-xs text-ink-secondary">
                {ROLE_LABELS[member.agencyRole]} · {member.agencyRole === "owner" || member.agencyRole === "admin" ? "All projects" : "Assigned projects"}
              </p>
            )}
            <div className="flex gap-2">
              {isOwner ? (
                <Button
                  variant="secondary"
                  className="w-[120px]"
                  onClick={() => {
                    setEditingId(member.id);
                    setRoleValue(member.agencyRole);
                  }}
                >
                  Edit access
                </Button>
              ) : null}
              {member.id !== currentUserId ? (
                <Button variant="secondary" className="w-[100px]" onClick={() => handleRemove(member.id)} disabled={busy}>
                  Remove
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {inviting ? (
        <form
          action={(formData) => handleInvite(formData)}
          className="flex flex-col gap-3 rounded-rc-control bg-surface-2 p-4 sm:flex-row sm:items-end"
        >
          <Field label="Name" name="name" placeholder="Full name" containerClassName="sm:max-w-[200px]" />
          <Field label="Email" name="email" type="email" placeholder="name@royalcreative.co" containerClassName="sm:max-w-[220px]" />
          <Select
            label="Role"
            name="agencyRole"
            options={[
              { value: "admin", label: "Admin" },
              { value: "member", label: "Team member" },
            ]}
          />
          <Button type="submit" variant="primary" disabled={busy} className="w-[140px]">
            Send invite
          </Button>
        </form>
      ) : (
        <Button variant="primary" className="w-[196px]" onClick={() => setInviting(true)}>
          Invite employee
        </Button>
      )}

      {inviteSentTo ? <p className="text-sm text-ink-secondary">Invite sent to {inviteSentTo}.</p> : null}
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </Card>
  );
}
