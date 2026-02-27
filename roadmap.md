# Slug Max Roadmap

**Test counts:** 510 frontend + 565 backend = 1,075 unit/integration, 57 E2E

Previous sprints (0-22) archived in `roadmap-archive-v1.md`.
Sprints 23-34 archived in `roadmap-archive-v2.md`.

---

## Infrastructure Status

| Service            | Status     | Notes                                                                                                                 |
| ------------------ | ---------- | --------------------------------------------------------------------------------------------------------------------- |
| Railway (frontend) | Running    | slugmax.com                                                                                                           |
| Railway (backend)  | Running    | api.slugmax.com                                                                                                       |
| PostgreSQL         | Running    | Railway-managed                                                                                                       |
| AWS S3             | Running    | slugmax-uploads bucket                                                                                                |
| Resend             | Running    | Replaced AWS SES (Sprint 29). Domain `slugmax.com` verified. Using Resend SDK over HTTPS. From: no-reply@slugmax.com. |
| Cloudflare DNS     | Configured | Frontend, API, DKIM, SPF, DMARC records all set                                                                       |
| GitHub CI/CD       | All green  | Tier 1 + E2E passing (Sprint 24)                                                                                      |

---

## Sprint 35: Roadmap Cleanup + Deep Code Review

**Goal:** Archive completed sprints, run deep code review for security and code organization, fix findings.

- [x] Archive Sprints 23-34 to `roadmap-archive-v2.md`
- [x] Security: Rate limit public production approval endpoint (TDD) — `createTokenLimiter()` 5 req/min
- [x] Security: Auth middleware rejects unverified email users (TDD) — 403 on `emailVerified: false`
- [x] Refactor: Extract member and approval services from productions route — 789→608 lines
- [x] Refactor: Split frontend api.ts into 12 domain modules — 714→35 lines (barrel)
- [x] Full Tier 1 test pass — 510 frontend + 565 backend = 1,075 total

---

## Backlog

### Simulated Test Productions

- [ ] Simulated test productions with simulated users that pretend to be department heads from each department, a director, and a production coordinator. Put this on production as a test and invite greg@kufera.com and carsonmell@gmail.com. (make sure we get invite emails!)

### Infrastructure (v2+)

Explicitly deferred. Do not work on these during current sprints.

- [ ] CloudFront CDN for S3 media
- [ ] Redis for session/rate-limit persistence
- [ ] Per-project subscription billing (Stripe)
- [ ] Enterprise SSO (SAML)

### Features (v2+)

- [ ] SMS/Phone Verification — Make phone verification mandatory during signup, with real SMS delivery (Twilio or Amazon SNS). Move phone verification from settings to signup flow. Multi-step form: email/password → phone verification. (On ice — code pruned in Sprint 32)
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
