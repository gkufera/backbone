import type { Request, Response, NextFunction } from 'express';
import { verifyToken, type JwtPayload } from '../lib/jwt';
import { prisma } from '../lib/prisma';

export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ error: 'Authentication required: no token provided' });
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    res.status(401).json({ error: 'Authentication required: invalid token format' });
    return;
  }

  const token = parts[1];

  try {
    const payload = verifyToken(token);

    // Verify tokenVersion against DB to support JWT revocation
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { tokenVersion: true, emailVerified: true },
    });

    if (!user || user.tokenVersion !== (payload.tokenVersion ?? 0)) {
      res.status(401).json({ error: 'Authentication required: invalid or expired token' });
      return;
    }

    if (!user.emailVerified) {
      res.status(403).json({ error: 'Email verification required' });
      return;
    }

    (req as AuthenticatedRequest).user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Authentication required: invalid or expired token' });
  }
}
