import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { MemberRole } from '@backbone/shared/types';

const directorNotesRouter = Router();

// List non-deleted notes for a script (any member)
directorNotesRouter.get(
  '/api/scripts/:scriptId/director-notes',
  requireAuth,
  async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { scriptId } = req.params;

      const script = await prisma.script.findUnique({
        where: { id: scriptId },
        select: { id: true, productionId: true },
      });

      if (!script) {
        res.status(404).json({ error: 'Script not found' });
        return;
      }

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

      const notes = await prisma.directorNote.findMany({
        where: { scriptId, deletedAt: null },
        orderBy: [{ sceneNumber: 'asc' }, { createdAt: 'asc' }],
        include: {
          createdBy: { select: { id: true, name: true } },
        },
      });

      res.json({ notes });
    } catch (error) {
      console.error('List director notes error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// Create a director note (DECIDER only)
directorNotesRouter.post(
  '/api/scripts/:scriptId/director-notes',
  requireAuth,
  async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { scriptId } = req.params;
      const { sceneNumber, note } = req.body;

      const script = await prisma.script.findUnique({
        where: { id: scriptId },
        select: { id: true, productionId: true },
      });

      if (!script) {
        res.status(404).json({ error: 'Script not found' });
        return;
      }

      const membership = await prisma.productionMember.findUnique({
        where: {
          productionId_userId: {
            productionId: script.productionId,
            userId: authReq.user.userId,
          },
        },
      });

      if (!membership || membership.role !== MemberRole.DECIDER) {
        res.status(403).json({ error: 'Only DECIDER can create director notes' });
        return;
      }

      if (sceneNumber === undefined || sceneNumber === null || !note?.trim()) {
        res.status(400).json({ error: 'sceneNumber and note are required' });
        return;
      }

      const directorNote = await prisma.directorNote.create({
        data: {
          scriptId,
          sceneNumber: Number(sceneNumber),
          note: String(note).trim(),
          createdById: authReq.user.userId,
        },
      });

      res.status(201).json({ note: directorNote });
    } catch (error) {
      console.error('Create director note error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// Update a director note (author only)
directorNotesRouter.patch('/api/director-notes/:noteId', requireAuth, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { noteId } = req.params;
    const { note } = req.body;

    const existingNote = await prisma.directorNote.findUnique({
      where: { id: noteId },
      include: { script: { select: { productionId: true } } },
    });

    if (!existingNote || existingNote.deletedAt) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }

    // Verify membership
    const membership = await prisma.productionMember.findUnique({
      where: {
        productionId_userId: {
          productionId: existingNote.script.productionId,
          userId: authReq.user.userId,
        },
      },
    });

    if (!membership) {
      res.status(403).json({ error: 'You are not a member of this production' });
      return;
    }

    // Only author can edit
    if (existingNote.createdById !== authReq.user.userId) {
      res.status(403).json({ error: 'Only the author can edit this note' });
      return;
    }

    if (!note?.trim()) {
      res.status(400).json({ error: 'note is required' });
      return;
    }

    const updated = await prisma.directorNote.update({
      where: { id: noteId },
      data: { note: String(note).trim() },
    });

    res.json({ note: updated });
  } catch (error) {
    console.error('Update director note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Soft-delete a director note (author only)
directorNotesRouter.delete('/api/director-notes/:noteId', requireAuth, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { noteId } = req.params;

    const existingNote = await prisma.directorNote.findUnique({
      where: { id: noteId },
      include: { script: { select: { productionId: true } } },
    });

    if (!existingNote || existingNote.deletedAt) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }

    // Verify membership
    const membership = await prisma.productionMember.findUnique({
      where: {
        productionId_userId: {
          productionId: existingNote.script.productionId,
          userId: authReq.user.userId,
        },
      },
    });

    if (!membership) {
      res.status(403).json({ error: 'You are not a member of this production' });
      return;
    }

    // Only author can delete
    if (existingNote.createdById !== authReq.user.userId) {
      res.status(403).json({ error: 'Only the author can delete this note' });
      return;
    }

    await prisma.directorNote.update({
      where: { id: noteId },
      data: { deletedAt: new Date() },
    });

    res.json({ message: 'Note deleted' });
  } catch (error) {
    console.error('Delete director note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { directorNotesRouter };
