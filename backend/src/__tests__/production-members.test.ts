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
    $transaction: vi.fn(),
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
      role: 'OWNER',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    // Find user by email
    mockedPrisma.user.findUnique.mockResolvedValue({
      id: 'user-new',
      name: 'New User',
      email: 'new@example.com',
      passwordHash: 'hash',
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
      role: 'OWNER',
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
      role: 'OWNER',
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
      role: 'OWNER',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    // Find user by email
    mockedPrisma.user.findUnique.mockResolvedValue({
      id: 'user-existing',
      name: 'Existing Member',
      email: 'existing@example.com',
      passwordHash: 'hash',
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
      role: 'OWNER',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    // Find user by email
    mockedPrisma.user.findUnique.mockResolvedValue({
      id: 'user-new',
      name: 'New User',
      email: 'new@example.com',
      passwordHash: 'hash',
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
      role: 'OWNER',
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
      role: 'OWNER',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    // Find user by email
    mockedPrisma.user.findUnique.mockResolvedValue({
      id: 'user-new',
      name: 'New User',
      email: 'new@example.com',
      passwordHash: 'hash',
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
    // Member (not OWNER/ADMIN) membership check
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
      role: 'OWNER',
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
        role: 'OWNER',
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
      // First call: check requester is OWNER/ADMIN
      .mockResolvedValueOnce({
        id: 'member-owner',
        productionId: 'prod-1',
        userId: 'user-owner',
        role: 'OWNER',
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

  it('returns 403 when trying to remove OWNER', async () => {
    // Requester membership check
    mockedPrisma.productionMember.findUnique.mockResolvedValueOnce({
      id: 'member-admin',
      productionId: 'prod-1',
      userId: 'user-owner',
      role: 'OWNER',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    // Find the member to remove (is OWNER)
    mockedPrisma.productionMember.findMany.mockResolvedValue([
      {
        id: 'member-owner-target',
        productionId: 'prod-1',
        userId: 'user-other-owner',
        role: 'OWNER',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as any);

    const res = await request(app)
      .delete('/api/productions/prod-1/members/member-owner-target')
      .set(authHeader());

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/owner/i);
  });
});
