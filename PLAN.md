# Current Plan

## Sprint 31 — Production Gating (COMPLETE)

**Goal:** Gate production creation behind sales team approval. 976 Tier 1 tests passing (494 frontend + 482 backend).

---

### Step 1: Schema migration + shared types
- [x] Added ProductionStatus enum (PENDING/ACTIVE) to Prisma schema
- [x] Added Production fields: status, studioName, budget, contactName, contactEmail
- [x] Added ProductionApprovalToken model
- [x] Updated shared types and constants
- [x] COMMIT (1b91bc4)

### Step 2+3: Backend routes + email templates
- [x] POST /api/productions requires studioName, contactName, contactEmail; creates PENDING
- [x] Generates approval token, sends approval emails to PRODUCTION_APPROVAL_EMAILS
- [x] POST /api/productions/approve (public) validates token, activates production
- [x] sendProductionApprovalEmail + sendProductionApprovedEmail templates
- [x] 11 new backend tests (TDD)
- [x] COMMIT (2976076)

### Step 4: Frontend /approve-production page
- [x] Token-based approval page following verify-email pattern
- [x] 4 new frontend tests
- [x] COMMIT (14984dc)

### Step 5: Redesign New Production form
- [x] "Request a Production" with sales team messaging
- [x] Fields: Title, Studio Name, Budget, Your Name, Contact Email
- [x] 8 new frontend tests
- [x] COMMIT (56540f7)

### Step 6: Productions list shows PENDING status
- [x] PENDING badge (badge-outstanding), "Request Production" button
- [x] 2 new frontend tests
- [x] COMMIT (ef39ca4)

### Step 7: Gate production dashboard for PENDING
- [x] PENDING shows title + badge + "being reviewed" message
- [x] 2 new frontend tests
- [x] COMMIT (2045506)

### Step 8: Block mutations on PENDING productions
- [x] requireActiveProduction guard on productions, departments, scripts routes
- [x] 3 new backend tests + updated 6 test files
- [x] COMMIT (c792046)

### Step 9: Fix test seed + existing tests
- [x] Added guard to elements and options mutation routes
- [x] Updated test-seed and prisma seed with status: 'ACTIVE'
- [x] Fixed mocks across 6 additional test files
- [x] COMMIT (5b0c39b)

### Step 10: Full suite + docs
- [x] 494 frontend + 482 backend = 976 total tests passing
- [x] Updated roadmap.md and PLAN.md

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
