# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Backbone is a unified production collaboration platform built around the film/TV script. It connects every **script element** (locations, props, wardrobe items, cast, etc) with multiple creative **options** (photos, videos, audio clips, storyboards, links, etc) and provides a coordinated **approval workflow**. Instead of wading through emails, a director sees a **news feed** of new options tagged to script elements. She can **approve, reject or tentatively approve** each option with comments. Until one option per element is approved, that element remains unresolved, and all relevant departments are notified once a choice is made.

The system never deletes element/option records, ensuring an immutable audit trail.

## Repository Structure

- `frontend/` — Next.js web app (TypeScript, React)
- `backend/` — Express.js API server (TypeScript, Node.js)
- `prisma/` — Prisma schema and migrations (shared between frontend and backend)
- `shared/` — Shared TypeScript types and constants used by both frontend and backend

## Non-negotiable Constraints

- **Immutable audit trail**: Never hard-delete elements, options, or approval records. Use soft-delete or status fields.
- **Script is the anchor**: Every element is tied to a script. Elements exist in the context of script pages/scenes.
- **Element → Options → Approval is the core loop**: This is the fundamental workflow. Every feature serves this loop.
- **PDF is the script format for MVP**: No FDX or Fountain parsing. PDF upload, text extraction for element detection.
- **Frontend is the primary UI**: Web-first, mobile-responsive. No native mobile app for MVP.
- **No backwards compatibility code**: This app is not in production. No legacy data or external consumers. See policy below.

## Development

**Quick Start (both servers):**

```bash
./run.sh
```

**Individual servers:**

```bash
./frontend.sh  # Start frontend only (http://localhost:3000)
./backend.sh   # Start backend only (http://localhost:8000)
```

**Manual commands:**

- Frontend: `cd frontend && npm install && npm run dev`
- Backend: `cd backend && npm install && npm run dev`
- Database: `docker compose up -d` (PostgreSQL via Docker Compose)

**Environment setup:**

- Copy `.env.example` to `.env` in both `frontend/` and `backend/`
- Required env vars: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME`

**Database commands:**

```bash
npx prisma migrate dev     # Apply migrations
npx prisma generate        # Regenerate Prisma client
npx prisma studio          # Visual database browser
npx prisma db seed         # Seed sample data
```

## Deployment

The app is deployed on **Railway**.

### Branch Strategy

- **main**: Development branch — all work happens here
- **production**: Deployment branch — Railway auto-deploys from this branch

### Deploying Changes

1. Make changes on `main` branch
2. Test locally with `./run.sh`
3. Commit and push to `main`
4. Merge to `production` and push:
   ```bash
   git checkout production
   git merge main --no-edit
   git push origin production
   git checkout main
   ```
5. Railway auto-detects the push and rebuilds both services

### Railway Configuration

**Backend Service** (`backend/`):

- Node.js 20 runtime
- Runs: `npm run start`
- Environment variables: `DATABASE_URL`, `AWS_*`, `CORS_ORIGINS`

**Frontend Service** (`frontend/`):

- Node.js 20 runtime
- Runs: `npm run build && npm run start`
- Environment variables: `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `API_BASE_URL`

**Database Service:**

- Railway-managed PostgreSQL

## Linting & Code Quality

**Frontend (TypeScript):**

- Uses `ESLint` for linting and `Prettier` for formatting
- Config in `frontend/.eslintrc.json` and `frontend/.prettierrc`
- Run: `cd frontend && npm run lint` (lint) or `npm run format` (format)

**Backend (TypeScript):**

- Uses `ESLint` for linting and `Prettier` for formatting
- Config in `backend/.eslintrc.json` and `backend/.prettierrc`
- Run: `cd backend && npm run lint` (lint) or `npm run format` (format)

**Pre-commit hooks:**

- Configured via `husky` + `lint-staged`
- Install: `npm run prepare` (sets up husky)
- Runs lint + format on staged files automatically

## Testing

The project uses a **two-tier testing strategy**:

| Tier | Name              | When to Run               | Duration       | Purpose                                |
| ---- | ----------------- | ------------------------- | -------------- | -------------------------------------- |
| 1    | **Instant**       | Before every build/commit | < 30 seconds   | Fast feedback on core functionality    |
| 2    | **Comprehensive** | Nightly (overnight)       | 10-60+ minutes | Deep E2E tests, full workflow coverage |

---

### Tier 1: Instant Tests

**Run before every build and commit.** These must be fast enough that developers run them habitually.

**Frontend (Vitest unit tests):**

```bash
cd frontend && npm test
```

- Tests: component logic, utility functions, state management, API helpers
- Location: `frontend/src/**/*.test.ts`

**Backend (fast Jest/Vitest tests):**

```bash
cd backend && npm test
```

- Tests: API endpoints, service logic, validation, PDF extraction
- Location: `backend/src/**/*.test.ts`
- Excludes slow integration tests

**Combined instant check:**

```bash
cd frontend && npm test && cd ../backend && npm test
```

---

### Tier 2: Comprehensive Tests

**Run nightly or before major releases.** These take longer but provide deep coverage.

**Frontend E2E (Playwright browser simulation):**

E2E tests require the backend to be running for the entire duration.

```bash
# Option 1: Dedicated terminal
./backend.sh                          # Terminal 1 (keep open)
cd frontend && npm run test:e2e       # Terminal 2

# Option 2: Background (for unattended/CI runs)
nohup npm run --prefix backend start > /dev/null 2>&1 &
cd frontend && npm run test:e2e
```

- Tests: Auth flows, script upload, element tagging, option upload, approval workflow, responsive layouts
- Location: `frontend/tests/e2e/*.spec.ts`

**Debug mode with UI:**

```bash
cd frontend && npm run test:e2e:ui
```

**Backend integration tests:**

```bash
cd backend && npm run test:integration
```

- Full database integration tests with test PostgreSQL instance
- Tests complete approval workflows end-to-end

---

### Adding New Tests

**Instant tests (Tier 1):**

- Add to existing `*.test.ts` files or create new ones alongside source files
- Keep individual tests under 100ms

**Comprehensive tests (Tier 2):**

- Add Playwright E2E tests to `frontend/tests/e2e/`
- Add backend integration tests to `backend/src/**/*.integration.test.ts`

---

### E2E Test Best Practices

**Always wait for page state before interaction:**

```typescript
await page.waitForSelector("#dashboard:not(.loading)", { timeout: 5000 });
await page.click("#element-card");
```

**Use condition-based waits, not `waitForTimeout()`:**

```typescript
// WRONG - arbitrary delay
await page.waitForTimeout(2000);

// CORRECT - wait for specific condition
await page.waitForSelector(".approval-badge", { timeout: 10000 });
```

**Register dialog handlers BEFORE triggering actions:**

```typescript
// CORRECT - handler ready before action
page.on("dialog", (dialog) => dialog.accept());
await page.click("#delete-option");
```

## Workflow

- **Check for uncommitted changes before starting** — Run `git status` at the start of each task to understand the current state. Address any uncommitted changes before beginning new work.
- **When resuming from a prior session, commit first** — If there are uncommitted changes from a previous session, commit them immediately before starting any new work.
- **Commit after each logical step** — Always commit changes after completing each distinct task or fix. Do not batch multiple fixes into one commit. Plans should include explicit commit points after each phase.
- **Run Tier 1 (Instant) tests before every commit** — Both frontend and backend fast tests must pass. Make sure there is a git hook for this.
- **Write tests for new code** — Add tests to ensure ALL new functionality works and won't regress. Place fast unit tests in Tier 1 files, slower integration tests in Tier 2 files.
- **Ensure clean git working directory before pushing** — Run `git status` to verify clean state before any push.

## Test Integrity (CRITICAL — READ THIS)

**A failing test that tests the correct behavior is VALUABLE. It has revealed a bug.**

### NEVER Do This:

- Change a test to be weaker so it passes
- Remove assertions that are failing
- Change what a test verifies to avoid a failure
- Rationalize "this is a pre-existing bug, let's test something else"
- Silently commit a weakened test

### When a Test You Wrote Fails:

1. **STOP** — Do not change the test to make it pass
2. **Investigate** — Why is it failing? Is there a bug in the code?
3. **Decide:**
   - If you can fix the bug → fix it, then the test passes correctly
   - If it's complex or unclear → **ASK THE USER** how to proceed
   - If it's truly a pre-existing issue → **TELL THE USER** explicitly and let them decide
4. **NEVER** weaken the test without explicit user approval

### The Test's Job:

A test exists to verify that functionality works. If you change the test to not verify the functionality, you have **defeated its entire purpose**. The test becomes worthless theater.

### Example of What NOT to Do:

```
// BAD: Test failed, so I changed it to test less
- expect(element.status).toBe('approved');  // Removed because it failed
+ expect(element).toBeDefined();            // Added weaker assertion
// This is UNACCEPTABLE
```

### Example of What TO Do:

```
// Test failed → investigate → found bug → EITHER:
// 1. Fix the bug, test now passes
// 2. Ask user: "The test revealed that approval status doesn't persist.
//    Should I investigate and fix, or deprioritize?"
```

## Test-Driven Development (TDD)

Every bug fix follows TDD methodology.

### TDD Workflow

1. **Write failing test FIRST** — Define expected behavior before writing code
2. **Run test, verify it fails** — Confirm the test catches the issue
3. **Fix the root cause** — Not a surface patch, the actual underlying problem
4. **Run test, verify it passes** — Confirm the fix works
5. **Run full test suite** — Ensure no regressions

### Why TDD

- **Proves the bug existed** — The failing test demonstrates the issue
- **Proves it's fixed** — The passing test confirms the solution
- **Prevents regression** — The test stays in the suite forever
- **Forces understanding** — You must understand the problem before solving it

## Trusting User Bug Reports

**When the user reports a bug they are experiencing, believe them.**

### NEVER Do This:

- Dismiss a bug report because tests pass
- Assume the user is wrong or mistaken
- Skip adding debugging because "it should work"
- Move on to other tasks without helping diagnose the reported issue

### When the User Reports a Bug:

1. **Believe them** — The user is experiencing something real
2. **Add logging** — Even if tests pass, add debug logging to capture what's happening
3. **Deploy for testing** — Get the logging into the environment where the bug occurs
4. **Investigate together** — Work with the user to diagnose using the logs
5. **Don't dismiss** — Tests can pass while real-world scenarios still fail

## Roadmap

All bugs, features, and planned work are tracked in [`roadmap.md`](./roadmap.md).

- When deprioritizing work, add it to the roadmap with appropriate priority level
- Explicitly tell the user when items are added to the roadmap instead of being done immediately
- Check the roadmap before starting work to understand current priorities

## No Backwards Compatibility Code

**This app is not in production.** There is no legacy data or external consumers.

### NEVER Do This:

- Add code to accept "old" parameter names alongside new ones
- Support deprecated API formats "for compatibility"
- Add fallbacks for "legacy" behavior
- Keep dead code "just in case"

### When You Find Unused Code:

1. **Delete it** — Don't preserve it
2. **Update all tests** — Make them use current APIs
3. **Update all callers** — Ensure consistent usage

## Design Principles

- **Always prefer the ideal approach** — Choose the correct, maintainable solution over quick shortcuts.
- **Command-line first** — All tests, builds, and automation should be runnable from the terminal.
- **Separate concerns** — Keep pure logic separate from platform-specific code so it can be tested independently.
- **Immutable records** — Elements, options, and approval decisions are never hard-deleted. Use status fields and soft-delete patterns.
- **Script is the anchor** — Every feature connects back to the script. Elements live on script pages. Options belong to elements.

## Code Organization

### Single Source of Truth (CRITICAL)

Every piece of data, type definition, or configuration must be defined in exactly ONE location:

- **Types**: Define once in `shared/types/`, import everywhere else
- **Constants**: Define once in `shared/constants/`, import everywhere
- **Prisma models**: `prisma/schema.prisma` is the single source for data models
- **Magic values**: Never hardcode the same value in multiple files

**Violations to watch for:**

- Same type defined in both frontend and backend
- Same constant value defined in multiple places
- Hardcoded values that should be shared constants

**When you find a violation:** Fix it immediately by choosing the canonical location, deleting duplicates, and updating all consumers.

### File Size Limits

| Threshold   | Lines    | Guidance                                 |
| ----------- | -------- | ---------------------------------------- |
| Target      | 200-400  | Ideal for new code                       |
| Comfortable | 400-600  | Acceptable for established modules       |
| Review      | 600-1000 | Evaluate: is it cohesive?                |
| Large       | 1000+    | Only acceptable if single-responsibility |

### Module Structure Pattern

```
module/
  index.ts       # Barrel exports only (no logic)
  types.ts       # Types and interfaces
  constants.ts   # Module-specific constants
  featureA.ts    # Feature implementation
  featureB.ts    # Feature implementation
```

### Avoiding Global State

Prefer:

1. **Pass state as parameters** — Functions receive what they need
2. **Return new state** — Don't mutate, return modified copies
3. **Use React context/stores** — Centralized state management for UI
4. **Dependency injection** — Pass dependencies to constructors/init functions
