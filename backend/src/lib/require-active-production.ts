import type { Response } from 'express';
import { prisma } from './prisma';

/**
 * Checks that a production is ACTIVE (not PENDING).
 * Returns true if the production is active and the request can proceed.
 * Returns false and sends a 403 response if the production is PENDING.
 */
export async function requireActiveProduction(
  productionId: string,
  res: Response,
): Promise<boolean> {
  const production = await prisma.production.findUnique({
    where: { id: productionId },
    select: { status: true },
  });

  if (!production) {
    res.status(404).json({
      error: 'Production not found',
    });
    return false;
  }

  if (production.status !== 'ACTIVE') {
    res.status(403).json({
      error: 'This production is pending approval and cannot be modified',
    });
    return false;
  }

  return true;
}
