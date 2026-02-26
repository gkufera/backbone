# Current Plan

## Roadmap Completeness Audit + Performance Check (COMPLETE)

**Result:** All roadmap stale items resolved. 6 database indexes added for hot query paths. npm audit clean. DMARC verified compliant. 1,071 Tier 1 tests passing (510 frontend + 561 backend).

### Phases
- [x] Phase 1: Add database indexes (TDD — 8 tests) for Element, Option, ProductionMember, Script, Department, Note
- [x] Phase 2: Fix npm audit minimatch ReDoS vulnerability
- [x] Phase 3: Update roadmap stale items (Sprint 25 CI, Sprint 27 email, Sprint 31 MAIL FROM + perf audit)
- [x] Phase 4: Deploy

## Sprint 34 QA Check: FDX Support Audit (COMPLETE)

**Result:** Fixed 3 bugs (revision processor FDX metadata, XXE hardening, null text nodes), added 9 tests. 1,063 Tier 1 tests passing (510 frontend + 553 backend).

### Phases
- [x] Phase 1: Fix revision processor — generate PDF, store sourceS3Key/format/s3Key/sceneData (4 tests)
- [x] Phase 2: XXE security — explicit processEntities: false + rejection test (1 test)
- [x] Phase 3: Null text node fix — ?? → || for falsy values (1 test)
- [x] Phase 4: Revision upload FDX frontend tests — acceptance, contentType, tooltip (3 tests)
- [x] Phase 5: Full suite pass + docs update

## Sprint 34: FDX (Final Draft) Script Support (COMPLETE)

**Result:** Full FDX import pipeline — parse XML, detect elements from paragraph types + tagger tags, generate screenplay PDF. 1,054 Tier 1 tests passing (507 frontend + 547 backend).

### Phases
- [x] Phase 1: Shared constants, types, schema migration (ScriptFormat enum, sourceS3Key field)
- [x] Phase 2: FDX XML parser using fast-xml-parser (8 tests)
- [x] Phase 3: FDX element detector — characters, locations, tagged elements (10 tests)
- [x] Phase 4: Screenplay PDF generator using pdfkit (5 tests)
- [x] Phase 5: S3 putFileBuffer for server-side upload (2 tests)
- [x] Phase 6: Script processor format routing — FDX vs PDF pipelines (5 tests)
- [x] Phase 7: Revision processor FDX support (2 tests)
- [x] Phase 8: Frontend upload pages accept .fdx with accuracy tooltip (3 tests)
- [x] Phase 9: Backend routes accept FDX and store format metadata (3 tests)
- [x] Phase 10: Integration test + full suite pass (2 tests)

## Sprint 32+33 QA Check (COMPLETE)

**Result:** Fixed S3 upload validation bug (TDD), removed stale SMS mocks and phone fields from tests. 1,006 Tier 1 tests passing (504 frontend + 502 backend).

## Sprint 32+33 — Prune SMS + Discussion Media Attachments (COMPLETE)

**Goal:** Remove unused SMS/phone verification code (Sprint 32), then add media attachments to option discussions (Sprint 33).

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
