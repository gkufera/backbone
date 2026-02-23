import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { signToken } from '../lib/jwt.js';

// Mock Prisma client
vi.mock('../lib/prisma.js', () => ({
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
    $transaction: vi.fn(),
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

describe('POST /api/productions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 201 with production and auto-creates OWNER membership', async () => {
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
      role: 'OWNER',
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
      });
    });

    const res = await request(app)
      .post('/api/productions')
      .set(authHeader())
      .send({ title: 'My Film' });

    expect(res.status).toBe(201);
    expect(res.body.production.title).toBe('My Film');
    expect(res.body.member.role).toBe('OWNER');
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
      role: 'OWNER',
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
        role: 'OWNER',
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

  it('returns 200 with production details, members, and scripts', async () => {
    // First mock: membership check
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'OWNER',
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
          role: 'OWNER',
          user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
        },
      ],
      scripts: [],
    } as any);

    const res = await request(app).get('/api/productions/prod-1').set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.production.title).toBe('Film One');
    expect(res.body.production.members).toHaveLength(1);
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
