# Current Plan

## Active Task
None — all phases complete.

## Completed (Inline Element Detail Panel, Discussion Notes, and Approval Redesign)

### Phases

| Step | Focus | Commit | New Tests |
|------|-------|--------|-----------|
| 1 | Note model + backend CRUD API | `feat: add Note model and backend CRUD API for element/option discussions` | +10 |
| 2 | Remove element locking | `feat: remove element locking — approvals no longer block new options` | +3 (replaced) |
| 3 | Approval color constants + CSS | `feat: add approval color constants and CSS classes` | 0 |
| 4 | Frontend API for notes | `feat: add frontend API methods for notes` | 0 |
| 5 | DiscussionBox component | `feat: add DiscussionBox component for per-element notes` | +4 |
| 6 | Colored Y/M/N approval buttons | `feat: redesign approval buttons with colored Y/M/N` | +5 (updated) |
| 7 | OptionThumbnail component | `feat: add OptionThumbnail component with approval visual states` | +4 |
| 8 | OptionLightbox component | `feat: add OptionLightbox component for full-size media preview` | +4 |
| 9 | Inline ElementDetailPanel + integration | `feat: inline element detail panel in script viewer` | +6 |
| 10 | Approval temperature indicators | `feat: approval temperature indicators on element list` | +4 |

### Test Counts (Post Inline Detail Panel)
- **Frontend**: 257 tests (was 254, +3 net from new components)
- **Backend**: 291 tests (was 290, +1 new)
- **Total**: 548 tests

### Architecture

- **Note model**: Per-element and per-option discussion notes with `NOTE_ADDED` notifications
- **Element locking removed**: Approvals no longer block new option creation; multiple approvals allowed
- **Approval colors**: Green (#00A651), Yellow (#FFD700), Red (#E63946) — documented exception to 1-bit design rule
- **DiscussionBox**: Real-time note thread per element with user names and timestamps
- **Approval buttons**: Colored Y/M/N buttons replacing text Approve/Reject/Maybe
- **OptionThumbnail**: Clickable thumbnail with approval state borders (green/yellow/red) and grayscale
- **OptionLightbox**: Full-size media preview modal with approval buttons, Escape/backdrop close
- **ElementDetailPanel**: Inline panel in script viewer replacing page navigation; composes DiscussionBox, OptionThumbnail grid, OptionUploadForm, and OptionLightbox
- **Temperature indicators**: Colored dots on element list rows based on latest approval decisions (green=approved, yellow=maybe, red=rejected)

## Completed (Enhanced Element Detection, Processing UX, and Colored Highlights)

### Phases

| Phase | Focus | Commit | New Tests |
|-------|-------|--------|-----------|
| 1 | Schema: dept color, REVIEWING status, sceneData field | `feat: add department color, REVIEWING script status, and sceneData field` | 0 (schema only) |
| 2 | Enhanced element detection: props, scene tracking, character-scene mapping | `feat: enhanced element detection with props, scene tracking, and character-scene mapping` | +8 |
| 3 | Processing progress, accept-elements, generate-implied, hard-delete endpoints | `feat: processing progress, accept-elements, generate-implied, and hard-delete endpoints` | +11 |
| 4 | Department color PATCH endpoint, seed default colors | `feat: department color configuration with default colors and PATCH endpoint` | +2 |
| 5 | ProcessingProgress component with polling + auto-refresh | `feat: processing progress bar, element wizard, and mobile layout` | +2 |
| 6 | 3-step ElementWizard (review, departments, accept) | `test: add element wizard tests for review, implied generation, and accept flow` | +6 |
| 7 | Colored PDF highlights, department filter chips, element row colors | `feat: colored department highlights on PDF, filter chips, and element row colors` | +7 |
| 8 | Element ordering, view mode toggle, active row fix, mobile layout | `feat: element ordering, view mode toggle, active row fix, mobile elements-on-top layout` | +4 |
| 9 | CLAUDE.md department color exception, PLAN.md update | (this commit) | 0 |

### Test Counts (Post Enhanced Detection)
- **Frontend**: 220 tests (was 200, +20 new)
- **Backend**: 267 tests (was 248, +19 new)
- **Total**: 487 tests (was 448, +39 new)

### Architecture

- **Element detection**: Props detected as `type: OTHER` with `suggestedDepartment: 'Props'` from ALL-CAPS words in mixed-case action lines
- **Scene tracking**: Sluglines define scene boundaries; character dialogue tracked per scene → `sceneData` stored on Script
- **Processing pipeline**: UPLOADING → PROCESSING (with progress bar) → REVIEWING (wizard) → READY (split-view)
- **Post-processing wizard**: 3-step flow — (1) review/delete elements + generate implied wardrobe/H&M, (2) verify department assignments, (3) accept → READY
- **Hard-delete**: Only allowed during REVIEWING status; after acceptance, only archive (soft-delete)
- **Implied elements**: Per-scene or per-character wardrobe + Hair & Makeup elements auto-generated as `type: OTHER`
- **Department colors**: Configurable hex colors per department (default 13 colors); used for PDF highlights, element row borders, filter chip swatches
- **Element list**: View toggle (By Type / By Appearance), department filter chips, full-row clickable, active row inverted
- **Mobile layout**: Elements panel on top (order-1), PDF panel below (order-2); reversed on lg+ screens

## Completed (Department & Permission Overhaul)

### Phases

| Phase | Focus | Commit | New Tests |
|-------|-------|--------|-----------|
| 1 | Schema migration: departmentId FK on ProductionMember, remove DepartmentMember, 4 new default depts | `feat: migrate to one-department-per-member with departmentId FK` | 0 (schema only) |
| 2 | Backend: dept assignment endpoint, delete protection, remove join-table endpoints | `feat: add department assignment endpoint, protect delete, remove join-table endpoints` | +5 (net -8 from removed tests) |
| 3 | Backend: ADMIN↔DECIDER self role-change, ≥1 ADMIN/DECIDER guard | `feat: allow ADMIN/DECIDER self role-change, require at least 1 ADMIN or DECIDER` | +3 (net from replaced tests) |
| 4 | Frontend: API client types for new schema | `refactor: update frontend API client for one-department-per-member` | 0 |
| 5 | Frontend: dept dropdown per member, protected delete with diagonal shading | `feat: department dropdown per member, disable delete for populated departments` | +2 |
| 6 | Update default dept count in test, update PLAN.md | `chore: update default department count in tests, update PLAN.md` | 0 |

### Test Counts (Post Department Overhaul)
- **Frontend**: 200 tests (was 198, +2 new)
- **Backend**: 248 tests (was 253, -12 removed join-table tests +7 new)
- **Total**: 448 tests (was 451, net -3 from test restructuring)

### Architecture

- One department per member via `departmentId` FK on `ProductionMember` (replaces `DepartmentMember` join table)
- PATCH `/members/:memberId/department` endpoint for ADMIN/DECIDER
- Departments with members cannot be deleted (409 response)
- GET departments returns `_count: { members: N }` instead of full member list
- ADMIN↔DECIDER self role-change allowed; cannot demote self to MEMBER
- Production requires at least 1 ADMIN or DECIDER at all times
- 13 default departments (was 9): added Storyboard Artist, AD, Cinematographer, Stunt Coordinator
- Department dropdown in production dashboard (ADMIN/DECIDER only); read-only label for MEMBER
- `.btn-disabled-striped` CSS class: diagonal stripe pattern on hover for disabled delete

## Completed (Quality Check — Split-View QA)

| Step | Focus | Commit | New Tests |
|------|-------|--------|-----------|
| 1 | Fix stale pageNumbers mock data in backend tests | `fix: update stale pageNumbers mock data in options and approvals tests` | 0 (mock data fix) |
| 2 | Add department selector tests for element detail | `test: add department selector tests for element detail page` | +2 |
| 3 | Rebuild backend dist, deploy to production | (this commit) | 0 |

### Test Counts (Post QA)
- **Frontend**: 198 tests (was 196, +2 new)
- **Backend**: 253 tests (unchanged)
- **Total**: 451 tests (was 449, +2 new)

## Completed (Split-View Script Viewer + Department Assignment)

### Phases

| Phase | Focus | Commit | New Tests |
|-------|-------|--------|-----------|
| 1-4 | Data model migration, backend updates, API client, component updates | `feat: replace pageNumbers with highlightPage/highlightText and add department assignment to elements` | +18 (pdf-highlights, pdf-viewer) |
| 5 | PdfViewer component with react-pdf text layer highlights | `feat: add PdfViewer component with text layer highlights and selection` | +18 |
| 6 | Split-view script page with cross-linked elements | `feat: split-view script page with PDF viewer and cross-linked elements` | +2 |
| 7 | Department assignment in reconciliation + element detail | `feat: add department assignment to reconciliation and element detail pages` | +2 |
| 8 | Edge cases & polish | (verified, no code changes needed) | 0 |

### Test Counts (Post Split-View)
- **Frontend**: 196 tests (was 174, +22 new)
- **Backend**: 253 tests (unchanged)
- **Total**: 449 tests (was 427, +22 new)

### Architecture

- Element model: `highlightPage` (single page) + `highlightText` (matched text) replace `pageNumbers` array
- Element model: `departmentId` FK to Department for organizational assignment
- RevisionMatch model: `detectedPage` + `detectedHighlightText` replace `detectedPages` array
- `ELEMENT_TYPE_DEPARTMENT_MAP` constant auto-suggests departments (CHARACTER→Cast, LOCATION→Locations)
- PdfViewer: react-pdf with text layer overlay for highlighting, click-to-navigate, text selection
- Split-view layout: PDF left panel + elements right panel with cross-linking
- Responsive: stacked on mobile, side-by-side on lg+ screens
- Department selector in reconciliation page with pre-filled suggestions
- Department selector on element detail page

## Completed (Three-Tier Permissions)

### Phases

| Phase | Focus | Commit | New Tests |
|-------|-------|--------|-----------|
| 1 | Schema & Type Updates | `refactor: update MemberRole enum, add tentative to Approval` | 0 |
| 2 | Backend Role Reference Updates | `refactor: rename OWNER to ADMIN, add DECIDER to permission checks` | +4 |
| 3 | Tentative Approval Logic | `feat: MEMBER and ADMIN approvals are tentative, only DECIDER official` | +5 |
| 4 | Confirm Tentative Endpoint | `feat: add PATCH /api/approvals/:id/confirm endpoint for DECIDER` | +6 |
| 5 | Notifications for Tentative Approvals | `feat: notify DECIDERs on tentative approvals, notify creator on confirmation` | +4 |
| 6 | Change Member Role Endpoint | `feat: add endpoint to change member roles` | +7 |
| 7 | Frontend Updates | `feat: update frontend for tentative approvals, role names, and permissions tooltip` | +10 |

### Test Counts (Post Three-Tier Permissions)
- **Frontend**: 174 tests (was 159, +15 new)
- **Backend**: 245 tests (was 220, +25 new)
- **Total**: 419 tests (was 379, +40 new)

### Architecture

Three-tier permission system replacing OWNER/ADMIN/MEMBER:
- **ADMIN** (replaces OWNER): Team/billing management, tentative approvals
- **DECIDER** (new): Official approve/maybe/reject, confirm tentative approvals
- **MEMBER** (unchanged): Tentative approvals only
- MEMBER and ADMIN approvals flagged as tentative; only DECIDER is official
- DECIDERs notified of tentative approvals, can confirm them
- Only non-tentative APPROVED locks elements
- Role-change UI in production dashboard for ADMIN/DECIDER users
- Permissions tooltip explains role-specific approval behavior

## Completed (Sprint 8 — Rebrand + Deploy)

### Phases

| Phase | Focus | Commit | Notes |
|-------|-------|--------|-------|
| 1 | Rebrand UI + emails + tests | `rebrand: rename Backbone to Slug Max in UI, emails, and tests` | TDD: tests updated first, proved fail, source updated, proved pass |
| 2 | Documentation rebrand | `docs: rebrand documentation to Slug Max` | CLAUDE.md, roadmap.md, rules.txt |
| 3 | CORS configuration | `fix: configure CORS from CORS_ORIGINS environment variable` | Production-ready CORS |
| 4 | Production branch | Branch creation | main + production branch strategy |
| 5 | Railway setup | Infrastructure | Frontend, backend, PostgreSQL services |
| 6 | Cloudflare DNS | Infrastructure | slugmax.com + api.slugmax.com CNAMEs |
| 7 | Deployment docs | `docs: add Slug Max deployment instructions` | CLAUDE.md deployment section |
| 8 | CORS tests (TDD) | `test: add CORS configuration tests with app factory refactor` | 3 new tests, createApp factory |
| 9 | S3 bucket rebrand | `fix: rebrand S3 default bucket name to slugmax-uploads` | Default fallback constant |
| 10 | Agent docs + Docker | `docs: rebrand agent docs and Docker script to Slug Max` | pm-orchestrator, qa-reviewer, claude-docker.sh |

| 11 | Backend build fix | `feat: switch backend build to tsup, fix pdf-parse v2 API` | tsup bundler replaces tsc, pdf-parse v2 named exports |
| 12 | Railway project setup | Infrastructure | Slug Max project, PostgreSQL, backend + frontend services |
| 13 | Railway env vars | Infrastructure | DATABASE_URL, JWT_SECRET, CORS_ORIGINS, PORT, S3_BUCKET_NAME |
| 14 | Custom domains | Infrastructure | slugmax.com (frontend), api.slugmax.com (backend) |
| 15 | Cloudflare DNS | Infrastructure | CNAME + TXT verification records for both domains |
| 16 | Dockerfiles | `feat: add Dockerfiles for Railway deployment` | Multi-stage builds for backend and frontend |
| 17 | Deploy branch | Infrastructure | Set Railway deploy branch to `production` for both services |
| 18 | S3 credentials | Infrastructure | AWS S3 credentials added to Railway backend via Railway CLI |
| 19 | Home page links | `feat: add login and signup links to home page` | Login/signup navigation on landing page |
| 20 | Fix API URL in Docker build | `fix: bake NEXT_PUBLIC_API_BASE_URL into frontend Docker build` | ARG/ENV in Dockerfile + TDD test |

### Test Counts (Post Sprint 8 Deployment)
- **Frontend**: 159 tests (+2 api-config tests)
- **Backend**: 220 tests (+1 pdf-parser destroy test)
- **Total**: 379 tests

## Previous: Sprint 7 — Complete

## Completed (Sprint 7)

### Phases

| Phase | Focus | Commit | New Tests |
|-------|-------|--------|-----------|
| 1 | Schema + Shared Types | `feat: add notification and workflow state schema with shared types` | 0 |
| 2 | Workflow State Machine | `feat: update element workflow state on approval and readyForReview` | +5 |
| 3 | Notification Service + API | `feat: add notification service and API endpoints` | +10 |
| 4 | Notification Triggers | `feat: trigger notifications on approval decisions and readyForReview` | +4 |
| 5 | Email Service | `feat: add email notification service with Nodemailer` | +3 |
| 6 | Frontend Bell + API Client | `feat: add notification bell component with dropdown` | +4 |
| 7 | Notifications Page + Workflow Badge | `feat: add notifications page and element workflow state badges` | +5 |

### Test Counts (Post Sprint 7)

- **Frontend**: 151 tests (was 142, +9 new)
- **Backend**: 213 tests (was 191, +22 new)
- **Total**: 364 tests (was 333, +31 new)

### Architecture

- Element workflow state machine: PENDING → OUTSTANDING → APPROVED
  - PENDING: no options marked ready for review
  - OUTSTANDING: at least one option ready for review
  - APPROVED: an option has been approved
  - State transitions in approvals.ts and options.ts
- Notification model with type, message, link, read status
- Notification triggers: approval decisions notify uploader, readyForReview notifies all members
- Email service via Nodemailer (controlled by EMAIL_ENABLED env var)
- Frontend: NotificationBell component in production dashboard, full notifications page
- Workflow state badges on feed cards (Pending=gray, Outstanding=yellow, Approved=green)

## Completed (Sprint 6)

### Phases

| Phase | Focus | Commit | New Tests |
|-------|-------|--------|-----------|
| 1 | Schema + Types + Auth Cleanup | `feat: add Department schema and member title, remove global Role enum` | -4 (deleted role-auth) |
| 2 | Department CRUD API | `feat: add department CRUD and member assignment endpoints` | +15 |
| 3 | Production Endpoint Updates | `feat: seed default departments on production create, add member title` | +2 |
| 4 | Frontend API + UI | `feat: add department management UI and member titles` | +4 |

### Test Counts (Post Sprint 6)

- **Frontend**: 140 tests (was 136, +4 new)
- **Backend**: 176 tests (was 164, -4 deleted +16 new)
- **Total**: 316 tests (was 300, +16 net)

### Architecture

Departments are purely organizational — no access control:
- Each Production has a set of Departments (8 defaults auto-created)
- Departments can be created/deleted by OWNER/ADMIN
- ProductionMembers have an optional `title` field (e.g., "Director", "Costume Designer")
- Many-to-many: a member can be in multiple departments via DepartmentMember
- Global User.role enum removed; auth uses only JWT with userId/email
- Any production member can access any endpoint (no department-based gatekeeping)

## Completed (Sprint 5 Review)

### Fixes

| Step | Issue | Commit | New Tests |
|------|-------|--------|-----------|
| 1 | No membership check on revision-matches | `fix: add production membership check to revision-matches endpoints` | +2 |
| 2 | No transaction in revision-processor | `fix: wrap revision processor auto-resolution in transaction` | +1 |
| 3 | Silent skip of unknown matchIds | `fix: reject unknown matchIds in reconciliation resolve` | +1 |
| 4 | `as any` type casts | Fixed in Step 2 commit (replaced with `ElementType`) | 0 |

### Test Counts (Post-Review)

- **Frontend**: 136 tests (unchanged)
- **Backend**: 164 tests (was 160, +4 new)
- **Total**: 300 tests (was 296, +4 new)

## Completed (Sprint 5)

### Phases

| Phase | Focus | Commit | New Tests |
|-------|-------|--------|-----------|
| 1 | Schema + Types | `feat: add script versioning schema and RevisionMatch model` | 0 |
| 2 | Matching Algorithm | `feat: add element text-matching algorithm with fuzzy matching` | +11 |
| 3 | Revision Processor | `feat: add revision processing pipeline with element migration` | +6 |
| 4 | API Endpoints | `feat: add revision upload, reconciliation, and version history endpoints` | +10 |
| 5 | FE API Client | `feat: add revision and version history API client functions` | 0 |
| 6 | Upload Draft UI | `feat: add upload new draft UI` | +4 |
| 7 | Reconciliation UI | `feat: add reconciliation UI for script revision matches` | +8 |
| 8 | Version History | `feat: add version history page and version display` | +4 |

### Test Counts

- **Frontend**: 136 tests (was 120, +16 new)
- **Backend**: 160 tests (was 133, +27 new)
- **Total**: 296 tests (was 253, +43 new)

### Architecture

Elements migrate between script versions by updating `scriptId`:
- Each script version is a separate Script row with `version` and `parentScriptId`
- Exact-match elements get their `scriptId` updated to point at the new Script
- Options and Approvals are untouched (they reference `elementId`, not `scriptId`)
- Fuzzy/missing cases stored as `RevisionMatch` records for user reconciliation
- New `RECONCILING` script status for the reconciliation state

## Completed (Sprint 4 Review)

### Fixes

| Step | Issue | Commit | New Tests |
|------|-------|--------|-----------|
| 1 | Block approval on archived options/elements | `fix: block approval creation on archived options and elements` | +2 |
| 2 | Strengthen approval userId test + feed filter test | `test: strengthen approval and feed test assertions` | +1 |
| 3 | Wire ApprovalHistory into OptionCard | `feat: display approval history in option cards` | +1 |
| 4 | Disable approval buttons during submission | `fix: disable approval buttons during submission` | +1 |
| 5 | Clear error state on success + empty history test | `fix: clear error state on successful operations` | +1 |

## Completed (Sprint 4)

### Phases

| Phase | Focus | Commit | New Tests |
|-------|-------|--------|-----------|
| 1 | Schema + Types | `feat: add Approval model, shared types, and constants` | 0 |
| 2 | Backend CRUD + Feed | `feat: add approval CRUD and feed API endpoints` | +16 |
| 3 | Element Locking | `feat: lock option uploads when element has approved option` | +3 |
| 4 | Frontend API Client | `feat: add approval and feed API client functions` | 0 |
| 5 | Feed Page | `feat: add director's feed page for elements pending review` | +10 |
| 6 | Approval UI | `feat: add approval buttons and history UI components` | +8 |
| 7 | Wire into Detail | `feat: wire approval workflow into element detail page` | +6 |

## Next Up
Sprint 8 remaining polish: mobile-responsive audit, error handling (error boundaries + toast system), loading states (skeleton loaders), rate limiting, security headers, seed data script, account settings page, element status dashboard, final QA pass
