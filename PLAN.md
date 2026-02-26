# Current Plan

## Sprint 32+33 — Prune SMS + Discussion Media Attachments (COMPLETE)

**Goal:** Remove unused SMS/phone verification code (Sprint 32), then add media attachments to option discussions (Sprint 33). 1,001 Tier 1 tests passing (502 frontend + 499 backend).

---

### Sprint 32: Prune SMS/Phone Verification
- [x] Schema migration — drop phone columns and PhoneVerificationCode model
- [x] Remove backend SMS code (sms-service.ts, phone routes, auth response fields)
- [x] Remove frontend phone code (settings UI, API methods, shared types/constants)
- [x] Update roadmap — Sprint 30 checkboxes, SMS to backlog v2+

### Sprint 33: Discussion Media Attachments
- [x] Add NoteAttachment shared types and NOTE_MAX_ATTACHMENTS constant
- [x] Add NoteAttachment Prisma model + migration
- [x] Backend: POST notes with attachments (TDD — 6 new tests)
- [x] Backend: GET notes includes attachments (TDD — 2 new tests)
- [x] Backend: GET /api/notes/attachment-download-url endpoint (TDD — 4 new tests)
- [x] Frontend: Update API types and methods for note attachments
- [x] Frontend: NoteAttachmentDisplay component (TDD — 5 new tests)
- [x] Frontend: NoteAttachmentUpload component (TDD — 5 new tests)
- [x] Frontend: Integrate attachments into OptionNotes
- [x] Full test suite passing + roadmap update

---

## Previously Completed

### Sprint 29 QA Check — SES → Resend Migration (COMPLETE)

**Result: Fixed Resend error handling, added email template tests, cleaned SES references. 997 total tests.**

### Sprint 31 — Production Gating (COMPLETE + QA CHECK)

**Result: Gate production creation behind sales team approval. 987 total tests.**

### Sprint 30 — QA & Polish Check (COMPLETE)

**Result: noValidate on all forms, tooltip fixes, hamburger menu fix, alert readability, client-side auth validation. 949 total tests.**

### Sprint 29 — Production Security (COMPLETE)

**Result: Token revocation, JWT invalidation on password reset, per-user upload rate limiting. 936 total tests.**

### Sprint 28 — Granular Email Notifications (COMPLETE)

**Result: Per-production notification preferences, 1-minute email batching, OPTION_ADDED notifications. 923 total tests.**

### Sprint 27 — Fix Email Verification (COMPLETE)

**Result: Backend awaits sendEmail, returns emailSent boolean. Frontend shows warnings. 890 total tests.**
