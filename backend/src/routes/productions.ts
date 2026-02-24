import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import {
  PRODUCTION_TITLE_MAX_LENGTH,
  MEMBER_TITLE_MAX_LENGTH,
  DEFAULT_DEPARTMENTS,
  DEFAULT_DEPARTMENT_COLORS,
} from '@backbone/shared/constants';
import { MemberRole } from '@backbone/shared/types';

const productionsRouter = Router();

// Create a production
productionsRouter.post('/api/productions', requireAuth, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { title, description } = req.body;

    if (!title || !String(title).trim()) {
      res.status(400).json({ error: 'Title is required' });
      return;
    }

    const trimmedTitle = String(title).trim();

    if (trimmedTitle.length > PRODUCTION_TITLE_MAX_LENGTH) {
      res
        .status(400)
        .json({ error: `Title must be ${PRODUCTION_TITLE_MAX_LENGTH} characters or fewer` });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const production = await tx.production.create({
        data: {
          title: trimmedTitle,
          description: description || null,
          createdById: authReq.user.userId,
        },
      });

      const member = await tx.productionMember.create({
        data: {
          productionId: production.id,
          userId: authReq.user.userId,
          role: MemberRole.ADMIN,
        },
      });

      // Seed default departments with colors
      for (const deptName of DEFAULT_DEPARTMENTS) {
        await tx.department.create({
          data: {
            productionId: production.id,
            name: deptName,
            color: DEFAULT_DEPARTMENT_COLORS[deptName] ?? null,
          },
        });
      }

      return { production, member };
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Create production error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List user's productions
productionsRouter.get('/api/productions', requireAuth, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;

    const memberships = await prisma.productionMember.findMany({
      where: { userId: authReq.user.userId },
      include: {
        production: true,
      },
      orderBy: { production: { createdAt: 'desc' } },
    });

    const productions = memberships.map((m) => ({
      ...m.production,
      memberRole: m.role,
    }));

    res.json({ productions });
  } catch (error) {
    console.error('List productions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a single production with members and scripts
productionsRouter.get('/api/productions/:id', requireAuth, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;

    // Check membership
    const membership = await prisma.productionMember.findUnique({
      where: {
        productionId_userId: {
          productionId: id,
          userId: authReq.user.userId,
        },
      },
    });

    if (!membership) {
      // Check if production exists
      const exists = await prisma.production.findUnique({ where: { id } });
      if (!exists) {
        res.status(404).json({ error: 'Production not found' });
        return;
      }
      res.status(403).json({ error: 'You are not a member of this production' });
      return;
    }

    const production = await prisma.production.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
            department: {
              select: { id: true, name: true },
            },
          },
        },
        scripts: {
          orderBy: { createdAt: 'desc' },
        },
        departments: {
          orderBy: { name: 'asc' },
        },
      },
    });

    res.json({ production: { ...production, memberRole: membership.role } });
  } catch (error) {
    console.error('Get production error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add a team member by email
productionsRouter.post('/api/productions/:id/members', requireAuth, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const { email, role, title } = req.body;

    // Check requester is OWNER or ADMIN
    const requesterMembership = await prisma.productionMember.findUnique({
      where: {
        productionId_userId: {
          productionId: id,
          userId: authReq.user.userId,
        },
      },
    });

    if (
      !requesterMembership ||
      ![MemberRole.ADMIN, MemberRole.DECIDER].includes(requesterMembership.role as MemberRole)
    ) {
      res.status(403).json({ error: 'Only ADMIN or DECIDER can add members' });
      return;
    }

    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    const trimmedTitle = title ? String(title).trim() : null;
    const finalTitle = trimmedTitle || null;

    if (finalTitle && finalTitle.length > MEMBER_TITLE_MAX_LENGTH) {
      res
        .status(400)
        .json({ error: `Title must be ${MEMBER_TITLE_MAX_LENGTH} characters or fewer` });
      return;
    }

    // Find user by email
    const userToAdd = await prisma.user.findUnique({ where: { email } });
    if (!userToAdd) {
      res.status(404).json({ error: 'No user found with that email' });
      return;
    }

    // Check if already a member
    const existingMember = await prisma.productionMember.findUnique({
      where: {
        productionId_userId: {
          productionId: id,
          userId: userToAdd.id,
        },
      },
    });

    if (existingMember) {
      res.status(409).json({ error: 'User is already a member of this production' });
      return;
    }

    const member = await prisma.productionMember.create({
      data: {
        productionId: id,
        userId: userToAdd.id,
        role: role || MemberRole.MEMBER,
        title: finalTitle,
      },
    });

    res.status(201).json({ member });
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List production members
productionsRouter.get('/api/productions/:id/members', requireAuth, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;

    // Check requester is a member
    const requesterMembership = await prisma.productionMember.findUnique({
      where: {
        productionId_userId: {
          productionId: id,
          userId: authReq.user.userId,
        },
      },
    });

    if (!requesterMembership) {
      res.status(403).json({ error: 'You are not a member of this production' });
      return;
    }

    const members = await prisma.productionMember.findMany({
      where: { productionId: id },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        department: {
          select: { id: true, name: true },
        },
      },
    });

    res.json({ members });
  } catch (error) {
    console.error('List members error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove a team member
productionsRouter.delete(
  '/api/productions/:id/members/:memberId',
  requireAuth,
  async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { id, memberId } = req.params;

      // Check requester is OWNER or ADMIN
      const requesterMembership = await prisma.productionMember.findUnique({
        where: {
          productionId_userId: {
            productionId: id,
            userId: authReq.user.userId,
          },
        },
      });

      if (
        !requesterMembership ||
        ![MemberRole.ADMIN, MemberRole.DECIDER].includes(requesterMembership.role as MemberRole)
      ) {
        res.status(403).json({ error: 'Only ADMIN or DECIDER can remove members' });
        return;
      }

      // Find the member to remove
      const memberToRemove = await prisma.productionMember.findMany({
        where: { id: memberId, productionId: id },
      });

      if (!memberToRemove.length) {
        res.status(404).json({ error: 'Member not found' });
        return;
      }

      if (memberToRemove[0].role === MemberRole.ADMIN) {
        res.status(403).json({ error: 'Cannot remove an ADMIN of a production' });
        return;
      }

      await prisma.productionMember.delete({ where: { id: memberId } });

      res.json({ message: 'Member removed' });
    } catch (error) {
      console.error('Remove member error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// Change a member's role
productionsRouter.patch(
  '/api/productions/:id/members/:memberId/role',
  requireAuth,
  async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { id, memberId } = req.params;
      const { role } = req.body;

      // Validate role
      if (!role || !Object.values(MemberRole).includes(role)) {
        res.status(400).json({ error: 'Valid role is required (ADMIN, DECIDER, or MEMBER)' });
        return;
      }

      // Check requester is ADMIN or DECIDER
      const requesterMembership = await prisma.productionMember.findUnique({
        where: {
          productionId_userId: {
            productionId: id,
            userId: authReq.user.userId,
          },
        },
      });

      if (
        !requesterMembership ||
        ![MemberRole.ADMIN, MemberRole.DECIDER].includes(requesterMembership.role as MemberRole)
      ) {
        res.status(403).json({ error: 'Only ADMIN or DECIDER can change member roles' });
        return;
      }

      // Find the target member
      const targetMember = await prisma.productionMember.findUnique({
        where: { id: memberId },
      });

      if (!targetMember || targetMember.productionId !== id) {
        res.status(404).json({ error: 'Member not found' });
        return;
      }

      // Self role-change rules: ADMIN↔DECIDER allowed, cannot demote self to MEMBER
      if (targetMember.userId === authReq.user.userId) {
        if (role === MemberRole.MEMBER) {
          res.status(400).json({ error: 'Cannot demote yourself to MEMBER' });
          return;
        }
      } else {
        // DECIDER cannot set another user's role to ADMIN
        if (requesterMembership.role === MemberRole.DECIDER && role === MemberRole.ADMIN) {
          res.status(403).json({ error: 'Only an ADMIN can assign the ADMIN role' });
          return;
        }
      }

      // Protect last privileged user: block any change that could leave 0 ADMIN/DECIDER
      const isTargetPrivileged = [MemberRole.ADMIN, MemberRole.DECIDER].includes(
        targetMember.role as MemberRole,
      );
      if (isTargetPrivileged) {
        const privilegedCount = await prisma.productionMember.count({
          where: {
            productionId: id,
            role: { in: [MemberRole.ADMIN, MemberRole.DECIDER] },
          },
        });
        if (privilegedCount <= 1) {
          res
            .status(400)
            .json({ error: 'Need at least 1 ADMIN or DECIDER in a production' });
          return;
        }
      }

      const updated = await prisma.productionMember.update({
        where: { id: memberId },
        data: { role },
      });

      res.json({ member: updated });
    } catch (error) {
      console.error('Change member role error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// Set a member's department
productionsRouter.patch(
  '/api/productions/:id/members/:memberId/department',
  requireAuth,
  async (req, res) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { id, memberId } = req.params;
      const { departmentId } = req.body;

      // Check requester is ADMIN or DECIDER
      const requesterMembership = await prisma.productionMember.findUnique({
        where: {
          productionId_userId: {
            productionId: id,
            userId: authReq.user.userId,
          },
        },
      });

      if (
        !requesterMembership ||
        ![MemberRole.ADMIN, MemberRole.DECIDER].includes(requesterMembership.role as MemberRole)
      ) {
        res.status(403).json({ error: 'Only ADMIN or DECIDER can set member departments' });
        return;
      }

      // Find the target member
      const targetMember = await prisma.productionMember.findUnique({
        where: { id: memberId },
      });

      if (!targetMember || targetMember.productionId !== id) {
        res.status(404).json({ error: 'Member not found' });
        return;
      }

      // If setting a department, validate it belongs to this production
      if (departmentId !== null && departmentId !== undefined) {
        const department = await prisma.department.findUnique({
          where: { id: departmentId, productionId: id },
        });
        if (!department) {
          res.status(404).json({ error: 'Department not found in this production' });
          return;
        }
      }

      const updated = await prisma.productionMember.update({
        where: { id: memberId },
        data: { departmentId: departmentId ?? null },
      });

      res.json({ member: updated });
    } catch (error) {
      console.error('Set member department error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

export { productionsRouter };
