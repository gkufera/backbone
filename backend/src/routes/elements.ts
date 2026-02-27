import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';
import { parsePagination } from '../lib/pagination';
import { ElementType, ElementStatus, ElementSource, OptionStatus, ScriptStatus } from '@backbone/shared/types';
import { requireActiveProduction } from '../lib/require-active-production';

const elementsRouter = Router();

// Create an element manually
elementsRouter.post('/api/scripts/:scriptId/elements', requireAuth, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { scriptId } = req.params;
    const { name, type, highlightPage, highlightText, departmentId } = req.body;

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

    // Block mutations on PENDING productions
    if (!(await requireActiveProduction(script.productionId, res))) return;

    if (!name || !String(name).trim()) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    // Validate type against enum if provided
    if (type && !Object.values(ElementType).includes(type)) {
      res.status(400).json({ error: 'Invalid element type' });
      return;
    }

    // Enforce element count limit per script
    const elementCount = await prisma.element.count({ where: { scriptId } });
    if (elementCount >= 1000) {
      res.status(400).json({ error: 'Element limit reached (max 1000 per script)' });
      return;
    }

    const element = await prisma.element.create({
      data: {
        scriptId,
        name: String(name).trim(),
        type: type || ElementType.OTHER,
        highlightPage: highlightPage ?? null,
        highlightText: highlightText ?? null,
        departmentId: departmentId ?? null,
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

    const where: { scriptId: string; status?: ElementStatus; deletedAt?: null } = { scriptId, deletedAt: null };
    if (!includeArchived) {
      where.status = ElementStatus.ACTIVE;
    }

    const { take, skip } = parsePagination(req);
    const elements = await prisma.element.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { options: { where: { status: OptionStatus.ACTIVE } } },
        },
      },
      take,
      skip,
    });

    res.json({ elements });
  } catch (error) {
    console.error('List elements error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update an element (name, type, status, highlightPage, highlightText, departmentId)
elementsRouter.patch('/api/elements/:id', requireAuth, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const { name, type, status, highlightPage, highlightText, departmentId } = req.body;

    // Find element with script to get productionId
    const element = await prisma.element.findUnique({
      where: { id },
      include: { script: { select: { productionId: true } } },
    });

    if (!element || element.deletedAt) {
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

    // Block mutations on PENDING productions
    if (!(await requireActiveProduction(element.script.productionId, res))) return;

    // Validate type and status against enums if provided
    if (type !== undefined && !Object.values(ElementType).includes(type)) {
      res.status(400).json({ error: 'Invalid element type' });
      return;
    }

    if (status !== undefined && !Object.values(ElementStatus).includes(status)) {
      res.status(400).json({ error: 'Invalid element status' });
      return;
    }

    const updateData: {
      name?: string;
      type?: string;
      status?: string;
      highlightPage?: number | null;
      highlightText?: string | null;
      departmentId?: string | null;
    } = {};
    if (name !== undefined) updateData.name = String(name).trim();
    if (type !== undefined) updateData.type = type;
    if (status !== undefined) updateData.status = status;
    if (highlightPage !== undefined) updateData.highlightPage = highlightPage;
    if (highlightText !== undefined) updateData.highlightText = highlightText;
    if (departmentId !== undefined) updateData.departmentId = departmentId;

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

// Hard-delete an element (only when script is REVIEWING)
elementsRouter.delete('/api/elements/:id', requireAuth, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;

    const element = await prisma.element.findUnique({
      where: { id },
      include: {
        script: { select: { productionId: true, status: true } },
        _count: { select: { options: true } },
      },
    });

    if (!element) {
      res.status(404).json({ error: 'Element not found' });
      return;
    }

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

    // Block mutations on PENDING productions
    if (!(await requireActiveProduction(element.script.productionId, res))) return;

    if (element.script.status !== ScriptStatus.REVIEWING) {
      res.status(403).json({ error: 'Elements can only be deleted when script is in REVIEWING status' });
      return;
    }

    if (element._count.options > 0) {
      res.status(409).json({ error: 'Cannot delete element with options. Archive it instead.' });
      return;
    }

    await prisma.element.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    res.json({ message: 'Element deleted' });
  } catch (error) {
    console.error('Delete element error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { elementsRouter };
