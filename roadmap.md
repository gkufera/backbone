# Slug Max Roadmap

Current priorities and upcoming work. Completed sprint history (Sprints 0–8) is archived in `roadmap-archive.md`.

**Test counts:** 365 frontend + 335 backend = 700 total

---

## Sprint 8.5: Element/Approval Polish (Deferred)

Items identified during QA but requiring schema migrations or cross-cutting backend changes.

- [ ] Multi-asset options (slideshow of multiple files per option) — requires `OptionAsset` schema migration
- [ ] Slideshow left/right arrow navigation in lightbox — depends on multi-asset model
- [ ] Discussion box auto-display of user name and department when composing notes

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
  - Add `<AppFooter>` component: "© 2026 Slug Max Corporation" centered, 1-bit style
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

- [ ] Error boundaries (error.tsx)
  - Add `error.tsx` to key route segments: `/productions`, `/productions/[id]`, `/productions/[id]/scripts/[scriptId]`
  - 1-bit design: `.mac-alert-error` pattern background, "Something went wrong" message, retry button
  - Files: `frontend/src/app/productions/error.tsx` (new), `frontend/src/app/productions/[id]/error.tsx` (new), etc.

- [ ] Toast notification system
  - Create `<ToastProvider>` + `useToast()` hook for success/error messages
  - Toasts: 1-bit style (black border, white bg, auto-dismiss after 5s)
  - Wire into: form submissions, API errors, approval actions
  - Files: `frontend/src/components/toast.tsx` (new), `frontend/src/lib/toast-context.tsx` (new), `frontend/src/app/layout.tsx`

- [ ] Loading states
  - Create `<Skeleton>` component: CSS animation using 1-bit dither pattern
  - Replace "Loading..." text with skeleton loaders on: production page, script page, element list, feed
  - Files: `frontend/src/components/skeleton.tsx` (new), various pages

- [ ] Mobile-responsive audit
  - Hamburger menu for persistent header on small screens
  - Director feed: full-width cards on mobile
  - Production page: single-column layout on mobile
  - File upload: responsive drag-drop zone
  - Files: `frontend/src/components/app-header.tsx`, various pages, `frontend/src/app/globals.css`

- [ ] File upload error handling
  - Client-side: file size limits (e.g., 50MB), type validation before upload
  - Toast messages for upload failures
  - Files: option upload components

- [ ] Network error retry logic
  - Wrapper around fetch calls with automatic retry (1 retry on network error)
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

- [ ] AWS SES email integration
  - Verify `slugmax.com` domain in AWS SES
  - Add DKIM/SPF/DMARC DNS records to Cloudflare for deliverability
  - Set Railway env vars: `EMAIL_ENABLED=true`, `SMTP_HOST` (SES SMTP endpoint), `SMTP_PORT=587`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM=noreply@slugmax.com`, `FRONTEND_URL=https://slugmax.com`
  - Test: signup sends real verification email, forgot-password sends real reset email
  - Files: Railway env config, Cloudflare DNS, AWS SES console (no code changes — email-service.ts already supports SMTP)

- [ ] Rate limiting middleware
  - Install `express-rate-limit`
  - Apply: 100 req/min general, 10 req/min on auth endpoints (login, signup, forgot-password)
  - Files: `backend/src/app.ts`, `backend/src/middleware/rate-limit.ts` (new)

- [ ] Security headers (helmet)
  - Install `helmet`
  - Apply as middleware in Express app
  - Files: `backend/src/app.ts`

- [ ] Force phone number verification
  - Schema: add `phone` and `phoneVerified` fields to User
  - Integrate SMS provider (Twilio Verify or similar)
  - Backend: `POST /api/auth/send-phone-code` — sends SMS verification code
  - Backend: `POST /api/auth/verify-phone` — verifies code
  - Frontend: phone verification step after email verification
  - Files: `prisma/schema.prisma`, `backend/src/routes/auth.ts`, `backend/src/services/sms.ts` (new), `frontend/src/app/verify-phone/page.tsx` (new)

- [ ] Seed data script for demo/testing
  - Create `prisma/seed.ts` with sample production, users, script, elements, options, approvals
  - Wire into `prisma db seed` command
  - Files: `prisma/seed.ts` (new), `backend/package.json`

- [ ] S3 bucket policy and CloudFront CDN for media
  - Configure S3 bucket policy for public read on media objects
  - Set up CloudFront distribution pointing to S3 bucket
  - Update option URLs to use CloudFront domain
  - Files: infrastructure config, `backend/src/routes/options.ts`

- [ ] Final QA pass
  - Run all Tier 1 tests: `cd frontend && npm test && cd ../backend && npm test`
  - Run all Tier 2 tests: Playwright E2E on desktop + mobile viewports
  - Fix any failures
  - Files: various test files

- [ ] Performance audit
  - Run Lighthouse on key pages (home, production, script viewer)
  - Measure API response times for critical endpoints
  - Optimize any endpoints > 500ms
  - Files: various

### Tests
- Rate limiting: 11th request in 1 second gets 429
- Phone verification: send code, verify code, reject bad code
- Seed script creates expected records

---

## Post-MVP (v2+) — Backlog

These features are explicitly deferred. Do not work on them during MVP sprints.

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
