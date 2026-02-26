# Current Plan

## Sprint 28 — Granular Email Notifications

**Goal:** Per-production notification preferences, email batching (1-minute digest), OPTION_ADDED notification type.

---

### Step 1: Schema — NotificationPreference + OPTION_ADDED + emailSentAt
- [x] Write failing tests for shared types (OPTION_ADDED, emailSentAt, constants)
- [x] Add OPTION_ADDED to NotificationType enum, emailSentAt to Notification, NotificationPreference interface
- [x] Add constants: NOTIFICATION_TYPE_CATEGORY, CATEGORY_TO_PREF_FIELD
- [x] Add Prisma schema: ScopeFilter enum, NotificationPreference model, emailSentAt on Notification
- [x] Create migration + generate Prisma client
- [x] Run Tier 1 tests (460 frontend + 434 backend = 894 pass)
- [x] COMMIT (0933b45)

### Step 2: Refactor createNotification — remove immediate email
- [x] Update notification-service.test.ts to expect no email sending
- [x] Remove sendNotificationEmail import and email-sending block
- [x] Run Tier 1 tests (460 frontend + 433 backend)
- [x] COMMIT (9c55462)

### Step 3: Digest email template
- [x] Write failing tests for sendDigestEmail (subject, bullet points, HTML)
- [x] Implement sendDigestEmail in email-service.ts
- [x] Run Tier 1 tests (460 frontend + 436 backend = 896 pass)
- [x] COMMIT (870cf36)

### Step 4: Email batch processor
- [x] Write 9 failing tests for processEmailBatch, start/stop
- [x] Implement email-batch-processor.ts with preference filtering
- [x] Start batch processor in index.ts
- [x] Run Tier 1 tests (460 frontend + 445 backend)
- [x] COMMIT (801d2fb)

### Step 5: OPTION_ADDED notification trigger
- [x] Write failing test: option create triggers notifyDeciders with OPTION_ADDED
- [x] Add notifyDeciders call in options.ts route after option creation
- [x] Run Tier 1 tests (460 frontend + 446 backend)
- [x] COMMIT (4c0a838)

### Step 6: Notification preferences API
- [x] Write 8 failing tests for GET/PATCH notification-preferences routes
- [x] Implement notification-preferences.ts route with upsert
- [x] Register route in app.ts
- [x] Run Tier 1 tests (460 frontend + 454 backend)
- [x] COMMIT (ba98972)

### Step 7: Frontend notification preferences UI
- [x] Write 4 failing tests for NotificationPreferences component
- [x] Add notificationPreferencesApi to frontend api.ts
- [x] Create notification-preferences.tsx component
- [x] Mount on production dashboard page
- [x] Fix production-dashboard.test.tsx to mock new API
- [x] Run Tier 1 tests (464 frontend + 454 backend = 918 pass)
- [x] COMMIT (90b905f)

### Step 8: Update settings page + roadmap + deploy
- [x] Write failing test for updated settings text
- [x] Update settings page notification description text
- [x] Run Tier 1 tests (465 frontend + 454 backend = 919 pass)
- [ ] Update roadmap.md with completed items and test counts
- [ ] COMMIT
- [ ] Deploy to production

---

## Previously Completed

### Sprint 27 — Fix Email Verification (COMPLETE)

**Result: Backend awaits sendEmail, returns emailSent boolean. Frontend shows warnings. 890 total tests.**
