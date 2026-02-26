import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { signToken } from '../lib/jwt';

// Mock Prisma client
vi.mock('../lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    production: { findUnique: vi.fn() },
    productionMember: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    script: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn(), create: vi.fn() },
    element: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
      createMany: vi.fn(),
    },
    department: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    option: { findMany: vi.fn() },
    note: { findMany: vi.fn(), create: vi.fn() },
    notification: { create: vi.fn() },
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
}));

vi.mock('../services/sms-service', () => ({
  sendSms: vi.fn(),
}));

vi.mock('../services/pdf-parser', () => ({
  parsePdf: vi.fn(),
}));

vi.mock('../services/element-detector', () => ({
  detectElements: vi.fn(),
}));

vi.mock('../services/element-matcher', () => ({
  matchElements: vi.fn(),
}));

vi.mock('../services/processing-progress', () => ({
  setProgress: vi.fn(),
  clearProgress: vi.fn(),
}));

import { prisma } from '../lib/prisma';

const mockedPrisma = vi.mocked(prisma);

import { generateImpliedElements } from '../services/implied-elements';
import { processScript } from '../services/script-processor';
import { processRevision } from '../services/revision-processor';
import { getFileBuffer } from '../lib/s3';
import { parsePdf } from '../services/pdf-parser';
import { detectElements } from '../services/element-detector';
import { matchElements } from '../services/element-matcher';

const mockedGetFileBuffer = vi.mocked(getFileBuffer);
const mockedParsePdf = vi.mocked(parsePdf);
const mockedDetectElements = vi.mocked(detectElements);
const mockedMatchElements = vi.mocked(matchElements);

const testUser = {
  userId: 'user-1',
  email: 'test@example.com',
};

function authHeader() {
  const token = signToken(testUser);
  return { Authorization: `Bearer ${token}` };
}

describe('Element soft-delete (Sprint 17)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', tokenVersion: 0 } as any);
  });

  it('DELETE /api/elements/:id sets deletedAt instead of hard-deleting', async () => {
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
      deletedAt: null,
    } as any);

    mockedPrisma.element.update.mockResolvedValue({
      id: 'elem-1',
      deletedAt: new Date(),
    } as any);

    const res = await request(app)
      .delete('/api/elements/elem-1')
      .set(authHeader());

    expect(res.status).toBe(200);
    // Should use update (soft-delete) not delete (hard-delete)
    expect(mockedPrisma.element.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'elem-1' },
        data: expect.objectContaining({
          deletedAt: expect.any(Date),
        }),
      }),
    );
    // Should NOT call hard delete
    expect(mockedPrisma.element.delete).not.toHaveBeenCalled();
  });
});

describe('ProductionMember soft-delete (Sprint 17)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', tokenVersion: 0 } as any);
    mockedPrisma.production.findUnique.mockResolvedValue({ id: 'prod-1', status: 'ACTIVE' } as any);
  });

  it('DELETE /api/productions/:id/members/:memberId sets deletedAt', async () => {
    // Requester is ADMIN
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'ADMIN',
      deletedAt: null,
    } as any);

    // Member to remove
    mockedPrisma.productionMember.findMany.mockResolvedValue([
      {
        id: 'member-2',
        productionId: 'prod-1',
        userId: 'user-2',
        role: 'MEMBER',
        deletedAt: null,
      },
    ] as any);

    mockedPrisma.productionMember.update.mockResolvedValue({
      id: 'member-2',
      deletedAt: new Date(),
    } as any);

    const res = await request(app)
      .delete('/api/productions/prod-1/members/member-2')
      .set(authHeader());

    expect(res.status).toBe(200);
    // Should use update (soft-delete) not delete
    expect(mockedPrisma.productionMember.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'member-2' },
        data: expect.objectContaining({
          deletedAt: expect.any(Date),
        }),
      }),
    );
    expect(mockedPrisma.productionMember.delete).not.toHaveBeenCalled();
  });
});

describe('Department soft-delete (Sprint 17)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', tokenVersion: 0 } as any);
    mockedPrisma.production.findUnique.mockResolvedValue({ id: 'prod-1', status: 'ACTIVE' } as any);
  });

  it('DELETE /api/productions/:id/departments/:departmentId sets deletedAt', async () => {
    // Requester is ADMIN
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'ADMIN',
      deletedAt: null,
    } as any);

    // Department exists
    mockedPrisma.department.findUnique.mockResolvedValue({
      id: 'dept-1',
      productionId: 'prod-1',
      name: 'Art',
      deletedAt: null,
    } as any);

    // No members in department
    mockedPrisma.productionMember.count = vi.fn().mockResolvedValue(0) as any;

    mockedPrisma.department.update.mockResolvedValue({
      id: 'dept-1',
      deletedAt: new Date(),
    } as any);

    const res = await request(app)
      .delete('/api/productions/prod-1/departments/dept-1')
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(mockedPrisma.department.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'dept-1' },
        data: expect.objectContaining({
          deletedAt: expect.any(Date),
        }),
      }),
    );
    expect(mockedPrisma.department.delete).not.toHaveBeenCalled();
  });
});

describe('Soft-delete query filtering (Sprint 15-20 check)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', tokenVersion: 0 } as any);
    mockedPrisma.production.findUnique.mockResolvedValue({ id: 'prod-1', status: 'ACTIVE' } as any);
  });

  it('GET /api/productions/:id excludes soft-deleted members', async () => {
    // User is a member
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'ADMIN',
      deletedAt: null,
    } as any);

    // Production with members include
    mockedPrisma.production.findUnique.mockResolvedValue({
      id: 'prod-1',
      title: 'Test Production',
      members: [
        { id: 'member-1', userId: 'user-1', role: 'ADMIN', deletedAt: null },
      ],
      scripts: [],
      departments: [],
    } as any);

    await request(app)
      .get('/api/productions/prod-1')
      .set(authHeader());

    // The production.findUnique call should include a where filter for members
    const findUniqueCall = mockedPrisma.production.findUnique.mock.calls.find(
      (call) => call[0]?.include?.members,
    );
    expect(findUniqueCall).toBeDefined();
    const membersInclude = findUniqueCall![0].include.members;
    expect(membersInclude.where).toEqual(
      expect.objectContaining({ deletedAt: null }),
    );
  });

  it('GET /api/productions/:id excludes soft-deleted departments', async () => {
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'ADMIN',
      deletedAt: null,
    } as any);

    mockedPrisma.production.findUnique.mockResolvedValue({
      id: 'prod-1',
      title: 'Test Production',
      members: [],
      scripts: [],
      departments: [],
    } as any);

    await request(app)
      .get('/api/productions/prod-1')
      .set(authHeader());

    const findUniqueCall = mockedPrisma.production.findUnique.mock.calls.find(
      (call) => call[0]?.include?.departments,
    );
    expect(findUniqueCall).toBeDefined();
    const departmentsInclude = findUniqueCall![0].include.departments;
    expect(departmentsInclude.where).toEqual(
      expect.objectContaining({ deletedAt: null }),
    );
  });

  it('DELETE department check excludes soft-deleted members from count', async () => {
    // Requester is ADMIN
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'ADMIN',
      deletedAt: null,
    } as any);

    // Department exists
    mockedPrisma.department.findUnique.mockResolvedValue({
      id: 'dept-1',
      productionId: 'prod-1',
      name: 'Art',
      deletedAt: null,
    } as any);

    // No active members (soft-deleted ones should be excluded)
    mockedPrisma.productionMember.count.mockResolvedValue(0);

    mockedPrisma.department.update.mockResolvedValue({
      id: 'dept-1',
      deletedAt: new Date(),
    } as any);

    await request(app)
      .delete('/api/productions/prod-1/departments/dept-1')
      .set(authHeader());

    // The count call should include deletedAt: null
    expect(mockedPrisma.productionMember.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ deletedAt: null }),
      }),
    );
  });

  it('PATCH member role privileged count excludes soft-deleted members', async () => {
    // Requester is ADMIN
    mockedPrisma.productionMember.findUnique
      .mockResolvedValueOnce({
        id: 'member-1',
        productionId: 'prod-1',
        userId: 'user-1',
        role: 'ADMIN',
        deletedAt: null,
      } as any)
      // Target member
      .mockResolvedValueOnce({
        id: 'member-1',
        productionId: 'prod-1',
        userId: 'user-1',
        role: 'ADMIN',
        deletedAt: null,
      } as any);

    // Privileged count — more than 1 so the demotion is allowed
    mockedPrisma.productionMember.count.mockResolvedValue(2);

    mockedPrisma.productionMember.update.mockResolvedValue({
      id: 'member-1',
      role: 'DECIDER',
    } as any);

    await request(app)
      .patch('/api/productions/prod-1/members/member-1/role')
      .set(authHeader())
      .send({ role: 'DECIDER' });

    // The count call for privileged members should include deletedAt: null
    expect(mockedPrisma.productionMember.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ deletedAt: null }),
      }),
    );
  });

  it('GET /api/productions/:id/element-stats excludes soft-deleted elements', async () => {
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'ADMIN',
      deletedAt: null,
    } as any);

    mockedPrisma.script.findMany.mockResolvedValue([
      { id: 'script-1' },
    ] as any);

    mockedPrisma.element.groupBy.mockResolvedValue([
      { workflowState: 'PENDING', _count: { _all: 3 } },
    ] as any);

    await request(app)
      .get('/api/productions/prod-1/element-stats')
      .set(authHeader());

    // The groupBy call should include deletedAt: null
    expect(mockedPrisma.element.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ deletedAt: null }),
      }),
    );
  });

  it('generateImpliedElements excludes soft-deleted departments', async () => {
    mockedPrisma.department.findMany.mockResolvedValue([]);
    mockedPrisma.element.findMany.mockResolvedValue([]);

    await generateImpliedElements('script-1', 'prod-1', [], 'per-character');

    expect(mockedPrisma.department.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ deletedAt: null }),
      }),
    );
  });

  it('processScript excludes soft-deleted departments', async () => {
    mockedGetFileBuffer.mockResolvedValue(Buffer.from('%PDF-'));
    mockedParsePdf.mockResolvedValue({ pages: [], pageCount: 0 } as any);
    mockedDetectElements.mockReturnValue({ elements: [], sceneData: [] } as any);
    mockedPrisma.script.findUnique.mockResolvedValue({
      productionId: 'prod-1',
      parentScriptId: null,
    } as any);
    mockedPrisma.department.findMany.mockResolvedValue([]);
    (mockedPrisma.script as any).update.mockResolvedValue({} as any);

    await processScript('script-1', 's3key');

    expect(mockedPrisma.department.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ deletedAt: null }),
      }),
    );
  });

  it('processRevision excludes soft-deleted elements from parent script', async () => {
    mockedGetFileBuffer.mockResolvedValue(Buffer.from('%PDF-'));
    mockedParsePdf.mockResolvedValue({ pages: [], pageCount: 0 } as any);
    mockedDetectElements.mockReturnValue({ elements: [], sceneData: [] } as any);
    mockedPrisma.element.findMany.mockResolvedValue([]);
    mockedMatchElements.mockReturnValue({ matches: [], missing: [] } as any);
    mockedPrisma.$transaction.mockImplementation(async () => {});

    await processRevision('new-script', 'parent-script', 's3key');

    expect(mockedPrisma.element.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ deletedAt: null }),
      }),
    );
  });
});

describe('Notes department enrichment soft-delete filtering (Sprint 21)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', tokenVersion: 0 } as any);
  });

  it('enrichNotesWithDepartment excludes soft-deleted production members', async () => {
    // Element exists
    mockedPrisma.element.findUnique.mockResolvedValue({
      id: 'elem-1',
      scriptId: 'script-1',
      name: 'JOHN',
      script: { productionId: 'prod-1' },
    } as any);

    // User is a member
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'MEMBER',
      deletedAt: null,
    } as any);

    // Notes exist
    (mockedPrisma.note as any).findMany.mockResolvedValue([
      {
        id: 'note-1',
        content: 'Test note',
        userId: 'user-1',
        elementId: 'elem-1',
        createdAt: new Date(),
        user: { id: 'user-1', name: 'Test User' },
      },
    ]);

    // Department enrichment lookup
    mockedPrisma.productionMember.findMany.mockResolvedValue([
      {
        userId: 'user-1',
        department: { name: 'Art' },
      },
    ] as any);

    await request(app)
      .get('/api/elements/elem-1/notes')
      .set(authHeader());

    // The findMany call for enrichment should include deletedAt: null
    expect(mockedPrisma.productionMember.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ deletedAt: null }),
      }),
    );
  });
});

describe('Prisma schema has deletedAt fields (Sprint 17)', () => {
  it('schema.prisma includes deletedAt on Element', async () => {
    const { readFileSync } = await import('fs');
    const schema = readFileSync(require('path').resolve(__dirname, '../../../prisma/schema.prisma'), 'utf-8');

    const elementModel = schema.match(/model Element \{[\s\S]*?\}/)?.[0] ?? '';
    expect(elementModel).toContain('deletedAt');
    expect(elementModel).toContain('DateTime?');
  });

  it('schema.prisma includes deletedAt on ProductionMember', async () => {
    const { readFileSync } = await import('fs');
    const schema = readFileSync(require('path').resolve(__dirname, '../../../prisma/schema.prisma'), 'utf-8');

    const memberModel = schema.match(/model ProductionMember \{[\s\S]*?\}/)?.[0] ?? '';
    expect(memberModel).toContain('deletedAt');
    expect(memberModel).toContain('DateTime?');
  });

  it('schema.prisma includes deletedAt on Department', async () => {
    const { readFileSync } = await import('fs');
    const schema = readFileSync(require('path').resolve(__dirname, '../../../prisma/schema.prisma'), 'utf-8');

    const deptModel = schema.match(/model Department \{[\s\S]*?\}/)?.[0] ?? '';
    expect(deptModel).toContain('deletedAt');
    expect(deptModel).toContain('DateTime?');
  });
});
