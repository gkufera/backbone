import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';
import { parsePagination } from '../lib/pagination';
import { APPROVAL_NOTE_MAX_LENGTH } from '@backbone/shared/constants';
import { ApprovalDecision, MemberRole, NotificationType } from '@backbone/shared/types';
import { createNotification, notifyDeciders } from '../services/notification-service';

const DECISION_TO_NOTIFICATION_TYPE: Record<ApprovalDecision, NotificationType> = {
  [ApprovalDecision.APPROVED]: NotificationType.OPTION_APPROVED,
  [ApprovalDecision.REJECTED]: NotificationType.OPTION_REJECTED,
  [ApprovalDecision.MAYBE]: NotificationType.OPTION_MAYBE,
};

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

    // Only DECIDER approvals are official; ADMIN and MEMBER are tentative
    const tentative = membership.role !== MemberRole.DECIDER;

    const approval = await prisma.approval.create({
      data: {
        optionId,
        userId: authReq.user.userId,
        decision,
        note: note || null,
        tentative,
      },
    });

    // Notify option uploader (if different from approver)
    if (option.uploadedById !== authReq.user.userId) {
      const notifType = DECISION_TO_NOTIFICATION_TYPE[decision];
      const elementName = option.element.name ?? 'an element';
      const productionId = option.element.script.productionId;
      const link = `/productions/${productionId}/scripts/${option.element.scriptId}/elements/${option.elementId}`;
      await createNotification(
        option.uploadedById,
        productionId,
        notifType,
        `Your option on ${elementName} was ${decision.toLowerCase()}`,
        link,
      );
    }

    // Notify DECIDERs when a tentative approval is created
    if (tentative) {
      const elementName = option.element.name ?? 'an element';
      const productionId = option.element.script.productionId;
      const link = `/productions/${productionId}/scripts/${option.element.scriptId}/elements/${option.elementId}`;
      await notifyDeciders(
        productionId,
        authReq.user.userId,
        NotificationType.TENTATIVE_APPROVAL,
        `Tentative ${decision.toLowerCase()} on ${elementName} needs your review`,
        link,
      );
    }

    res.status(201).json({ approval });
  } catch (error) {
    console.error('Create approval error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Confirm a tentative approval (DECIDER only)
approvalsRouter.patch('/api/approvals/:approvalId/confirm', requireAuth, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { approvalId } = req.params;

    // Find approval with option→element→script chain
    const approval = await prisma.approval.findUnique({
      where: { id: approvalId },
      include: {
        option: {
          include: {
            element: {
              include: { script: { select: { productionId: true } } },
            },
          },
        },
      },
    });

    if (!approval) {
      res.status(404).json({ error: 'Approval not found' });
      return;
    }

    // Check membership
    const membership = await prisma.productionMember.findUnique({
      where: {
        productionId_userId: {
          productionId: approval.option.element.script.productionId,
          userId: authReq.user.userId,
        },
      },
    });

    if (!membership || membership.role !== MemberRole.DECIDER) {
      res.status(403).json({ error: 'Only a DECIDER can confirm tentative approvals' });
      return;
    }

    if (!approval.tentative) {
      res.status(400).json({ error: 'Approval is already confirmed' });
      return;
    }

    // Confirm: set tentative to false
    const updated = await prisma.approval.update({
      where: { id: approvalId },
      data: { tentative: false },
    });

    // Notify the original approver that their approval was confirmed
    if (approval.userId !== authReq.user.userId) {
      const productionId = approval.option.element.script.productionId;
      const elementName = approval.option.element.name ?? 'an element';
      const link = `/productions/${productionId}/scripts/${approval.option.element.scriptId}/elements/${approval.option.elementId}`;
      await createNotification(
        approval.userId,
        productionId,
        NotificationType.TENTATIVE_CONFIRMED,
        `Your tentative ${approval.decision.toLowerCase()} on ${elementName} was confirmed`,
        link,
      );
    }

    res.json({ approval: updated });
  } catch (error) {
    console.error('Confirm approval error:', error);
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

    const { take, skip } = parsePagination(req);
    const approvals = await prisma.approval.findMany({
      where: { optionId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
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

    const { take, skip } = parsePagination(req);
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
            assets: { orderBy: { sortOrder: 'asc' } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { name: 'asc' },
      take,
      skip,
    });

    res.json({ elements });
  } catch (error) {
    console.error('Feed error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { approvalsRouter };
