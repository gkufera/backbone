# Current Plan

## Sprint 35: Roadmap Cleanup + Deep Code Review

**Goal:** Archive completed sprints, run deep code review for security and code organization, fix findings.

### Phases
- [x] Phase 1: Archive Sprints 23-34 to `roadmap-archive-v2.md`, clean up roadmap.md
- [x] Phase 2: Security — Rate limit public production approval endpoint (TDD) — 3 new tests
- [x] Phase 3: Security — Auth middleware rejects unverified email users (TDD) — 1 new test
- [x] Phase 4: Refactor — Extract member and approval services from productions route — 789→608 lines
- [x] Phase 5: Refactor — Split frontend api.ts into domain modules — 714→35 lines (barrel)
- [x] Phase 6: Full Tier 1 test pass — 510 frontend + 565 backend = 1,075 total

## Previously Completed

### Roadmap Completeness Audit + Performance Check (COMPLETE)

**Result:** All roadmap stale items resolved. 6 database indexes added for hot query paths. npm audit clean. DMARC verified compliant. 1,071 Tier 1 tests passing (510 frontend + 561 backend).

### Sprint 34 QA Check: FDX Support Audit (COMPLETE)

**Result:** Fixed 3 bugs (revision processor FDX metadata, XXE hardening, null text nodes), added 9 tests. 1,063 Tier 1 tests passing (510 frontend + 553 backend).

### Sprint 34: FDX (Final Draft) Script Support (COMPLETE)

**Result:** Full FDX import pipeline — parse XML, detect elements from paragraph types + tagger tags, generate screenplay PDF. 1,054 Tier 1 tests passing (507 frontend + 547 backend).
