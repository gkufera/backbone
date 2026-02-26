# Current Plan

## Sprint 26 — UI Fixes & Polish

**Goal:** Fix every user-reported UI bug and polish issue. Make the app feel solid for real users.

**Context:** User tested production app at slugmax.com and reported multiple UI bugs and workflow improvements. These user-reported issues take priority over the security sprint.

---

### Step 1: Fix element name invisible on active row
- **Bug:** `element-list.tsx:263` — Link has `isActive ? '' : 'text-black'`, leaving no color class when active. Global `a { color: #000 }` in globals.css overrides inherited `text-white`.
- **TDD:** Write test that renders element list with active element, assert Link has `text-white` class when active
- **Fix:** Change className to `isActive ? 'text-white' : 'text-black'`
- **COMMIT**

### Step 2: Fix sort/filter button borders (active state inconsistent)
- **Bug:** `element-list.tsx:137-150` — Active buttons get `bg-black text-white` but no border. Inactive get `border-2 border-black`. Visual inconsistency.
- **TDD:** Write test that renders element list, asserts active sort button includes `border-2 border-black`
- **Fix:** Add `border-2 border-black` to active state for all sort/view mode buttons (lines 137-150) and department filter buttons (lines 99-127)
- **COMMIT**

### Step 3: Fix element list click — side panel instead of full page
- **Bug:** `element-list.tsx:261-266` — Element name is always a `<Link>` that navigates, even when `onElementClick` callback is provided. Should use callback when in split-panel context.
- **TDD:** Write test: render with `onElementClick` prop → click element name → assert callback called, no `<Link>` rendered. Render without `onElementClick` → assert `<Link>` is present.
- **Fix:** When `onElementClick` is provided, render element name as `<button>` calling `onElementClick(elem.id)` instead of `<Link>`. Keep `<Link>` only when `onElementClick` is not provided.
- **COMMIT**

### Step 4: Fix OUTSTANDING badge visually distinct from APPROVED
- **Bug:** `globals.css` — `.badge-ready` and `.badge-approved` both have `background: #000; color: #fff`. Identical on dashboard.
- **TDD:** Write test for production dashboard that verifies OUTSTANDING badge uses `badge-outstanding-review` (new class), not `badge-ready`
- **Fix:** Create new `.badge-outstanding-review` class in globals.css with horizontal stripe pattern (distinct from rejected's diagonal stripes). Update `productions/[id]/page.tsx:263` to use new class.
- **COMMIT**

### Step 5: Fix productions page spacing
- **Bug:** `productions/page.tsx:34-35` — No gap between heading and button, `max-w-2xl` too narrow.
- **TDD:** Write test asserting container has `max-w-3xl` and flex container has `gap-4`
- **Fix:** Change `max-w-2xl` → `max-w-3xl`, add `gap-4` to flex container
- **COMMIT**

### Step 6: Fix footer sticking to bottom of viewport
- **Bug:** `layout.tsx:38-41` — On full-height pages (script viewer uses `h-[calc(100vh-4rem)]`), content + footer exceeds viewport.
- **TDD:** Write test for layout structure: main has `flex-1` and `min-h-0`, verify footer is rendered after main
- **Fix:** Add `overflow-hidden` to main on pages that set explicit viewport heights, or restructure layout so footer is within the viewport. Key fix: ensure `<main>` has `min-h-0` to prevent flex item overflow, and script viewer page accounts for footer height.
- **COMMIT**

### Step 7: Fix DECIDER tooltip text + lowercase "i" button
- **Bug A:** `permissions-tooltip.tsx:11` — Text says "Your approvals are official and final." Should say "You make approvals based on options other users present to you."
- **Bug B:** `permissions-tooltip.tsx:34` — Button shows "i" but VT323 + global `text-transform: uppercase` renders it as "I".
- **TDD:** Write test: render with role=DECIDER, assert tooltip contains new text. Assert button has `normal-case` class.
- **Fix:** Update roleDescriptions.DECIDER text. Add `normal-case` to button className.
- **COMMIT**

### Step 8: Remove title from invite form + support multi-email
- **Bug:** `productions/[id]/page.tsx:343-362` — Has unnecessary "Title (optional)" field. Should support comma/whitespace-separated emails.
- **TDD:** Write test: render invite form, assert no title input. Enter "a@b.com, c@d.com", submit, assert `addMember` called twice.
- **Fix:** Remove title input + `memberTitle` state. Change email input to accept comma/whitespace-separated emails. Parse on submit, call `addMember()` for each email. Update input type from `email` to `text` and placeholder to "Enter emails (comma-separated)".
- **COMMIT**

### Step 9: Fix PDF highlight bugs (specificity + error handling)
- **Bug A:** `pdf-highlights.ts:36-53` — `findTextInLayer()` returns first span containing search text, not the most specific (smallest) match.
- **Bug B:** `element-detail-panel.tsx:69-79` — "Element not found" is a harsh error. Should offer to refresh.
- **TDD:** Write test: create DOM with nested spans where parent contains "JOHN SMITH" and child contains "JOHN". Search for "JOHN" → assert returns the smaller span. Write test: exact match preferred over substring.
- **Fix A:** Modify `findTextInLayer()`: collect all matching spans, return the one with shortest `textContent` (most specific). Try exact match first, then substring fallback.
- **Fix B:** Update error message in element-detail-panel to "Element not found. It may have been archived." with a refresh button that reloads data.
- **COMMIT**

### Step 10: Add default departments: Director, Producer, Production Office
- **Files:** `shared/constants/departments.ts`, `backend/src/__tests__/productions.test.ts`
- **TDD:** Update existing test to expect 16 departments (currently expects 13). Run test → fails. Add 3 departments + colors → test passes.
- **Fix:** Add "Director", "Producer", "Production Office" to `DEFAULT_DEPARTMENTS` array and `DEFAULT_DEPARTMENT_COLORS` map with appropriate colors.
- **COMMIT**

### Step 11: Auto-assign production creator to "Production Office" department
- **File:** `backend/src/routes/productions.ts:36-65`
- **TDD:** Write test: when creating a production, assert the creator's `productionMember` record gets `departmentId` set to the Production Office department.
- **Fix:** After seeding default departments in the transaction, query for the "Production Office" department, then update the member's `departmentId`.
- **COMMIT**

### Step 12: Run full Tier 1 test suite, update PLAN.md & roadmap.md
- Run `cd frontend && npm test && cd ../backend && npm test`
- Check off all Sprint 26 items in roadmap.md
- Update PLAN.md to reflect completion
- **COMMIT**

---

## Previously Completed

### Sprint 25 — Exhaustive E2E Tests (DONE)

**Result: 57 E2E tests across 9 spec files. All Tier 1 tests passing (862 total).**

- Auth flows (8 tests), Production management (8 tests), Script workflow (5 tests)
- Element management (5 tests), Options & Approvals (10 tests), Notifications (4 tests)
- Settings (6 tests), Responsive layouts (10 tests), Test seeder endpoint
