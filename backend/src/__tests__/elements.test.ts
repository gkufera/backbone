import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { signToken } from '../lib/jwt';

// Mock Prisma client
vi.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    production: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    productionMember: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    script: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    element: {
      create: vi.fn(),
      createMany: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('../lib/s3', () => ({
  generateUploadUrl: vi.fn(),
  getFileBuffer: vi.fn(),
}));

vi.mock('../services/script-processor', () => ({
  processScript: vi.fn(),
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

// Helper: set up membership check for script-based routes
function mockScriptWithMembership() {
  // Script lookup returns script with productionId
  mockedPrisma.script.findUnique.mockResolvedValue({
    id: 'script-1',
    productionId: 'prod-1',
    title: 'Test Script',
    fileName: 'test.pdf',
    s3Key: 'scripts/uuid/test.pdf',
    pageCount: 10,
    status: 'READY',
    uploadedById: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any);

  // Membership check
  mockedPrisma.productionMember.findUnique.mockResolvedValue({
    id: 'member-1',
    productionId: 'prod-1',
    userId: 'user-1',
    role: 'ADMIN',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any);

  // Element count (below limit)
  mockedPrisma.element.count.mockResolvedValue(10);
}

describe('POST /api/scripts/:scriptId/elements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', tokenVersion: 0, emailVerified: true } as any);
    mockedPrisma.production.findUnique.mockResolvedValue({ id: 'prod-1', status: 'ACTIVE' } as any);
  });

  it('returns 201 with element (source: MANUAL)', async () => {
    mockScriptWithMembership();

    mockedPrisma.element.create.mockResolvedValue({
      id: 'elem-1',
      scriptId: 'script-1',
      name: 'CUSTOM PROP',
      type: 'OTHER',
      highlightPage: 3,
      highlightText: 'CUSTOM PROP',
      departmentId: null,
      status: 'ACTIVE',
      source: 'MANUAL',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const res = await request(app)
      .post('/api/scripts/script-1/elements')
      .set(authHeader())
      .send({ name: 'CUSTOM PROP', type: 'OTHER', highlightPage: 3, highlightText: 'CUSTOM PROP' });

    expect(res.status).toBe(201);
    expect(res.body.element.name).toBe('CUSTOM PROP');
    expect(res.body.element.source).toBe('MANUAL');
  });

  it('returns 400 when name is missing', async () => {
    mockScriptWithMembership();

    const res = await request(app)
      .post('/api/scripts/script-1/elements')
      .set(authHeader())
      .send({ type: 'CHARACTER' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name/i);
  });

  it('returns 403 when not a production member', async () => {
    // Script exists but different production
    mockedPrisma.script.findUnique.mockResolvedValue({
      id: 'script-1',
      productionId: 'prod-1',
    } as any);

    // Not a member
    mockedPrisma.productionMember.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/scripts/script-1/elements')
      .set(authHeader())
      .send({ name: 'JOHN', type: 'CHARACTER' });

    expect(res.status).toBe(403);
  });

  it('returns 409 when element with same name already exists', async () => {
    mockScriptWithMembership();
    mockedPrisma.element.findFirst.mockResolvedValue({
      id: 'elem-existing',
      scriptId: 'script-1',
      name: 'CUSTOM PROP',
      deletedAt: null,
    } as any);

    const res = await request(app)
      .post('/api/scripts/script-1/elements')
      .set(authHeader())
      .send({ name: 'CUSTOM PROP', type: 'OTHER' });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already exists/i);
  });

  it('returns 409 for case-insensitive duplicate name', async () => {
    mockScriptWithMembership();
    mockedPrisma.element.findFirst.mockResolvedValue({
      id: 'elem-existing',
      scriptId: 'script-1',
      name: 'CUSTOM PROP',
      deletedAt: null,
    } as any);

    const res = await request(app)
      .post('/api/scripts/script-1/elements')
      .set(authHeader())
      .send({ name: 'custom prop', type: 'OTHER' });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already exists/i);
  });

  it('allows creation when only a deleted element with same name exists', async () => {
    mockScriptWithMembership();
    // No active element with this name (findFirst returns null)
    mockedPrisma.element.findFirst.mockResolvedValue(null);
    mockedPrisma.element.create.mockResolvedValue({
      id: 'elem-new',
      scriptId: 'script-1',
      name: 'CUSTOM PROP',
      type: 'OTHER',
      status: 'ACTIVE',
      source: 'MANUAL',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const res = await request(app)
      .post('/api/scripts/script-1/elements')
      .set(authHeader())
      .send({ name: 'CUSTOM PROP', type: 'OTHER' });

    expect(res.status).toBe(201);
    expect(res.body.element.name).toBe('CUSTOM PROP');
  });
});

describe('PATCH /api/elements/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', tokenVersion: 0, emailVerified: true } as any);
    mockedPrisma.production.findUnique.mockResolvedValue({ id: 'prod-1', status: 'ACTIVE' } as any);
  });

  it('returns 200 with updated element', async () => {
    // Find element to get scriptId/productionId
    mockedPrisma.element.findUnique.mockResolvedValue({
      id: 'elem-1',
      scriptId: 'script-1',
      name: 'JOHN',
      type: 'CHARACTER',
      highlightPage: 1,
      highlightText: 'JOHN',
      departmentId: null,
      status: 'ACTIVE',
      source: 'AUTO',
      createdAt: new Date(),
      updatedAt: new Date(),
      script: { productionId: 'prod-1' },
    } as any);

    // Membership check
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'ADMIN',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    mockedPrisma.element.update.mockResolvedValue({
      id: 'elem-1',
      scriptId: 'script-1',
      name: 'JONATHAN',
      type: 'CHARACTER',
      highlightPage: 1,
      highlightText: 'JOHN',
      departmentId: 'dept-1',
      status: 'ACTIVE',
      source: 'AUTO',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const res = await request(app)
      .patch('/api/elements/elem-1')
      .set(authHeader())
      .send({ name: 'JONATHAN', departmentId: 'dept-1' });

    expect(res.status).toBe(200);
    expect(res.body.element.name).toBe('JONATHAN');
  });

  it('returns 404 when element not found', async () => {
    mockedPrisma.element.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .patch('/api/elements/nonexistent')
      .set(authHeader())
      .send({ name: 'NEW NAME' });

    expect(res.status).toBe(404);
  });

  it('returns 404 when element has deletedAt set', async () => {
    mockedPrisma.element.findUnique.mockResolvedValue({
      id: 'elem-1',
      scriptId: 'script-1',
      name: 'DELETED ELEMENT',
      status: 'ACTIVE',
      deletedAt: new Date(),
      script: { productionId: 'prod-1' },
    } as any);

    const res = await request(app)
      .patch('/api/elements/elem-1')
      .set(authHeader())
      .send({ name: 'NEW NAME' });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/element not found/i);
  });
});

describe('GET /api/scripts/:scriptId/elements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', tokenVersion: 0, emailVerified: true } as any);
  });

  it('returns elements excluding ARCHIVED by default', async () => {
    mockScriptWithMembership();

    mockedPrisma.element.findMany.mockResolvedValue([
      {
        id: 'elem-1',
        scriptId: 'script-1',
        name: 'JOHN',
        type: 'CHARACTER',
        highlightPage: 1,
        highlightText: 'JOHN',
        departmentId: null,
        status: 'ACTIVE',
        source: 'AUTO',
      },
    ] as any);

    const res = await request(app).get('/api/scripts/script-1/elements').set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.elements).toHaveLength(1);
    // Verify the query filtered by ACTIVE status
    expect(mockedPrisma.element.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'ACTIVE' }),
      }),
    );
  });

  it('includes ARCHIVED when ?includeArchived=true', async () => {
    mockScriptWithMembership();

    mockedPrisma.element.findMany.mockResolvedValue([
      { id: 'elem-1', name: 'JOHN', status: 'ACTIVE' },
      { id: 'elem-2', name: 'MARY', status: 'ARCHIVED' },
    ] as any);

    const res = await request(app)
      .get('/api/scripts/script-1/elements?includeArchived=true')
      .set(authHeader());

    expect(res.status).toBe(200);
    // Should NOT filter by status
    expect(mockedPrisma.element.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ status: 'ACTIVE' }),
      }),
    );
  });

  it('includes option count (ACTIVE only) in response', async () => {
    mockScriptWithMembership();

    mockedPrisma.element.findMany.mockResolvedValue([
      {
        id: 'elem-1',
        scriptId: 'script-1',
        name: 'JOHN',
        type: 'CHARACTER',
        highlightPage: 1,
        highlightText: 'JOHN',
        departmentId: null,
        status: 'ACTIVE',
        source: 'AUTO',
        _count: { options: 3 },
      },
    ] as any);

    const res = await request(app).get('/api/scripts/script-1/elements').set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.elements[0]._count.options).toBe(3);
    // Verify include has _count
    expect(mockedPrisma.element.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          _count: expect.anything(),
        }),
      }),
    );
  });
});

describe('DELETE /api/elements/:id (safety check)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', tokenVersion: 0, emailVerified: true } as any);
    mockedPrisma.production.findUnique.mockResolvedValue({ id: 'prod-1', status: 'ACTIVE' } as any);
  });

  it('returns 409 when element has options', async () => {
    mockedPrisma.element.findUnique.mockResolvedValue({
      id: 'elem-1',
      scriptId: 'script-1',
      name: 'JOHN',
      script: { productionId: 'prod-1', status: 'REVIEWING' },
      _count: { options: 3 },
    } as any);

    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'ADMIN',
    } as any);

    const res = await request(app)
      .delete('/api/elements/elem-1')
      .set(authHeader());

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/options/i);
  });
});

describe('PATCH /api/elements/:id (archive/soft-delete)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', tokenVersion: 0, emailVerified: true } as any);
    mockedPrisma.production.findUnique.mockResolvedValue({ id: 'prod-1', status: 'ACTIVE' } as any);
  });

  it('archives element via status change (never hard-deletes)', async () => {
    mockedPrisma.element.findUnique.mockResolvedValue({
      id: 'elem-1',
      scriptId: 'script-1',
      name: 'JOHN',
      type: 'CHARACTER',
      status: 'ACTIVE',
      script: { productionId: 'prod-1' },
    } as any);

    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'ADMIN',
    } as any);

    mockedPrisma.element.update.mockResolvedValue({
      id: 'elem-1',
      name: 'JOHN',
      status: 'ARCHIVED',
    } as any);

    const res = await request(app)
      .patch('/api/elements/elem-1')
      .set(authHeader())
      .send({ status: 'ARCHIVED' });

    expect(res.status).toBe(200);
    expect(res.body.element.status).toBe('ARCHIVED');
  });
});
