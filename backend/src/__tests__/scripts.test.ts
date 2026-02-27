import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { signToken } from '../lib/jwt';

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
      create: vi.fn(),
      createMany: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    department: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('../services/processing-progress', () => ({
  getProgress: vi.fn(),
  setProgress: vi.fn(),
  clearProgress: vi.fn(),
}));

// Mock S3
vi.mock('../lib/s3', () => ({
  generateUploadUrl: vi.fn(),
  generateDownloadUrl: vi.fn(),
  getFileBuffer: vi.fn(),
}));

// Mock script processor
vi.mock('../services/script-processor', () => ({
  processScript: vi.fn().mockResolvedValue(undefined),
}));

// Mock revision processor
vi.mock('../services/revision-processor', () => ({
  processRevision: vi.fn().mockResolvedValue(undefined),
}));

// Mock notification service
vi.mock('../services/notification-service', () => ({
  createNotification: vi.fn().mockResolvedValue({ id: 'notif-1' }),
  notifyProductionMembers: vi.fn().mockResolvedValue([]),
  notifyDeciders: vi.fn().mockResolvedValue([]),
}));

import { prisma } from '../lib/prisma';
import { generateUploadUrl, generateDownloadUrl } from '../lib/s3';
import { getProgress } from '../services/processing-progress';
import { notifyProductionMembers } from '../services/notification-service';
import { processScript } from '../services/script-processor';

const mockedPrisma = vi.mocked(prisma);
const mockedGenerateUploadUrl = vi.mocked(generateUploadUrl);
const mockedGenerateDownloadUrl = vi.mocked(generateDownloadUrl);
const mockedGetProgress = vi.mocked(getProgress);
const mockedNotifyProductionMembers = vi.mocked(notifyProductionMembers);
const mockedProcessScript = vi.mocked(processScript);

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
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', tokenVersion: 0, emailVerified: true } as any);
  });

  it('returns 200 with presigned URL and S3 key when user is production member', async () => {
    mockedPrisma.productionMember.findUnique.mockResolvedValue({ id: 'member-1' } as any);
    mockedGenerateUploadUrl.mockResolvedValue({
      uploadUrl: 'https://s3.amazonaws.com/bucket/scripts/prod-1/uuid/test.pdf?signed',
      s3Key: 'scripts/prod-1/uuid/test.pdf',
    });

    const res = await request(app)
      .post('/api/scripts/upload-url')
      .set(authHeader())
      .send({ fileName: 'test.pdf', contentType: 'application/pdf', productionId: 'prod-1' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('uploadUrl');
    expect(res.body).toHaveProperty('s3Key');
    expect(mockedGenerateUploadUrl).toHaveBeenCalledWith('test.pdf', 'application/pdf', 'prod-1');
  });

  it('returns 400 when productionId is missing', async () => {
    const res = await request(app)
      .post('/api/scripts/upload-url')
      .set(authHeader())
      .send({ fileName: 'test.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/productionId/i);
  });

  it('returns 403 when user is not a production member', async () => {
    mockedPrisma.productionMember.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/scripts/upload-url')
      .set(authHeader())
      .send({ fileName: 'test.pdf', contentType: 'application/pdf', productionId: 'prod-1' });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/not a member/i);
  });

  it('returns 400 when fileName is missing', async () => {
    mockedPrisma.productionMember.findUnique.mockResolvedValue({ id: 'member-1' } as any);

    const res = await request(app)
      .post('/api/scripts/upload-url')
      .set(authHeader())
      .send({ contentType: 'application/pdf', productionId: 'prod-1' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/fileName/i);
  });

  it('returns 400 when contentType is not allowed', async () => {
    mockedPrisma.productionMember.findUnique.mockResolvedValue({ id: 'member-1' } as any);

    const res = await request(app)
      .post('/api/scripts/upload-url')
      .set(authHeader())
      .send({ fileName: 'test.doc', contentType: 'application/msword', productionId: 'prod-1' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/pdf|fdx/i);
  });

  it('accepts application/xml contentType for FDX files', async () => {
    mockedPrisma.productionMember.findUnique.mockResolvedValue({ id: 'member-1' } as any);
    mockedGenerateUploadUrl.mockResolvedValue({
      uploadUrl: 'https://s3.amazonaws.com/bucket/scripts/prod-1/uuid/test.fdx?signed',
      s3Key: 'scripts/prod-1/uuid/test.fdx',
    });

    const res = await request(app)
      .post('/api/scripts/upload-url')
      .set(authHeader())
      .send({ fileName: 'test.fdx', contentType: 'application/xml', productionId: 'prod-1' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('uploadUrl');
    expect(res.body).toHaveProperty('s3Key');
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app)
      .post('/api/scripts/upload-url')
      .send({ fileName: 'test.pdf', contentType: 'application/pdf', productionId: 'prod-1' });

    expect(res.status).toBe(401);
  });
});

describe('POST /api/productions/:id/scripts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', tokenVersion: 0, emailVerified: true } as any);
    mockedPrisma.production.findUnique.mockResolvedValue({ id: 'prod-1', status: 'ACTIVE' } as any);
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
      s3Key: 'scripts/prod-1/uuid/script.pdf',
      pageCount: null,
      status: 'PROCESSING',
      uploadedById: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const res = await request(app).post('/api/productions/prod-1/scripts').set(authHeader()).send({
      title: 'My Script',
      fileName: 'script.pdf',
      s3Key: 'scripts/prod-1/uuid/script.pdf',
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
    mockedPrisma.production.findUnique.mockResolvedValue({ id: 'prod-1', status: 'ACTIVE' } as any);

    const res = await request(app).post('/api/productions/prod-1/scripts').set(authHeader()).send({
      title: 'My Script',
      fileName: 'script.pdf',
      s3Key: 'scripts/prod-1/uuid/script.pdf',
    });

    expect(res.status).toBe(403);
  });

  it('returns 400 when s3Key does not match production prefix', async () => {
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'ADMIN',
    } as any);

    const res = await request(app).post('/api/productions/prod-1/scripts').set(authHeader()).send({
      title: 'My Script',
      fileName: 'script.pdf',
      s3Key: 'scripts/prod-OTHER/uuid/script.pdf',
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/s3Key/i);
  });

  it('stores format=FDX for .fdx fileName', async () => {
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'ADMIN',
    } as any);

    mockedPrisma.script.create.mockResolvedValue({
      id: 'script-1',
      productionId: 'prod-1',
      title: 'My Script',
      fileName: 'script.fdx',
      s3Key: 'scripts/prod-1/uuid/script.fdx',
      status: 'PROCESSING',
      format: 'FDX',
      uploadedById: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const res = await request(app).post('/api/productions/prod-1/scripts').set(authHeader()).send({
      title: 'My Script',
      fileName: 'script.fdx',
      s3Key: 'scripts/prod-1/uuid/script.fdx',
    });

    expect(res.status).toBe(201);
    expect(mockedPrisma.script.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          format: 'FDX',
        }),
      }),
    );
  });

  it('stores format=PDF for .pdf fileName', async () => {
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'ADMIN',
    } as any);

    mockedPrisma.script.create.mockResolvedValue({
      id: 'script-1',
      productionId: 'prod-1',
      title: 'My Script',
      fileName: 'script.pdf',
      s3Key: 'scripts/prod-1/uuid/script.pdf',
      status: 'PROCESSING',
      format: 'PDF',
      uploadedById: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const res = await request(app).post('/api/productions/prod-1/scripts').set(authHeader()).send({
      title: 'My Script',
      fileName: 'script.pdf',
      s3Key: 'scripts/prod-1/uuid/script.pdf',
    });

    expect(res.status).toBe(201);
    expect(mockedPrisma.script.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          format: 'PDF',
        }),
      }),
    );
  });
});

describe('GET /api/productions/:id/scripts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', tokenVersion: 0, emailVerified: true } as any);
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
        s3Key: 'scripts/prod-1/uuid/script.pdf',
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
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', tokenVersion: 0, emailVerified: true } as any);
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
      s3Key: 'scripts/prod-1/uuid/script.pdf',
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
          highlightPage: 1,
          highlightText: 'JOHN',
          departmentId: null,
          status: 'ACTIVE',
          source: 'AUTO',
          options: [],
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

describe('GET /api/scripts/:scriptId/download-url', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', tokenVersion: 0, emailVerified: true } as any);
  });

  it('returns 200 with download URL', async () => {
    mockedPrisma.script.findUnique.mockResolvedValue({
      id: 'script-1',
      productionId: 'prod-1',
      s3Key: 'scripts/prod-1/uuid/test.pdf',
    } as any);

    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'ADMIN',
    } as any);

    mockedGenerateDownloadUrl.mockResolvedValue(
      'https://s3.amazonaws.com/bucket/scripts/uuid/test.pdf?signed-download',
    );

    const res = await request(app)
      .get('/api/scripts/script-1/download-url')
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.downloadUrl).toContain('signed-download');
  });

  it('returns 404 when script not found', async () => {
    mockedPrisma.script.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/scripts/nonexistent/download-url')
      .set(authHeader());

    expect(res.status).toBe(404);
  });

  it('returns 403 when not a member', async () => {
    mockedPrisma.script.findUnique.mockResolvedValue({
      id: 'script-1',
      productionId: 'prod-1',
      s3Key: 'scripts/prod-1/uuid/test.pdf',
    } as any);

    mockedPrisma.productionMember.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/scripts/script-1/download-url')
      .set(authHeader());

    expect(res.status).toBe(403);
  });
});

describe('GET /api/scripts/:scriptId/processing-status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', tokenVersion: 0, emailVerified: true } as any);
  });

  it('returns progress when script is PROCESSING', async () => {
    mockedPrisma.script.findUnique.mockResolvedValue({
      id: 'script-1',
      productionId: 'prod-1',
      status: 'PROCESSING',
    } as any);

    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'ADMIN',
    } as any);

    mockedGetProgress.mockReturnValue({ percent: 60, step: 'Detecting elements' });

    const res = await request(app)
      .get('/api/scripts/script-1/processing-status')
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('PROCESSING');
    expect(res.body.progress).toEqual({ percent: 60, step: 'Detecting elements' });
  });
});

describe('POST /api/scripts/:scriptId/accept-elements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', tokenVersion: 0, emailVerified: true } as any);
  });

  it('transitions REVIEWING to READY', async () => {
    mockedPrisma.script.findUnique.mockResolvedValue({
      id: 'script-1',
      productionId: 'prod-1',
      status: 'REVIEWING',
    } as any);

    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'ADMIN',
    } as any);

    mockedPrisma.script.update.mockResolvedValue({
      id: 'script-1',
      status: 'READY',
    } as any);

    const res = await request(app)
      .post('/api/scripts/script-1/accept-elements')
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(mockedPrisma.script.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'script-1', status: 'REVIEWING' },
        data: { status: 'READY' },
      }),
    );
  });

  it('uses atomic update with status check in where clause', async () => {
    mockedPrisma.script.findUnique.mockResolvedValue({
      id: 'script-1',
      productionId: 'prod-1',
      status: 'REVIEWING',
    } as any);

    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'ADMIN',
    } as any);

    mockedPrisma.script.update.mockResolvedValue({
      id: 'script-1',
      status: 'READY',
    } as any);

    const res = await request(app)
      .post('/api/scripts/script-1/accept-elements')
      .set(authHeader());

    expect(res.status).toBe(200);
    // Atomic: where clause includes both id AND status
    expect(mockedPrisma.script.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'script-1', status: 'REVIEWING' },
        data: { status: 'READY' },
      }),
    );
  });

  it('returns 409 on concurrent race (status already changed)', async () => {
    mockedPrisma.script.findUnique.mockResolvedValue({
      id: 'script-1',
      productionId: 'prod-1',
      status: 'REVIEWING',
    } as any);

    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'ADMIN',
    } as any);

    // Prisma throws P2025 when the where clause doesn't match (status already changed)
    const prismaError = new Error('Record not found') as any;
    prismaError.code = 'P2025';
    mockedPrisma.script.update.mockRejectedValue(prismaError);

    const res = await request(app)
      .post('/api/scripts/script-1/accept-elements')
      .set(authHeader());

    expect(res.status).toBe(409);
  });

  it('returns 400 if not REVIEWING', async () => {
    mockedPrisma.script.findUnique.mockResolvedValue({
      id: 'script-1',
      productionId: 'prod-1',
      status: 'READY',
    } as any);

    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'ADMIN',
    } as any);

    const res = await request(app)
      .post('/api/scripts/script-1/accept-elements')
      .set(authHeader());

    expect(res.status).toBe(400);
  });
});

describe('POST /api/scripts/:scriptId/generate-implied', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', tokenVersion: 0, emailVerified: true } as any);
  });

  it('creates per-character wardrobe/H&M elements', async () => {
    mockedPrisma.script.findUnique.mockResolvedValue({
      id: 'script-1',
      productionId: 'prod-1',
      status: 'REVIEWING',
      sceneData: [
        { sceneNumber: 1, location: 'INT. OFFICE - DAY', characters: ['JOHN', 'MARY'] },
      ],
    } as any);

    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'ADMIN',
    } as any);

    mockedPrisma.department.findMany.mockResolvedValue([
      { id: 'dept-costume', name: 'Costume' },
      { id: 'dept-hm', name: 'Hair & Makeup' },
    ] as any);

    // No existing elements
    mockedPrisma.element.findMany.mockResolvedValue([] as any);

    mockedPrisma.element.createMany.mockResolvedValue({ count: 4 });

    const res = await request(app)
      .post('/api/scripts/script-1/generate-implied')
      .set(authHeader())
      .send({ mode: 'per-character' });

    expect(res.status).toBe(200);
    expect(mockedPrisma.element.createMany).toHaveBeenCalled();
    const createCall = mockedPrisma.element.createMany.mock.calls[0][0] as any;
    const names = createCall.data.map((d: any) => d.name);
    expect(names).toContain('JOHN - Wardrobe');
    expect(names).toContain('JOHN - Hair & Makeup');
    expect(names).toContain('MARY - Wardrobe');
    expect(names).toContain('MARY - Hair & Makeup');
  });

  it('creates per-scene wardrobe/H&M elements', async () => {
    mockedPrisma.script.findUnique.mockResolvedValue({
      id: 'script-1',
      productionId: 'prod-1',
      status: 'REVIEWING',
      sceneData: [
        { sceneNumber: 1, location: 'INT. OFFICE - DAY', characters: ['JOHN'] },
        { sceneNumber: 2, location: 'EXT. PARK - NIGHT', characters: ['JOHN'] },
      ],
    } as any);

    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'ADMIN',
    } as any);

    mockedPrisma.department.findMany.mockResolvedValue([
      { id: 'dept-costume', name: 'Costume' },
      { id: 'dept-hm', name: 'Hair & Makeup' },
    ] as any);

    // No existing elements
    mockedPrisma.element.findMany.mockResolvedValue([] as any);

    mockedPrisma.element.createMany.mockResolvedValue({ count: 4 });

    const res = await request(app)
      .post('/api/scripts/script-1/generate-implied')
      .set(authHeader())
      .send({ mode: 'per-scene' });

    expect(res.status).toBe(200);
    expect(mockedPrisma.element.createMany).toHaveBeenCalled();
    const createCall = mockedPrisma.element.createMany.mock.calls[0][0] as any;
    const names = createCall.data.map((d: any) => d.name);
    expect(names).toContain('JOHN - Wardrobe (Scene 1)');
    expect(names).toContain('JOHN - Hair & Makeup (Scene 1)');
    expect(names).toContain('JOHN - Wardrobe (Scene 2)');
    expect(names).toContain('JOHN - Hair & Makeup (Scene 2)');
  });
});

describe('POST /api/scripts/:scriptId/generate-implied (dedup)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', tokenVersion: 0, emailVerified: true } as any);
  });

  it('does not create duplicate elements when called twice', async () => {
    mockedPrisma.script.findUnique.mockResolvedValue({
      id: 'script-1',
      productionId: 'prod-1',
      status: 'REVIEWING',
      sceneData: [
        { sceneNumber: 1, location: 'INT. OFFICE - DAY', characters: ['JOHN'] },
      ],
    } as any);

    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'ADMIN',
    } as any);

    mockedPrisma.department.findMany.mockResolvedValue([
      { id: 'dept-costume', name: 'Costume' },
      { id: 'dept-hm', name: 'Hair & Makeup' },
    ] as any);

    // Simulate existing elements from a previous call
    mockedPrisma.element.findMany.mockResolvedValue([
      { name: 'JOHN - Wardrobe' },
      { name: 'JOHN - Hair & Makeup' },
    ] as any);

    mockedPrisma.element.createMany.mockResolvedValue({ count: 0 });

    const res = await request(app)
      .post('/api/scripts/script-1/generate-implied')
      .set(authHeader())
      .send({ mode: 'per-character' });

    expect(res.status).toBe(200);
    // Should not create any elements because they already exist
    const createCall = mockedPrisma.element.createMany.mock.calls;
    if (createCall.length > 0) {
      const data = (createCall[0][0] as any).data;
      expect(data).toHaveLength(0);
    }
  });
});

describe('GET /api/productions/:id/scripts/:scriptId approvalTemperature', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', tokenVersion: 0, emailVerified: true } as any);
  });

  it('includes approvalTemperature for elements with approvals', async () => {
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
      s3Key: 'scripts/prod-1/uuid/script.pdf',
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
          status: 'ACTIVE',
          options: [
            {
              approvals: [{ decision: 'APPROVED' }],
            },
          ],
          _count: { options: 1 },
        },
        {
          id: 'elem-2',
          name: 'DESK',
          type: 'OTHER',
          status: 'ACTIVE',
          options: [
            {
              approvals: [{ decision: 'REJECTED' }],
            },
          ],
          _count: { options: 1 },
        },
        {
          id: 'elem-3',
          name: 'LAMP',
          type: 'OTHER',
          status: 'ACTIVE',
          options: [],
          _count: { options: 0 },
        },
      ],
    } as any);

    const res = await request(app)
      .get('/api/productions/prod-1/scripts/script-1')
      .set(authHeader());

    expect(res.status).toBe(200);
    const elements = res.body.script.elements;
    expect(elements[0].approvalTemperature).toBe('green');
    expect(elements[1].approvalTemperature).toBe('red');
    expect(elements[2].approvalTemperature).toBeNull();
  });
});

describe('DELETE /api/elements/:id (soft-delete)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', tokenVersion: 0, emailVerified: true } as any);
  });

  it('soft-deletes when script is REVIEWING', async () => {
    mockedPrisma.element.findUnique.mockResolvedValue({
      id: 'elem-1',
      scriptId: 'script-1',
      name: 'JOHN',
      script: { productionId: 'prod-1', status: 'REVIEWING' },
      _count: { options: 0 },
    } as any);

    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'ADMIN',
    } as any);

    mockedPrisma.element.update.mockResolvedValue({
      id: 'elem-1',
      deletedAt: new Date(),
    } as any);

    const res = await request(app)
      .delete('/api/elements/elem-1')
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(mockedPrisma.element.update).toHaveBeenCalledWith({
      where: { id: 'elem-1' },
      data: expect.objectContaining({
        deletedAt: expect.any(Date),
      }),
    });
    expect(mockedPrisma.element.delete).not.toHaveBeenCalled();
  });

  it('returns 403 when script is READY', async () => {
    mockedPrisma.element.findUnique.mockResolvedValue({
      id: 'elem-1',
      scriptId: 'script-1',
      name: 'JOHN',
      script: { productionId: 'prod-1', status: 'READY' },
      _count: { options: 0 },
    } as any);

    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'ADMIN',
    } as any);

    const res = await request(app)
      .delete('/api/elements/elem-1')
      .set(authHeader());

    expect(res.status).toBe(403);
  });
});

describe('POST /api/productions/:id/scripts — episode fields', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', tokenVersion: 0, emailVerified: true } as any);
    mockedPrisma.production.findUnique.mockResolvedValue({ id: 'prod-1', status: 'ACTIVE' } as any);
  });

  it('creates script with episodeNumber and episodeTitle', async () => {
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'ADMIN',
    } as any);

    mockedPrisma.script.create.mockResolvedValue({
      id: 'script-1',
      productionId: 'prod-1',
      title: 'Pilot',
      fileName: 'pilot.pdf',
      s3Key: 'scripts/prod-1/uuid/pilot.pdf',
      status: 'PROCESSING',
      format: 'PDF',
      episodeNumber: 1,
      episodeTitle: 'Pilot',
      uploadedById: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const res = await request(app).post('/api/productions/prod-1/scripts').set(authHeader()).send({
      title: 'Pilot',
      fileName: 'pilot.pdf',
      s3Key: 'scripts/prod-1/uuid/pilot.pdf',
      episodeNumber: 1,
      episodeTitle: 'Pilot',
    });

    expect(res.status).toBe(201);
    expect(res.body.script.episodeNumber).toBe(1);
    expect(res.body.script.episodeTitle).toBe('Pilot');
    expect(mockedPrisma.script.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          episodeNumber: 1,
          episodeTitle: 'Pilot',
        }),
      }),
    );
  });

  it('returns 400 when episodeNumber provided without episodeTitle', async () => {
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'ADMIN',
    } as any);

    const res = await request(app).post('/api/productions/prod-1/scripts').set(authHeader()).send({
      title: 'Pilot',
      fileName: 'pilot.pdf',
      s3Key: 'scripts/prod-1/uuid/pilot.pdf',
      episodeNumber: 1,
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/episode/i);
  });

  it('returns 400 when episodeTitle provided without episodeNumber', async () => {
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'ADMIN',
    } as any);

    const res = await request(app).post('/api/productions/prod-1/scripts').set(authHeader()).send({
      title: 'Pilot',
      fileName: 'pilot.pdf',
      s3Key: 'scripts/prod-1/uuid/pilot.pdf',
      episodeTitle: 'Pilot',
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/episode/i);
  });

  it('returns 400 when episodeNumber is not a positive integer', async () => {
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'ADMIN',
    } as any);

    const res = await request(app).post('/api/productions/prod-1/scripts').set(authHeader()).send({
      title: 'Pilot',
      fileName: 'pilot.pdf',
      s3Key: 'scripts/prod-1/uuid/pilot.pdf',
      episodeNumber: -1,
      episodeTitle: 'Pilot',
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/positive/i);
  });

  it('creates script without episode fields (backwards compatible)', async () => {
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'ADMIN',
    } as any);

    mockedPrisma.script.create.mockResolvedValue({
      id: 'script-1',
      productionId: 'prod-1',
      title: 'My Script',
      fileName: 'script.pdf',
      s3Key: 'scripts/prod-1/uuid/script.pdf',
      status: 'PROCESSING',
      format: 'PDF',
      episodeNumber: null,
      episodeTitle: null,
      uploadedById: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const res = await request(app).post('/api/productions/prod-1/scripts').set(authHeader()).send({
      title: 'My Script',
      fileName: 'script.pdf',
      s3Key: 'scripts/prod-1/uuid/script.pdf',
    });

    expect(res.status).toBe(201);
    expect(res.body.script.episodeNumber).toBeNull();
    expect(res.body.script.episodeTitle).toBeNull();
  });
});

describe('POST /api/productions/:id/scripts/:scriptId/revisions — episode inheritance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', tokenVersion: 0, emailVerified: true } as any);
    mockedPrisma.production.findUnique.mockResolvedValue({ id: 'prod-1', status: 'ACTIVE' } as any);
  });

  it('inherits episodeNumber and episodeTitle from parent script', async () => {
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'ADMIN',
    } as any);

    mockedPrisma.script.findUnique.mockResolvedValue({
      id: 'script-1',
      productionId: 'prod-1',
      title: 'Pilot',
      status: 'READY',
      version: 1,
      episodeNumber: 1,
      episodeTitle: 'Pilot',
    } as any);

    mockedPrisma.script.create.mockResolvedValue({
      id: 'script-2',
      productionId: 'prod-1',
      title: 'Pilot',
      fileName: 'pilot-v2.pdf',
      s3Key: 'scripts/prod-1/uuid/pilot-v2.pdf',
      status: 'PROCESSING',
      format: 'PDF',
      version: 2,
      parentScriptId: 'script-1',
      episodeNumber: 1,
      episodeTitle: 'Pilot',
      uploadedById: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const res = await request(app)
      .post('/api/productions/prod-1/scripts/script-1/revisions')
      .set(authHeader())
      .send({
        title: 'Pilot',
        fileName: 'pilot-v2.pdf',
        s3Key: 'scripts/prod-1/uuid/pilot-v2.pdf',
      });

    expect(res.status).toBe(201);
    expect(mockedPrisma.script.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          episodeNumber: 1,
          episodeTitle: 'Pilot',
        }),
      }),
    );
  });
});

describe('POST /api/productions/:id/scripts — extractElements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', tokenVersion: 0, emailVerified: true } as any);
    mockedPrisma.production.findUnique.mockResolvedValue({ id: 'prod-1', status: 'ACTIVE' } as any);
  });

  it('passes extractElements=true to processScript when sent', async () => {
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'ADMIN',
    } as any);

    mockedPrisma.script.create.mockResolvedValue({
      id: 'script-1',
      productionId: 'prod-1',
      title: 'My Script',
      fileName: 'script.pdf',
      s3Key: 'scripts/prod-1/uuid/script.pdf',
      status: 'PROCESSING',
      uploadedById: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    await request(app).post('/api/productions/prod-1/scripts').set(authHeader()).send({
      title: 'My Script',
      fileName: 'script.pdf',
      s3Key: 'scripts/prod-1/uuid/script.pdf',
      extractElements: true,
    });

    expect(mockedProcessScript).toHaveBeenCalledWith('script-1', 'scripts/prod-1/uuid/script.pdf', true);
  });

  it('passes extractElements=false to processScript when sent', async () => {
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'ADMIN',
    } as any);

    mockedPrisma.script.create.mockResolvedValue({
      id: 'script-1',
      productionId: 'prod-1',
      title: 'My Script',
      fileName: 'script.pdf',
      s3Key: 'scripts/prod-1/uuid/script.pdf',
      status: 'PROCESSING',
      uploadedById: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    await request(app).post('/api/productions/prod-1/scripts').set(authHeader()).send({
      title: 'My Script',
      fileName: 'script.pdf',
      s3Key: 'scripts/prod-1/uuid/script.pdf',
      extractElements: false,
    });

    expect(mockedProcessScript).toHaveBeenCalledWith('script-1', 'scripts/prod-1/uuid/script.pdf', false);
  });

  it('defaults extractElements to true when omitted', async () => {
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'ADMIN',
    } as any);

    mockedPrisma.script.create.mockResolvedValue({
      id: 'script-1',
      productionId: 'prod-1',
      title: 'My Script',
      fileName: 'script.pdf',
      s3Key: 'scripts/prod-1/uuid/script.pdf',
      status: 'PROCESSING',
      uploadedById: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    await request(app).post('/api/productions/prod-1/scripts').set(authHeader()).send({
      title: 'My Script',
      fileName: 'script.pdf',
      s3Key: 'scripts/prod-1/uuid/script.pdf',
    });

    expect(mockedProcessScript).toHaveBeenCalledWith('script-1', 'scripts/prod-1/uuid/script.pdf', true);
  });
});

describe('POST /api/productions/:id/scripts — notification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', tokenVersion: 0, emailVerified: true } as any);
    mockedPrisma.production.findUnique.mockResolvedValue({ id: 'prod-1', status: 'ACTIVE' } as any);
  });

  it('triggers SCRIPT_UPLOADED notification to all production members', async () => {
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'ADMIN',
    } as any);

    mockedPrisma.script.create.mockResolvedValue({
      id: 'script-1',
      productionId: 'prod-1',
      title: 'Episode 1',
      fileName: 'ep1.pdf',
      s3Key: 'scripts/prod-1/uuid/ep1.pdf',
      status: 'PROCESSING',
      uploadedById: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const res = await request(app)
      .post('/api/productions/prod-1/scripts')
      .set(authHeader())
      .send({
        title: 'Episode 1',
        fileName: 'ep1.pdf',
        s3Key: 'scripts/prod-1/uuid/ep1.pdf',
      });

    expect(res.status).toBe(201);
    expect(mockedNotifyProductionMembers).toHaveBeenCalledWith(
      'prod-1',
      'user-1',
      'SCRIPT_UPLOADED',
      expect.stringContaining('Episode 1'),
      expect.any(String),
    );
  });
});
