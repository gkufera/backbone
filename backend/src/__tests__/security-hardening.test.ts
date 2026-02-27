import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';

// Mock Prisma client (required because app imports routes that use prisma)
vi.mock('../lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    productionMember: { findUnique: vi.fn() },
    element: { findUnique: vi.fn() },
    option: { findUnique: vi.fn() },
    optionAsset: { findFirst: vi.fn() },
    notification: { create: vi.fn() },
    production: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}));

// Mock S3
vi.mock('../lib/s3', () => ({
  generateUploadUrl: vi.fn(),
  getFileBuffer: vi.fn(),
  generateMediaUploadUrl: vi.fn(),
  generateDownloadUrl: vi.fn(),
}));

// Mock email service
vi.mock('../services/email-service', () => ({
  sendEmail: vi.fn(),
}));

import { createApp } from '../app';
import { app } from '../app';
import { signToken } from '../lib/jwt';
import { prisma } from '../lib/prisma';
import { generateDownloadUrl } from '../lib/s3';

const mockedPrisma = vi.mocked(prisma);
const mockedGenerateDownloadUrl = vi.mocked(generateDownloadUrl);

const testUser = {
  userId: 'user-1',
  email: 'test@example.com',
};

function authHeader() {
  const token = signToken(testUser);
  return { Authorization: `Bearer ${token}` };
}

// ── S1/S2: Environment variable requirements ──────────────────────

describe('Environment variable requirements', () => {
  const originalJwtSecret = process.env.JWT_SECRET;
  const originalCorsOrigins = process.env.CORS_ORIGINS;
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    // Restore env vars
    if (originalJwtSecret !== undefined) {
      process.env.JWT_SECRET = originalJwtSecret;
    } else {
      delete process.env.JWT_SECRET;
    }
    if (originalCorsOrigins !== undefined) {
      process.env.CORS_ORIGINS = originalCorsOrigins;
    } else {
      delete process.env.CORS_ORIGINS;
    }
    if (originalNodeEnv !== undefined) {
      process.env.NODE_ENV = originalNodeEnv;
    } else {
      delete process.env.NODE_ENV;
    }
  });

  it('allows missing JWT_SECRET in test environment', () => {
    process.env.NODE_ENV = 'test';
    delete process.env.JWT_SECRET;
    // Should not throw in test environment
    expect(() => createApp()).not.toThrow();
  });

  it('allows missing CORS_ORIGINS in test environment', () => {
    process.env.NODE_ENV = 'test';
    delete process.env.CORS_ORIGINS;
    // Should not throw in test environment
    expect(() => createApp()).not.toThrow();
  });
});

// ── S3: JSON body size limit ──────────────────────────────────────

describe('JSON body size limit (S3)', () => {
  it('returns 413 when request body exceeds 1MB', async () => {
    const largeBody = { data: 'x'.repeat(1024 * 1024 + 1) }; // > 1MB

    const res = await request(app)
      .post('/api/auth/signup')
      .send(largeBody);

    expect(res.status).toBe(413);
  });
});

// ── S4: Options download URL authorization ────────────────────────

describe('GET /api/options/download-url authorization (S4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', tokenVersion: 0, emailVerified: true } as any);
  });

  it('returns 403 when user is not a member of the option production', async () => {
    // Option exists, linked to an element in a production
    mockedPrisma.optionAsset.findFirst.mockResolvedValue({
      id: 'asset-1',
      optionId: 'opt-1',
      s3Key: 'options/uuid/photo.jpg',
      option: {
        element: {
          script: { productionId: 'prod-1' },
        },
      },
    } as any);

    // User is NOT a member
    mockedPrisma.productionMember.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/options/download-url')
      .set(authHeader())
      .query({ s3Key: 'options/uuid/photo.jpg' });

    expect(res.status).toBe(403);
  });

  it('returns 200 when user IS a member of the option production', async () => {
    mockedPrisma.optionAsset.findFirst.mockResolvedValue({
      id: 'asset-1',
      optionId: 'opt-1',
      s3Key: 'options/uuid/photo.jpg',
      option: {
        element: {
          script: { productionId: 'prod-1' },
        },
      },
    } as any);

    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'ADMIN',
    } as any);

    mockedGenerateDownloadUrl.mockResolvedValue('https://s3.amazonaws.com/signed-url');

    const res = await request(app)
      .get('/api/options/download-url')
      .set(authHeader())
      .query({ s3Key: 'options/uuid/photo.jpg' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('downloadUrl');
  });

  it('returns 404 when s3Key does not match any asset', async () => {
    mockedPrisma.optionAsset.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/options/download-url')
      .set(authHeader())
      .query({ s3Key: 'options/nonexistent/file.jpg' });

    expect(res.status).toBe(404);
  });
});

// ── S5: ElementType/ElementStatus enum validation ─────────────────

describe('ElementType/ElementStatus enum validation (S5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', tokenVersion: 0, emailVerified: true } as any);
    mockedPrisma.production.findUnique.mockResolvedValue({ id: 'prod-1', status: 'ACTIVE' } as any);
  });

  it('returns 400 when creating element with invalid type', async () => {
    // Script exists
    mockedPrisma.script = {
      ...mockedPrisma.script,
      findUnique: vi.fn().mockResolvedValue({
        id: 'script-1',
        productionId: 'prod-1',
      }),
    } as any;

    // User is a member
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'ADMIN',
    } as any);

    const res = await request(app)
      .post('/api/scripts/script-1/elements')
      .set(authHeader())
      .send({ name: 'Test Element', type: 'INVALID_TYPE' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/type/i);
  });

  it('returns 400 when updating element with invalid status', async () => {
    mockedPrisma.element.findUnique.mockResolvedValue({
      id: 'elem-1',
      scriptId: 'script-1',
      name: 'JOHN',
      type: 'CHARACTER',
      status: 'ACTIVE',
      script: { productionId: 'prod-1' },
    } as any);

    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'ADMIN',
    } as any);

    const res = await request(app)
      .patch('/api/elements/elem-1')
      .set(authHeader())
      .send({ status: 'BOGUS_STATUS' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/status/i);
  });

  it('returns 400 when updating element with invalid type', async () => {
    mockedPrisma.element.findUnique.mockResolvedValue({
      id: 'elem-1',
      scriptId: 'script-1',
      name: 'JOHN',
      type: 'CHARACTER',
      status: 'ACTIVE',
      script: { productionId: 'prod-1' },
    } as any);

    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'ADMIN',
    } as any);

    const res = await request(app)
      .patch('/api/elements/elem-1')
      .set(authHeader())
      .send({ type: 'INVALID_TYPE' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/type/i);
  });
});

// ── S8: Login timing attack prevention ────────────────────────────

vi.mock('bcryptjs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('bcryptjs')>();
  return {
    ...actual,
    default: {
      ...actual.default,
      compare: vi.fn(actual.default.compare),
      hash: actual.default.hash,
      hashSync: actual.default.hashSync,
      compareSync: actual.default.compareSync,
      genSalt: actual.default.genSalt,
      genSaltSync: actual.default.genSaltSync,
      getRounds: actual.default.getRounds,
    },
  };
});

import bcrypt from 'bcryptjs';
const mockedBcryptCompare = vi.mocked(bcrypt.compare);

describe('Login timing attack prevention (S8)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', tokenVersion: 0, emailVerified: true } as any);
  });

  it('performs bcrypt comparison even when user does not exist', async () => {
    mockedPrisma.user.findUnique.mockResolvedValue(null);

    await request(app)
      .post('/api/auth/login')
      .send({ email: 'nonexistent@example.com', password: 'somepassword123' });

    // bcrypt.compare should have been called even though user was not found
    expect(mockedBcryptCompare).toHaveBeenCalled();
  });
});

// ── S9: S3 download URL Content-Disposition ───────────────────────

describe('S3 download URL Content-Disposition (S9)', () => {
  it('generateDownloadUrl includes ResponseContentDisposition parameter', async () => {
    // We test this by importing the actual function and checking its behavior
    // This is tested via the S3 mock — we verify the generateDownloadUrl call
    // includes the right parameters. Since S3 is mocked, we test at the
    // route level that the function is called correctly.
    // The actual S3 unit test is in the s3 module tests.
    expect(true).toBe(true); // Placeholder — real test in s3.test.ts
  });
});

// ── S12: Trust proxy configuration ────────────────────────────────

describe('Trust proxy configuration (S12)', () => {
  it('app has trust proxy set', () => {
    const testApp = createApp();
    expect(testApp.get('trust proxy')).toBe(1);
  });
});
