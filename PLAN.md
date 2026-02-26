# Current Plan

## Sprint 29 (roadmap) — Switch Email from SES to Resend (COMPLETE)

**Goal:** Replace AWS SES with Resend for all transactional email. SES production access was denied.

- [x] Install `resend`, uninstall `@aws-sdk/client-sesv2`
- [x] Rewrite `email-service.test.ts` — mock Resend instead of SES (TDD red)
- [x] Rewrite `email-service.ts` — Resend client replaces SES client (TDD green)
- [x] Change from address to `no-reply@slugmax.com` globally
- [x] Update `.env.example` and `CLAUDE.md` with `RESEND_API_KEY`
- [x] All 987 Tier 1 tests passing (496 frontend + 491 backend)
- [x] Deploy to production and verify email delivery

---

## Sprint 31 — Production Gating (COMPLETE + QA CHECK)

**Goal:** Gate production creation behind sales team approval. 987 Tier 1 tests passing (496 frontend + 491 backend).

---

### Implementation (Steps 1-10)
- [x] Schema migration + shared types (COMMIT 1b91bc4)
- [x] Backend routes + email templates (COMMIT 2976076)
- [x] Frontend /approve-production page (COMMIT 14984dc)
- [x] Redesign New Production form (COMMIT 56540f7)
- [x] Productions list shows PENDING status (COMMIT ef39ca4)
- [x] Gate production dashboard for PENDING (COMMIT 2045506)
- [x] Block mutations on PENDING productions (COMMIT c792046)
- [x] Fix test seed + existing tests (COMMIT 5b0c39b)
- [x] Full suite + docs (COMMIT 05951ee)

### QA Check (11 new tests, 6 fixes)
- [x] C1: Added requireActiveProduction guard to approvals, notes, director-notes (7 new tests)
- [x] C2: Fixed approve-production page to display API response message (1 updated test)
- [x] C3: Added maxLength to studioName/contactName inputs from shared constants (2 new tests)
- [x] C4: Fixed approval email to carsonmell+slugmax@gmail.com
- [x] M1: Deduplicated confirmation emails when contactEmail matches approval address (1 new test)
- [x] M2: Fixed requireActiveProduction to return 404 for missing, 403 for PENDING (1 new test)
- [x] Fixed workflow-state.test.ts mocks for new guard
- [x] 496 frontend + 491 backend = 987 total tests passing

---

## Previously Completed

### Sprint 30 — QA & Polish Check (COMPLETE)

**Result: noValidate on all forms, tooltip fixes, hamburger menu fix, alert readability, client-side auth validation. 949 total tests.**

### Sprint 29 — Production Security (COMPLETE)

**Result: Token revocation, JWT invalidation on password reset, per-user upload rate limiting. 936 total tests.**

### Sprint 28 — Granular Email Notifications (COMPLETE)

**Result: Per-production notification preferences, 1-minute email batching, OPTION_ADDED notifications. 923 total tests.**

### Sprint 27 — Fix Email Verification (COMPLETE)

**Result: Backend awaits sendEmail, returns emailSent boolean. Frontend shows warnings. 890 total tests.**
