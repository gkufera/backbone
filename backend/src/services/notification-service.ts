import { prisma } from '../lib/prisma.js';
import { sendNotificationEmail } from './email-service.js';
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

  // Send email notification (non-blocking)
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, emailNotificationsEnabled: true },
    });
    if (user?.email && user.emailNotificationsEnabled !== false) {
      await sendNotificationEmail(user.email, { type, message });
    }
  } catch (error) {
    console.error('Failed to send notification email:', error);
  }

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
    where: { productionId },
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
    where: { productionId, role: MemberRole.DECIDER },
    select: { userId: true },
  });

  const notifications = deciders
    .filter((m) => m.userId !== excludeUserId)
    .map((m) =>
      createNotification(m.userId, productionId, type, message, link),
    );

  return Promise.allSettled(notifications);
}
