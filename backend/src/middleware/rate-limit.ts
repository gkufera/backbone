import rateLimit from 'express-rate-limit';

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
