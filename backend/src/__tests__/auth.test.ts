import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { signToken } from '../lib/jwt.js';

// Mock email service
vi.mock('../services/email-service.js', () => ({
  sendEmail: vi.fn(),
  sendNotificationEmail: vi.fn(),
}));

// Mock Prisma client
vi.mock('../lib/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    passwordResetToken: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    emailVerificationToken: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from '../lib/prisma.js';
import { sendEmail } from '../services/email-service.js';

const mockedPrisma = vi.mocked(prisma);
const mockedSendEmail = vi.mocked(sendEmail);

describe('POST /api/auth/signup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a new user and returns a message (no JWT)', async () => {
    const mockUser = {
      id: 'test-id-123',
      name: 'Test User',
      email: 'test@example.com',
      passwordHash: 'hashed-pw',
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockedPrisma.user.findUnique.mockResolvedValue(null);
    mockedPrisma.user.create.mockResolvedValue(mockUser);
    mockedPrisma.emailVerificationToken.create.mockResolvedValue({
      id: 'vtoken-1',
      userId: 'test-id-123',
      token: 'verify-token-abc',
      expiresAt: new Date(Date.now() + 86400000),
      usedAt: null,
      createdAt: new Date(),
    } as any);

    const res = await request(app).post('/api/auth/signup').send({
      name: 'Test User',
      email: 'test@example.com',
      password: 'securepassword123',
    });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('message');
    expect(res.body).not.toHaveProperty('token');
    expect(mockedPrisma.emailVerificationToken.create).toHaveBeenCalled();
    expect(mockedSendEmail).toHaveBeenCalled();
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
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockedPrisma.user.findUnique.mockResolvedValue(null);
    mockedPrisma.user.create.mockResolvedValue(mockUser);
    mockedPrisma.emailVerificationToken.create.mockResolvedValue({
      id: 'vtoken-1',
      userId: 'test-id-123',
      token: 'verify-token-abc',
      expiresAt: new Date(Date.now() + 86400000),
      usedAt: null,
      createdAt: new Date(),
    } as any);

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
      emailVerified: true,
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
      emailVerified: true,
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
      emailVerified: true,
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
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockedPrisma.user.findUnique.mockResolvedValue(mockUser);

    const token = signToken({
      userId: 'test-id-123',
      email: 'test@example.com',
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
    });

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
  });
});

describe('POST /api/auth/forgot-password', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 and creates token for existing email', async () => {
    const mockUser = {
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      passwordHash: 'hashed-pw',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockedPrisma.user.findUnique.mockResolvedValue(mockUser);
    mockedPrisma.passwordResetToken.create.mockResolvedValue({
      id: 'token-1',
      userId: 'user-1',
      token: 'reset-token-abc',
      expiresAt: new Date(Date.now() + 3600000),
      usedAt: null,
      createdAt: new Date(),
    } as any);

    const res = await request(app).post('/api/auth/forgot-password').send({
      email: 'test@example.com',
    });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/check your email/i);
    expect(mockedPrisma.passwordResetToken.create).toHaveBeenCalled();
    expect(mockedSendEmail).toHaveBeenCalled();
  });

  it('returns 200 for unknown email without leaking info', async () => {
    mockedPrisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app).post('/api/auth/forgot-password').send({
      email: 'unknown@example.com',
    });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/check your email/i);
    expect(mockedPrisma.passwordResetToken.create).not.toHaveBeenCalled();
    expect(mockedSendEmail).not.toHaveBeenCalled();
  });

  it('returns 400 when email is missing', async () => {
    const res = await request(app).post('/api/auth/forgot-password').send({});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});

describe('POST /api/auth/reset-password', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resets password with valid token', async () => {
    const mockToken = {
      id: 'token-1',
      userId: 'user-1',
      token: 'valid-reset-token',
      expiresAt: new Date(Date.now() + 3600000),
      usedAt: null,
      createdAt: new Date(),
      user: {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
      },
    };

    mockedPrisma.passwordResetToken.findFirst.mockResolvedValue(mockToken as any);
    mockedPrisma.$transaction.mockResolvedValue([{}, {}]);

    const res = await request(app).post('/api/auth/reset-password').send({
      token: 'valid-reset-token',
      newPassword: 'newpassword123',
    });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/password.*reset/i);
  });

  it('returns 400 for expired token', async () => {
    const mockToken = {
      id: 'token-1',
      userId: 'user-1',
      token: 'expired-token',
      expiresAt: new Date(Date.now() - 1000),
      usedAt: null,
      createdAt: new Date(),
    };

    mockedPrisma.passwordResetToken.findFirst.mockResolvedValue(mockToken as any);

    const res = await request(app).post('/api/auth/reset-password').send({
      token: 'expired-token',
      newPassword: 'newpassword123',
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/expired/i);
  });

  it('returns 400 for already-used token', async () => {
    const mockToken = {
      id: 'token-1',
      userId: 'user-1',
      token: 'used-token',
      expiresAt: new Date(Date.now() + 3600000),
      usedAt: new Date(),
      createdAt: new Date(),
    };

    mockedPrisma.passwordResetToken.findFirst.mockResolvedValue(mockToken as any);

    const res = await request(app).post('/api/auth/reset-password').send({
      token: 'used-token',
      newPassword: 'newpassword123',
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid|used|expired/i);
  });

  it('returns 400 for short password', async () => {
    const res = await request(app).post('/api/auth/reset-password').send({
      token: 'some-token',
      newPassword: 'short',
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/password/i);
  });
});

describe('Login with email verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 403 with EMAIL_NOT_VERIFIED code for unverified user', async () => {
    const bcryptjs = await import('bcryptjs');
    const hashedPassword = bcryptjs.hashSync('securepassword123', 10);

    const mockUser = {
      id: 'test-id-123',
      name: 'Test User',
      email: 'test@example.com',
      passwordHash: hashedPassword,
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockedPrisma.user.findUnique.mockResolvedValue(mockUser);

    const res = await request(app).post('/api/auth/login').send({
      email: 'test@example.com',
      password: 'securepassword123',
    });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('EMAIL_NOT_VERIFIED');
    expect(res.body.error).toMatch(/verify/i);
  });

  it('returns JWT for verified user', async () => {
    const bcryptjs = await import('bcryptjs');
    const hashedPassword = bcryptjs.hashSync('securepassword123', 10);

    const mockUser = {
      id: 'test-id-123',
      name: 'Test User',
      email: 'test@example.com',
      passwordHash: hashedPassword,
      emailVerified: true,
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
  });
});

describe('POST /api/auth/verify-email', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('verifies email with valid token', async () => {
    const mockToken = {
      id: 'vtoken-1',
      userId: 'user-1',
      token: 'valid-verify-token',
      expiresAt: new Date(Date.now() + 86400000),
      usedAt: null,
      createdAt: new Date(),
    };

    mockedPrisma.emailVerificationToken.findFirst.mockResolvedValue(mockToken as any);
    mockedPrisma.$transaction.mockResolvedValue([{}, {}]);

    const res = await request(app).post('/api/auth/verify-email').send({
      token: 'valid-verify-token',
    });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/verified/i);
  });

  it('returns 400 for expired verification token', async () => {
    const mockToken = {
      id: 'vtoken-1',
      userId: 'user-1',
      token: 'expired-token',
      expiresAt: new Date(Date.now() - 1000),
      usedAt: null,
      createdAt: new Date(),
    };

    mockedPrisma.emailVerificationToken.findFirst.mockResolvedValue(mockToken as any);

    const res = await request(app).post('/api/auth/verify-email').send({
      token: 'expired-token',
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/expired/i);
  });

  it('returns 400 for already-used verification token', async () => {
    const mockToken = {
      id: 'vtoken-1',
      userId: 'user-1',
      token: 'used-token',
      expiresAt: new Date(Date.now() + 86400000),
      usedAt: new Date(),
      createdAt: new Date(),
    };

    mockedPrisma.emailVerificationToken.findFirst.mockResolvedValue(mockToken as any);

    const res = await request(app).post('/api/auth/verify-email').send({
      token: 'used-token',
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid|used|expired/i);
  });
});

describe('POST /api/auth/resend-verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resends verification for unverified user', async () => {
    const mockUser = {
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      passwordHash: 'hashed-pw',
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockedPrisma.user.findUnique.mockResolvedValue(mockUser);
    mockedPrisma.emailVerificationToken.create.mockResolvedValue({
      id: 'vtoken-2',
      userId: 'user-1',
      token: 'new-verify-token',
      expiresAt: new Date(Date.now() + 86400000),
      usedAt: null,
      createdAt: new Date(),
    } as any);

    const res = await request(app).post('/api/auth/resend-verification').send({
      email: 'test@example.com',
    });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/check your email/i);
    expect(mockedSendEmail).toHaveBeenCalled();
  });

  it('returns 200 for unknown email without leaking info', async () => {
    mockedPrisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app).post('/api/auth/resend-verification').send({
      email: 'unknown@example.com',
    });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/check your email/i);
    expect(mockedSendEmail).not.toHaveBeenCalled();
  });
});

describe('GET /api/auth/me includes emailVerified', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns emailVerified field in response', async () => {
    const mockUser = {
      id: 'test-id-123',
      name: 'Test User',
      email: 'test@example.com',
      passwordHash: 'hashed-pw',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockedPrisma.user.findUnique.mockResolvedValue(mockUser);

    const token = signToken({
      userId: 'test-id-123',
      email: 'test@example.com',
    });

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.emailVerified).toBe(true);
  });
});
