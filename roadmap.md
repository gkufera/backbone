# Slug Max Roadmap

**Test counts:** 434 frontend + 420 backend = 854 total

Previous sprints (0-22) archived in `roadmap-archive-v1.md`.

---

## Infrastructure Status

| Service | Status | Notes |
|---------|--------|-------|
| Railway (frontend) | Running | slugmax.com |
| Railway (backend) | Running | api.slugmax.com |
| PostgreSQL | Running | Railway-managed |
| AWS S3 | Running | slugmax-uploads bucket |
| AWS SES | Sandbox | Domain verified (DKIM SUCCESS). Production access pending (case #177205820000226) |
| Cloudflare DNS | Configured | Frontend, API, DKIM, SPF, DMARC records all set |
| GitHub CI/CD | Tier 1 passing | E2E fixed in Sprint 23 (port conflict resolved) |

---

## Sprint 23: CI/CD Fix & Housekeeping

**Goal:** Green CI pipeline. Clean project tracking.

- [x] Fix E2E workflow port conflict (PORT env var scoped to backend only)
- [x] Archive old roadmap, delete stale EXTERNAL-SETUP.md
- [x] Create fresh roadmap (this file)
- [x] Update PLAN.md

---

## Sprint 24: Production Security

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

## Sprint 25: QA & Performance

**Goal:** Confidence that everything works end-to-end in production.

- [ ] Performance audit
  - Run Lighthouse on key pages (home, production, script viewer)
  - Measure API response times for critical endpoints
  - Optimize any endpoints > 500ms
- [ ] Full QA pass
  - All Tier 1 tests pass
  - All Tier 2 E2E tests pass (Playwright on desktop + mobile viewports)
  - Manual walkthrough: signup → verify email → create production → upload script → tag elements → upload options → approve

---

## Backlog (v2+)

Explicitly deferred. Do not work on these during current sprints.

### Infrastructure
- [ ] CloudFront CDN for S3 media (optimization — not needed until real user load)
- [ ] Redis for session/rate-limit persistence
- [ ] Custom MAIL FROM domain for full DMARC alignment

### High (v2)
- [ ] Tinder-like swipe interface for mobile approval
- [ ] Storyboard panel support (visual options with sequential ordering)
- [ ] VR/3D model link support for set design options
- [ ] Advanced analytics (% elements done, time-to-decision)
- [ ] Due dates on elements with overdue highlighting
- [ ] Multiple decision-makers (require two directors to agree)
- [ ] Google OAuth provider

### Medium (v2-v3)
- [ ] Google Drive / Dropbox integration for file import
- [ ] Frame.io integration for video review
- [ ] Scriptation integration for annotated script import/export
- [ ] FDX (Final Draft) script format support
- [ ] Fountain script format support
- [ ] Offline support (mobile apps cache scripts/options for review)
- [ ] AI-assisted option suggestions (image search, similar options)
- [ ] Slack webhook integration for push alerts

### Low (v3+)
- [ ] Native iOS/Android apps with offline sync
- [ ] ShotGrid integration for VFX pipeline studios
- [ ] Casting website integration (CSV import)
- [ ] Per-project subscription billing (Stripe)
- [ ] Enterprise SSO (SAML)
- [ ] Cascading approvals (Lead Designer → Director multi-tier)
- [ ] Call-sheet auto-updates on element approval changes
