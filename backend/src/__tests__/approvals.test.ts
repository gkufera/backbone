import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { signToken } from '../lib/jwt.js';

// Mock Prisma client
vi.mock('../lib/prisma.js', () => ({
  prisma: {
    option: {
      findUnique: vi.fn(),
    },
    productionMember: {
      findUnique: vi.fn(),
    },
    approval: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    element: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
  },
}));

import { prisma } from '../lib/prisma.js';

const mockedPrisma = vi.mocked(prisma);

const testUser = {
  userId: 'user-1',
  email: 'test@example.com',
};

function authHeader() {
  const token = signToken(testUser);
  return { Authorization: `Bearer ${token}` };
}

function mockOptionWithMembership() {
  mockedPrisma.option.findUnique.mockResolvedValue({
    id: 'opt-1',
    elementId: 'elem-1',
    status: 'ACTIVE',
    uploadedById: 'user-2',
    element: {
      id: 'elem-1',
      status: 'ACTIVE',
      workflowState: 'OUTSTANDING',
      script: { productionId: 'prod-1' },
    },
  } as any);

  mockedPrisma.productionMember.findUnique.mockResolvedValue({
    id: 'member-1',
    productionId: 'prod-1',
    userId: 'user-1',
    role: 'OWNER',
  } as any);
}

// ── POST /api/options/:optionId/approvals ──────────────────────────

describe('POST /api/options/:optionId/approvals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 201 when creating APPROVED approval', async () => {
    mockOptionWithMembership();
    mockedPrisma.approval.create.mockResolvedValue({
      id: 'appr-1',
      optionId: 'opt-1',
      userId: 'user-1',
      decision: 'APPROVED',
      note: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
    mockedPrisma.element.update.mockResolvedValue({} as any);
    mockedPrisma.notification.create.mockResolvedValue({} as any);

    const res = await request(app)
      .post('/api/options/opt-1/approvals')
      .set(authHeader())
      .send({ decision: 'APPROVED' });

    expect(res.status).toBe(201);
    expect(res.body.approval.decision).toBe('APPROVED');
    expect(res.body.approval.optionId).toBe('opt-1');
    expect(res.body.approval.userId).toBe('user-1');
  });

  it('returns 201 when creating REJECTED approval', async () => {
    mockOptionWithMembership();
    mockedPrisma.approval.create.mockResolvedValue({
      id: 'appr-2',
      optionId: 'opt-1',
      userId: 'user-1',
      decision: 'REJECTED',
      note: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const res = await request(app)
      .post('/api/options/opt-1/approvals')
      .set(authHeader())
      .send({ decision: 'REJECTED' });

    expect(res.status).toBe(201);
    expect(res.body.approval.decision).toBe('REJECTED');
  });

  it('returns 201 when creating MAYBE approval with note', async () => {
    mockOptionWithMembership();
    mockedPrisma.approval.create.mockResolvedValue({
      id: 'appr-3',
      optionId: 'opt-1',
      userId: 'user-1',
      decision: 'MAYBE',
      note: 'Need to see in person',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const res = await request(app)
      .post('/api/options/opt-1/approvals')
      .set(authHeader())
      .send({ decision: 'MAYBE', note: 'Need to see in person' });

    expect(res.status).toBe(201);
    expect(res.body.approval.decision).toBe('MAYBE');
    expect(res.body.approval.note).toBe('Need to see in person');
  });

  it('returns 400 when decision is missing', async () => {
    const res = await request(app).post('/api/options/opt-1/approvals').set(authHeader()).send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/decision/i);
  });

  it('returns 400 when decision is invalid', async () => {
    const res = await request(app)
      .post('/api/options/opt-1/approvals')
      .set(authHeader())
      .send({ decision: 'INVALID' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/decision/i);
  });

  it('returns 400 when note exceeds max length', async () => {
    mockOptionWithMembership();

    const longNote = 'a'.repeat(501);
    const res = await request(app)
      .post('/api/options/opt-1/approvals')
      .set(authHeader())
      .send({ decision: 'APPROVED', note: longNote });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/note/i);
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app)
      .post('/api/options/opt-1/approvals')
      .send({ decision: 'APPROVED' });

    expect(res.status).toBe(401);
  });

  it('returns 403 when not a production member', async () => {
    mockedPrisma.option.findUnique.mockResolvedValue({
      id: 'opt-1',
      elementId: 'elem-1',
      element: { script: { productionId: 'prod-1' } },
    } as any);
    mockedPrisma.productionMember.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/options/opt-1/approvals')
      .set(authHeader())
      .send({ decision: 'APPROVED' });

    expect(res.status).toBe(403);
  });

  it('returns 404 when option not found', async () => {
    mockedPrisma.option.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/options/nonexistent/approvals')
      .set(authHeader())
      .send({ decision: 'APPROVED' });

    expect(res.status).toBe(404);
  });

  it('returns 400 when option is archived', async () => {
    mockedPrisma.option.findUnique.mockResolvedValue({
      id: 'opt-1',
      elementId: 'elem-1',
      status: 'ARCHIVED',
      element: {
        status: 'ACTIVE',
        script: { productionId: 'prod-1' },
      },
    } as any);
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'OWNER',
    } as any);

    const res = await request(app)
      .post('/api/options/opt-1/approvals')
      .set(authHeader())
      .send({ decision: 'APPROVED' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/archived/i);
  });

  it('returns 400 when element is archived', async () => {
    mockedPrisma.option.findUnique.mockResolvedValue({
      id: 'opt-1',
      elementId: 'elem-1',
      status: 'ACTIVE',
      element: {
        status: 'ARCHIVED',
        script: { productionId: 'prod-1' },
      },
    } as any);
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'OWNER',
    } as any);

    const res = await request(app)
      .post('/api/options/opt-1/approvals')
      .set(authHeader())
      .send({ decision: 'APPROVED' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/archived/i);
  });
});

// ── GET /api/options/:optionId/approvals ──────────────────────────

describe('GET /api/options/:optionId/approvals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with approvals including user name', async () => {
    mockOptionWithMembership();
    mockedPrisma.approval.findMany.mockResolvedValue([
      {
        id: 'appr-1',
        optionId: 'opt-1',
        userId: 'user-1',
        decision: 'APPROVED',
        note: 'Looks great',
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: 'user-1', name: 'Jane Director' },
      },
    ] as any);

    const res = await request(app).get('/api/options/opt-1/approvals').set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.approvals).toHaveLength(1);
    expect(res.body.approvals[0].decision).toBe('APPROVED');
    expect(res.body.approvals[0].user.name).toBe('Jane Director');
  });

  it('returns 200 with empty array when no approvals', async () => {
    mockOptionWithMembership();
    mockedPrisma.approval.findMany.mockResolvedValue([]);

    const res = await request(app).get('/api/options/opt-1/approvals').set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.approvals).toHaveLength(0);
  });

  it('returns 403 when not a production member', async () => {
    mockedPrisma.option.findUnique.mockResolvedValue({
      id: 'opt-1',
      elementId: 'elem-1',
      element: { script: { productionId: 'prod-1' } },
    } as any);
    mockedPrisma.productionMember.findUnique.mockResolvedValue(null);

    const res = await request(app).get('/api/options/opt-1/approvals').set(authHeader());

    expect(res.status).toBe(403);
  });
});

// ── GET /api/productions/:productionId/feed ──────────────────────

describe('GET /api/productions/:productionId/feed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with elements having ready-for-review options', async () => {
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'OWNER',
    } as any);

    mockedPrisma.element.findMany.mockResolvedValue([
      {
        id: 'elem-1',
        name: 'JOHN',
        type: 'CHARACTER',
        pageNumbers: [1, 5],
        status: 'ACTIVE',
        options: [
          {
            id: 'opt-1',
            mediaType: 'IMAGE',
            description: 'Costume ref',
            readyForReview: true,
            status: 'ACTIVE',
            uploadedBy: { id: 'user-2', name: 'Alice' },
            approvals: [
              {
                id: 'appr-1',
                decision: 'MAYBE',
                note: 'Need more',
                userId: 'user-1',
                createdAt: new Date(),
                user: { id: 'user-1', name: 'Jane Director' },
              },
            ],
          },
        ],
      },
    ] as any);

    const res = await request(app).get('/api/productions/prod-1/feed').set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.elements).toHaveLength(1);
    expect(res.body.elements[0].name).toBe('JOHN');
    expect(res.body.elements[0].options).toHaveLength(1);
    expect(res.body.elements[0].options[0].uploadedBy.name).toBe('Alice');
  });

  it('returns 200 with empty array when no elements have ready options', async () => {
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'OWNER',
    } as any);

    mockedPrisma.element.findMany.mockResolvedValue([]);

    const res = await request(app).get('/api/productions/prod-1/feed').set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.elements).toHaveLength(0);
  });

  it('includes latest approval per option', async () => {
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
    } as any);

    mockedPrisma.element.findMany.mockResolvedValue([
      {
        id: 'elem-1',
        name: 'BEACH',
        type: 'LOCATION',
        pageNumbers: [3],
        status: 'ACTIVE',
        options: [
          {
            id: 'opt-1',
            mediaType: 'IMAGE',
            readyForReview: true,
            status: 'ACTIVE',
            uploadedBy: { id: 'user-2', name: 'Bob' },
            approvals: [
              {
                id: 'appr-2',
                decision: 'APPROVED',
                note: null,
                userId: 'user-1',
                createdAt: new Date('2026-02-23T12:00:00Z'),
                user: { id: 'user-1', name: 'Jane' },
              },
              {
                id: 'appr-1',
                decision: 'REJECTED',
                note: 'Too dark',
                userId: 'user-1',
                createdAt: new Date('2026-02-22T12:00:00Z'),
                user: { id: 'user-1', name: 'Jane' },
              },
            ],
          },
        ],
      },
    ] as any);

    const res = await request(app).get('/api/productions/prod-1/feed').set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.elements[0].options[0].approvals).toHaveLength(2);
  });

  it('returns 403 when not a production member', async () => {
    mockedPrisma.productionMember.findUnique.mockResolvedValue(null);

    const res = await request(app).get('/api/productions/prod-1/feed').set(authHeader());

    expect(res.status).toBe(403);
  });

  it('queries only ACTIVE elements with ACTIVE ready-for-review options', async () => {
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
    } as any);
    mockedPrisma.element.findMany.mockResolvedValue([]);

    await request(app).get('/api/productions/prod-1/feed').set(authHeader());

    expect(mockedPrisma.element.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'ACTIVE',
          options: {
            some: {
              readyForReview: true,
              status: 'ACTIVE',
            },
          },
        }),
      }),
    );
  });
});
