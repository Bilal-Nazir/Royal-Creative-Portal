import { isResetTokenValid } from "@/server/services/password-reset-service";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { ResetPasswordForm } from "./reset-password-form";

/** Not in Figma — C17-style page for the real reset-password flow (Phase 4a). See DESIGN_NOTES. */
export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const valid = await isResetTokenValid(token);

  return (
    <div className="flex min-h-screen flex-col bg-bg px-5 py-8 sm:px-8">
      <header className="flex items-center justify-between">
        <Logo width={180} />
        <Button href="/sign-in" variant="secondary" className="w-auto px-6">
          Back to sign in
        </Button>
      </header>

      <main className="flex flex-1 items-center justify-center py-10">
        <div className="flex w-full max-w-[520px] flex-col gap-4 rounded-rc border border-line bg-surface p-6">
          {valid ? (
            <>
              <div className="flex flex-col gap-2">
                <h1 className="font-heading text-[32px] font-semibold text-ink">Set a new password</h1>
                <p className="text-sm text-ink-secondary">Choose a new password for your account.</p>
              </div>
              <ResetPasswordForm token={token} />
            </>
          ) : (
            <div className="flex flex-col gap-2">
              <h1 className="font-heading text-2xl font-semibold text-ink">This link isn&apos;t available</h1>
              <p className="text-sm text-ink-secondary">
                It may have expired or already been used. Request a new one from the sign-in page.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
