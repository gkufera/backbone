# Current Plan

## Active Task
Sprint 22 complete. All 12 globals.css color violations fixed with 1-bit patterns.

## Completed: Sprint 22 (Fix Color Violations in globals.css) ✅

Fixed 12 prohibited hex color values (green #00A651, gold #FFD700, red #E63946) in globals.css:
- Approval buttons: green → inverted, gold → checkerboard, red → diagonal stripes
- Option borders: green → 4px solid black, red → 2px dashed black
- Rejected overlay: red → black
- Temperature indicators: all → black, with distinct glyphs (● approved, ◐ mixed, ○ rejected)
- Added globals.css hex color compliance test
- Removed misleading "exception to 1-bit rule" CSS comment

## Completed: Sprint 15 (Critical Security Hardening) ✅

Fixed 11 security vulnerabilities (S1-S5, S8-S13):
- JWT_SECRET and CORS_ORIGINS crash on missing env vars in production
- 1MB JSON body size limit with 413 error handling
- Options download URL now requires production membership
- ElementType/ElementStatus validated against shared enums
- Login timing attack prevented with constant-time bcrypt comparison
- S3 download URLs include Content-Disposition: attachment
- SMS verification codes masked in logs
- PDF magic byte validation before parsing
- Trust proxy configured for rate limiter IP detection
- Error objects logged safely (message only, not full stack)

## Completed: Sprint 16 (Security Defense-in-Depth) ✅

Added defense-in-depth measures:
- Pagination (limit/offset, max 100) on all 12 list endpoints
- Resource creation limits (20 assets/option, 1000 elements/script)
- JWT algorithm (HS256), issuer (slugmax), audience (slugmax-api) claims
- Expanded security headers tests (6 tests, up from 2)

## Completed: Sprint 17 (Immutability & Soft-Delete) ✅

Replaced all hard-deletes with soft-deletes:
- Added `deletedAt DateTime?` to Element, ProductionMember, Department in Prisma schema
- Replaced `prisma.element.delete()` with `prisma.element.update({ data: { deletedAt } })` in elements.ts
- Replaced `prisma.productionMember.delete()` with soft-delete in productions.ts
- Replaced `prisma.department.delete()` with soft-delete in departments.ts
- Updated all list queries to filter `deletedAt: null` (elements, members, departments, notifications)
- Updated 4 existing tests and added 6 new soft-delete tests
- **Post-check fix**: Added missing `deletedAt: null` to 5 queries (GET production members/departments include, department delete member count, privileged member count, element stats groupBy)

## Completed: Sprint 18 (Design System Compliance) ✅

Fixed all design system violations:
- Removed `bg-opacity-90` from lightbox backdrop (solid bg-white)
- Fixed 15 VT323 font-weight violations (removed font-bold/font-medium from buttons, links, spans)
- Added `font-mono` to body-text spans that legitimately need font-bold (user names)
- Replaced notification unread `font-bold` with `border-l-4` border indicator
- Added 5 automated design-system compliance tests
- **Post-check fix**: Removed font-bold from 3 VT323 spans in option-lightbox, removed font-medium from 2 element-list spans, added font-mono to error div in element-detail-panel

## Completed: Sprint 19 (Single Source of Truth) ✅

Replaced hardcoded strings with shared enums:
- 40+ hardcoded status strings replaced across 8 backend files
- Routes barrel export completed (6/12 → 12/12)
- New imports added to revision-matches.ts, element-matcher.ts, script-processor.ts

## Completed: Sprint 20 (Backend Route Refactoring) ✅

Extracted business logic from oversized route files:
- Extracted `generateImpliedElements` service from scripts.ts (632 → 555 lines)
- productions.ts (609) and auth.ts (509) evaluated — within acceptable range, no artificial extraction needed

## Completed: Sprint 21 (Deferred Fixes from Sprints 17 & 19) ✅

Fixed gaps identified in post-sprint review:
- Added missing `deletedAt: null` filter to `enrichNotesWithDepartment()` in notes.ts (Sprint 17 gap)
- Created `RevisionMatchDecision` shared enum in `shared/types/script.ts` (Sprint 19 gap)
- Replaced hardcoded decision strings in backend `revision-matches.ts` with enum values
- Replaced hardcoded decision strings in frontend `api.ts`, `reconciliation-card.tsx`, `reconcile/page.tsx`, and tests
- Updated roadmap.md test count from 843 to 849

## Test Counts
- **Frontend**: 434 tests (+1 hex color compliance, +1 temp glyph)
- **Backend**: 420 tests
- **Total**: 854 tests

## Security Audit Summary

### Already Fixed (Sprints 15-16)
| # | Issue | Status |
|---|-------|--------|
| S1 | JWT secret fallback | ✅ Fixed |
| S2 | CORS allows all origins | ✅ Fixed |
| S3 | No JSON body size limit | ✅ Fixed |
| S4 | Options download URL missing auth | ✅ Fixed |
| S5 | Missing ElementType/Status validation | ✅ Fixed |
| S6 | No pagination on list endpoints | ✅ Fixed |
| S7 | Unbounded assets array | ✅ Fixed |
| S8 | Login timing attack | ✅ Fixed |
| S9 | No Content-Disposition on S3 downloads | ✅ Fixed |
| S10 | SMS verification code logged in plaintext | ✅ Fixed |
| S11 | No PDF magic byte validation | ✅ Fixed |
| S12 | No trust proxy config | ✅ Fixed |
| S13 | Error object logging | ✅ Fixed |
| S15 | JWT algorithm not specified | ✅ Fixed |
| S16 | Missing JWT issuer/audience claims | ✅ Fixed |
| S18 | Incomplete security headers tests | ✅ Fixed |

### Remaining (Medium Priority, before production)
| # | Issue | Notes |
|---|-------|-------|
| S14 | No token revocation / logout endpoint | Medium |
| S17 | In-memory rate limiter resets on restart | Medium |
| S19 | Password reset doesn't invalidate JWT tokens | Medium |
| S20 | No per-user upload URL rate limiting | Medium |

### Already Secure (No Action Needed)
- SQL injection: 0 vulnerabilities (Prisma parameterized queries)
- Mass assignment: 0 vulnerabilities (all fields whitelisted)
- XSS: 0 vulnerabilities (React auto-escapes, no dangerouslySetInnerHTML)
- CSRF: Not applicable (JWT in Authorization header)
- Auth coverage: All 40+ data endpoints require requireAuth
- IDOR: All endpoints check production membership
- RBAC: ADMIN/DECIDER roles properly enforced
- Password hashing: bcrypt with 10 rounds
- Token generation: crypto.randomBytes(32) for all tokens
- Dependencies: 0 known vulnerabilities

## Previous Results
(Archived — see git history for earlier sprint details)
