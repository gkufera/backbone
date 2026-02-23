import { prisma } from '../lib/prisma.js';

export async function createNotification(
  userId: string,
  productionId: string,
  type: string,
  message: string,
  link?: string,
) {
  return prisma.notification.create({
    data: {
      userId,
      productionId,
      type: type as any,
      message,
      link: link ?? null,
    },
  });
}

export async function notifyProductionMembers(
  productionId: string,
  excludeUserId: string,
  type: string,
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
