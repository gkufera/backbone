# Slug Max Roadmap

Current priorities and upcoming work. Completed sprint history (Sprints 0–8) is archived in `roadmap-archive.md`.

**Test counts:** 432 frontend + 411 backend = 843 total

---

## Sprint 8.5: Element/Approval Polish ✅

Items identified during QA but requiring schema migrations or cross-cutting backend changes.

- [x] Multi-asset options (slideshow of multiple files per option) — `OptionAsset` schema migration, backend CRUD, frontend multi-file upload
- [x] Slideshow left/right arrow navigation in lightbox — prev/next buttons, keyboard arrows, asset counter
- [x] Discussion box auto-display of user name and department when composing notes — backend department enrichment, frontend display

---

## Sprint 9: Navigation, Layout & Quick Fixes (~600 LOC)

**Goal:** Users can navigate the site without the browser back button. Fix layout issues and broken tooltip.

### Tasks

- [x] Persistent header component with logo linking home
  - Add `<AppHeader>` component: Slug Max logo (pixelated, links to `/`), production name as breadcrumb when inside a production, notification bell
  - Add to root layout (`frontend/src/app/layout.tsx`) so it appears on every page
  - 1-bit design: black bottom border, white bg, VT323 text
  - On home page, hide the duplicate logo/header already in `page.tsx`
  - Files: `frontend/src/components/app-header.tsx` (new), `frontend/src/app/layout.tsx`, `frontend/src/app/page.tsx`

- [x] Footer with copyright
  - Add `<AppFooter>` component: "© 2026 Slug Max Inc." centered, 1-bit style
  - Add to root layout below `{children}`
  - Files: `frontend/src/components/app-footer.tsx` (new), `frontend/src/app/layout.tsx`

- [x] Move scripts section to top of production page
  - Reorder sections: Scripts → Review Feed → Team Members → Departments
  - File: `frontend/src/app/productions/[id]/page.tsx`

- [x] Fix permission tooltip visibility
  - Bug: "i" button inside `.mac-window-title` (black bg) uses `border-black text-black` → invisible
  - Fix: add `inverted` prop for white border/text when on dark backgrounds
  - File: `frontend/src/components/permissions-tooltip.tsx`

- [x] Move permission tooltip next to each member's role dropdown
  - Moved from section header to inline next to each member's role dropdown
  - Include role name in tooltip text: "DECIDER — Your approvals are official and final."
  - Files: `frontend/src/app/productions/[id]/page.tsx`, `frontend/src/components/permissions-tooltip.tsx`

- [x] ADMIN/DECIDER can rename the production
  - Backend: add `PATCH /api/productions/:id` endpoint — accepts `{ title }`, requires ADMIN or DECIDER role
  - Frontend: click-to-edit title, save on Enter/blur, cancel on Escape
  - API client: add `productionsApi.update(id, { title })` method
  - Files: `backend/src/routes/productions.ts`, `frontend/src/lib/api.ts`, `frontend/src/app/productions/[id]/page.tsx`

- [x] Filter elements in list view via text input
  - Add text input above element list: placeholder "Filter elements..."
  - Filter displayed elements by name (case-insensitive substring match)
  - Works alongside existing department filter chips
  - Files: `frontend/src/components/element-list.tsx`

- [x] Drag-and-drop zone on option upload form
  - Wrap file input in a styled drop zone with drag-and-drop support
  - Visual feedback: dashed border idle, inverted (`bg-black text-white`) on drag-over
  - Clicking the zone still opens the native file picker, displays file name when selected
  - File: `frontend/src/components/option-upload-form.tsx`

- [x] Prominent review feed section on production page
  - Fetch pending-review count from feed endpoint
  - Upgraded bare "Review Feed" button to a `.mac-window` section showing pending count
  - Shows "N elements pending review" or "No elements pending review"
  - File: `frontend/src/app/productions/[id]/page.tsx`

### Tests
- AppHeader renders logo linking home, breadcrumb when inside production
- AppFooter renders copyright text
- Permission tooltip visible on inverted background
- Permission tooltip appears next to role dropdown with role name
- Production rename: PATCH endpoint returns updated title; MEMBER gets 403
- Element text filter narrows list by typed text
- Drag-and-drop zone accepts dropped files and updates form state
- Review feed section shows pending count and links to feed

---

## Sprint 10: Auth Completeness (~600 LOC)

**Goal:** Users must verify their email. Forgot-password works. Account settings page exists.

### Tasks

- [x] Forgot password flow
  - Schema: add `PasswordResetToken` model — `{ id, userId, token (unique), expiresAt, usedAt }`
  - Backend: `POST /api/auth/forgot-password` — accepts `{ email }`, generates token, sends reset email via existing Nodemailer
  - Backend: `POST /api/auth/reset-password` — accepts `{ token, newPassword }`, validates token not expired/used, updates passwordHash
  - Frontend: `/forgot-password` page with email input
  - Frontend: `/reset-password?token=xxx` page with new password input
  - Add "Forgot password?" link on login page
  - Files: `prisma/schema.prisma`, `backend/src/routes/auth.ts`, `frontend/src/app/forgot-password/page.tsx` (new), `frontend/src/app/reset-password/page.tsx` (new), `frontend/src/app/login/page.tsx`

- [x] Force email verification
  - Schema: add `emailVerified: Boolean @default(false)` and `EmailVerificationToken` model to User
  - Backend: on signup, generate verification token and send verification email
  - Backend: `POST /api/auth/verify-email` — accepts `{ token }`, sets `emailVerified: true`
  - Backend: on login, if `!emailVerified`, return 403 with message "Please verify your email"
  - Frontend: after signup, show "Check your email for verification link" page
  - Frontend: `/verify-email?token=xxx` page that calls the verify endpoint
  - Frontend: on 403 during login, show verification message with "Resend verification email" link
  - Backend: `POST /api/auth/resend-verification` — generates new token and resends
  - Files: `prisma/schema.prisma`, `backend/src/routes/auth.ts`, `frontend/src/app/verify-email/page.tsx` (new), `frontend/src/app/signup/page.tsx`, `frontend/src/app/login/page.tsx`

- [x] Account settings page (`/settings`)
  - Display: name, email (read-only), email verification status
  - Actions: change name, change password (current + new)
  - Backend: `PATCH /api/auth/me` — accepts `{ name, currentPassword, newPassword }`
  - Frontend: `/settings` page with form
  - Link from persistent header (user nav dropdown)
  - Files: `backend/src/routes/auth.ts`, `frontend/src/app/settings/page.tsx` (new), `frontend/src/components/user-nav.tsx`

### Tests
- Forgot password: generates token, sends email, resets password, rejects expired/used token
- Email verification: signup sends verification email, unverified user blocked from login, verification token works, resend works
- Account settings: change name, change password with correct current password, reject wrong current password

---

## Sprint 11: Director's Notes & Notifications (~600 LOC)

**Goal:** Deciders can annotate the script PDF with per-scene notes. Missing notification triggers are added.

### Tasks

- [x] DECIDER "Director's Notes" on PDF view
  - Schema: `DirectorNote` model with `sceneNumber` (Int), soft-delete via `deletedAt`
  - Backend: CRUD endpoints in `backend/src/routes/director-notes.ts` — GET list, POST create (DECIDER only), PATCH update (author only), DELETE soft-delete (author only)
  - Frontend: Director's Notes panel with Elements/Notes toggle on script page right panel
  - Notes grouped by scene number, DECIDER sees Add/Edit/Delete controls, MEMBER sees read-only

- [x] Element status dashboard
  - Backend: `GET /api/productions/:id/element-stats` — returns `{ pending, outstanding, approved, total }`
  - Frontend: dashboard card on production page with workflow state badges and progress bar

- [x] Notify on team member invite (deferred from Sprint 7)
  - Triggers `MEMBER_INVITED` notification after `productionMember.create()` in productions.ts

- [x] Notify on new script draft upload (deferred from Sprint 7)
  - Triggers `SCRIPT_UPLOADED` notification via `notifyProductionMembers` after `script.create()` in scripts.ts

- [x] User preference to enable/disable email notifications (deferred from Sprint 7)
  - Schema: `emailNotificationsEnabled Boolean @default(true)` on User
  - Backend: notification service checks preference before sending email; PATCH /me accepts field
  - Frontend: checkbox toggle on account settings page

### Tests
- Director notes CRUD: create, read, update, delete; non-DECIDER gets 403 on create
- Element stats endpoint returns correct counts
- Team member invite triggers notification
- Script upload triggers notification to all members
- Email notification respects user preference toggle

---

## Sprint 12: Error Handling & Mobile (~600 LOC)

**Goal:** Robust error handling, loading states, and responsive mobile layout.

### Tasks

- [x] Error boundaries (error.tsx)
  - Add `error.tsx` to key route segments: `/productions`, `/productions/[id]`, `/productions/[id]/scripts/[scriptId]`
  - 1-bit design: `.mac-alert-error` pattern background, "Something went wrong" message, retry button
  - Files: `frontend/src/app/productions/error.tsx` (new), `frontend/src/app/productions/[id]/error.tsx` (new), etc.

- [x] Toast notification system
  - Create `<ToastProvider>` + `useToast()` hook for success/error messages
  - Toasts: 1-bit style (black border, white bg, auto-dismiss after 5s)
  - Wire into: form submissions, API errors, settings + production pages
  - Files: `frontend/src/components/toast-container.tsx` (new), `frontend/src/lib/toast-context.tsx` (new), `frontend/src/app/layout.tsx`

- [x] Loading states
  - Create `<Skeleton>` component: CSS animation using 1-bit dither pattern
  - Replace "Loading..." text with skeleton loaders on: productions list, production detail, feed
  - Files: `frontend/src/components/skeleton.tsx` (new), various pages

- [x] Mobile-responsive audit
  - Hamburger menu for persistent header on small screens
  - Desktop nav hidden on mobile, hamburger toggles dropdown with UserNav + NotificationBell
  - Files: `frontend/src/components/app-header.tsx`

- [x] File upload error handling
  - Client-side: file size limit (200MB), type validation before upload and on drop
  - Error messages for oversized and unsupported files
  - Files: `frontend/src/components/option-upload-form.tsx`

- [x] Network error retry logic
  - `fetchWithRetry()` wrapper with automatic retry (1 retry on TypeError/network error, 500ms delay)
  - Files: `frontend/src/lib/api.ts`

### Tests
- Error boundary renders on thrown error with retry button
- Toast displays and auto-dismisses
- Skeleton component renders
- File size validation rejects oversized files
- Network retry attempts second request on failure

---

## Sprint 13: Infrastructure & Security (~600 LOC)

**Goal:** Harden the app for production use.

### Tasks

- [x] Security headers (helmet)
  - Installed `helmet` package, applied as first middleware in Express app
  - Sets X-Content-Type-Options, X-Frame-Options, and other standard security headers

- [x] Rate limiting middleware
  - Installed `express-rate-limit`
  - Applied: 100 req/min general, 10 req/min on auth endpoints
  - Disabled in test environment to avoid test interference

- [x] Phone verification
  - Schema: added `phone` (nullable) and `phoneVerified` fields to User, `PhoneVerificationCode` model
  - Shared types/constants: E.164 PHONE_REGEX, 6-digit code, 10-minute expiry
  - Backend: SMS service (mirrors email service pattern with SMS_ENABLED gating)
  - Backend: `POST /api/auth/send-phone-code`, `POST /api/auth/verify-phone` endpoints
  - Backend: login, GET /me, PATCH /me now include phone/phoneVerified
  - Frontend: Phone Verification section on settings page (send code → enter code → verified badge)

- [x] Seed data script for demo/testing
  - Created `prisma/seed-data.ts` with exportable demo constants
  - Created `prisma/seed.ts` as main seed script
  - 3 users (Director/DECIDER, Producer/ADMIN, Crew/MEMBER), 1 production, 5 elements, 3 options, 1 approval
  - Wired via `"prisma": { "seed": "tsx ../prisma/seed.ts" }` in package.json

- [ ] AWS SES email integration (deferred — infrastructure only, no code changes needed)
  - Verify `slugmax.com` domain in AWS SES
  - Add DKIM/SPF/DMARC DNS records to Cloudflare for deliverability
  - Set Railway env vars: `EMAIL_ENABLED=true`, `SMTP_HOST`, `SMTP_PORT=587`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM=noreply@slugmax.com`

- [ ] S3 bucket policy and CloudFront CDN for media (deferred — infrastructure only)
  - Configure S3 bucket policy for public read on media objects
  - Set up CloudFront distribution pointing to S3 bucket
  - Update option URLs to use CloudFront domain

- [ ] Performance audit (deferred)
  - Run Lighthouse on key pages (home, production, script viewer)
  - Measure API response times for critical endpoints
  - Optimize any endpoints > 500ms

- [ ] Final QA pass (deferred — after all code tasks done)
  - Run all Tier 1 and Tier 2 tests
  - Playwright E2E on desktop + mobile viewports

### Tests
- Security headers: X-Content-Type-Options, X-Frame-Options verified (+2)
- Rate limiting: general 100/min, auth 10/min, 429 on exceed (+3)
- Phone verification: send code, verify code, reject bad/expired code (+7 backend, +4 frontend)
- SMS service: logs when disabled (+2)
- Seed data: users have required fields, elements have valid types (+2)

---

## Sprint 14: E2E CI/CD & Infrastructure

**Goal:** Automated end-to-end testing pipeline and deferred infrastructure tasks.

### Tasks

- [x] E2E test infrastructure (GitHub Actions CI/CD)
  - Tier 1 workflow: parallel frontend + backend Vitest on push/PR to main
  - E2E workflow: PostgreSQL service, backend/frontend build+start, Playwright Chromium
  - Artifact upload for HTML report and traces on failure
  - Concurrency groups to cancel redundant runs

- [ ] AWS SES email integration (carried from Sprint 13)
  - Verify `slugmax.com` domain in AWS SES
  - Add DKIM/SPF/DMARC DNS records to Cloudflare
  - Set Railway env vars for SMTP

- [ ] S3/CloudFront CDN for media (carried from Sprint 13)
  - Configure S3 bucket policy for public read on media objects
  - Set up CloudFront distribution pointing to S3 bucket
  - Update option URLs to use CloudFront domain

- [ ] Performance audit (carried from Sprint 13)
  - Run Lighthouse on key pages (home, production, script viewer)
  - Measure API response times for critical endpoints
  - Optimize any endpoints > 500ms

- [ ] Final QA pass (carried from Sprint 13)
  - Run all Tier 1 and Tier 2 tests
  - Playwright E2E on desktop + mobile viewports

---

## Sprint 15: Critical Security Hardening ✅

**Goal:** Fix all CRITICAL and HIGH-priority security vulnerabilities identified by security audit.

### Tasks

- [x] S1: Crash on missing `JWT_SECRET` in non-test environments (was using insecure dev fallback)
- [x] S2: Crash on missing `CORS_ORIGINS` in non-test environments (was allowing all origins via `*`)
- [x] S3: Add 1MB JSON body size limit to prevent payload DoS attacks
- [x] S4: Add production membership authorization to options download URL endpoint
- [x] S5: Validate `ElementType` and `ElementStatus` against shared enums on create/update
- [x] S8: Prevent login timing attack with constant-time bcrypt comparison using dummy hash
- [x] S9: Add `Content-Disposition: attachment` header to S3 download URLs
- [x] S10: Mask SMS verification codes in log output (no sensitive data in logs)
- [x] S11: Validate PDF magic bytes (`%PDF-`) before parsing uploaded files
- [x] S12: Configure `trust proxy` for correct IP detection behind load balancer
- [x] S13: Log `error.message` instead of full error object in notification service

### Tests
- 17 new security tests covering all fixes above
- S3 Content-Disposition, trust proxy, body size limit, download URL auth, enum validation, timing attack, PDF magic bytes

---

## Sprint 16: Security Defense-in-Depth ✅

**Goal:** Add pagination, resource limits, JWT security claims, and expanded security header tests.

### Tasks

- [x] S6: Add pagination (`limit`/`offset` with max 100) to all 12 list endpoints: notifications, feed, element notes, option notes, approvals, director notes, departments, elements, options, productions, members, scripts
- [x] S7: Add resource creation limits (max 20 assets per option, max 1000 elements per script)
- [x] S15/S16: Add explicit HS256 algorithm, issuer (`slugmax`), audience (`slugmax-api`) to JWT sign/verify
- [x] S18: Expand security headers tests (X-Powered-By removal, HSTS, X-Download-Options, X-DNS-Prefetch-Control)

### Tests
- Pagination: default 50, max 100, offset support
- Resource limits: 20 assets, 1000 elements
- JWT claims: iss, aud, HS256, wrong audience rejected, wrong issuer rejected
- Security headers: 6 tests (up from 2)

---

## Sprint 17: Immutability & Soft-Delete ✅

**Goal:** Fix all hard-delete violations. Add deletedAt fields. Replace prisma.delete() with soft-delete.

### Tasks

- [x] Schema migration — add `deletedAt DateTime?` to Element, ProductionMember, Department
- [x] Replace element hard-delete with soft-delete (elements.ts)
- [x] Replace productionMember hard-delete with soft-delete (productions.ts)
- [x] Replace department hard-delete with soft-delete (departments.ts)
- [x] Update all queries on these models to filter `deletedAt: null`
- [x] Update notification-service queries to filter deletedAt: null
- [x] Update existing tests to match soft-delete behavior

### Tests
- 6 new soft-delete tests: schema validation, element/member/department soft-delete verification
- 4 existing tests updated: scripts, departments, notification-service, approvals

---

## Sprint 18: Design System Compliance ✅

**Goal:** Replace all color violations with 1-bit patterns. Fix font system violations.

### Tasks

- [x] Fix lightbox backdrop `bg-opacity-90` → solid `bg-white`
- [x] Fix font-bold/font-medium on VT323 elements (user-nav, notification-bell, login/signup/auth links, approval badge, option thumbnail, script title, reconcile link)
- [x] Add missing `font-mono` to body text spans with font-bold (discussion-box, option-notes user names)
- [x] Replace notification unread `font-bold` with `border-l-4` indicator pattern
- [x] Change script title from `font-medium` to `font-mono` (body text, not UI chrome)
- [x] Automated design-system compliance tests (no prohibited colors, no bg-opacity, no rounded, no shadow, no dark mode)

### Notes
- No color violations were found (approval buttons, option borders, temperature indicators already use correct 1-bit patterns from globals.css badge classes)
- 15 font-weight violations fixed across 13 files
- 1 opacity violation fixed

### Tests
- 5 new automated tests: no bg-opacity, no prohibited colors, no rounded, no shadows, no dark mode

---

## Sprint 19: Single Source of Truth ✅

**Goal:** Replace hardcoded status strings with shared enum values. Complete routes barrel export.

### Tasks

- [x] Replace 40+ hardcoded status strings in 8 backend files with shared enum imports
- [x] Complete routes barrel export (6/12 → 12/12): added options, approvals, departments, notifications, director-notes, revision-matches
- [x] Add shared enum imports to files without them (revision-matches.ts, element-matcher.ts, script-processor.ts)

### Notes
- SALT_ROUNDS, JWT_EXPIRES_IN, rate limit values deferred — these are single-use internal constants, not shared between frontend/backend
- Test values not migrated — tests use string literals for mock data, which is acceptable since they verify API contract strings

---

## Sprint 20: Backend Route Refactoring (~600 LOC, net neutral)

**Goal:** Split oversized route files into router + service layers.

### Tasks

- [ ] Extract script service from scripts.ts (628 → ~250 lines)
- [ ] Extract production member + stats services from productions.ts (599 → ~250 lines)
- [ ] Extract auth service from auth.ts (509 → ~200 lines)

### Tests
- All existing tests continue passing (pure refactor, no behavior changes)
- Each route file under 400 lines after extraction

---

## Post-MVP (v2+) — Backlog

These features are explicitly deferred. Do not work on them during MVP sprints.

### Tech Debt
- [x] Remove `.js` extensions from backend TypeScript imports (47 files, ~142 import statements cleaned up; build prerequisites test added to prevent regression)

### High (v2)
- [ ] Tinder-like swipe interface for mobile approval
- [ ] Storyboard panel support (visual options with sequential ordering)
- [ ] VR/3D model link support for set design options
- [ ] Advanced analytics (% elements done, time-to-decision)
- [ ] Due dates on elements with overdue highlighting
- [ ] Multiple decision-makers (require two directors to agree)
- [ ] Google OAuth provider

### Medium (v2-v3)
- [ ] Google Drive / Dropbox integration for file import
- [ ] Frame.io integration for video review
- [ ] Scriptation integration for annotated script import/export
- [ ] FDX (Final Draft) script format support
- [ ] Fountain script format support
- [ ] Offline support (mobile apps cache scripts/options for review)
- [ ] AI-assisted option suggestions (image search, similar options)
- [ ] Slack webhook integration for push alerts

### Low (v3+)
- [ ] Native iOS/Android apps with offline sync
- [ ] ShotGrid integration for VFX pipeline studios
- [ ] Casting website integration (CSV import)
- [ ] Per-project subscription billing (Stripe)
- [ ] Enterprise SSO (SAML)
- [ ] Cascading approvals (Lead Designer → Director multi-tier)
- [ ] Call-sheet auto-updates on element approval changes
