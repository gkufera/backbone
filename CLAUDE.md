## ⚠️ AUTOMATION & METHODOLOGY — READ FIRST

All work MUST follow `.claude/rules.txt`. Read it at the start of every session.

### Non-Negotiables

- **TDD is mandatory**: Failing test → prove failure → implement → prove success. No exceptions.
- **Commit at every step**: Small, frequent, descriptive commits. Never batch unrelated changes.
- **Maintain PLAN.md**: Update after each step. Re-read after compaction.
- **Immutable data**: Never hard-delete elements/options/approvals. Soft-delete only.
- **Tier 1 tests before commit**: `cd frontend && npm test && cd ../backend && npm test`
- **When stuck, ASK**: After 2 failed attempts, ask the user. Don't write weak tests.

### Slash Commands

| Command | Purpose |
|---------|---------|
| `/pm` | Start PM orchestrator for full work session |
| `/review` | Run QA verification on recent work |
| `/plan` | Check current task and plan status |
| `/tdd` | Walk through test-first workflow step by step |
| `/deploy` | Run tests and deploy to production |
| `/roadmap` | Status report on roadmap.md priorities |
| `/status` | Quick project health dashboard |

### Subagents

- **pm-orchestrator**: Manages work sessions, picks tasks from roadmap, enforces methodology
- **qa-reviewer**: Verifies TDD compliance, commit discipline, test quality

### After Compaction

Immediately re-read these files before continuing any work:
1. `CLAUDE.md`
2. `.claude/rules.txt`
3. `PLAN.md`
4. `roadmap.md`

---

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Slug Max is a unified production collaboration platform built around the film/TV script. It connects every **script element** (locations, props, wardrobe items, cast, etc) with multiple creative **options** (photos, videos, audio clips, storyboards, links, etc) and provides a coordinated **approval workflow**. Instead of wading through emails, a director sees a **news feed** of new options tagged to script elements. She can **approve, reject or tentatively approve** each option with comments. Until one option per element is approved, that element remains unresolved, and all relevant departments are notified once a choice is made.

The system never deletes element/option records, ensuring an immutable audit trail.

## Repository Structure

- `frontend/` — Next.js web app (TypeScript, React)
- `backend/` — Express.js API server (TypeScript, Node.js)
- `prisma/` — Prisma schema and migrations (shared between frontend and backend)
- `shared/` — Shared TypeScript types and constants used by both frontend and backend

## Technology Stack

- **Frontend**: Next.js 16 (App Router, TypeScript, Tailwind CSS v4, Turbopack)
- **Backend**: Express 5 (TypeScript, tsx for dev server)
- **Database**: PostgreSQL 16 via Docker Compose, Prisma 6 ORM
- **Testing**: Vitest (unit/integration), Playwright (E2E)
- **Linting**: ESLint 9+ (flat config), Prettier
- **Shared types**: `@backbone/shared` package imported via TypeScript path aliases

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

**Database commands** (run from `backend/` directory):

```bash
npx prisma migrate dev     # Apply migrations
npx prisma generate        # Regenerate Prisma client
npx prisma studio          # Visual database browser
npx prisma db seed         # Seed sample data
```

## Deployment

**Domain:** [slugmax.com](https://slugmax.com) — Cloudflare DNS → Railway

The app is deployed on **Railway** with **Cloudflare** handling DNS (DNS-only mode, no proxy/CDN).

### Branch Strategy

- **main**: Development branch — all work happens here
- **production**: Deployment branch — Railway auto-deploys from this branch

### Deploying Changes

1. Make changes on `main` branch
2. Test locally with `./run.sh`
3. Run Tier 1 tests: `cd frontend && npm test && cd ../backend && npm test`
4. Commit and push to `main`
5. Merge to `production` and push:
   ```bash
   git checkout production
   git merge main --no-edit
   git push origin production
   git checkout main
   ```
6. Railway auto-detects the push and rebuilds both services

### Railway Services

**Backend Service** (`backend/`):

- Node.js 20 runtime
- Build: `npm run build`
- Start: `npm run start`
- Custom domain: `api.slugmax.com`
- Environment variables:
  - `DATABASE_URL` (from Railway PostgreSQL)
  - `JWT_SECRET`
  - `CORS_ORIGINS=https://slugmax.com`
  - `PORT=8000`
  - `EMAIL_ENABLED=false`
  - `EMAIL_FROM=noreply@slugmax.com`
  - `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME`

**Frontend Service** (`frontend/`):

- Node.js 20 runtime
- Build: `npm run build`
- Start: `npm run start`
- Custom domain: `slugmax.com`
- Environment variables:
  - `NEXT_PUBLIC_API_BASE_URL=https://api.slugmax.com`

**Database Service:**

- Railway-managed PostgreSQL

### Cloudflare DNS

- **Zone:** slugmax.com (DNS-only mode, no Cloudflare proxy)
- `slugmax.com` → CNAME → Railway frontend domain
- `api.slugmax.com` → CNAME → Railway backend domain

## Linting & Code Quality

**Frontend (TypeScript):**

- Uses `ESLint` (flat config) for linting and `Prettier` for formatting
- Config in `frontend/eslint.config.mjs` and `frontend/.prettierrc`
- Run: `cd frontend && npm run lint` (lint) or `npm run format` (format)

**Backend (TypeScript):**

- Uses `ESLint` (flat config) for linting and `Prettier` for formatting
- Config in `backend/eslint.config.mjs` and `backend/.prettierrc`
- Run: `cd backend && npm run lint` (lint) or `npm run format` (format)

**Pre-commit hooks:**

- Configured via `husky` + `lint-staged`
- Install: `npm run prepare` (sets up husky)
- Runs lint + format on staged files, then runs frontend and backend Tier 1 tests

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

**Backend (Vitest tests):**

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

## Visual Design System: 1-Bit Macintosh

The frontend uses a **1-bit monochromatic design** inspired by the early Macintosh (System 1–6 era). Every UI element exists in exactly two states: black or white. This is a hard constraint that applies to ALL frontend work — new features, bug fixes, component additions, and page layouts.

The design system is implemented in `frontend/src/app/globals.css`. That file is the single source of truth for all reusable CSS classes (`.mac-window`, `.badge-*`, `.mac-btn-*`, `.mac-alert*`, etc.). Read it before building any new UI.

### Core Rules (Non-Negotiable)

- **Pure black and white only** — `#000` and `#fff`. No grays (`zinc-*`, `gray-*`, `slate-*`), no colors (`blue-*`, `green-*`, `red-*`, `yellow-*`, `orange-*`), no gradients, no opacity for color variation. The ONLY use of opacity is `disabled:opacity-50` for disabled controls.
- **Two-font system** — Two fonts, each with a distinct role:
  - **VT323** (pixel font, `--font-vt323`) — For UI chrome: headings, labels, buttons, badges, nav items, window titles. Rendered uppercase with `letter-spacing: 0.05em`. Font smoothing disabled.
  - **Courier Prime** (screenplay font, `--font-courier-prime`) — For body/content text: descriptions, names, emails, timestamps, file names, notes, form input values. Rendered in normal case. Font smoothing enabled (`-webkit-font-smoothing: auto`).
  - CSS rules in `globals.css` auto-assign VT323 to `h1`–`h6`, `label`, `button` and Courier Prime to `p`, `td`, `th`, `input`, `textarea`, `select`.
  - For `<span>`, `<div>`, `<a>` elements, apply `font-mono` (maps to Courier Prime) when the content is data/body text, or leave as default (VT323) when it's UI chrome.
- **No rounded corners** — Never use `rounded`, `rounded-md`, `rounded-lg`, `rounded-full`, or any `border-radius`. All corners are sharp 90-degree angles.
- **No shadows** — Never use `shadow`, `shadow-sm`, `shadow-md`, `shadow-lg`, or `shadow-xl`. Visual hierarchy is achieved through borders and color inversion, not elevation.
- **No dark mode** — Never use `dark:*` Tailwind variants. The early Macintosh had one mode: white background, black foreground.
- **Borders: containers vs list items** — Outer `.mac-window` containers use `border-2 border-black`. List items inside containers use `divide-y divide-black` on the parent `<ul>` instead of individual borders — this avoids visual clutter from nested borders. Standalone cards (e.g., reconciliation decisions) and form inputs keep their own borders.
- **Font smoothing** — Disabled globally (`-webkit-font-smoothing: none`) for the pixel aesthetic. Courier Prime body text re-enables smoothing (`-webkit-font-smoothing: auto`) via CSS rules in `globals.css` for readability.
- **No focus rings** — No `focus:ring-*` classes. Focus is handled globally via `outline: 2px solid #000` in `globals.css`.

### How Visual Hierarchy Works Without Color

Since there are no colors, the design uses these techniques to create hierarchy and communicate state:

1. **Inversion** — The most important or active element gets `bg-black text-white`. This is the equivalent of "highlighted" or "selected."
2. **Border weight** — Standard elements use `border-2`. Extra emphasis uses `border-4` (e.g., current version in version history).
3. **Border style** — Solid borders are default. Dashed borders (`border-dashed`) indicate uncertainty or pending states.
4. **Dither patterns** — CSS background patterns (diagonal stripes, checkerboard) communicate complex states like "rejected" or "maybe" without color. These are defined as badge classes in `globals.css`.
5. **Font weight** — `font-bold` for emphasis, normal weight for secondary information. This replaces the color-based hierarchy of `text-zinc-500` vs `text-zinc-900`.
6. **Text decoration** — `underline` for links (handled globally). No need for `text-blue-600` — links are black and underlined.

### Building a New Page

When creating a new page, follow this structure:

```tsx
// Always white background, max-width container, consistent padding
<div className="mx-auto max-w-3xl p-6">
  <h1 className="mb-6 text-2xl font-bold">Page Title</h1>
  {/* page content */}
</div>
```

- Use `bg-white` on the outermost container if needed (body is already white).
- Error states: Use `text-black font-bold` for error messages, not `text-red-600`.
- Loading states: Just `<div className="p-6">Loading...</div>` in plain black text.
- Empty states: `<p className="text-black">No items yet.</p>` — no gray text.

### Building a New Component

When creating a new component:

1. **Never import color** — scan your className strings for any color keyword (blue, green, red, yellow, zinc, gray, slate, orange, purple, etc.). If you find one, replace it.
2. **Use existing CSS classes** — check `globals.css` for `.mac-window`, `.badge-*`, `.mac-btn-*`, `.mac-alert*` before writing custom styles.
3. **Dividers over individual borders** — to visually separate list items, use `divide-y divide-black` on the parent `<ul>` instead of `border-2 border-black` on each `<li>`. Reserve individual borders for standalone cards, form inputs, and `.mac-window` containers.
4. **Hover = invert** — interactive elements use `hover:bg-black hover:text-white`. No `hover:bg-zinc-50` or `hover:bg-blue-100`.

### Component Patterns Reference

**Cards and sections** — wrap in `.mac-window` with a `.mac-window-title` and `.mac-window-body`:
```tsx
<div className="mac-window">
  <div className="mac-window-title"><span>Section Name</span></div>
  <div className="mac-window-body">
    {/* content */}
  </div>
</div>
```
The title bar renders with an inverted background. Always wrap title text in `<span>` for correct z-index layering.

**Simpler section headers** — use `.mac-panel-title` for a plain inverted bar without the striped chrome:
```tsx
<div className="mac-panel-title">Notifications</div>
```

**Buttons:**
- Primary action: `className="mac-btn-primary"` (black bg, white text, reverses on hover)
- Secondary action: `className="mac-btn-secondary"` (white bg, black text/border, inverts on hover)
- Inline/text buttons: just use the default `<button>` styles from globals.css (2px border, invert on hover)
- Disabled: add `disabled:opacity-50` — this is the ONLY acceptable use of opacity

**Toggle / tab buttons** (e.g., File vs Link mode, Map vs Create New):
```tsx
<button className={`px-3 py-1 text-sm ${
  isSelected ? 'bg-black text-white' : 'bg-white text-black'
}`}>
```

**Links:**
- Standard `<a>` or Next.js `<Link>` — globals.css handles underline + invert-on-hover automatically
- For link-styled buttons (e.g., "Archive"), use `className="text-xs underline"` — the button base styles from globals.css add the border; if you want a text-only action link, override with `border-0` or use an `<a>` tag

**List items** (use `divide-y` on parent, padding on items):
```tsx
<ul className="divide-y divide-black">
  <li className="flex items-center justify-between py-3">
```

**Clickable list items:**
```tsx
<ul className="divide-y divide-black">
  <li><Link className="block py-4 hover:bg-black hover:text-white">
```

**Typography in components:**
- Headings (`h1`–`h6`), labels, buttons, badges → VT323 (automatic via CSS, uppercase)
- Descriptions, names, emails, timestamps, file names → add `font-mono` class (Courier Prime)
- `<p>` tags get Courier Prime automatically via CSS; `<span>` and `<div>` need explicit `font-mono`
- Form input values get Courier Prime automatically (set in globals.css on `input`, `textarea`, `select`)

**Forms:**
- Inputs, textareas, and selects are styled globally (2px black border, square corners, black outline on focus, Courier Prime font). No additional border or focus classes needed beyond sizing (`w-full`, `p-2`, etc.).
- Labels: `className="block text-sm font-bold"` (use `font-bold`, not `font-medium` or colored text) — renders in VT323 uppercase automatically
- Error messages: `className="text-sm text-black font-bold"` (not red)

**Alerts and status messages:**
```tsx
// Informational alert
<div className="mac-alert">Message here</div>

// Error alert (diagonal stripe pattern background)
<div className="mac-alert-error p-3 text-sm">Error message</div>
```

**Notification indicators:**
```tsx
// Square notification count (replaces rounded-full red dots)
<span className="mac-notification-dot">{count}</span>
```

### Badge Classes for Status

Badges display workflow state. Always use both `.badge` (base) and a modifier class:

```tsx
<span className="badge badge-approved">APPROVED</span>
```

| Status | Class | Visual Description |
|--------|-------|-------------------|
| Default / neutral | `.badge .badge-default` | White bg, black 2px border |
| Approved / current / active | `.badge .badge-approved` | Inverted: black bg, white text |
| Rejected | `.badge .badge-rejected` | Diagonal stripe pattern bg |
| Maybe / tentative | `.badge .badge-maybe` | Checkerboard pattern bg |
| Outstanding / pending review | `.badge .badge-outstanding` | White bg, dashed border |
| Ready for review | `.badge .badge-ready` | Inverted: black bg, white text |
| Fuzzy match | `.badge .badge-fuzzy` | Diagonal stripe pattern bg |
| Missing element | `.badge .badge-missing` | Inverted, dashed border |

If you need a new status, define a new `.badge-*` class in `globals.css` using only `#000`, `#fff`, and CSS patterns (repeating-linear-gradient, repeating-conic-gradient). Never use color.

### Adding New CSS Classes

If the existing classes in `globals.css` don't cover your need:

1. Add the new class to `globals.css` — it is the single source of truth for design system CSS.
2. Use ONLY `#000` and `#fff` as colors.
3. Use CSS patterns (repeating-linear-gradient, repeating-conic-gradient) for visual differentiation — never color.
4. Follow the naming convention: `.mac-*` for structural chrome, `.badge-*` for status indicators.
5. Document the new class in this section of CLAUDE.md.

### Tailwind Classes: Allowed vs Prohibited

**Allowed Tailwind classes:**
- Layout: `flex`, `grid`, `block`, `inline-block`, `relative`, `absolute`, `sticky`, `fixed`
- Spacing: `p-*`, `m-*`, `gap-*`, `space-y-*`, `space-x-*`
- Sizing: `w-*`, `h-*`, `max-w-*`, `min-h-*`
- Typography: `text-sm`, `text-lg`, `text-xl`, `text-2xl`, `text-3xl`, `text-xs`, `font-bold`, `font-semibold`, `font-medium`, `font-mono` (for Courier Prime body text), `uppercase`, `tracking-*`, `leading-*`, `text-center`, `text-left`, `text-right`
- Color (ONLY these): `bg-white`, `bg-black`, `text-white`, `text-black`
- Border: `border`, `border-2`, `border-4`, `border-t-2`, `border-b`, `border-l-8`, `border-black`, `border-dashed`, `divide-y`, `divide-black`
- Interactivity: `hover:bg-black`, `hover:text-white`, `cursor-pointer`, `cursor-not-allowed`, `disabled:opacity-50`, `disabled:cursor-not-allowed`
- Overflow: `overflow-y-auto`, `overflow-hidden`
- Responsive: `sm:*`, `lg:*` for grid breakpoints

**Prohibited Tailwind classes (NEVER use):**
- ANY color besides black/white: `bg-blue-*`, `bg-green-*`, `bg-red-*`, `bg-yellow-*`, `bg-zinc-*`, `bg-gray-*`, `bg-slate-*`, `bg-orange-*`, `text-blue-*`, `text-green-*`, `text-red-*`, `text-yellow-*`, `text-zinc-*`, `text-gray-*`, `border-blue-*`, `border-green-*`, `border-red-*`, `border-yellow-*`, `border-zinc-*`
- Rounding: `rounded`, `rounded-md`, `rounded-lg`, `rounded-full`, `rounded-xl`
- Shadows: `shadow`, `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-xl`
- Dark mode: `dark:*` (any dark variant)
- Focus rings: `focus:ring-*`, `focus:ring-offset-*`
- Font smoothing: `antialiased`, `subpixel-antialiased`
- Opacity for color variation: `bg-opacity-*`, `text-opacity-*` (except `disabled:opacity-50`)

### Assets

- **Favicon**: `frontend/public/favicon.png` (32x32 1-bit slug icon)
- **Logo**: `frontend/public/logo.png` ("SLUG MAX" text with slug illustration, 1-bit style)
- Both use `image-rendering: pixelated` (set globally on `body` and also inline via `style` on `<Image>` components)
- When displaying images from users (uploaded options), standard rendering is fine — `pixelated` is only for our brand assets

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

### Shared Types Import Strategy

Both frontend and backend import from `@backbone/shared` using:
- **TypeScript**: `paths` in tsconfig.json → `"@backbone/shared/*": ["../shared/*"]`
- **Vitest**: `resolve.alias` in vitest.config.ts
- **Next.js**: `transpilePackages` + webpack alias in next.config.ts

When adding new shared types or constants, define them in `shared/` and import via `@backbone/shared/types` or `@backbone/shared/constants`.

### Avoiding Global State

Prefer:

1. **Pass state as parameters** — Functions receive what they need
2. **Return new state** — Don't mutate, return modified copies
3. **Use React context/stores** — Centralized state management for UI
4. **Dependency injection** — Pass dependencies to constructors/init functions
