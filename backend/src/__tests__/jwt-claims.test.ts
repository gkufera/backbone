import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import { signToken, verifyToken } from '../lib/jwt';

describe('JWT claims and algorithm (S15, S16)', () => {
  it('includes iss (issuer) claim in signed token', () => {
    const token = signToken({ userId: 'user-1', email: 'test@example.com' });
    const decoded = jwt.decode(token) as Record<string, unknown>;

    expect(decoded.iss).toBe('slugmax');
  });

  it('includes aud (audience) claim in signed token', () => {
    const token = signToken({ userId: 'user-1', email: 'test@example.com' });
    const decoded = jwt.decode(token) as Record<string, unknown>;

    expect(decoded.aud).toBe('slugmax-api');
  });

  it('uses HS256 algorithm', () => {
    const token = signToken({ userId: 'user-1', email: 'test@example.com' });
    const header = JSON.parse(
      Buffer.from(token.split('.')[0], 'base64url').toString(),
    );

    expect(header.alg).toBe('HS256');
  });

  it('rejects token with wrong audience', () => {
    const secret = process.env.JWT_SECRET ?? 'test-secret-do-not-use-in-production';
    const badToken = jwt.sign(
      { userId: 'user-1', email: 'test@example.com' },
      secret,
      { algorithm: 'HS256', issuer: 'slugmax', audience: 'wrong-audience' },
    );

    expect(() => verifyToken(badToken)).toThrow();
  });

  it('rejects token with wrong issuer', () => {
    const secret = process.env.JWT_SECRET ?? 'test-secret-do-not-use-in-production';
    const badToken = jwt.sign(
      { userId: 'user-1', email: 'test@example.com' },
      secret,
      { algorithm: 'HS256', issuer: 'wrong-issuer', audience: 'slugmax-api' },
    );

    expect(() => verifyToken(badToken)).toThrow();
  });

  it('verifies valid token successfully', () => {
    const token = signToken({ userId: 'user-1', email: 'test@example.com' });
    const payload = verifyToken(token);

    expect(payload.userId).toBe('user-1');
    expect(payload.email).toBe('test@example.com');
  });

  it('JWT includes tokenVersion claim', () => {
    const token = signToken({
      userId: 'user-1',
      email: 'test@example.com',
      tokenVersion: 3,
    });

    const decoded = jwt.decode(token) as Record<string, unknown>;
    expect(decoded.tokenVersion).toBe(3);
  });

  it('tokenVersion defaults to 0 when not provided', () => {
    const token = signToken({
      userId: 'user-1',
      email: 'test@example.com',
    });

    const decoded = jwt.decode(token) as Record<string, unknown>;
    expect(decoded.tokenVersion).toBe(0);
  });

  it('verifyToken returns tokenVersion', () => {
    const token = signToken({
      userId: 'user-1',
      email: 'test@example.com',
      tokenVersion: 5,
    });

    const payload = verifyToken(token);
    expect(payload.tokenVersion).toBe(5);
  });
});
