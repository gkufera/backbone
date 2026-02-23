import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { requireAuth, requireRole, type AuthenticatedRequest } from '../middleware/auth.js';
import { signToken } from '../lib/jwt.js';

function createRoleTestApp() {
  const testApp = express();
  testApp.use(express.json());

  // Only directors can access this route
  testApp.get('/director-only', requireAuth, requireRole('DIRECTOR'), (req, res) => {
    const authReq = req as AuthenticatedRequest;
    res.json({ message: 'Welcome, Director', userId: authReq.user.userId });
  });

  // Directors and department heads can access this route
  testApp.get(
    '/heads-and-directors',
    requireAuth,
    requireRole('DIRECTOR', 'DEPARTMENT_HEAD'),
    (req, res) => {
      const authReq = req as AuthenticatedRequest;
      res.json({ message: 'Welcome', userId: authReq.user.userId });
    },
  );

  return testApp;
}

describe('requireRole middleware', () => {
  const testApp = createRoleTestApp();

  it('allows access when user has the required role', async () => {
    const token = signToken({
      userId: 'director-id',
      email: 'director@example.com',
      role: 'DIRECTOR',
    });

    const res = await request(testApp)
      .get('/director-only')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Welcome, Director');
  });

  it('rejects access when user does not have the required role', async () => {
    const token = signToken({
      userId: 'contributor-id',
      email: 'contributor@example.com',
      role: 'CONTRIBUTOR',
    });

    const res = await request(testApp)
      .get('/director-only')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toMatch(/permission|role|forbidden/i);
  });

  it('allows access when user has one of multiple allowed roles', async () => {
    const token = signToken({
      userId: 'head-id',
      email: 'head@example.com',
      role: 'DEPARTMENT_HEAD',
    });

    const res = await request(testApp)
      .get('/heads-and-directors')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Welcome');
  });

  it('rejects when user role is not in the allowed list', async () => {
    const token = signToken({
      userId: 'assistant-id',
      email: 'assistant@example.com',
      role: 'ASSISTANT',
    });

    const res = await request(testApp)
      .get('/heads-and-directors')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error');
  });
});
