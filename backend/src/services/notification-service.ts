import { prisma } from '../lib/prisma';
import { MemberRole, NotificationType } from '@backbone/shared/types';

export async function createNotification(
  userId: string,
  productionId: string,
  type: NotificationType,
  message: string,
  link?: string,
) {
  const notification = await prisma.notification.create({
    data: {
      userId,
      productionId,
      type,
      message,
      link: link ?? null,
    },
  });

  return notification;
}

export async function notifyProductionMembers(
  productionId: string,
  excludeUserId: string,
  type: NotificationType,
  message: string,
  link?: string,
) {
  const members = await prisma.productionMember.findMany({
    where: { productionId, deletedAt: null },
    select: { userId: true },
  });

  const notifications = members
    .filter((m) => m.userId !== excludeUserId)
    .map((m) =>
      createNotification(m.userId, productionId, type, message, link),
    );

  return Promise.allSettled(notifications);
}

export async function notifyDeciders(
  productionId: string,
  excludeUserId: string,
  type: NotificationType,
  message: string,
  link?: string,
) {
  const deciders = await prisma.productionMember.findMany({
    where: { productionId, role: MemberRole.DECIDER, deletedAt: null },
    select: { userId: true },
  });

  const notifications = deciders
    .filter((m) => m.userId !== excludeUserId)
    .map((m) =>
      createNotification(m.userId, productionId, type, message, link),
    );

  return Promise.allSettled(notifications);
}
