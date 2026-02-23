# Current Plan

## Active Task
**Sprint 5: Script Revisions & Versioning — Complete**

## Completed (Sprint 5)

### Phases

| Phase | Focus | Commit | New Tests |
|-------|-------|--------|-----------|
| 1 | Schema + Types | `feat: add script versioning schema and RevisionMatch model` | 0 |
| 2 | Matching Algorithm | `feat: add element text-matching algorithm with fuzzy matching` | +11 |
| 3 | Revision Processor | `feat: add revision processing pipeline with element migration` | +6 |
| 4 | API Endpoints | `feat: add revision upload, reconciliation, and version history endpoints` | +10 |
| 5 | FE API Client | `feat: add revision and version history API client functions` | 0 |
| 6 | Upload Draft UI | `feat: add upload new draft UI` | +4 |
| 7 | Reconciliation UI | `feat: add reconciliation UI for script revision matches` | +8 |
| 8 | Version History | `feat: add version history page and version display` | +4 |

### Test Counts

- **Frontend**: 136 tests (was 120, +16 new)
- **Backend**: 160 tests (was 133, +27 new)
- **Total**: 296 tests (was 253, +43 new)

### Architecture

Elements migrate between script versions by updating `scriptId`:
- Each script version is a separate Script row with `version` and `parentScriptId`
- Exact-match elements get their `scriptId` updated to point at the new Script
- Options and Approvals are untouched (they reference `elementId`, not `scriptId`)
- Fuzzy/missing cases stored as `RevisionMatch` records for user reconciliation
- New `RECONCILING` script status for the reconciliation state

## Completed (Sprint 4 Review)

### Fixes

| Step | Issue | Commit | New Tests |
|------|-------|--------|-----------|
| 1 | Block approval on archived options/elements | `fix: block approval creation on archived options and elements` | +2 |
| 2 | Strengthen approval userId test + feed filter test | `test: strengthen approval and feed test assertions` | +1 |
| 3 | Wire ApprovalHistory into OptionCard | `feat: display approval history in option cards` | +1 |
| 4 | Disable approval buttons during submission | `fix: disable approval buttons during submission` | +1 |
| 5 | Clear error state on success + empty history test | `fix: clear error state on successful operations` | +1 |

## Completed (Sprint 4)

### Phases

| Phase | Focus | Commit | New Tests |
|-------|-------|--------|-----------|
| 1 | Schema + Types | `feat: add Approval model, shared types, and constants` | 0 |
| 2 | Backend CRUD + Feed | `feat: add approval CRUD and feed API endpoints` | +16 |
| 3 | Element Locking | `feat: lock option uploads when element has approved option` | +3 |
| 4 | Frontend API Client | `feat: add approval and feed API client functions` | 0 |
| 5 | Feed Page | `feat: add director's feed page for elements pending review` | +10 |
| 6 | Approval UI | `feat: add approval buttons and history UI components` | +8 |
| 7 | Wire into Detail | `feat: wire approval workflow into element detail page` | +6 |

## Next Up
Sprint 6: Permissions & Departments
