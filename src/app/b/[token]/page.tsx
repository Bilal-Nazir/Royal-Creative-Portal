import { getGuestBriefView } from "@/server/services/share-service";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { NotImplementedButton } from "@/components/ui/NotImplementedButton";
import { BriefDocument } from "@/components/project/BriefDocument";

export default async function GuestBriefPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const view = await getGuestBriefView(token);

  if (!view) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg px-5 text-center">
        <Logo width={180} />
        <h1 className="font-heading text-2xl font-semibold text-ink">This link isn&apos;t available</h1>
        <p className="max-w-md text-sm text-ink-secondary">
          It may have expired, or the link may be incorrect. Contact Royal Creative for a new one.
        </p>
      </div>
    );
  }

  const { project, brief } = view;
  const signInHref = (destination: string) =>
    `/sign-in?variant=brief&returnTo=${encodeURIComponent(destination)}`;
  const briefPath = `/projects/${project.id}/brief`;

  return (
    <div className="flex min-h-screen flex-col gap-6 bg-bg px-5 py-7 sm:px-14">
      <header className="flex h-[66px] w-full items-center justify-between">
        <Logo width={220} />
        <Button href={signInHref(briefPath)} variant="secondary" className="w-auto px-6">
          Sign in
        </Button>
      </header>

      <p className="rc-brand-gradient-text text-xs font-normal uppercase tracking-wide">Project brief</p>
      <h1 className="font-heading text-[32px] font-semibold text-ink">{project.name}</h1>
      <p className="max-w-2xl text-sm text-ink-secondary">Review the project brief from Royal Creative.</p>

      <BriefDocument
        title={`Website brief · Version ${brief.versionNumber}`}
        fields={brief.fields}
        variant="dark"
        action={<NotImplementedButton label="Download PDF brief" />}
      />

      <div className="flex flex-wrap items-start gap-3">
        <Button href={signInHref(briefPath)} variant="primary" className="w-[196px]">
          Continue
        </Button>
        <Button href={signInHref(briefPath)} variant="secondary" className="w-[196px]">
          Comments
        </Button>
        <Button href={signInHref(`${briefPath}/revise`)} variant="secondary" className="w-[196px]">
          Request revisions
        </Button>
      </div>
    </div>
  );
}
