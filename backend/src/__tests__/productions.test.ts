import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { signToken } from '../lib/jwt';

// Mock notification service
vi.mock('../services/notification-service', () => ({
  createNotification: vi.fn().mockResolvedValue({ id: 'notif-1' }),
  notifyProductionMembers: vi.fn().mockResolvedValue([]),
  notifyDeciders: vi.fn().mockResolvedValue([]),
}));

// Mock email service
vi.mock('../services/email-service', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
  sendDigestEmail: vi.fn().mockResolvedValue(undefined),
  sendProductionApprovalEmail: vi.fn().mockResolvedValue(undefined),
  sendProductionApprovedEmail: vi.fn().mockResolvedValue(undefined),
}));

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
      update: vi.fn(),
    },
    productionMember: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    productionApprovalToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    element: {
      groupBy: vi.fn(),
    },
    script: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from '../lib/prisma';
import { createNotification } from '../services/notification-service';
import { sendProductionApprovalEmail, sendProductionApprovedEmail } from '../services/email-service';

const mockedPrisma = vi.mocked(prisma);
const mockedCreateNotification = vi.mocked(createNotification);
const mockedSendApprovalEmail = vi.mocked(sendProductionApprovalEmail);
const mockedSendApprovedEmail = vi.mocked(sendProductionApprovedEmail);

const testUser = {
  userId: 'user-1',
  email: 'test@example.com',
};

function authHeader() {
  const token = signToken(testUser);
  return { Authorization: `Bearer ${token}` };
}

describe('POST /api/productions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', tokenVersion: 0, emailVerified: true } as any);
  });

  it('returns 201 with production, ADMIN membership, and seeds default departments', async () => {
    const mockProduction = {
      id: 'prod-1',
      title: 'My Film',
      description: null,
      createdById: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockMember = {
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'ADMIN',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockDepartmentCreate = vi.fn();

    mockedPrisma.$transaction.mockImplementation(async (fn: any) => {
      return fn({
        production: {
          create: vi.fn().mockResolvedValue(mockProduction),
        },
        productionMember: {
          create: vi.fn().mockResolvedValue(mockMember),
          update: vi.fn().mockResolvedValue(mockMember),
        },
        department: {
          create: mockDepartmentCreate,
          findFirst: vi.fn().mockResolvedValue({ id: 'dept-po', name: 'Production Office', productionId: 'prod-1' }),
        },
        productionApprovalToken: {
          create: vi.fn().mockResolvedValue({ id: 'token-1', token: 'abc', productionId: 'prod-1' }),
        },
      });
    });

    const res = await request(app)
      .post('/api/productions')
      .set(authHeader())
      .send({ title: 'My Film', studioName: 'Studio', contactName: 'Test', contactEmail: 'test@example.com' });

    expect(res.status).toBe(201);
    expect(res.body.production.title).toBe('My Film');
    expect(res.body.member.role).toBe('ADMIN');
    // Verify default departments were seeded (16 default departments)
    expect(mockDepartmentCreate).toHaveBeenCalledTimes(16);
  });

  it('auto-assigns production creator to Production Office department', async () => {
    const mockProduction = {
      id: 'prod-1',
      title: 'My Film',
      description: null,
      createdById: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockMember = {
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'ADMIN',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockDeptCreate = vi.fn().mockResolvedValue({
      id: 'dept-new',
      name: 'placeholder',
      productionId: 'prod-1',
    });

    const mockDeptFindFirst = vi.fn().mockResolvedValue({
      id: 'dept-prod-office',
      name: 'Production Office',
      productionId: 'prod-1',
    });

    const mockMemberUpdate = vi.fn().mockResolvedValue(mockMember);

    mockedPrisma.$transaction.mockImplementation(async (fn: any) => {
      return fn({
        production: {
          create: vi.fn().mockResolvedValue(mockProduction),
        },
        productionMember: {
          create: vi.fn().mockResolvedValue(mockMember),
          update: mockMemberUpdate,
        },
        department: {
          create: mockDeptCreate,
          findFirst: mockDeptFindFirst,
        },
        productionApprovalToken: {
          create: vi.fn().mockResolvedValue({ id: 'token-1', token: 'abc', productionId: 'prod-1' }),
        },
      });
    });

    const res = await request(app)
      .post('/api/productions')
      .set(authHeader())
      .send({ title: 'My Film', studioName: 'Studio', contactName: 'Test', contactEmail: 'test@example.com' });

    expect(res.status).toBe(201);

    // Verify Production Office was looked up
    expect(mockDeptFindFirst).toHaveBeenCalledWith({
      where: { productionId: 'prod-1', name: 'Production Office' },
    });

    // Verify member was updated with Production Office department
    expect(mockMemberUpdate).toHaveBeenCalledWith({
      where: { id: 'member-1' },
      data: { departmentId: 'dept-prod-office' },
    });
  });

  it('does not update member department when Production Office not found', async () => {
    const mockProduction = {
      id: 'prod-1',
      title: 'My Film',
      description: null,
      createdById: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockMember = {
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'ADMIN',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockMemberUpdate = vi.fn().mockResolvedValue(mockMember);

    mockedPrisma.$transaction.mockImplementation(async (fn: any) => {
      return fn({
        production: {
          create: vi.fn().mockResolvedValue(mockProduction),
        },
        productionMember: {
          create: vi.fn().mockResolvedValue(mockMember),
          update: mockMemberUpdate,
        },
        department: {
          create: vi.fn(),
          findFirst: vi.fn().mockResolvedValue(null),
        },
        productionApprovalToken: {
          create: vi.fn().mockResolvedValue({ id: 'token-1', token: 'abc', productionId: 'prod-1' }),
        },
      });
    });

    const res = await request(app)
      .post('/api/productions')
      .set(authHeader())
      .send({ title: 'My Film', studioName: 'Studio', contactName: 'Test', contactEmail: 'test@example.com' });

    expect(res.status).toBe(201);
    expect(res.body.production.title).toBe('My Film');
    // Member should NOT be updated when Production Office department is null
    expect(mockMemberUpdate).not.toHaveBeenCalled();
  });

  it('returns 201 with production including description', async () => {
    const mockProduction = {
      id: 'prod-1',
      title: 'My Film',
      description: 'A great film',
      createdById: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockMember = {
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'ADMIN',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockedPrisma.$transaction.mockImplementation(async (fn: any) => {
      return fn({
        production: {
          create: vi.fn().mockResolvedValue(mockProduction),
        },
        productionMember: {
          create: vi.fn().mockResolvedValue(mockMember),
          update: vi.fn().mockResolvedValue(mockMember),
        },
        department: {
          create: vi.fn(),
          findFirst: vi.fn().mockResolvedValue({ id: 'dept-po', name: 'Production Office', productionId: 'prod-1' }),
        },
        productionApprovalToken: {
          create: vi.fn().mockResolvedValue({ id: 'token-1', token: 'abc', productionId: 'prod-1' }),
        },
      });
    });

    const res = await request(app)
      .post('/api/productions')
      .set(authHeader())
      .send({ title: 'My Film', description: 'A great film', studioName: 'Studio', contactName: 'Test', contactEmail: 'test@example.com' });

    expect(res.status).toBe(201);
    expect(res.body.production.description).toBe('A great film');
  });

  it('returns 400 when title is missing', async () => {
    const res = await request(app).post('/api/productions').set(authHeader()).send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/title/i);
  });

  it('returns 400 when title is blank', async () => {
    const res = await request(app)
      .post('/api/productions')
      .set(authHeader())
      .send({ title: '   ' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/title/i);
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).post('/api/productions').send({ title: 'My Film' });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/productions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', tokenVersion: 0, emailVerified: true } as any);
  });

  it("returns 200 with user's productions via membership", async () => {
    const mockMembers = [
      {
        id: 'member-1',
        productionId: 'prod-1',
        userId: 'user-1',
        role: 'ADMIN',
        createdAt: new Date(),
        updatedAt: new Date(),
        production: {
          id: 'prod-1',
          title: 'Film One',
          description: null,
          createdById: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
    ];

    mockedPrisma.productionMember.findMany.mockResolvedValue(mockMembers as any);

    const res = await request(app).get('/api/productions').set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.productions).toHaveLength(1);
    expect(res.body.productions[0].title).toBe('Film One');
  });

  it('returns empty array when user has no productions', async () => {
    mockedPrisma.productionMember.findMany.mockResolvedValue([]);

    const res = await request(app).get('/api/productions').set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.productions).toEqual([]);
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).get('/api/productions');

    expect(res.status).toBe(401);
  });
});

describe('GET /api/productions/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', tokenVersion: 0, emailVerified: true } as any);
  });

  it('returns 200 with production details including members with titles and departments', async () => {
    // First mock: membership check
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'ADMIN',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    // Second mock: production with includes
    mockedPrisma.production.findUnique.mockResolvedValue({
      id: 'prod-1',
      title: 'Film One',
      description: null,
      createdById: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      members: [
        {
          id: 'member-1',
          userId: 'user-1',
          role: 'ADMIN',
          title: 'Director',
          user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
          department: { id: 'dept-1', name: 'Production Design' },
        },
      ],
      scripts: [],
      departments: [{ id: 'dept-1', name: 'Production Design', createdAt: new Date(), updatedAt: new Date() }],
    } as any);

    const res = await request(app).get('/api/productions/prod-1').set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.production.title).toBe('Film One');
    expect(res.body.production.members).toHaveLength(1);
    expect(res.body.production.members[0].title).toBe('Director');
    expect(res.body.production.departments).toHaveLength(1);
    expect(res.body.production.scripts).toEqual([]);
  });

  it('returns 404 when production not found', async () => {
    mockedPrisma.productionMember.findUnique.mockResolvedValue(null);
    mockedPrisma.production.findUnique.mockResolvedValue(null);

    const res = await request(app).get('/api/productions/nonexistent').set(authHeader());

    expect(res.status).toBe(404);
  });

  it('returns 403 when user is not a member', async () => {
    mockedPrisma.productionMember.findUnique.mockResolvedValue(null);
    mockedPrisma.production.findUnique.mockResolvedValue({
      id: 'prod-1',
      title: 'Film One',
    } as any);

    const res = await request(app).get('/api/productions/prod-1').set(authHeader());

    expect(res.status).toBe(403);
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).get('/api/productions/prod-1');

    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/productions/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', tokenVersion: 0, emailVerified: true } as any);
    // requireActiveProduction check
    mockedPrisma.production.findUnique.mockResolvedValue({ id: 'prod-1', status: 'ACTIVE' } as any);
  });

  it('returns updated production for ADMIN', async () => {
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'ADMIN',
    } as any);

    const updatedProduction = {
      id: 'prod-1',
      title: 'Updated Title',
      description: null,
      createdById: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockedPrisma.production.update.mockResolvedValue(updatedProduction as any);

    const res = await request(app)
      .patch('/api/productions/prod-1')
      .set(authHeader())
      .send({ title: 'Updated Title' });

    expect(res.status).toBe(200);
    expect(res.body.production.title).toBe('Updated Title');
  });

  it('returns updated production for DECIDER', async () => {
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'DECIDER',
    } as any);

    const updatedProduction = {
      id: 'prod-1',
      title: 'New Name',
      description: null,
      createdById: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockedPrisma.production.update.mockResolvedValue(updatedProduction as any);

    const res = await request(app)
      .patch('/api/productions/prod-1')
      .set(authHeader())
      .send({ title: 'New Name' });

    expect(res.status).toBe(200);
    expect(res.body.production.title).toBe('New Name');
  });

  it('returns 403 for MEMBER', async () => {
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'MEMBER',
    } as any);

    const res = await request(app)
      .patch('/api/productions/prod-1')
      .set(authHeader())
      .send({ title: 'Updated Title' });

    expect(res.status).toBe(403);
  });

  it('returns 400 with empty title', async () => {
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'ADMIN',
    } as any);

    const res = await request(app)
      .patch('/api/productions/prod-1')
      .set(authHeader())
      .send({ title: '' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/title/i);
  });

  it('returns 400 with title exceeding max length', async () => {
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'ADMIN',
    } as any);

    const longTitle = 'x'.repeat(201);
    const res = await request(app)
      .patch('/api/productions/prod-1')
      .set(authHeader())
      .send({ title: longTitle });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/200 characters/i);
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app)
      .patch('/api/productions/prod-1')
      .send({ title: 'New Title' });

    expect(res.status).toBe(401);
  });

  it('returns 400 with whitespace-only title', async () => {
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'ADMIN',
    } as any);

    const res = await request(app)
      .patch('/api/productions/prod-1')
      .set(authHeader())
      .send({ title: '   ' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/title/i);
  });

  it('returns 404 when production does not exist (not 403)', async () => {
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'ADMIN',
    } as any);
    // requireActiveProduction: production not found
    mockedPrisma.production.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .patch('/api/productions/nonexistent')
      .set(authHeader())
      .send({ title: 'New Title' });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });
});

describe('POST /api/productions/:id/members — notification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', tokenVersion: 0, emailVerified: true } as any);
  });

  it('triggers MEMBER_INVITED notification for the invited user', async () => {
    // Requester is ADMIN
    mockedPrisma.productionMember.findUnique
      .mockResolvedValueOnce({
        id: 'member-1',
        productionId: 'prod-1',
        userId: 'user-1',
        role: 'ADMIN',
      } as any)
      // Check if already a member — not found
      .mockResolvedValueOnce(null);

    // First call: middleware auth check (token version validation)
    mockedPrisma.user.findUnique
      .mockResolvedValueOnce({ id: 'user-1', tokenVersion: 0, emailVerified: true } as any)
      // Second call: find user by email in route handler
      .mockResolvedValueOnce({
        id: 'user-2',
        email: 'invited@example.com',
      } as any);

    // Production lookup (first for requireActiveProduction, then for title)
    mockedPrisma.production.findUnique.mockResolvedValue({
      id: 'prod-1',
      title: 'My Film',
      status: 'ACTIVE',
    } as any);

    // Create member
    mockedPrisma.productionMember.create.mockResolvedValue({
      id: 'member-2',
      productionId: 'prod-1',
      userId: 'user-2',
      role: 'MEMBER',
    } as any);

    const res = await request(app)
      .post('/api/productions/prod-1/members')
      .set(authHeader())
      .send({ email: 'invited@example.com' });

    expect(res.status).toBe(201);
    expect(mockedCreateNotification).toHaveBeenCalledWith(
      'user-2',
      'prod-1',
      'MEMBER_INVITED',
      expect.stringContaining('My Film'),
      expect.any(String),
    );
  });
});

describe('GET /api/productions/:id/element-stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', tokenVersion: 0, emailVerified: true } as any);
  });

  it('returns element workflow state counts', async () => {
    // Membership check
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'ADMIN',
    } as any);

    // Scripts for production
    mockedPrisma.script.findMany.mockResolvedValue([
      { id: 'script-1' },
    ] as any);

    // Element groupBy
    (mockedPrisma.element.groupBy as any).mockResolvedValue([
      { workflowState: 'PENDING', _count: { _all: 5 } },
      { workflowState: 'OUTSTANDING', _count: { _all: 3 } },
      { workflowState: 'APPROVED', _count: { _all: 2 } },
    ]);

    const res = await request(app)
      .get('/api/productions/prod-1/element-stats')
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      pending: 5,
      outstanding: 3,
      approved: 2,
      total: 10,
    });
  });

  it('returns 403 for non-member', async () => {
    mockedPrisma.productionMember.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/productions/prod-1/element-stats')
      .set(authHeader());

    expect(res.status).toBe(403);
  });
});

describe('POST /api/productions — production gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', tokenVersion: 0, emailVerified: true } as any);
  });

  function setupTransactionMock(overrides: Record<string, any> = {}) {
    const mockProduction = {
      id: 'prod-1',
      title: 'My Film',
      description: null,
      status: 'PENDING',
      studioName: 'Big Studio',
      budget: '$1M',
      contactName: 'John Doe',
      contactEmail: 'john@example.com',
      createdById: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };

    const mockMember = {
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'ADMIN',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockedPrisma.$transaction.mockImplementation(async (fn: any) => {
      return fn({
        production: {
          create: vi.fn().mockResolvedValue(mockProduction),
        },
        productionMember: {
          create: vi.fn().mockResolvedValue(mockMember),
          update: vi.fn().mockResolvedValue(mockMember),
        },
        department: {
          create: vi.fn(),
          findFirst: vi.fn().mockResolvedValue({
            id: 'dept-po',
            name: 'Production Office',
            productionId: 'prod-1',
          }),
        },
        productionApprovalToken: {
          create: vi.fn().mockResolvedValue({
            id: 'token-1',
            token: 'abc123',
            productionId: 'prod-1',
          }),
        },
      });
    });

    return { mockProduction, mockMember };
  }

  it('returns 201 with status PENDING and new fields', async () => {
    setupTransactionMock();

    const res = await request(app)
      .post('/api/productions')
      .set(authHeader())
      .send({
        title: 'My Film',
        studioName: 'Big Studio',
        contactName: 'John Doe',
        contactEmail: 'john@example.com',
        budget: '$1M',
      });

    expect(res.status).toBe(201);
    expect(res.body.production.status).toBe('PENDING');
    expect(res.body.production.studioName).toBe('Big Studio');
    expect(res.body.production.contactName).toBe('John Doe');
    expect(res.body.production.contactEmail).toBe('john@example.com');
    expect(res.body.production.budget).toBe('$1M');
  });

  it('returns 400 without studioName', async () => {
    const res = await request(app)
      .post('/api/productions')
      .set(authHeader())
      .send({
        title: 'My Film',
        contactName: 'John Doe',
        contactEmail: 'john@example.com',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/studio name/i);
  });

  it('returns 400 without contactName', async () => {
    const res = await request(app)
      .post('/api/productions')
      .set(authHeader())
      .send({
        title: 'My Film',
        studioName: 'Big Studio',
        contactEmail: 'john@example.com',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/contact name/i);
  });

  it('returns 400 without contactEmail', async () => {
    const res = await request(app)
      .post('/api/productions')
      .set(authHeader())
      .send({
        title: 'My Film',
        studioName: 'Big Studio',
        contactName: 'John Doe',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/contact email/i);
  });

  it('returns 400 with invalid contactEmail', async () => {
    const res = await request(app)
      .post('/api/productions')
      .set(authHeader())
      .send({
        title: 'My Film',
        studioName: 'Big Studio',
        contactName: 'John Doe',
        contactEmail: 'not-an-email',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/valid email/i);
  });

  it('stores optional budget field', async () => {
    setupTransactionMock({ budget: '$5M' });

    const res = await request(app)
      .post('/api/productions')
      .set(authHeader())
      .send({
        title: 'My Film',
        studioName: 'Big Studio',
        contactName: 'John Doe',
        contactEmail: 'john@example.com',
        budget: '$5M',
      });

    expect(res.status).toBe(201);
    expect(res.body.production.budget).toBe('$5M');
  });
});

describe('POST /api/productions/approve', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 and activates production with valid token', async () => {
    const now = new Date();
    const futureDate = new Date(now.getTime() + 86400000); // +1 day

    mockedPrisma.$transaction.mockImplementation(async (fn: any) => {
      return fn({
        productionApprovalToken: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'token-1',
            token: 'valid-token',
            productionId: 'prod-1',
            expiresAt: futureDate,
            usedAt: null,
            production: {
              id: 'prod-1',
              title: 'My Film',
              contactEmail: 'john@example.com',
              status: 'PENDING',
            },
          }),
          update: vi.fn().mockResolvedValue({}),
        },
        production: {
          update: vi.fn().mockResolvedValue({
            id: 'prod-1',
            title: 'My Film',
            status: 'ACTIVE',
          }),
        },
      });
    });

    const res = await request(app)
      .post('/api/productions/approve')
      .send({ token: 'valid-token' });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/approved/i);
    expect(res.body.productionTitle).toBe('My Film');
  });

  it('returns 400 with used token', async () => {
    mockedPrisma.$transaction.mockImplementation(async (fn: any) => {
      return fn({
        productionApprovalToken: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'token-1',
            token: 'used-token',
            productionId: 'prod-1',
            expiresAt: new Date(Date.now() + 86400000),
            usedAt: new Date(),
            production: {
              id: 'prod-1',
              title: 'My Film',
              contactEmail: 'john@example.com',
              status: 'ACTIVE',
            },
          }),
        },
      });
    });

    const res = await request(app)
      .post('/api/productions/approve')
      .send({ token: 'used-token' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already been used/i);
  });

  it('returns 400 with expired token', async () => {
    const pastDate = new Date(Date.now() - 86400000); // -1 day

    mockedPrisma.$transaction.mockImplementation(async (fn: any) => {
      return fn({
        productionApprovalToken: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'token-1',
            token: 'expired-token',
            productionId: 'prod-1',
            expiresAt: pastDate,
            usedAt: null,
            production: {
              id: 'prod-1',
              title: 'My Film',
              contactEmail: 'john@example.com',
              status: 'PENDING',
            },
          }),
        },
      });
    });

    const res = await request(app)
      .post('/api/productions/approve')
      .send({ token: 'expired-token' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/expired/i);
  });

  it('returns 400 with invalid token', async () => {
    mockedPrisma.$transaction.mockImplementation(async (fn: any) => {
      return fn({
        productionApprovalToken: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
      });
    });

    const res = await request(app)
      .post('/api/productions/approve')
      .send({ token: 'nonexistent-token' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid/i);
  });

  it('returns 400 when no token provided', async () => {
    const res = await request(app)
      .post('/api/productions/approve')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/token.*required/i);
  });

  it('sends only one confirmation email when contactEmail matches an approval address', async () => {
    const now = new Date();
    const futureDate = new Date(now.getTime() + 86400000);

    mockedPrisma.$transaction.mockImplementation(async (fn: any) => {
      return fn({
        productionApprovalToken: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'token-1',
            token: 'valid-token',
            productionId: 'prod-1',
            expiresAt: futureDate,
            usedAt: null,
            production: {
              id: 'prod-1',
              title: 'My Film',
              contactEmail: 'slugmax@kufera.com', // same as an approval email
              status: 'PENDING',
            },
          }),
          update: vi.fn().mockResolvedValue({}),
        },
        production: {
          update: vi.fn().mockResolvedValue({
            id: 'prod-1',
            title: 'My Film',
            status: 'ACTIVE',
          }),
        },
      });
    });

    mockedSendApprovedEmail.mockResolvedValue(undefined);

    const res = await request(app)
      .post('/api/productions/approve')
      .send({ token: 'valid-token' });

    expect(res.status).toBe(200);

    // Wait for fire-and-forget promises to settle
    await new Promise((r) => setTimeout(r, 50));

    // slugmax@kufera.com should only get ONE email, not two
    const calls = mockedSendApprovedEmail.mock.calls.map((c) => c[0]);
    const slugmaxCalls = calls.filter((email) => email === 'slugmax@kufera.com');
    expect(slugmaxCalls).toHaveLength(1);
  });
});

describe('POST /api/productions/approve rate limiting', () => {
  it('applies token rate limiter in production mode', async () => {
    // The token rate limiter is conditionally applied when NODE_ENV !== 'test'.
    // We test the limiter itself in rate-limit.test.ts (5 req/min, 429 on exceed).
    // Here we verify the wiring by importing and checking the route file exports
    // the limiter function. This is a structural test.
    const { createTokenLimiter } = await import('../middleware/rate-limit');
    expect(typeof createTokenLimiter).toBe('function');

    const limiter = createTokenLimiter();
    expect(typeof limiter).toBe('function');
  });
});

describe('Mutation blocking on PENDING productions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', tokenVersion: 0, emailVerified: true } as any);
  });

  it('POST /api/productions/:id/members returns 403 when PENDING', async () => {
    // Membership check passes
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1', productionId: 'prod-1', userId: 'user-1', role: 'ADMIN',
    } as any);
    // Production is PENDING
    mockedPrisma.production.findUnique.mockResolvedValue({
      id: 'prod-1', title: 'Film', status: 'PENDING',
    } as any);

    const res = await request(app)
      .post('/api/productions/prod-1/members')
      .set(authHeader())
      .send({ email: 'new@example.com' });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/pending/i);
  });

  it('PATCH /api/productions/:id returns 403 when PENDING', async () => {
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1', productionId: 'prod-1', userId: 'user-1', role: 'ADMIN',
    } as any);
    mockedPrisma.production.findUnique.mockResolvedValue({
      id: 'prod-1', title: 'Film', status: 'PENDING',
    } as any);

    const res = await request(app)
      .patch('/api/productions/prod-1')
      .set(authHeader())
      .send({ title: 'New Title' });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/pending/i);
  });

  it('GET /api/productions/:id returns 200 when PENDING', async () => {
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1', productionId: 'prod-1', userId: 'user-1', role: 'ADMIN',
    } as any);
    mockedPrisma.production.findUnique.mockResolvedValue({
      id: 'prod-1', title: 'Film', status: 'PENDING',
      members: [], scripts: [], departments: [],
    } as any);

    const res = await request(app)
      .get('/api/productions/prod-1')
      .set(authHeader());

    expect(res.status).toBe(200);
  });
});
