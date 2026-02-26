# Slug Max Roadmap

**Test counts:** 434 frontend + 421 backend = 855 total

Previous sprints (0-22) archived in `roadmap-archive-v1.md`.

---

## Infrastructure Status

| Service            | Status         | Notes                                                                             |
| ------------------ | -------------- | --------------------------------------------------------------------------------- |
| Railway (frontend) | Running        | slugmax.com                                                                       |
| Railway (backend)  | Running        | api.slugmax.com                                                                   |
| PostgreSQL         | Running        | Railway-managed                                                                   |
| AWS S3             | Running        | slugmax-uploads bucket                                                            |
| AWS SES            | Sandbox        | Domain verified (DKIM SUCCESS). Production access pending (case #177205820000226) |
| Cloudflare DNS     | Configured     | Frontend, API, DKIM, SPF, DMARC records all set                                   |
| GitHub CI/CD       | All green      | Tier 1 + E2E passing (Sprint 24)                                                 |

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

- [ ] Auth flows: signup, login, logout, forgot password, reset password, email verification, resend verification
- [ ] Production management: create production, view production dashboard, add/remove members, assign departments and roles
- [ ] Script workflow: upload script, view script, upload revision, version history, element detection results
- [ ] Element management: element list (by appearance, by department, by status), create element, edit element, assign department, soft-delete element
- [ ] Option workflow: create option (file upload and link), view option detail, option gallery, mark option as ready
- [ ] Approval workflow: approve, reject, maybe decisions with notes, approval history, director notes
- [ ] Notifications: notification bell, notification count, mark as read, notifications page
- [ ] Settings: update name, change password, phone verification flow
- [ ] Responsive layouts: test all key pages at mobile and desktop viewports
- [ ] All E2E tests pass in GitHub Actions CI

---

## Sprint 26: Production Security

**Goal:** Close the 4 remaining medium-priority security gaps identified in the security audit.

- [ ] S14: Token revocation / logout endpoint
  - Add `POST /api/auth/logout` endpoint
  - Options: in-memory deny set or DB-backed token invalidation
  - Middleware checks deny list before accepting JWT
- [ ] S19: Invalidate JWTs on password reset
  - Add `tokenVersion` field to User model
  - JWT includes tokenVersion; middleware rejects mismatched versions
  - This pairs with S14 — logout can increment tokenVersion
- [ ] S17: Persistent rate limiting
  - Current: in-memory rate limiter resets on restart/deploy
  - Evaluate if this is a real production problem or acceptable for now
  - Options: accept as-is, add DB-backed store, or add Redis
- [ ] S20: Per-user upload URL rate limiting
  - Add per-user throttle on `POST /api/options/:id/upload-url`
  - Prevent abuse of presigned S3 URL generation

---

## Sprint 27: QA & Performance

**Goal:** Confidence that everything works end-to-end in production.

- [ ] Make sure no text on the frontend is over a busy background (eg "Please verify your email before logging in" - too hard to read)
- [ ] Fix all tooltips to conform to the 1-bit Macintosh design system (no rounded corners, no shadows, no grays, no colors — black/white only with sharp corners and 2px borders)
- [ ] Hide the mobile menu hamburger button when the menu has no items
- [ ] Custom MAIL FROM domain for full DMARC alignment
- [ ] Performance audit
  - Run Lighthouse on key pages (home, production, script viewer)
  - Measure API response times for critical endpoints
  - Optimize any endpoints > 500ms
- [ ] Full QA pass
  - All Tier 1 tests pass
  - All Tier 2 E2E tests pass (Playwright on desktop + mobile viewports) - this runs in Github Actions

---

## Sprint 28: Lock down production server so that people pay us in order to create a production

- [ ] Make it so that if a user tries to create a production, they have to request to create one and we have to approve it. Once they request a production (make it clear that the prioduction name, studio name, budget, and their name and contact details will be sent to our sales team before they submit), that production is in PENDING stage. An email gets sent to slugmax@kufera.com and carsonmell+slugmax@gmail.com that says we need to approve that production. There is a simple link in the email that, when clicked, approves the production on the backend.

---

## Sprint 29: Discussion Media Attachments

**Goal:** Allow directors and crew to attach media (images, videos, files) in option discussion threads for inspiration and guidance.

- [ ] Add media attachment support to option discussions — users can upload images, reference videos, or other files directly in the discussion thread for an option
- [ ] DECIDERS can provide visual guidance (mood boards, reference photos, video clips) that crew members see alongside the conversation
- [ ] Attachments use the existing S3 upload infrastructure (presigned URLs)

---

## Sprint 30: Phone Verification via SMS

**Goal:** Make phone verification actually work by integrating a real SMS provider.

- [ ] Integrate a real SMS provider (e.g., Twilio or Amazon SNS) into `sms-service.ts` (currently stubbed — logs but doesn't send)
- [ ] Set up appropriate accounts and add credentials to Railway env vars and `~/.config/cm/env`
- [ ] Ensure `SMS_ENABLED=true` activates real SMS sending on production
- [ ] Test full phone verification flow end-to-end: enter phone → receive code → verify

---

## Following sprints - once you get here, first investigate these issues and split them into sprints.

- [ ] Process FDX (Final Draft) script files as well as PDFs. Use tagger tagging in FDX to import all tags intelligently, and then generate a PDF of that FDX file so that everything works better. Note in the software in a tooltip that this works better, and that the AI that pulls tags is very inaccurate.
- [ ] Simulated test productions with simulated AI agents using OpenClaw that pretend to be department heads from each department as well as a director and a production coordinator.

---

## Backlog Optimization Ideas (v2+)

Explicitly deferred. Do not work on these during current sprints.

### Infrastructure

- [ ] CloudFront CDN for S3 media (optimization — not needed until real user load)
- [ ] Redis for session/rate-limit persistence
- [ ] Per-project subscription billing (Stripe)
- [ ] Enterprise SSO (SAML)

### Features

- [ ] React Native iOS/Android apps with offline sync
- [ ] Tinder-like swipe interface for mobile approval
- [ ] Storyboard panel support (visual options with sequential ordering)
- [ ] VR/3D model link support for set design options
- [ ] OAuth providers / Okta
- [ ] Google Drive / Dropbox integration for file import
- [ ] Frame.io integration for video review
- [ ] Scriptation integration for annotated script import/export
- [ ] Cascading approvals (Lead Designer → Director multi-tier)
