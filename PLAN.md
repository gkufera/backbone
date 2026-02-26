# Current Plan

## Sprint 30 — QA & Polish Check (COMPLETE)

**Goal:** Review Sprint 30 changes, fix issues found, refile SES. 949 Tier 1 tests passing.

---

### Step 1: Fix design system test regex whitespace
- [x] Fix line 171: space before `.test()` removed
- [x] COMMIT (6ed838c)

### Step 2: Add client-side validation to auth forms (TDD)
- [x] Write failing tests for login (2), signup (3), forgot-password (1), reset-password (2) = 8 new tests
- [x] Verify all 7 new tests fail (red phase)
- [x] Add early-return validation to all 4 form handlers
- [x] Verify all tests pass (green phase)
- [x] Full suite: 481 frontend + 468 backend = 949 total
- [x] COMMIT (c76d4f6)

### Step 3: SES production access refile
- [x] Attempted refile via CLI — ConflictException (API blocks after denial)
- [x] Attempted AWS Support case — IAM user lacks support:CreateCase permission
- [ ] Must refile via AWS Console manually (backup plan: Resend.com)

### Step 4: Update roadmap and PLAN.md
- [x] Updated test counts (949)
- [x] Updated SES status (denied, manual refile needed)
- [x] Added form validation and regex fix to Sprint 30 items
- [x] Added Resend.com as backup email provider

---

## Previously Completed

### Sprint 30 — QA & Polish (COMPLETE)

**Result: noValidate on all forms, tooltip fixes, hamburger menu fix, alert readability. 949 total tests.**

### Sprint 29 — Production Security (COMPLETE)

**Result: Token revocation, JWT invalidation on password reset, per-user upload rate limiting. 936 total tests.**

### Sprint 28 — Granular Email Notifications (COMPLETE)

**Result: Per-production notification preferences, 1-minute email batching, OPTION_ADDED notifications. 923 total tests.**

### Sprint 27 — Fix Email Verification (COMPLETE)

**Result: Backend awaits sendEmail, returns emailSent boolean. Frontend shows warnings. 890 total tests.**
