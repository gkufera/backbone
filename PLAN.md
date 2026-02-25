# Current Plan

## Active Task
Codebase Best Practices Audit — planning refactoring sprints.

## Comprehensive Audit Results

10 parallel audit agents scanned every source file against CLAUDE.md rules. Findings organized by severity:

### CRITICAL — Violations of Non-Negotiable Rules

#### C1. Immutability violations — hard deletes (3 locations)
- `backend/src/routes/elements.ts:222` — `prisma.element.delete()` hard-deletes elements
- `backend/src/routes/productions.ts:376` — `prisma.productionMember.delete()` hard-deletes members
- `backend/src/routes/departments.ts:149` — `prisma.department.delete()` hard-deletes departments
- Missing `deletedAt` fields on Element, Option, Approval, ProductionMember, Department models in Prisma schema
- DirectorNote is the ONLY model with correct soft-delete pattern

#### C2. Color violations in globals.css — non-1-bit colors (12 CSS classes)
- `.approval-btn-approved` uses `#00A651` (green)
- `.approval-btn-maybe` uses `#FFD700` (gold)
- `.approval-btn-rejected` uses `#E63946` (red)
- `.option-border-approved` uses `#00A651` (green border)
- `.option-border-rejected` uses `#E63946` (red border)
- `.temp-green` uses `#00A651`, `.temp-yellow` uses `#FFD700`, `.temp-red` uses `#E63946`
- `.rejected-x-overlay` uses `#E63946`
- These are NOT documented exceptions — CLAUDE.md only allows department colors as exceptions
- Used in: approval-buttons.tsx, option-thumbnail.tsx, element-list.tsx

#### C3. Opacity violation — bg-opacity-90
- `frontend/src/components/option-lightbox.tsx:135` — `bg-white bg-opacity-90` for lightbox backdrop
- CLAUDE.md: only `disabled:opacity-50` is allowed

### HIGH — Significant Best Practice Violations

#### H1. Hardcoded status strings instead of shared enum values (14+ instances)
- `backend/src/routes/approvals.ts:49,54` — `'ARCHIVED'` instead of enum
- `backend/src/routes/elements.ts:212` — `'REVIEWING'` instead of enum
- `backend/src/routes/options.ts:299,302` — `'PENDING'`, `'OUTSTANDING'` instead of enum
- `backend/src/routes/revision-matches.ts:42,109` — `'RECONCILING'` instead of enum
- `backend/src/routes/scripts.ts:482-483` — `'REVIEWING'`, `'READY'` instead of enum
- `backend/src/services/element-matcher.ts:74` — `'ARCHIVED'` instead of enum
- `backend/src/services/revision-processor.ts:48,63,72,114,120,129` — multiple hardcoded statuses
- `backend/src/services/script-processor.ts:65,85` — `'READY'`, `'REVIEWING'`, `'ERROR'`

#### H2. Font system violations (10+ locations)
- `font-bold`/`font-medium` on VT323 elements (VT323 must NEVER be bold):
  - `user-nav.tsx:18,24` — `font-medium` on mac-btn-secondary (VT323 buttons)
  - `element-list.tsx:262,267` — `font-medium font-mono` on element names
- Missing `font-mono` on body text (defaults to VT323 instead of Courier Prime):
  - `discussion-box.tsx:82` — composer name span without font-mono
  - `element-detail-panel.tsx:212` — error message div without font-mono
  - `option-lightbox.tsx:84,89,126` — media type spans without font-mono, with font-bold
- `font-bold` where unnecessary:
  - `page.tsx:28` (home) — tagline `font-bold font-mono` (body text)
  - `login/page.tsx:127` — "Sign up" link `font-bold underline`

#### H3. File size concerns — 3 backend files over comfortable limit
- `backend/src/routes/scripts.ts` — 628 lines (mixed HTTP + S3 + business logic)
- `backend/src/routes/productions.ts` — 599 lines (mixed production + member + stats)
- `backend/src/routes/auth.ts` — 509 lines (mixed auth + password reset + verification)
- `frontend/src/lib/api.ts` — 667 lines (acceptable: well-structured API client)

#### H4. Test hardcoded values instead of shared constants (50+ instances)
- NotificationType strings hardcoded in notification-service.test.ts, workflow-state.test.ts, notifications.test.ts
- ElementType strings hardcoded in element-detector.test.ts
- Department names hardcoded in departments.test.ts

### MEDIUM — Improvement Opportunities

#### M1. Magic constants not in shared/
- `backend/src/routes/auth.ts:13` — `SALT_ROUNDS = 10`
- `backend/src/lib/jwt.ts:10` — `JWT_EXPIRES_IN = '7d'`
- `backend/src/middleware/rate-limit.ts` — `windowMs`, `max` values

#### M2. Routes barrel export incomplete
- `backend/src/routes/index.ts` — exports 6/13 routers (app.ts imports directly, so low impact)

#### M3. Weak test assertions (3-4 instances)
- `auth.test.ts:227,752` — `toBeDefined()` where specific value check would be better
- `notification-service.test.ts:102` — `toBeDefined()` too weak

### CLEAN AREAS (No Issues Found)

- Rounded corners: 0 violations
- Shadows: 0 violations
- Dark mode: 0 violations
- Focus rings: 0 violations
- Font smoothing: 0 violations
- Shared imports (@backbone/shared): all correct
- No duplicate type definitions between frontend/backend
- No backwards-compatibility code
- No dead code, no skipped tests
- No global mutable state
- No waitForTimeout() in E2E tests
- Barrel exports clean (no logic in index.ts)
- All Tailwind color classes clean (no bg-blue-*, etc.)

---

## Proposed Refactoring Sprints

### Sprint 15: Immutability & Soft-Delete (~500 LOC)

**Goal:** Fix all hard-delete violations. Add deletedAt fields. Replace prisma.delete() with soft-delete.

#### Step 1: Schema migration — add deletedAt fields
- TDD: Write test that Prisma schema has `deletedAt` on Element, ProductionMember, Department
- Add `deletedAt DateTime?` to Element, ProductionMember, Department in schema.prisma
- Run `npx prisma migrate dev`
- COMMIT: `feat: add deletedAt fields for soft-delete on Element, ProductionMember, Department`

#### Step 2: Replace element hard-delete with soft-delete
- TDD: Write test that DELETE /api/elements/:id sets deletedAt instead of removing record
- Update elements.ts to use `prisma.element.update({ data: { deletedAt: new Date() } })`
- Update all element queries to filter `deletedAt: null`
- Rename frontend `elementsApi.hardDelete()` to `elementsApi.delete()` (or `archive()`)
- COMMIT: `fix: replace element hard-delete with soft-delete`

#### Step 3: Replace productionMember hard-delete with soft-delete
- TDD: Write test that DELETE /api/productions/:id/members/:memberId sets deletedAt
- Update productions.ts to soft-delete members
- Update member queries to filter `deletedAt: null`
- COMMIT: `fix: replace productionMember hard-delete with soft-delete`

#### Step 4: Replace department hard-delete with soft-delete
- TDD: Write test that DELETE /api/departments/:id sets deletedAt
- Update departments.ts to soft-delete departments
- Update department queries to filter `deletedAt: null`
- COMMIT: `fix: replace department hard-delete with soft-delete`

#### Step 5: Tier 1 tests, update roadmap + PLAN.md
- COMMIT: `docs: update roadmap and PLAN.md after Sprint 15`

---

### Sprint 16: Design System Compliance (~400 LOC)

**Goal:** Replace all color violations with 1-bit patterns. Fix font system violations.

#### Step 1: Replace approval button colors with 1-bit patterns
- TDD: Write test that globals.css approval button classes contain no hex colors other than #000/#fff
- Redesign `.approval-btn-approved` → inverted (black bg, white text) — same as badge-approved
- Redesign `.approval-btn-maybe` → checkerboard pattern bg — same as badge-maybe
- Redesign `.approval-btn-rejected` → diagonal stripe pattern bg — same as badge-rejected
- COMMIT: `fix: replace approval button colors with 1-bit patterns`

#### Step 2: Replace option border colors with 1-bit patterns
- TDD: Write test that option-border classes contain no hex colors
- Redesign `.option-border-approved` → `border-4 border-black` (thicker = approved)
- Redesign `.option-border-rejected` → `border-2 border-black border-dashed` (dashed = rejected)
- COMMIT: `fix: replace option border colors with 1-bit patterns`

#### Step 3: Replace temperature indicator colors with 1-bit patterns
- TDD: Write test that temp-* classes contain no hex colors
- Redesign `.temp-green` → solid filled indicator
- Redesign `.temp-yellow` → half-filled or checkerboard
- Redesign `.temp-red` → empty/dashed indicator
- Remove `.rejected-x-overlay` color
- COMMIT: `fix: replace temperature indicators with 1-bit patterns`

#### Step 4: Fix lightbox backdrop opacity
- TDD: Write test that option-lightbox has no bg-opacity class
- Replace `bg-white bg-opacity-90` with `bg-white` (solid)
- COMMIT: `fix: remove opacity from lightbox backdrop`

#### Step 5: Fix font system violations
- TDD: Write test scanning .tsx files for font-bold/font-semibold/font-medium on non-font-mono elements
- Remove `font-medium` from user-nav.tsx mac-btn-secondary buttons
- Remove `font-medium` from element-list.tsx element names (keep font-mono)
- Add `font-mono` to discussion-box.tsx composer name span
- Add `font-mono` to element-detail-panel.tsx error div
- Add `font-mono` to option-lightbox.tsx media type spans, remove font-bold
- Remove `font-bold` from home page.tsx tagline (keep font-mono)
- Remove `font-bold` from login/page.tsx signup link
- COMMIT: `fix: correct font system violations across components`

#### Step 6: Tier 1 tests, update roadmap + PLAN.md
- COMMIT: `docs: update roadmap and PLAN.md after Sprint 16`

---

### Sprint 17: Single Source of Truth (~300 LOC)

**Goal:** Replace all hardcoded status strings with shared enum values. Move magic constants to shared/.

#### Step 1: Replace hardcoded status strings in backend routes
- TDD: Write test scanning backend .ts files for hardcoded status strings that exist as enum values
- Import and use `ElementStatus`, `OptionStatus`, `ScriptStatus`, `ElementWorkflowState`, `RevisionMatchStatus` in all route and service files
- COMMIT: `refactor: replace hardcoded status strings with shared enum values`

#### Step 2: Move magic constants to shared/
- Create `shared/constants/auth.ts` with SALT_ROUNDS, JWT_EXPIRES_IN
- Create `shared/constants/rate-limit.ts` with rate limit values
- Update backend imports
- COMMIT: `refactor: move magic constants to shared/constants`

#### Step 3: Replace hardcoded values in test files with shared enums
- Update notification tests to use NotificationType enum
- Update element-detector tests to use ElementType enum
- Update department tests to use DEFAULT_DEPARTMENTS constant
- COMMIT: `refactor: replace hardcoded test values with shared constants`

#### Step 4: Fix routes barrel export + strengthen weak assertions
- Update `backend/src/routes/index.ts` to export all 13 routers
- Strengthen `toBeDefined()` assertions in auth.test.ts, notification-service.test.ts
- COMMIT: `refactor: complete routes barrel exports and strengthen test assertions`

#### Step 5: Tier 1 tests, update roadmap + PLAN.md
- COMMIT: `docs: update roadmap and PLAN.md after Sprint 17`

---

### Sprint 18: Backend Route Refactoring (~600 LOC, net neutral)

**Goal:** Split oversized route files into router + service layers. No behavior changes.

#### Step 1: Extract script service from scripts.ts (628 → ~250 lines)
- TDD: Existing tests must continue passing (no new tests needed for pure refactor)
- Create `backend/src/services/script-service.ts` — business logic
- Keep `backend/src/routes/scripts.ts` — HTTP layer only
- COMMIT: `refactor: extract script service from scripts route`

#### Step 2: Extract production member service from productions.ts (599 → ~250 lines)
- Create `backend/src/services/production-member-service.ts` — member CRUD logic
- Create `backend/src/services/production-stats-service.ts` — stats calculation
- Keep `backend/src/routes/productions.ts` — HTTP layer only
- COMMIT: `refactor: extract member and stats services from productions route`

#### Step 3: Extract auth service from auth.ts (509 → ~200 lines)
- Create `backend/src/services/auth-service.ts` — auth business logic
- Keep `backend/src/routes/auth.ts` — HTTP layer only
- COMMIT: `refactor: extract auth service from auth route`

#### Step 4: Tier 1 tests, update roadmap + PLAN.md
- COMMIT: `docs: update roadmap and PLAN.md after Sprint 18`

---

## Test Counts
- **Frontend**: 427 tests
- **Backend**: 371 tests (+1 build prerequisites)
- **Total**: 798 tests

## Previous Results
(Archived — see git history for CI Build Fix, Sprint 14, Backend .js Import Cleanup details)
