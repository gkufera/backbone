# Current Plan

## Active Task
Sprint 23 complete. CI/CD fixed, roadmap rebuilt, stale files cleaned up.

## Completed: Sprint 23 (CI/CD Fix & Housekeeping) ✅

- Fixed E2E workflow port conflict (PORT env var was job-level, Next.js picked it up → EADDRINUSE)
- Archived old roadmap (Sprints 0-22) as `roadmap-archive-v1.md`
- Deleted stale `EXTERNAL-SETUP.md` (all setup complete, SES pending AWS review)
- Created fresh `roadmap.md` with remaining work: Sprint 24 (security), Sprint 25 (QA), backlog

## Next Up: Sprint 24 (Production Security)

Four remaining medium-priority security items:
- S14: Token revocation / logout endpoint
- S19: Invalidate JWTs on password reset (tokenVersion)
- S17: Persistent rate limiting (evaluate need)
- S20: Per-user upload URL rate limiting

## Test Counts
- **Frontend**: 434 tests
- **Backend**: 420 tests
- **Total**: 854 tests

## Security Audit Summary

### Fixed (Sprints 15-16)
S1-S13, S15-S16, S18 — all 16 items resolved.

### Remaining (Medium Priority — Sprint 24)
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
