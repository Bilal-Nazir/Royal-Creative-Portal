# Design notes — Phase 1

Deliberate deviations from the Figma file (`q59B9tWGSDdfXZXSSNDazB`), and why.

## Navigation

- **Mobile nav drawer added.** Figma's only mobile frame (M01 · Client dashboard)
  drops the sidebar entirely and shows just a logo + "Notifications" button — it
  doesn't need in-screen navigation because the prototype is a single scrolling
  flow. The real portal has multiple routes (Messages, Files, Payments, and the
  equivalent agency pages), so mobile needs a way to reach them. Added a
  hamburger button + slide-over drawer (`MobileNav`) containing the same nav
  items as the desktop sidebar, plus the tagline and contact-owner block.
- **Active nav state added to both sidebars.** Figma only shows an active state
  (`border-brand-rose` + gradient text) on the agency sidebar's "Dashboard" item
  in A00. The client sidebar in C02 shows no active item at all. Applied the
  same active treatment to both sidebars for consistency, via `NavItem`
  auto-detecting the current route with `usePathname`.
- **`ListRow` stacks on mobile.** Figma's mobile frames (M01) show each list
  row's trailing badge stacking *below* the title/subtitle on narrow widths,
  while desktop keeps it inline to the right. `ListRow` now does
  `flex-col` → `sm:flex-row` to match both.

## Layout

- **Main content area is `max-w-[1144px]` instead of full-bleed.** At exactly
  1440px viewport width this is a no-op (1208px sidebar-adjusted area minus
  32px×2 padding = 1144px, same as Figma). On wider monitors it stops the
  content from stretching edge-to-edge, which Figma's fixed 1440px frame
  doesn't have an opinion on either way.
- **Sign-in card is vertically centered**, not pinned at Figma's fixed y=195px
  offset. A fixed offset only "works" at Figma's exact frame height; centering
  degrades correctly at any viewport height.
- **Focus-visible ring added** (`:focus-visible { outline: 2px solid var(--brand-amber) }`
  in `globals.css`). Figma has no focus state defined anywhere in the file —
  required for keyboard accessibility (AA).

## Data / copy

- **Per-card "X/8 stages" text is computed, not copied verbatim.** Figma's
  three sample project cards on A00 show "4/8" (Design), "2/8" (Proposal), and
  "5/8" (Development). Phase 2a's decision 4 (progress = completed stages / 8,
  current stage not counted as complete) is computed as `stageIndex(stage) / 8`
  via `completedStageCount()`, which now matches Figma exactly for Design
  (4/8) and Development (5/8) — only Proposal still reads "1/8" here against
  Figma's "2/8", which we believe is Figma's own mock copy being inconsistent
  (index 1 isn't "2/8" under any single rule that also produces "4/8" for
  index 4 and "5/8" for index 5). Kept the one computed, consistent rule
  rather than hardcoding three numbers that would silently drift from the
  stage machine.
- **Agency aggregate stats (24 active projects, £7,200 outstanding, etc.) are
  a separate hardcoded `AgencyOverview` record**, deliberately not derived
  from the 3 seeded `Project` records. Figma itself labels this panel
  "Illustrative sample data" and the two don't reconcile (3 seeded projects vs.
  24 claimed active) — that's expected, not a bug, until there's a real
  database to aggregate from.
- **Two ad-hoc chart colours** (`#595963` grey, `#ebebf0` near-white) are used
  only in `ComparisonBars` for the September/October bars. They're literal
  Figma values, not part of the Foundations token set (which has no
  "chart grey/white" token) — added as one-off arbitrary Tailwind values
  rather than inventing new global tokens for a single use site.

## Components not exercised by any Phase 1 screen

- `ProjectJourney` (the ✓ / ● / ○ per-stage list) and `ContactOwner`'s `"full"`
  variant (Contact owner/Desktop + Mobile, 19:3 / 19:15) are built per the
  architecture spec's component inventory, but no Phase 1 screen renders them —
  the three required screens don't have a per-stage checklist view or a
  full-width contact bar. They're ready for the project-detail screen in a
  later phase.

  **Update, Phase 2a:** `ProjectJourney` turned out to need a rewrite once a
  real screen (C03 and everything after it) finally used it — Figma's actual
  sidebar is plain text glyphs (`✓`/`●`/`○` + label, done/upcoming in
  `ink-secondary`, only the current stage gradient-coloured), not the
  circle-with-icon visual timeline Phase 1 guessed at. Rewritten to match.

# Design notes — Phase 2a

## Architecture: file-backed store for mutable entities

The biggest deviation this phase isn't visual — it's that `Project`,
`BriefVersion`, `ProposalVersion`, `Invoice`, `Comment`, and
`AcceptanceRecord` are no longer plain in-memory arrays. They're backed by a
JSON file (`.data/phase2a-store.json`, gitignored, auto-seeded on first read —
see `server/storage/file-store.ts`).

Why: Next.js compiles Route Handlers and page Server Components into
separate module/VM contexts. A plain module-level singleton — even one
pinned to `globalThis` — is **not** shared between them. Concretely: a POST
to `/api/projects/[id]/brief/approve` would update its own copy of the
"singleton" array, and the very next page load of `/projects/[id]/brief`
would render the old, unapproved state, because that page's Server Component
was reading a *different* instantiation of the same module. This reproduced
in both `next dev` and the production `next start` build — it's not a dev-mode
quirk. The fix is to persist outside the JS module graph entirely; a JSON
file on disk is the simplest thing that's genuinely shared.

This only affects the six mutable collections above. Everything read-only
(users, activity feed, attention tasks, agency overview, content checklist,
share links) stays a plain in-memory array — there's nothing to lose by
duplicating read-only data per layer.

A real database in a later phase removes this file entirely without any
service or UI changes — repositories are still the only thing that touch it.

## Navigation / layout

- **`ClientShell` grew a `journeyStage` prop.** The dashboard/messages/files/
  payments pages don't show a per-stage sidebar; brief/proposal/deposit pages
  do (Figma: "PROJECT JOURNEY" section under the nav items). Since a
  project's stage is route data a parent layout can't see, the
  `/projects/[projectId]/*` routes live in their own route group
  ((client-project)) with their own layout that fetches the project and
  passes its stage down — rather than threading project-lookup into the
  shared top-level client layout for routes that don't need it.
- **C16 and C17 share one sign-in page**, switched by `?variant=brief` and
  `?returnTo=`, rather than two near-identical routes. Both screens are the
  same form with different heading copy and a different "back" destination;
  duplicating the page for that felt like the wrong kind of fidelity.
- **Guest → sign-in → back-to-brief round trip uses `returnTo`**, validated
  against open-redirect (`isSafeReturnTo`: must be a same-site relative path,
  not `/api/*`). `proxy.ts` (middleware) also now appends `returnTo` when it
  redirects any unauthenticated request to sign-in, not just the guest flow.

## Deposit checkout (C08) — demo mode, not Figma's literal design

Figma's C08 shows a real-looking card form ("Secure checkout powered by
Stripe") with actual card-number/expiry/CVC inputs. Per the explicit
instruction that the mock "must not collect or store real card data" and
must "show clearly that it's demo mode", the card fields are rendered
disabled/inert and a visible amber "Demo mode — no real payment is
processed" banner sits above them. A demo-outcome radio control (success/
failure) drives `MockPaymentProvider` directly — this is the required
"demo control to simulate success or failure", surfaced as UI rather than a
hidden query param.

- **"Choose a different payment date" link added to C10** (payment failed).
  R11 (the calendar) has no screen that visibly links to it in the file — the
  closest match, a frame literally named "Choose your payment date" sitting
  inside C10, actually renders unrelated "Try payment again" content (looks
  like a reused/renamed component instance, not the calendar). Added a
  secondary action on C10 pointing at R11 so the calendar screen is reachable
  at all; logged here rather than guessed at silently.
- **R11's month is hardcoded to November 2026**, matching the seed deposit's
  due date, rather than deriving "today" dynamically — there's no real
  "today" in this demo (seed dates are fixed), so a computed current-month
  calendar would show the wrong month relative to the rest of the seeded
  timeline.

## Business-rule decisions applied (see `server/domain/stage.ts`)

All four decisions from the brief are implemented directly in
`STAGE_TRANSITIONS` / `canAdvance`, replacing the Phase 1 TODOs:

1. `deposit → content` gates on `depositConfirmed`, computed as
   `invoice.status === "paid"` specifically — Stripe/mock success or an
   admin verifying a reported transfer. An `"unverified"` status (client
   self-report) never satisfies it (tested in `invoice.test.ts`).
2. `content → design` gates on every *required* checklist item being
   accepted (`requiredItemsAllAccepted`), and is the one transition flagged
   `forceable: true` — an agency admin/owner (or the assigned member) can
   force it via `forceAdvanceContentToDesign`, which appends a
   `ForcedAdvance { stage, byUserId, byUserName, at }` to the project. The
   Royal Trendsy seed data uses this: 3 of 4 required content items are
   accepted, and a `forcedAdvances` entry records Jerry Royal force-advancing
   it into Design anyway.
3. `development → launch` gates on `developmentApproved` alone now. Final
   payment, domain & hosting, and QA moved to a separate `LaunchChecklist`
   (`Project.launchChecklist`, 4 booleans) that gates `launch → handover`
   instead (`launchChecklistComplete`) — matching Figma's "Launch readiness"
   panel being one combined checklist, not sequential gates.
4. Progress is `completedStageCount(stage) / 8` — the current stage is not
   counted as complete. Design is 4/8 (50%), matching Figma's own card text
   for the first time (see the Phase 1 note above, now resolved).

`designApproved` and `developmentApproved` in `computeGateState()` are
hardcoded `false` — Phase 2a doesn't build the design/development approval
screens (R06/R07/R19/etc.) or any record they'd read from, so there's
nothing real to compute yet. Both gates are still exercised correctly by
unit tests using synthetic `ProjectGateState` fixtures.

## Permissions

Every brief/proposal/invoice/force-advance action is guarded in its service
function (`assertClientCanActOnProject` / `assertAgencyCanManageProject`),
returning a `ServiceResult` with `status: 403` — never just a hidden button.
`project-actions.test.ts` exercises this directly against the real seeded
Royal Trendsy project: a viewer, a participant on a *different* client's
project, an agency session, and an unassigned agency member are all denied
before any read-modify-write happens.

## Known test-environment quirk

The Phase 2a Playwright spec needs the dev-only demo-state switcher to reach
every screen state without replaying the full flow, and that switcher is
gated to `NODE_ENV === "development"` — so `playwright.config.ts` runs the
e2e suite against `next dev`, not `next start`, and is pinned to a single
worker since the spec mutates shared file-store state that other specs read.
One side effect: the floating Next.js dev-mode indicator (bottom-left "N"
badge) appears in some of this run's screenshots. It's a `next dev`-only
overlay that never renders in the production build — not part of the app.
