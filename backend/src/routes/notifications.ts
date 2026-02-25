import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';
import { parsePagination } from '../lib/pagination';

const notificationsRouter = Router();

// List notifications for the authenticated user in a production
notificationsRouter.get(
  '/api/productions/:productionId/notifications',
  requireAuth,
  async (req, res) => {
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
      const notifications = await prisma.notification.findMany({
        where: {
          userId: authReq.user.userId,
          productionId,
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      });

      res.json({ notifications });
    } catch (error) {
      console.error('List notifications error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// Get unread notification count for a production
notificationsRouter.get(
  '/api/productions/:productionId/notifications/unread-count',
  requireAuth,
  async (req, res) => {
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

      const count = await prisma.notification.count({
        where: {
          userId: authReq.user.userId,
          productionId,
          read: false,
        },
      });

      res.json({ count });
    } catch (error) {
      console.error('Unread count error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// Mark a notification as read
notificationsRouter.patch('/api/notifications/:id/read', requireAuth, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;

    const notification = await prisma.notification.update({
      where: { id, userId: authReq.user.userId },
      data: { read: true },
    });

    res.json({ notification });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { notificationsRouter };
