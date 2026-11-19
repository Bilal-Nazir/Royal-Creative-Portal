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
