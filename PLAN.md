# Current Plan

## Completed: Sprint 24 — Fix E2E Tests

**Goal:** All 6 Playwright E2E tests pass in GitHub Actions. **DONE.**

### What was done

1. **Auto-verify in test mode** — When `NODE_ENV=test`, signup sets `emailVerified: true` directly, skipping token generation and email sending (TDD: failing test first, then implementation)
2. **E2E test rewrites** — Fixed all 3 test files:
   - `home.spec.ts`: `getByText` instead of `getByRole('heading')` for Slug Max title
   - `auth.spec.ts`: URL-based waits after login, exact text selectors, verify-email-sent redirect
   - `productions.spec.ts`: signup→login flow, `getByRole('heading')` for production titles, exact button names
3. **Missing migration** — Added `deleted_at` columns to `production_members`, `elements`, and `departments` tables (Prisma schema had them but no migration existed)
4. **Strict mode fixes** — Used `getByRole` and exact text matches to avoid Playwright strict mode violations from duplicate text

### Test Counts
- **Frontend**: 434 tests
- **Backend**: 421 tests
- **E2E**: 6 tests (all passing in CI)
- **Total**: 861
