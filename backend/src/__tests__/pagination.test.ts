import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// Mock Prisma
vi.mock('../lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    productionMember: { findUnique: vi.fn(), findMany: vi.fn() },
    notification: { findMany: vi.fn(), count: vi.fn() },
    element: { findMany: vi.fn(), findUnique: vi.fn(), count: vi.fn() },
    option: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
    optionAsset: { findFirst: vi.fn(), create: vi.fn() },
    approval: { findMany: vi.fn(), findFirst: vi.fn() },
    note: { findMany: vi.fn() },
    directorNote: { findMany: vi.fn() },
    department: { findMany: vi.fn() },
    script: { findMany: vi.fn(), findUnique: vi.fn() },
    production: { findMany: vi.fn(), findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock('../lib/s3', () => ({
  generateUploadUrl: vi.fn(),
  getFileBuffer: vi.fn(),
  generateMediaUploadUrl: vi.fn(),
  generateDownloadUrl: vi.fn(),
}));

vi.mock('../services/email-service', () => ({
  sendEmail: vi.fn(),
  sendNotificationEmail: vi.fn(),
}));

vi.mock('../services/sms-service', () => ({
  sendSms: vi.fn(),
}));

import { app } from '../app';
import { signToken } from '../lib/jwt';
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

describe('Pagination on list endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/productions/:productionId/notifications', () => {
    it('passes take/skip to Prisma from limit/offset query params', async () => {
      mockedPrisma.productionMember.findUnique.mockResolvedValue({
        id: 'member-1',
      } as any);
      mockedPrisma.notification.findMany.mockResolvedValue([]);

      await request(app)
        .get('/api/productions/prod-1/notifications')
        .set(authHeader())
        .query({ limit: '10', offset: '20' });

      expect(mockedPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        }),
      );
    });

    it('defaults to take=50 skip=0 when no params provided', async () => {
      mockedPrisma.productionMember.findUnique.mockResolvedValue({
        id: 'member-1',
      } as any);
      mockedPrisma.notification.findMany.mockResolvedValue([]);

      await request(app)
        .get('/api/productions/prod-1/notifications')
        .set(authHeader());

      expect(mockedPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
          skip: 0,
        }),
      );
    });

    it('enforces max limit of 100', async () => {
      mockedPrisma.productionMember.findUnique.mockResolvedValue({
        id: 'member-1',
      } as any);
      mockedPrisma.notification.findMany.mockResolvedValue([]);

      await request(app)
        .get('/api/productions/prod-1/notifications')
        .set(authHeader())
        .query({ limit: '500' });

      expect(mockedPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100,
        }),
      );
    });
  });

  describe('GET /api/productions/:productionId/feed', () => {
    it('passes take/skip to Prisma from limit/offset query params', async () => {
      mockedPrisma.productionMember.findUnique.mockResolvedValue({
        id: 'member-1',
      } as any);
      mockedPrisma.element.findMany.mockResolvedValue([]);

      await request(app)
        .get('/api/productions/prod-1/feed')
        .set(authHeader())
        .query({ limit: '25', offset: '50' });

      expect(mockedPrisma.element.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 25,
          skip: 50,
        }),
      );
    });
  });
});

describe('Resource creation limits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects option creation with more than 20 assets', async () => {
    // Mock element with membership
    mockedPrisma.element.findUnique.mockResolvedValue({
      id: 'elem-1',
      scriptId: 'script-1',
      script: { productionId: 'prod-1' },
    } as any);
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
    } as any);

    const assets = Array.from({ length: 21 }, (_, i) => ({
      s3Key: `options/uuid/photo${i}.jpg`,
      fileName: `photo${i}.jpg`,
      mediaType: 'IMAGE',
    }));

    const res = await request(app)
      .post('/api/elements/elem-1/options')
      .set(authHeader())
      .send({ mediaType: 'IMAGE', assets });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/assets/i);
  });

  it('allows option creation with exactly 20 assets', async () => {
    mockedPrisma.element.findUnique.mockResolvedValue({
      id: 'elem-1',
      scriptId: 'script-1',
      script: { productionId: 'prod-1' },
    } as any);
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
    } as any);
    mockedPrisma.option.create.mockResolvedValue({
      id: 'opt-1',
      elementId: 'elem-1',
      mediaType: 'IMAGE',
      status: 'ACTIVE',
      readyForReview: false,
      uploadedById: 'user-1',
      assets: [],
    } as any);

    const assets = Array.from({ length: 20 }, (_, i) => ({
      s3Key: `options/uuid/photo${i}.jpg`,
      fileName: `photo${i}.jpg`,
      mediaType: 'IMAGE',
    }));

    const res = await request(app)
      .post('/api/elements/elem-1/options')
      .set(authHeader())
      .send({ mediaType: 'IMAGE', assets });

    expect(res.status).toBe(201);
  });

  it('rejects element creation when script has 1000+ elements', async () => {
    mockedPrisma.script.findUnique.mockResolvedValue({
      id: 'script-1',
      productionId: 'prod-1',
    } as any);
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
    } as any);
    mockedPrisma.element.count.mockResolvedValue(1000);

    const res = await request(app)
      .post('/api/scripts/script-1/elements')
      .set(authHeader())
      .send({ name: 'New Element', type: 'OTHER' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/limit/i);
  });
});
