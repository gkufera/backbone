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
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    option: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
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
vi.mock('../lib/s3.js', () => ({
  generateUploadUrl: vi.fn(),
  getFileBuffer: vi.fn(),
  generateMediaUploadUrl: vi.fn(),
  generateDownloadUrl: vi.fn(),
}));

import { prisma } from '../lib/prisma.js';
import { generateMediaUploadUrl, generateDownloadUrl } from '../lib/s3.js';

const mockedPrisma = vi.mocked(prisma);
const mockedGenerateMediaUploadUrl = vi.mocked(generateMediaUploadUrl);
const mockedGenerateDownloadUrl = vi.mocked(generateDownloadUrl);

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
  });

  it('returns 200 with upload URL for image/jpeg', async () => {
    mockedGenerateMediaUploadUrl.mockResolvedValue({
      uploadUrl: 'https://s3.amazonaws.com/bucket/options/uuid/photo.jpg?signed',
      s3Key: 'options/uuid/photo.jpg',
    });

    const res = await request(app)
      .post('/api/options/upload-url')
      .set(authHeader())
      .send({ fileName: 'photo.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('uploadUrl');
    expect(res.body).toHaveProperty('s3Key');
    expect(res.body.mediaType).toBe('IMAGE');
  });

  it('returns 200 with upload URL for video/mp4', async () => {
    mockedGenerateMediaUploadUrl.mockResolvedValue({
      uploadUrl: 'https://s3.amazonaws.com/bucket/options/uuid/clip.mp4?signed',
      s3Key: 'options/uuid/clip.mp4',
    });

    const res = await request(app)
      .post('/api/options/upload-url')
      .set(authHeader())
      .send({ fileName: 'clip.mp4', contentType: 'video/mp4' });

    expect(res.status).toBe(200);
    expect(res.body.mediaType).toBe('VIDEO');
  });

  it('returns 200 with upload URL for audio/mpeg', async () => {
    mockedGenerateMediaUploadUrl.mockResolvedValue({
      uploadUrl: 'https://s3.amazonaws.com/bucket/options/uuid/track.mp3?signed',
      s3Key: 'options/uuid/track.mp3',
    });

    const res = await request(app)
      .post('/api/options/upload-url')
      .set(authHeader())
      .send({ fileName: 'track.mp3', contentType: 'audio/mpeg' });

    expect(res.status).toBe(200);
    expect(res.body.mediaType).toBe('AUDIO');
  });

  it('returns 200 with thumbnail URLs when thumbnailFileName is provided', async () => {
    mockedGenerateMediaUploadUrl
      .mockResolvedValueOnce({
        uploadUrl: 'https://s3.amazonaws.com/bucket/options/uuid/photo.jpg?signed',
        s3Key: 'options/uuid/photo.jpg',
      })
      .mockResolvedValueOnce({
        uploadUrl: 'https://s3.amazonaws.com/bucket/options/uuid/thumb.jpg?signed',
        s3Key: 'options/uuid/thumb.jpg',
      });

    const res = await request(app).post('/api/options/upload-url').set(authHeader()).send({
      fileName: 'photo.jpg',
      contentType: 'image/jpeg',
      thumbnailFileName: 'thumb.jpg',
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('uploadUrl');
    expect(res.body).toHaveProperty('thumbnailUploadUrl');
    expect(res.body).toHaveProperty('thumbnailS3Key');
  });

  it('returns 400 when fileName is missing', async () => {
    const res = await request(app)
      .post('/api/options/upload-url')
      .set(authHeader())
      .send({ contentType: 'image/jpeg' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/fileName/i);
  });

  it('returns 400 when contentType is not allowed', async () => {
    const res = await request(app)
      .post('/api/options/upload-url')
      .set(authHeader())
      .send({ fileName: 'doc.exe', contentType: 'application/x-msdownload' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/content type/i);
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app)
      .post('/api/options/upload-url')
      .send({ fileName: 'photo.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/options/download-url', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with download URL', async () => {
    mockedGenerateDownloadUrl.mockResolvedValue(
      'https://s3.amazonaws.com/bucket/options/uuid/photo.jpg?signed-get',
    );

    const res = await request(app)
      .get('/api/options/download-url')
      .set(authHeader())
      .query({ s3Key: 'options/uuid/photo.jpg' });

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
  });

  it('returns 201 when creating IMAGE option with s3Key', async () => {
    mockElementWithMembership();
    mockedPrisma.option.create.mockResolvedValue({
      id: 'opt-1',
      elementId: 'elem-1',
      mediaType: 'IMAGE',
      description: 'Costume reference',
      s3Key: 'options/uuid/photo.jpg',
      fileName: 'photo.jpg',
      externalUrl: null,
      thumbnailS3Key: null,
      status: 'ACTIVE',
      readyForReview: false,
      uploadedById: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const res = await request(app).post('/api/elements/elem-1/options').set(authHeader()).send({
      mediaType: 'IMAGE',
      description: 'Costume reference',
      s3Key: 'options/uuid/photo.jpg',
      fileName: 'photo.jpg',
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
      s3Key: 'options/uuid/photo.jpg',
      fileName: 'photo.jpg',
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

  it('returns 400 when IMAGE option has no s3Key', async () => {
    mockElementWithMembership();

    const res = await request(app).post('/api/elements/elem-1/options').set(authHeader()).send({
      mediaType: 'IMAGE',
      description: 'Missing file',
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/s3Key/i);
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
      s3Key: 'options/uuid/photo.jpg',
      fileName: 'photo.jpg',
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
        s3Key: 'options/uuid/photo.jpg',
        fileName: 'photo.jpg',
      });

    expect(res.status).toBe(404);
  });

  it('returns 400 when description exceeds max length', async () => {
    mockElementWithMembership();

    const longDescription = 'a'.repeat(501);
    const res = await request(app).post('/api/elements/elem-1/options').set(authHeader()).send({
      mediaType: 'IMAGE',
      description: longDescription,
      s3Key: 'options/uuid/photo.jpg',
      fileName: 'photo.jpg',
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
      s3Key: 'options/uuid/photo.jpg',
      fileName: 'photo.jpg',
    });

    expect(res.status).toBe(201);
    expect(res.body.option.readyForReview).toBe(false);
  });
});

describe('GET /api/elements/:elementId/options', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});

describe('PATCH /api/options/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

// ── Element locking: 409 when element has approved option ──────────

describe('POST /api/elements/:elementId/options (element locking)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 409 when element has an approved option', async () => {
    mockElementWithMembership();
    mockedPrisma.approval.findFirst.mockResolvedValue({
      id: 'appr-1',
      decision: 'APPROVED',
    } as any);

    const res = await request(app).post('/api/elements/elem-1/options').set(authHeader()).send({
      mediaType: 'IMAGE',
      s3Key: 'options/uuid/photo.jpg',
      fileName: 'photo.jpg',
    });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/locked/i);
  });

  it('allows creation when element has only REJECTED approvals', async () => {
    mockElementWithMembership();
    mockedPrisma.approval.findFirst.mockResolvedValue(null);
    mockedPrisma.option.create.mockResolvedValue({
      id: 'opt-new',
      elementId: 'elem-1',
      mediaType: 'IMAGE',
      status: 'ACTIVE',
      readyForReview: false,
    } as any);

    const res = await request(app).post('/api/elements/elem-1/options').set(authHeader()).send({
      mediaType: 'IMAGE',
      s3Key: 'options/uuid/photo.jpg',
      fileName: 'photo.jpg',
    });

    expect(res.status).toBe(201);
  });

  it('allows creation when element has only tentative APPROVED approvals', async () => {
    mockElementWithMembership();
    // findFirst returns null because tentative: false is in the filter
    mockedPrisma.approval.findFirst.mockResolvedValue(null);
    mockedPrisma.option.create.mockResolvedValue({
      id: 'opt-new',
      elementId: 'elem-1',
      mediaType: 'IMAGE',
      status: 'ACTIVE',
      readyForReview: false,
    } as any);

    const res = await request(app).post('/api/elements/elem-1/options').set(authHeader()).send({
      mediaType: 'IMAGE',
      s3Key: 'options/uuid/photo.jpg',
      fileName: 'photo.jpg',
    });

    expect(res.status).toBe(201);
    // Verify the lock check includes tentative: false filter
    expect(mockedPrisma.approval.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          decision: 'APPROVED',
          tentative: false,
        }),
      }),
    );
  });

  it('allows creation when element has only MAYBE approvals', async () => {
    mockElementWithMembership();
    mockedPrisma.approval.findFirst.mockResolvedValue(null);
    mockedPrisma.option.create.mockResolvedValue({
      id: 'opt-new',
      elementId: 'elem-1',
      mediaType: 'IMAGE',
      status: 'ACTIVE',
      readyForReview: false,
    } as any);

    const res = await request(app).post('/api/elements/elem-1/options').set(authHeader()).send({
      mediaType: 'IMAGE',
      s3Key: 'options/uuid/photo.jpg',
      fileName: 'photo.jpg',
    });

    expect(res.status).toBe(201);
  });
});
