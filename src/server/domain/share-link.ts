export interface ShareLink {
  token: string;
  projectId: string;
  createdAt: string;
  expiresAt: string;
}

export function isShareLinkExpired(link: ShareLink, now: Date): boolean {
  return now.getTime() > new Date(link.expiresAt).getTime();
}
