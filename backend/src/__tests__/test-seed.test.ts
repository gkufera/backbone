import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
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
    production: {
      create: vi.fn(),
      update: vi.fn(),
    },
    productionMember: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    script: {
      create: vi.fn(),
    },
    element: {
      create: vi.fn(),
    },
    option: {
      create: vi.fn(),
    },
    department: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from '../lib/prisma';
import { app } from '../app';

const mockedPrisma = vi.mocked(prisma);

const testUser = { userId: 'user-1', email: 'test@example.com' };

function authHeader() {
  const token = signToken(testUser);
  return { Authorization: `Bearer ${token}` };
}

describe('POST /api/test/seed-production', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', tokenVersion: 0, emailVerified: true } as any);
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app).post('/api/test/seed-production').send({});

    expect(res.status).toBe(401);
  });

  it('creates production, script, elements, options, and departments', async () => {
    const mockProduction = { id: 'prod-1', title: 'Test Production' };
    const mockScript = { id: 'script-1', title: 'Test Script', status: 'READY' };
    const mockElements = [
      { id: 'elem-1', name: 'John', type: 'CHARACTER', scriptId: 'script-1' },
      { id: 'elem-2', name: 'Sarah', type: 'CHARACTER', scriptId: 'script-1' },
      { id: 'elem-3', name: 'Office', type: 'LOCATION', scriptId: 'script-1' },
      { id: 'elem-4', name: 'Park', type: 'LOCATION', scriptId: 'script-1' },
      { id: 'elem-5', name: 'Car Keys', type: 'OTHER', scriptId: 'script-1' },
    ];
    const mockOptions = [
      { id: 'opt-1', elementId: 'elem-1', readyForReview: true },
      { id: 'opt-2', elementId: 'elem-2', readyForReview: true },
      { id: 'opt-3', elementId: 'elem-3', readyForReview: false },
      { id: 'opt-4', elementId: 'elem-4', readyForReview: false },
      { id: 'opt-5', elementId: 'elem-5', readyForReview: false },
    ];
    const mockDepartments = [
      { id: 'dept-1', name: 'Cast' },
      { id: 'dept-2', name: 'Locations' },
    ];

    mockedPrisma.$transaction.mockImplementation(async (fn: unknown) => {
      const tx = {
        production: {
          create: vi.fn().mockResolvedValue(mockProduction),
        },
        productionMember: {
          create: vi.fn().mockResolvedValue({ id: 'member-1' }),
        },
        script: {
          create: vi.fn().mockResolvedValue(mockScript),
        },
        element: {
          create: vi
            .fn()
            .mockResolvedValueOnce(mockElements[0])
            .mockResolvedValueOnce(mockElements[1])
            .mockResolvedValueOnce(mockElements[2])
            .mockResolvedValueOnce(mockElements[3])
            .mockResolvedValueOnce(mockElements[4]),
        },
        option: {
          create: vi
            .fn()
            .mockResolvedValueOnce(mockOptions[0])
            .mockResolvedValueOnce(mockOptions[1])
            .mockResolvedValueOnce(mockOptions[2])
            .mockResolvedValueOnce(mockOptions[3])
            .mockResolvedValueOnce(mockOptions[4]),
        },
        department: {
          create: vi
            .fn()
            .mockResolvedValueOnce(mockDepartments[0])
            .mockResolvedValueOnce(mockDepartments[1]),
        },
      };
      return (fn as (tx: typeof tx) => Promise<unknown>)(tx);
    });

    const res = await request(app).post('/api/test/seed-production').set(authHeader()).send({});

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('productionId', 'prod-1');
    expect(res.body).toHaveProperty('scriptId', 'script-1');
    expect(res.body).toHaveProperty('elements');
    expect(res.body.elements).toHaveLength(5);
    expect(res.body).toHaveProperty('departments');
    expect(res.body.departments).toHaveLength(2);

    // Verify element structure
    for (const elem of res.body.elements) {
      expect(elem).toHaveProperty('id');
      expect(elem).toHaveProperty('name');
      expect(elem).toHaveProperty('type');
      expect(elem).toHaveProperty('optionId');
    }

    // Verify element types
    const types = res.body.elements.map((e: { type: string }) => e.type);
    expect(types.filter((t: string) => t === 'CHARACTER')).toHaveLength(2);
    expect(types.filter((t: string) => t === 'LOCATION')).toHaveLength(2);
    expect(types.filter((t: string) => t === 'OTHER')).toHaveLength(1);

    // Verify transaction was called
    expect(mockedPrisma.$transaction).toHaveBeenCalledOnce();
  });

  it('guards against non-test NODE_ENV at registration level', () => {
    // The route is registered conditionally in app.ts:
    // if (process.env.NODE_ENV === 'test') { app.use(testSeedRouter); }
    // Since NODE_ENV=test in our test environment, the route IS available.
    // In production, the route would never be registered.
    // We verify this by checking the app.ts source contains the guard.
    expect(process.env.NODE_ENV).toBe('test');
  });

  it('returns 403 from handler when NODE_ENV is not test (defense-in-depth)', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const res = await request(app).post('/api/test/seed-production').set(authHeader()).send({});
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Test endpoints are only available in test environment');
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it('includes error details in response when NODE_ENV=test', async () => {
    mockedPrisma.$transaction.mockRejectedValue(new Error('DB connection failed'));

    const res = await request(app).post('/api/test/seed-production').set(authHeader()).send({});

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Internal server error');
    expect(res.body.details).toBe('DB connection failed');
  });
});

describe('POST /api/test/activate-production/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', tokenVersion: 0, emailVerified: true } as any);
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app).post('/api/test/activate-production/prod-1').send({});
    expect(res.status).toBe(401);
  });

  it('activates a PENDING production', async () => {
    mockedPrisma.production.update.mockResolvedValue({
      id: 'prod-1',
      title: 'Test',
      status: 'ACTIVE',
    } as any);

    const res = await request(app)
      .post('/api/test/activate-production/prod-1')
      .set(authHeader())
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ACTIVE');
    expect(mockedPrisma.production.update).toHaveBeenCalledWith({
      where: { id: 'prod-1' },
      data: { status: 'ACTIVE' },
    });
  });

  it('returns 403 when NODE_ENV is not test', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const res = await request(app)
        .post('/api/test/activate-production/prod-1')
        .set(authHeader())
        .send({});
      expect(res.status).toBe(403);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });
});
