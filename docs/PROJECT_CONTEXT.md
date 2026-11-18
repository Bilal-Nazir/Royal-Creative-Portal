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
                               brief, proposal, deposit + sub-actions — own layout injects
                               the "PROJECT JOURNEY" sidebar via ClientShell(journeyStage)
    (agency)/agency/           dashboard, projects (board), projects/new, payments, contacts, etc.
    (agency-project)/agency/projects/[projectId]/
                               project detail, brief, proposal, deposit — own layout injects
                               the "PROJECT JOURNEY" sidebar via AgencyShell(journeyStage)
    api/                       thin route handlers — parse input, call a service, map
                               ServiceResult to an HTTP status. No business logic here.
    b/[token]                  public guest brief preview, no auth
  components/
    ui/                        Button, Field, Select, Badge, Card, ListRow, ProgressBar,
                               AssigneeChip, etc.
    layout/                    ClientShell, AgencyShell, MobileNav, TopBar, ProjectJourney
                               (ProjectJourney: basePath + linkableStages props so both
                               shells can reuse it with different link rules)
    project/                   BriefDocument, ProposalDocument, CommentThread, ProjectsBoard
                               (kanban), InvoiceList, PaymentStatusMenu, CopyClientLinkButton,
                               PreviewClientViewButton
    dev/DemoStateSwitcher.tsx  dev-only, see below
  server/
    domain/                    plain types + pure functions (stage.ts, brief.ts, invoice.ts...)
    repositories/               interfaces.ts + in-memory/ impls + container.ts (DI point)
    services/                  business rules + permission checks; return ServiceResult<T>
    auth/                       session (jose), password hashing, cookies, share tokens
    payments/                   PaymentProvider interface + MockPaymentProvider
    storage/file-store.ts       see "Data store" below
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
  first read, written atomically via a temp-file-then-rename) for the seven
  entities that get mutated by one Next.js "layer" (a route handler) and read
  by another (a page Server Component): Project, BriefVersion,
  ProposalVersion, Invoice, Comment, AcceptanceRecord, ShareLink.

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
  accepted. The one `forceable` transition — an agency owner/admin/assigned
  member can force it (`forceAdvanceContentToDesign`), recorded on
  `Project.forcedAdvances`.
- **`development → launch`** gates on client build approval alone.
  **`launch → handover`** gates on a separate 4-item `Project.launchChecklist`
  (client approval, final payment, domain & hosting, QA) instead.
- Accepting a proposal (`acceptProposal`) turns its payment schedule into
  real invoices: the deposit row is `unpaid` immediately, the final row is
  created `scheduled` (exists, not due yet) and only flips to `unpaid` when
  the project reaches `launch` (`activateScheduledInvoices` in
  `stage-service.ts`). Idempotent — accepting twice never duplicates.

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
accepted (force-advanced into Design by Jerry — see `forcedAdvances`).

## Dev-only demo-state switcher

Floating widget, bottom-right, visible only when `NODE_ENV === "development"`
(`components/dev/DemoStateSwitcher.tsx` + `POST /api/dev/demo-state`, which
404s outside dev regardless of auth). Lets you set Royal Trendsy's stage,
brief status, proposal status, or deposit invoice status directly, to reach
any screen without replaying the full flow. Because it needs `next dev`,
`playwright.config.ts`'s e2e suite also runs against `next dev`, not `start`.

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

See `docs/DESIGN_NOTES.md` for the detailed list of deviations from Figma and why.

## Running checks

```
npm run lint        # eslint, 0 errors expected (a few next/image warnings on SVGs are fine)
npm run typecheck   # tsc --noEmit
npm run test        # vitest — unit tests for stage/content/invoice rules + permissions
npm run build        # next build — must succeed clean
npx playwright test  # visual check at 1440px + 390px for every screen; starts its own `next dev`
```

Kill any stray `next dev`/`next start` process bound to the port before
re-running Playwright locally — a leftover process serving an old build will
silently make results look wrong (it already happened once).
