# Slug Max Roadmap

**Test counts:** 434 frontend + 420 backend = 854 total

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
| GitHub CI/CD       | Tier 1 passing | E2E port conflict fixed (Sprint 23), tests still failing (Sprint 24)              |

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

- [ ] Fix `signupAndLogin()` E2E helper to handle email verification flow
  - Option A: Auto-verify users in test/CI environment (backend skips email verification when `NODE_ENV=test`)
  - Option B: Call verify endpoint directly after signup in E2E helper
  - Whichever approach, all 6 E2E tests must pass
- [ ] Audit all E2E test files for other assumptions broken by Sprints 10-22
  - Check auth.spec.ts, home.spec.ts, productions.spec.ts for stale selectors/flows
- [ ] Verify green E2E run in GitHub Actions after push

---

## Sprint 25: Production Security (was 24)

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

## Sprint 26: QA & Performance (was 25)

**Goal:** Confidence that everything works end-to-end in production.

- [ ] Custom MAIL FROM domain for full DMARC alignment
- [ ] Performance audit
  - Run Lighthouse on key pages (home, production, script viewer)
  - Measure API response times for critical endpoints
  - Optimize any endpoints > 500ms
- [ ] Full QA pass
  - All Tier 1 tests pass
  - All Tier 2 E2E tests pass (Playwright on desktop + mobile viewports) - this runs in Github Actions

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
