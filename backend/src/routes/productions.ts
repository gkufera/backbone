import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';
import { parsePagination } from '../lib/pagination';
import {
  PRODUCTION_TITLE_MAX_LENGTH,
  DEFAULT_DEPARTMENTS,
  DEFAULT_DEPARTMENT_COLORS,
  STUDIO_NAME_MAX_LENGTH,
  CONTACT_NAME_MAX_LENGTH,
} from '@backbone/shared/constants';
import { MemberRole, ElementStatus, ElementWorkflowState } from '@backbone/shared/types';
import { requireActiveProduction } from '../lib/require-active-production';
import { createTokenLimiter } from '../middleware/rate-limit';
import {
  approveProductionByToken,
  generateApprovalToken,
  sendApprovalEmails,
  sendApprovalConfirmationEmails,
} from '../services/production-approval';
import {
  addMember,
  removeMember,
  changeMemberRole,
  setMemberDepartment,
} from '../services/production-members';

const productionsRouter = Router();

// Create a production (request — starts in PENDING status)
productionsRouter.post('/api/productions', requireAuth, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { title, description, studioName, contactName, contactEmail, budget } = req.body;

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

    if (!studioName || !String(studioName).trim()) {
      res.status(400).json({ error: 'Studio name is required' });
      return;
    }

    const trimmedStudioName = String(studioName).trim();
    if (trimmedStudioName.length > STUDIO_NAME_MAX_LENGTH) {
      res.status(400).json({ error: `Studio name must be ${STUDIO_NAME_MAX_LENGTH} characters or fewer` });
      return;
    }

    if (!contactName || !String(contactName).trim()) {
      res.status(400).json({ error: 'Contact name is required' });
      return;
    }

    const trimmedContactName = String(contactName).trim();
    if (trimmedContactName.length > CONTACT_NAME_MAX_LENGTH) {
      res.status(400).json({ error: `Contact name must be ${CONTACT_NAME_MAX_LENGTH} characters or fewer` });
      return;
    }

    if (!contactEmail || !String(contactEmail).trim()) {
      res.status(400).json({ error: 'Contact email is required' });
      return;
    }

    const trimmedContactEmail = String(contactEmail).trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedContactEmail)) {
      res.status(400).json({ error: 'Please provide a valid email address' });
      return;
    }

    const trimmedBudget = budget ? String(budget).trim() || null : null;

    const result = await prisma.$transaction(async (tx) => {
      const production = await tx.production.create({
        data: {
          title: trimmedTitle,
          description: description || null,
          status: 'PENDING',
          studioName: trimmedStudioName,
          budget: trimmedBudget,
          contactName: trimmedContactName,
          contactEmail: trimmedContactEmail,
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

      // Auto-assign creator to Production Office department
      const prodOfficeDept = await tx.department.findFirst({
        where: { productionId: production.id, name: 'Production Office' },
      });
      if (prodOfficeDept) {
        await tx.productionMember.update({
          where: { id: member.id },
          data: { departmentId: prodOfficeDept.id },
        });
      }

      const approvalToken = await generateApprovalToken(tx, production.id);

      return { production, member, approvalToken };
    });

    // Fire-and-forget: send approval emails
    sendApprovalEmails(
      result.production.title,
      trimmedStudioName,
      trimmedContactName,
      trimmedContactEmail,
      trimmedBudget,
      result.approvalToken,
    );

    res.status(201).json({ production: result.production, member: result.member });
  } catch (error) {
    console.error('Create production error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Approve a production (public token endpoint — no auth required)
// Rate limit token endpoint to prevent brute-force token guessing (5 req/min per IP)
const approveMiddleware =
  process.env.NODE_ENV !== 'test' ? [createTokenLimiter()] : [];
productionsRouter.post('/api/productions/approve', ...approveMiddleware, async (req, res) => {
  try {
    const { token } = req.body;

    if (!token || !String(token).trim()) {
      res.status(400).json({ error: 'Token is required' });
      return;
    }

    const result = await approveProductionByToken(String(token));

    if ('error' in result) {
      res.status(result.status).json({ error: result.error });
      return;
    }

    sendApprovalConfirmationEmails(result.productionTitle, result.contactEmail);

    res.json({ message: 'Production approved successfully', productionTitle: result.productionTitle });
  } catch (error) {
    console.error('Approve production error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List user's productions
productionsRouter.get('/api/productions', requireAuth, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;

    const { take, skip } = parsePagination(req);
    const memberships = await prisma.productionMember.findMany({
      where: { userId: authReq.user.userId, deletedAt: null },
      include: {
        production: true,
      },
      orderBy: { production: { createdAt: 'desc' } },
      take,
      skip,
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
          where: { deletedAt: null },
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
          where: { deletedAt: null },
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

// Update a production (rename)
productionsRouter.patch('/api/productions/:id', requireAuth, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const { title } = req.body;

    // Check membership and role
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
      res.status(403).json({ error: 'Only ADMIN or DECIDER can update a production' });
      return;
    }

    // Block mutations on PENDING productions
    if (!(await requireActiveProduction(id, res))) return;

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

    const updated = await prisma.production.update({
      where: { id },
      data: { title: trimmedTitle },
    });

    res.json({ production: updated });
  } catch (error) {
    console.error('Update production error:', error);
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

    // Block mutations on PENDING productions
    if (!(await requireActiveProduction(id, res))) return;

    const result = await addMember({ productionId: id, email, role, title });

    if ('error' in result) {
      res.status(result.status).json({ error: result.error });
      return;
    }

    res.status(201).json({ member: result.member });
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

    const { take, skip } = parsePagination(req);
    const members = await prisma.productionMember.findMany({
      where: { productionId: id, deletedAt: null },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        department: {
          select: { id: true, name: true },
        },
      },
      take,
      skip,
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

      // Block mutations on PENDING productions
      if (!(await requireActiveProduction(id, res))) return;

      const result = await removeMember(id, memberId);

      if ('error' in result) {
        res.status(result.status).json({ error: result.error });
        return;
      }

      res.json(result);
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

      // Block mutations on PENDING productions
      if (!(await requireActiveProduction(id, res))) return;

      const result = await changeMemberRole({
        productionId: id,
        memberId,
        requesterId: authReq.user.userId,
        requesterRole: requesterMembership.role,
        newRole: role,
      });

      if ('error' in result) {
        res.status(result.status).json({ error: result.error });
        return;
      }

      res.json({ member: result.member });
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

      // Block mutations on PENDING productions
      if (!(await requireActiveProduction(id, res))) return;

      const result = await setMemberDepartment(id, memberId, departmentId);

      if ('error' in result) {
        res.status(result.status).json({ error: result.error });
        return;
      }

      res.json({ member: result.member });
    } catch (error) {
      console.error('Set member department error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// Get element workflow state stats for a production
productionsRouter.get('/api/productions/:id/element-stats', requireAuth, async (req, res) => {
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
      res.status(403).json({ error: 'You are not a member of this production' });
      return;
    }

    const scripts = await prisma.script.findMany({
      where: { productionId: id },
      select: { id: true },
    });

    const scriptIds = scripts.map((s) => s.id);

    const groups = await prisma.element.groupBy({
      by: ['workflowState'],
      where: {
        scriptId: { in: scriptIds },
        status: ElementStatus.ACTIVE,
        deletedAt: null,
      },
      _count: { _all: true },
    });

    let pending = 0;
    let outstanding = 0;
    let approved = 0;

    for (const g of groups) {
      if (g.workflowState === ElementWorkflowState.PENDING) pending = g._count._all;
      else if (g.workflowState === ElementWorkflowState.OUTSTANDING) outstanding = g._count._all;
      else if (g.workflowState === ElementWorkflowState.APPROVED) approved = g._count._all;
    }

    res.json({
      pending,
      outstanding,
      approved,
      total: pending + outstanding + approved,
    });
  } catch (error) {
    console.error('Get element stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { productionsRouter };
