# Current Plan

## Sprint 27 — Fix Email Verification

**Goal:** Fix misleading "email sent" response when SES rejects email. Surface send failures to users.

**Context:** carsonmell@gmail.com clicked "resend verification email", got "Verification email sent! Check your inbox." but SES rejected it (sandbox, email not yet verified). He has since verified in SES. The code uses fire-and-forget `sendEmail().catch()` and always returns 200 with success message.

---

### Step 1: Backend — await sendEmail and return failure indicator
- [x] Write failing tests: `emailSent: false` when sendEmail rejects, `emailSent: true` when it succeeds
- [x] Fix resend-verification route to await sendEmail, return emailSent boolean
- [x] Also fix signup route to await sendEmail (log result, don't surface failure)
- [x] Run Tier 1 tests (429 backend pass)
- [x] COMMIT (f2672a8)

### Step 2: Frontend — show warning when emailSent is false
- [x] Write failing tests for verify-email-sent page and login page
- [x] Update authApi.resendVerification return type to include emailSent
- [x] Update handleResend in both pages to check emailSent
- [x] Run Tier 1 tests (459 frontend + 429 backend = 888 pass)
- [x] COMMIT (52e783f)

### Step 3: Update roadmap infra status + PLAN.md
- [x] Update carsonmell@gmail.com status in roadmap.md
- [x] Update test counts (888 total)
- [x] COMMIT

---

## Previously Completed

### Sprint 26 — UI Fixes & Polish (COMPLETE)

**Result: All 11 UI bugs fixed. 878 total Tier 1 tests passing (450 frontend + 428 backend). 12 commits.**
