import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { signToken } from '../lib/jwt';

// Mock Prisma client
vi.mock('../lib/prisma', () => ({
  prisma: {
    productionMember: {
      findUnique: vi.fn(),
    },
    notificationPreference: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
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

describe('GET /api/productions/:id/notification-preferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns defaults when no preference record exists', async () => {
    mockMembership();
    mockedPrisma.notificationPreference.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/productions/prod-1/notification-preferences')
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.preferences).toEqual({
      optionEmails: true,
      noteEmails: true,
      approvalEmails: true,
      scriptEmails: true,
      memberEmails: true,
      scopeFilter: 'ALL',
    });
  });

  it('returns saved preferences when record exists', async () => {
    mockMembership();
    mockedPrisma.notificationPreference.findUnique.mockResolvedValue({
      id: 'pref-1',
      userId: 'user-1',
      productionId: 'prod-1',
      optionEmails: false,
      noteEmails: true,
      approvalEmails: true,
      scriptEmails: false,
      memberEmails: true,
      scopeFilter: 'MY_DEPARTMENT',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const res = await request(app)
      .get('/api/productions/prod-1/notification-preferences')
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.preferences.optionEmails).toBe(false);
    expect(res.body.preferences.scriptEmails).toBe(false);
    expect(res.body.preferences.scopeFilter).toBe('MY_DEPARTMENT');
  });

  it('returns 403 for non-members', async () => {
    mockedPrisma.productionMember.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/productions/prod-1/notification-preferences')
      .set(authHeader());

    expect(res.status).toBe(403);
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app)
      .get('/api/productions/prod-1/notification-preferences');

    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/productions/:id/notification-preferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates preferences if none exist (upsert)', async () => {
    mockMembership();
    mockedPrisma.notificationPreference.upsert.mockResolvedValue({
      id: 'pref-1',
      userId: 'user-1',
      productionId: 'prod-1',
      optionEmails: false,
      noteEmails: true,
      approvalEmails: true,
      scriptEmails: true,
      memberEmails: true,
      scopeFilter: 'ALL',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const res = await request(app)
      .patch('/api/productions/prod-1/notification-preferences')
      .set(authHeader())
      .send({ optionEmails: false });

    expect(res.status).toBe(200);
    expect(res.body.preferences.optionEmails).toBe(false);
    expect(mockedPrisma.notificationPreference.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_productionId: {
            userId: 'user-1',
            productionId: 'prod-1',
          },
        },
      }),
    );
  });

  it('updates existing preferences', async () => {
    mockMembership();
    mockedPrisma.notificationPreference.upsert.mockResolvedValue({
      id: 'pref-1',
      userId: 'user-1',
      productionId: 'prod-1',
      optionEmails: true,
      noteEmails: false,
      approvalEmails: true,
      scriptEmails: true,
      memberEmails: true,
      scopeFilter: 'ALL',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const res = await request(app)
      .patch('/api/productions/prod-1/notification-preferences')
      .set(authHeader())
      .send({ noteEmails: false });

    expect(res.status).toBe(200);
    expect(res.body.preferences.noteEmails).toBe(false);
  });

  it('validates scopeFilter enum', async () => {
    mockMembership();

    const res = await request(app)
      .patch('/api/productions/prod-1/notification-preferences')
      .set(authHeader())
      .send({ scopeFilter: 'INVALID' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/scopeFilter/i);
  });

  it('returns 403 for non-members', async () => {
    mockedPrisma.productionMember.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .patch('/api/productions/prod-1/notification-preferences')
      .set(authHeader())
      .send({ optionEmails: false });

    expect(res.status).toBe(403);
  });
});
