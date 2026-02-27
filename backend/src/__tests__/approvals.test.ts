import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { signToken } from '../lib/jwt';

// Mock Prisma client
vi.mock('../lib/prisma', () => ({
  prisma: {
    option: {
      findUnique: vi.fn(),
    },
    production: {
      findUnique: vi.fn(),
    },
    productionMember: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    approval: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
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

  mockedPrisma.production.findUnique.mockResolvedValue({ id: 'prod-1', status: 'ACTIVE' } as any);

  mockedPrisma.productionMember.findUnique.mockResolvedValue({
    id: 'member-1',
    productionId: 'prod-1',
    userId: 'user-1',
    role: 'DECIDER',
  } as any);
}

// ── POST /api/options/:optionId/approvals ──────────────────────────

describe('POST /api/options/:optionId/approvals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValueOnce({ id: 'user-1', tokenVersion: 0, emailVerified: true } as any);
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
      role: 'DECIDER',
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
      role: 'DECIDER',
    } as any);

    const res = await request(app)
      .post('/api/options/opt-1/approvals')
      .set(authHeader())
      .send({ decision: 'APPROVED' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/archived/i);
  });

  it('returns 403 when production is PENDING', async () => {
    mockedPrisma.option.findUnique.mockResolvedValue({
      id: 'opt-1',
      elementId: 'elem-1',
      status: 'ACTIVE',
      uploadedById: 'user-2',
      element: {
        id: 'elem-1',
        status: 'ACTIVE',
        script: { productionId: 'prod-1' },
      },
    } as any);
    mockedPrisma.production.findUnique.mockResolvedValue({ id: 'prod-1', status: 'PENDING' } as any);

    const res = await request(app)
      .post('/api/options/opt-1/approvals')
      .set(authHeader())
      .send({ decision: 'APPROVED' });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/pending/i);
  });
});

// ── Tentative approval logic ──────────────────────────────────────

describe('Tentative approval logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValueOnce({ id: 'user-1', tokenVersion: 0, emailVerified: true } as any);
  });

  it('MEMBER creates tentative approval and DECIDERs are notified', async () => {
    mockedPrisma.option.findUnique.mockResolvedValue({
      id: 'opt-1',
      elementId: 'elem-1',
      status: 'ACTIVE',
      uploadedById: 'user-2',
      element: {
        id: 'elem-1',
        status: 'ACTIVE',
        workflowState: 'OUTSTANDING',
        name: 'JOHN',
        scriptId: 'script-1',
        script: { productionId: 'prod-1' },
      },
    } as any);

    mockedPrisma.production.findUnique.mockResolvedValue({ id: 'prod-1', status: 'ACTIVE' } as any);

    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'MEMBER',
    } as any);

    mockedPrisma.approval.create.mockResolvedValue({
      id: 'appr-1',
      optionId: 'opt-1',
      userId: 'user-1',
      decision: 'APPROVED',
      tentative: true,
      note: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    // Mock decider members for notification
    mockedPrisma.productionMember.findMany.mockResolvedValue([
      { userId: 'user-decider-1' },
    ] as any);

    mockedPrisma.notification.create.mockResolvedValue({} as any);
    mockedPrisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/options/opt-1/approvals')
      .set(authHeader())
      .send({ decision: 'APPROVED' });

    expect(res.status).toBe(201);
    expect(mockedPrisma.approval.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ tentative: true }),
    });

    // DECIDERs should be notified via TENTATIVE_APPROVAL (excluding soft-deleted)
    expect(mockedPrisma.productionMember.findMany).toHaveBeenCalledWith({
      where: { productionId: 'prod-1', role: 'DECIDER', deletedAt: null },
      select: { userId: true },
    });
  });

  it('ADMIN creates tentative approval', async () => {
    mockedPrisma.option.findUnique.mockResolvedValue({
      id: 'opt-1',
      elementId: 'elem-1',
      status: 'ACTIVE',
      uploadedById: 'user-2',
      element: {
        id: 'elem-1',
        status: 'ACTIVE',
        workflowState: 'OUTSTANDING',
        name: 'JOHN',
        scriptId: 'script-1',
        script: { productionId: 'prod-1' },
      },
    } as any);

    mockedPrisma.production.findUnique.mockResolvedValue({ id: 'prod-1', status: 'ACTIVE' } as any);

    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'ADMIN',
    } as any);

    mockedPrisma.approval.create.mockResolvedValue({
      id: 'appr-1',
      optionId: 'opt-1',
      userId: 'user-1',
      decision: 'APPROVED',
      tentative: true,
      note: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    mockedPrisma.productionMember.findMany.mockResolvedValue([]);
    mockedPrisma.notification.create.mockResolvedValue({} as any);
    mockedPrisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/options/opt-1/approvals')
      .set(authHeader())
      .send({ decision: 'APPROVED' });

    expect(res.status).toBe(201);
    expect(mockedPrisma.approval.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ tentative: true }),
    });
  });

  it('DECIDER creates official (non-tentative) approval', async () => {
    mockOptionWithMembership();
    mockedPrisma.approval.create.mockResolvedValue({
      id: 'appr-1',
      optionId: 'opt-1',
      userId: 'user-1',
      decision: 'APPROVED',
      tentative: false,
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
    expect(mockedPrisma.approval.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ tentative: false }),
    });
  });

  it('tentative APPROVED does NOT lock element (no workflow state update)', async () => {
    mockedPrisma.option.findUnique.mockResolvedValue({
      id: 'opt-1',
      elementId: 'elem-1',
      status: 'ACTIVE',
      uploadedById: 'user-2',
      element: {
        id: 'elem-1',
        status: 'ACTIVE',
        workflowState: 'OUTSTANDING',
        name: 'JOHN',
        scriptId: 'script-1',
        script: { productionId: 'prod-1' },
      },
    } as any);

    mockedPrisma.production.findUnique.mockResolvedValue({ id: 'prod-1', status: 'ACTIVE' } as any);

    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'MEMBER',
    } as any);

    mockedPrisma.approval.create.mockResolvedValue({
      id: 'appr-1',
      optionId: 'opt-1',
      userId: 'user-1',
      decision: 'APPROVED',
      tentative: true,
      note: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    mockedPrisma.productionMember.findMany.mockResolvedValue([]);
    mockedPrisma.notification.create.mockResolvedValue({} as any);
    mockedPrisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/options/opt-1/approvals')
      .set(authHeader())
      .send({ decision: 'APPROVED' });

    expect(res.status).toBe(201);
    // Element should NOT be updated because the approval is tentative
    expect(mockedPrisma.element.update).not.toHaveBeenCalled();
  });

  it('official APPROVED does NOT update element workflowState (locking removed)', async () => {
    mockOptionWithMembership(); // DECIDER role
    mockedPrisma.approval.create.mockResolvedValue({
      id: 'appr-1',
      optionId: 'opt-1',
      userId: 'user-1',
      decision: 'APPROVED',
      tentative: false,
      note: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    mockedPrisma.notification.create.mockResolvedValue({} as any);

    const res = await request(app)
      .post('/api/options/opt-1/approvals')
      .set(authHeader())
      .send({ decision: 'APPROVED' });

    expect(res.status).toBe(201);
    // Element should NOT be updated — locking is removed
    expect(mockedPrisma.element.update).not.toHaveBeenCalled();
  });
});

// ── PATCH /api/approvals/:approvalId/confirm ─────────────────────

describe('PATCH /api/approvals/:approvalId/confirm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValueOnce({ id: 'user-1', tokenVersion: 0, emailVerified: true } as any);
  });

  it('DECIDER can confirm a tentative approval', async () => {
    mockedPrisma.approval.findUnique.mockResolvedValue({
      id: 'appr-1',
      optionId: 'opt-1',
      userId: 'user-2',
      decision: 'APPROVED',
      tentative: true,
      note: null,
      option: {
        id: 'opt-1',
        elementId: 'elem-1',
        element: {
          id: 'elem-1',
          scriptId: 'script-1',
          name: 'JOHN',
          script: { productionId: 'prod-1' },
        },
      },
    } as any);

    mockedPrisma.production.findUnique.mockResolvedValue({ id: 'prod-1', status: 'ACTIVE' } as any);

    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'DECIDER',
    } as any);

    mockedPrisma.approval.update.mockResolvedValue({
      id: 'appr-1',
      optionId: 'opt-1',
      userId: 'user-2',
      decision: 'APPROVED',
      tentative: false,
      note: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    mockedPrisma.element.update.mockResolvedValue({} as any);
    mockedPrisma.notification.create.mockResolvedValue({} as any);

    const res = await request(app)
      .patch('/api/approvals/appr-1/confirm')
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(mockedPrisma.approval.update).toHaveBeenCalledWith({
      where: { id: 'appr-1' },
      data: { tentative: false },
    });
  });

  it('confirming APPROVED does NOT update element workflowState (locking removed)', async () => {
    mockedPrisma.approval.findUnique.mockResolvedValue({
      id: 'appr-1',
      optionId: 'opt-1',
      userId: 'user-2',
      decision: 'APPROVED',
      tentative: true,
      note: null,
      option: {
        id: 'opt-1',
        elementId: 'elem-1',
        element: {
          id: 'elem-1',
          scriptId: 'script-1',
          name: 'JOHN',
          script: { productionId: 'prod-1' },
        },
      },
    } as any);

    mockedPrisma.production.findUnique.mockResolvedValue({ id: 'prod-1', status: 'ACTIVE' } as any);

    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'DECIDER',
    } as any);

    mockedPrisma.approval.update.mockResolvedValue({
      id: 'appr-1',
      decision: 'APPROVED',
      tentative: false,
    } as any);

    mockedPrisma.notification.create.mockResolvedValue({} as any);

    const res = await request(app)
      .patch('/api/approvals/appr-1/confirm')
      .set(authHeader());

    expect(res.status).toBe(200);
    // Element should NOT be updated — locking is removed
    expect(mockedPrisma.element.update).not.toHaveBeenCalled();
  });

  it('ADMIN cannot confirm tentative approval', async () => {
    mockedPrisma.approval.findUnique.mockResolvedValue({
      id: 'appr-1',
      optionId: 'opt-1',
      userId: 'user-2',
      decision: 'APPROVED',
      tentative: true,
      option: {
        id: 'opt-1',
        elementId: 'elem-1',
        element: {
          id: 'elem-1',
          script: { productionId: 'prod-1' },
        },
      },
    } as any);

    mockedPrisma.production.findUnique.mockResolvedValue({ id: 'prod-1', status: 'ACTIVE' } as any);

    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'ADMIN',
    } as any);

    const res = await request(app)
      .patch('/api/approvals/appr-1/confirm')
      .set(authHeader());

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/decider/i);
  });

  it('MEMBER cannot confirm tentative approval', async () => {
    mockedPrisma.approval.findUnique.mockResolvedValue({
      id: 'appr-1',
      optionId: 'opt-1',
      userId: 'user-2',
      decision: 'APPROVED',
      tentative: true,
      option: {
        id: 'opt-1',
        elementId: 'elem-1',
        element: {
          id: 'elem-1',
          script: { productionId: 'prod-1' },
        },
      },
    } as any);

    mockedPrisma.production.findUnique.mockResolvedValue({ id: 'prod-1', status: 'ACTIVE' } as any);

    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'MEMBER',
    } as any);

    const res = await request(app)
      .patch('/api/approvals/appr-1/confirm')
      .set(authHeader());

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/decider/i);
  });

  it('returns 404 when approval not found', async () => {
    mockedPrisma.approval.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .patch('/api/approvals/nonexistent/confirm')
      .set(authHeader());

    expect(res.status).toBe(404);
  });

  it('returns 400 when approval is already confirmed', async () => {
    mockedPrisma.approval.findUnique.mockResolvedValue({
      id: 'appr-1',
      optionId: 'opt-1',
      userId: 'user-2',
      decision: 'APPROVED',
      tentative: false,
      option: {
        id: 'opt-1',
        elementId: 'elem-1',
        element: {
          id: 'elem-1',
          script: { productionId: 'prod-1' },
        },
      },
    } as any);

    mockedPrisma.production.findUnique.mockResolvedValue({ id: 'prod-1', status: 'ACTIVE' } as any);

    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'DECIDER',
    } as any);

    const res = await request(app)
      .patch('/api/approvals/appr-1/confirm')
      .set(authHeader());

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already confirmed/i);
  });

  it('returns 403 when production is PENDING', async () => {
    mockedPrisma.approval.findUnique.mockResolvedValue({
      id: 'appr-1',
      optionId: 'opt-1',
      userId: 'user-2',
      decision: 'APPROVED',
      tentative: true,
      option: {
        id: 'opt-1',
        elementId: 'elem-1',
        element: {
          id: 'elem-1',
          script: { productionId: 'prod-1' },
        },
      },
    } as any);

    mockedPrisma.production.findUnique.mockResolvedValue({ id: 'prod-1', status: 'PENDING' } as any);

    const res = await request(app)
      .patch('/api/approvals/appr-1/confirm')
      .set(authHeader());

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/pending/i);
  });
});

// ── GET /api/options/:optionId/approvals ──────────────────────────

describe('GET /api/options/:optionId/approvals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValueOnce({ id: 'user-1', tokenVersion: 0, emailVerified: true } as any);
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
    mockedPrisma.user.findUnique.mockResolvedValueOnce({ id: 'user-1', tokenVersion: 0, emailVerified: true } as any);
  });

  it('returns 200 with elements having ready-for-review options', async () => {
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'DECIDER',
    } as any);

    mockedPrisma.element.findMany.mockResolvedValue([
      {
        id: 'elem-1',
        name: 'JOHN',
        type: 'CHARACTER',
        highlightPage: 1,
        highlightText: 'JOHN',
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

  it('returns options with assets array', async () => {
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'DECIDER',
    } as any);

    mockedPrisma.element.findMany.mockResolvedValue([
      {
        id: 'elem-1',
        name: 'JOHN',
        type: 'CHARACTER',
        highlightPage: 1,
        highlightText: 'JOHN',
        status: 'ACTIVE',
        options: [
          {
            id: 'opt-1',
            mediaType: 'IMAGE',
            description: 'Multi-photo',
            readyForReview: true,
            status: 'ACTIVE',
            uploadedBy: { id: 'user-2', name: 'Alice' },
            approvals: [],
            assets: [
              { id: 'asset-1', s3Key: 'options/uuid/p1.jpg', fileName: 'p1.jpg', mediaType: 'IMAGE', sortOrder: 0 },
              { id: 'asset-2', s3Key: 'options/uuid/p2.jpg', fileName: 'p2.jpg', mediaType: 'IMAGE', sortOrder: 1 },
            ],
          },
        ],
      },
    ] as any);

    const res = await request(app).get('/api/productions/prod-1/feed').set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.elements[0].options[0].assets).toHaveLength(2);
    expect(res.body.elements[0].options[0].assets[0].s3Key).toBe('options/uuid/p1.jpg');

    // Verify the query includes assets
    expect(mockedPrisma.element.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          options: expect.objectContaining({
            include: expect.objectContaining({
              assets: expect.anything(),
            }),
          }),
        }),
      }),
    );
  });

  it('returns 200 with empty array when no elements have ready options', async () => {
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'DECIDER',
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
        highlightPage: 3,
        highlightText: 'BEACH',
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
