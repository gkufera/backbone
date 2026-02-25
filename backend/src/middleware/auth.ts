import type { Request, Response, NextFunction } from 'express';
import { verifyToken, type JwtPayload } from '../lib/jwt';

export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
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
    (req as AuthenticatedRequest).user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Authentication required: invalid or expired token' });
  }
}
