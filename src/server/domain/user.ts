export type AgencyRole = "owner" | "admin" | "member";
export type ClientRole = "participant" | "viewer";

interface BaseUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
}

export interface AgencyUser extends BaseUser {
  role: "agency";
  agencyRole: AgencyRole;
}

export interface ClientUser extends BaseUser {
  role: "client";
  clientRole: ClientRole;
  clientId: string;
}

export type User = AgencyUser | ClientUser;

export function isAgencyUser(user: User): user is AgencyUser {
  return user.role === "agency";
}

export function isClientUser(user: User): user is ClientUser {
  return user.role === "client";
}

export type PublicUser = Omit<User, "passwordHash">;

export function toPublicUser(user: User): PublicUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- stripping passwordHash out of the returned object
  const { passwordHash, ...rest } = user;
  return rest;
}
