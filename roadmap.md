# Slug Max Roadmap

Current priorities and upcoming work. Completed sprint history (Sprints 0–8) is archived in `roadmap-archive.md`.

**Test counts:** 220 frontend + 267 backend = 487 total

---

## Sprint 9: Navigation, Layout & Quick Fixes (~600 LOC)

**Goal:** Users can navigate the site without the browser back button. Fix layout issues and broken tooltip.

### Tasks

- [ ] Persistent header component with logo linking home
  - Add `<AppHeader>` component: Slug Max logo (pixelated, links to `/`), production name as breadcrumb when inside a production, notification bell
  - Add to root layout (`frontend/src/app/layout.tsx`) so it appears on every page
  - 1-bit design: black bottom border, white bg, VT323 text
  - On home page, hide the duplicate logo/header already in `page.tsx`
  - Files: `frontend/src/components/app-header.tsx` (new), `frontend/src/app/layout.tsx`, `frontend/src/app/page.tsx`

- [ ] Footer with copyright
  - Add `<AppFooter>` component: "© 2026 Slug Max Corporation" centered, 1-bit style
  - Add to root layout below `{children}`
  - Files: `frontend/src/components/app-footer.tsx` (new), `frontend/src/app/layout.tsx`

- [ ] Move scripts section to top of production page
  - Reorder sections: Scripts → Team Members → Departments (currently: Team → Departments → Feed → Scripts)
  - File: `frontend/src/app/productions/[id]/page.tsx` (move lines 275-307 above line 124)

- [ ] Fix permission tooltip visibility
  - Bug: "i" button inside `.mac-window-title` (black bg) uses `border-black text-black` → invisible
  - Fix: use `border-white text-white hover:bg-white hover:text-black` when inside inverted container
  - File: `frontend/src/components/permissions-tooltip.tsx`

- [ ] Move permission tooltip next to each member's role dropdown
  - Currently: single tooltip in "Team Members" section header (line 129 of production page)
  - Move: render `<PermissionsTooltip role={m.role} />` next to each member's role `<select>` (line 157-167)
  - Include role name in tooltip text: "DECIDER — Your approvals are official and final."
  - Files: `frontend/src/app/productions/[id]/page.tsx`, `frontend/src/components/permissions-tooltip.tsx`

- [ ] ADMIN/DECIDER can rename the production
  - Backend: add `PATCH /api/productions/:id` endpoint — accepts `{ title }`, requires ADMIN or DECIDER role
  - Frontend: make production title editable (click to edit, inline text input, save on blur/enter)
  - API client: add `productionsApi.update(id, { title })` method
  - Files: `backend/src/routes/productions.ts`, `frontend/src/lib/api.ts`, `frontend/src/app/productions/[id]/page.tsx`

- [ ] Filter elements in list view via text input
  - Add text input above element list: placeholder "Filter elements..."
  - Filter displayed elements by name (case-insensitive substring match)
  - Works alongside existing department filter chips
  - Files: `frontend/src/components/element-list.tsx`

### Tests
- AppHeader renders logo linking home, breadcrumb when inside production
- AppFooter renders copyright text
- Permission tooltip visible on inverted background
- Permission tooltip appears next to role dropdown with role name
- Production rename: PATCH endpoint returns updated title; MEMBER gets 403
- Element text filter narrows list by typed text

---

## Sprint 10: Auth Completeness (~600 LOC)

**Goal:** Users must verify their email. Forgot-password works. Account settings page exists.

### Tasks

- [ ] Forgot password flow
  - Schema: add `PasswordResetToken` model — `{ id, userId, token (unique), expiresAt, usedAt }`
  - Backend: `POST /api/auth/forgot-password` — accepts `{ email }`, generates token, sends reset email via existing Nodemailer
  - Backend: `POST /api/auth/reset-password` — accepts `{ token, newPassword }`, validates token not expired/used, updates passwordHash
  - Frontend: `/forgot-password` page with email input
  - Frontend: `/reset-password?token=xxx` page with new password input
  - Add "Forgot password?" link on login page
  - Files: `prisma/schema.prisma`, `backend/src/routes/auth.ts`, `frontend/src/app/forgot-password/page.tsx` (new), `frontend/src/app/reset-password/page.tsx` (new), `frontend/src/app/login/page.tsx`

- [ ] Force email verification
  - Schema: add `emailVerified: Boolean @default(false)` and `EmailVerificationToken` model to User
  - Backend: on signup, generate verification token and send verification email
  - Backend: `POST /api/auth/verify-email` — accepts `{ token }`, sets `emailVerified: true`
  - Backend: on login, if `!emailVerified`, return 403 with message "Please verify your email"
  - Frontend: after signup, show "Check your email for verification link" page
  - Frontend: `/verify-email?token=xxx` page that calls the verify endpoint
  - Frontend: on 403 during login, show verification message with "Resend verification email" link
  - Backend: `POST /api/auth/resend-verification` — generates new token and resends
  - Files: `prisma/schema.prisma`, `backend/src/routes/auth.ts`, `frontend/src/app/verify-email/page.tsx` (new), `frontend/src/app/signup/page.tsx`, `frontend/src/app/login/page.tsx`

- [ ] Account settings page (`/settings`)
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

- [ ] DECIDER "Director's Notes" on PDF view
  - Schema: add `DirectorNote` model — `{ id, scriptId, sceneSlug (text), note (text), createdBy (userId), createdAt, updatedAt }`
  - Backend: `POST /api/scripts/:scriptId/notes` — create note (DECIDER only)
  - Backend: `GET /api/scripts/:scriptId/notes` — list all notes for a script
  - Backend: `PATCH /api/scripts/:scriptId/notes/:noteId` — update note (author only)
  - Backend: `DELETE /api/scripts/:scriptId/notes/:noteId` — soft-delete (author only)
  - Frontend: on the PDF view, show a "D" indicator next to each scene slugline that has a note
  - Frontend: click "D" to expand/collapse the note text; DECIDER sees edit/delete controls
  - Frontend: "Add Note" button next to each scene slugline (DECIDER only)
  - Notes visible to all production members, editable only by the DECIDER who created them
  - Uses existing `sceneData` on Script model to know where scene sluglines are
  - Files: `prisma/schema.prisma`, `backend/src/routes/scripts.ts` or new `backend/src/routes/director-notes.ts`, `frontend/src/lib/api.ts`, `frontend/src/components/pdf-viewer.tsx`, `frontend/src/app/productions/[id]/scripts/[scriptId]/page.tsx`

- [ ] Element status dashboard
  - Backend: `GET /api/productions/:id/element-stats` — returns counts: `{ pending, outstanding, approved, total }`
  - Frontend: dashboard card on production page showing workflow state counts with visual bars
  - Files: `backend/src/routes/productions.ts` or `backend/src/routes/elements.ts`, `frontend/src/app/productions/[id]/page.tsx`

- [ ] Notify on team member invite (deferred from Sprint 7)
  - Trigger notification to invitee when added to a production
  - File: `backend/src/routes/productions.ts` (in addMember handler)

- [ ] Notify on new script draft upload (deferred from Sprint 7)
  - Trigger notification to all production members when a new script version is uploaded
  - File: `backend/src/routes/scripts.ts` (in upload handler)

- [ ] User preference to enable/disable email notifications (deferred from Sprint 7)
  - Schema: add `emailNotificationsEnabled: Boolean @default(true)` to User
  - Backend: check preference before sending email in notification service
  - Frontend: toggle on account settings page
  - Files: `prisma/schema.prisma`, `backend/src/services/notifications.ts`, `frontend/src/app/settings/page.tsx`

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
