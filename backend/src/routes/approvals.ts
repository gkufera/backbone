import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { APPROVAL_NOTE_MAX_LENGTH } from '@backbone/shared/constants';
import { ApprovalDecision } from '@backbone/shared/types';

const approvalsRouter = Router();

// Create an approval for an option
approvalsRouter.post('/api/options/:optionId/approvals', requireAuth, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { optionId } = req.params;
    const { decision, note } = req.body;

    // Validate decision
    if (!decision || !Object.values(ApprovalDecision).includes(decision)) {
      res.status(400).json({ error: 'Valid decision is required (APPROVED, REJECTED, or MAYBE)' });
      return;
    }

    // Validate note length
    if (note && note.length > APPROVAL_NOTE_MAX_LENGTH) {
      res.status(400).json({
        error: `Note must not exceed ${APPROVAL_NOTE_MAX_LENGTH} characters`,
      });
      return;
    }

    // Find option with element→script to get productionId
    const option = await prisma.option.findUnique({
      where: { id: optionId },
      include: { element: { include: { script: { select: { productionId: true } } } } },
    });

    if (!option) {
      res.status(404).json({ error: 'Option not found' });
      return;
    }

    // Validate option and element are not archived
    if (option.status === 'ARCHIVED') {
      res.status(400).json({ error: 'Cannot approve an archived option' });
      return;
    }

    if (option.element.status === 'ARCHIVED') {
      res.status(400).json({ error: 'Cannot approve an option on an archived element' });
      return;
    }

    // Check membership
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

    const approval = await prisma.approval.create({
      data: {
        optionId,
        userId: authReq.user.userId,
        decision,
        note: note || null,
      },
    });

    // Update element workflow state on APPROVED decision
    if (decision === 'APPROVED') {
      await prisma.element.update({
        where: { id: option.elementId },
        data: { workflowState: 'APPROVED' },
      });
    }

    res.status(201).json({ approval });
  } catch (error) {
    console.error('Create approval error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List approvals for an option
approvalsRouter.get('/api/options/:optionId/approvals', requireAuth, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { optionId } = req.params;

    // Find option with element→script to get productionId
    const option = await prisma.option.findUnique({
      where: { id: optionId },
      include: { element: { include: { script: { select: { productionId: true } } } } },
    });

    if (!option) {
      res.status(404).json({ error: 'Option not found' });
      return;
    }

    // Check membership
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

    const approvals = await prisma.approval.findMany({
      where: { optionId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ approvals });
  } catch (error) {
    console.error('List approvals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Director's feed: elements with ready-for-review options
approvalsRouter.get('/api/productions/:productionId/feed', requireAuth, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { productionId } = req.params;

    // Check membership
    const membership = await prisma.productionMember.findUnique({
      where: {
        productionId_userId: {
          productionId,
          userId: authReq.user.userId,
        },
      },
    });

    if (!membership) {
      res.status(403).json({ error: 'You are not a member of this production' });
      return;
    }

    const elements = await prisma.element.findMany({
      where: {
        script: { productionId },
        status: 'ACTIVE',
        options: {
          some: {
            readyForReview: true,
            status: 'ACTIVE',
          },
        },
      },
      include: {
        options: {
          where: {
            readyForReview: true,
            status: 'ACTIVE',
          },
          include: {
            uploadedBy: { select: { id: true, name: true } },
            approvals: {
              include: { user: { select: { id: true, name: true } } },
              orderBy: { createdAt: 'desc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json({ elements });
  } catch (error) {
    console.error('Feed error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { approvalsRouter };
