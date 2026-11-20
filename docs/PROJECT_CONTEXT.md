# Project context

Royal Creative client/agency portal. Figma file `q59B9tWGSDdfXZXSSNDazB`.

## Stack

Next.js 16 (App Router, Turbopack) · TypeScript strict · Tailwind v4 (CSS-based tokens, no config file) · Zod · lucide-react (icons Figma doesn't have) · Vitest · Playwright. MongoDB via Mongoose (real persistence, Phase 4a) · Redis via ioredis (sessions, rate limiting, cache) · argon2 (real password hashing). No other UI libraries. npm.

## Local setup (Phase 4a)

- Copy `.env.example` to `.env.local` and fill in `AUTH_SECRET` (any long random string), `MONGODB_URI`, `REDIS_URL`. Validated with Zod at startup (`server/env.ts`, invoked from `instrumentation.ts`) — a missing/malformed var fails immediately with a clear message, not a confusing error three layers down.
- `REPOSITORY_DRIVER=mongo` (the real app) or `memory` (unit tests — set in `vitest.config.ts`, not `.env.local`). `server/repositories/container.ts` is the only place that branches on it.
- **MongoDB must be a replica set** — even a single-node one — because transactions (`server/db/mongoose.ts`'s `withTransaction`, used for proposal acceptance, scope-change acceptance, and stage transitions) need an oplog to commit against. A standalone `mongod` throws a clear error pointing here instead of Mongo's much less actionable one. To convert a local standalone instance:
  1. Stop `mongod`.
  2. Add `replication: { replSetName: "rs0" }` to its config file (or start it with `mongod --replSet rs0` directly).
  3. Start `mongod` again.
  4. `mongosh --eval "rs.initiate()"` — one-time, only needed once per data directory.
  5. `mongosh --eval "rs.status()"` should now show `"stateStr": "PRIMARY"`.
- Tests never touch dev data: `vitest.config.ts` points `MONGODB_URI` at `rc_portal_test` and `REDIS_URL` at Redis DB index 1 (dev uses DB 0), and sets `REPOSITORY_DRIVER=memory` so most tests don't touch Mongo at all. `server/repositories/mongo/mongo-repositories.test.ts` is the exception — it talks to the real `rc_portal_test` database directly and skips itself (not a failure) if Mongo isn't reachable.
- `npm run db:seed` (`scripts/seed-mongo.ts`, run via `tsx`) wipes every collection in `MONGODB_URI` and reseeds the same demo data as the memory driver, asking for a typed "yes" confirmation first. Passwords are re-hashed with argon2 at seed time (`password123` for every seeded login, same as before).

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
    (auth)/invite/[token]      accept a team/client invite, set a password (Phase 4a, not in Figma)
    (auth)/forgot-password     (auth)/reset-password/[token]  real password reset (Phase 4a, not in Figma)
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
                               EmptyReviewCard, ContactsBoard, PipelineStagesManager,
                               LogFollowUpForm
    notifications/              NotificationsView (A14), MessagesInbox (A29/A15, shared by
                               agency + client)
    settings/                  AgencySettingsForm, TeamManager (A20)
    dev/DemoStateSwitcher.tsx  dev-only, see below
  server/
    domain/                    plain types + pure functions (stage.ts, brief.ts, invoice.ts,
                               content.ts, design.ts [ReviewKind: design|development],
                               scope-change.ts, handover-resource.ts, message.ts
                               [+ConversationRead], notification.ts, upload.ts, contact.ts,
                               settings.ts...)
    repositories/               interfaces.ts + in-memory/ impls + mongo/ impls + container.ts
                               (DI point — branches on REPOSITORY_DRIVER)
    db/                        mongoose.ts (cached connection, withTransaction, replica-set
                               check), models.ts (every Mongoose schema), redis.ts (cached client)
    services/                  business rules + permission checks; return ServiceResult<T>
    auth/                       session.ts (Redis-backed opaque sessions), password.ts
                               (argon2 + legacy scrypt dual-verify), rate-limit.ts, cookies.ts
    email/                      EmailProvider interface + dev console provider (real email is 4b)
    payments/                   PaymentProvider interface + MockPaymentProvider
    storage/storage-provider.ts StorageProvider interface + local-disk impl (.data/uploads/)
    storage/upload-validation.ts per-scope MIME/size validation + filename sanitization
```

Routes are split into `(client)` vs `(client-project)` route groups because the
project-scoped pages need a different sidebar (with the stage list) — see
`(client-project)/projects/[projectId]/layout.tsx`.

## Data store (Phase 4a — real persistence)

MongoDB via Mongoose is now the real app's persistence (`REPOSITORY_DRIVER=mongo`).
Every domain entity has a Mongoose model (`server/db/models.ts`) and a matching
Mongo repository class (`server/repositories/mongo/mongo-repositories.ts`)
implementing the same interfaces the file store used to. Convention: the
domain's own `id` field is the document's `_id` (a plain String, not an
ObjectId) — ShareLink and AgencySettings are the two exceptions, since those
domain types have no `id` field at all. Every date-ish field
(`createdAt`, `approvedAt`, ...) is stored as a plain String, matching the
domain type exactly — Mongoose's own `timestamps` option is still enabled,
but under custom field names (`_createdAt`/`_updatedAt`) specifically so it
can't collide with (and silently corrupt) those existing string fields.

Indexes: unique `User.email`, unique `ShareLink.token`, unique
`Invoice.invoiceNumber`, unique `Invite.tokenHash` /
`PasswordResetToken.tokenHash`, plus non-unique indexes on the common
lookups (`projectId`, `clientId`, `status`, `assigneeId`, ...). See
DESIGN_NOTES for why there's no `(proposalVersionId, invoiceKind)` unique
index — invoice ids are already deterministic (`inv-{projectId}-{type}`),
so Mongo's default unique `_id` index already provides the same guarantee.

**REPOSITORY_DRIVER=memory** (unit tests only) uses plain in-process arrays
(`server/repositories/in-memory/memory-store.ts`, seeded from the same
`seed-data*.ts` fixtures) — no file, no database. The old JSON-file store
existed only because Next.js Route Handlers and page Server Components ran
in separate module/VM contexts that didn't share `globalThis`; Mongo is now
that real shared persistence for the app, and a single-process vitest run
never had that problem to begin with.

Transactions (`server/db/mongoose.ts`'s `withTransaction`) wrap proposal
acceptance (proposal + acceptance record + invoices + stage advance), scope
change acceptance (invoice + scope change + notification), and stage
transitions generally (project update + any invoice activation + the
notification it sends) — see DESIGN_NOTES for how the repository
interfaces thread an optional Mongo `ClientSession` through just those call
paths without changing every method signature.

## Stage machine & business-rule decisions

8 stages, strictly sequential, defined in `server/domain/stage.ts`:
`brief → proposal → deposit → content → design → development → launch → handover`.

- **Progress** = `completedStageCount(stage) / 8` — current stage doesn't
  count as complete (Design = 4/8 = 50%).
- **`BriefStatus` has a `"skipped"` value** (Phase 4) — a project can start
  at Proposal instead of Brief. Only the brief can be skipped, and only
  before it's been sent or approved (`draft`, or no brief yet). `skipBrief`
  (`brief-service.ts`, owner/admin only) records `skippedByUserId`/
  `skippedByName`/`skippedAt` and moves the project straight to `proposal`.
  `computeGateState`'s `briefApproved` treats `"skipped"` exactly like
  `"approved"`, so it satisfies the `brief → proposal` gate and — since
  progress is purely `stageIndex(stage) / 8` — counts as a completed stage
  with no separate progress-calculation change needed.
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

## Auth (Phase 4a)

- **Sessions**: opaque random id in an httpOnly, `Secure`-in-production,
  `SameSite=Lax` cookie (`rc_session`) — the session data itself lives in
  Redis under that id, with an 8-hour TTL refreshed (sliding expiry) on
  every verify. Logout deletes the Redis key; a password or role change
  calls `sessionService.revokeAllForUser()`, which deletes every session a
  user currently holds, everywhere they're signed in.
- **Rate limiting**: 5 attempts per 15 minutes, keyed by
  `action:email:ip` (Redis `INCR`+`EXPIRE`) — sign-in, forgot-password, and
  invite/reset-accept. Disabled when `ALLOW_DEMO_STATE=true` (Playwright's
  env) since the e2e suite signs in dozens of times against the same
  seeded accounts.
- **Invites**: `server/services/invite-service.ts` — an agency owner/admin
  invites a team member (A20 Settings) or a client (from a project/contact);
  the token is sha256-hashed before storage, 72-hour expiry, one-time use.
  `/invite/[token]` sets a password, then the user signs in normally.
- **Password reset**: `server/services/password-reset-service.ts` — same
  hashed-token shape, 1-hour expiry, one-time use. `requestPasswordReset`
  always returns ok and only sends an email when the address exists — never
  reveals which case it was.
- **Email**: `server/email/email-provider.ts`'s `EmailProvider` interface,
  with a dev provider that logs the message + link to the console. Real
  email is Phase 4b.
- **CSRF**: `src/proxy.ts` checks the `Origin` header matches the app's own
  origin on every mutating (`POST`/`PUT`/`PATCH`/`DELETE`) request to
  `/api/*`, before the route handler runs. `/api/dev/demo-state` is
  exempt — it's already a documented test-only fixture control with no
  session check at all, and Playwright calls it directly via
  `request.post()`, which doesn't carry a browser `Origin` header.

## Seeded logins

Password `password123` for everyone, re-hashed with argon2 by `npm run db:seed`
(the baked-in hash in `seed-data.ts` is scrypt, kept only for the
`REPOSITORY_DRIVER=memory` test path — see DESIGN_NOTES).

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
- **Phase 3** — A00 dashboard rebuilt on real computed data (no more
  hardcoded `AgencyOverview`); A14 notifications + a real TopBar unread
  bell everywhere; A29/A15 cross-project messages inbox (agency + client);
  a new Contacts pipeline (A17/A18/A28/A30 — custom stages, move, follow-up
  log); A20 agency settings (details, owner contact wired to the client
  sidebar, team invite/role-change/remove, notification toggles); A27
  Stripe settings placeholder; client Messages/Files/Payments nav pages (no
  Figma frames, built from existing services). `UserRepository` and the
  client directory (`CLIENT_DIRECTORY` → `getClientDirectory()`) moved from
  hardcoded/static to real file-store-backed data. See DESIGN_NOTES for the
  full list.
- **Phase 4** — flow change: a project can start at Proposal, skipping the
  Brief entirely. A04 gained a "Start from" choice (Brief/Proposal); A16
  gained an owner/admin-only "Skip brief" action (confirm dialog, draft-only
  brief); both journey sidebars render a skipped brief as "– Brief ·
  Skipped" (muted, not a link); A06 hides the "approved brief" baseline copy
  when skipped; the guest share link (`/b/[token]`) now shows the proposal
  instead of the brief once the project is past the brief stage, with its
  own read-only Accept/Request changes → sign-in → back-to-proposal round
  trip. See DESIGN_NOTES for the full list.
- **Phase 4a** — real persistence and auth: MongoDB (Mongoose) replaces the
  JSON file store behind the same repository interfaces; the memory driver
  (tests) is now a plain in-process store. Redis-backed sessions (opaque
  id, sliding TTL, logout/revocation), rate limiting, and a short-TTL
  dashboard-metrics cache. argon2 password hashing for every real account;
  invite (team + client) and forgot/reset-password flows, each with
  hashed/expiring/one-time-use tokens and a console `EmailProvider`. CSRF
  Origin check on every mutating API request. Mongo transactions around
  proposal acceptance, scope-change acceptance, and stage transitions. See
  DESIGN_NOTES for the full list of deviations and substitutions.

See `docs/DESIGN_NOTES.md` for the detailed list of deviations from Figma and why.

## Running checks

```
npm run lint        # eslint, 0 errors expected (a few next/image warnings on SVGs are fine)
npm run typecheck   # tsc --noEmit
npm run test        # vitest — REPOSITORY_DRIVER=memory for everything except
                     # mongo-repositories.test.ts, which talks to the real
                     # rc_portal_test database and skips itself if Mongo isn't reachable
npm run build        # next build — must succeed clean
npx playwright test  # visual check at 1440px + 390px for every screen; builds and starts a production server (see below)
```

Playwright (and any real manual testing) needs MongoDB and Redis actually
running locally — `.env.local`'s `REPOSITORY_DRIVER=mongo` means the app
itself depends on both. Run `npm run db:seed` at least once before the
first Playwright run or manual sign-in against a fresh Mongo.

Playwright's `webServer` now runs `next build && next start` (not `next
dev`) with `ALLOW_DEMO_STATE=true`, so the dev-only demo-state fixture route
stays reachable under a production build — see DESIGN_NOTES (Phase 3) for
why. `workers: 2`; cross-file state isolation during a concurrent run is
not guaranteed (each file's own tests are still serial).

Kill any stray `next dev`/`next start` process bound to the port before
re-running Playwright locally — a leftover process serving an old build will
silently make results look wrong (it already happened once).
