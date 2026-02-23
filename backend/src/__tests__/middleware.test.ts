import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { signToken } from '../lib/jwt.js';

// Create a test app with a protected route
function createTestApp() {
  const testApp = express();
  testApp.use(express.json());

  testApp.get('/protected', requireAuth, (req, res) => {
    const authReq = req as AuthenticatedRequest;
    res.json({ userId: authReq.user.userId, email: authReq.user.email });
  });

  return testApp;
}

describe('requireAuth middleware', () => {
  let testApp: express.Express;

  beforeEach(() => {
    testApp = createTestApp();
  });

  it('rejects requests with no Authorization header', async () => {
    const res = await request(testApp).get('/protected');

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toMatch(/token/i);
  });

  it('rejects requests with invalid token format', async () => {
    const res = await request(testApp)
      .get('/protected')
      .set('Authorization', 'NotBearer some-token');

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('rejects requests with expired or invalid JWT', async () => {
    const res = await request(testApp)
      .get('/protected')
      .set('Authorization', 'Bearer invalid-jwt-token');

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('allows requests with valid JWT and attaches user to request', async () => {
    const token = signToken({
      userId: 'test-user-id',
      email: 'test@example.com',
    });

    const res = await request(testApp).get('/protected').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.userId).toBe('test-user-id');
    expect(res.body.email).toBe('test@example.com');
  });
});
