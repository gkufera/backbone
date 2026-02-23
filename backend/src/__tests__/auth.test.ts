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
  },
}));

import { prisma } from '../lib/prisma.js';

const mockedPrisma = vi.mocked(prisma);

describe('POST /api/auth/signup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a new user and returns a JWT token', async () => {
    const mockUser = {
      id: 'test-id-123',
      name: 'Test User',
      email: 'test@example.com',
      passwordHash: 'hashed-pw',
      role: 'CONTRIBUTOR' as const,
      departmentId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockedPrisma.user.findUnique.mockResolvedValue(null);
    mockedPrisma.user.create.mockResolvedValue(mockUser);

    const res = await request(app).post('/api/auth/signup').send({
      name: 'Test User',
      email: 'test@example.com',
      password: 'securepassword123',
    });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.email).toBe('test@example.com');
    expect(res.body.user.name).toBe('Test User');
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app).post('/api/auth/signup').send({
      email: 'test@example.com',
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 for invalid email format', async () => {
    const res = await request(app).post('/api/auth/signup').send({
      name: 'Test User',
      email: 'notanemail',
      password: 'securepassword123',
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email/i);
  });

  it('returns 400 for password shorter than 8 characters', async () => {
    const res = await request(app).post('/api/auth/signup').send({
      name: 'Test User',
      email: 'test@example.com',
      password: 'short',
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/password/i);
  });

  it('returns 400 for whitespace-only name', async () => {
    const res = await request(app).post('/api/auth/signup').send({
      name: '   ',
      email: 'test@example.com',
      password: 'securepassword123',
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name/i);
  });

  it('trims name whitespace before creating user', async () => {
    const mockUser = {
      id: 'test-id-123',
      name: 'Test User',
      email: 'test@example.com',
      passwordHash: 'hashed-pw',
      role: 'CONTRIBUTOR' as const,
      departmentId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockedPrisma.user.findUnique.mockResolvedValue(null);
    mockedPrisma.user.create.mockResolvedValue(mockUser);

    const res = await request(app).post('/api/auth/signup').send({
      name: '  Test User  ',
      email: 'test@example.com',
      password: 'securepassword123',
    });

    expect(res.status).toBe(201);
    expect(mockedPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: 'Test User' }),
      }),
    );
  });

  it('returns 409 when email already exists', async () => {
    const existingUser = {
      id: 'existing-id',
      name: 'Existing User',
      email: 'test@example.com',
      passwordHash: 'hashed-pw',
      role: 'CONTRIBUTOR' as const,
      departmentId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockedPrisma.user.findUnique.mockResolvedValue(existingUser);

    const res = await request(app).post('/api/auth/signup').send({
      name: 'Test User',
      email: 'test@example.com',
      password: 'securepassword123',
    });

    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty('error');
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a JWT token for valid credentials', async () => {
    // bcryptjs.hashSync('securepassword123', 10) - we'll use the actual hash in the mock
    const bcryptjs = await import('bcryptjs');
    const hashedPassword = bcryptjs.hashSync('securepassword123', 10);

    const mockUser = {
      id: 'test-id-123',
      name: 'Test User',
      email: 'test@example.com',
      passwordHash: hashedPassword,
      role: 'CONTRIBUTOR' as const,
      departmentId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockedPrisma.user.findUnique.mockResolvedValue(mockUser);

    const res = await request(app).post('/api/auth/login').send({
      email: 'test@example.com',
      password: 'securepassword123',
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.email).toBe('test@example.com');
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  it('returns 401 for invalid password', async () => {
    const bcryptjs = await import('bcryptjs');
    const hashedPassword = bcryptjs.hashSync('securepassword123', 10);

    const mockUser = {
      id: 'test-id-123',
      name: 'Test User',
      email: 'test@example.com',
      passwordHash: hashedPassword,
      role: 'CONTRIBUTOR' as const,
      departmentId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockedPrisma.user.findUnique.mockResolvedValue(mockUser);

    const res = await request(app).post('/api/auth/login').send({
      email: 'test@example.com',
      password: 'wrongpassword',
    });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 401 for non-existent email', async () => {
    mockedPrisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app).post('/api/auth/login').send({
      email: 'nonexistent@example.com',
      password: 'securepassword123',
    });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 for invalid email format', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'notanemail',
      password: 'securepassword123',
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email/i);
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'test@example.com',
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});

describe('GET /api/auth/me', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the current user when authenticated', async () => {
    const mockUser = {
      id: 'test-id-123',
      name: 'Test User',
      email: 'test@example.com',
      passwordHash: 'hashed-pw',
      role: 'CONTRIBUTOR' as const,
      departmentId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockedPrisma.user.findUnique.mockResolvedValue(mockUser);

    const token = signToken({
      userId: 'test-id-123',
      email: 'test@example.com',
      role: 'CONTRIBUTOR',
    });

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.id).toBe('test-id-123');
    expect(res.body.user.email).toBe('test@example.com');
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 404 when user no longer exists', async () => {
    mockedPrisma.user.findUnique.mockResolvedValue(null);

    const token = signToken({
      userId: 'deleted-user-id',
      email: 'deleted@example.com',
      role: 'CONTRIBUTOR',
    });

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});

describe('Error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 500 when Prisma throws on signup', async () => {
    mockedPrisma.user.findUnique.mockRejectedValue(new Error('DB connection failed'));

    const res = await request(app).post('/api/auth/signup').send({
      name: 'Test User',
      email: 'test@example.com',
      password: 'securepassword123',
    });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
  });

  it('returns 500 when Prisma throws on login', async () => {
    mockedPrisma.user.findUnique.mockRejectedValue(new Error('DB connection failed'));

    const res = await request(app).post('/api/auth/login').send({
      email: 'test@example.com',
      password: 'securepassword123',
    });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
  });

  it('returns 500 when Prisma throws on /me', async () => {
    mockedPrisma.user.findUnique.mockRejectedValue(new Error('DB connection failed'));

    const token = signToken({
      userId: 'test-id-123',
      email: 'test@example.com',
      role: 'CONTRIBUTOR',
    });

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
  });
});
