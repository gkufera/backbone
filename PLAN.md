# Current Plan

## Sprint 36: Multi-Episode Script Support

**Goal:** Allow a single production to hold multiple episodes, each with its own script and revision chain.

### Phases
- [x] Phase 1: Prisma schema — add episodeNumber, episodeTitle to Script + index + migration
- [x] Phase 2: Backend — accept/validate episode fields on creation; revisions inherit from parent (6 new tests)
- [x] Phase 3: Shared constants + frontend API client update
- [x] Phase 4: Script upload form — optional episode fields with validation (3 new tests)
- [x] Phase 5: Production dashboard — group scripts by episode when episodes exist (3 new tests)
- [x] Phase 6: Revision upload — display inherited episode info (1 new test)
- [x] Phase 7: Script viewer — episode badge in header (2 new tests)
- [x] Phase 8: Full Tier 1 test pass — 519 frontend + 571 backend = 1,090 total

## Previously Completed

### Sprint 35: Roadmap Cleanup + Deep Code Review (COMPLETE)

**Result:** Archived sprints 23-34, rate limited public approval endpoint, auth rejects unverified users, extracted services from productions route, split frontend api.ts into domain modules. 1,075 Tier 1 tests passing.

### Roadmap Completeness Audit + Performance Check (COMPLETE)

**Result:** All roadmap stale items resolved. 6 database indexes added for hot query paths. npm audit clean. DMARC verified compliant. 1,071 Tier 1 tests passing (510 frontend + 561 backend).

### Sprint 34 QA Check: FDX Support Audit (COMPLETE)

**Result:** Fixed 3 bugs (revision processor FDX metadata, XXE hardening, null text nodes), added 9 tests. 1,063 Tier 1 tests passing (510 frontend + 553 backend).

### Sprint 34: FDX (Final Draft) Script Support (COMPLETE)

**Result:** Full FDX import pipeline — parse XML, detect elements from paragraph types + tagger tags, generate screenplay PDF. 1,054 Tier 1 tests passing (507 frontend + 547 backend).
