import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { signToken } from '../lib/jwt';

// Mock S3 service
vi.mock('../lib/s3', () => ({
  generateMediaUploadUrl: vi.fn().mockResolvedValue({
    uploadUrl: 'https://s3.example.com/upload',
    s3Key: 'options/test-file.jpg',
  }),
  generateDownloadUrl: vi.fn(),
}));

// Mock Prisma client
vi.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    productionMember: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from '../lib/prisma';

const mockedPrisma = vi.mocked(prisma);

const user1 = { userId: 'user-1', email: 'user1@example.com' };
const user2 = { userId: 'user-2', email: 'user2@example.com' };

function authHeader(user = user1) {
  const token = signToken(user);
  return { Authorization: `Bearer ${token}` };
}

describe('Per-user upload URL rate limiting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', tokenVersion: 0, emailVerified: true } as any);
    (mockedPrisma as any).productionMember.findUnique.mockResolvedValue({ id: 'member-1' });
  });

  it('allows up to 30 upload URL requests per minute per user', async () => {
    const res = await request(app)
      .post('/api/options/upload-url')
      .set(authHeader())
      .send({ fileName: 'test.jpg', contentType: 'image/jpeg', productionId: 'prod-1' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('uploadUrl');
  });

  it('returns 429 after exceeding per-user limit', async () => {
    // Make 31 requests (limit is 30 per minute)
    for (let i = 0; i < 30; i++) {
      await request(app)
        .post('/api/options/upload-url')
        .set(authHeader())
        .send({ fileName: `test-${i}.jpg`, contentType: 'image/jpeg', productionId: 'prod-1' });
    }

    const res = await request(app)
      .post('/api/options/upload-url')
      .set(authHeader())
      .send({ fileName: 'test-over-limit.jpg', contentType: 'image/jpeg', productionId: 'prod-1' });

    expect(res.status).toBe(429);
  });

  it('different users have independent limits', async () => {
    // Exhaust user1's limit
    for (let i = 0; i < 30; i++) {
      await request(app)
        .post('/api/options/upload-url')
        .set(authHeader(user1))
        .send({ fileName: `test-${i}.jpg`, contentType: 'image/jpeg', productionId: 'prod-1' });
    }

    // user2 should still be able to make requests
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'user-2', tokenVersion: 0, emailVerified: true } as any);
    const res = await request(app)
      .post('/api/options/upload-url')
      .set(authHeader(user2))
      .send({ fileName: 'test.jpg', contentType: 'image/jpeg', productionId: 'prod-1' });

    expect(res.status).toBe(200);
  });
});
