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
  role: 'CONTRIBUTOR',
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
