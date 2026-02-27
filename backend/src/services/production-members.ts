import { prisma } from '../lib/prisma';
import { MemberRole, NotificationType } from '@backbone/shared/types';
import { MEMBER_TITLE_MAX_LENGTH } from '@backbone/shared/constants';
import { createNotification } from './notification-service';

export interface AddMemberParams {
  productionId: string;
  email: string;
  role?: string;
  title?: string | null;
}

export type AddMemberResult =
  | { error: string; status: 400 | 404 | 409 }
  | { member: Awaited<ReturnType<typeof prisma.productionMember.create>> };

/**
 * Add a team member to a production by email.
 * Validates input, checks for duplicate membership, creates member, and sends notification.
 */
export async function addMember(params: AddMemberParams): Promise<AddMemberResult> {
  const { productionId, email, role, title } = params;

  if (!email) {
    return { error: 'Email is required', status: 400 };
  }

  const trimmedTitle = title ? String(title).trim() : null;
  const finalTitle = trimmedTitle || null;

  if (finalTitle && finalTitle.length > MEMBER_TITLE_MAX_LENGTH) {
    return { error: `Title must be ${MEMBER_TITLE_MAX_LENGTH} characters or fewer`, status: 400 };
  }

  // Find user by email
  const userToAdd = await prisma.user.findUnique({ where: { email } });
  if (!userToAdd) {
    return { error: 'No user found with that email', status: 404 };
  }

  // Check if already a member
  const existingMember = await prisma.productionMember.findUnique({
    where: {
      productionId_userId: {
        productionId,
        userId: userToAdd.id,
      },
    },
  });

  if (existingMember) {
    return { error: 'User is already a member of this production', status: 409 };
  }

  const member = await prisma.productionMember.create({
    data: {
      productionId,
      userId: userToAdd.id,
      role: role || MemberRole.MEMBER,
      title: finalTitle,
    },
  });

  // Fire-and-forget: notify the invited user
  const production = await prisma.production.findUnique({
    where: { id: productionId },
    select: { title: true },
  });
  const prodTitle = production?.title ?? 'a production';
  createNotification(
    userToAdd.id,
    productionId,
    NotificationType.MEMBER_INVITED,
    `You have been invited to "${prodTitle}"`,
    `/productions/${productionId}`,
  ).catch((err) => console.error('Failed to send member invite notification:', err));

  return { member };
}

/**
 * Remove a member from a production (soft-delete).
 */
export async function removeMember(
  productionId: string,
  memberId: string,
): Promise<{ error: string; status: 403 | 404 } | { message: string }> {
  const memberToRemove = await prisma.productionMember.findMany({
    where: { id: memberId, productionId },
  });

  if (!memberToRemove.length) {
    return { error: 'Member not found', status: 404 };
  }

  if (memberToRemove[0].role === MemberRole.ADMIN) {
    return { error: 'Cannot remove an ADMIN of a production', status: 403 };
  }

  await prisma.productionMember.update({
    where: { id: memberId },
    data: { deletedAt: new Date() },
  });

  return { message: 'Member removed' };
}

export interface ChangeRoleParams {
  productionId: string;
  memberId: string;
  requesterId: string;
  requesterRole: string;
  newRole: string;
}

export type ChangeRoleResult =
  | { error: string; status: 400 | 403 | 404 }
  | { member: Awaited<ReturnType<typeof prisma.productionMember.update>> };

/**
 * Change a member's role with permission and safety checks.
 */
export async function changeMemberRole(params: ChangeRoleParams): Promise<ChangeRoleResult> {
  const { productionId, memberId, requesterId, requesterRole, newRole } = params;

  // Validate role
  if (!newRole || !Object.values(MemberRole).includes(newRole as MemberRole)) {
    return { error: 'Valid role is required (ADMIN, DECIDER, or MEMBER)', status: 400 };
  }

  // Find the target member
  const targetMember = await prisma.productionMember.findUnique({
    where: { id: memberId },
  });

  if (!targetMember || targetMember.productionId !== productionId) {
    return { error: 'Member not found', status: 404 };
  }

  // Self role-change rules: ADMIN↔DECIDER allowed, cannot demote self to MEMBER
  if (targetMember.userId === requesterId) {
    if (newRole === MemberRole.MEMBER) {
      return { error: 'Cannot demote yourself to MEMBER', status: 400 };
    }
  } else {
    // DECIDER cannot set another user's role to ADMIN
    if (requesterRole === MemberRole.DECIDER && newRole === MemberRole.ADMIN) {
      return { error: 'Only an ADMIN can assign the ADMIN role', status: 403 };
    }
  }

  // Protect last privileged user: block any change that could leave 0 ADMIN/DECIDER
  const isTargetPrivileged = [MemberRole.ADMIN, MemberRole.DECIDER].includes(
    targetMember.role as MemberRole,
  );
  if (isTargetPrivileged) {
    const privilegedCount = await prisma.productionMember.count({
      where: {
        productionId,
        role: { in: [MemberRole.ADMIN, MemberRole.DECIDER] },
        deletedAt: null,
      },
    });
    if (privilegedCount <= 1) {
      const newRoleIsPrivileged = [MemberRole.ADMIN, MemberRole.DECIDER].includes(
        newRole as MemberRole,
      );
      if (!newRoleIsPrivileged) {
        return { error: 'Need at least 1 ADMIN or DECIDER in a production', status: 400 };
      }
    }
  }

  const updated = await prisma.productionMember.update({
    where: { id: memberId },
    data: { role: newRole },
  });

  return { member: updated };
}

/**
 * Set a member's department assignment.
 */
export async function setMemberDepartment(
  productionId: string,
  memberId: string,
  departmentId: string | null | undefined,
): Promise<
  | { error: string; status: 404 }
  | { member: Awaited<ReturnType<typeof prisma.productionMember.update>> }
> {
  // Find the target member
  const targetMember = await prisma.productionMember.findUnique({
    where: { id: memberId },
  });

  if (!targetMember || targetMember.productionId !== productionId) {
    return { error: 'Member not found', status: 404 };
  }

  // If setting a department, validate it belongs to this production
  if (departmentId !== null && departmentId !== undefined) {
    const department = await prisma.department.findUnique({
      where: { id: departmentId, productionId },
    });
    if (!department) {
      return { error: 'Department not found in this production', status: 404 };
    }
  }

  const updated = await prisma.productionMember.update({
    where: { id: memberId },
    data: { departmentId: departmentId ?? null },
  });

  return { member: updated };
}
