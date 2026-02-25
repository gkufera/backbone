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
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    department: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from '../lib/prisma';

const mockedPrisma = vi.mocked(prisma);

const ownerUser = {
  userId: 'user-owner',
  email: 'owner@example.com',
};

const memberUser = {
  userId: 'user-member',
  email: 'member@example.com',
};

function authHeader(user = ownerUser) {
  const token = signToken(user);
  return { Authorization: `Bearer ${token}` };
}

describe('POST /api/productions/:id/members', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 201 when adding existing user by email', async () => {
    // Owner membership check
    mockedPrisma.productionMember.findUnique.mockResolvedValueOnce({
      id: 'member-owner',
      productionId: 'prod-1',
      userId: 'user-owner',
      role: 'ADMIN',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    // Find user by email
    mockedPrisma.user.findUnique.mockResolvedValue({
      id: 'user-new',
      name: 'New User',
      email: 'new@example.com',
      passwordHash: 'hash',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    // Check if already a member - returns null (not a member)
    mockedPrisma.productionMember.findUnique.mockResolvedValueOnce(null);

    // Create member
    mockedPrisma.productionMember.create.mockResolvedValue({
      id: 'member-new',
      productionId: 'prod-1',
      userId: 'user-new',
      role: 'MEMBER',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const res = await request(app)
      .post('/api/productions/prod-1/members')
      .set(authHeader())
      .send({ email: 'new@example.com' });

    expect(res.status).toBe(201);
    expect(res.body.member.role).toBe('MEMBER');
  });

  it('returns 400 when email is missing', async () => {
    // Owner membership check
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-owner',
      productionId: 'prod-1',
      userId: 'user-owner',
      role: 'ADMIN',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const res = await request(app)
      .post('/api/productions/prod-1/members')
      .set(authHeader())
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email/i);
  });

  it('returns 404 when user with email not found', async () => {
    // Owner membership check
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-owner',
      productionId: 'prod-1',
      userId: 'user-owner',
      role: 'ADMIN',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    // User not found
    mockedPrisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/productions/prod-1/members')
      .set(authHeader())
      .send({ email: 'nonexistent@example.com' });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/user/i);
  });

  it('returns 409 when user is already a member', async () => {
    // Owner membership check
    mockedPrisma.productionMember.findUnique.mockResolvedValueOnce({
      id: 'member-owner',
      productionId: 'prod-1',
      userId: 'user-owner',
      role: 'ADMIN',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    // Find user by email
    mockedPrisma.user.findUnique.mockResolvedValue({
      id: 'user-existing',
      name: 'Existing Member',
      email: 'existing@example.com',
      passwordHash: 'hash',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    // Already a member
    mockedPrisma.productionMember.findUnique.mockResolvedValueOnce({
      id: 'member-existing',
      productionId: 'prod-1',
      userId: 'user-existing',
      role: 'MEMBER',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const res = await request(app)
      .post('/api/productions/prod-1/members')
      .set(authHeader())
      .send({ email: 'existing@example.com' });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already/i);
  });

  it('returns 201 with title when provided', async () => {
    // Owner membership check
    mockedPrisma.productionMember.findUnique.mockResolvedValueOnce({
      id: 'member-owner',
      productionId: 'prod-1',
      userId: 'user-owner',
      role: 'ADMIN',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    // Find user by email
    mockedPrisma.user.findUnique.mockResolvedValue({
      id: 'user-new',
      name: 'New User',
      email: 'new@example.com',
      passwordHash: 'hash',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    // Check if already a member
    mockedPrisma.productionMember.findUnique.mockResolvedValueOnce(null);

    // Create member with title
    mockedPrisma.productionMember.create.mockResolvedValue({
      id: 'member-new',
      productionId: 'prod-1',
      userId: 'user-new',
      role: 'MEMBER',
      title: 'Costume Designer',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const res = await request(app)
      .post('/api/productions/prod-1/members')
      .set(authHeader())
      .send({ email: 'new@example.com', title: 'Costume Designer' });

    expect(res.status).toBe(201);
    expect(res.body.member.title).toBe('Costume Designer');
  });

  it('returns 400 when title exceeds max length', async () => {
    // Owner membership check
    mockedPrisma.productionMember.findUnique.mockResolvedValueOnce({
      id: 'member-owner',
      productionId: 'prod-1',
      userId: 'user-owner',
      role: 'ADMIN',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const longTitle = 'A'.repeat(101);
    const res = await request(app)
      .post('/api/productions/prod-1/members')
      .set(authHeader())
      .send({ email: 'new@example.com', title: longTitle });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/100/);
  });

  it('trims whitespace-only title to null', async () => {
    // Owner membership check
    mockedPrisma.productionMember.findUnique.mockResolvedValueOnce({
      id: 'member-owner',
      productionId: 'prod-1',
      userId: 'user-owner',
      role: 'ADMIN',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    // Find user by email
    mockedPrisma.user.findUnique.mockResolvedValue({
      id: 'user-new',
      name: 'New User',
      email: 'new@example.com',
      passwordHash: 'hash',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    // Check if already a member
    mockedPrisma.productionMember.findUnique.mockResolvedValueOnce(null);

    // Create member
    mockedPrisma.productionMember.create.mockResolvedValue({
      id: 'member-new',
      productionId: 'prod-1',
      userId: 'user-new',
      role: 'MEMBER',
      title: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const res = await request(app)
      .post('/api/productions/prod-1/members')
      .set(authHeader())
      .send({ email: 'new@example.com', title: '   ' });

    expect(res.status).toBe(201);
    // Verify that prisma.create was called with title: null (not "   ")
    expect(mockedPrisma.productionMember.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ title: null }),
      }),
    );
  });

  it('returns 403 when requester is not OWNER or ADMIN', async () => {
    // Member (not ADMIN/DECIDER) membership check
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-regular',
      productionId: 'prod-1',
      userId: 'user-member',
      role: 'MEMBER',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const res = await request(app)
      .post('/api/productions/prod-1/members')
      .set(authHeader(memberUser))
      .send({ email: 'new@example.com' });

    expect(res.status).toBe(403);
  });
});

describe('GET /api/productions/:id/members', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with member list including user details', async () => {
    // Membership check
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-owner',
      role: 'ADMIN',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    // Production exists check (for get endpoint)
    mockedPrisma.production.findUnique.mockResolvedValue({
      id: 'prod-1',
      title: 'Test',
    } as any);

    // Members list
    mockedPrisma.productionMember.findMany.mockResolvedValue([
      {
        id: 'member-1',
        productionId: 'prod-1',
        userId: 'user-owner',
        role: 'ADMIN',
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: 'user-owner', name: 'Owner', email: 'owner@example.com' },
      },
      {
        id: 'member-2',
        productionId: 'prod-1',
        userId: 'user-2',
        role: 'MEMBER',
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: 'user-2', name: 'Member', email: 'member@example.com' },
      },
    ] as any);

    const res = await request(app).get('/api/productions/prod-1/members').set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.members).toHaveLength(2);
    expect(res.body.members[0].user.name).toBe('Owner');
  });
});

describe('DELETE /api/productions/:id/members/:memberId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 when removing a member', async () => {
    // Requester membership check
    mockedPrisma.productionMember.findUnique
      // First call: check requester is ADMIN/DECIDER
      .mockResolvedValueOnce({
        id: 'member-owner',
        productionId: 'prod-1',
        userId: 'user-owner',
        role: 'ADMIN',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
    // Second call: find member to remove (not used in this mock setup, but used in findMany)

    // Find the member to remove
    mockedPrisma.productionMember.findMany.mockResolvedValue([
      {
        id: 'member-to-remove',
        productionId: 'prod-1',
        userId: 'user-2',
        role: 'MEMBER',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as any);

    // Delete
    mockedPrisma.productionMember.delete.mockResolvedValue({
      id: 'member-to-remove',
    } as any);

    const res = await request(app)
      .delete('/api/productions/prod-1/members/member-to-remove')
      .set(authHeader());

    expect(res.status).toBe(200);
  });

  it('returns 403 when trying to remove an ADMIN', async () => {
    // Requester membership check
    mockedPrisma.productionMember.findUnique.mockResolvedValueOnce({
      id: 'member-admin',
      productionId: 'prod-1',
      userId: 'user-owner',
      role: 'ADMIN',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    // Find the member to remove (is ADMIN)
    mockedPrisma.productionMember.findMany.mockResolvedValue([
      {
        id: 'member-admin-target',
        productionId: 'prod-1',
        userId: 'user-other-admin',
        role: 'ADMIN',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as any);

    const res = await request(app)
      .delete('/api/productions/prod-1/members/member-admin-target')
      .set(authHeader());

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/admin/i);
  });

  it('DECIDER can remove a MEMBER', async () => {
    // Requester is DECIDER
    mockedPrisma.productionMember.findUnique.mockResolvedValueOnce({
      id: 'member-decider',
      productionId: 'prod-1',
      userId: 'user-owner',
      role: 'DECIDER',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    // Find the member to remove
    mockedPrisma.productionMember.findMany.mockResolvedValue([
      {
        id: 'member-to-remove',
        productionId: 'prod-1',
        userId: 'user-2',
        role: 'MEMBER',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as any);

    mockedPrisma.productionMember.delete.mockResolvedValue({
      id: 'member-to-remove',
    } as any);

    const res = await request(app)
      .delete('/api/productions/prod-1/members/member-to-remove')
      .set(authHeader());

    expect(res.status).toBe(200);
  });
});

// ── PATCH /api/productions/:id/members/:memberId/role ───────────

const deciderUser = {
  userId: 'user-decider',
  email: 'decider@example.com',
};

describe('PATCH /api/productions/:id/members/:memberId/role', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ADMIN can change a member role to DECIDER', async () => {
    // Requester is ADMIN
    mockedPrisma.productionMember.findUnique.mockResolvedValueOnce({
      id: 'member-admin',
      productionId: 'prod-1',
      userId: 'user-owner',
      role: 'ADMIN',
    } as any);

    // Target member
    mockedPrisma.productionMember.findUnique.mockResolvedValueOnce({
      id: 'member-target',
      productionId: 'prod-1',
      userId: 'user-2',
      role: 'MEMBER',
    } as any);

    mockedPrisma.productionMember.update.mockResolvedValue({
      id: 'member-target',
      productionId: 'prod-1',
      userId: 'user-2',
      role: 'DECIDER',
    } as any);

    const res = await request(app)
      .patch('/api/productions/prod-1/members/member-target/role')
      .set(authHeader())
      .send({ role: 'DECIDER' });

    expect(res.status).toBe(200);
    expect(res.body.member.role).toBe('DECIDER');
  });

  it('DECIDER can change a member role to MEMBER', async () => {
    // Requester is DECIDER
    mockedPrisma.productionMember.findUnique.mockResolvedValueOnce({
      id: 'member-decider',
      productionId: 'prod-1',
      userId: 'user-decider',
      role: 'DECIDER',
    } as any);

    // Target member
    mockedPrisma.productionMember.findUnique.mockResolvedValueOnce({
      id: 'member-target',
      productionId: 'prod-1',
      userId: 'user-2',
      role: 'DECIDER',
    } as any);

    // Multiple privileged users exist
    mockedPrisma.productionMember.count.mockResolvedValue(2);

    mockedPrisma.productionMember.update.mockResolvedValue({
      id: 'member-target',
      productionId: 'prod-1',
      userId: 'user-2',
      role: 'MEMBER',
    } as any);

    const res = await request(app)
      .patch('/api/productions/prod-1/members/member-target/role')
      .set(authHeader(deciderUser))
      .send({ role: 'MEMBER' });

    expect(res.status).toBe(200);
    expect(res.body.member.role).toBe('MEMBER');
  });

  it('DECIDER cannot set role to ADMIN', async () => {
    // Requester is DECIDER
    mockedPrisma.productionMember.findUnique.mockResolvedValueOnce({
      id: 'member-decider',
      productionId: 'prod-1',
      userId: 'user-decider',
      role: 'DECIDER',
    } as any);

    // Target member
    mockedPrisma.productionMember.findUnique.mockResolvedValueOnce({
      id: 'member-target',
      productionId: 'prod-1',
      userId: 'user-2',
      role: 'MEMBER',
    } as any);

    const res = await request(app)
      .patch('/api/productions/prod-1/members/member-target/role')
      .set(authHeader(deciderUser))
      .send({ role: 'ADMIN' });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/admin/i);
  });

  it('MEMBER returns 403', async () => {
    mockedPrisma.productionMember.findUnique.mockResolvedValueOnce({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-member',
      role: 'MEMBER',
    } as any);

    const res = await request(app)
      .patch('/api/productions/prod-1/members/member-target/role')
      .set(authHeader(memberUser))
      .send({ role: 'DECIDER' });

    expect(res.status).toBe(403);
  });

  it('ADMIN can change own role to DECIDER', async () => {
    // Requester is ADMIN, target is same user
    mockedPrisma.productionMember.findUnique.mockResolvedValueOnce({
      id: 'member-admin',
      productionId: 'prod-1',
      userId: 'user-owner',
      role: 'ADMIN',
    } as any);

    mockedPrisma.productionMember.findUnique.mockResolvedValueOnce({
      id: 'member-admin',
      productionId: 'prod-1',
      userId: 'user-owner',
      role: 'ADMIN',
    } as any);

    // More than 1 ADMIN/DECIDER, so self-change is allowed
    mockedPrisma.productionMember.count.mockResolvedValue(2);

    mockedPrisma.productionMember.update.mockResolvedValue({
      id: 'member-admin',
      productionId: 'prod-1',
      userId: 'user-owner',
      role: 'DECIDER',
    } as any);

    const res = await request(app)
      .patch('/api/productions/prod-1/members/member-admin/role')
      .set(authHeader())
      .send({ role: 'DECIDER' });

    expect(res.status).toBe(200);
    expect(res.body.member.role).toBe('DECIDER');
  });

  it('DECIDER can change own role to ADMIN', async () => {
    // Requester is DECIDER, target is same user
    mockedPrisma.productionMember.findUnique.mockResolvedValueOnce({
      id: 'member-decider',
      productionId: 'prod-1',
      userId: 'user-decider',
      role: 'DECIDER',
    } as any);

    mockedPrisma.productionMember.findUnique.mockResolvedValueOnce({
      id: 'member-decider',
      productionId: 'prod-1',
      userId: 'user-decider',
      role: 'DECIDER',
    } as any);

    // More than 1 ADMIN/DECIDER
    mockedPrisma.productionMember.count.mockResolvedValue(2);

    mockedPrisma.productionMember.update.mockResolvedValue({
      id: 'member-decider',
      productionId: 'prod-1',
      userId: 'user-decider',
      role: 'ADMIN',
    } as any);

    const res = await request(app)
      .patch('/api/productions/prod-1/members/member-decider/role')
      .set(authHeader(deciderUser))
      .send({ role: 'ADMIN' });

    expect(res.status).toBe(200);
    expect(res.body.member.role).toBe('ADMIN');
  });

  it('ADMIN cannot change own role to MEMBER', async () => {
    // Requester is ADMIN, target is same user
    mockedPrisma.productionMember.findUnique.mockResolvedValueOnce({
      id: 'member-admin',
      productionId: 'prod-1',
      userId: 'user-owner',
      role: 'ADMIN',
    } as any);

    mockedPrisma.productionMember.findUnique.mockResolvedValueOnce({
      id: 'member-admin',
      productionId: 'prod-1',
      userId: 'user-owner',
      role: 'ADMIN',
    } as any);

    const res = await request(app)
      .patch('/api/productions/prod-1/members/member-admin/role')
      .set(authHeader())
      .send({ role: 'MEMBER' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/cannot demote yourself/i);
  });

  it('solo ADMIN can switch to DECIDER (privileged count stays 1)', async () => {
    // Requester is ADMIN, target is same user
    mockedPrisma.productionMember.findUnique.mockResolvedValueOnce({
      id: 'member-admin',
      productionId: 'prod-1',
      userId: 'user-owner',
      role: 'ADMIN',
    } as any);

    mockedPrisma.productionMember.findUnique.mockResolvedValueOnce({
      id: 'member-admin',
      productionId: 'prod-1',
      userId: 'user-owner',
      role: 'ADMIN',
    } as any);

    // Only 1 ADMIN/DECIDER
    mockedPrisma.productionMember.count.mockResolvedValue(1);

    mockedPrisma.productionMember.update.mockResolvedValue({
      id: 'member-admin',
      productionId: 'prod-1',
      userId: 'user-owner',
      role: 'DECIDER',
    } as any);

    const res = await request(app)
      .patch('/api/productions/prod-1/members/member-admin/role')
      .set(authHeader())
      .send({ role: 'DECIDER' });

    expect(res.status).toBe(200);
    expect(res.body.member.role).toBe('DECIDER');
  });

  it('solo DECIDER can switch to ADMIN (privileged count stays 1)', async () => {
    // Requester is DECIDER, target is same user
    mockedPrisma.productionMember.findUnique.mockResolvedValueOnce({
      id: 'member-decider',
      productionId: 'prod-1',
      userId: 'user-decider',
      role: 'DECIDER',
    } as any);

    mockedPrisma.productionMember.findUnique.mockResolvedValueOnce({
      id: 'member-decider',
      productionId: 'prod-1',
      userId: 'user-decider',
      role: 'DECIDER',
    } as any);

    // Only 1 ADMIN/DECIDER
    mockedPrisma.productionMember.count.mockResolvedValue(1);

    mockedPrisma.productionMember.update.mockResolvedValue({
      id: 'member-decider',
      productionId: 'prod-1',
      userId: 'user-decider',
      role: 'ADMIN',
    } as any);

    const res = await request(app)
      .patch('/api/productions/prod-1/members/member-decider/role')
      .set(authHeader(deciderUser))
      .send({ role: 'ADMIN' });

    expect(res.status).toBe(200);
    expect(res.body.member.role).toBe('ADMIN');
  });

  it('cannot demote last ADMIN or DECIDER to MEMBER', async () => {
    // Requester is ADMIN
    mockedPrisma.productionMember.findUnique.mockResolvedValueOnce({
      id: 'member-admin',
      productionId: 'prod-1',
      userId: 'user-owner',
      role: 'ADMIN',
    } as any);

    // Target is a different DECIDER
    mockedPrisma.productionMember.findUnique.mockResolvedValueOnce({
      id: 'member-decider-2',
      productionId: 'prod-1',
      userId: 'user-decider-2',
      role: 'DECIDER',
    } as any);

    // Only 1 ADMIN/DECIDER total
    mockedPrisma.productionMember.count.mockResolvedValue(1);

    const res = await request(app)
      .patch('/api/productions/prod-1/members/member-decider-2/role')
      .set(authHeader())
      .send({ role: 'MEMBER' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/at least 1 ADMIN or DECIDER/i);
  });

  it('returns 400 for invalid role', async () => {
    mockedPrisma.productionMember.findUnique.mockResolvedValueOnce({
      id: 'member-admin',
      productionId: 'prod-1',
      userId: 'user-owner',
      role: 'ADMIN',
    } as any);

    const res = await request(app)
      .patch('/api/productions/prod-1/members/member-target/role')
      .set(authHeader())
      .send({ role: 'SUPERADMIN' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/role/i);
  });
});

// ── PATCH /api/productions/:id/members/:memberId/department ──

describe('PATCH /api/productions/:id/members/:memberId/department', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ADMIN can set a member department', async () => {
    // Requester is ADMIN
    mockedPrisma.productionMember.findUnique.mockResolvedValueOnce({
      id: 'member-admin',
      productionId: 'prod-1',
      userId: 'user-owner',
      role: 'ADMIN',
    } as any);

    // Target member
    mockedPrisma.productionMember.findUnique.mockResolvedValueOnce({
      id: 'member-target',
      productionId: 'prod-1',
      userId: 'user-2',
      role: 'MEMBER',
    } as any);

    // Department belongs to production
    mockedPrisma.department.findUnique.mockResolvedValueOnce({
      id: 'dept-1',
      productionId: 'prod-1',
      name: 'Costume',
    } as any);

    mockedPrisma.productionMember.update.mockResolvedValue({
      id: 'member-target',
      productionId: 'prod-1',
      userId: 'user-2',
      role: 'MEMBER',
      departmentId: 'dept-1',
    } as any);

    const res = await request(app)
      .patch('/api/productions/prod-1/members/member-target/department')
      .set(authHeader())
      .send({ departmentId: 'dept-1' });

    expect(res.status).toBe(200);
    expect(res.body.member.departmentId).toBe('dept-1');
  });

  it('MEMBER cannot set a member department', async () => {
    mockedPrisma.productionMember.findUnique.mockResolvedValue({
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-member',
      role: 'MEMBER',
    } as any);

    const res = await request(app)
      .patch('/api/productions/prod-1/members/member-target/department')
      .set(authHeader(memberUser))
      .send({ departmentId: 'dept-1' });

    expect(res.status).toBe(403);
  });

  it('setting departmentId to null clears department', async () => {
    // Requester is ADMIN
    mockedPrisma.productionMember.findUnique.mockResolvedValueOnce({
      id: 'member-admin',
      productionId: 'prod-1',
      userId: 'user-owner',
      role: 'ADMIN',
    } as any);

    // Target member
    mockedPrisma.productionMember.findUnique.mockResolvedValueOnce({
      id: 'member-target',
      productionId: 'prod-1',
      userId: 'user-2',
      role: 'MEMBER',
      departmentId: 'dept-1',
    } as any);

    mockedPrisma.productionMember.update.mockResolvedValue({
      id: 'member-target',
      productionId: 'prod-1',
      userId: 'user-2',
      role: 'MEMBER',
      departmentId: null,
    } as any);

    const res = await request(app)
      .patch('/api/productions/prod-1/members/member-target/department')
      .set(authHeader())
      .send({ departmentId: null });

    expect(res.status).toBe(200);
    expect(res.body.member.departmentId).toBeNull();
  });

  it('returns 404 for department in wrong production', async () => {
    // Requester is ADMIN
    mockedPrisma.productionMember.findUnique.mockResolvedValueOnce({
      id: 'member-admin',
      productionId: 'prod-1',
      userId: 'user-owner',
      role: 'ADMIN',
    } as any);

    // Target member
    mockedPrisma.productionMember.findUnique.mockResolvedValueOnce({
      id: 'member-target',
      productionId: 'prod-1',
      userId: 'user-2',
      role: 'MEMBER',
    } as any);

    // Department NOT found in this production
    mockedPrisma.department.findUnique.mockResolvedValueOnce(null);

    const res = await request(app)
      .patch('/api/productions/prod-1/members/member-target/department')
      .set(authHeader())
      .send({ departmentId: 'dept-other-prod' });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/department/i);
  });
});
