import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { signToken } from '../lib/jwt';

// Mock email service (required by auth router)
vi.mock('../services/email-service', () => ({
  sendEmail: vi.fn(),
}));

// Mock notification service (required by productions router)
vi.mock('../services/notification-service', () => ({
  createNotification: vi.fn().mockResolvedValue({ id: 'notif-1' }),
  notifyProductionMembers: vi.fn().mockResolvedValue([]),
  notifyDeciders: vi.fn().mockResolvedValue([]),
}));

// Mock S3 (required by scripts/options routers)
vi.mock('../lib/s3', () => ({
  generateUploadUrl: vi.fn(),
  generateDownloadUrl: vi.fn(),
  getFileBuffer: vi.fn(),
}));

// Mock processing progress (required by scripts router)
vi.mock('../services/processing-progress', () => ({
  getProgress: vi.fn(),
  setProgress: vi.fn(),
  clearProgress: vi.fn(),
}));

// Mock Prisma client
vi.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    script: {
      findUnique: vi.fn(),
    },
    productionMember: {
      findUnique: vi.fn(),
    },
    directorNote: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from '../lib/prisma';

const mockedPrisma = vi.mocked(prisma);

const deciderUser = { userId: 'user-decider', email: 'decider@example.com' };
const memberUser = { userId: 'user-member', email: 'member@example.com' };

function authHeaderFor(user: { userId: string; email: string }) {
  const token = signToken(user);
  return { Authorization: `Bearer ${token}` };
}

function mockScriptAndMembership(role: string, userId: string) {
  mockedPrisma.script.findUnique.mockResolvedValue({
    id: 'script-1',
    productionId: 'prod-1',
  } as any);

  mockedPrisma.productionMember.findUnique.mockResolvedValue({
    id: 'member-1',
    productionId: 'prod-1',
    userId,
    role,
  } as any);
}

describe('GET /api/scripts/:scriptId/director-notes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns non-deleted notes for members', async () => {
    mockScriptAndMembership('MEMBER', 'user-member');

    mockedPrisma.directorNote.findMany.mockResolvedValue([
      {
        id: 'note-1',
        scriptId: 'script-1',
        sceneNumber: 1,
        note: 'More tension here',
        createdById: 'user-decider',
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: { id: 'user-decider', name: 'Director' },
      },
    ] as any);

    const res = await request(app)
      .get('/api/scripts/script-1/director-notes')
      .set(authHeaderFor(memberUser));

    expect(res.status).toBe(200);
    expect(res.body.notes).toHaveLength(1);
    expect(res.body.notes[0].note).toBe('More tension here');
  });

  it('excludes soft-deleted notes', async () => {
    mockScriptAndMembership('MEMBER', 'user-member');

    mockedPrisma.directorNote.findMany.mockResolvedValue([] as any);

    const res = await request(app)
      .get('/api/scripts/script-1/director-notes')
      .set(authHeaderFor(memberUser));

    expect(res.status).toBe(200);
    // The mock filters by deletedAt: null — verify the where clause
    expect(mockedPrisma.directorNote.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          scriptId: 'script-1',
          deletedAt: null,
        }),
      }),
    );
  });
});

describe('POST /api/scripts/:scriptId/director-notes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a note for DECIDER', async () => {
    mockScriptAndMembership('DECIDER', 'user-decider');

    mockedPrisma.directorNote.create.mockResolvedValue({
      id: 'note-1',
      scriptId: 'script-1',
      sceneNumber: 3,
      note: 'Add more drama',
      createdById: 'user-decider',
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const res = await request(app)
      .post('/api/scripts/script-1/director-notes')
      .set(authHeaderFor(deciderUser))
      .send({ sceneNumber: 3, note: 'Add more drama' });

    expect(res.status).toBe(201);
    expect(res.body.note.sceneNumber).toBe(3);
    expect(res.body.note.note).toBe('Add more drama');
  });

  it('returns 403 for MEMBER', async () => {
    mockScriptAndMembership('MEMBER', 'user-member');

    const res = await request(app)
      .post('/api/scripts/script-1/director-notes')
      .set(authHeaderFor(memberUser))
      .send({ sceneNumber: 1, note: 'My note' });

    expect(res.status).toBe(403);
  });
});

describe('PATCH /api/director-notes/:noteId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates note for author', async () => {
    mockedPrisma.directorNote.findUnique.mockResolvedValue({
      id: 'note-1',
      scriptId: 'script-1',
      sceneNumber: 1,
      note: 'Old note',
      createdById: 'user-decider',
      deletedAt: null,
      script: { productionId: 'prod-1' },
    } as any);

    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-decider',
      role: 'DECIDER',
    } as any);

    mockedPrisma.directorNote.update.mockResolvedValue({
      id: 'note-1',
      scriptId: 'script-1',
      sceneNumber: 1,
      note: 'Updated note',
      createdById: 'user-decider',
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const res = await request(app)
      .patch('/api/director-notes/note-1')
      .set(authHeaderFor(deciderUser))
      .send({ note: 'Updated note' });

    expect(res.status).toBe(200);
    expect(res.body.note.note).toBe('Updated note');
  });

  it('returns 403 for non-author', async () => {
    mockedPrisma.directorNote.findUnique.mockResolvedValue({
      id: 'note-1',
      scriptId: 'script-1',
      sceneNumber: 1,
      note: 'Director note',
      createdById: 'user-decider', // Different from memberUser
      deletedAt: null,
      script: { productionId: 'prod-1' },
    } as any);

    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-2',
      productionId: 'prod-1',
      userId: 'user-member',
      role: 'MEMBER',
    } as any);

    const res = await request(app)
      .patch('/api/director-notes/note-1')
      .set(authHeaderFor(memberUser))
      .send({ note: 'Hacked note' });

    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/director-notes/:noteId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('soft-deletes note for author (sets deletedAt)', async () => {
    mockedPrisma.directorNote.findUnique.mockResolvedValue({
      id: 'note-1',
      scriptId: 'script-1',
      sceneNumber: 1,
      note: 'To delete',
      createdById: 'user-decider',
      deletedAt: null,
      script: { productionId: 'prod-1' },
    } as any);

    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-decider',
      role: 'DECIDER',
    } as any);

    mockedPrisma.directorNote.update.mockResolvedValue({
      id: 'note-1',
      deletedAt: new Date(),
    } as any);

    const res = await request(app)
      .delete('/api/director-notes/note-1')
      .set(authHeaderFor(deciderUser));

    expect(res.status).toBe(200);
    expect(mockedPrisma.directorNote.update).toHaveBeenCalledWith({
      where: { id: 'note-1' },
      data: { deletedAt: expect.any(Date) },
    });
  });
});
