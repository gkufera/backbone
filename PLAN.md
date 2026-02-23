# Current Plan

## Active Task
**Sprint 8: Rebrand to Slug Max + Deployment Setup**

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
