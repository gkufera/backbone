import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { signToken } from '../lib/jwt';

// Mock Prisma client
vi.mock('../lib/prisma', () => ({
  prisma: {
    notification: {
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    productionMember: {
      findUnique: vi.fn(),
    },
    user: {
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

function mockMembership() {
  mockedPrisma.productionMember.findUnique.mockResolvedValue({
    id: 'member-1',
    productionId: 'prod-1',
    userId: 'user-1',
    role: 'MEMBER',
  } as any);
}

// ── GET /api/productions/:productionId/notifications ────────────────

describe('GET /api/productions/:productionId/notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', tokenVersion: 0 } as any);
  });

  it('returns notifications for the authenticated user', async () => {
    mockMembership();
    mockedPrisma.notification.findMany.mockResolvedValue([
      {
        id: 'notif-1',
        userId: 'user-1',
        productionId: 'prod-1',
        type: 'OPTION_APPROVED',
        message: 'Your option was approved',
        link: '/productions/prod-1/feed',
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'notif-2',
        userId: 'user-1',
        productionId: 'prod-1',
        type: 'OPTION_READY',
        message: 'New option ready for review',
        link: null,
        read: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as any);

    const res = await request(app)
      .get('/api/productions/prod-1/notifications')
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.notifications).toHaveLength(2);
    expect(res.body.notifications[0].type).toBe('OPTION_APPROVED');
    expect(res.body.notifications[1].read).toBe(true);
  });

  it('returns only notifications for the specified production', async () => {
    mockMembership();
    mockedPrisma.notification.findMany.mockResolvedValue([]);

    await request(app)
      .get('/api/productions/prod-1/notifications')
      .set(authHeader());

    expect(mockedPrisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: 'user-1',
          productionId: 'prod-1',
        },
      }),
    );
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).get('/api/productions/prod-1/notifications');

    expect(res.status).toBe(401);
  });

  it('returns 403 when not a production member', async () => {
    mockedPrisma.productionMember.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/productions/prod-1/notifications')
      .set(authHeader());

    expect(res.status).toBe(403);
  });
});

// ── PATCH /api/notifications/:id/read ───────────────────────────────

describe('PATCH /api/notifications/:id/read', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', tokenVersion: 0 } as any);
  });

  it('marks a notification as read', async () => {
    mockedPrisma.notification.update.mockResolvedValue({
      id: 'notif-1',
      userId: 'user-1',
      productionId: 'prod-1',
      type: 'OPTION_APPROVED',
      message: 'Your option was approved',
      link: null,
      read: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const res = await request(app)
      .patch('/api/notifications/notif-1/read')
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.notification.read).toBe(true);
    expect(mockedPrisma.notification.update).toHaveBeenCalledWith({
      where: { id: 'notif-1', userId: 'user-1' },
      data: { read: true },
    });
  });

  it('returns 404 for non-existent notification', async () => {
    mockedPrisma.notification.update.mockRejectedValue(
      Object.assign(new Error('Record not found'), { code: 'P2025' }),
    );

    const res = await request(app)
      .patch('/api/notifications/nonexistent/read')
      .set(authHeader());

    expect(res.status).toBe(404);
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).patch('/api/notifications/notif-1/read');

    expect(res.status).toBe(401);
  });
});

// ── GET /api/productions/:productionId/notifications/unread-count ───

describe('GET /api/productions/:productionId/notifications/unread-count', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', tokenVersion: 0 } as any);
  });

  it('returns count of unread notifications', async () => {
    mockMembership();
    mockedPrisma.notification.count.mockResolvedValue(5);

    const res = await request(app)
      .get('/api/productions/prod-1/notifications/unread-count')
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(5);
    expect(mockedPrisma.notification.count).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        productionId: 'prod-1',
        read: false,
      },
    });
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).get(
      '/api/productions/prod-1/notifications/unread-count',
    );

    expect(res.status).toBe(401);
  });

  it('returns 403 when not a production member', async () => {
    mockedPrisma.productionMember.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/productions/prod-1/notifications/unread-count')
      .set(authHeader());

    expect(res.status).toBe(403);
  });
});
