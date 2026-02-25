# Current Plan

## Active Task
None — Sprint 14 Check complete.

## Sprint 14 Check Results

| Step | Focus | Status | Commit | New Tests |
|------|-------|--------|--------|-----------|
| 1 | Harden E2E workflow (env, logs, timeouts) | Done | `fix: harden E2E CI workflow with env vars, logging, and timeouts` | 0 |
| 2 | Multi-asset thumbnail test | Done | `test: add multi-asset thumbnail coverage for first-asset selection` | +1 |
| 3 | External setup guide | Done | `docs: add external infrastructure setup guide` | 0 |
| 4 | Docs + verification | Done | `docs: update PLAN.md after Sprint 14 check` | 0 |

### Issues Fixed
- **E2E workflow**: Added `NODE_ENV=test` (prevents 429 rate limiting), dummy AWS env vars (prevents SDK errors), server log capture to files + artifact upload on failure, `-m 5` curl timeouts, moved Playwright install before builds (fail fast)
- **Test coverage**: Added multi-asset thumbnail test (3 assets, verifies first asset used)
- **Documentation**: Created `EXTERNAL-SETUP.md` with cloud infrastructure checklists

### Test Counts (Post Sprint 14 Check)
- **Frontend**: 422 tests
- **Backend**: 370 tests
- **Total**: 792 tests

## Sprint 14 Results

| Step | Focus | Status | Commit | New Tests |
|------|-------|--------|--------|-----------|
| 0 | Commit pre-existing multi-asset changes | Done | `fix: update option card and thumbnail for multi-asset model` | 0 |
| 1 | Tier 1 CI workflow (tier1.yml) | Done | `feat: add Tier 1 CI workflow for frontend and backend tests` | 0 |
| 2 | E2E CI workflow (e2e.yml) | Done | `feat: add E2E CI workflow with Playwright and PostgreSQL` | 0 |
| 3 | Update roadmap test counts | Done | `docs: update roadmap test counts and Sprint 14 progress` | 0 |
| 4 | Update PLAN.md + verify | Done | `docs: update PLAN.md after Sprint 14 CI/CD setup` | 0 |

### Deliverables
- `.github/workflows/tier1.yml` — Parallel frontend + backend Vitest jobs, triggered on push/PR to main, concurrency group
- `.github/workflows/e2e.yml` — PostgreSQL 16 service, backend + frontend build/start, Playwright Chromium, artifact upload, 15-min timeout
- E2E workflow hardened: NODE_ENV=test, AWS env vars, log capture, curl timeouts
- `EXTERNAL-SETUP.md` — Cloud infrastructure setup checklists
- Roadmap test counts updated: 422 frontend + 370 backend = 792 total

## Sprint 8.5 Check Results

| Step | Focus | Status | Commit | New Tests |
|------|-------|--------|--------|-----------|
| 1 | Remove compat code + mediaType validation | Done | `fix: remove backwards compat code and add mediaType validation in options` | +2 |
| 2 | Wire composer identity props | Done | `fix: wire composer identity props to discussion and option notes` | +1 |
| 3 | Null department edge case test | Done | `test: add edge case test for null department in notes enrichment` | +1 |
| 4 | Docs + verification | Done | `docs: update PLAN.md after Sprint 8.5 check` | 0 |

## Next Up
Sprint 14 remaining: AWS SES, S3/CloudFront CDN, Performance audit, Final QA pass (all deferred — require external cloud access).
