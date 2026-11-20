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

# Design notes — Phase 2a-design (agency rebuild)

## Architecture: file-backed store extended to `ShareLink`, made atomic

`ShareLink` moved from a plain in-memory array to the same JSON file store as
Project/Brief/Proposal/Invoice/Comment (`FileStoreShareLinkRepository`).
Reason: A05's "Copy client link" now lazily creates a link the first time an
agency user asks for one (`getShareLinkForProject`), and that write has to
survive the same route-handler/Server-Component boundary described above.

`writeStore()` is now atomic (write to a temp file in the same directory,
then `rename` over the real path) rather than a direct `writeFileSync`, so a
reader can never observe a half-written file under concurrent requests.

The store is dev-only: `.data/` is gitignored, and `npm run seed:reset`
deletes `.data/phase2a-store.json` so the next read reseeds from scratch.

## A02 — Projects board

- **Kanban column colours invented for Brief/Launch/Handover.** Figma (5:104)
  only has sample cards (and therefore bullet colours) for Proposal
  (`#a3adc7`), Deposit (`#7aa3f7`), Content (`#b89cf7`), Design (`#73c79e`)
  and Development (`#eb878f`). Extended the palette with Brief `#f2b84b`
  (warm, start of the journey), Launch `#4fd1c5` (teal), Handover `#9ca3af`
  (neutral, end of the journey) — see `STAGE_DOT_COLOR` in `ProjectsBoard.tsx`.
- **All 8 stage columns always render**, including empty ones. Figma's mock
  only shows the 5 stages that happen to have sample cards; with 3 real
  seeded projects, most columns are empty most of the time, and hiding empty
  columns would make the board's shape shift around as cards move — all 8
  stay visible with a `0` count instead.
- **Header description simplified to "Showing N active projects."**, dropping
  Figma's "Showing 6 of 24" (filtered-of-total) framing — filtering happens
  client-side over the already-loaded list, so there's no separate
  server-side "total" to report against.
- **Mobile**: the board scrolls horizontally rather than stacking columns
  vertically (Figma's A02 frame was only captured at 1440px, no mobile
  variant was available to match against). Horizontal-scroll kanban is a
  common, defensible mobile pattern and consistent with the rest of the app's
  "stack or scroll, never truncate" mobile treatment.

## A04 — New project

- **Client/contact selector added** (`Select` + `CLIENT_DIRECTORY`). Per the
  brief, this control is missing from Figma (5:283) entirely — a project
  can't exist without a real client to attach it to, so a "Client" field was
  added directly above "Description", styled identically to the other
  `Select`/`Field` controls on the form.

## A16 — Project detail

- **Journey links differ from the client-side convention.** Figma's A16
  sidebar (nodes 41:1109–41:1115) renders Brief/Proposal/Deposit/Content/
  Design/Development/Launch as links unconditionally, regardless of
  done/current/upcoming status (only Handover, the last node, is plain
  text) — unlike the client-side rule (only done+current link). `ProjectJourney`
  gained an explicit `linkableStages` prop for this; `AgencyShell` passes
  `["brief", "proposal", "deposit"]` specifically, **not** the full Figma set,
  because Content/Design/Development/Launch/Handover have no agency pages
  built yet in this phase — linking to them would 404. Expand that list as
  those stage pages get built.
- **No inline edit controls for assignee/description.** Figma's capture shows
  both as read-only display (a chip and a paragraph), not editable fields —
  built to match exactly; there's no update endpoint for them yet because
  nothing calls it.

## A05 / A06 — Brief & Proposal editors

- **Structured fields replace the single free-text textarea.** Both Figma
  frames (5:366, 5:445) show one big white textarea containing the whole
  brief/proposal as headed paragraphs of plain text. Replaced with the
  `BriefFields` (objective/audience/pages/features/deliverables) and
  `ProposalFields` (scope/timeline/revisions/exclusions) structures the
  services already store and the existing `BriefDocument`/`ProposalDocument`
  already render client-side — styled as a stack of labelled `Textarea`s
  inside the same "Requirements"/"Scope and commercial details" card.
- **Eyebrow uses the existing `{CLIENT} · WEBSITE PROJECT` convention**, not
  Figma's "ROYAL TRENDSY · RC-1024". `RC-1024` is literally the seeded
  deposit invoice number reused as a project code in the mock — treated as
  incidental mock copy rather than a real pattern to replicate.
- **New draft-aware save/send services** (`saveBriefDraft`/
  `sendBriefForReview`, `saveProposalDraft`/`sendProposalForReview`) sit
  alongside the existing `sendRevisedBrief`/`sendRevisedProposal` (used only
  for the changes_requested → new-version flow) rather than changing their
  behaviour: while the current version is a draft, save/send edit it in
  place; once it's been sent, they start a new version instead, so the
  client's already-sent copy is never silently mutated.
- **Payment schedule is two editable (label, amount) rows**, not Figma's
  single combined text field ("50% deposit · 50% before launch"). Matches the
  `PaymentScheduleItem[]` shape every seeded proposal already uses.
- **"Preview client view" and "Copy client link" both resolve through the
  same lazily-created `ShareLink`** (`GET /api/projects/[id]/share-link`) —
  "Preview" opens `/b/{token}` (the real C01 guest view) in a new tab, "Copy"
  copies the full URL. Per the brief's explicit ask, this creates the guest
  share link rather than being a dead/placeholder button.
- **"Add attachment" is a `NotImplementedButton`** — neither the draft/send
  services nor the domain types carry an attachment field for the agency's
  outbound brief/proposal (only the client's *revision request* flow has
  `attachmentUrl`), so there's nothing real to wire this to yet.

## A07 — Payments dashboard

- **No "vs last month" deltas.** Figma's 4 metric cards each show a change
  figure against the previous month. There's no payment-history table in the
  seed data to compute a real delta from — showing an invented number would
  misrepresent real data as measured. The cards show real current totals
  only (`computePaymentMetrics`), with static descriptive subtext instead of
  a delta.
- **Real totals differ from Figma's mock numbers** by construction — the
  real seed only has 2 paid deposit invoices (no unpaid/overdue/unverified
  invoice exists yet), so "Outstanding"/"Overdue"/"Awaiting verification"
  currently read £0/£0/0 rather than Figma's populated mock figures. Use the
  dev-only demo-state switcher (`invoiceStatus`) to see the other states.
- **The "⋯" menu (161:587) is a direct, immediate status override** (POST +
  `router.refresh()`, no confirmation), distinct from A08's guarded
  mark-paid/verify flow reached by clicking the invoice row itself.
- **"Stripe settings" button is disabled** — there's no Stripe Connect-style
  settings flow in scope; kept visible (per Figma) rather than removed, with
  a `title` tooltip explaining why it's inert.

## A08 — Update payment status

- **Lives at `/agency/projects/[projectId]/deposit`** (project-scoped, under
  the new `(agency-project)` route group), reached via the journey sidebar's
  "Deposit" link — not a separate `/agency/payments/[invoiceId]` route.
  Figma's own A08 breadcrumb ("Royal Creative / Projects / Royal Trendsy")
  and journey sidebar match the project-scoped shape, not a flat payments
  sub-route.
- **One page, two copy variants, same backing action.** The brief asks for
  both "mark as paid manually" and "verify client-reported transfers" — Figma
  only shows the first. Implemented as one page that reads the deposit
  invoice's real status: `unverified` renders "Verify this payment" /
  "Verify payment"; anything else unpaid renders "Mark as paid manually" /
  "Mark as paid"; `paid` renders a read-only confirmation. Both variants call
  the same `markInvoicePaidManually` service (it already sets
  `verifiedByUserId`/`verifiedByName` regardless of prior status), since
  there's no behavioural difference between "I received a transfer I wasn't
  told about" and "I'm confirming the transfer the client told me about".

## (agency-project) route group

New top-level route group mirroring `(client-project)` — `AgencyShell` gained
`journeyStage`/`journeyProjectId` props (previously client-only on
`ClientShell`), and the old, non-Figma-matched
`(agency)/agency/projects/[projectId]/` page (plus its colocated
`revise-brief-form.tsx`/`revise-proposal-form.tsx`/`verify-payment-button.tsx`)
was deleted outright rather than kept alongside — Next.js doesn't allow two
route groups to resolve the same path, and A16/A05/A06/A08 supersede
everything that old page did inline.

## Fix: deposit invoice gap on proposal acceptance

`acceptProposal` previously only moved the proposal to "accepted" — it never
created an invoice. A brand-new project (A04) going brief -> proposal ->
accept had nothing for the deposit stage to gate on or the client to pay.

Fixed by turning the whole accepted payment schedule into real invoices
(`createInvoicesFromPaymentSchedule`, invoice-service.ts), not just the
first row:
- **Deposit** (schedule row 0) — created `unpaid`, due immediately.
- **Final** (the last row) — created `scheduled`, a new `InvoiceStatus`
  meaning "exists, but not due yet." It only becomes `unpaid`
  (due now) when the project reaches the **launch** stage
  (`activateScheduledInvoices`, stage-service.ts — the single chokepoint
  every stage transition already goes through).
- Any rows between the two (schedules longer than 2) become `progress`
  invoices, also `scheduled`; nothing currently built activates them, since
  the proposal editor only ever produces 2-row schedules.
- **Idempotent**: checks for an existing invoice of each type before
  creating one, so accepting the same proposal twice never duplicates.

`activateScheduledInvoices` lives in `stage-service.ts`, not
`invoice-service.ts`, specifically to avoid a circular import —
`invoice-service.ts` already imports `tryAdvanceStageIfGated` from
`stage-service.ts`.

Covered by `proposal-accept-invoice.test.ts`: first acceptance creates both
invoices with the right amounts/statuses, a second acceptance doesn't
duplicate them, an already-invoiced project (Royal Trendsy) is left alone,
and `activateScheduledInvoices` both flips a scheduled invoice correctly and
no-ops when there's nothing scheduled.

## Fix: A02 mobile kanban scroll-snap

Columns are `w-[85vw]` on mobile (`sm:w-[260px]` unchanged on desktop), and
the scroll container uses CSS scroll-snap (`snap-x snap-mandatory` on the
row, `snap-start` on each column) so swiping settles on a column edge
instead of stopping at an arbitrary scroll offset.

# Design notes — Phase 2b (content + design revision loop)

## Content checklist gets a real status enum, not just a boolean

`ContentChecklistItem.accepted: boolean` became `status: ContentItemStatus`
(`not_started | submitted | changes_requested | accepted`) — the brief asked
for all four states and Figma's own C11 mock shows "Missing"/"Needs
clarification"/"Accepted" badges that a boolean can't express. The
checklist moved from a static in-memory array to the file store
(`FileStoreContentChecklistRepository`) since statuses now mutate via A09's
review actions.

## C11 — per-item submissions, not Figma's one combined panel

Figma's "Send content for review" (3:679) is a single Files/link/notes form
with no indication of *which* checklist item it submits for. The brief
explicitly asks for "files, a shared link and notes **per item**", so each
checklist item gets its own submission card instead — closer to A04's
precedent (added a missing selector where Figma's mock was generic). One
consequence: there's no "Save draft" action, since a per-item submission has
nothing resembling the brief/proposal draft lifecycle to save into — files
stay as local state in the browser until "Submit for review".

## A09 — accept/request-changes actions and the force-advance button are additions

Figma's A09 capture (5:694) ends at the "Client submission" display card —
no Accept/Request changes buttons are visible in the frame, and nothing in
the file calls `forceAdvanceContentToDesign` (it's existed as a service
since Phase 2a but had no UI). Both were added here: per-item Accept/Request
changes actions (`ReviewActions`), and a "Force-advance to Design" button in
a new "Stage control" card, since the brief explicitly requires both and
this is the only screen where they fit.

## A10 — review screenshots are required and added; Figma's mock omits them

Figma's A10 (5:784) only has a Figma-link field and an optional message —
no screenshot upload at all, despite C12/R01's review screens being built
entirely around screenshot pins. Since the brief explicitly requires
screenshots and the whole pin-comment feature depends on a real image,
`FileDropField` (scope `design-screenshot`, png/jpg/webp, 10MB cap) was
added as a required field. The same form (and the same
`POST /design/versions` endpoint) handles R05's resubmission, switching
copy and adding the "What changed" field when a current version already
exists.

## C12 / R01 — one page, not two; pins replace Figma's static numbered badges

Figma's 3:773 ("C12 · Design submission") and 6:2 ("R01 · Design annotation
review") are the same screen — same layout, same copy pattern, same
Feedback/Approve/Ask-for-changes actions — just captured at slightly
different states (3:773's badges are baked into the mock content; 6:2 adds
the "Feedback draft" badge and the "Pins 1–2…" caption). Built as one page
(`/projects/[id]/design`), branching on the current version's status rather
than being two routes. R06 ("Revised design review") is the same page again
for version 2+ — only the header copy and the presence of a "What changed"
card differ, so there's no separate R06 route either.

Figma's pin numbers are plain `Badge` components already positioned inside
the mock's static content blocks — they're not interactive and carry no
real coordinates. The actual requirement ("click a screenshot to drop a
numbered pin... store pin position as a percentage") needed a real
uploaded screenshot `<img>` with an absolutely-positioned overlay
(`PinOverlay`) computing `xPercent`/`yPercent` from the click's offset
against the image's bounding rect — this works identically for a mobile tap
(same `onClick` handler fires for touch taps in every tested browser), which
is why there's no separate touch-specific code path.

**Update:** pins gained an optional `title` field (max 60 chars) so the
sidebar can show Figma's "1 · Hero heading" instead of just "Pin 1". It's
optional — a pin dropped without one shows as `"Pin {n}"` — formatted by
one shared `pinLabel()` helper used by the workspace sidebar, R02's
pre-submit list, and R04's requested-changes list, so the three never
drift out of sync with each other.

## R12 — a tab, not a separate screen

Figma's R12 ("Review with chat drawer") is visually identical to C12/R01
except the right-hand panel is the project conversation instead of
feedback. Rather than a second route duplicating the screenshot/pins half,
the review page has a "Feedback" / "Conversation" tab
(`DesignReviewTabs`) that swaps only the sidebar — avoids re-fetching or
re-rendering the screenshot and pins twice.

## R10 — a new project-scoped chat route, separate from the existing "Messages" stub

The existing top-level `/messages` nav item is (and remains) a placeholder
— "the full agency Messages inbox is a later phase," per Phase 2a's own
notes. R10's chat is explicitly project-scoped (breadcrumb, journey
sidebar), so it lives at `/projects/[id]/conversation` instead, with an
agency-side mirror at `/agency/projects/[id]/conversation` added so the
agency has somewhere to actually reply from — nothing in Figma's 17 frames
shows the agency side of this chat, but `postProjectMessage` accepts either
role and a one-way inbox isn't functional.

## R02/R13 — one route, not two

R02 ("Submit revision round") and R13 ("Feedback submitted") are the same
page (`/projects/[id]/design/revise`): the submit button's success handler
swaps local state to show R13's content instead of redirecting, so the
confirmation reads as the direct result of the action rather than a second
navigation.

## R04's "Send to internal review" becomes a conditional "Flag for scope decision"

Figma's R04 shows a `ButtonPrimary` "Send to internal review" even in the
example where both requested changes are within the agreed allowance — i.e.
nothing to flag. Built so the button (relabelled "Flag for scope decision")
only appears when `round.overAllowance` is true; within allowance, the card
shows the informational text only. Flagging records `scopeFlaggedAt` and
never blocks the round's progress either way, per the brief.

## New `ProposalVersion.includedRevisionRounds` field

R04's scope review needs a real number to compare rounds used against.
`ProposalFields.revisions` is free text ("two design rounds included.") —
parsing a number out of prose felt fragile, so a sibling numeric field was
added to `ProposalVersion` (alongside `fee`/`paymentSchedule`, which already
live outside `fields` for the same reason) and exposed as a new "Included
revision rounds" input on A06's proposal editor — not in Figma, logged here
the same way A04's client selector was. Seed values were back-filled from
each proposal's existing `revisions` text (1 for Royal Trendsy's v1, 2 for
every other seeded proposal).

## File storage: StorageProvider interface, local disk, dev-only

Uploaded files are validated (per-scope MIME allow-list + size cap — 20MB
for content files, 10MB for design screenshots), filename-sanitized
(strips path separators and anything non-alphanumeric/dash/underscore/dot),
and stored behind a `StorageProvider` interface
(`server/storage/storage-provider.ts`) whose only implementation right now
writes to `.data/uploads/<uuid>` on local disk — same "outside the JS
module graph" reasoning as the file store, since uploads happen in one
route handler and downloads in another. Metadata (original/sanitized name,
mime, size, uploader) is a separate `UploadedFile` record in the file store;
`GET /api/files/[fileId]` is the only way to read bytes back, gated on the
same client-owns-project / agency-assigned-or-admin check used everywhere
else — never a public URL. A real deployment swaps the one class for
S3/GCS behind the same interface.

## Demo-state switcher: coarse scenario selectors, not individual field toggles

Synthesizing a specific content-submission or design-version-plus-pins-
plus-round state field-by-field would need a dozen new switcher controls.
Instead, two coarse enums were added — `contentScenario`
(baseline/images_submitted/images_changes_requested) and `designScenario`
(none/v1_shared/v1_feedback_draft/round1_submitted/v2_ready/approved) —
each of which wipes and rebuilds the relevant records for Royal Trendsy in
one call, the same "pick a named state" pattern as the existing stage/
brief/proposal/invoice dropdowns. Demo-synthesized design versions have no
real uploaded screenshot (there's no upload flow in a seed script), so the
client design review page falls back to a static placeholder image
(`/public/placeholder-design-preview.svg`) when a version's
`screenshotFileIds` is empty — only reachable via the demo switcher, never
in the real upload flow.

## R16/R20 states: route-level, not separate pages

R16 ("Error and recovery") and R20 ("Loading review") are implemented as
Next.js' own `error.tsx` / `loading.tsx` for the design review route
segment, rather than content built into the page — they're framework-level
states of the one route, not separate screens to navigate to. R15 ("Empty
state") and R17 ("Restricted access") don't have an equivalent Next.js
convention, so those are conditional content inside the page itself
(`EmptyReviewCard`, `ReadOnlyNotice`), applied to both the design review
and content pages.

## R04 assignment creates a per-user notification, not just a per-role one

`Notification.recipientRole` ("client"/"agency") was broad enough for
content-submitted/design-shared/round-submitted/design-approved, but
"notify the assignee" means one specific person, not every agency user.
`Notification` gained an optional `recipientUserId`, a new
`revision_round_assigned` type, and `notifyAssignee()` — called from
`updateRevisionRoundTracking` only when `assigneeId` is actually set and
different from the round's current one, so re-saving the same assignment
(e.g. just changing workflow status) doesn't re-notify them. The same hook
point is meant to cover R18 (a later phase) once that screen exists —
nothing else changes, it's the same `updateRevisionRoundTracking` call.
`NotificationRepository` gained a `listByProjectId` read method so this is
actually testable; still no UI reads notifications yet.

## Vitest: file-store tests now run file-by-file, not in parallel

Multiple test files reset/mutate the same on-disk `.data/phase2a-store.json`
for isolation. Vitest's default parallel-file execution raced two files'
resets against each other once a second file (this phase's
`content-design-service.test.ts`) started doing the same heavy mutation —
`vitest.config.ts` now sets `fileParallelism: false`.

# Design notes — Phase 2c (development, launch, handover, scope change)

## `ReviewKind` generalizes the design review machinery instead of duplicating it

`DesignVersion` and `RevisionRound` gained a `kind: "design" | "development"`
discriminator rather than a parallel `DevelopmentVersion`/
`DevelopmentRound` type pair. `DesignVersionRepository`/`RevisionRoundRepository`'s
project-scoped reads (`listByProjectId`, `getCurrentVersion`) take a `kind`
argument (defaulted to `"design"` in the service layer so every Phase 2b
call site — and its tests — keeps compiling and behaving identically
without being touched); functions that already operate on one fetched
record (`findById`, `createPinComment`, `updateRevisionRoundTracking`,
`setPinCommentStatus`) read `.kind` off that record instead. `shareDesignVersion`
takes an explicit `kind` (nothing to read it from when creating version 1),
and `submitRevisionRound`/`approveDesignVersion` branch on `version.kind`:
development rounds have no revision-allowance concept at all (`overAllowance`
is simply always `false`, no proposal lookup), and approving a development
version additionally ticks the launch checklist's "Client approval" and
re-checks the stage gate. `PinOverlay`, `ChatPanel` and `FileDropField`
needed zero changes — they were already kind-agnostic. `DesignReviewWorkspace`/
`DesignReviewTabs` gained three optional override props (`apiBasePath`,
`reviseHref`, `approveLabel`) so the one workspace component serves both
A10/R05/C12/R01/R06/R07 (design) and A11/C13/R08/R18/R19 (development)
without a copy. The small per-page form components from Phase 2b
(`SubmitDesignForm`, `TrackingForm`, `PinStatusSelect`, `SubmitRoundPanel`)
were promoted into parametrized shared components (`VersionSubmitForm`,
`RevisionTrackingForm`, `PinStatusSelect`, `RevisionRoundSubmitPanel` in
`components/project/`) for the same reason — the design-side pages were
updated to pass their existing paths/copy as explicit props, so their
behavior is unchanged.

Version/round ids now include `kind` (`${kind}-${projectId}-v${n}`,
`revision-round-${kind}-${projectId}-${n}`) — without it, a design v1 and a
development v1 for the same project would generate the same id and collide.

## A11's development submit form requires a screenshot, like A10's

The spec lists "review screenshots (required for pins)" for A11, so
`shareDesignVersion` keeps its "at least one screenshot" check for both
kinds — pins need an image to be placed on regardless of track.

## A13's incomplete-checklist state has no Figma reference

The only A13 Figma frame shows the "4 of 4 complete" / all-done state. The
in-progress checklist (manual toggles for domain & hosting and quality
checks, read-only "Complete"/"Pending" badges for client approval and
final payment) is inferred from C14's equivalent readiness list and the
existing list-item/Badge pattern used throughout (R04, R18). "Client
approval" and "Final payment" are rejected if posted to the manual
toggle endpoint (`updateLaunchChecklistItem`'s `item` type only accepts
`domainHosting`/`qualityChecks`) — enforced in the service, not just
hidden in the UI.

## Launch date/live URL are editable independent of "Go live"

C14's mock shows the agreed launch date already known while domain &
hosting is still "In progress" (3 of 4 complete) — so A13 splits "save
launch details" (`setLaunchDetails`, no gating) from "Go live"
(`goLive`, gated on all 4 checks *and* both fields being set). Figma shows
them as one card with one button; the two actions are exposed as two
buttons on that same card.

## Final balance payment and A13's handover resources: no Figma screens (explicit deviations)

- **Final payment.** Figma has no checkout screen for the launch-stage
  final balance. Reused the C08/C09/C10 deposit checkout pattern and the
  mock `PaymentProvider`, with "final balance" wording instead of
  "deposit" — new page at `/projects/{id}/final-payment`, new service
  functions `payFinalInvoice`/`markFinalInvoicePaidManually`/`getFinalInvoice`
  in `invoice-service.ts` (kept separate from the deposit-hardcoded
  functions rather than generalizing them, to avoid any regression risk
  to the already-shipped deposit flow). `DepositCheckoutForm`'s markup was
  extracted into a shared, parametrized `PaymentCheckoutForm` so neither
  copy ever drifts from the other. A new `InvoiceType = "additional"` and
  a `tickFinalPaymentIfApplicable` helper (called from the final checkout,
  manual marking, *and* A07's generic `setInvoiceStatus` quick-menu) keep
  "final invoice paid → launch checklist's Final payment ticks" true from
  every paid-marking path, not just the new ones.
- **A13's "Handover resources" section.** No Figma screen for the agency
  side at all (C15 is the only handover Figma frame, and it's client-only).
  Built as a new card on A13 using the same add/list/remove pattern as
  everything else on that page (`Field`/`Select`/`FileDropField`/`ListRow`).
  Resource files reuse the `"content"` upload scope (not
  `"design-screenshot"`, which only allows images) so a PDF guide can
  actually be attached.

## Scope change: no Figma screen for creation, on either side

R09 (client review/accept/decline) is the only scope-change Figma frame.
The creation form (title, description, additional fee, timeline impact) —
reachable from R04/R18's "Flag for scope decision" (passing
`flaggedFromRoundId`) or from project detail A16 (no round) — was built
from scratch as `CreateScopeChangeForm`, reusing `Field`/`Textarea`/`Button`.
R04's existing `flagRevisionRoundForScope` (which just stamps
`scopeFlaggedAt` on an over-allowance design round) was left untouched and
is now the gate in front of showing this form on R04; R18 has no allowance
concept at all, so its "Flag for scope decision" button is unconditional.

R09 keeps Figma's two buttons as-is: "Accept" (primary) records acceptance;
"Discuss request" (secondary) does not decline — it opens the project
conversation (`/projects/{id}/conversation?draft=...`) prefilled with a
reference to the scope change, via a new `ChatPanel.initialDraft` prop.
"Decline" is a small text-link below the two buttons, not one of Figma's
named actions — Figma has no third control for it. Deviation: Figma's
"Discuss request" copy doesn't literally describe "open the conversation,"
but it's the closest fit to "discuss" of the three actions, and distinct
from both deciding buttons.

Accepting is guarded against double-processing (`status !== "pending"` →
400) specifically so a retried/duplicate-clicked accept can never create a
second "additional work" invoice — covered by
`development-launch-service.test.ts`.

## Demo-state switcher: three more scenario groups, one invoice-status override

`designScenario`'s synthesizer was generalized into `applyReviewScenario(projectId, kind, scenario)`
and reused as-is for a new `developmentScenario` (same five non-`none`
states, "development" copy). Three more coarse scenario enums were added —
`launchScenario` (not_started/checklist_in_progress/checklist_complete),
`handoverScenario` (none/resources_added), `scopeChangeScenario`
(none/pending/accepted/declined) — plus a `finalInvoiceStatus` override
(creates the final invoice from the proposal's payment schedule if it
doesn't exist yet, then sets its status directly) since reaching "final
invoice unpaid" needs more than a stage flip. All follow the existing
"wipe and rebuild" convention.

# Design notes — Phase 3 (dashboard, notifications, messages, contacts, settings)

- **A00 dashboard is fully real now.** The old hardcoded, "illustrative"
  `AgencyOverview` is gone. Every metric, delta, and breakdown is computed
  from real Project/Invoice/ProposalVersion records (`dashboard-service.ts`).
  Month-vs-previous-month deltas use each record's own timestamp
  (`Project.createdAt`, the new `Project.handoverAt`, `Invoice.paidAt`/
  `dueDate`) — there's no stage-change history table, so snapshot metrics
  (e.g. "Running with team") compare how many of today's matching projects
  were *created* this month vs last, not a true historical snapshot delta.
  Added `Project.handoverAt`, set by `tryAdvanceStageIfGated` on the
  handover transition — nothing else recorded a real "completed" timestamp.
- **Added 6 lightweight seed projects** (Priory Architects/Branding, Marlow
  & Finch/SEO, Hart & Co/Digital marketing, Enigma Plates/Video production,
  The Downsman and Gatwick Commercials/Website maintenance) so all 6
  `PROJECT_TYPES` have real data on the dashboard, not just "Website
  development". `Project.projectType` changed from a free string to the
  `ProjectType` union; A04 gained a required "Project type" select.
- **"Projects needing attention" is capped at 6 active projects**, not every
  project the session can see — Figma's own mock is a filtered subset
  ("Showing 3 of 24"), and with 9 seeded projects the uncapped grid would be
  noisy. "View all projects" still links to the full kanban board.
- **A14 notifications and the TopBar bell are additions on top of an
  existing, UI-less domain.** `Notification`/`notifyAgency`/`notifyClient`
  already existed (Phase 2b) with no reader; Phase 3 adds
  `getNotificationsForSession`/`countUnreadNotifications`/
  `markNotificationRead`/`markAllNotificationsRead` and swaps the
  "Notifications" placeholder button for a real `<NotificationsBell>` on
  every page that had one (40 files) via a scripted find/replace — mechanical
  and reviewed, not hand-edited file by file.
- **"Mark all as read" moved out of the TopBar action slot** into the page
  body (next to the All/Unread filter tabs), unlike Figma's mock which puts
  it beside the (redundant, self-referential) "Notifications" button in the
  topbar. Avoided because TopBar's `action` prop is a single slot and
  wiring a second button through it to a client component's handler would've
  needed a global/window bridge — not worth it for a cosmetic placement match.
- **A29/A15 messages inbox reuses the existing per-project `ProjectMessage`
  repository and `ChatPanel`** rather than introducing a new message model.
  Added `ConversationRead` (a per-project, per-user "last read" marker) since
  a shared single `readAt` can't represent two independent readers of the
  same thread. The inbox is one shared `MessagesInbox` client component used
  by both the agency (`/agency/messages`) and client (`/messages`) pages,
  parametrized by role-appropriate "open project" link and read-only state
  for client viewers.
- **Bug found and fixed during build:** the agency messages list initially
  showed the client's own agency contact person (`Project.contactName`,
  e.g. "Jerry Royal" — the lead shown *to* the client) as the "counterpart"
  instead of the actual client contact. Fixed by looking the real contact up
  through the client directory instead.
- **Contacts pipeline (A17/A18/A28/A30) is an entirely new feature** — no
  prior `Contact`/`ContactStage` domain existed. Stages are
  agency-configurable (add/rename/reorder via up/down buttons, not drag —
  simpler and keyboard-accessible; delete only when empty, enforced in
  `contact-service.ts` not just hidden in the UI) and owner/admin-managed per
  the brief. Moving a contact between stages is a per-card `<Select>` on the
  board rather than drag-and-drop, for the same reason. Seeded contacts reuse
  real seeded clients (Alex, Clara Ashworth, Tom Linden, Jane Hart, Sam
  Okafor, Isla Finch, Robin Oduya) plus two pure prospects (Mina, Dev Patel)
  and one lost lead (Noah Clarke) so every pipeline stage has at least one
  card.
- **A20 settings' "Team & access" shows the real 4 seeded agency users**
  (Jerry/owner, Mara/admin, Jordan/member, Alex Morgan/member), not Figma's
  illustrative 3-person mock (which also has Jordan as "Admin" — in the real
  seed Jordan is a member). Changing real seeded roles to match an
  illustrative mock would've been the wrong kind of fidelity. Role changes
  are owner-only; invite/remove are owner-or-admin, per the brief.
  "Invite" only creates the user record (random temp password, no email) —
  there's no invite-email or first-login flow in this phase.
- **Client contact options (A20) now actually drive the client sidebar.**
  `ClientShell` became an async Server Component that reads `AgencySettings`
  and passes `ownerName`/`phoneHref`/`whatsappHref` into `ContactOwner`,
  falling back to its hardcoded defaults when a field is unset.
- **A27 Stripe settings reuses `NotImplementedButton`** (secondary-styled,
  not Figma's primary gradient) rather than a one-off disabled button —
  it's the existing component for exactly this "not built yet" case.
- **Client Messages/Files/Payments (no Figma frames) are built from
  existing machinery, not new checkout/upload flows:**
  - Messages is the same `MessagesInbox` component the agency side uses.
  - Files lists every `UploadedFile` across the client's projects (added
    `UploadedFileRepository.listByProjectId`) with downloads through the
    existing authorized `/api/files/[fileId]` route — never a public URL.
    Seed files have real bytes on disk (`file-store.ts`'s
    `ensureSeedUploadedFileBytes`, since seeding can't go through
    `StorageProvider.save()` at module-load time) so the download route has
    something genuine to serve, not just metadata.
  - Payments lists every invoice across the client's projects
    (`listInvoicesForClient`) with a "Pay now" button that links to the
    *existing* per-project deposit/final-payment checkout pages — no new
    generic checkout was built.
- **`CLIENT_DIRECTORY` (a hardcoded clientId→name map from Phase 2a) is
  gone**, replaced by `getClientDirectory()` in `project-service.ts`, built
  from real `ClientUser` + `Project` records. A client's company name only
  exists once they have a Project (`Project.clientName`); a brand-new client
  with no project yet falls back to their own contact name so they stay
  selectable on A04 — there's nowhere else a "company name" is tracked
  independent of a project.
- **`UserRepository` moved from a static in-memory array to the file
  store** (A20's invite/role-change/remove now mutate it) — same
  cross-layer reasoning as every other mutable repository in this app.
- **Playwright now runs against a production build** (`next build && next
  start`, `workers: 2`) instead of `next dev` with a single worker, to cut
  down on dev-mode compile-on-request timing flakiness. The dev-only
  demo-state route's gate changed from `NODE_ENV === "development"` to also
  accept an explicit `ALLOW_DEMO_STATE=true` env var, set only by
  `playwright.config.ts`'s `webServer` — a real production deployment
  without that var still 404s. Running two workers means two spec files can
  run concurrently against the same shared file-store state; each file's own
  tests are still `mode: "serial"`, but cross-file isolation during a
  concurrent run is not guaranteed — flagged here rather than silently
  assumed safe.

# Design notes — Phase 4 (start projects at proposal, skip the brief)

## Domain: `BriefStatus` gains `"skipped"`

A brief can only be skipped while it's still a `draft` (or doesn't exist
yet) — never once it's `sent`, `changes_requested`, or `approved`. Reused
the existing `approvedBy*`-style fields pattern: `skippedByUserId`/
`skippedByName`/`skippedAt` on `BriefVersion`. `computeGateState`'s
`briefApproved` (`stage-service.ts`) treats `"skipped"` exactly like
`"approved"` — it's the only change needed for a skipped brief to satisfy
the `brief → proposal` gate. Progress didn't need any change at all:
`completedStageCount`/`progressFraction` are purely `stageIndex(stage) / 8`
and only look at which stage the project is *currently* on, not how the
brief got approved.

## A16 — "Skip brief" is a new, stricter permission check

Owner/admin only — deliberately **not** `assertAgencyCanManageProject`,
which also lets an assigned member through for every other agency action
in this app. `skipBrief` (`brief-service.ts`) inlines the role check
instead, same pattern as A20's owner-only role changes in
`settings-service.ts`. Shown on A16 only while
`project.stage === "brief"` and the brief is missing or still `draft`; the
confirm step is a native `window.confirm()` rather than a new dialog
component — no confirm-dialog UI existed anywhere else in the app (A07's
status override and A09's force-advance are both one-click, no
confirmation), and building one for a single call site felt like the wrong
layer to add it at.

## A04 — "Start from: Brief / Proposal" (not in Figma, like its client selector)

A `Select` styled identically to the other A04 fields, defaulting to
"Brief" (today's only behaviour). Choosing "Proposal" calls `createProject`
with `startFrom: "proposal"`, which seeds a `BriefVersion` with
`status: "skipped"` and an empty draft `ProposalVersion` (`status:
"draft"`, blank fields, fee 0, no payment schedule rows) in the same write,
and sets the project's `stage` straight to `"proposal"` — no call through
`skipBrief`/`tryAdvanceStageIfGated` needed since there's nothing to gate
yet. A16's own "Skip brief" action, by contrast, does *not* create an empty
proposal draft — A06 already renders a blank editor correctly when
`getProposalForProject` returns `null`, so there was nothing to add there.

## Journey sidebars — `ProjectJourney` gained a `briefSkipped` prop

Both `ClientShell` and `AgencyShell` now fetch the project's brief in their
layouts and pass `journeyBriefSkipped` down. When true, the brief's `<li>`
renders as plain muted text "– Brief · Skipped" and returns early — before
the done/current/upcoming glyph logic and before `AgencyShell`'s
`linkableStages` (which otherwise links brief/proposal/deposit
unconditionally on the agency side, per A16's existing Figma deviation).
A skipped brief is never a link on either shell, by design.

## A06 — baseline copy hidden, not replaced

"Use the approved brief as the scope baseline." is omitted entirely
(`PageHeader`'s `description` is already optional) rather than swapped for
alternate copy — there's no brief-skipped-specific guidance in the brief
for this screen, and an empty `PageHeader` description is a normal,
already-supported state. "Copy client link"/"Preview client view" were
already present on A06 from Phase 2a-design — nothing to add there.

## Guest link now branches on project stage, not just "brief"

`getGuestBriefView` (brief-only) became `getGuestProjectView`, returning a
`{ kind: "brief" | "proposal", ... }` union. `/b/[token]` renders whichever
the project's current stage implies: `"brief"` while the project is still
at the `brief` stage, the proposal once it's moved past — covering both the
normal flow (brief approved) and the skip flow identically, off the same
share-link token. This also fixes a latent bug the skip flow would
otherwise have hit: without this change, a guest link to a skipped-brief
project would have rendered the skipped version's blank fields as if it
were a real brief to review.

The guest proposal view is read-only (`ProposalDocument` has no editable
fields) with "Accept proposal"/"Request changes" buttons that both route
through `/sign-in?variant=brief&returnTo=<the proposal page>` — mirroring
the existing guest-brief round trip exactly, back to the proposal page
itself rather than straight to the accept/changes sub-routes, so the
signed-in client lands somewhere they can still change their mind. The
sign-in page's `variant=brief` copy ("Sign in to continue, leave a comment
or request changes" / "Back") was reworded slightly to stay accurate for
both the brief and proposal guest flows sharing it, rather than adding a
second variant for one word's difference.

## Client dashboard — the "Your projects" row no longer hardcodes `/brief`

Every project card linked straight to `/projects/{id}/brief` regardless of
stage. Changed to `/projects/{id}/${project.stage}` — the stage name is
already the exact route segment for every stage (see `STAGE_ROUTES` in
`ProjectJourney.tsx`), so this is a one-line fix, not a new mapping. This
was a real latent bug independent of the skip flow (any project already
past the brief stage would link into a brief page that redirects away), but
the skip flow is what surfaces it immediately for a brand-new project.

## Client/agency brief pages redirect away from a skipped brief

Both brief review pages (`(client-project).../brief/page.tsx` and
`(agency-project).../brief/page.tsx`) now redirect to the proposal page
when the current brief's `status === "skipped"` — there's nothing to review
or edit, and without this a direct URL visit (bypassing the now-unlinked
journey sidebar) would render a confusing blank-brief editor/review screen.

# Design notes — Phase 4a (MongoDB, Redis sessions, real auth)

## Invoice dedup: no `(proposalVersionId, invoiceKind)` field, by design

The brief for this phase asked for a unique index on `(proposalVersionId,
invoiceKind)` so invoices can't duplicate. `Invoice` has no
`proposalVersionId` field at all, and never has — every invoice this app
creates already gets a **deterministic id** (`inv-{projectId}-deposit`,
`inv-{projectId}-final`, `inv-{projectId}-additional-{scopeChangeId}`, see
`invoice-service.ts`/`scope-change-service.ts`). That means Mongo's
default unique `_id` index already gives the exact guarantee asked for —
two concurrent "create this invoice" calls land on the same document
either way. Adding an unused field to satisfy the letter of the spec
without a real reader felt like the wrong kind of fidelity; this note is
here instead so the substitution is visible rather than silently applied.

## "Stage changes + activity log" transaction: no activity log exists

There's no activity-log write path in this codebase — `ActivityItem`/
`AttentionTask` are seeded, read-only data (`ActivityRepository`/
`AttentionRepository` only have `listByClientId`, no `create`). The actual
multi-document write on a stage transition is `tryAdvanceStageIfGated`'s
project update, plus (on the development → launch transition)
`activateScheduledInvoices`'s invoice updates and the `final_invoice_due`
notification. That's what's wrapped in a transaction — the real multi-write
this codebase has, in place of a literal "activity log" that was never built.

## Transactions thread an optional `ClientSession`, not a blanket repository rewrite

`withTransaction` (`server/db/mongoose.ts`) branches on `REPOSITORY_DRIVER`:
a real Mongo transaction when `mongo`, or just `fn(null)` directly for
`memory` (no connection attempted at all — nothing to transact, and the
memory driver's tests don't need one). Threading it through every one of
the 24 repository interfaces' ~150 methods would have been a true
"refactor outside this scope." Instead, exactly the methods the three
required transactions touch (`ProjectRepository.update`,
`ProposalRepository.update`, `AcceptanceRecordRepository.create`,
`InvoiceRepository.update`, `ScopeChangeRepository.update`,
`NotificationRepository.create`) gained an **optional**, trailing
`session?: ClientSession | null` parameter — every existing call site that
omits it is unaffected (TypeScript accepts a class method implementing an
interface with fewer parameters than the interface declares, so the
in-memory repositories didn't need touching at all). `acceptProposal` and
`acceptScopeChange` each wrap their whole body in `withTransaction` and
pass the session down through `createInvoicesFromPaymentSchedule`/
`tryAdvanceStageIfGated`/`notifyAgency`/`notifyClient`.
`tryAdvanceStageIfGated` itself starts its own transaction when called with
no session at all (standalone, from the many other places that call it),
and joins the caller's instead when one's passed in — so it's never nested.

## Mongoose schema convention: `id` as `_id`, timestamps under different names

Every domain type's own `id` field is the Mongo document's `_id` (a plain
`String`, never an ObjectId) — `ShareLink` and `AgencySettings` are the two
exceptions, since those domain types never had an `id` field to begin
with (`ShareLink` is keyed by `token`; `AgencySettings` is a fixed
singleton document). Mongoose's `timestamps: true` is still turned on for
every schema (the brief's literal ask), but under renamed fields
(`_createdAt`/`_updatedAt`) specifically because almost every entity
already has its *own* `createdAt: string` — a different thing, set by
application logic, not Mongo. Colliding the two would have silently
corrupted the existing field on every write. The repository layer strips
`_id`/`__v`/`_createdAt`/`_updatedAt` before returning anything, so a
caller never sees Mongo's internals leak into a domain object.

## Password hashing: two formats, one dual-verify function

`hashPassword`/`verifyPassword` (`auth/password.ts`) — the original scrypt
implementation — are unchanged and still used by `seed-data.ts`'s
`SEED_USERS` (hashed synchronously at module load, which argon2's
async-only API can't do) for the `REPOSITORY_DRIVER=memory` test path.
`hashPasswordSecure` (new, argon2) is what every *real* password goes
through now: `db:seed`, invite-accept, and password-reset.
`verifyPassword` became async and dispatches on the stored hash's prefix
(`$argon2...` vs the legacy `salt:hash` shape), so the one call site in
`auth-service.ts`'s `signIn` verifies either format correctly regardless
of which driver (and therefore which hashing scheme) produced the account.

## A20 "Invite team member" now goes through the real invite flow

Previously: typed a temporary password, created the `AgencyUser` instantly,
no email. Now: creates a pending `Invite`, emails (via the dev console
`EmailProvider`) a link to `/invite/[token]`, and the real `AgencyUser`
record is only created once they accept it and set their own password —
consistent with the client-invite flow this phase also adds. `TeamManager`
no longer optimistically appends a fake team member to the visible list on
"Send invite" (they aren't one yet); it shows "Invite sent to {email}."
instead. `settings-service.ts` lost its own `inviteTeamMember` — the one in
`invite-service.ts` is now the only one, and `/api/agency/team` points at it.

## Rate limiting is disabled when `ALLOW_DEMO_STATE=true`

5 attempts per 15 minutes per `action:email:ip` would otherwise make the
Playwright suite's `signIn()` helper — called dozens of times across every
spec file against the same handful of seeded accounts — start failing with
429s partway through a run. `ALLOW_DEMO_STATE=true` is already this
codebase's existing signal for "this is the e2e run" (see the demo-state
route's own gate); `checkRateLimit` reuses it rather than inventing a
second one.

## CSRF: `/api/dev/demo-state` is exempt from the Origin check

Every other mutating `/api/*` request now needs a matching `Origin` header
(checked in `src/proxy.ts`, which also gained `/api/:path*` to its matcher
— previously excluded entirely). The demo-state route is the one
exception: it's already a documented test-only fixture control with *no*
session check at all by design, and Playwright's `request.post()` calls it
directly rather than through a page's real `fetch()`, so it never carries a
browser-set `Origin` header. Every real app mutation goes through the
browser from a loaded page, which does set `Origin` on `fetch()` calls
regardless of method — those are unaffected.

## `/invite`, `/forgot-password`, `/reset-password` — not in Figma

Built in C17's sign-in-page style (centered card, same `Field`/`Button`,
same `Logo` header) since there's no Figma frame for any of them. Added to
`proxy.ts`'s `PUBLIC_PREFIXES` so an unauthenticated visitor following an
emailed link isn't bounced to sign-in before they can act on it. The
sign-in page's existing `?variant=brief` copy ("Sign in to approve the
brief...") was reworded slightly ("Sign in to continue...") since it's now
shared by the brief guest flow and nothing else — a second variant for one
sentence's difference felt like the wrong layer to add complexity at.

## Repository tests skip cleanly, not loudly, when Mongo isn't running

`mongo-repositories.test.ts` probes `MONGODB_URI` with a 2-second timeout
at module load (top-level `await`, supported under Vitest's ESM) and wraps
its whole `describe` in `describe.skipIf(!mongoAvailable)`. This dev
environment doesn't always have MongoDB started, and a hard failure there
would make `npm run test` look broken for a reason unrelated to the code —
skipped (visibly, in the test output) is more honest than either failing
the whole suite or silently asserting nothing.
