import rateLimit from 'express-rate-limit';
import type { Request } from 'express';
import type { AuthenticatedRequest } from './auth';

export function createGeneralLimiter(options?: { max?: number; windowMs?: number }) {
  return rateLimit({
    windowMs: options?.windowMs ?? 60 * 1000, // 1 minute
    max: options?.max ?? 100,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
  });
}

export function createAuthLimiter(options?: { max?: number; windowMs?: number }) {
  return rateLimit({
    windowMs: options?.windowMs ?? 60 * 1000, // 1 minute
    max: options?.max ?? 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
  });
}

export function createUploadLimiter(options?: { max?: number; windowMs?: number }) {
  return rateLimit({
    windowMs: options?.windowMs ?? 60 * 1000, // 1 minute
    max: options?.max ?? 30,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      return (req as AuthenticatedRequest).user?.userId ?? req.ip ?? 'unknown';
    },
  });
}
