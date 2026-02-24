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
    script: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    element: {
      createMany: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// Mock S3
vi.mock('../lib/s3.js', () => ({
  generateUploadUrl: vi.fn(),
  getFileBuffer: vi.fn(),
}));

import { prisma } from '../lib/prisma.js';
import { generateUploadUrl } from '../lib/s3.js';

const mockedPrisma = vi.mocked(prisma);
const mockedGenerateUploadUrl = vi.mocked(generateUploadUrl);

const testUser = {
  userId: 'user-1',
  email: 'test@example.com',
};

function authHeader() {
  const token = signToken(testUser);
  return { Authorization: `Bearer ${token}` };
}

describe('POST /api/scripts/upload-url', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with presigned URL and S3 key', async () => {
    mockedGenerateUploadUrl.mockResolvedValue({
      uploadUrl: 'https://s3.amazonaws.com/bucket/scripts/uuid/test.pdf?signed',
      s3Key: 'scripts/uuid/test.pdf',
    });

    const res = await request(app)
      .post('/api/scripts/upload-url')
      .set(authHeader())
      .send({ fileName: 'test.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('uploadUrl');
    expect(res.body).toHaveProperty('s3Key');
  });

  it('returns 400 when fileName is missing', async () => {
    const res = await request(app)
      .post('/api/scripts/upload-url')
      .set(authHeader())
      .send({ contentType: 'application/pdf' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/fileName/i);
  });

  it('returns 400 when contentType is not application/pdf', async () => {
    const res = await request(app)
      .post('/api/scripts/upload-url')
      .set(authHeader())
      .send({ fileName: 'test.doc', contentType: 'application/msword' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/pdf/i);
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app)
      .post('/api/scripts/upload-url')
      .send({ fileName: 'test.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(401);
  });
});

describe('POST /api/productions/:id/scripts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 201 with script record (status: PROCESSING)', async () => {
    // Membership check
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'ADMIN',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    mockedPrisma.script.create.mockResolvedValue({
      id: 'script-1',
      productionId: 'prod-1',
      title: 'My Script',
      fileName: 'script.pdf',
      s3Key: 'scripts/uuid/script.pdf',
      pageCount: null,
      status: 'PROCESSING',
      uploadedById: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const res = await request(app).post('/api/productions/prod-1/scripts').set(authHeader()).send({
      title: 'My Script',
      fileName: 'script.pdf',
      s3Key: 'scripts/uuid/script.pdf',
    });

    expect(res.status).toBe(201);
    expect(res.body.script.status).toBe('PROCESSING');
    expect(res.body.script.title).toBe('My Script');
  });

  it('returns 400 when required fields are missing', async () => {
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'ADMIN',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const res = await request(app)
      .post('/api/productions/prod-1/scripts')
      .set(authHeader())
      .send({ title: 'My Script' }); // missing fileName and s3Key

    expect(res.status).toBe(400);
  });

  it('returns 403 when not a production member', async () => {
    mockedPrisma.productionMember.findUnique.mockResolvedValue(null);
    mockedPrisma.production.findUnique.mockResolvedValue({ id: 'prod-1' } as any);

    const res = await request(app).post('/api/productions/prod-1/scripts').set(authHeader()).send({
      title: 'My Script',
      fileName: 'script.pdf',
      s3Key: 'scripts/uuid/script.pdf',
    });

    expect(res.status).toBe(403);
  });
});

describe('GET /api/productions/:id/scripts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with scripts list', async () => {
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'ADMIN',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    mockedPrisma.script.findMany.mockResolvedValue([
      {
        id: 'script-1',
        productionId: 'prod-1',
        title: 'Script One',
        fileName: 'script.pdf',
        s3Key: 'scripts/uuid/script.pdf',
        pageCount: 120,
        status: 'READY',
        uploadedById: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as any);

    const res = await request(app).get('/api/productions/prod-1/scripts').set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.scripts).toHaveLength(1);
    expect(res.body.scripts[0].title).toBe('Script One');
  });
});

describe('GET /api/productions/:id/scripts/:scriptId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with script and elements', async () => {
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'ADMIN',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    mockedPrisma.script.findUnique.mockResolvedValue({
      id: 'script-1',
      productionId: 'prod-1',
      title: 'Script One',
      fileName: 'script.pdf',
      s3Key: 'scripts/uuid/script.pdf',
      pageCount: 120,
      status: 'READY',
      uploadedById: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      elements: [
        {
          id: 'elem-1',
          name: 'JOHN',
          type: 'CHARACTER',
          pageNumbers: [1, 5, 12],
          status: 'ACTIVE',
          source: 'AUTO',
        },
      ],
    } as any);

    const res = await request(app)
      .get('/api/productions/prod-1/scripts/script-1')
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.script.title).toBe('Script One');
    expect(res.body.script.elements).toHaveLength(1);
  });

  it('returns 404 when script not found', async () => {
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'ADMIN',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    mockedPrisma.script.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/productions/prod-1/scripts/nonexistent')
      .set(authHeader());

    expect(res.status).toBe(404);
  });
});
