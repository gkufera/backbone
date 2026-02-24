# Current Plan

## Active Task
None — Post-deploy fixes complete.

## Completed (Sprint 13 Post-Deploy Fixes)

| Step | Focus | Commit | New Tests |
|------|-------|--------|-----------|
| 1 | Hide entire header on homepage | `fix: hide entire header on homepage` | 0 (updated existing) |
| 2 | Suspense wrapping regression test | `test: add Suspense wrapping verification for useSearchParams pages` | +4 |
| 3 | Dockerfile ignore-scripts regression test | `test: verify Dockerfile production stage uses --ignore-scripts` | +1 |
| 4 | Full test suite + docs | `docs: update test counts after post-deploy fixes` | 0 |

### Test Counts (Post Sprint 13 Post-Deploy Fixes)
- **Frontend**: 400 tests (was 396, +4 new)
- **Backend**: 356 tests (was 355, +1 new)
- **Total**: 756 tests (was 751, +5 new)

## Completed (Sprint 13 Check)

| Step | Focus | Commit | New Tests |
|------|-------|--------|-----------|
| 1 | Fix Math.random() → crypto.randomInt() for phone codes (CRITICAL) | `fix: use crypto.randomInt for phone verification codes` | +1 |
| 2 | Remove duplicate PHONE_REGEX from frontend | `fix: import PHONE_REGEX from shared constants instead of duplicating` | 0 |
| 3 | Add missing phone verification edge case tests | `test: add missing phone verification edge case tests` | +3 |
| 4 | Fix Railway build — add postinstall prisma generate | `fix: add postinstall prisma generate for Railway builds` | 0 |
| 5 | Update company name to "Slug Max Inc." | `fix: update company name to Slug Max Inc.` | 0 |
| 6 | Hide header logo on homepage | `fix: hide header logo on homepage to prevent duplicate` | +2 |
| 7 | Full test suite + docs + deploy | `docs: update test counts after Sprint 13 check` | 0 |

### Test Counts (Post Sprint 13 Check)
- **Frontend**: 396 tests (was 394, +2 new)
- **Backend**: 355 tests (was 351, +4 new)
- **Total**: 751 tests (was 745, +6 new)

## Completed (Sprint 13: Infrastructure & Security)

| Step | Focus | Commit | New Tests |
|------|-------|--------|-----------|
| 1 | Helmet security headers | `feat: add helmet security headers middleware` | +2 |
| 2 | Rate limiting (2 tiers) | `feat: add rate limiting middleware with general and auth tiers` | +3 |
| 3 | Phone types/constants | `feat: add phone verification types and validation constants` | +0 |
| 4 | Prisma migration | `feat: add phone and phoneVerified fields to User schema` | +0 |
| 5 | SMS service | `feat: add SMS service with SMS_ENABLED gating` | +2 |
| 6 | Backend phone endpoints | `feat: add phone verification endpoints with TDD` | +7 |
| 7 | Frontend phone UI | `feat: add phone verification UI on settings page` | +4 |
| 8 | Seed data script | `feat: add seed data script with demo production and users` | +2 |
| 9 | Docs + deploy | `docs: update test counts and PLAN.md after Sprint 13` | 0 |

### Test Counts (Post Sprint 13)
- **Frontend**: 394 tests (was 390, +4 new)
- **Backend**: 351 tests (was 335, +16 new)
- **Total**: 745 tests (was 725, +20 new)

## Completed (Sprint 12 Check)

| Step | Focus | Commit | New Tests |
|------|-------|--------|-----------|
| 1 | Fix fetchWithRetry — only retry GET requests (CRITICAL) | `fix: only retry GET requests in fetchWithRetry to prevent duplicate mutations` | +1 |
| 2 | Validate file type in file picker onChange handler | `fix: validate file type in file picker onChange handler` | +1 |
| 3 | Auto-close hamburger menu on route change | `fix: auto-close mobile hamburger menu on route change` | +1 |
| 4 | Replace remaining Loading... text with SkeletonCard on 7 pages | `fix: replace remaining Loading... text with SkeletonCard on 7 pages` | 0 |
| 5 | Clean up toast auto-dismiss timeouts on unmount | `fix: clean up toast auto-dismiss timeouts on unmount` | 0 |
| 6 | Full test suite + docs + deploy | `docs: update test counts and PLAN.md after Sprint 12 check` | 0 |

### Test Counts (Post Sprint 12 Check)
- **Frontend**: 390 tests (was 387, +3 new)
- **Backend**: 335 tests (unchanged)
- **Total**: 725 tests (was 722, +3 new)

## Completed (Sprint 12: Error Handling & Mobile)

| Step | Focus | Commit | New Tests |
|------|-------|--------|-----------|
| 1 | Toast notification system (ToastProvider, useToast, ToastContainer) | `feat: add toast notification system with ToastProvider and useToast hook` | +5 |
| 2 | Error boundaries (ErrorBoundaryUI + 3 error.tsx wrappers) | `feat: add error boundaries for production routes` | +2 |
| 3 | Network error retry logic (fetchWithRetry in api.ts) | `feat: add network error retry logic to API client` | +3 |
| 4 | File upload validation (size + type checks) | `feat: add client-side file size and type validation` | +2 |
| 5 | Skeleton loading component (.mac-skeleton CSS + 3 pages) | `feat: add Skeleton component and replace key loading states` | +2 |
| 6 | Mobile hamburger menu (responsive AppHeader) | `feat: add hamburger menu for mobile-responsive header` | +2 |
| 7 | Wire toasts into settings + production pages | `feat: wire toast notifications into settings and production pages` | +2 |
| 8 | Full test suite + docs | `docs: update test counts and PLAN.md after Sprint 12` | 0 |

### Test Counts (Post Sprint 12)
- **Frontend**: 387 tests (was 369, +18 new)
- **Backend**: 335 tests (unchanged)
- **Total**: 722 tests (was 704, +18 new)

## Next Up
Sprint 14: Final QA pass, AWS SES integration, S3/CloudFront CDN, performance audit.
