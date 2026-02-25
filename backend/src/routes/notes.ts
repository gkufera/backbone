import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { NOTE_CONTENT_MAX_LENGTH } from '@backbone/shared/constants';
import { NotificationType } from '@backbone/shared/types';
import { notifyProductionMembers } from '../services/notification-service.js';

const notesRouter = Router();

// Enrich note objects with the user's department name from their production membership
async function enrichNotesWithDepartment(
  notes: Array<{ userId: string; [key: string]: unknown }>,
  productionId: string,
) {
  if (notes.length === 0) return notes;

  const uniqueUserIds = [...new Set(notes.map((n) => n.userId))];
  const members = await prisma.productionMember.findMany({
    where: { productionId, userId: { in: uniqueUserIds } },
    include: { department: { select: { name: true } } },
  });

  const deptMap = new Map<string, string | null>();
  for (const member of members) {
    deptMap.set(member.userId, member.department?.name ?? null);
  }

  return notes.map((note) => ({
    ...note,
    department: deptMap.get(note.userId) ?? null,
  }));
}

// Create a note for an element (discussion)
notesRouter.post('/api/elements/:elementId/notes', requireAuth, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { elementId } = req.params;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      res.status(400).json({ error: 'Content is required' });
      return;
    }

    if (content.length > NOTE_CONTENT_MAX_LENGTH) {
      res.status(400).json({
        error: `Content must not exceed ${NOTE_CONTENT_MAX_LENGTH} characters`,
      });
      return;
    }

    const element = await prisma.element.findUnique({
      where: { id: elementId },
      include: { script: { select: { productionId: true } } },
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
      include: { department: { select: { name: true } } },
    });

    if (!membership) {
      res.status(403).json({ error: 'You are not a member of this production' });
      return;
    }

    const note = await prisma.note.create({
      data: {
        content,
        userId: authReq.user.userId,
        elementId,
      },
      include: { user: { select: { id: true, name: true } } },
    });

    // Notify other production members
    const productionId = element.script.productionId;
    const link = `/productions/${productionId}/scripts/${element.scriptId}/elements/${elementId}`;
    await notifyProductionMembers(
      productionId,
      authReq.user.userId,
      NotificationType.NOTE_ADDED,
      `New note on ${element.name}`,
      link,
    );

    res.status(201).json({
      note: { ...note, department: membership.department?.name ?? null },
    });
  } catch (error) {
    console.error('Create element note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List notes for an element
notesRouter.get('/api/elements/:elementId/notes', requireAuth, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { elementId } = req.params;

    const element = await prisma.element.findUnique({
      where: { id: elementId },
      include: { script: { select: { productionId: true } } },
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

    const notes = await prisma.note.findMany({
      where: { elementId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });

    // Enrich notes with department names
    const productionId = element.script.productionId;
    const enrichedNotes = await enrichNotesWithDepartment(notes, productionId);

    res.json({ notes: enrichedNotes });
  } catch (error) {
    console.error('List element notes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a note for an option
notesRouter.post('/api/options/:optionId/notes', requireAuth, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { optionId } = req.params;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      res.status(400).json({ error: 'Content is required' });
      return;
    }

    if (content.length > NOTE_CONTENT_MAX_LENGTH) {
      res.status(400).json({
        error: `Content must not exceed ${NOTE_CONTENT_MAX_LENGTH} characters`,
      });
      return;
    }

    const option = await prisma.option.findUnique({
      where: { id: optionId },
      include: { element: { include: { script: { select: { productionId: true } } } } },
    });

    if (!option) {
      res.status(404).json({ error: 'Option not found' });
      return;
    }

    const membership = await prisma.productionMember.findUnique({
      where: {
        productionId_userId: {
          productionId: option.element.script.productionId,
          userId: authReq.user.userId,
        },
      },
      include: { department: { select: { name: true } } },
    });

    if (!membership) {
      res.status(403).json({ error: 'You are not a member of this production' });
      return;
    }

    const note = await prisma.note.create({
      data: {
        content,
        userId: authReq.user.userId,
        optionId,
      },
      include: { user: { select: { id: true, name: true } } },
    });

    // Notify other production members
    const productionId = option.element.script.productionId;
    const elementId = option.elementId;
    const link = `/productions/${productionId}/scripts/${option.element.scriptId}/elements/${elementId}`;
    await notifyProductionMembers(
      productionId,
      authReq.user.userId,
      NotificationType.NOTE_ADDED,
      `New note on option for ${option.element.name}`,
      link,
    );

    res.status(201).json({
      note: { ...note, department: membership.department?.name ?? null },
    });
  } catch (error) {
    console.error('Create option note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List notes for an option
notesRouter.get('/api/options/:optionId/notes', requireAuth, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { optionId } = req.params;

    const option = await prisma.option.findUnique({
      where: { id: optionId },
      include: { element: { include: { script: { select: { productionId: true } } } } },
    });

    if (!option) {
      res.status(404).json({ error: 'Option not found' });
      return;
    }

    const membership = await prisma.productionMember.findUnique({
      where: {
        productionId_userId: {
          productionId: option.element.script.productionId,
          userId: authReq.user.userId,
        },
      },
    });

    if (!membership) {
      res.status(403).json({ error: 'You are not a member of this production' });
      return;
    }

    const notes = await prisma.note.findMany({
      where: { optionId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });

    // Enrich notes with department names
    const productionId = option.element.script.productionId;
    const enrichedNotes = await enrichNotesWithDepartment(notes, productionId);

    res.json({ notes: enrichedNotes });
  } catch (error) {
    console.error('List option notes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { notesRouter };
