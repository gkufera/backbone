# Slug Max Roadmap

**Test counts:** 435 frontend + 427 backend = 862 unit/integration, 57 E2E

Previous sprints (0-22) archived in `roadmap-archive-v1.md`.

---

## Infrastructure Status

| Service            | Status     | Notes                                                                             |
| ------------------ | ---------- | --------------------------------------------------------------------------------- |
| Railway (frontend) | Running    | slugmax.com                                                                       |
| Railway (backend)  | Running    | api.slugmax.com                                                                   |
| PostgreSQL         | Running    | Railway-managed                                                                   |
| AWS S3             | Running    | slugmax-uploads bucket                                                            |
| AWS SES            | Sandbox    | Domain verified (DKIM SUCCESS). Using SES API (@aws-sdk/client-sesv2) over HTTPS. Production access under review (case #177205820000226). Sandbox verified: slugmax@kufera.com, greg@kufera.com, carsonmell@gmail.com (pending click). |
| Cloudflare DNS     | Configured | Frontend, API, DKIM, SPF, DMARC records all set                                   |
| GitHub CI/CD       | All green  | Tier 1 + E2E passing (Sprint 24)                                                  |

---

## Sprint 23: CI/CD Fix & Housekeeping

**Goal:** Green CI pipeline. Clean project tracking.

- [x] Fix E2E workflow port conflict (PORT env var scoped to backend only)
- [x] Archive old roadmap, delete stale EXTERNAL-SETUP.md
- [x] Create fresh roadmap (this file)
- [x] Update PLAN.md

---

## Sprint 24: Fix E2E Tests (URGENT)

**Goal:** Green E2E pipeline in GitHub Actions. All Playwright tests pass.

**Root cause:** The `signupAndLogin()` helper in E2E tests was written before Sprint 10 added forced email verification. After signup, the app now redirects to "check your email" instead of auto-logging in. Every E2E test that calls `signupAndLogin()` fails because the expected home page heading never appears.

- [x] Fix `signupAndLogin()` E2E helper to handle email verification flow
  - Used Option A: Auto-verify users when `NODE_ENV=test` (backend sets `emailVerified: true` on signup)
  - All 6 E2E tests pass
- [x] Audit all E2E test files for other assumptions broken by Sprints 10-22
  - Fixed home.spec.ts: heading selector → getByText (Slug Max is a `<span>`, not heading)
  - Fixed auth.spec.ts: expect verify-email-sent redirect, use exact text/role selectors
  - Fixed productions.spec.ts: signupAndLogin does signup→login, use getByRole for titles, exact button names
- [x] Fix missing `deleted_at` columns (production_members, elements, departments)
  - Prisma schema had soft-delete fields but no migration created the columns
  - Added migration `20260225100000_add_soft_delete_columns`
- [x] Verify green E2E run in GitHub Actions after push

---

## Sprint 25: Exhaustive E2E Tests

**Goal:** Write comprehensive Playwright E2E tests covering every user-facing flow in the application.

- [x] Auth flows: signup, login, logout, forgot password, reset password, email verification, signup validation (8 tests)
- [x] Production management: create production, view dashboard, add members, departments CRUD, roles, dept assignment (8 tests)
- [x] Script workflow: upload page, script viewer, version history, revision upload, element list (5 tests)
- [x] Element management: element detail, department assignment, create element, navigation, Add Option (5 tests)
- [x] Option workflow: option gallery, create link option, mark/unmark ready, file upload form (5 tests)
- [x] Approval workflow: approve (Y), reject (N), maybe (M), approval with note, review feed (5 tests)
- [x] Notifications: bell count, notifications page, mark as read, empty state (4 tests)
- [x] Settings: sections render, update name, change password, wrong password, mismatch, email toggle (6 tests)
- [x] Responsive layouts: mobile + desktop for home, login, productions, dashboard, script viewer (10 tests)
- [x] Test seeder endpoint (POST /api/test/seed-production) for CI without S3
- [ ] All E2E tests pass in GitHub Actions CI (pending — no CI workflow configured yet)

**Total: 57 E2E tests across 9 spec files.** Known limitations: S3 file uploads, script PDF processing, and email verification flow cannot be tested in CI. Link-based options test the full workflow without S3.

---

## Sprint 26: UI Fixes & Polish ← NEXT

**Goal:** Fix every user-reported UI bug and polish issue. Make the app feel solid for real users.

- [ ] Fix element name invisible on active row — add explicit `text-white` to Link when `isActive`
  - `frontend/src/components/element-list.tsx:263`
- [ ] Fix element list click to open side panel, not full page — use `onElementClick` callback instead of `<Link>` when handler prop is provided
  - `frontend/src/components/element-list.tsx:261-266`
- [ ] Fix PDF highlight bugs:
  - Improve `findTextInLayer()` to match most specific (smallest) span, not first match
  - Use exact text matching before substring fallback
  - Handle "element not found" gracefully (show refresh prompt instead of error)
  - `frontend/src/lib/pdf-highlights.ts:36-53`
  - `frontend/src/components/element-detail-panel.tsx:69-79`
- [ ] Fix OUTSTANDING badge to be visually distinct from APPROVED — create hatched/striped pattern badge (different from rejected's diagonal stripes)
  - `frontend/src/app/globals.css` — new pattern for `.badge-ready` or rename to use distinct class
  - `frontend/src/app/productions/[id]/page.tsx:263`
- [ ] Fix productions page spacing — add `gap-4` between heading and button, use `max-w-3xl`
  - `frontend/src/app/productions/page.tsx:34-35`
- [ ] Fix footer sticking — prevent full-height pages from pushing footer below viewport
  - `frontend/src/app/layout.tsx:38-41`
- [ ] Fix sort/filter button active state — always include `border-2 border-black` on active buttons
  - `frontend/src/components/element-list.tsx:137-150`
- [ ] Change DECIDER tooltip: "You make approvals based on options other users present to you." + fix "i" button rendering as uppercase "I" (add `lowercase` class override)
  - `frontend/src/components/permissions-tooltip.tsx:11, 34`
- [ ] Remove "Title (optional)" from invite form, support comma/whitespace-separated multi-email invite
  - `frontend/src/app/productions/[id]/page.tsx:343-362`
- [ ] Add default departments: "Director", "Producer", "Production Office" with colors
  - `shared/constants/departments.ts:3-33`
  - Update test: `backend/src/__tests__/productions.test.ts:108` (expects 13 → 16 departments)
- [ ] Auto-assign production creator to "Production Office" department
  - `backend/src/routes/productions.ts:36-65` — after seeding depts, find Production Office dept, update member's departmentId

---

## Sprint 27: Granular Email Notifications

**Goal:** Directors get actionable, non-spammy email notifications with per-type preferences and batched delivery.

- [ ] Add `NotificationPreference` Prisma model
  - Per-user, per-production preferences
  - Boolean fields: `optionEmails`, `noteEmails`, `approvalEmails`, `scriptEmails`, `memberEmails` (default all true)
  - Enum field: `scopeFilter` — `ALL` | `MY_DEPARTMENT` (default ALL)
  - Migration + generate
- [ ] Add `OPTION_ADDED` to `NotificationType` enum
  - Trigger notification to deciders when a new option is created/uploaded (not just when marked ready for review)
  - `backend/src/routes/options.ts` — create endpoint
- [ ] Implement 1-minute email batching
  - Don't send email immediately in `createNotification()`
  - Add `emailSentAt` nullable field to Notification model
  - Background interval (every 60s) collects notifications where `emailSentAt IS NULL`, groups by user
  - Sends one digest email per user: "X new updates on [Production Name]" with bulleted notification list
  - `backend/src/services/notification-service.ts`
  - `backend/src/services/email-service.ts` — add `sendDigestEmail()` template
- [ ] API: `GET /api/productions/:id/notification-preferences` + `PATCH` to update
- [ ] Settings UI: per-production notification preference checkboxes + scope selector
  - In production settings or dedicated notification settings section
- [ ] Deprecate global `emailNotificationsEnabled` — keep as master on/off fallback, but granular preferences take priority when they exist

---

## Sprint 28: Phone Verification in Signup

**Goal:** Make phone verification mandatory during signup, with real SMS delivery.

- [ ] Integrate real SMS provider (Twilio or Amazon SNS) into `sms-service.ts` (currently stubbed)
- [ ] Set up accounts, add credentials to Railway env vars
- [ ] Move phone verification from settings to signup flow
  - After email/password, require phone number entry + SMS code verification
  - Account not created until phone is verified
- [ ] Update `POST /api/auth/signup` to accept and require `phone` field
- [ ] Update frontend signup page with multi-step form (email/password → phone verification)
- [ ] Production config: `SMS_ENABLED=true` with real credentials
- [ ] Test full flow end-to-end

---

## Sprint 29: Production Security

**Goal:** Close the 4 medium-priority security gaps from the security audit.

- [ ] S14: Token revocation / logout endpoint
  - Add `POST /api/auth/logout` endpoint
  - Options: in-memory deny set or DB-backed token invalidation
  - Middleware checks deny list before accepting JWT
- [ ] S19: Invalidate JWTs on password reset
  - Add `tokenVersion` field to User model
  - JWT includes tokenVersion; middleware rejects mismatched versions
  - Pairs with S14 — logout can increment tokenVersion
- [ ] S17: Persistent rate limiting
  - Current: in-memory rate limiter resets on restart/deploy
  - Evaluate if this is a real problem or acceptable for now
  - Options: accept as-is, add DB-backed store, or add Redis
- [ ] S20: Per-user upload URL rate limiting
  - Per-user throttle on `POST /api/options/:id/upload-url`
  - Prevent abuse of presigned S3 URL generation

---

## Sprint 30: QA & Performance

**Goal:** Full confidence that everything works end-to-end in production.

- [ ] Make sure no text is over a busy background (e.g., "Please verify your email before logging in" — too hard to read)
- [ ] Fix all tooltips to conform to 1-bit Macintosh design system (no rounded corners, no shadows, no grays — black/white only with sharp corners and 2px borders)
- [ ] Hide the mobile menu hamburger button when the menu has no items
- [ ] Custom MAIL FROM domain for full DMARC alignment
- [ ] Performance audit
  - Run Lighthouse on key pages (home, production, script viewer)
  - Measure API response times for critical endpoints
  - Optimize any endpoints > 500ms
- [ ] Full QA pass
  - All Tier 1 tests pass
  - All Tier 2 E2E tests pass (Playwright on desktop + mobile viewports) in GitHub Actions

---

## Sprint 31: Production Gating

**Goal:** Lock down production creation so users must request approval.

- [ ] When a user tries to create a production, they submit a request (production name, studio name, budget, name, contact details — make clear this goes to sales team)
- [ ] Production starts in PENDING stage
- [ ] Email sent to slugmax@kufera.com and carsonmell+slugmax@gmail.com with approval link
- [ ] Clicking the link approves the production on the backend

---

## Sprint 32: Discussion Media Attachments

**Goal:** Allow directors and crew to attach media in option discussion threads.

- [ ] Add media attachment support to option discussions — upload images, reference videos, or files directly in the discussion thread
- [ ] DECIDERS can provide visual guidance (mood boards, reference photos, video clips) alongside the conversation
- [ ] Attachments use existing S3 upload infrastructure (presigned URLs)

---

## Following sprints

- [ ] Process FDX (Final Draft) script files as well as PDFs. Use tagger tagging in FDX to import all tags intelligently, then generate a PDF. Note in a tooltip that FDX works better and that AI tag pulling is inaccurate.
- [ ] Simulated test productions with simulated AI agents using OpenClaw that pretend to be department heads from each department, a director, and a production coordinator.

---

## Backlog Optimization Ideas (v2+)

Explicitly deferred. Do not work on these during current sprints.

### Infrastructure

- [ ] CloudFront CDN for S3 media
- [ ] Redis for session/rate-limit persistence
- [ ] Per-project subscription billing (Stripe)
- [ ] Enterprise SSO (SAML)

### Features

- [ ] Compose setting/actor/character options into collage/moodboard visual
- [ ] React Native iOS/Android apps with offline sync
- [ ] Tinder-like swipe interface for mobile approval
- [ ] Storyboard panel support (visual options with sequential ordering)
- [ ] VR/3D model link support for set design options
- [ ] OAuth providers / Okta
- [ ] Google Drive / Dropbox integration for file import
- [ ] Frame.io integration for video review
- [ ] Scriptation integration for annotated script import/export
- [ ] Cascading approvals (Lead Designer → Director multi-tier)
