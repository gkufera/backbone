import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { signToken } from '../lib/jwt.js';

// Mock Prisma client
vi.mock('../lib/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    production: {
      findUnique: vi.fn(),
    },
    productionMember: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    department: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { prisma } from '../lib/prisma.js';

const mockedPrisma = vi.mocked(prisma);

const ownerUser = {
  userId: 'user-owner',
  email: 'owner@example.com',
};

const memberUser = {
  userId: 'user-member',
  email: 'member@example.com',
};

const adminUser = {
  userId: 'user-admin',
  email: 'admin@example.com',
};

const deciderUser = {
  userId: 'user-decider',
  email: 'decider@example.com',
};

const nonMemberUser = {
  userId: 'user-nonmember',
  email: 'nonmember@example.com',
};

function authHeader(user = ownerUser) {
  const token = signToken(user);
  return { Authorization: `Bearer ${token}` };
}

function mockOwnerMembership() {
  mockedPrisma.productionMember.findUnique.mockResolvedValueOnce({
    id: 'pm-owner',
    productionId: 'prod-1',
    userId: 'user-owner',
    role: 'ADMIN',
    title: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any);
}

function mockAdminMembership() {
  mockedPrisma.productionMember.findUnique.mockResolvedValueOnce({
    id: 'pm-admin',
    productionId: 'prod-1',
    userId: 'user-admin',
    role: 'ADMIN',
    title: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any);
}

function mockDeciderMembership() {
  mockedPrisma.productionMember.findUnique.mockResolvedValueOnce({
    id: 'pm-decider',
    productionId: 'prod-1',
    userId: 'user-decider',
    role: 'DECIDER',
    title: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any);
}

function mockMemberMembership() {
  mockedPrisma.productionMember.findUnique.mockResolvedValueOnce({
    id: 'pm-member',
    productionId: 'prod-1',
    userId: 'user-member',
    role: 'MEMBER',
    title: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any);
}

function mockNonMembership() {
  mockedPrisma.productionMember.findUnique.mockResolvedValueOnce(null);
  mockedPrisma.production.findUnique.mockResolvedValueOnce({
    id: 'prod-1',
    title: 'Test Production',
  } as any);
}

describe('GET /api/productions/:id/departments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns department list with member counts', async () => {
    mockOwnerMembership();

    mockedPrisma.department.findMany.mockResolvedValue([
      {
        id: 'dept-1',
        productionId: 'prod-1',
        name: 'Costume',
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { members: 2 },
      },
    ] as any);

    const res = await request(app).get('/api/productions/prod-1/departments').set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.departments).toHaveLength(1);
    expect(res.body.departments[0].name).toBe('Costume');
    expect(res.body.departments[0]._count.members).toBe(2);
  });

  it('returns 403 for non-member', async () => {
    mockNonMembership();

    const res = await request(app)
      .get('/api/productions/prod-1/departments')
      .set(authHeader(nonMemberUser));

    expect(res.status).toBe(403);
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).get('/api/productions/prod-1/departments');

    expect(res.status).toBe(401);
  });
});

describe('POST /api/productions/:id/departments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a custom department', async () => {
    mockOwnerMembership();

    mockedPrisma.department.create.mockResolvedValue({
      id: 'dept-new',
      productionId: 'prod-1',
      name: 'Stunts',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const res = await request(app)
      .post('/api/productions/prod-1/departments')
      .set(authHeader())
      .send({ name: 'Stunts' });

    expect(res.status).toBe(201);
    expect(res.body.department.name).toBe('Stunts');
  });

  it('returns 400 when name is missing', async () => {
    mockOwnerMembership();

    const res = await request(app)
      .post('/api/productions/prod-1/departments')
      .set(authHeader())
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name/i);
  });

  it('returns 400 when department name exceeds max length', async () => {
    mockOwnerMembership();

    const longName = 'A'.repeat(101);
    const res = await request(app)
      .post('/api/productions/prod-1/departments')
      .set(authHeader())
      .send({ name: longName });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/100/);
  });

  it('returns 409 for duplicate department name', async () => {
    mockOwnerMembership();

    const prismaError = new Error('Unique constraint failed') as any;
    prismaError.code = 'P2002';
    mockedPrisma.department.create.mockRejectedValue(prismaError);

    const res = await request(app)
      .post('/api/productions/prod-1/departments')
      .set(authHeader())
      .send({ name: 'Costume' });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already exists/i);
  });

  it('returns 403 for non-ADMIN/DECIDER', async () => {
    mockMemberMembership();

    const res = await request(app)
      .post('/api/productions/prod-1/departments')
      .set(authHeader(memberUser))
      .send({ name: 'Stunts' });

    expect(res.status).toBe(403);
  });

  it('ADMIN can create a department', async () => {
    mockAdminMembership();

    mockedPrisma.department.create.mockResolvedValue({
      id: 'dept-new',
      productionId: 'prod-1',
      name: 'Stunts',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const res = await request(app)
      .post('/api/productions/prod-1/departments')
      .set(authHeader(adminUser))
      .send({ name: 'Stunts' });

    expect(res.status).toBe(201);
    expect(res.body.department.name).toBe('Stunts');
  });

  it('DECIDER can create a department', async () => {
    mockDeciderMembership();

    mockedPrisma.department.create.mockResolvedValue({
      id: 'dept-new',
      productionId: 'prod-1',
      name: 'Stunts',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const res = await request(app)
      .post('/api/productions/prod-1/departments')
      .set(authHeader(deciderUser))
      .send({ name: 'Stunts' });

    expect(res.status).toBe(201);
    expect(res.body.department.name).toBe('Stunts');
  });

  it('returns 400 when department name is only whitespace', async () => {
    mockOwnerMembership();

    const res = await request(app)
      .post('/api/productions/prod-1/departments')
      .set(authHeader())
      .send({ name: '   ' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name/i);
  });
});

describe('DELETE /api/productions/:id/departments/:departmentId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes a department with no members', async () => {
    mockOwnerMembership();

    // Verify department belongs to production
    mockedPrisma.department.findUnique.mockResolvedValueOnce({
      id: 'dept-1',
      productionId: 'prod-1',
      name: 'Costume',
    } as any);

    // No members in this department
    mockedPrisma.productionMember.count.mockResolvedValueOnce(0);

    mockedPrisma.department.delete.mockResolvedValue({
      id: 'dept-1',
      productionId: 'prod-1',
      name: 'Costume',
    } as any);

    const res = await request(app)
      .delete('/api/productions/prod-1/departments/dept-1')
      .set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });

  it('returns 409 when deleting department with members', async () => {
    mockOwnerMembership();

    // Verify department belongs to production
    mockedPrisma.department.findUnique.mockResolvedValueOnce({
      id: 'dept-1',
      productionId: 'prod-1',
      name: 'Costume',
    } as any);

    // Department has members
    mockedPrisma.productionMember.count.mockResolvedValueOnce(3);

    const res = await request(app)
      .delete('/api/productions/prod-1/departments/dept-1')
      .set(authHeader());

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/cannot delete/i);
  });

  it('returns 404 when department does not belong to the production', async () => {
    mockOwnerMembership();

    // Department not found for this production
    mockedPrisma.department.findUnique.mockResolvedValueOnce(null);

    const res = await request(app)
      .delete('/api/productions/prod-1/departments/dept-other')
      .set(authHeader());

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/department/i);
  });

  it('returns 404 on P2025 error', async () => {
    mockOwnerMembership();

    // Department belongs to production
    mockedPrisma.department.findUnique.mockResolvedValueOnce({
      id: 'dept-1',
      productionId: 'prod-1',
      name: 'Costume',
    } as any);

    // No members
    mockedPrisma.productionMember.count.mockResolvedValueOnce(0);

    const prismaError = new Error('Record not found') as any;
    prismaError.code = 'P2025';
    mockedPrisma.department.delete.mockRejectedValue(prismaError);

    const res = await request(app)
      .delete('/api/productions/prod-1/departments/dept-1')
      .set(authHeader());

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('returns 403 for non-ADMIN/DECIDER', async () => {
    mockMemberMembership();

    const res = await request(app)
      .delete('/api/productions/prod-1/departments/dept-1')
      .set(authHeader(memberUser));

    expect(res.status).toBe(403);
  });

  it('ADMIN can delete a department', async () => {
    mockAdminMembership();

    mockedPrisma.department.findUnique.mockResolvedValueOnce({
      id: 'dept-1',
      productionId: 'prod-1',
      name: 'Costume',
    } as any);

    mockedPrisma.productionMember.count.mockResolvedValueOnce(0);

    mockedPrisma.department.delete.mockResolvedValue({
      id: 'dept-1',
      productionId: 'prod-1',
      name: 'Costume',
    } as any);

    const res = await request(app)
      .delete('/api/productions/prod-1/departments/dept-1')
      .set(authHeader(adminUser));

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });

  it('DECIDER can delete a department', async () => {
    mockDeciderMembership();

    mockedPrisma.department.findUnique.mockResolvedValueOnce({
      id: 'dept-1',
      productionId: 'prod-1',
      name: 'Costume',
    } as any);

    mockedPrisma.productionMember.count.mockResolvedValueOnce(0);

    mockedPrisma.department.delete.mockResolvedValue({
      id: 'dept-1',
      productionId: 'prod-1',
      name: 'Costume',
    } as any);

    const res = await request(app)
      .delete('/api/productions/prod-1/departments/dept-1')
      .set(authHeader(deciderUser));

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).delete('/api/productions/prod-1/departments/dept-1');

    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/productions/:id/departments/:departmentId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates department color', async () => {
    mockAdminMembership();

    mockedPrisma.department.findUnique.mockResolvedValueOnce({
      id: 'dept-1',
      productionId: 'prod-1',
      name: 'Costume',
    } as any);

    mockedPrisma.department.update.mockResolvedValue({
      id: 'dept-1',
      productionId: 'prod-1',
      name: 'Costume',
      color: '#FF0000',
    } as any);

    const res = await request(app)
      .patch('/api/productions/prod-1/departments/dept-1')
      .set(authHeader(adminUser))
      .send({ color: '#FF0000' });

    expect(res.status).toBe(200);
    expect(res.body.department.color).toBe('#FF0000');
  });

  it('returns 403 for MEMBER', async () => {
    mockMemberMembership();

    const res = await request(app)
      .patch('/api/productions/prod-1/departments/dept-1')
      .set(authHeader(memberUser))
      .send({ color: '#FF0000' });

    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid color string', async () => {
    mockAdminMembership();

    mockedPrisma.department.findUnique.mockResolvedValueOnce({
      id: 'dept-1',
      productionId: 'prod-1',
      name: 'Costume',
    } as any);

    const res = await request(app)
      .patch('/api/productions/prod-1/departments/dept-1')
      .set(authHeader(adminUser))
      .send({ color: 'blah' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/hex color/i);
  });

  it('accepts valid hex color', async () => {
    mockAdminMembership();

    mockedPrisma.department.findUnique.mockResolvedValueOnce({
      id: 'dept-1',
      productionId: 'prod-1',
      name: 'Costume',
    } as any);

    mockedPrisma.department.update.mockResolvedValue({
      id: 'dept-1',
      productionId: 'prod-1',
      name: 'Costume',
      color: '#FF0000',
    } as any);

    const res = await request(app)
      .patch('/api/productions/prod-1/departments/dept-1')
      .set(authHeader(adminUser))
      .send({ color: '#FF0000' });

    expect(res.status).toBe(200);
    expect(res.body.department.color).toBe('#FF0000');
  });

  it('accepts null color to clear', async () => {
    mockAdminMembership();

    mockedPrisma.department.findUnique.mockResolvedValueOnce({
      id: 'dept-1',
      productionId: 'prod-1',
      name: 'Costume',
    } as any);

    mockedPrisma.department.update.mockResolvedValue({
      id: 'dept-1',
      productionId: 'prod-1',
      name: 'Costume',
      color: null,
    } as any);

    const res = await request(app)
      .patch('/api/productions/prod-1/departments/dept-1')
      .set(authHeader(adminUser))
      .send({ color: null });

    expect(res.status).toBe(200);
    expect(res.body.department.color).toBeNull();
  });
});

