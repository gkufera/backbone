import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { signToken } from '../lib/jwt';

// Mock Prisma client
vi.mock('../lib/prisma', () => ({
  prisma: {
    element: {
      findUnique: vi.fn(),
    },
    option: {
      findUnique: vi.fn(),
    },
    production: {
      findUnique: vi.fn(),
    },
    productionMember: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    note: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    noteAttachment: {
      findFirst: vi.fn(),
    },
    notification: {
      create: vi.fn(),
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

function mockElementWithMembership() {
  mockedPrisma.element.findUnique.mockResolvedValue({
    id: 'elem-1',
    scriptId: 'script-1',
    name: 'JOHN',
    status: 'ACTIVE',
    script: { productionId: 'prod-1' },
  } as any);

  mockedPrisma.production.findUnique.mockResolvedValue({ id: 'prod-1', status: 'ACTIVE' } as any);

  mockedPrisma.productionMember.findUnique.mockResolvedValue({
    id: 'member-1',
    productionId: 'prod-1',
    userId: 'user-1',
    role: 'MEMBER',
  } as any);
}

function mockOptionWithMembership() {
  mockedPrisma.option.findUnique.mockResolvedValue({
    id: 'opt-1',
    elementId: 'elem-1',
    status: 'ACTIVE',
    element: {
      id: 'elem-1',
      scriptId: 'script-1',
      script: { productionId: 'prod-1' },
    },
  } as any);

  mockedPrisma.production.findUnique.mockResolvedValue({ id: 'prod-1', status: 'ACTIVE' } as any);

  mockedPrisma.productionMember.findUnique.mockResolvedValue({
    id: 'member-1',
    productionId: 'prod-1',
    userId: 'user-1',
    role: 'MEMBER',
  } as any);
}

// ── Department enrichment tests ──────────────────────────────────

describe('GET /api/elements/:elementId/notes returns user department name', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValueOnce({ id: 'user-1', tokenVersion: 0, emailVerified: true } as any);
  });

  it('includes department name on each note', async () => {
    mockElementWithMembership();
    mockedPrisma.note.findMany.mockResolvedValue([
      {
        id: 'note-1',
        content: 'Great reference',
        userId: 'user-1',
        elementId: 'elem-1',
        optionId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: 'user-1', name: 'Test User' },
      },
    ] as any);
    mockedPrisma.productionMember.findMany.mockResolvedValue([
      {
        userId: 'user-1',
        department: { name: 'Art Department' },
      },
    ] as any);

    const res = await request(app)
      .get('/api/elements/elem-1/notes')
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.notes[0].department).toBe('Art Department');
  });
});

describe('POST /api/elements/:elementId/notes returns user department name', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValueOnce({ id: 'user-1', tokenVersion: 0, emailVerified: true } as any);
  });

  it('includes department name on created note', async () => {
    mockElementWithMembership();
    // Override the membership mock to include department
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'MEMBER',
      department: { name: 'Props' },
    } as any);
    mockedPrisma.note.create.mockResolvedValue({
      id: 'note-1',
      content: 'Nice find',
      userId: 'user-1',
      elementId: 'elem-1',
      optionId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: { id: 'user-1', name: 'Test User' },
    } as any);
    mockedPrisma.productionMember.findMany.mockResolvedValue([
      { userId: 'user-2' },
    ] as any);
    mockedPrisma.notification.create.mockResolvedValue({} as any);
    mockedPrisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/elements/elem-1/notes')
      .set(authHeader())
      .send({ content: 'Nice find' });

    expect(res.status).toBe(201);
    expect(res.body.note.department).toBe('Props');
  });
});

describe('GET /api/options/:optionId/notes returns user department name', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValueOnce({ id: 'user-1', tokenVersion: 0, emailVerified: true } as any);
  });

  it('includes department name on each option note', async () => {
    mockOptionWithMembership();
    mockedPrisma.note.findMany.mockResolvedValue([
      {
        id: 'note-1',
        content: 'Good angle',
        userId: 'user-1',
        elementId: null,
        optionId: 'opt-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: 'user-1', name: 'Test User' },
      },
    ] as any);
    mockedPrisma.productionMember.findMany.mockResolvedValue([
      {
        userId: 'user-1',
        department: { name: 'Camera' },
      },
    ] as any);

    const res = await request(app)
      .get('/api/options/opt-1/notes')
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.notes[0].department).toBe('Camera');
  });
});

describe('POST /api/options/:optionId/notes returns user department name', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValueOnce({ id: 'user-1', tokenVersion: 0, emailVerified: true } as any);
  });

  it('includes department name on created option note', async () => {
    mockOptionWithMembership();
    // Override the membership mock to include department
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'MEMBER',
      department: { name: 'Wardrobe' },
    } as any);
    mockedPrisma.note.create.mockResolvedValue({
      id: 'note-2',
      content: 'Fabric looks right',
      userId: 'user-1',
      elementId: null,
      optionId: 'opt-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      user: { id: 'user-1', name: 'Test User' },
    } as any);
    mockedPrisma.productionMember.findMany.mockResolvedValue([]);

    const res = await request(app)
      .post('/api/options/opt-1/notes')
      .set(authHeader())
      .send({ content: 'Fabric looks right' });

    expect(res.status).toBe(201);
    expect(res.body.note.department).toBe('Wardrobe');
  });
});

describe('GET /api/elements/:elementId/notes returns null department for unassigned user', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValueOnce({ id: 'user-1', tokenVersion: 0, emailVerified: true } as any);
  });

  it('returns department as null when user has no department assignment', async () => {
    mockElementWithMembership();
    mockedPrisma.note.findMany.mockResolvedValue([
      {
        id: 'note-1',
        content: 'No department user',
        userId: 'user-1',
        elementId: 'elem-1',
        optionId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: 'user-1', name: 'Test User' },
      },
    ] as any);
    mockedPrisma.productionMember.findMany.mockResolvedValue([
      {
        userId: 'user-1',
        department: null,
      },
    ] as any);

    const res = await request(app)
      .get('/api/elements/elem-1/notes')
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.notes[0].department).toBeNull();
  });
});

// ── POST /api/elements/:elementId/notes ──────────────────────────

describe('POST /api/elements/:elementId/notes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValueOnce({ id: 'user-1', tokenVersion: 0, emailVerified: true } as any);
  });

  it('creates note and returns 201', async () => {
    mockElementWithMembership();
    mockedPrisma.note.create.mockResolvedValue({
      id: 'note-1',
      content: 'This looks great',
      userId: 'user-1',
      elementId: 'elem-1',
      optionId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: { id: 'user-1', name: 'Test User' },
    } as any);
    mockedPrisma.productionMember.findMany.mockResolvedValue([
      { userId: 'user-2' },
    ] as any);
    mockedPrisma.notification.create.mockResolvedValue({} as any);
    mockedPrisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/elements/elem-1/notes')
      .set(authHeader())
      .send({ content: 'This looks great' });

    expect(res.status).toBe(201);
    expect(res.body.note.content).toBe('This looks great');
    expect(res.body.note.elementId).toBe('elem-1');
  });

  it('rejects empty content', async () => {
    mockElementWithMembership();

    const res = await request(app)
      .post('/api/elements/elem-1/notes')
      .set(authHeader())
      .send({ content: '' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/content/i);
  });

  it('rejects content exceeding max length', async () => {
    mockElementWithMembership();

    const longContent = 'a'.repeat(2001);
    const res = await request(app)
      .post('/api/elements/elem-1/notes')
      .set(authHeader())
      .send({ content: longContent });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/2000/);
  });

  it('returns 403 for non-members', async () => {
    mockedPrisma.element.findUnique.mockResolvedValue({
      id: 'elem-1',
      scriptId: 'script-1',
      script: { productionId: 'prod-1' },
    } as any);
    mockedPrisma.productionMember.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/elements/elem-1/notes')
      .set(authHeader())
      .send({ content: 'test' });

    expect(res.status).toBe(403);
  });

  it('returns 403 when member has been soft-deleted', async () => {
    mockedPrisma.element.findUnique.mockResolvedValue({
      id: 'elem-1',
      scriptId: 'script-1',
      name: 'JOHN',
      status: 'ACTIVE',
      script: { productionId: 'prod-1' },
    } as any);
    mockedPrisma.production.findUnique.mockResolvedValue({ id: 'prod-1', status: 'ACTIVE' } as any);
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'MEMBER',
      deletedAt: new Date(),
    } as any);

    const res = await request(app)
      .post('/api/elements/elem-1/notes')
      .set(authHeader())
      .send({ content: 'test' });

    expect(res.status).toBe(403);
  });

  it('returns 404 when element not found', async () => {
    mockedPrisma.element.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/elements/nonexistent/notes')
      .set(authHeader())
      .send({ content: 'test' });

    expect(res.status).toBe(404);
  });

  it('returns 403 when production is PENDING', async () => {
    mockedPrisma.element.findUnique.mockResolvedValue({
      id: 'elem-1',
      scriptId: 'script-1',
      name: 'JOHN',
      status: 'ACTIVE',
      script: { productionId: 'prod-1' },
    } as any);
    mockedPrisma.production.findUnique.mockResolvedValue({ id: 'prod-1', status: 'PENDING' } as any);

    const res = await request(app)
      .post('/api/elements/elem-1/notes')
      .set(authHeader())
      .send({ content: 'test' });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/pending/i);
  });
});

// ── GET /api/elements/:elementId/notes ──────────────────────────

describe('GET /api/elements/:elementId/notes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValueOnce({ id: 'user-1', tokenVersion: 0, emailVerified: true } as any);
  });

  it('returns notes with user info', async () => {
    mockElementWithMembership();
    mockedPrisma.note.findMany.mockResolvedValue([
      {
        id: 'note-1',
        content: 'Great reference',
        userId: 'user-1',
        elementId: 'elem-1',
        optionId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: 'user-1', name: 'Test User' },
      },
    ] as any);

    const res = await request(app)
      .get('/api/elements/elem-1/notes')
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.notes).toHaveLength(1);
    expect(res.body.notes[0].content).toBe('Great reference');
    expect(res.body.notes[0].user.name).toBe('Test User');
  });

  it('returns empty array when no notes', async () => {
    mockElementWithMembership();
    mockedPrisma.note.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get('/api/elements/elem-1/notes')
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.notes).toHaveLength(0);
  });

  it('returns 403 when member has been soft-deleted', async () => {
    mockedPrisma.element.findUnique.mockResolvedValue({
      id: 'elem-1',
      scriptId: 'script-1',
      name: 'JOHN',
      status: 'ACTIVE',
      script: { productionId: 'prod-1' },
    } as any);
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'MEMBER',
      deletedAt: new Date(),
    } as any);

    const res = await request(app)
      .get('/api/elements/elem-1/notes')
      .set(authHeader());

    expect(res.status).toBe(403);
  });
});

// ── POST /api/options/:optionId/notes ──────────────────────────

describe('POST /api/options/:optionId/notes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValueOnce({ id: 'user-1', tokenVersion: 0, emailVerified: true } as any);
  });

  it('creates option note and returns 201', async () => {
    mockOptionWithMembership();
    mockedPrisma.note.create.mockResolvedValue({
      id: 'note-2',
      content: 'Good angle',
      userId: 'user-1',
      elementId: null,
      optionId: 'opt-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      user: { id: 'user-1', name: 'Test User' },
    } as any);
    mockedPrisma.productionMember.findMany.mockResolvedValue([]);

    const res = await request(app)
      .post('/api/options/opt-1/notes')
      .set(authHeader())
      .send({ content: 'Good angle' });

    expect(res.status).toBe(201);
    expect(res.body.note.content).toBe('Good angle');
    expect(res.body.note.optionId).toBe('opt-1');
  });

  it('returns 404 when option not found', async () => {
    mockedPrisma.option.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/options/nonexistent/notes')
      .set(authHeader())
      .send({ content: 'test' });

    expect(res.status).toBe(404);
  });

  it('returns 403 when member has been soft-deleted', async () => {
    mockOptionWithMembership();
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'MEMBER',
      deletedAt: new Date(),
    } as any);

    const res = await request(app)
      .post('/api/options/opt-1/notes')
      .set(authHeader())
      .send({ content: 'test' });

    expect(res.status).toBe(403);
  });

  it('returns 403 when production is PENDING', async () => {
    mockedPrisma.option.findUnique.mockResolvedValue({
      id: 'opt-1',
      elementId: 'elem-1',
      status: 'ACTIVE',
      element: {
        id: 'elem-1',
        scriptId: 'script-1',
        script: { productionId: 'prod-1' },
      },
    } as any);
    mockedPrisma.production.findUnique.mockResolvedValue({ id: 'prod-1', status: 'PENDING' } as any);

    const res = await request(app)
      .post('/api/options/opt-1/notes')
      .set(authHeader())
      .send({ content: 'test' });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/pending/i);
  });
});

// ── GET /api/options/:optionId/notes ──────────────────────────

describe('GET /api/options/:optionId/notes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValueOnce({ id: 'user-1', tokenVersion: 0, emailVerified: true } as any);
  });

  it('returns option notes with user info', async () => {
    mockOptionWithMembership();
    mockedPrisma.note.findMany.mockResolvedValue([
      {
        id: 'note-2',
        content: 'Nice shot',
        userId: 'user-1',
        elementId: null,
        optionId: 'opt-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: 'user-1', name: 'Test User' },
      },
    ] as any);

    const res = await request(app)
      .get('/api/options/opt-1/notes')
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.notes).toHaveLength(1);
    expect(res.body.notes[0].content).toBe('Nice shot');
  });

  it('returns 403 when member has been soft-deleted', async () => {
    mockedPrisma.option.findUnique.mockResolvedValue({
      id: 'opt-1',
      elementId: 'elem-1',
      status: 'ACTIVE',
      element: {
        id: 'elem-1',
        scriptId: 'script-1',
        script: { productionId: 'prod-1' },
      },
    } as any);
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'MEMBER',
      deletedAt: new Date(),
    } as any);

    const res = await request(app)
      .get('/api/options/opt-1/notes')
      .set(authHeader());

    expect(res.status).toBe(403);
  });
});

// Mock S3 service
vi.mock('../lib/s3', () => ({
  generateDownloadUrl: vi.fn().mockResolvedValue('https://s3.example.com/presigned-url'),
  generateUploadUrl: vi.fn(),
  generateMediaUploadUrl: vi.fn(),
}));

// ── GET /api/notes/attachment-download-url ───────────────────────────

describe('GET /api/notes/attachment-download-url', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValueOnce({ id: 'user-1', tokenVersion: 0, emailVerified: true } as any);
  });

  it('returns download URL for valid s3Key with membership', async () => {
    mockedPrisma.noteAttachment.findFirst.mockResolvedValue({
      id: 'att-1',
      noteId: 'note-1',
      s3Key: 'uploads/img.jpg',
      fileName: 'img.jpg',
      mediaType: 'IMAGE',
      createdAt: new Date(),
      note: {
        option: {
          element: {
            script: { productionId: 'prod-1' },
          },
        },
      },
    } as any);
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
    } as any);

    const res = await request(app)
      .get('/api/notes/attachment-download-url?s3Key=uploads/img.jpg')
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.downloadUrl).toBe('https://s3.example.com/presigned-url');
  });

  it('returns 400 when s3Key missing', async () => {
    const res = await request(app)
      .get('/api/notes/attachment-download-url')
      .set(authHeader());

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/s3Key/i);
  });

  it('returns 404 when attachment not found', async () => {
    mockedPrisma.noteAttachment.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/notes/attachment-download-url?s3Key=uploads/missing.jpg')
      .set(authHeader());

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('returns 403 for non-member', async () => {
    mockedPrisma.noteAttachment.findFirst.mockResolvedValue({
      id: 'att-1',
      noteId: 'note-1',
      s3Key: 'uploads/img.jpg',
      fileName: 'img.jpg',
      mediaType: 'IMAGE',
      createdAt: new Date(),
      note: {
        option: {
          element: {
            script: { productionId: 'prod-1' },
          },
        },
      },
    } as any);
    mockedPrisma.productionMember.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/notes/attachment-download-url?s3Key=uploads/img.jpg')
      .set(authHeader());

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/member/i);
  });

  it('returns 403 when member has been soft-deleted', async () => {
    mockedPrisma.noteAttachment.findFirst.mockResolvedValue({
      id: 'att-1',
      noteId: 'note-1',
      s3Key: 'uploads/img.jpg',
      fileName: 'img.jpg',
      mediaType: 'IMAGE',
      createdAt: new Date(),
      note: {
        option: {
          element: {
            script: { productionId: 'prod-1' },
          },
        },
      },
    } as any);
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'MEMBER',
      deletedAt: new Date(),
    } as any);

    const res = await request(app)
      .get('/api/notes/attachment-download-url?s3Key=uploads/img.jpg')
      .set(authHeader());

    expect(res.status).toBe(403);
  });
});

// ── GET notes includes attachments ───────────────────────────────────

describe('GET /api/options/:optionId/notes includes attachments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValueOnce({ id: 'user-1', tokenVersion: 0, emailVerified: true } as any);
  });

  it('returns notes with nested attachments array', async () => {
    mockOptionWithMembership();
    mockedPrisma.note.findMany.mockResolvedValue([
      {
        id: 'note-1',
        content: 'Check this',
        userId: 'user-1',
        elementId: null,
        optionId: 'opt-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: 'user-1', name: 'Test User' },
        attachments: [
          {
            id: 'att-1',
            noteId: 'note-1',
            s3Key: 'uploads/img.jpg',
            fileName: 'img.jpg',
            mediaType: 'IMAGE',
            createdAt: new Date(),
          },
        ],
      },
    ] as any);
    mockedPrisma.productionMember.findMany.mockResolvedValue([
      { userId: 'user-1', department: null },
    ] as any);

    const res = await request(app)
      .get('/api/options/opt-1/notes')
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.notes[0].attachments).toHaveLength(1);
    expect(res.body.notes[0].attachments[0].fileName).toBe('img.jpg');
  });

  it('returns empty attachments array for text-only notes', async () => {
    mockOptionWithMembership();
    mockedPrisma.note.findMany.mockResolvedValue([
      {
        id: 'note-2',
        content: 'Text only',
        userId: 'user-1',
        elementId: null,
        optionId: 'opt-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: 'user-1', name: 'Test User' },
        attachments: [],
      },
    ] as any);
    mockedPrisma.productionMember.findMany.mockResolvedValue([
      { userId: 'user-1', department: null },
    ] as any);

    const res = await request(app)
      .get('/api/options/opt-1/notes')
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.notes[0].attachments).toHaveLength(0);
  });
});

// ── POST /api/options/:optionId/notes with attachments ──────────────

describe('POST /api/options/:optionId/notes — attachments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValueOnce({ id: 'user-1', tokenVersion: 0, emailVerified: true } as any);
  });

  it('creates note with attachments array', async () => {
    mockOptionWithMembership();
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'MEMBER',
    } as any);
    mockedPrisma.note.create.mockResolvedValue({
      id: 'note-3',
      content: 'See attached',
      userId: 'user-1',
      elementId: null,
      optionId: 'opt-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      user: { id: 'user-1', name: 'Test User' },
      attachments: [
        {
          id: 'att-1',
          noteId: 'note-3',
          s3Key: 'uploads/img.jpg',
          fileName: 'img.jpg',
          mediaType: 'IMAGE',
          createdAt: new Date(),
        },
      ],
    } as any);
    mockedPrisma.productionMember.findMany.mockResolvedValue([]);

    const res = await request(app)
      .post('/api/options/opt-1/notes')
      .set(authHeader())
      .send({
        content: 'See attached',
        attachments: [{ s3Key: 'uploads/img.jpg', fileName: 'img.jpg', mediaType: 'IMAGE' }],
      });

    expect(res.status).toBe(201);
    expect(res.body.note.attachments).toHaveLength(1);
    expect(res.body.note.attachments[0].fileName).toBe('img.jpg');
  });

  it('creates note with attachments and empty content (media-only)', async () => {
    mockOptionWithMembership();
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'MEMBER',
    } as any);
    mockedPrisma.note.create.mockResolvedValue({
      id: 'note-4',
      content: '',
      userId: 'user-1',
      elementId: null,
      optionId: 'opt-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      user: { id: 'user-1', name: 'Test User' },
      attachments: [
        {
          id: 'att-2',
          noteId: 'note-4',
          s3Key: 'uploads/video.mp4',
          fileName: 'video.mp4',
          mediaType: 'VIDEO',
          createdAt: new Date(),
        },
      ],
    } as any);
    mockedPrisma.productionMember.findMany.mockResolvedValue([]);

    const res = await request(app)
      .post('/api/options/opt-1/notes')
      .set(authHeader())
      .send({
        content: '',
        attachments: [{ s3Key: 'uploads/video.mp4', fileName: 'video.mp4', mediaType: 'VIDEO' }],
      });

    expect(res.status).toBe(201);
    expect(res.body.note.content).toBe('');
    expect(res.body.note.attachments).toHaveLength(1);
  });

  it('rejects note with no content AND no attachments', async () => {
    mockOptionWithMembership();

    const res = await request(app)
      .post('/api/options/opt-1/notes')
      .set(authHeader())
      .send({ content: '', attachments: [] });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/content.*attachment/i);
  });

  it('rejects note with >5 attachments', async () => {
    mockOptionWithMembership();

    const attachments = Array.from({ length: 6 }, (_, i) => ({
      s3Key: `uploads/file${i}.jpg`,
      fileName: `file${i}.jpg`,
      mediaType: 'IMAGE',
    }));

    const res = await request(app)
      .post('/api/options/opt-1/notes')
      .set(authHeader())
      .send({ content: 'Too many', attachments });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/5/);
  });

  it('rejects attachment with invalid mediaType', async () => {
    mockOptionWithMembership();

    const res = await request(app)
      .post('/api/options/opt-1/notes')
      .set(authHeader())
      .send({
        content: 'Bad type',
        attachments: [{ s3Key: 'uploads/file.xyz', fileName: 'file.xyz', mediaType: 'INVALID' }],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/media.*type/i);
  });

  it('creates text-only note (backward compatible, empty attachments)', async () => {
    mockOptionWithMembership();
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'MEMBER',
    } as any);
    mockedPrisma.note.create.mockResolvedValue({
      id: 'note-5',
      content: 'Text only',
      userId: 'user-1',
      elementId: null,
      optionId: 'opt-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      user: { id: 'user-1', name: 'Test User' },
      attachments: [],
    } as any);
    mockedPrisma.productionMember.findMany.mockResolvedValue([]);

    const res = await request(app)
      .post('/api/options/opt-1/notes')
      .set(authHeader())
      .send({ content: 'Text only' });

    expect(res.status).toBe(201);
    expect(res.body.note.content).toBe('Text only');
    expect(res.body.note.attachments).toHaveLength(0);
  });
});
