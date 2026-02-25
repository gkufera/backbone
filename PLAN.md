# Current Plan

## Active Task
Security Hardening & Best Practices Audit — Sprints 15-20 complete.

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

## Completed: Sprint 18 (Design System Compliance) ✅

Fixed all design system violations:
- Removed `bg-opacity-90` from lightbox backdrop (solid bg-white)
- Fixed 15 VT323 font-weight violations (removed font-bold/font-medium from buttons, links, spans)
- Added `font-mono` to body-text spans that legitimately need font-bold (user names)
- Replaced notification unread `font-bold` with `border-l-4` border indicator
- Added 5 automated design-system compliance tests

## Completed: Sprint 19 (Single Source of Truth) ✅

Replaced hardcoded strings with shared enums:
- 40+ hardcoded status strings replaced across 8 backend files
- Routes barrel export completed (6/12 → 12/12)
- New imports added to revision-matches.ts, element-matcher.ts, script-processor.ts

## Completed: Sprint 20 (Backend Route Refactoring) ✅

Extracted business logic from oversized route files:
- Extracted `generateImpliedElements` service from scripts.ts (632 → 555 lines)
- productions.ts (609) and auth.ts (509) evaluated — within acceptable range, no artificial extraction needed

## Test Counts
- **Frontend**: 432 tests (+5 design system compliance tests)
- **Backend**: 411 tests (+40 new tests from Sprints 15-17)
- **Total**: 843 tests

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
