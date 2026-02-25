import type { Request } from 'express';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export interface PaginationParams {
  take: number;
  skip: number;
}

/**
 * Extract and validate pagination params from query string.
 * Returns Prisma-compatible `take` and `skip` values.
 */
export function parsePagination(req: Request): PaginationParams {
  const rawLimit = parseInt(req.query.limit as string, 10);
  const rawOffset = parseInt(req.query.offset as string, 10);

  const limit = Number.isFinite(rawLimit) && rawLimit > 0
    ? Math.min(rawLimit, MAX_LIMIT)
    : DEFAULT_LIMIT;

  const offset = Number.isFinite(rawOffset) && rawOffset >= 0
    ? rawOffset
    : 0;

  return { take: limit, skip: offset };
}
