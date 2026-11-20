import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

/** Branded 404 — not a Figma screen, matches the C17-family "link isn't available" style used by the guest/invite/reset pages. */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-bg px-5 py-8 sm:px-8">
      <header className="flex items-center justify-between">
        <Logo width={180} />
      </header>

      <main className="flex flex-1 items-center justify-center py-10">
        <Card className="flex w-full max-w-[520px] flex-col gap-4 p-6">
          <p className="rc-brand-gradient-text text-xs font-normal uppercase tracking-wide">404</p>
          <h1 className="font-heading text-[28px] font-semibold text-ink">Page not found</h1>
          <p className="text-sm text-ink-secondary">The page you&apos;re looking for doesn&apos;t exist or may have moved.</p>
          <Button href="/" variant="primary" className="w-[196px]">
            Back home
          </Button>
        </Card>
      </main>
    </div>
  );
}
