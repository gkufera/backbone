import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';
import { parsePagination } from '../lib/pagination';
import { MemberRole } from '@backbone/shared/types';
import { DEPARTMENT_NAME_MAX_LENGTH } from '@backbone/shared/constants';

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

    const { take, skip } = parsePagination(req);
    const departments = await prisma.department.findMany({
      where: { productionId: id },
      include: {
        _count: { select: { members: true } },
      },
      orderBy: { name: 'asc' },
      take,
      skip,
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
      ![MemberRole.ADMIN, MemberRole.DECIDER].includes(membership.role as MemberRole)
    ) {
      res.status(403).json({ error: 'Only ADMIN or DECIDER can create departments' });
      return;
    }

    if (!name || !String(name).trim()) {
      res.status(400).json({ error: 'Department name is required' });
      return;
    }

    const trimmedName = String(name).trim();

    if (trimmedName.length > DEPARTMENT_NAME_MAX_LENGTH) {
      res.status(400).json({
        error: `Department name must be ${DEPARTMENT_NAME_MAX_LENGTH} characters or fewer`,
      });
      return;
    }

    const department = await prisma.department.create({
      data: {
        productionId: id,
        name: trimmedName,
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

// Delete a department (OWNER/ADMIN only) — blocked if department has members
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
        ![MemberRole.ADMIN, MemberRole.DECIDER].includes(membership.role as MemberRole)
      ) {
        res.status(403).json({ error: 'Only ADMIN or DECIDER can delete departments' });
        return;
      }

      // Verify department belongs to this production
      const department = await prisma.department.findUnique({
        where: { id: departmentId, productionId: id },
      });
      if (!department) {
        res.status(404).json({ error: 'Department not found in this production' });
        return;
      }

      // Check if department has members
      const memberCount = await prisma.productionMember.count({
        where: { departmentId },
      });
      if (memberCount > 0) {
        res.status(409).json({ error: 'Cannot delete department with members' });
        return;
      }

      await prisma.department.delete({ where: { id: departmentId } });

      res.json({ message: 'Department deleted' });
    } catch (error: any) {
      if (error?.code === 'P2025') {
        res.status(404).json({ error: 'Department not found' });
        return;
      }
      console.error('Delete department error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// Update a department (name, color) — ADMIN/DECIDER only
departmentsRouter.patch(
  '/api/productions/:id/departments/:departmentId',
  requireAuth,
  async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { id, departmentId } = req.params;
      const { name, color } = req.body;

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
        ![MemberRole.ADMIN, MemberRole.DECIDER].includes(membership.role as MemberRole)
      ) {
        res.status(403).json({ error: 'Only ADMIN or DECIDER can update departments' });
        return;
      }

      const department = await prisma.department.findUnique({
        where: { id: departmentId, productionId: id },
      });
      if (!department) {
        res.status(404).json({ error: 'Department not found in this production' });
        return;
      }

      const updateData: { name?: string; color?: string | null } = {};
      if (name !== undefined) {
        const trimmedName = String(name).trim();
        if (!trimmedName) {
          res.status(400).json({ error: 'Department name cannot be empty' });
          return;
        }
        if (trimmedName.length > DEPARTMENT_NAME_MAX_LENGTH) {
          res.status(400).json({
            error: `Department name must be ${DEPARTMENT_NAME_MAX_LENGTH} characters or fewer`,
          });
          return;
        }
        updateData.name = trimmedName;
      }
      if (color !== undefined) {
        if (color !== null && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
          res.status(400).json({ error: 'Color must be a valid hex color (e.g., #FF0000) or null' });
          return;
        }
        updateData.color = color;
      }

      const updated = await prisma.department.update({
        where: { id: departmentId },
        data: updateData,
      });

      res.json({ department: updated });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        res.status(409).json({ error: 'A department with this name already exists' });
        return;
      }
      console.error('Update department error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

export { departmentsRouter };
