import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';
import { ScopeFilter } from '@backbone/shared/types';

const notificationPreferencesRouter = Router();

const DEFAULTS = {
  optionEmails: true,
  noteEmails: true,
  approvalEmails: true,
  scriptEmails: true,
  memberEmails: true,
  scopeFilter: ScopeFilter.ALL,
};

const BOOLEAN_FIELDS = [
  'optionEmails',
  'noteEmails',
  'approvalEmails',
  'scriptEmails',
  'memberEmails',
] as const;

notificationPreferencesRouter.get(
  '/api/productions/:id/notification-preferences',
  requireAuth,
  async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { id: productionId } = req.params;

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

      const prefs = await prisma.notificationPreference.findUnique({
        where: {
          userId_productionId: {
            userId: authReq.user.userId,
            productionId,
          },
        },
      });

      if (!prefs) {
        res.json({ preferences: DEFAULTS });
        return;
      }

      res.json({
        preferences: {
          optionEmails: prefs.optionEmails,
          noteEmails: prefs.noteEmails,
          approvalEmails: prefs.approvalEmails,
          scriptEmails: prefs.scriptEmails,
          memberEmails: prefs.memberEmails,
          scopeFilter: prefs.scopeFilter,
        },
      });
    } catch (error) {
      console.error('Get notification preferences error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

notificationPreferencesRouter.patch(
  '/api/productions/:id/notification-preferences',
  requireAuth,
  async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { id: productionId } = req.params;

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

      // Validate scopeFilter if provided
      if (
        req.body.scopeFilter !== undefined &&
        !Object.values(ScopeFilter).includes(req.body.scopeFilter)
      ) {
        res.status(400).json({ error: 'Invalid scopeFilter value' });
        return;
      }

      // Build update data from allowed fields
      const updateData: Record<string, boolean | string> = {};
      for (const field of BOOLEAN_FIELDS) {
        if (typeof req.body[field] === 'boolean') {
          updateData[field] = req.body[field];
        }
      }
      if (req.body.scopeFilter !== undefined) {
        updateData.scopeFilter = req.body.scopeFilter;
      }

      const prefs = await prisma.notificationPreference.upsert({
        where: {
          userId_productionId: {
            userId: authReq.user.userId,
            productionId,
          },
        },
        create: {
          userId: authReq.user.userId,
          productionId,
          ...updateData,
        },
        update: updateData,
      });

      res.json({
        preferences: {
          optionEmails: prefs.optionEmails,
          noteEmails: prefs.noteEmails,
          approvalEmails: prefs.approvalEmails,
          scriptEmails: prefs.scriptEmails,
          memberEmails: prefs.memberEmails,
          scopeFilter: prefs.scopeFilter,
        },
      });
    } catch (error) {
      console.error('Update notification preferences error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

export { notificationPreferencesRouter };
