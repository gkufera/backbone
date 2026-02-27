import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from './auth';
import { prisma } from '../lib/prisma';

export interface MemberRequest extends AuthenticatedRequest {
  memberRole: string;
}

/**
 * Checks if the authenticated user is a member of the production specified by :id param.
 * Attaches memberRole to the request. Returns 403 if not a member, 404 if production not found.
 */
export function requireMembership(...allowedRoles: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const productionId = req.params.id || req.params.productionId;

    if (!productionId) {
      res.status(400).json({ error: 'Production ID is required' });
      return;
    }

    try {
      const member = await prisma.productionMember.findUnique({
        where: {
          productionId_userId: {
            productionId,
            userId: authReq.user.userId,
          },
        },
      });

      if (!member || member.deletedAt) {
        // Check if production exists to give correct error
        const production = await prisma.production.findUnique({
          where: { id: productionId },
        });

        if (!production) {
          res.status(404).json({ error: 'Production not found' });
          return;
        }

        res.status(403).json({ error: 'You are not a member of this production' });
        return;
      }

      if (allowedRoles.length > 0 && !allowedRoles.includes(member.role)) {
        res.status(403).json({ error: 'Insufficient permissions for this action' });
        return;
      }

      (req as MemberRequest).memberRole = member.role;
      next();
    } catch (error) {
      console.error('Membership check error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}
