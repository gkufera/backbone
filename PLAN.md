# Current Plan

## Active Task
**Sprint 3: Elements & Options** -- COMPLETE

## Phases

### Phase 1: Prisma Schema + Shared Types & Constants
- [x] Created `shared/types/option.ts` with MediaType, OptionStatus enums and Option interface
- [x] Created `shared/constants/option.ts` with MIME types, max file size, mediaTypeFromMime()
- [x] Updated barrel exports in shared/types/index.ts and shared/constants/index.ts
- [x] Updated prisma/schema.prisma with Option model, MediaType/OptionStatus enums
- [x] Created migration SQL
- [x] All 141 existing tests pass
- [x] COMMIT: "feat: add Option model, shared types, and constants"

### Phase 2: Backend Upload URL + Download URL Endpoints (TDD)
- [x] Added generateMediaUploadUrl and generateDownloadUrl to s3.ts
- [x] Created options.ts router with POST /api/options/upload-url and GET /api/options/download-url
- [x] Registered optionsRouter in app.ts
- [x] 9 new tests (all pass): upload-url (7) + download-url (2)
- [x] 150 total tests (57 frontend + 93 backend)
- [x] COMMIT: "feat: add presigned URL endpoints for option media uploads"

### Phase 3: Backend Option CRUD Endpoints (TDD)
- [x] Added POST /api/elements/:elementId/options, GET /api/elements/:elementId/options, PATCH /api/options/:id
- [x] 14 new tests (all pass): create (8) + list (4) + update (2)
- [x] 164 total tests (57 frontend + 107 backend)
- [x] COMMIT: "feat: add option CRUD API endpoints"

### Phase 4: Frontend API Client + Element Detail Page (TDD)
- [x] Added OptionResponse type and optionsApi to frontend api.ts
- [x] Created element detail page at /productions/[id]/scripts/[scriptId]/elements/[elementId]/page.tsx
- [x] 8 new tests (all pass)
- [x] 172 total tests (65 frontend + 107 backend)
- [x] COMMIT: "feat: add element detail page with options listing"

### Phase 5: Option Card + Gallery Components (TDD)
- [x] Created option-card.tsx and option-gallery.tsx components
- [x] 8 new tests (all pass): card (6) + gallery (2)
- [x] 180 total tests (73 frontend + 107 backend)
- [x] COMMIT: "feat: add option card and gallery components"

### Phase 6: Option Upload Form + Thumbnails (TDD)
- [x] Created thumbnail.ts with image and video thumbnail generation
- [x] Created option-upload-form.tsx with file/link modes
- [x] 9 new tests (all pass): form (7) + thumbnail (2)
- [x] 189 total tests (82 frontend + 107 backend)
- [x] COMMIT: "feat: add option upload form with multi-media support"

### Phase 7: Wire Everything Together (TDD)
- [x] Integrated upload form into detail page
- [x] Wired ready-for-review and archive handlers
- [x] Made element names clickable links in element-list.tsx
- [x] Updated script viewer to pass productionId and scriptId to ElementList
- [x] 5 new tests (all pass)
- [x] 194 total tests (87 frontend + 107 backend)
- [x] COMMIT: "feat: wire option upload flow and ready-for-review toggle"

### Phase 8: Option Counts on Element List (TDD)
- [x] Added _count include to elements.ts GET route (ACTIVE options only)
- [x] Added _count include to scripts.ts GET script route
- [x] Added option count badge rendering to element-list.tsx
- [x] 2 new tests (all pass): backend (1) + frontend (1)
- [x] 196 total tests (88 frontend + 108 backend)
- [x] COMMIT: "feat: show option counts on element list"

### Phase 9: Final Verification
- [x] All 196 Tier 1 tests pass (88 frontend + 108 backend)
- [x] Updated PLAN.md and roadmap.md
- [x] COMMIT: "docs: mark Sprint 3 (Elements & Options) as complete"

## Summary
- **Before Sprint 3**: 141 tests (57 frontend + 84 backend)
- **After Sprint 3**: 196 tests (88 frontend + 108 backend), +55 new tests
- 8 implementation commits + 1 documentation commit
- Option model with full CRUD, presigned S3 URLs, multimedia upload
- Element detail page with option gallery, upload form, ready-for-review toggle
- Client-side thumbnail generation for images and videos
- Option count badges on element list

## Notes / Blockers
- Sprint 3 is complete. Ready for Sprint 4 (Director's Dashboard & Approval).
