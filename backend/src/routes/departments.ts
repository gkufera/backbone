import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { MemberRole } from '@backbone/shared/types';

const departmentsRouter = Router();

// List departments for a production
departmentsRouter.get('/api/productions/:id/departments', requireAuth, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;

    const membership = await prisma.productionMember.findUnique({
      where: {
        productionId_userId: {
          productionId: id,
          userId: authReq.user.userId,
        },
      },
    });

    if (!membership) {
      const production = await prisma.production.findUnique({ where: { id } });
      if (!production) {
        res.status(404).json({ error: 'Production not found' });
        return;
      }
      res.status(403).json({ error: 'You are not a member of this production' });
      return;
    }

    const departments = await prisma.department.findMany({
      where: { productionId: id },
      include: {
        members: {
          include: {
            productionMember: {
              include: {
                user: {
                  select: { id: true, name: true, email: true },
                },
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json({ departments });
  } catch (error) {
    console.error('List departments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a custom department (OWNER/ADMIN only)
departmentsRouter.post('/api/productions/:id/departments', requireAuth, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const { name } = req.body;

    const membership = await prisma.productionMember.findUnique({
      where: {
        productionId_userId: {
          productionId: id,
          userId: authReq.user.userId,
        },
      },
    });

    if (
      !membership ||
      ![MemberRole.OWNER, MemberRole.ADMIN].includes(membership.role as MemberRole)
    ) {
      res.status(403).json({ error: 'Only OWNER or ADMIN can create departments' });
      return;
    }

    if (!name || !String(name).trim()) {
      res.status(400).json({ error: 'Department name is required' });
      return;
    }

    const department = await prisma.department.create({
      data: {
        productionId: id,
        name: String(name).trim(),
      },
    });

    res.status(201).json({ department });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      res.status(409).json({ error: 'A department with this name already exists' });
      return;
    }
    console.error('Create department error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a department and its member assignments (OWNER/ADMIN only)
departmentsRouter.delete(
  '/api/productions/:id/departments/:departmentId',
  requireAuth,
  async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { id, departmentId } = req.params;

      const membership = await prisma.productionMember.findUnique({
        where: {
          productionId_userId: {
            productionId: id,
            userId: authReq.user.userId,
          },
        },
      });

      if (
        !membership ||
        ![MemberRole.OWNER, MemberRole.ADMIN].includes(membership.role as MemberRole)
      ) {
        res.status(403).json({ error: 'Only OWNER or ADMIN can delete departments' });
        return;
      }

      await prisma.$transaction(async (tx) => {
        await tx.departmentMember.deleteMany({ where: { departmentId } });
        await tx.department.delete({ where: { id: departmentId } });
      });

      res.json({ message: 'Department deleted' });
    } catch (error) {
      console.error('Delete department error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// Add a production member to a department (any member can do this)
departmentsRouter.post(
  '/api/productions/:id/departments/:departmentId/members',
  requireAuth,
  async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { id, departmentId } = req.params;
      const { productionMemberId } = req.body;

      const membership = await prisma.productionMember.findUnique({
        where: {
          productionId_userId: {
            productionId: id,
            userId: authReq.user.userId,
          },
        },
      });

      if (!membership) {
        const production = await prisma.production.findUnique({ where: { id } });
        if (!production) {
          res.status(404).json({ error: 'Production not found' });
          return;
        }
        res.status(403).json({ error: 'You are not a member of this production' });
        return;
      }

      if (!productionMemberId) {
        res.status(400).json({ error: 'productionMemberId is required' });
        return;
      }

      const departmentMember = await prisma.departmentMember.create({
        data: {
          departmentId,
          productionMemberId,
        },
      });

      res.status(201).json({ departmentMember });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        res.status(409).json({ error: 'Member is already in this department' });
        return;
      }
      console.error('Add department member error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// Remove a member from a department (any member can do this)
departmentsRouter.delete(
  '/api/productions/:id/departments/:departmentId/members/:memberId',
  requireAuth,
  async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { id, memberId } = req.params;

      const membership = await prisma.productionMember.findUnique({
        where: {
          productionId_userId: {
            productionId: id,
            userId: authReq.user.userId,
          },
        },
      });

      if (!membership) {
        const production = await prisma.production.findUnique({ where: { id } });
        if (!production) {
          res.status(404).json({ error: 'Production not found' });
          return;
        }
        res.status(403).json({ error: 'You are not a member of this production' });
        return;
      }

      await prisma.departmentMember.delete({ where: { id: memberId } });

      res.json({ message: 'Member removed from department' });
    } catch (error) {
      console.error('Remove department member error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

export { departmentsRouter };
