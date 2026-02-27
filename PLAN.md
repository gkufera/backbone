# Current Plan

## Pipeline Data Integrity & Security Fixes — Sprint 2 (COMPLETE)

**Goal:** Fix 7 bugs found during deep audit of the script → elements → options → approvals pipeline: 1 security vulnerability, 5 data integrity issues, 1 functionality bug.

### Fixes
- [x] Bug A (SECURITY): Reject soft-deleted members in all 19 pipeline membership checks across 5 files
- [x] Bug B: Exclude soft-deleted elements from director's feed query (add `deletedAt: null`)
- [x] Bug C: Reject notes on soft-deleted elements (POST and GET)
- [x] Bug D: Resolve productionId for element-level note attachment downloads (add element include path)
- [x] Bug E: Block approval creation when element is soft-deleted
- [x] Bug F: Block option updates (PATCH) when parent element is soft-deleted
- [x] Bug G: Block asset addition when parent element is soft-deleted or archived

**Final counts:** 528 frontend + 644 backend = 1,172 Tier 1 tests passing. 27 new tests added.

## Element Highlighting Accuracy & FDX PDF Quality (COMPLETE)

**Goal:** Fix element highlighting bugs in PDF viewer and improve FDX-generated PDF quality.

### Fixes
- [x] Bug 1 (HIGH): Props never highlight — `highlightText` stored full action line instead of prop name
- [x] Bug 2 (MEDIUM): FDX TagData elements had hardcoded page 1 and mixed-case `highlightText`
- [x] Bug 3 (QUALITY): Generated PDF had no page numbers — added "2.", "3." etc. on page 2+
- [x] Bug 4 (QUALITY): Character names used full ACTION_WIDTH (6") instead of standard 2.5" column

**Final counts:** 527 frontend + 610 backend = 1,137 Tier 1 tests passing.

## Security Audit: Authorization Hardening (COMPLETE)

**Goal:** Deep-dive security audit of all backend routes. Fix exploitable gaps in upload flow and harden input validation.

### Fixes
- [x] Fix 1 (P0): Require production membership for S3 upload URL generation
- [x] Fix 2 (P1): Validate s3Key production prefix on option and script creation
- [x] Fix 3 (P2): Sanitize filenames in S3 key generation
- [x] Fix 4 (P2): Validate FDX magic bytes before parsing

**Final counts:** 527 frontend + 605 backend = 1,132 Tier 1 tests passing.

## Sprint 37 Check: Code Review Fixes (COMPLETE)

**Goal:** Address 5 actionable items from Sprint 37 code review.

### Fixes
- [x] Fix 1: Explicit `extractElements=true` in revision-processor
- [x] Fix 2: Document PDF vs FDX asymmetry + fix array mutation in script-processor
- [x] Fix 3: Add FDX revision test for action props (1 new test)
- [x] Fix 4: Strengthen FDX description test assertion (tagger tags)
- [x] Fix 5: Update PLAN.md

**Final counts:** 527 frontend + 583 backend = 1,110 Tier 1 tests passing.

## Sprint 37: UX Fixes + Extract Elements Checkbox (COMPLETE)

**Goal:** Fix three user-reported issues from production testing.

### Phases
- [x] Phase 1: Remove "View Productions" button from admin approval page
- [x] Phase 2: Fix element filter/sort chip active states (CSS cascade layer issue)
- [x] Phase 3: Backend — processScript accepts extractElements parameter
- [x] Phase 4: Backend — FDX prop detection from action paragraphs
- [x] Phase 5: Backend route + frontend API — accept extractElements
- [x] Phase 6: Frontend — Extract Elements checkbox on upload page
- [x] Phase 7: Full Tier 1 test pass — 527 frontend + 582 backend = 1,109 total

## Previously Completed

### Sprint 36: Multi-Episode Script Support (COMPLETE)

**Result:** Episode fields on Script model, upload form, dashboard grouping, revision inheritance, script viewer badge. 1,090 Tier 1 tests passing.

### Sprint 35: Roadmap Cleanup + Deep Code Review (COMPLETE)

**Result:** Archived sprints 23-34, rate limited public approval endpoint, auth rejects unverified users, extracted services from productions route, split frontend api.ts into domain modules. 1,075 Tier 1 tests passing.

### Roadmap Completeness Audit + Performance Check (COMPLETE)

**Result:** All roadmap stale items resolved. 6 database indexes added for hot query paths. npm audit clean. DMARC verified compliant. 1,071 Tier 1 tests passing (510 frontend + 561 backend).

### Sprint 34 QA Check: FDX Support Audit (COMPLETE)

**Result:** Fixed 3 bugs (revision processor FDX metadata, XXE hardening, null text nodes), added 9 tests. 1,063 Tier 1 tests passing (510 frontend + 553 backend).

### Sprint 34: FDX (Final Draft) Script Support (COMPLETE)

**Result:** Full FDX import pipeline — parse XML, detect elements from paragraph types + tagger tags, generate screenplay PDF. 1,054 Tier 1 tests passing (507 frontend + 547 backend).
