# Current Plan

## Sprint 30 — QA & Polish (COMPLETE)

**Goal:** Fix UI polish issues affecting usability. 941 Tier 1 tests passing.

---

### Step 1: Fix .mac-alert-error text readability
- [x] Write failing test: `.mac-alert-error` must have `background: #fff`
- [x] Move stripe pattern from `background` to `border-image`
- [x] Verify text readable with solid white background
- [x] COMMIT (2bf6ecc)

### Step 2: Fix native HTML tooltip on department delete button
- [x] Write failing test: disabled delete has no `title` attribute, shows inline text
- [x] Replace `title="Cannot delete..."` with inline `<span>` explanation
- [x] Add design system test: no `title="..."` in component files
- [x] COMMIT (3c033fa)

### Step 3: Hide mobile hamburger when menu is empty
- [x] Write failing test: hamburger hidden when unauthenticated and no productionId
- [x] Write passing tests: hamburger shown when authenticated or on production page
- [x] Add `useAuth` to app-header, conditionally render hamburger
- [x] COMMIT (cacd05d)

### Step 4: Add noValidate to all forms (user-reported)
- [x] Write failing test: all `<form onSubmit>` must include `noValidate`
- [x] Add `noValidate` to all 17 forms across 13 files
- [x] COMMIT (6ff704b)

### Step 5: Deploy and update roadmap
- [x] Tier 1 tests: 473 frontend + 468 backend = 941 total
- [x] Update roadmap.md with Sprint 30 completion
- [ ] Deploy to production

---

## Previously Completed

### Sprint 29 — Production Security (COMPLETE)

**Result: Token revocation, JWT invalidation on password reset, per-user upload rate limiting. 936 total tests.**

### Sprint 28 — Granular Email Notifications (COMPLETE)

**Result: Per-production notification preferences, 1-minute email batching, OPTION_ADDED notifications. 923 total tests.**

### Sprint 27 — Fix Email Verification (COMPLETE)

**Result: Backend awaits sendEmail, returns emailSent boolean. Frontend shows warnings. 890 total tests.**
