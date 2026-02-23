import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { PRODUCTION_TITLE_MAX_LENGTH } from '@backbone/shared/constants';

const productionsRouter = Router();

// Create a production
productionsRouter.post('/api/productions', requireAuth, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { title, description } = req.body;

    if (!title || !String(title).trim()) {
      res.status(400).json({ error: 'Title is required' });
      return;
    }

    const trimmedTitle = String(title).trim();

    if (trimmedTitle.length > PRODUCTION_TITLE_MAX_LENGTH) {
      res
        .status(400)
        .json({ error: `Title must be ${PRODUCTION_TITLE_MAX_LENGTH} characters or fewer` });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const production = await tx.production.create({
        data: {
          title: trimmedTitle,
          description: description || null,
          createdById: authReq.user.userId,
        },
      });

      const member = await tx.productionMember.create({
        data: {
          productionId: production.id,
          userId: authReq.user.userId,
          role: 'OWNER',
        },
      });

      return { production, member };
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Create production error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List user's productions
productionsRouter.get('/api/productions', requireAuth, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;

    const memberships = await prisma.productionMember.findMany({
      where: { userId: authReq.user.userId },
      include: {
        production: true,
      },
      orderBy: { production: { createdAt: 'desc' } },
    });

    const productions = memberships.map((m) => ({
      ...m.production,
      memberRole: m.role,
    }));

    res.json({ productions });
  } catch (error) {
    console.error('List productions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a single production with members and scripts
productionsRouter.get('/api/productions/:id', requireAuth, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;

    // Check membership
    const membership = await prisma.productionMember.findUnique({
      where: {
        productionId_userId: {
          productionId: id,
          userId: authReq.user.userId,
        },
      },
    });

    if (!membership) {
      // Check if production exists
      const exists = await prisma.production.findUnique({ where: { id } });
      if (!exists) {
        res.status(404).json({ error: 'Production not found' });
        return;
      }
      res.status(403).json({ error: 'You are not a member of this production' });
      return;
    }

    const production = await prisma.production.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        scripts: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    res.json({ production });
  } catch (error) {
    console.error('Get production error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { productionsRouter };
