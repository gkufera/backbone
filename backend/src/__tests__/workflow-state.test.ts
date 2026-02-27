import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { signToken } from '../lib/jwt';

// Mock Prisma client
vi.mock('../lib/prisma', () => ({
  prisma: {
    option: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    productionMember: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    approval: {
      create: vi.fn(),
    },
    element: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    production: {
      findUnique: vi.fn(),
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

// ── Workflow state transitions on approval ──────────────────────────

describe('Workflow state on approval', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', tokenVersion: 0, emailVerified: true } as any);
    mockedPrisma.production.findUnique.mockResolvedValue({ id: 'prod-1', status: 'ACTIVE' } as any);
  });

  it('does NOT set element workflowState to APPROVED when option approved (locking removed)', async () => {
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
      role: 'DECIDER',
    } as any);

    mockedPrisma.approval.create.mockResolvedValue({
      id: 'appr-1',
      optionId: 'opt-1',
      userId: 'user-1',
      decision: 'APPROVED',
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

  it('does not change workflowState on REJECTED decision', async () => {
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
      role: 'DECIDER',
    } as any);

    mockedPrisma.approval.create.mockResolvedValue({
      id: 'appr-2',
      optionId: 'opt-1',
      userId: 'user-1',
      decision: 'REJECTED',
      note: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    mockedPrisma.notification.create.mockResolvedValue({} as any);

    const res = await request(app)
      .post('/api/options/opt-1/approvals')
      .set(authHeader())
      .send({ decision: 'REJECTED' });

    expect(res.status).toBe(201);
    expect(mockedPrisma.element.update).not.toHaveBeenCalled();
  });

  it('does not change workflowState on MAYBE decision', async () => {
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
      role: 'DECIDER',
    } as any);

    mockedPrisma.approval.create.mockResolvedValue({
      id: 'appr-3',
      optionId: 'opt-1',
      userId: 'user-1',
      decision: 'MAYBE',
      note: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    mockedPrisma.notification.create.mockResolvedValue({} as any);

    const res = await request(app)
      .post('/api/options/opt-1/approvals')
      .set(authHeader())
      .send({ decision: 'MAYBE' });

    expect(res.status).toBe(201);
    expect(mockedPrisma.element.update).not.toHaveBeenCalled();
  });

  it('does not set element workflowState when MEMBER tentative APPROVED', async () => {
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

    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'MEMBER',
    } as any);

    mockedPrisma.approval.create.mockResolvedValue({
      id: 'appr-4',
      optionId: 'opt-1',
      userId: 'user-1',
      decision: 'APPROVED',
      tentative: true,
      note: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    mockedPrisma.notification.create.mockResolvedValue({} as any);
    mockedPrisma.productionMember.findMany.mockResolvedValue([]);

    const res = await request(app)
      .post('/api/options/opt-1/approvals')
      .set(authHeader())
      .send({ decision: 'APPROVED' });

    expect(res.status).toBe(201);
    expect(mockedPrisma.element.update).not.toHaveBeenCalled();
  });
});

// ── Workflow state transitions on readyForReview ────────────────────

describe('Workflow state on readyForReview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', tokenVersion: 0, emailVerified: true } as any);
    mockedPrisma.production.findUnique.mockResolvedValue({ id: 'prod-1', status: 'ACTIVE' } as any);
  });

  it('sets element workflowState to OUTSTANDING when option marked readyForReview', async () => {
    mockedPrisma.option.findUnique.mockResolvedValue({
      id: 'opt-1',
      elementId: 'elem-1',
      status: 'ACTIVE',
      uploadedById: 'user-1',
      element: {
        id: 'elem-1',
        status: 'ACTIVE',
        workflowState: 'PENDING',
        script: { productionId: 'prod-1' },
      },
    } as any);

    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'MEMBER',
    } as any);

    mockedPrisma.option.update.mockResolvedValue({
      id: 'opt-1',
      readyForReview: true,
    } as any);

    mockedPrisma.element.update.mockResolvedValue({} as any);
    mockedPrisma.productionMember.findMany.mockResolvedValue([]);
    mockedPrisma.notification.create.mockResolvedValue({} as any);

    const res = await request(app)
      .patch('/api/options/opt-1')
      .set(authHeader())
      .send({ readyForReview: true });

    expect(res.status).toBe(200);
    expect(mockedPrisma.element.update).toHaveBeenCalledWith({
      where: { id: 'elem-1' },
      data: { workflowState: 'OUTSTANDING' },
    });
  });

  it('does not downgrade workflowState from APPROVED to OUTSTANDING', async () => {
    mockedPrisma.option.findUnique.mockResolvedValue({
      id: 'opt-1',
      elementId: 'elem-1',
      status: 'ACTIVE',
      uploadedById: 'user-1',
      element: {
        id: 'elem-1',
        status: 'ACTIVE',
        workflowState: 'APPROVED',
        script: { productionId: 'prod-1' },
      },
    } as any);

    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'MEMBER',
    } as any);

    mockedPrisma.option.update.mockResolvedValue({
      id: 'opt-1',
      readyForReview: true,
    } as any);

    mockedPrisma.notification.create.mockResolvedValue({} as any);

    const res = await request(app)
      .patch('/api/options/opt-1')
      .set(authHeader())
      .send({ readyForReview: true });

    expect(res.status).toBe(200);
    expect(mockedPrisma.element.update).not.toHaveBeenCalled();
  });
});

// ── Notification triggers on approval ───────────────────────────────

describe('Notification triggers on approval', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', tokenVersion: 0, emailVerified: true } as any);
    mockedPrisma.production.findUnique.mockResolvedValue({ id: 'prod-1', status: 'ACTIVE' } as any);
  });

  it('creates notification for option uploader on APPROVED with link', async () => {
    mockedPrisma.option.findUnique.mockResolvedValue({
      id: 'opt-1',
      elementId: 'elem-1',
      status: 'ACTIVE',
      uploadedById: 'user-2',
      element: {
        id: 'elem-1',
        scriptId: 'script-1',
        status: 'ACTIVE',
        workflowState: 'OUTSTANDING',
        name: 'JOHN',
        script: { productionId: 'prod-1' },
      },
    } as any);

    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'DECIDER',
    } as any);

    mockedPrisma.approval.create.mockResolvedValue({
      id: 'appr-1',
      optionId: 'opt-1',
      userId: 'user-1',
      decision: 'APPROVED',
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
    expect(mockedPrisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-2',
        productionId: 'prod-1',
        type: 'OPTION_APPROVED',
        link: '/productions/prod-1/scripts/script-1/elements/elem-1',
      }),
    });
  });

  it('creates notification for option uploader on REJECTED with link', async () => {
    mockedPrisma.option.findUnique.mockResolvedValue({
      id: 'opt-1',
      elementId: 'elem-1',
      status: 'ACTIVE',
      uploadedById: 'user-2',
      element: {
        id: 'elem-1',
        scriptId: 'script-1',
        status: 'ACTIVE',
        workflowState: 'OUTSTANDING',
        name: 'JOHN',
        script: { productionId: 'prod-1' },
      },
    } as any);

    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'DECIDER',
    } as any);

    mockedPrisma.approval.create.mockResolvedValue({
      id: 'appr-2',
      optionId: 'opt-1',
      userId: 'user-1',
      decision: 'REJECTED',
      note: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    mockedPrisma.notification.create.mockResolvedValue({} as any);

    const res = await request(app)
      .post('/api/options/opt-1/approvals')
      .set(authHeader())
      .send({ decision: 'REJECTED' });

    expect(res.status).toBe(201);
    expect(mockedPrisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-2',
        productionId: 'prod-1',
        type: 'OPTION_REJECTED',
        link: '/productions/prod-1/scripts/script-1/elements/elem-1',
      }),
    });
  });

  it('does not notify the user who made the approval', async () => {
    // Uploader === approver
    mockedPrisma.option.findUnique.mockResolvedValue({
      id: 'opt-1',
      elementId: 'elem-1',
      status: 'ACTIVE',
      uploadedById: 'user-1', // same as approver
      element: {
        id: 'elem-1',
        status: 'ACTIVE',
        workflowState: 'OUTSTANDING',
        name: 'JOHN',
        script: { productionId: 'prod-1' },
      },
    } as any);

    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'DECIDER',
    } as any);

    mockedPrisma.approval.create.mockResolvedValue({
      id: 'appr-3',
      optionId: 'opt-1',
      userId: 'user-1',
      decision: 'APPROVED',
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
    expect(mockedPrisma.notification.create).not.toHaveBeenCalled();
  });
});

// ── Notification triggers on readyForReview ─────────────────────────

describe('Notification triggers on readyForReview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', tokenVersion: 0, emailVerified: true } as any);
    mockedPrisma.production.findUnique.mockResolvedValue({ id: 'prod-1', status: 'ACTIVE' } as any);
  });

  it('creates notifications for production members when option marked ready with link', async () => {
    mockedPrisma.option.findUnique.mockResolvedValue({
      id: 'opt-1',
      elementId: 'elem-1',
      status: 'ACTIVE',
      uploadedById: 'user-1',
      element: {
        id: 'elem-1',
        scriptId: 'script-1',
        status: 'ACTIVE',
        workflowState: 'PENDING',
        name: 'BEACH HOUSE',
        script: { productionId: 'prod-1' },
      },
    } as any);

    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'MEMBER',
    } as any);

    mockedPrisma.option.update.mockResolvedValue({
      id: 'opt-1',
      readyForReview: true,
    } as any);

    mockedPrisma.element.update.mockResolvedValue({} as any);

    // Other production members
    mockedPrisma.productionMember.findMany.mockResolvedValue([
      { userId: 'user-1' },
      { userId: 'user-2' },
      { userId: 'user-3' },
    ] as any);

    mockedPrisma.notification.create.mockResolvedValue({} as any);

    const res = await request(app)
      .patch('/api/options/opt-1')
      .set(authHeader())
      .send({ readyForReview: true });

    expect(res.status).toBe(200);
    // Should notify user-2 and user-3, not user-1 (the actor)
    expect(mockedPrisma.notification.create).toHaveBeenCalledTimes(2);
    expect(mockedPrisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-2',
        type: 'OPTION_READY',
        link: '/productions/prod-1/scripts/script-1/elements/elem-1',
      }),
    });
    expect(mockedPrisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-3',
        type: 'OPTION_READY',
        link: '/productions/prod-1/scripts/script-1/elements/elem-1',
      }),
    });
  });
});
