import { getInviteByToken } from "@/server/services/invite-service";
import { Logo } from "@/components/ui/Logo";
import { InviteAcceptForm } from "./invite-accept-form";

/** Not in Figma — C17-style page for the real invite-accept flow (Phase 4a). See DESIGN_NOTES. */
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await getInviteByToken(token);

  return (
    <div className="flex min-h-screen flex-col bg-bg px-5 py-8 sm:px-8">
      <header className="flex items-center justify-between">
        <Logo width={180} />
      </header>

      <main className="flex flex-1 items-center justify-center py-10">
        <div className="flex w-full max-w-[520px] flex-col gap-4 rounded-rc border border-line bg-surface p-6">
          {invite ? (
            <>
              <div className="flex flex-col gap-2">
                <h1 className="font-heading text-[32px] font-semibold text-ink">Welcome, {invite.name.split(" ")[0]}</h1>
                <p className="text-sm text-ink-secondary">Set a password for {invite.email} to join Royal Creative.</p>
              </div>
              <InviteAcceptForm token={token} />
            </>
          ) : (
            <div className="flex flex-col gap-2">
              <h1 className="font-heading text-2xl font-semibold text-ink">This invite isn&apos;t available</h1>
              <p className="text-sm text-ink-secondary">
                It may have expired or already been used. Ask whoever invited you to send a new one.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
