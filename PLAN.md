# Current Plan

## Next: Sprint 26 — UI Fixes & Polish

**Goal:** Fix every user-reported UI bug and polish issue. Make the app feel solid for real users.

**Context:** User tested production app at slugmax.com and reported multiple UI bugs and workflow improvements. Email infrastructure now working (switched from nodemailer SMTP to `@aws-sdk/client-sesv2` SES API because Railway blocks port 587). These user-reported issues take priority over the security sprint.

### Items (11 tasks)

1. Fix element name invisible on active row (`element-list.tsx`)
2. Fix element list click to open side panel instead of full page (`element-list.tsx`)
3. Fix PDF highlight bugs — specificity, substring matching, "element not found" (`pdf-highlights.ts`, `element-detail-panel.tsx`)
4. Fix OUTSTANDING badge visually distinct from APPROVED (`globals.css`, production dashboard)
5. Fix productions page spacing — `gap-4`, `max-w-3xl` (`productions/page.tsx`)
6. Fix footer sticking to bottom of viewport (`layout.tsx`)
7. Fix sort/filter button active state — consistent borders (`element-list.tsx`)
8. Change DECIDER tooltip text + fix lowercase "i" button (`permissions-tooltip.tsx`)
9. Remove title field from invite form, support multi-email invite (`productions/[id]/page.tsx`)
10. Add default departments: Director, Producer, Production Office (`shared/constants/departments.ts`)
11. Auto-assign production creator to Production Office department (`backend/routes/productions.ts`)

### TDD Approach

Each item follows: write failing test → verify failure → implement fix → verify pass → commit.

---

## Previously Completed

### Sprint 25 — Exhaustive E2E Tests (DONE)

**Result: 57 E2E tests across 9 spec files. All Tier 1 tests passing (862 total).**

- Auth flows (8 tests), Production management (8 tests), Script workflow (5 tests)
- Element management (5 tests), Options & Approvals (10 tests), Notifications (4 tests)
- Settings (6 tests), Responsive layouts (10 tests), Test seeder endpoint
