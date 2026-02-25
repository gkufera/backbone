import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';

// Mock Prisma client (required because app imports routes that use prisma)
vi.mock('../lib/prisma', () => ({
  prisma: {},
}));

import { app } from '../app';

describe('Security Headers', () => {
  it('sets X-Content-Type-Options nosniff header', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('sets X-Frame-Options header', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
  });

  it('does NOT expose X-Powered-By header (S18)', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('sets Strict-Transport-Security header (S18)', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    // Helmet sets HSTS by default
    expect(res.headers['strict-transport-security']).toBeDefined();
  });

  it('sets X-Download-Options header (S18)', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.headers['x-download-options']).toBe('noopen');
  });

  it('sets X-DNS-Prefetch-Control header (S18)', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.headers['x-dns-prefetch-control']).toBe('off');
  });
});
