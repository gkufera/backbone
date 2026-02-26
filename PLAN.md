# Current Plan

## Sprint 27 — Fix Email Verification

**Goal:** Fix misleading "email sent" response when SES rejects email. Surface send failures to users.

**Context:** carsonmell@gmail.com clicked "resend verification email", got "Verification email sent! Check your inbox." but SES rejected it (sandbox, email not yet verified). He has since verified in SES. The code uses fire-and-forget `sendEmail().catch()` and always returns 200 with success message.

---

### Step 1: Backend — await sendEmail and return failure indicator
- [ ] Write failing tests: `emailSent: false` when sendEmail rejects, `emailSent: true` when it succeeds
- [ ] Fix resend-verification route to await sendEmail, return emailSent boolean
- [ ] Also fix signup route to await sendEmail (log result, don't surface failure)
- [ ] Run Tier 1 tests
- [ ] COMMIT

### Step 2: Frontend — show warning when emailSent is false
- [ ] Write failing tests for verify-email-sent page and login page
- [ ] Update authApi.resendVerification return type to include emailSent
- [ ] Update handleResend in both pages to check emailSent
- [ ] Run Tier 1 tests
- [ ] COMMIT

### Step 3: Update roadmap infra status + PLAN.md
- [ ] Update carsonmell@gmail.com status in roadmap.md
- [ ] Update test counts
- [ ] COMMIT

### Step 4: Run full Tier 1 suite + final verification
- [ ] All tests pass
- [ ] COMMIT

---

## Previously Completed

### Sprint 26 — UI Fixes & Polish (COMPLETE)

**Result: All 11 UI bugs fixed. 878 total Tier 1 tests passing (450 frontend + 428 backend). 12 commits.**
