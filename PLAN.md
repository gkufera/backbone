# Current Plan

## Active Task
None — CI Build Fix complete.

## CI Build Fix Results

| Step | Focus | Status | Commit | New Tests |
|------|-------|--------|--------|-----------|
| 1 | Local font files (replace Google Fonts) | Done | `fix: use local font files instead of Google Fonts for offline builds` | 0 |
| 2 | Set turbopack.root for monorepo | Done | `fix: set turbopack.root for monorepo shared import resolution` | 0 |
| 3 | Fix shared aliases + .js extensions | Done | `fix: resolve Turbopack shared import aliases for production builds` | 0 |
| 4 | Build prerequisites test | Done | `test: add build prerequisites test to prevent font/alias regressions` | +5 |
| 5 | GitHub CLI auth docs | Done | `docs: add GitHub CLI auth setup to EXTERNAL-SETUP.md` | 0 |
| 6 | Update PLAN.md + push | Done | `docs: update PLAN.md after CI build fix` | 0 |

### Issues Fixed
- **Google Fonts unreachable**: Replaced `next/font/google` with `next/font/local`, bundling VT323 and Courier Prime woff2 files in `frontend/src/fonts/`
- **Turbopack alias resolution**: Set `turbopack.root` to monorepo root and used relative paths in `resolveAlias` (absolute paths cause "server relative imports not implemented" error)
- **Shared .js extensions**: Removed `.js` extensions from barrel exports in `shared/constants/index.ts`, `shared/types/index.ts`, and `shared/constants/option.ts` — Turbopack doesn't resolve `.js` → `.ts` like webpack/tsc do with bundler module resolution
- **Build validation**: Added 5 Tier 1 tests verifying font files exist and shared imports are extensionless

### Test Counts (Post CI Fix)
- **Frontend**: 427 tests (+5 build prerequisites)
- **Backend**: 370 tests
- **Total**: 797 tests

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
- Roadmap test counts updated: 427 frontend + 370 backend = 797 total

## Next Up
Sprint 14 remaining: AWS SES, S3/CloudFront CDN, Performance audit, Final QA pass (all deferred — require external cloud access).
