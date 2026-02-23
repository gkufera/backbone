# Backbone MVP Roadmap

All bugs, features, and planned work are tracked here. Check this file before starting work to understand current priorities.

## Sprint Overview

| Sprint | Focus | Status |
|--------|-------|--------|
| 0 | Project Scaffolding | Not Started |
| 1 | Auth & User Management | Not Started |
| 2 | Projects & Script Upload | Not Started |
| 3 | Elements & Options | Not Started |
| 4 | Director's Dashboard & Approval | Not Started |
| 5 | Script Revisions & Versioning | Not Started |
| 6 | Permissions & Departments | Not Started |
| 7 | Notifications & Workflow Logic | Not Started |
| 8 | Polish, Mobile & Deploy | Not Started |

---

## Sprint 0: Project Scaffolding

**Goal:** Set up the monorepo, tooling, and infrastructure so all subsequent sprints can focus purely on features.

### Tasks
- [ ] Initialize monorepo with `frontend/`, `backend/`, `shared/`, `prisma/` directories
- [ ] Set up Next.js app in `frontend/` with TypeScript
- [ ] Set up Express server in `backend/` with TypeScript and ts-node-dev
- [ ] Set up Prisma with initial schema (User model only)
- [ ] Docker Compose for local PostgreSQL
- [ ] Configure ESLint + Prettier for both frontend and backend
- [ ] Set up husky + lint-staged for pre-commit hooks
- [ ] Create `run.sh`, `frontend.sh`, `backend.sh` convenience scripts
- [ ] Create `.env.example` files for both services
- [ ] Set up Vitest for frontend, Jest or Vitest for backend
- [ ] Set up Playwright for E2E tests (empty initial spec)
- [ ] Write a health check endpoint (`GET /health`) and a test for it
- [ ] Set up shared types directory with initial barrel exports
- [ ] Create README.md with setup instructions

### Commit Points
1. After monorepo scaffold + Next.js + Express running
2. After Prisma + Docker Compose + database connection
3. After linting, formatting, and test frameworks configured

### Tests Required
- Tier 1: Health check endpoint test, basic frontend render test
- Tier 2: Playwright test that loads the home page

---

## Sprint 1: Auth & User Management

**Goal:** Users can sign up, log in, and have roles assigned. Session management works.

### Features (from Executive Summary)
- (1) User Authentication/Accounts
- (2) User signup & login (OAuth or email/password)

### Tasks
- [ ] Install and configure NextAuth.js with credentials provider (email/password)
- [ ] Add Google OAuth provider (optional, can be added later)
- [ ] Create Prisma User model: `{id, name, email, passwordHash, role, department_id, created_at}`
- [ ] Build signup page (`/signup`) with name, email, password
- [ ] Build login page (`/login`) with email, password
- [ ] Implement session management with NextAuth JWT strategy
- [ ] Create role enum: `DIRECTOR`, `DEPARTMENT_HEAD`, `CONTRIBUTOR`, `ASSISTANT`
- [ ] Build basic account settings page (`/settings`)
- [ ] Protect API routes with auth middleware
- [ ] Protect frontend pages with NextAuth session checks

### Commit Points
1. After NextAuth.js configured with credentials provider
2. After signup/login pages functional
3. After role system and route protection

### Tests Required
- Tier 1: Auth middleware unit tests, role validation tests
- Tier 2: E2E signup → login → protected page flow

---

## Sprint 2: Projects & Script Upload

**Goal:** Users can create productions, invite team members, and upload a PDF script that gets parsed for elements.

### Features (from Executive Summary)
- (3) Projects/Productions: create a new production and invite team members by email
- (5) Single script format: PDF
- (6) Upload initial script: extract all-CAPS words as initial Elements list

### Tasks
- [ ] Create Prisma models: `Production`, `ProductionMember`, `Script`, `Department`
- [ ] Build production creation page (`/productions/new`) with title
- [ ] Build production dashboard (`/productions/[id]`) showing scripts and team
- [ ] Implement team member invite by email (creates account or sends invite link)
- [ ] Build script upload UI with drag-and-drop PDF upload
- [ ] Implement S3 upload pipeline for PDF files (presigned URLs)
- [ ] Implement PDF text extraction (using `pdf-parse` or `pdfjs-dist`)
- [ ] Build ALL-CAPS element detection algorithm (identify props, locations, characters)
- [ ] Auto-create Element records from detected ALL-CAPS words with page numbers
- [ ] Build script viewer page (`/productions/[id]/scripts/[scriptId]`) showing PDF + detected elements
- [ ] Allow user to manually add/remove/edit detected elements
- [ ] Build element list view showing all elements for a script

### Commit Points
1. After Production CRUD and team invites working
2. After PDF upload to S3 working
3. After PDF parsing and element auto-detection working
4. After script viewer and element management UI

### Tests Required
- Tier 1: PDF text extraction tests (sample PDFs), element detection regex tests, S3 upload mock tests
- Tier 2: E2E create production → upload script → see elements flow

---

## Sprint 3: Elements & Options

**Goal:** Department users can upload multimedia options for each element and mark them ready for director review.

### Features (from Executive Summary)
- (8) Element & Option Management
- (9) Create Elements: automatically or manually tag elements in script pages
- (10) Add Options: department users upload images/videos/audio for each element, with descriptions
- (11) Mark Ready for Review: options stay hidden from director until department signals completion

### Tasks
- [ ] Create Prisma `Option` model: `{id, element_id, media_type, url, thumbnail_url, description, status, uploaded_by, ready_for_review, created_at}`
- [ ] Build element detail page (`/productions/[id]/elements/[elementId]`)
- [ ] Build option upload UI supporting multiple media types:
  - Images (jpg, png, webp)
  - Videos (mp4, mov)
  - Audio clips (mp3, wav)
  - PDFs (reference documents)
  - External links (URLs)
- [ ] Implement S3 upload for media files with presigned URLs
- [ ] Generate thumbnails for images and video (server-side or client-side)
- [ ] Build option card component showing thumbnail, description, media type badge
- [ ] Implement option gallery view (grid of all options for an element)
- [ ] Add "Mark Ready for Review" button per option or per element
- [ ] Options default to `draft` status, hidden from director until marked ready
- [ ] Build department view showing their elements and option status

### Commit Points
1. After Option model and basic CRUD API
2. After media upload pipeline (S3 + thumbnails)
3. After option gallery UI and "Ready for Review" flow

### Tests Required
- Tier 1: Option CRUD tests, media type validation, S3 upload mocks
- Tier 2: E2E upload image option → see in gallery → mark ready for review

---

## Sprint 4: Director's Dashboard & Approval

**Goal:** Director sees a feed of elements needing review, can view options, and approve/reject/maybe each one.

### Features (from Executive Summary)
- (12) Director's Dashboard/Feed
- (13) News Feed: stream of elements needing review, showing thumbnails of their options
- (14) Decision UI: for each option, director can Approve (green), Reject (red), or Maybe (yellow) with optional note
- (15) Split View: click an element to see script context + all its options (desktop and mobile-friendly)

### Tasks
- [ ] Create Prisma `Approval` model: `{id, option_id, user_id, decision, note, created_at}`
- [ ] Build director's news feed page (`/productions/[id]/feed`)
- [ ] Feed shows elements with `ready_for_review` options, sorted by most recent
- [ ] Each feed card shows: element label, page number, option thumbnails, department
- [ ] Build approval UI with three buttons: Approve (green), Reject (red), Maybe (yellow)
- [ ] Add optional note/comment field for each decision
- [ ] Build split view: left panel shows script page context, right panel shows all options for selected element
- [ ] Make split view responsive (stacked on mobile)
- [ ] Update element status based on approvals:
  - Any option approved → element status = `approved`
  - All options rejected → element status = `outstanding` (dept needs new options)
  - Maybe → element stays `outstanding`, option marked for reconsideration
- [ ] Build approval history view (who approved what, when)
- [ ] Lock approved elements (prevent further option uploads unless unlocked)

### Commit Points
1. After news feed page showing elements needing review
2. After approval UI (approve/reject/maybe) functional
3. After split view and element status updates
4. After approval history and element locking

### Tests Required
- Tier 1: Approval logic tests (status transitions), feed query tests
- Tier 2: E2E full workflow: upload option → mark ready → director approves → element resolved

---

## Sprint 5: Script Revisions & Versioning

**Goal:** Upload new script drafts. Existing element-option links are preserved via text matching with a reconciliation UI for mismatches.

### Features (from Executive Summary)
- (4) Script Upload & Versioning
- (7) Revisions: upload new PDF; match elements from old version by text matching. Reconciliation UI for mismatches.

### Tasks
- [ ] Add version number field to Script model
- [ ] Build "Upload New Draft" UI on script page
- [ ] On new draft upload:
  1. Extract elements from new PDF
  2. Run text-matching algorithm against existing elements
  3. Exact matches: carry over element + all options + approvals
  4. Fuzzy matches: flag for user reconciliation
  5. New elements: create as Pending
  6. Missing elements: flag for user decision (keep or archive)
- [ ] Build reconciliation UI showing side-by-side old/new elements
  - For each fuzzy match: "Map to existing" or "Create new"
  - For missing elements: "Keep (still relevant)" or "Archive"
- [ ] Build version history page showing all script drafts with upload dates
- [ ] Allow switching between script versions to see element state at each version
- [ ] Ensure all option/approval data is preserved through version transitions

### Commit Points
1. After new draft upload with element extraction
2. After text matching algorithm (exact + fuzzy)
3. After reconciliation UI
4. After version history view

### Tests Required
- Tier 1: Text matching algorithm tests (exact match, fuzzy match, new elements, missing elements)
- Tier 2: E2E upload draft v1 → add options → upload draft v2 → verify options carried over

---

## Sprint 6: Permissions & Departments

**Goal:** Department-based access control. Users see only their department's elements/options. Role-based action permissions.

### Features (from Executive Summary)
- (19) Permissions
- (20) By Department: e.g. Costume can only upload and view costume-related elements/options
- (21) Role-based: Director/Producer can approve; Heads can add options; Assistants can triage

### Tasks
- [ ] Create standard departments: Costume, Props, Set Design, Locations, Hair/Makeup, VFX, Sound, Art
- [ ] Allow production creator to define custom departments
- [ ] Assign users to departments on invite/join
- [ ] Implement department-scoped element visibility:
  - Department members see only elements tagged to their department
  - Directors/Producers see all elements across all departments
- [ ] Implement role-based action permissions:
  - Director/Producer: approve, reject, maybe, view all
  - Department Head: upload options, mark ready, manage dept members, view dept elements
  - Contributor: upload options within their dept
  - Assistant: triage elements (tag, categorize), add comments, view dept elements
- [ ] Add element-level department tagging (element belongs to one or more departments)
- [ ] Build permission middleware for API routes
- [ ] Build UI guards (hide buttons/pages users can't access)
- [ ] Build department management page for Heads (view members, remove members)

### Commit Points
1. After department model and user assignment
2. After department-scoped queries working
3. After role-based permissions on API and UI

### Tests Required
- Tier 1: Permission middleware tests (each role × each action), department scoping query tests
- Tier 2: E2E contributor can upload but not approve, director can approve, cross-dept visibility blocked

---

## Sprint 7: Notifications & Workflow Logic

**Goal:** Users get notified of relevant events. Element workflow logic enforces the approval lifecycle.

### Features (from Executive Summary)
- (16) Notifications
- (17) Notify departments when element approved/rejected. In-app alerts and email.
- (18) Optional Slack webhook for push alerts
- (22) Basic Workflow Logic
- (23) Track element status: Pending, Outstanding, Approved. Outstanding until one option is approved.
- (24) Once approved, lock the element (further changes optional).

### Tasks
- [ ] Create Prisma `Notification` model: `{id, user_id, type, title, message, link, read, created_at}`
- [ ] Implement notification creation on key events:
  - Option marked ready for review → notify Director
  - Option approved → notify department
  - Option rejected → notify department
  - Option marked maybe → notify department
  - New team member invited → notify invitee
  - New script draft uploaded → notify all production members
- [ ] Build notification bell icon in header with unread count badge
- [ ] Build notifications dropdown/page showing recent notifications
- [ ] Mark notifications as read on click
- [ ] Implement email notifications using a transactional email service (e.g. Resend, SendGrid, or Nodemailer with SMTP)
  - Email on: option approved/rejected, invited to production
  - User preference to enable/disable email notifications
- [ ] Implement optional Slack webhook integration:
  - Production-level Slack webhook URL setting
  - Post to Slack on: new options ready for review, approval decisions
- [ ] Implement element workflow state machine:
  - Pending → Outstanding (when first option uploaded)
  - Outstanding → Approved (when director approves an option)
  - Approved → Locked (no new options unless director unlocks)
  - On rejection: element stays Outstanding, department notified to upload new options
- [ ] Build element status dashboard showing counts per status (Pending/Outstanding/Approved)

### Commit Points
1. After notification model and creation logic
2. After notification UI (bell, dropdown, mark read)
3. After email notifications
4. After Slack webhook integration
5. After workflow state machine enforced

### Tests Required
- Tier 1: Notification creation tests, workflow state machine tests (valid/invalid transitions), email sending mocks
- Tier 2: E2E full workflow: option ready → director notified → approves → department notified → element locked

---

## Sprint 8: Polish, Mobile & Deploy

**Goal:** Responsive mobile design, error handling, production deployment, and QA pass.

### Tasks
- [ ] Mobile-responsive audit of all pages:
  - Director feed: card-based layout on mobile
  - Split view: stacked panels on mobile
  - Option gallery: responsive grid
  - Navigation: hamburger menu on mobile
- [ ] Error handling audit:
  - API error responses with proper HTTP codes and messages
  - Frontend error boundaries and toast notifications
  - File upload error handling (size limits, type validation)
  - Network error retry logic
- [ ] Loading states for all async operations (skeletons, spinners)
- [ ] Set up Railway deployment:
  - Frontend service (Next.js)
  - Backend service (Express)
  - PostgreSQL database service
  - Environment variables configured
- [ ] Set up production branch and deploy pipeline
- [ ] Configure CORS, rate limiting, and security headers
- [ ] S3 bucket policy and CloudFront distribution for media
- [ ] Seed data script for demo/testing
- [ ] Final QA pass: run all Tier 1 + Tier 2 tests
- [ ] Performance audit (Lighthouse, API response times)
- [ ] Write deployment documentation in README

### Commit Points
1. After mobile responsive pass
2. After error handling audit
3. After Railway deployment configured
4. After QA pass and final fixes

### Tests Required
- Tier 1: All existing tests pass
- Tier 2: Full Playwright suite passes on desktop + mobile viewports

---

## Post-MVP (v2+) — Backlog

These features are explicitly deferred. Do not work on them during MVP sprints.

### Priority: High (v2)
- [ ] Tinder-like swipe interface for mobile approval
- [ ] Storyboard panel support (visual options with sequential ordering)
- [ ] VR/3D model link support for set design options
- [ ] Advanced analytics (% elements done, time-to-decision)
- [ ] Due dates on elements with overdue highlighting
- [ ] Multiple decision-makers (require two directors to agree)

### Priority: Medium (v2-v3)
- [ ] Google Drive / Dropbox integration for file import
- [ ] Frame.io integration for video review
- [ ] Scriptation integration for annotated script import/export
- [ ] FDX (Final Draft) script format support
- [ ] Fountain script format support
- [ ] Offline support (mobile apps cache scripts/options for review)
- [ ] AI-assisted option suggestions (image search, similar options)

### Priority: Low (v3+)
- [ ] Native iOS/Android apps with offline sync
- [ ] ShotGrid integration for VFX pipeline studios
- [ ] Casting website integration (CSV import)
- [ ] Per-project subscription billing (Stripe)
- [ ] Enterprise SSO (SAML)
- [ ] Cascading approvals (Lead Designer → Director multi-tier)
- [ ] Call-sheet auto-updates on element approval changes
