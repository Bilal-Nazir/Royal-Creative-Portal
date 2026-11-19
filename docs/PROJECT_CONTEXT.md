# Project context

Royal Creative client/agency portal. Figma file `q59B9tWGSDdfXZXSSNDazB`.

## Stack

Next.js 16 (App Router, Turbopack) · TypeScript strict · Tailwind v4 (CSS-based tokens, no config file) · Zod · jose (session JWT) · lucide-react (icons Figma doesn't have) · Vitest · Playwright. No other UI libraries. npm.

## Folder structure

```
src/
  app/
    (auth)/sign-in            shared C16/C17 sign-in, ?variant= and ?returnTo=
    (client)/                 dashboard, messages, files, payments — no per-project sidebar
    (client-project)/projects/[projectId]/
                               brief, proposal, deposit, design(+revise), development(+revise),
                               launch, handover, scope-changes, final-payment + sub-actions —
                               own layout injects the "PROJECT JOURNEY" sidebar via
                               ClientShell(journeyStage)
    (agency)/agency/           dashboard, projects (board), projects/new, payments, contacts, etc.
    (agency-project)/agency/projects/[projectId]/
                               project detail, brief, proposal, deposit, content, design
                               (hub/submit/rounds/[roundId]), development (hub/submit/
                               rounds/[roundId]), launch (checklist + handover resources —
                               no separate agency handover route, see DESIGN_NOTES),
                               conversation — own layout injects the "PROJECT JOURNEY"
                               sidebar via AgencyShell(journeyStage)
    api/                       thin route handlers — parse input, call a service, map
                               ServiceResult to an HTTP status. No business logic here.
    api/files/                 upload (multipart) + [fileId] (authorized download, never public)
    b/[token]                  public guest brief preview, no auth
  components/
    ui/                        Button, Field, Select, Badge, Card, ListRow, ProgressBar,
                               AssigneeChip, etc.
    layout/                    ClientShell, AgencyShell, MobileNav, TopBar, ProjectJourney
                               (ProjectJourney: basePath + linkableStages props so both
                               shells can reuse it with different link rules)
    project/                   BriefDocument, ProposalDocument, CommentThread, ProjectsBoard
                               (kanban), InvoiceList, PaymentStatusMenu, CopyClientLinkButton,
                               PreviewClientViewButton, FileDropField, PinOverlay,
                               DesignReviewWorkspace/Tabs, ChatPanel, ReadOnlyNotice,
                               EmptyReviewCard
    dev/DemoStateSwitcher.tsx  dev-only, see below
  server/
    domain/                    plain types + pure functions (stage.ts, brief.ts, invoice.ts,
                               content.ts, design.ts [ReviewKind: design|development],
                               scope-change.ts, handover-resource.ts, message.ts,
                               notification.ts, upload.ts...)
    repositories/               interfaces.ts + in-memory/ impls + container.ts (DI point)
    services/                  business rules + permission checks; return ServiceResult<T>
    auth/                       session (jose), password hashing, cookies, share tokens
    payments/                   PaymentProvider interface + MockPaymentProvider
    storage/file-store.ts       see "Data store" below
    storage/storage-provider.ts StorageProvider interface + local-disk impl (.data/uploads/)
    storage/upload-validation.ts per-scope MIME/size validation + filename sanitization
```

Routes are split into `(client)` vs `(client-project)` route groups because the
project-scoped pages need a different sidebar (with the stage list) — see
`(client-project)/projects/[projectId]/layout.tsx`.

## Data store

Two tiers:
- **Pure in-memory arrays** (`server/repositories/in-memory/seed-data*.ts`) for
  data nothing ever mutates: users, activity feed, attention tasks, agency
  overview stats, content checklist, share links.
- **File-backed JSON** (`.data/phase2a-store.json`, gitignored, auto-seeded on
  first read, written atomically via a temp-file-then-rename) for every
  entity that gets mutated by one Next.js "layer" (a route handler) and read
  by another (a page Server Component): Project, BriefVersion,
  ProposalVersion, Invoice, Comment, AcceptanceRecord, ShareLink,
  ContentChecklistItem, ContentSubmission, DesignVersion (kind: design or
  development — one track, not two parallel collections), DesignPinComment,
  RevisionRound (also kind-discriminated), ProjectMessage, Notification,
  UploadedFile (metadata only — bytes live in `.data/uploads/`, see
  `storage/storage-provider.ts`), ScopeChange, HandoverResource.

**Why the file.** Next.js compiles Route Handlers and page Server Components
into separate module/VM contexts that do not share state — not even via
`globalThis`. A POST handler's mutation would be invisible on the very next
page load without persisting outside the JS module graph. Confirmed in both
`next dev` and the production `next start` build. A real database later
replaces just this file — `server/repositories/container.ts` is the only
place that imports concrete repository classes.

To reset to seed state: `npm run seed:reset` (deletes `.data/phase2a-store.json`;
the next read reseeds it).

## Stage machine & business-rule decisions

8 stages, strictly sequential, defined in `server/domain/stage.ts`:
`brief → proposal → deposit → content → design → development → launch → handover`.

- **Progress** = `completedStageCount(stage) / 8` — current stage doesn't
  count as complete (Design = 4/8 = 50%).
- **`deposit → content`** gates on `invoice.status === "paid"` only. A
  client-reported ("unverified") bank transfer does not satisfy it until an
  admin calls `verifyInvoicePayment`.
- **`content → design`** requires every *required* content-checklist item
  `status === "accepted"`. The one `forceable` transition — an agency
  owner/admin/assigned member can force it (`forceAdvanceContentToDesign`,
  wired to the UI on A09), recorded on `Project.forcedAdvances`.
- **`design → development`** requires the project's current *design-kind*
  `DesignVersion` to have `status === "approved"` (`approveDesignVersion`,
  R07).
- **`development → launch`** requires the project's current
  *development-kind* `DesignVersion` to be approved (`approveDesignVersion`,
  R08/R19) — real now, not hardcoded `false`. That same approval ticks
  `launchChecklist.clientApproval`.
- **`launch → handover`** gates on all 4 of `Project.launchChecklist`
  (client approval, final payment, domain & hosting, quality checks).
  Client approval and final payment tick themselves (see above, and
  `tickFinalPaymentIfApplicable` in `invoice-service.ts`); domain & hosting
  and quality checks are manual agency toggles (A13,
  `updateLaunchChecklistItem`). The actual stage move only happens via
  `goLive` (A13's "Launch website"), not automatically the moment the 4th
  check ticks — it additionally requires `Project.launchDate`/`liveUrl` to
  be set (`setLaunchDetails`, editable independent of checklist progress).
- Accepting a proposal (`acceptProposal`) turns its payment schedule into
  real invoices: the deposit row is `unpaid` immediately, the final row is
  created `scheduled` (exists, not due yet) and only flips to `unpaid` when
  the project reaches `launch` (`activateScheduledInvoices` in
  `stage-service.ts`, which also sends a `final_invoice_due` notification).
  Idempotent — accepting twice never duplicates.
- Development revision rounds (R18) have no revision-allowance concept —
  `RevisionRound.overAllowance` is always `false` for `kind: "development"`;
  only design rounds are checked against the proposal's included rounds.
- A **scope change** (R09 client review; created from R04/R18's "Flag for
  scope decision" or from A16) never blocks the current stage either way.
  Accepting records the acceptance and creates a separate `"additional"`
  invoice type (guarded against double-processing — see DESIGN_NOTES);
  declining just records the decision.

## Permissions

Every mutating service call checks permissions itself (`assertClientCanActOnProject`,
`assertAgencyCanManageProject` in `server/services/permissions.ts`), returning
`{ ok: false, status: 403 }` — enforced in services, not just hidden in the UI.
Client viewers and agency members on projects they're not assigned to are
denied on every action, tested directly in `project-actions.test.ts`.

## Seeded logins

Password `password123` for everyone.

| Email | Role |
|---|---|
| `jerry@royalcreative.co` | agency owner — sees all projects |
| `jordan@royalcreative.co`, `alex.morgan@royalcreative.co` | agency member — own assigned projects only |
| `alex@royaltrendsy.com` | client participant (Royal Trendsy) — can act |
| `priya@royaltrendsy.com` | client viewer (Royal Trendsy) — read-only, 403 on every action |
| `clara@ashworthchambers.com`, `tom@lindensurveyors.com` | client participants, other projects |

Royal Trendsy (`proj-royal-trendsy`) is the fully-seeded demo project: brief
approved, proposal v2 accepted, deposit paid, 3/4 required content items
accepted (force-advanced into Design by Jerry — see `forcedAdvances`). It
has no design or development version seeded by default — use the demo
switcher's scenario dropdowns to reach any point in either revision loop,
launch, handover, or a scope change.

## Dev-only demo-state switcher

Floating widget, bottom-right, visible only when `NODE_ENV === "development"`
(`components/dev/DemoStateSwitcher.tsx` + `POST /api/dev/demo-state`, which
404s outside dev regardless of auth). Lets you set Royal Trendsy's stage,
brief status, proposal status, deposit invoice status, content scenario,
design scenario, development scenario, launch scenario, final invoice
status, handover scenario, or scope change scenario directly, to reach any
screen without replaying the full flow. All of these are coarse named
presets (e.g. `developmentScenario=v2_ready`, `launchScenario=checklist_complete`)
that synthesize a whole consistent set of records in one call rather than
exposing every field as its own control — see DESIGN_NOTES. Because it
needs `next dev`, `playwright.config.ts`'s e2e suite also runs against
`next dev`, not `start`.

## Phases done

- **Phase 1** — foundation: Next.js/Tailwind/Zod/jose scaffold, design tokens,
  auth, role-based routing, client dashboard (C02), agency dashboard (A00),
  sign-in (C17), stage machine v1.
- **Phase 2a** — client journey: guest brief preview (C01) → sign-in (C16) →
  brief review/revise/approved (C03–C05) → proposal review/changes/accept
  (C06, C07, R14) → deposit checkout/paid/failed (C08–C10) → choose payment
  date (R11). Demo-mode mock payments. File-backed store (see above).
- **Phase 2a follow-up** — first (non-Figma-matched) pass at the agency side;
  superseded by Phase 2a-design below.
- **Phase 2a-design** — agency side rebuilt to match Figma: A02 projects
  board (kanban, search/filter), A04 new project (+ added client selector),
  A16 project detail (assignee, description, internal team comments, journey
  links), A05/A06 brief & proposal editors (structured fields, draft/send,
  client feedback section, copy/preview client link), A07 payments dashboard
  (real metrics, invoice list, quick status menu), A08 update payment status
  (mark paid manually / verify). New `(agency-project)` route group mirrors
  `(client-project)`.
- **Phase 2b** — Content stage (C11 client submission, A09 agency review,
  force-advance wired to UI) and the Design revision loop (A10 first
  submission, C12/R01 pin-comment review, R02/R13 submit a revision round,
  R04 agency tracking + scope review, R05 resubmission, R06 re-review, R07
  approval → Development). Project chat (R10 standalone, R12 as a tab on
  the review page). Authorized file uploads/downloads
  (`StorageProvider`, local disk). R15/R16/R17/R20 empty/error/viewer/
  loading states applied to the review pages.
- **Phase 2c** — Development (A11 submit, C13/R08 client review, R18 agency
  per-item tracking, R19 revised review → approval → Launch), reusing the
  design review machinery via a new `ReviewKind` discriminator rather than
  duplicating it. Launch (A13 checklist + handover resources, C14 readiness,
  final balance checkout — no Figma screen, reuses the deposit checkout
  pattern). Handover (C15; A13's resources section covers the agency side,
  no separate agency screen). Scope change (R09 client accept/decline;
  creation has no Figma screen on either side). New `NotificationType`s for
  all of the above; demo switcher extended with 5 new scenario groups.

See `docs/DESIGN_NOTES.md` for the detailed list of deviations from Figma and why.

## Running checks

```
npm run lint        # eslint, 0 errors expected (a few next/image warnings on SVGs are fine)
npm run typecheck   # tsc --noEmit
npm run test        # vitest — unit tests for stage/content/design/invoice rules + permissions
npm run build        # next build — must succeed clean
npx playwright test  # visual check at 1440px + 390px for every screen; starts its own `next dev`
```

Kill any stray `next dev`/`next start` process bound to the port before
re-running Playwright locally — a leftover process serving an old build will
silently make results look wrong (it already happened once).
