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
      createMany: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    option: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    optionAsset: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    approval: {
      findFirst: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
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

// Mock notification service
vi.mock('../services/notification-service', () => ({
  notifyProductionMembers: vi.fn().mockResolvedValue([]),
  notifyDeciders: vi.fn().mockResolvedValue([]),
}));

import { prisma } from '../lib/prisma';
import { generateMediaUploadUrl, generateDownloadUrl } from '../lib/s3';
import { notifyDeciders } from '../services/notification-service';

const mockedPrisma = vi.mocked(prisma);
const mockedGenerateMediaUploadUrl = vi.mocked(generateMediaUploadUrl);
const mockedGenerateDownloadUrl = vi.mocked(generateDownloadUrl);
const mockedNotifyDeciders = vi.mocked(notifyDeciders);

const testUser = {
  userId: 'user-1',
  email: 'test@example.com',
};

function authHeader() {
  const token = signToken(testUser);
  return { Authorization: `Bearer ${token}` };
}

// ── Phase 2: Presigned URL endpoints ──────────────────────────────

describe('POST /api/options/upload-url', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', tokenVersion: 0, emailVerified: true } as any);
  });

  it('returns 200 with upload URL for image/jpeg when user is production member', async () => {
    mockedPrisma.productionMember.findUnique.mockResolvedValue({ id: 'member-1' } as any);
    mockedGenerateMediaUploadUrl.mockResolvedValue({
      uploadUrl: 'https://s3.amazonaws.com/bucket/options/prod-1/uuid/photo.jpg?signed',
      s3Key: 'options/prod-1/uuid/photo.jpg',
    });

    const res = await request(app)
      .post('/api/options/upload-url')
      .set(authHeader())
      .send({ fileName: 'photo.jpg', contentType: 'image/jpeg', productionId: 'prod-1' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('uploadUrl');
    expect(res.body).toHaveProperty('s3Key');
    expect(res.body.mediaType).toBe('IMAGE');
    expect(mockedGenerateMediaUploadUrl).toHaveBeenCalledWith('photo.jpg', 'image/jpeg', 'prod-1');
  });

  it('returns 400 when productionId is missing', async () => {
    const res = await request(app)
      .post('/api/options/upload-url')
      .set(authHeader())
      .send({ fileName: 'photo.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/productionId/i);
  });

  it('returns 403 when user is not a production member', async () => {
    mockedPrisma.productionMember.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/options/upload-url')
      .set(authHeader())
      .send({ fileName: 'photo.jpg', contentType: 'image/jpeg', productionId: 'prod-1' });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/not a member/i);
  });

  it('returns 200 with upload URL for video/mp4', async () => {
    mockedPrisma.productionMember.findUnique.mockResolvedValue({ id: 'member-1' } as any);
    mockedGenerateMediaUploadUrl.mockResolvedValue({
      uploadUrl: 'https://s3.amazonaws.com/bucket/options/prod-1/uuid/clip.mp4?signed',
      s3Key: 'options/prod-1/uuid/clip.mp4',
    });

    const res = await request(app)
      .post('/api/options/upload-url')
      .set(authHeader())
      .send({ fileName: 'clip.mp4', contentType: 'video/mp4', productionId: 'prod-1' });

    expect(res.status).toBe(200);
    expect(res.body.mediaType).toBe('VIDEO');
  });

  it('returns 200 with upload URL for audio/mpeg', async () => {
    mockedPrisma.productionMember.findUnique.mockResolvedValue({ id: 'member-1' } as any);
    mockedGenerateMediaUploadUrl.mockResolvedValue({
      uploadUrl: 'https://s3.amazonaws.com/bucket/options/prod-1/uuid/track.mp3?signed',
      s3Key: 'options/prod-1/uuid/track.mp3',
    });

    const res = await request(app)
      .post('/api/options/upload-url')
      .set(authHeader())
      .send({ fileName: 'track.mp3', contentType: 'audio/mpeg', productionId: 'prod-1' });

    expect(res.status).toBe(200);
    expect(res.body.mediaType).toBe('AUDIO');
  });

  it('returns 200 with thumbnail URLs when thumbnailFileName is provided', async () => {
    mockedPrisma.productionMember.findUnique.mockResolvedValue({ id: 'member-1' } as any);
    mockedGenerateMediaUploadUrl
      .mockResolvedValueOnce({
        uploadUrl: 'https://s3.amazonaws.com/bucket/options/prod-1/uuid/photo.jpg?signed',
        s3Key: 'options/prod-1/uuid/photo.jpg',
      })
      .mockResolvedValueOnce({
        uploadUrl: 'https://s3.amazonaws.com/bucket/options/prod-1/uuid/thumb.jpg?signed',
        s3Key: 'options/prod-1/uuid/thumb.jpg',
      });

    const res = await request(app).post('/api/options/upload-url').set(authHeader()).send({
      fileName: 'photo.jpg',
      contentType: 'image/jpeg',
      thumbnailFileName: 'thumb.jpg',
      productionId: 'prod-1',
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('uploadUrl');
    expect(res.body).toHaveProperty('thumbnailUploadUrl');
    expect(res.body).toHaveProperty('thumbnailS3Key');
  });

  it('returns 400 when fileName is missing', async () => {
    mockedPrisma.productionMember.findUnique.mockResolvedValue({ id: 'member-1' } as any);

    const res = await request(app)
      .post('/api/options/upload-url')
      .set(authHeader())
      .send({ contentType: 'image/jpeg', productionId: 'prod-1' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/fileName/i);
  });

  it('returns 400 when contentType is not allowed', async () => {
    mockedPrisma.productionMember.findUnique.mockResolvedValue({ id: 'member-1' } as any);

    const res = await request(app)
      .post('/api/options/upload-url')
      .set(authHeader())
      .send({ fileName: 'doc.exe', contentType: 'application/x-msdownload', productionId: 'prod-1' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/content type/i);
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app)
      .post('/api/options/upload-url')
      .send({ fileName: 'photo.jpg', contentType: 'image/jpeg', productionId: 'prod-1' });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/options/download-url', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', tokenVersion: 0, emailVerified: true } as any);
  });

  it('returns 200 with download URL when user is a member', async () => {
    // Mock asset lookup
    mockedPrisma.optionAsset.findFirst.mockResolvedValue({
      id: 'asset-1',
      optionId: 'opt-1',
      s3Key: 'options/prod-1/uuid/photo.jpg',
      option: {
        element: {
          script: { productionId: 'prod-1' },
        },
      },
    } as any);

    // Mock membership check
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'ADMIN',
    } as any);

    mockedGenerateDownloadUrl.mockResolvedValue(
      'https://s3.amazonaws.com/bucket/options/uuid/photo.jpg?signed-get',
    );

    const res = await request(app)
      .get('/api/options/download-url')
      .set(authHeader())
      .query({ s3Key: 'options/prod-1/uuid/photo.jpg' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('downloadUrl');
  });

  it('returns 400 when s3Key is missing', async () => {
    const res = await request(app).get('/api/options/download-url').set(authHeader());

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/s3Key/i);
  });
});

// ── Phase 3: Option CRUD endpoints ──────────────────────────────

function mockElementWithMembership() {
  mockedPrisma.element.findUnique.mockResolvedValue({
    id: 'elem-1',
    scriptId: 'script-1',
    name: 'JOHN',
    type: 'CHARACTER',
    highlightPage: 1,
    highlightText: 'JOHN',
    status: 'ACTIVE',
    source: 'AUTO',
    createdAt: new Date(),
    updatedAt: new Date(),
    script: { productionId: 'prod-1' },
  } as any);

  mockedPrisma.productionMember.findUnique.mockResolvedValue({
    id: 'member-1',
    productionId: 'prod-1',
    userId: 'user-1',
    role: 'ADMIN',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any);
}

describe('POST /api/elements/:elementId/options', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', tokenVersion: 0, emailVerified: true } as any);
    mockedPrisma.production.findUnique.mockResolvedValue({ id: 'prod-1', status: 'ACTIVE' } as any);
  });

  it('returns 201 when creating IMAGE option with assets', async () => {
    mockElementWithMembership();
    mockedPrisma.option.create.mockResolvedValue({
      id: 'opt-1',
      elementId: 'elem-1',
      mediaType: 'IMAGE',
      description: 'Costume reference',
      externalUrl: null,
      status: 'ACTIVE',
      readyForReview: false,
      uploadedById: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      assets: [
        { id: 'a1', s3Key: 'options/prod-1/uuid/photo.jpg', fileName: 'photo.jpg', mediaType: 'IMAGE', sortOrder: 0 },
      ],
    } as any);

    const res = await request(app).post('/api/elements/elem-1/options').set(authHeader()).send({
      mediaType: 'IMAGE',
      description: 'Costume reference',
      assets: [
        { s3Key: 'options/prod-1/uuid/photo.jpg', fileName: 'photo.jpg', mediaType: 'IMAGE' },
      ],
    });

    expect(res.status).toBe(201);
    expect(res.body.option.mediaType).toBe('IMAGE');
    expect(res.body.option.readyForReview).toBe(false);
  });

  it('returns 201 when creating LINK option with externalUrl', async () => {
    mockElementWithMembership();
    mockedPrisma.option.create.mockResolvedValue({
      id: 'opt-2',
      elementId: 'elem-1',
      mediaType: 'LINK',
      description: 'Reference board',
      s3Key: null,
      fileName: null,
      externalUrl: 'https://pinterest.com/board/123',
      thumbnailS3Key: null,
      status: 'ACTIVE',
      readyForReview: false,
      uploadedById: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const res = await request(app).post('/api/elements/elem-1/options').set(authHeader()).send({
      mediaType: 'LINK',
      description: 'Reference board',
      externalUrl: 'https://pinterest.com/board/123',
    });

    expect(res.status).toBe(201);
    expect(res.body.option.mediaType).toBe('LINK');
    expect(res.body.option.externalUrl).toBe('https://pinterest.com/board/123');
  });

  it('returns 400 when mediaType is missing', async () => {
    mockElementWithMembership();

    const res = await request(app).post('/api/elements/elem-1/options').set(authHeader()).send({
      assets: [{ s3Key: 'options/prod-1/uuid/photo.jpg', fileName: 'photo.jpg', mediaType: 'IMAGE' }],
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/mediaType/i);
  });

  it('returns 400 when LINK option has no externalUrl', async () => {
    mockElementWithMembership();

    const res = await request(app).post('/api/elements/elem-1/options').set(authHeader()).send({
      mediaType: 'LINK',
      description: 'Missing URL',
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/externalUrl/i);
  });

  it('returns 400 when IMAGE option has no assets', async () => {
    mockElementWithMembership();

    const res = await request(app).post('/api/elements/elem-1/options').set(authHeader()).send({
      mediaType: 'IMAGE',
      description: 'Missing file',
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/assets/i);
  });

  it('returns 403 when not a production member', async () => {
    mockedPrisma.element.findUnique.mockResolvedValue({
      id: 'elem-1',
      scriptId: 'script-1',
      script: { productionId: 'prod-1' },
    } as any);
    mockedPrisma.productionMember.findUnique.mockResolvedValue(null);

    const res = await request(app).post('/api/elements/elem-1/options').set(authHeader()).send({
      mediaType: 'IMAGE',
      assets: [{ s3Key: 'options/prod-1/uuid/photo.jpg', fileName: 'photo.jpg', mediaType: 'IMAGE' }],
    });

    expect(res.status).toBe(403);
  });

  it('returns 404 when element does not exist', async () => {
    mockedPrisma.element.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/elements/nonexistent/options')
      .set(authHeader())
      .send({
        mediaType: 'IMAGE',
        assets: [{ s3Key: 'options/prod-1/uuid/photo.jpg', fileName: 'photo.jpg', mediaType: 'IMAGE' }],
      });

    expect(res.status).toBe(404);
  });

  it('returns 404 when element has deletedAt set', async () => {
    mockedPrisma.element.findUnique.mockResolvedValue({
      id: 'elem-1',
      scriptId: 'script-1',
      name: 'DELETED ELEMENT',
      status: 'ACTIVE',
      deletedAt: new Date(),
      script: { productionId: 'prod-1' },
    } as any);

    const res = await request(app)
      .post('/api/elements/elem-1/options')
      .set(authHeader())
      .send({
        mediaType: 'IMAGE',
        assets: [{ s3Key: 'options/prod-1/uuid/photo.jpg', fileName: 'photo.jpg', mediaType: 'IMAGE' }],
      });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/element not found/i);
  });

  it('returns 400 when element status is ARCHIVED', async () => {
    mockedPrisma.element.findUnique.mockResolvedValue({
      id: 'elem-1',
      scriptId: 'script-1',
      name: 'ARCHIVED ELEMENT',
      status: 'ARCHIVED',
      deletedAt: null,
      script: { productionId: 'prod-1' },
    } as any);
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'ADMIN',
    } as any);

    const res = await request(app)
      .post('/api/elements/elem-1/options')
      .set(authHeader())
      .send({
        mediaType: 'IMAGE',
        assets: [{ s3Key: 'options/prod-1/uuid/photo.jpg', fileName: 'photo.jpg', mediaType: 'IMAGE' }],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/archived/i);
  });

  it('returns 400 when asset s3Key does not match production prefix', async () => {
    mockElementWithMembership();

    const res = await request(app).post('/api/elements/elem-1/options').set(authHeader()).send({
      mediaType: 'IMAGE',
      assets: [{ s3Key: 'options/prod-OTHER/uuid/photo.jpg', fileName: 'photo.jpg', mediaType: 'IMAGE' }],
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/s3Key/i);
  });

  it('returns 400 when description exceeds max length', async () => {
    mockElementWithMembership();

    const longDescription = 'a'.repeat(501);
    const res = await request(app).post('/api/elements/elem-1/options').set(authHeader()).send({
      mediaType: 'IMAGE',
      description: longDescription,
      assets: [{ s3Key: 'options/prod-1/uuid/photo.jpg', fileName: 'photo.jpg', mediaType: 'IMAGE' }],
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/description/i);
  });

  it('returns 400 when LINK externalUrl is not a valid URL', async () => {
    mockElementWithMembership();

    const res = await request(app).post('/api/elements/elem-1/options').set(authHeader()).send({
      mediaType: 'LINK',
      externalUrl: 'not-a-url',
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/url/i);
  });

  it('defaults readyForReview to false', async () => {
    mockElementWithMembership();
    mockedPrisma.option.create.mockResolvedValue({
      id: 'opt-1',
      elementId: 'elem-1',
      mediaType: 'IMAGE',
      readyForReview: false,
    } as any);

    const res = await request(app).post('/api/elements/elem-1/options').set(authHeader()).send({
      mediaType: 'IMAGE',
      assets: [{ s3Key: 'options/prod-1/uuid/photo.jpg', fileName: 'photo.jpg', mediaType: 'IMAGE' }],
    });

    expect(res.status).toBe(201);
    expect(res.body.option.readyForReview).toBe(false);
  });

  it('triggers OPTION_ADDED notification to deciders', async () => {
    mockElementWithMembership();
    mockedPrisma.option.create.mockResolvedValue({
      id: 'opt-1',
      elementId: 'elem-1',
      mediaType: 'IMAGE',
      description: 'Reference photo',
      status: 'ACTIVE',
      readyForReview: false,
      uploadedById: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      assets: [
        { id: 'a1', s3Key: 'options/prod-1/uuid/photo.jpg', fileName: 'photo.jpg', mediaType: 'IMAGE', sortOrder: 0 },
      ],
    } as any);
    mockedNotifyDeciders.mockResolvedValue([]);

    const res = await request(app).post('/api/elements/elem-1/options').set(authHeader()).send({
      mediaType: 'IMAGE',
      assets: [{ s3Key: 'options/prod-1/uuid/photo.jpg', fileName: 'photo.jpg', mediaType: 'IMAGE' }],
    });

    expect(res.status).toBe(201);
    expect(mockedNotifyDeciders).toHaveBeenCalledWith(
      'prod-1',
      'user-1',
      'OPTION_ADDED',
      expect.stringContaining('JOHN'),
      expect.stringContaining('/productions/prod-1/scripts/script-1/elements/elem-1'),
    );
  });
});

describe('GET /api/elements/:elementId/options', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', tokenVersion: 0, emailVerified: true } as any);
  });

  it('returns 200 with active options', async () => {
    mockElementWithMembership();
    mockedPrisma.option.findMany.mockResolvedValue([
      {
        id: 'opt-1',
        elementId: 'elem-1',
        mediaType: 'IMAGE',
        description: 'Photo',
        status: 'ACTIVE',
        readyForReview: false,
        uploadedBy: { id: 'user-1', name: 'Test User' },
      },
    ] as any);

    const res = await request(app).get('/api/elements/elem-1/options').set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.options).toHaveLength(1);
    expect(res.body.options[0].uploadedBy).toHaveProperty('name');
  });

  it('excludes ARCHIVED options by default', async () => {
    mockElementWithMembership();
    mockedPrisma.option.findMany.mockResolvedValue([]);

    await request(app).get('/api/elements/elem-1/options').set(authHeader());

    expect(mockedPrisma.option.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'ACTIVE' }),
      }),
    );
  });

  it('includes ARCHIVED options when includeArchived=true', async () => {
    mockElementWithMembership();
    mockedPrisma.option.findMany.mockResolvedValue([]);

    await request(app)
      .get('/api/elements/elem-1/options')
      .set(authHeader())
      .query({ includeArchived: 'true' });

    expect(mockedPrisma.option.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ status: 'ACTIVE' }),
      }),
    );
  });

  it('returns 403 when not a production member', async () => {
    mockedPrisma.element.findUnique.mockResolvedValue({
      id: 'elem-1',
      scriptId: 'script-1',
      script: { productionId: 'prod-1' },
    } as any);
    mockedPrisma.productionMember.findUnique.mockResolvedValue(null);

    const res = await request(app).get('/api/elements/elem-1/options').set(authHeader());

    expect(res.status).toBe(403);
  });

  it('returns 404 when element has deletedAt set', async () => {
    mockedPrisma.element.findUnique.mockResolvedValue({
      id: 'elem-1',
      scriptId: 'script-1',
      name: 'DELETED ELEMENT',
      status: 'ACTIVE',
      deletedAt: new Date(),
      script: { productionId: 'prod-1' },
    } as any);

    const res = await request(app).get('/api/elements/elem-1/options').set(authHeader());

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/element not found/i);
  });
});

describe('PATCH /api/options/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', tokenVersion: 0, emailVerified: true } as any);
    mockedPrisma.production.findUnique.mockResolvedValue({ id: 'prod-1', status: 'ACTIVE' } as any);
  });

  it('returns 200 when toggling readyForReview', async () => {
    mockedPrisma.option.findUnique.mockResolvedValue({
      id: 'opt-1',
      elementId: 'elem-1',
      readyForReview: false,
      uploadedById: 'user-1',
      element: {
        id: 'elem-1',
        status: 'ACTIVE',
        workflowState: 'PENDING',
        name: 'JOHN',
        script: { productionId: 'prod-1' },
      },
    } as any);
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
    } as any);
    mockedPrisma.option.update.mockResolvedValue({
      id: 'opt-1',
      readyForReview: true,
    } as any);
    mockedPrisma.element.update.mockResolvedValue({} as any);
    mockedPrisma.productionMember.findMany.mockResolvedValue([]);
    mockedPrisma.notification.create.mockResolvedValue({} as any);

    const res = await request(app)
      .patch('/api/options/opt-1')
      .set(authHeader())
      .send({ readyForReview: true });

    expect(res.status).toBe(200);
    expect(res.body.option.readyForReview).toBe(true);
  });

  it('returns 400 when description exceeds max length on update', async () => {
    mockedPrisma.option.findUnique.mockResolvedValue({
      id: 'opt-1',
      elementId: 'elem-1',
      element: { script: { productionId: 'prod-1' } },
    } as any);
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
    } as any);

    const longDescription = 'a'.repeat(501);
    const res = await request(app)
      .patch('/api/options/opt-1')
      .set(authHeader())
      .send({ description: longDescription });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/description/i);
  });

  it('returns 200 when archiving via status', async () => {
    mockedPrisma.option.findUnique.mockResolvedValue({
      id: 'opt-1',
      elementId: 'elem-1',
      status: 'ACTIVE',
      element: { script: { productionId: 'prod-1' } },
    } as any);
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
    } as any);
    mockedPrisma.option.update.mockResolvedValue({
      id: 'opt-1',
      status: 'ARCHIVED',
    } as any);

    const res = await request(app)
      .patch('/api/options/opt-1')
      .set(authHeader())
      .send({ status: 'ARCHIVED' });

    expect(res.status).toBe(200);
    expect(res.body.option.status).toBe('ARCHIVED');
  });
});

// ── Element locking removed: approvals never block new options ──────────

describe('POST /api/elements/:elementId/options (no locking)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', tokenVersion: 0, emailVerified: true } as any);
    mockedPrisma.production.findUnique.mockResolvedValue({ id: 'prod-1', status: 'ACTIVE' } as any);
  });

  it('creates option with assets array', async () => {
    mockElementWithMembership();
    mockedPrisma.option.create.mockResolvedValue({
      id: 'opt-1',
      elementId: 'elem-1',
      mediaType: 'IMAGE',
      description: 'Multi-photo option',
      externalUrl: null,
      status: 'ACTIVE',
      readyForReview: false,
      uploadedById: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      assets: [
        { id: 'asset-1', s3Key: 'options/prod-1/uuid/photo1.jpg', fileName: 'photo1.jpg', mediaType: 'IMAGE', sortOrder: 0 },
        { id: 'asset-2', s3Key: 'options/prod-1/uuid/photo2.jpg', fileName: 'photo2.jpg', mediaType: 'IMAGE', sortOrder: 1 },
      ],
    } as any);

    const res = await request(app).post('/api/elements/elem-1/options').set(authHeader()).send({
      mediaType: 'IMAGE',
      description: 'Multi-photo option',
      assets: [
        { s3Key: 'options/prod-1/uuid/photo1.jpg', fileName: 'photo1.jpg', mediaType: 'IMAGE' },
        { s3Key: 'options/prod-1/uuid/photo2.jpg', fileName: 'photo2.jpg', mediaType: 'IMAGE' },
      ],
    });

    expect(res.status).toBe(201);
    expect(res.body.option.assets).toHaveLength(2);
    expect(res.body.option.assets[0].fileName).toBe('photo1.jpg');
  });

  it('creates LINK option without assets', async () => {
    mockElementWithMembership();
    mockedPrisma.option.create.mockResolvedValue({
      id: 'opt-2',
      elementId: 'elem-1',
      mediaType: 'LINK',
      description: 'Reference board',
      externalUrl: 'https://pinterest.com/board/123',
      status: 'ACTIVE',
      readyForReview: false,
      uploadedById: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      assets: [],
    } as any);

    const res = await request(app).post('/api/elements/elem-1/options').set(authHeader()).send({
      mediaType: 'LINK',
      description: 'Reference board',
      externalUrl: 'https://pinterest.com/board/123',
    });

    expect(res.status).toBe(201);
    expect(res.body.option.mediaType).toBe('LINK');
    expect(res.body.option.assets).toHaveLength(0);
  });

  it('lists options with assets included', async () => {
    mockElementWithMembership();
    mockedPrisma.option.findMany.mockResolvedValue([
      {
        id: 'opt-1',
        elementId: 'elem-1',
        mediaType: 'IMAGE',
        description: 'Photo',
        status: 'ACTIVE',
        readyForReview: false,
        uploadedBy: { id: 'user-1', name: 'Test User' },
        assets: [
          { id: 'asset-1', s3Key: 'options/prod-1/uuid/photo.jpg', fileName: 'photo.jpg', mediaType: 'IMAGE', sortOrder: 0 },
        ],
      },
    ] as any);

    const res = await request(app).get('/api/elements/elem-1/options').set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.options[0].assets).toHaveLength(1);
    expect(res.body.options[0].assets[0].s3Key).toBe('options/prod-1/uuid/photo.jpg');
  });

  it('adds asset to existing option', async () => {
    mockedPrisma.option.findUnique.mockResolvedValue({
      id: 'opt-1',
      elementId: 'elem-1',
      element: {
        id: 'elem-1',
        status: 'ACTIVE',
        script: { productionId: 'prod-1' },
      },
    } as any);
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'ADMIN',
    } as any);
    mockedPrisma.optionAsset.findFirst.mockResolvedValue({
      sortOrder: 0,
    } as any);
    mockedPrisma.optionAsset.create.mockResolvedValue({
      id: 'asset-2',
      optionId: 'opt-1',
      s3Key: 'options/prod-1/uuid/photo2.jpg',
      fileName: 'photo2.jpg',
      mediaType: 'IMAGE',
      sortOrder: 1,
      createdAt: new Date(),
    } as any);

    const res = await request(app).post('/api/options/opt-1/assets').set(authHeader()).send({
      s3Key: 'options/prod-1/uuid/photo2.jpg',
      fileName: 'photo2.jpg',
      mediaType: 'IMAGE',
    });

    expect(res.status).toBe(201);
    expect(res.body.asset.s3Key).toBe('options/prod-1/uuid/photo2.jpg');
    expect(res.body.asset.sortOrder).toBe(1);
  });

  it('rejects asset creation for non-member', async () => {
    mockedPrisma.option.findUnique.mockResolvedValue({
      id: 'opt-1',
      elementId: 'elem-1',
      element: {
        id: 'elem-1',
        script: { productionId: 'prod-1' },
      },
    } as any);
    mockedPrisma.productionMember.findUnique.mockResolvedValue(null);

    const res = await request(app).post('/api/options/opt-1/assets').set(authHeader()).send({
      s3Key: 'options/prod-1/uuid/photo.jpg',
      fileName: 'photo.jpg',
      mediaType: 'IMAGE',
    });

    expect(res.status).toBe(403);
  });

  it('rejects asset addition with wrong production s3Key prefix', async () => {
    mockedPrisma.option.findUnique.mockResolvedValue({
      id: 'opt-1',
      elementId: 'elem-1',
      element: {
        id: 'elem-1',
        script: { productionId: 'prod-1' },
      },
    } as any);
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'ADMIN',
    } as any);
    mockedPrisma.production.findUnique.mockResolvedValue({ id: 'prod-1', status: 'ACTIVE' } as any);

    const res = await request(app).post('/api/options/opt-1/assets').set(authHeader()).send({
      s3Key: 'options/prod-OTHER/uuid/photo.jpg',
      fileName: 'photo.jpg',
      mediaType: 'IMAGE',
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/s3Key/i);
  });

  it('returns 400 when asset mediaType is invalid in create option', async () => {
    mockElementWithMembership();

    const res = await request(app).post('/api/elements/elem-1/options').set(authHeader()).send({
      mediaType: 'IMAGE',
      description: 'Bad asset type',
      assets: [
        { s3Key: 'options/prod-1/uuid/photo.jpg', fileName: 'photo.jpg', mediaType: 'INVALID' },
      ],
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/mediaType/i);
  });

  it('returns 400 when mediaType is invalid in add asset endpoint', async () => {
    mockedPrisma.option.findUnique.mockResolvedValue({
      id: 'opt-1',
      elementId: 'elem-1',
      element: {
        id: 'elem-1',
        status: 'ACTIVE',
        script: { productionId: 'prod-1' },
      },
    } as any);
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'ADMIN',
    } as any);

    const res = await request(app).post('/api/options/opt-1/assets').set(authHeader()).send({
      s3Key: 'options/prod-1/uuid/photo.jpg',
      fileName: 'photo.jpg',
      mediaType: 'BOGUS',
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/mediaType/i);
  });

  it('allows creation even when element has approved option', async () => {
    mockElementWithMembership();
    mockedPrisma.option.create.mockResolvedValue({
      id: 'opt-new',
      elementId: 'elem-1',
      mediaType: 'IMAGE',
      status: 'ACTIVE',
      readyForReview: false,
    } as any);

    const res = await request(app).post('/api/elements/elem-1/options').set(authHeader()).send({
      mediaType: 'IMAGE',
      assets: [{ s3Key: 'options/prod-1/uuid/photo.jpg', fileName: 'photo.jpg', mediaType: 'IMAGE' }],
    });

    expect(res.status).toBe(201);
    // No approval.findFirst call — locking is removed
    expect(mockedPrisma.approval.findFirst).not.toHaveBeenCalled();
  });
});
