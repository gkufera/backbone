# Current Plan

## Active Task
None — Sprint 8.5 check complete.

## Sprint 8.5 Check Results

| Step | Focus | Status | Commit | New Tests |
|------|-------|--------|--------|-----------|
| 1 | Remove compat code + mediaType validation | ✅ | `fix: remove backwards compat code and add mediaType validation in options` | +2 |
| 2 | Wire composer identity props | ✅ | `fix: wire composer identity props to discussion and option notes` | +1 |
| 3 | Null department edge case test | ✅ | `test: add edge case test for null department in notes enrichment` | +1 |
| 4 | Docs + verification | ✅ | `docs: update PLAN.md after Sprint 8.5 check` | 0 |

### Issues Fixed
| # | Severity | Issue | Fix |
|---|----------|-------|-----|
| 1 | CRITICAL | Composer identity props never wired to DiscussionBox/OptionNotes | ElementDetailPanel now fetches user + membership and passes props |
| 2 | HIGH | Backwards compat code accepting legacy s3Key/fileName params | Removed legacy destructuring and fallback code path |
| 3 | HIGH | Missing mediaType enum validation in POST /api/options/:id/assets | Added Object.values(MediaType).includes() check |
| 4 | MEDIUM | Unsafe `as MediaType` casts in assets array mapping | Removed casts, using validated values directly |
| 5 | LOW | No test for null department in notes enrichment | Added edge case test |

### Test Counts (Post Sprint 8.5 Check)
- **Frontend**: 421 tests (was 420, +1 new)
- **Backend**: 370 tests (was 367, +3 new)
- **Total**: 791 tests (was 787, +4 new)

## Sprint 8.5 Results

| Step | Focus | Status | Commit | New Tests |
|------|-------|--------|--------|-----------|
| 1 | Backend: department in note responses | ✅ | `feat: include user department in note API responses` | +4 |
| 2 | Frontend: display department in notes | ✅ | `feat: display user department name in discussion and option notes` | +3 |
| 3 | Frontend: composer identity display | ✅ | `feat: auto-display user name and department when composing notes` | +3 |
| 4 | Schema: OptionAsset model migration | ✅ | `feat: add OptionAsset schema model with data migration` | 0 |
| 5 | Backend: multi-asset option CRUD | ✅ | `feat: update option CRUD endpoints for multi-asset model` | +5 |
| 6 | Backend: feed/approval assets include | ✅ | `feat: include assets in feed and approval option queries` | +1 |
| 7 | Seed data for multi-asset | ✅ | `feat: update seed data for multi-asset option model` | 0 |
| 8 | Frontend: multi-file upload form | ✅ | `feat: multi-file upload support in option upload form` | +3 |
| 9 | Frontend: display components multi-asset | ✅ | `feat: update option display components for multi-asset model` | +4 |
| 10 | Frontend: slideshow arrow navigation | ✅ | `feat: add slideshow arrow navigation tests in option lightbox` | +6 |
| 11 | Roadmap update + docs | ✅ | `docs: update test counts and roadmap after Sprint 8.5` | 0 |

## Completed (Edge Case Audit)

| Step | Focus | Commit | New Tests |
|------|-------|--------|-----------|
| 1 | Strengthen weak test assertions | `fix: strengthen weak test assertions in production-dashboard tests` | 0 |
| 2 | Fix batch notification failure | `fix: use Promise.allSettled for batch notifications` | +1 |
| 3 | Type-safe approval notification map | `fix: use ApprovalDecision enum as notification type map key` | 0 |
| 4 | Remove unsafe as-any casts | `fix: remove unsafe as-any casts in scripts.ts` | 0 |
| 5 | Full test suite + docs | `docs: update test counts after edge case audit` | 0 |

## Next Up
Sprint 14: E2E CI/CD, AWS SES, S3/CloudFront CDN, Performance audit.
