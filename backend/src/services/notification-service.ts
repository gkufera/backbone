import { prisma } from '../lib/prisma.js';
import { sendNotificationEmail } from './email-service.js';
import { NotificationType } from '@backbone/shared/types';

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
      select: { email: true },
    });
    if (user?.email) {
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

  return Promise.all(notifications);
}
