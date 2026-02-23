import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { ElementType, ElementStatus, ElementSource } from '@backbone/shared/types';

const elementsRouter = Router();

// Create an element manually
elementsRouter.post('/api/scripts/:scriptId/elements', requireAuth, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { scriptId } = req.params;
    const { name, type, pageNumbers } = req.body;

    // Find script to get productionId
    const script = await prisma.script.findUnique({
      where: { id: scriptId },
    });

    if (!script) {
      res.status(404).json({ error: 'Script not found' });
      return;
    }

    // Check membership
    const membership = await prisma.productionMember.findUnique({
      where: {
        productionId_userId: {
          productionId: script.productionId,
          userId: authReq.user.userId,
        },
      },
    });

    if (!membership) {
      res.status(403).json({ error: 'You are not a member of this production' });
      return;
    }

    if (!name || !String(name).trim()) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    const element = await prisma.element.create({
      data: {
        scriptId,
        name: String(name).trim(),
        type: type || ElementType.OTHER,
        pageNumbers: pageNumbers || [],
        status: ElementStatus.ACTIVE,
        source: ElementSource.MANUAL,
      },
    });

    res.status(201).json({ element });
  } catch (error) {
    console.error('Create element error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List elements for a script
elementsRouter.get('/api/scripts/:scriptId/elements', requireAuth, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { scriptId } = req.params;
    const includeArchived = req.query.includeArchived === 'true';

    // Find script to get productionId
    const script = await prisma.script.findUnique({
      where: { id: scriptId },
    });

    if (!script) {
      res.status(404).json({ error: 'Script not found' });
      return;
    }

    // Check membership
    const membership = await prisma.productionMember.findUnique({
      where: {
        productionId_userId: {
          productionId: script.productionId,
          userId: authReq.user.userId,
        },
      },
    });

    if (!membership) {
      res.status(403).json({ error: 'You are not a member of this production' });
      return;
    }

    const where: { scriptId: string; status?: ElementStatus } = { scriptId };
    if (!includeArchived) {
      where.status = ElementStatus.ACTIVE;
    }

    const elements = await prisma.element.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    res.json({ elements });
  } catch (error) {
    console.error('List elements error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update an element (name, type, status, pageNumbers)
elementsRouter.patch('/api/elements/:id', requireAuth, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const { name, type, status, pageNumbers } = req.body;

    // Find element with script to get productionId
    const element = await prisma.element.findUnique({
      where: { id },
      include: { script: { select: { productionId: true } } },
    });

    if (!element) {
      res.status(404).json({ error: 'Element not found' });
      return;
    }

    // Check membership
    const membership = await prisma.productionMember.findUnique({
      where: {
        productionId_userId: {
          productionId: element.script.productionId,
          userId: authReq.user.userId,
        },
      },
    });

    if (!membership) {
      res.status(403).json({ error: 'You are not a member of this production' });
      return;
    }

    const updateData: { name?: string; type?: string; status?: string; pageNumbers?: number[] } =
      {};
    if (name !== undefined) updateData.name = String(name).trim();
    if (type !== undefined) updateData.type = type;
    if (status !== undefined) updateData.status = status;
    if (pageNumbers !== undefined) updateData.pageNumbers = pageNumbers;

    const updated = await prisma.element.update({
      where: { id },
      data: updateData,
    });

    res.json({ element: updated });
  } catch (error) {
    console.error('Update element error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { elementsRouter };
