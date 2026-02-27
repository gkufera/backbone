import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { signToken } from '../lib/jwt';
import { RevisionMatchDecision } from '@backbone/shared/types';

// Mock Prisma client
vi.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    production: {
      findUnique: vi.fn(),
    },
    productionMember: {
      findUnique: vi.fn(),
    },
    script: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    element: {
      findMany: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
    },
    revisionMatch: {
      findMany: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// Mock S3
vi.mock('../lib/s3', () => ({
  generateUploadUrl: vi.fn(),
  generateDownloadUrl: vi.fn(),
  getFileBuffer: vi.fn(),
}));

import { prisma } from '../lib/prisma';

const mockedPrisma = vi.mocked(prisma);

const testUser = {
  userId: 'user-1',
  email: 'test@example.com',
};

function authHeader() {
  const token = signToken(testUser);
  return { Authorization: `Bearer ${token}` };
}

const mockMembership = {
  id: 'member-1',
  productionId: 'prod-1',
  userId: 'user-1',
  role: 'ADMIN',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('POST /api/productions/:id/scripts/:scriptId/revisions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', tokenVersion: 0, emailVerified: true } as any);
    mockedPrisma.production.findUnique.mockResolvedValue({ id: 'prod-1', status: 'ACTIVE' } as any);
  });

  it('returns 201 with correct version/parentScriptId', async () => {
    mockedPrisma.productionMember.findUnique.mockResolvedValue(mockMembership as any);
    mockedPrisma.script.findUnique.mockResolvedValue({
      id: 'script-1',
      productionId: 'prod-1',
      title: 'My Script',
      version: 1,
      status: 'READY',
    } as any);
    mockedPrisma.script.create.mockResolvedValue({
      id: 'script-2',
      productionId: 'prod-1',
      title: 'My Script',
      fileName: 'script-v2.pdf',
      s3Key: 'scripts/prod-1/uuid/script-v2.pdf',
      pageCount: null,
      status: 'PROCESSING',
      version: 2,
      parentScriptId: 'script-1',
      uploadedById: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const res = await request(app)
      .post('/api/productions/prod-1/scripts/script-1/revisions')
      .set(authHeader())
      .send({
        title: 'My Script',
        fileName: 'script-v2.pdf',
        s3Key: 'scripts/prod-1/uuid/script-v2.pdf',
      });

    expect(res.status).toBe(201);
    expect(res.body.script.version).toBe(2);
    expect(res.body.script.parentScriptId).toBe('script-1');
    expect(res.body.script.status).toBe('PROCESSING');
  });

  it('returns 404 when parent script not found', async () => {
    mockedPrisma.productionMember.findUnique.mockResolvedValue(mockMembership as any);
    mockedPrisma.script.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/productions/prod-1/scripts/nonexistent/revisions')
      .set(authHeader())
      .send({
        title: 'My Script',
        fileName: 'script-v2.pdf',
        s3Key: 'scripts/prod-1/uuid/script-v2.pdf',
      });

    expect(res.status).toBe(404);
  });

  it('returns 400 when parent script is not READY', async () => {
    mockedPrisma.productionMember.findUnique.mockResolvedValue(mockMembership as any);
    mockedPrisma.script.findUnique.mockResolvedValue({
      id: 'script-1',
      productionId: 'prod-1',
      title: 'My Script',
      version: 1,
      status: 'PROCESSING',
    } as any);

    const res = await request(app)
      .post('/api/productions/prod-1/scripts/script-1/revisions')
      .set(authHeader())
      .send({
        title: 'My Script',
        fileName: 'script-v2.pdf',
        s3Key: 'scripts/prod-1/uuid/script-v2.pdf',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/READY/i);
  });
});

describe('GET /api/scripts/:scriptId/revision-matches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', tokenVersion: 0, emailVerified: true } as any);
  });

  it('returns 403 for non-member', async () => {
    mockedPrisma.script.findUnique.mockResolvedValue({
      id: 'script-2',
      productionId: 'prod-1',
      status: 'RECONCILING',
    } as any);
    mockedPrisma.productionMember.findUnique.mockResolvedValue(null);

    const res = await request(app).get('/api/scripts/script-2/revision-matches').set(authHeader());

    expect(res.status).toBe(403);
  });

  it('returns matches for RECONCILING script', async () => {
    mockedPrisma.script.findUnique.mockResolvedValue({
      id: 'script-2',
      productionId: 'prod-1',
      status: 'RECONCILING',
    } as any);
    mockedPrisma.productionMember.findUnique.mockResolvedValue(mockMembership as any);

    mockedPrisma.revisionMatch.findMany.mockResolvedValue([
      {
        id: 'match-1',
        newScriptId: 'script-2',
        detectedName: 'JOHN SMITHE',
        detectedType: 'CHARACTER',
        detectedPage: 1,
        detectedHighlightText: 'JOHN SMITHE',
        matchStatus: 'FUZZY',
        oldElementId: 'elem-1',
        similarity: 0.91,
        userDecision: null,
        resolved: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        oldElement: {
          id: 'elem-1',
          name: 'JOHN SMITH',
          type: 'CHARACTER',
          _count: { options: 3 },
          options: [{ approvals: [{ decision: 'APPROVED' }] }],
        },
      },
    ] as any);

    const res = await request(app).get('/api/scripts/script-2/revision-matches').set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.matches).toHaveLength(1);
    expect(res.body.matches[0].detectedName).toBe('JOHN SMITHE');
    expect(res.body.matches[0].similarity).toBe(0.91);
  });

  it('returns 400 if script not RECONCILING', async () => {
    mockedPrisma.script.findUnique.mockResolvedValue({
      id: 'script-2',
      productionId: 'prod-1',
      status: 'READY',
    } as any);
    mockedPrisma.productionMember.findUnique.mockResolvedValue(mockMembership as any);

    const res = await request(app).get('/api/scripts/script-2/revision-matches').set(authHeader());

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/RECONCILING/i);
  });
});

describe('POST /api/scripts/:scriptId/revision-matches/resolve', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', tokenVersion: 0, emailVerified: true } as any);
  });

  it('returns 403 for non-member', async () => {
    mockedPrisma.script.findUnique.mockResolvedValue({
      id: 'script-2',
      productionId: 'prod-1',
      status: 'RECONCILING',
    } as any);
    mockedPrisma.productionMember.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/scripts/script-2/revision-matches/resolve')
      .set(authHeader())
      .send({
        decisions: [{ matchId: 'match-1', decision: RevisionMatchDecision.MAP }],
      });

    expect(res.status).toBe(403);
  });

  it('processes map/create_new/keep/archive decisions correctly', async () => {
    mockedPrisma.script.findUnique.mockResolvedValue({
      id: 'script-2',
      productionId: 'prod-1',
      status: 'RECONCILING',
    } as any);
    mockedPrisma.productionMember.findUnique.mockResolvedValue(mockMembership as any);

    mockedPrisma.revisionMatch.findMany.mockResolvedValue([
      {
        id: 'match-1',
        matchStatus: 'FUZZY',
        oldElementId: 'elem-1',
        detectedName: 'JOHN SMITHE',
        detectedType: 'CHARACTER',
        detectedPage: 1,
        detectedHighlightText: 'JOHN SMITHE',
      },
      {
        id: 'match-2',
        matchStatus: 'FUZZY',
        oldElementId: 'elem-2',
        detectedName: 'MARY JONEZ',
        detectedType: 'CHARACTER',
        detectedPage: 3,
        detectedHighlightText: 'MARY JONEZ',
      },
      {
        id: 'match-3',
        matchStatus: 'MISSING',
        oldElementId: 'elem-3',
        detectedName: 'BOB',
        detectedType: 'CHARACTER',
        detectedPage: null,
        detectedHighlightText: null,
      },
      {
        id: 'match-4',
        matchStatus: 'MISSING',
        oldElementId: 'elem-4',
        detectedName: 'ALICE',
        detectedType: 'CHARACTER',
        detectedPage: null,
        detectedHighlightText: null,
      },
    ] as any);

    mockedPrisma.element.update.mockResolvedValue({} as any);
    mockedPrisma.element.createMany.mockResolvedValue({ count: 1 });
    mockedPrisma.revisionMatch.update.mockResolvedValue({} as any);
    mockedPrisma.script.update.mockResolvedValue({} as any);
    mockedPrisma.$transaction.mockImplementation(async (fn: any) => fn(mockedPrisma));

    const res = await request(app)
      .post('/api/scripts/script-2/revision-matches/resolve')
      .set(authHeader())
      .send({
        decisions: [
          { matchId: 'match-1', decision: RevisionMatchDecision.MAP },
          { matchId: 'match-2', decision: RevisionMatchDecision.CREATE_NEW },
          { matchId: 'match-3', decision: RevisionMatchDecision.KEEP },
          { matchId: 'match-4', decision: RevisionMatchDecision.ARCHIVE },
        ],
      });

    expect(res.status).toBe(200);

    // map: update old element's scriptId with new highlight data
    expect(mockedPrisma.element.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'elem-1' },
        data: expect.objectContaining({
          scriptId: 'script-2',
          name: 'JOHN SMITHE',
        }),
      }),
    );

    // archive: set old element status to ARCHIVED
    expect(mockedPrisma.element.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'elem-4' },
        data: expect.objectContaining({ status: 'ARCHIVED' }),
      }),
    );
  });

  it('transitions script from RECONCILING → READY', async () => {
    mockedPrisma.script.findUnique.mockResolvedValue({
      id: 'script-2',
      productionId: 'prod-1',
      status: 'RECONCILING',
    } as any);
    mockedPrisma.productionMember.findUnique.mockResolvedValue(mockMembership as any);

    mockedPrisma.revisionMatch.findMany.mockResolvedValue([
      {
        id: 'match-1',
        matchStatus: 'FUZZY',
        oldElementId: 'elem-1',
        detectedName: 'JOHN SMITHE',
        detectedType: 'CHARACTER',
        detectedPage: 1,
        detectedHighlightText: 'JOHN SMITHE',
      },
    ] as any);

    mockedPrisma.element.update.mockResolvedValue({} as any);
    mockedPrisma.revisionMatch.update.mockResolvedValue({} as any);
    mockedPrisma.script.update.mockResolvedValue({} as any);
    mockedPrisma.$transaction.mockImplementation(async (fn: any) => fn(mockedPrisma));

    const res = await request(app)
      .post('/api/scripts/script-2/revision-matches/resolve')
      .set(authHeader())
      .send({
        decisions: [{ matchId: 'match-1', decision: RevisionMatchDecision.MAP }],
      });

    expect(res.status).toBe(200);

    // Script should transition to READY
    expect(mockedPrisma.script.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'script-2' },
        data: expect.objectContaining({ status: 'READY' }),
      }),
    );
  });

  it('returns 400 when matchId not found', async () => {
    mockedPrisma.script.findUnique.mockResolvedValue({
      id: 'script-2',
      productionId: 'prod-1',
      status: 'RECONCILING',
    } as any);
    mockedPrisma.productionMember.findUnique.mockResolvedValue(mockMembership as any);

    // Only match-1 exists in DB
    mockedPrisma.revisionMatch.findMany.mockResolvedValue([
      {
        id: 'match-1',
        matchStatus: 'FUZZY',
        oldElementId: 'elem-1',
        detectedName: 'JOHN',
        detectedType: 'CHARACTER',
        detectedPage: 1,
        detectedHighlightText: 'JOHN',
      },
    ] as any);

    const res = await request(app)
      .post('/api/scripts/script-2/revision-matches/resolve')
      .set(authHeader())
      .send({
        decisions: [
          { matchId: 'match-1', decision: RevisionMatchDecision.MAP },
          { matchId: 'nonexistent-id', decision: RevisionMatchDecision.ARCHIVE },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/nonexistent-id/);
  });

  it('returns 400 for invalid decisions', async () => {
    mockedPrisma.script.findUnique.mockResolvedValue({
      id: 'script-2',
      productionId: 'prod-1',
      status: 'RECONCILING',
    } as any);
    mockedPrisma.productionMember.findUnique.mockResolvedValue(mockMembership as any);

    const res = await request(app)
      .post('/api/scripts/script-2/revision-matches/resolve')
      .set(authHeader())
      .send({
        decisions: [{ matchId: 'match-1', decision: 'invalid_decision' }],
      });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/productions/:id/scripts/:scriptId/versions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', tokenVersion: 0, emailVerified: true } as any);
  });

  it('returns version chain in order', async () => {
    mockedPrisma.productionMember.findUnique.mockResolvedValue(mockMembership as any);

    // First call: get the script
    mockedPrisma.script.findUnique.mockResolvedValue({
      id: 'script-3',
      productionId: 'prod-1',
      title: 'My Script',
      version: 3,
      parentScriptId: 'script-2',
    } as any);

    // findMany returns all versions
    mockedPrisma.script.findMany.mockResolvedValue([
      {
        id: 'script-3',
        title: 'My Script',
        version: 3,
        status: 'READY',
        pageCount: 130,
        createdAt: new Date('2026-03-01'),
        parentScriptId: 'script-2',
      },
      {
        id: 'script-2',
        title: 'My Script',
        version: 2,
        status: 'READY',
        pageCount: 125,
        createdAt: new Date('2026-02-15'),
        parentScriptId: 'script-1',
      },
      {
        id: 'script-1',
        title: 'My Script',
        version: 1,
        status: 'READY',
        pageCount: 120,
        createdAt: new Date('2026-02-01'),
        parentScriptId: null,
      },
    ] as any);

    const res = await request(app)
      .get('/api/productions/prod-1/scripts/script-3/versions')
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.versions).toHaveLength(3);
    expect(res.body.versions[0].version).toBe(3);
    expect(res.body.versions[2].version).toBe(1);
  });

  it('returns single version for no-parent script', async () => {
    mockedPrisma.productionMember.findUnique.mockResolvedValue(mockMembership as any);

    mockedPrisma.script.findUnique.mockResolvedValue({
      id: 'script-1',
      productionId: 'prod-1',
      title: 'My Script',
      version: 1,
      parentScriptId: null,
    } as any);

    mockedPrisma.script.findMany.mockResolvedValue([
      {
        id: 'script-1',
        title: 'My Script',
        version: 1,
        status: 'READY',
        pageCount: 120,
        createdAt: new Date('2026-02-01'),
        parentScriptId: null,
      },
    ] as any);

    const res = await request(app)
      .get('/api/productions/prod-1/scripts/script-1/versions')
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.versions).toHaveLength(1);
    expect(res.body.versions[0].version).toBe(1);
  });
});
