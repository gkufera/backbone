import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { signToken } from '../lib/jwt.js';

// Mock Prisma client
vi.mock('../lib/prisma.js', () => ({
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

// ── Workflow state transitions on approval ──────────────────────────

describe('Workflow state on approval', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets element workflowState to APPROVED when option approved', async () => {
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
    expect(mockedPrisma.element.update).toHaveBeenCalledWith({
      where: { id: 'elem-1' },
      data: { workflowState: 'APPROVED' },
    });
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
      role: 'OWNER',
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
      role: 'OWNER',
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
});

// ── Workflow state transitions on readyForReview ────────────────────

describe('Workflow state on readyForReview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
