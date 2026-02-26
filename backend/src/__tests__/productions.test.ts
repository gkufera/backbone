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

const mockedPrisma = vi.mocked(prisma);
const mockedCreateNotification = vi.mocked(createNotification);

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
        },
        department: {
          create: mockDepartmentCreate,
        },
      });
    });

    const res = await request(app)
      .post('/api/productions')
      .set(authHeader())
      .send({ title: 'My Film' });

    expect(res.status).toBe(201);
    expect(res.body.production.title).toBe('My Film');
    expect(res.body.member.role).toBe('ADMIN');
    // Verify default departments were seeded (16 default departments)
    expect(mockDepartmentCreate).toHaveBeenCalledTimes(16);
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
        },
        department: {
          create: vi.fn(),
        },
      });
    });

    const res = await request(app)
      .post('/api/productions')
      .set(authHeader())
      .send({ title: 'My Film', description: 'A great film' });

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
});

describe('POST /api/productions/:id/members — notification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    // Find user by email
    mockedPrisma.user.findUnique.mockResolvedValue({
      id: 'user-2',
      email: 'invited@example.com',
    } as any);

    // Production lookup for title
    mockedPrisma.production.findUnique.mockResolvedValue({
      id: 'prod-1',
      title: 'My Film',
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
