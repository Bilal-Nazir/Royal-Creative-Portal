import { contactStageRepository, contactRepository, contactActivityRepository } from "../repositories/container";
import { ok, forbidden, notFound, badRequest, type ServiceResult } from "./result";
import type { SessionPayload } from "../auth/session";
import { CONTACT_STAGE_COLORS, type Contact, type ContactStage, type ContactActivity, type ContactActivityType } from "../domain/contact";

function assertOwnerOrAdmin<T>(session: SessionPayload): ServiceResult<T> | null {
  if (session.role !== "agency") return forbidden("Only agency staff can manage the pipeline.");
  if (session.agencyRole !== "owner" && session.agencyRole !== "admin") {
    return forbidden("Only the owner or an admin can manage pipeline stages.");
  }
  return null;
}

export async function listStages(): Promise<ContactStage[]> {
  return contactStageRepository.listAll();
}

export async function createStage(session: SessionPayload, name: string, color?: string): Promise<ServiceResult<ContactStage>> {
  const denied = assertOwnerOrAdmin<ContactStage>(session);
  if (denied) return denied;
  if (!name.trim()) return badRequest("Give the stage a name.");

  const stages = await contactStageRepository.listAll();
  const stage: ContactStage = {
    id: `stage-${Date.now().toString(36)}`,
    name: name.trim(),
    order: stages.length,
    color: color && CONTACT_STAGE_COLORS.includes(color) ? color : CONTACT_STAGE_COLORS[stages.length % CONTACT_STAGE_COLORS.length],
  };
  await contactStageRepository.create(stage);
  return ok(stage);
}

export async function renameStage(session: SessionPayload, id: string, name: string): Promise<ServiceResult<ContactStage>> {
  const denied = assertOwnerOrAdmin<ContactStage>(session);
  if (denied) return denied;
  if (!name.trim()) return badRequest("Give the stage a name.");

  const stage = await contactStageRepository.findById(id);
  if (!stage) return notFound("Stage not found.");
  const updated: ContactStage = { ...stage, name: name.trim() };
  await contactStageRepository.update(updated);
  return ok(updated);
}

/** A30 — drag-free reordering: pass the full list of stage ids in the desired order. */
export async function reorderStages(session: SessionPayload, orderedIds: string[]): Promise<ServiceResult<ContactStage[]>> {
  const denied = assertOwnerOrAdmin<ContactStage[]>(session);
  if (denied) return denied;

  const stages = await contactStageRepository.listAll();
  const byId = new Map(stages.map((s) => [s.id, s]));
  const updated: ContactStage[] = [];
  for (let i = 0; i < orderedIds.length; i++) {
    const stage = byId.get(orderedIds[i]);
    if (!stage) continue;
    const next = { ...stage, order: i };
    updated.push(next);
    await contactStageRepository.update(next);
  }
  return ok(updated.sort((a, b) => a.order - b.order));
}

/** A stage can only be deleted when it's empty — explicit requirement. */
export async function deleteStage(session: SessionPayload, id: string): Promise<ServiceResult<null>> {
  const denied = assertOwnerOrAdmin<null>(session);
  if (denied) return denied;

  const stage = await contactStageRepository.findById(id);
  if (!stage) return notFound("Stage not found.");

  const contacts = await contactRepository.listAll();
  if (contacts.some((c) => c.stageId === id)) {
    return badRequest("Move or remove every contact in this stage before deleting it.");
  }

  await contactStageRepository.delete(id);
  return ok(null);
}

export async function listContacts(): Promise<Contact[]> {
  return contactRepository.listAll();
}

export async function getContact(id: string): Promise<Contact | null> {
  return contactRepository.findById(id);
}

async function logActivity(contactId: string, type: ContactActivityType, body: string): Promise<void> {
  const activity: ContactActivity = {
    id: `activity-${contactId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    contactId,
    type,
    body,
    createdAt: new Date().toISOString(),
  };
  await contactActivityRepository.create(activity);
}

export async function listContactActivity(contactId: string): Promise<ContactActivity[]> {
  return contactActivityRepository.listByContactId(contactId);
}

export interface CreateContactInput {
  name: string;
  email: string;
  company: string;
  phone?: string;
  stageId: string;
  ownerId?: string;
  ownerName?: string;
  nextFollowUpAt?: string;
  notes?: string;
}

export async function createContact(session: SessionPayload, input: CreateContactInput): Promise<ServiceResult<Contact>> {
  if (session.role !== "agency") return forbidden("Only agency staff can add contacts.");
  if (!input.name.trim() || !input.email.trim() || !input.stageId) return badRequest("Fill in name, email and a pipeline stage.");

  const stage = await contactStageRepository.findById(input.stageId);
  if (!stage) return badRequest("Unknown pipeline stage.");

  const contact: Contact = {
    id: `contact-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name: input.name.trim(),
    email: input.email.trim(),
    company: input.company.trim(),
    phone: input.phone?.trim() || undefined,
    stageId: input.stageId,
    ownerId: input.ownerId,
    ownerName: input.ownerName,
    nextFollowUpAt: input.nextFollowUpAt || undefined,
    notes: input.notes?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };
  await contactRepository.create(contact);
  await logActivity(contact.id, "enquiry_received", "Enquiry received");
  return ok(contact);
}

export interface UpdateContactInput {
  stageId?: string;
  ownerId?: string;
  ownerName?: string;
  nextFollowUpAt?: string;
  notes?: string;
  proposalProjectId?: string;
}

export async function updateContact(session: SessionPayload, id: string, patch: UpdateContactInput): Promise<ServiceResult<Contact>> {
  if (session.role !== "agency") return forbidden("Only agency staff can update contacts.");

  const contact = await contactRepository.findById(id);
  if (!contact) return notFound("Contact not found.");

  if (patch.stageId && patch.stageId !== contact.stageId) {
    const stage = await contactStageRepository.findById(patch.stageId);
    if (!stage) return badRequest("Unknown pipeline stage.");
    await logActivity(id, "stage_change", `Moved to ${stage.name}`);
  }

  const updated: Contact = { ...contact, ...patch };
  await contactRepository.update(updated);
  return ok(updated);
}

export async function logFollowUp(session: SessionPayload, id: string, body: string): Promise<ServiceResult<ContactActivity>> {
  if (session.role !== "agency") return forbidden("Only agency staff can log follow-ups.");
  if (!body.trim()) return badRequest("Write a note first.");

  const contact = await contactRepository.findById(id);
  if (!contact) return notFound("Contact not found.");

  const activity: ContactActivity = {
    id: `activity-${id}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    contactId: id,
    type: "follow_up_logged",
    body: body.trim(),
    createdAt: new Date().toISOString(),
  };
  await contactActivityRepository.create(activity);
  return ok(activity);
}
