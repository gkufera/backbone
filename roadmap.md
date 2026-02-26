# Slug Max Roadmap

**Test counts:** 465 frontend + 454 backend = 919 unit/integration, 57 E2E

Previous sprints (0-22) archived in `roadmap-archive-v1.md`.

---

## Infrastructure Status

| Service            | Status     | Notes                                                                             |
| ------------------ | ---------- | --------------------------------------------------------------------------------- |
| Railway (frontend) | Running    | slugmax.com                                                                       |
| Railway (backend)  | Running    | api.slugmax.com                                                                   |
| PostgreSQL         | Running    | Railway-managed                                                                   |
| AWS S3             | Running    | slugmax-uploads bucket                                                            |
| AWS SES            | Sandbox    | Domain verified (DKIM SUCCESS). Using SES API (@aws-sdk/client-sesv2) over HTTPS. Production access under review (case #177205820000226). Sandbox verified: slugmax@kufera.com, greg@kufera.com, carsonmell@gmail.com (verified). |
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

## Sprint 26: UI Fixes & Polish (DONE)

**Goal:** Fix every user-reported UI bug and polish issue. Make the app feel solid for real users.

- [x] Fix element name invisible on active row — add explicit `text-white` to Link when `isActive`
- [x] Fix sort/filter button active state — always include `border-2 border-black` on active buttons
- [x] Fix element list click to open side panel, not full page — use `onElementClick` callback instead of `<Link>` when handler prop is provided
- [x] Fix OUTSTANDING badge to be visually distinct from APPROVED — horizontal stripe pattern (`.badge-outstanding-review`)
- [x] Fix productions page spacing — add `gap-4` between heading and button, use `max-w-3xl`
- [x] Fix footer sticking — add `min-h-0` to main, change script viewer from fixed calc to `flex-1`
- [x] Change DECIDER tooltip text + fix lowercase "i" button (add `normal-case`)
- [x] Remove "Title (optional)" from invite form, support comma/whitespace-separated multi-email invite
- [x] Fix PDF highlight specificity — prefer smallest matching span, graceful "archived" error message
- [x] Add default departments: "Director", "Producer", "Production Office" with colors
- [x] Auto-assign production creator to "Production Office" department

---

## Sprint 27: Fix Email Verification (DONE)

**Goal:** Diagnose and fix email verification delivery failure. User carsonmell@gmail.com clicked "resend verification email", got "verification email sent" confirmation, but never received the email (checked spam).

**Root cause:** SES sandbox rejected send because carsonmell@gmail.com was not yet verified. He has since verified. Code-level fix: backend now awaits sendEmail and returns `emailSent` boolean; frontend shows "Email could not be sent" when delivery fails.

- [x] Check Railway backend logs for SES send errors around the time of the failed delivery
- [x] Verify SES sandbox status — carsonmell@gmail.com now verified in SES
- [x] Fix the root cause — await sendEmail in resend-verification route, return `emailSent: true/false`
- [x] Add error logging/response when SES send fails so users aren't told "sent" when it wasn't
- [x] Fix forgot-password route — same fire-and-forget bug, now awaits sendEmail and returns `emailSent`
- [x] Frontend forgot-password page shows warning when email delivery fails
- [ ] Test end-to-end email delivery for carsonmell@gmail.com (requires deploy)

---

## Sprint 28: Granular Email Notifications (DONE)

**Goal:** Directors get actionable, non-spammy email notifications with per-type preferences and batched delivery.

- [x] Add `NotificationPreference` Prisma model
  - Per-user, per-production preferences
  - Boolean fields: `optionEmails`, `noteEmails`, `approvalEmails`, `scriptEmails`, `memberEmails` (default all true)
  - Enum field: `scopeFilter` — `ALL` | `MY_DEPARTMENT` (default ALL, logic deferred to Sprint 28b)
  - Migration + generate
- [x] Add `OPTION_ADDED` to `NotificationType` enum
  - Trigger notification to deciders when a new option is created/uploaded
  - `backend/src/routes/options.ts` — create endpoint fires `notifyDeciders`
- [x] Implement 1-minute email batching
  - Removed immediate email from `createNotification()`
  - Added `emailSentAt` nullable field to Notification model
  - Background interval (every 60s) collects notifications where `emailSentAt IS NULL`, groups by user+production
  - Sends one digest email per group with bulleted notification list
  - `backend/src/services/email-batch-processor.ts` — new batch processor
  - `backend/src/services/email-service.ts` — added `sendDigestEmail()` template
- [x] API: `GET /api/productions/:id/notification-preferences` + `PATCH` to update (with upsert)
- [x] Production dashboard UI: per-production notification preference checkboxes (5 categories)
- [x] Settings page updated: global toggle now says "Master on/off" and references per-production dashboard for granular control

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
- [ ] Phone Verification in Signup — Make phone verification mandatory during signup, with real SMS delivery (Twilio or Amazon SNS). Move phone verification from settings to signup flow. Multi-step form: email/password → phone verification.
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
