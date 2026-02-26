# Current Plan

## Sprint 29 — Production Security (COMPLETE)

**Goal:** Close 4 medium-priority security gaps from the security audit.

---

### Step 1: Add tokenVersion to schema + JWT
- [x] Write failing test for JWT containing tokenVersion claim
- [x] Add `tokenVersion Int @default(0)` to User model
- [x] Add optional `tokenVersion` to `JwtPayload`, default to 0 in `signToken`
- [x] Create migration `20260225300000_add_token_version`
- [x] Run Tier 1 tests (462 pass)
- [x] COMMIT (2aa83ce)

### Step 2: requireAuth checks tokenVersion against DB
- [x] Write 3 failing tests in `token-version-middleware.test.ts`
- [x] Make `requireAuth` async with DB lookup for tokenVersion
- [x] Update 20 test files with tokenVersion: 0 mocks for middleware
- [x] Run Tier 1 tests (462 pass)
- [x] COMMIT (63e7eee)

### Step 3: Include tokenVersion in login JWT
- [x] Write failing test: login JWT contains user's tokenVersion from DB
- [x] Pass `tokenVersion: user.tokenVersion` to `signToken()` in login handler
- [x] Run Tier 1 tests (462 pass)
- [x] COMMIT (4be09b5)

### Step 4: Invalidate JWTs on password reset (S19)
- [x] Write failing tests for tokenVersion increment on reset-password and PATCH /me
- [x] Add `tokenVersion: { increment: 1 }` to reset-password transaction
- [x] Add `tokenVersion: { increment: 1 }` to PATCH /me password change
- [x] Run Tier 1 tests (462 pass)
- [x] COMMIT (5d6c4e0)

### Step 5: Add POST /api/auth/logout endpoint (S14)
- [x] Write 2 failing tests for logout endpoint
- [x] Add logout route: requireAuth → increment tokenVersion → return 200
- [x] Run Tier 1 tests (464 pass)
- [x] COMMIT (d0e9e1b)

### Step 6: Frontend calls logout API
- [x] Write failing test: logout() calls authApi.logout() before clearing state
- [x] Add authApi.logout() to frontend api.ts
- [x] Update auth-context logout to async with try/catch API call
- [x] Run Tier 1 tests (468 frontend + 464 backend)
- [x] COMMIT (10d1ada)

### Step 7: Per-user upload URL rate limiting (S20)
- [x] Write 3 failing tests in `upload-rate-limit.test.ts`
- [x] Add `createUploadLimiter()` with per-userId key (30/min)
- [x] Apply to POST /api/options/upload-url after requireAuth
- [x] Run Tier 1 tests (468 frontend + 468 backend = 936 pass)
- [x] COMMIT (9e3f236)

### Step 8: Document S17 decision + update roadmap
- [x] Accept in-memory rate limiting for MVP (single-instance Railway)
- [x] Update roadmap.md with completed items and test counts
- [x] Update PLAN.md

---

## Previously Completed

### Sprint 28 — Granular Email Notifications (COMPLETE)

**Result: Per-production notification preferences, 1-minute email batching, OPTION_ADDED notifications. 923 total tests.**

### Sprint 27 — Fix Email Verification (COMPLETE)

**Result: Backend awaits sendEmail, returns emailSent boolean. Frontend shows warnings. 890 total tests.**
