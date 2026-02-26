import jwt from 'jsonwebtoken';

if (!process.env.JWT_SECRET && process.env.NODE_ENV !== 'test') {
  throw new Error('JWT_SECRET environment variable is required. Set it in .env.');
}

const JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret-do-not-use-in-production';
const JWT_EXPIRES_IN = '7d';
const JWT_ISSUER = 'slugmax';
const JWT_AUDIENCE = 'slugmax-api';

export interface JwtPayload {
  userId: string;
  email: string;
  tokenVersion?: number;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(
    { ...payload, tokenVersion: payload.tokenVersion ?? 0 },
    JWT_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: JWT_EXPIRES_IN,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    },
  );
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET, {
    algorithms: ['HS256'],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  }) as JwtPayload;
}
