import { prisma } from '../lib/prisma';
import { sendDigestEmail } from './email-service';
import { NotificationType } from '@backbone/shared/types';
import {
  NOTIFICATION_TYPE_CATEGORY,
  CATEGORY_TO_PREF_FIELD,
} from '@backbone/shared/constants';

let intervalHandle: ReturnType<typeof setInterval> | null = null;

export async function processEmailBatch(): Promise<void> {
  const pending = await prisma.notification.findMany({
    where: { emailSentAt: null },
    include: {
      user: { select: { email: true, emailNotificationsEnabled: true } },
      production: { select: { title: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  if (pending.length === 0) return;

  // Group by userId+productionId
  const groups = new Map<
    string,
    {
      userId: string;
      productionId: string;
      email: string;
      productionTitle: string;
      emailNotificationsEnabled: boolean;
      notifications: Array<{
        id: string;
        type: string;
        message: string;
        link: string | null;
      }>;
    }
  >();

  for (const n of pending) {
    const key = `${n.userId}:${n.productionId}`;
    if (!groups.has(key)) {
      groups.set(key, {
        userId: n.userId,
        productionId: n.productionId,
        email: n.user.email,
        productionTitle: n.production.title,
        emailNotificationsEnabled: n.user.emailNotificationsEnabled,
        notifications: [],
      });
    }
    groups.get(key)!.notifications.push({
      id: n.id,
      type: n.type,
      message: n.message,
      link: n.link,
    });
  }

  const allIds = pending.map((n) => n.id);

  for (const group of groups.values()) {
    try {
      // Skip if global email notifications disabled
      if (!group.emailNotificationsEnabled) continue;

      // Check per-production preferences
      const prefs = await prisma.notificationPreference.findUnique({
        where: {
          userId_productionId: {
            userId: group.userId,
            productionId: group.productionId,
          },
        },
      });

      // Filter notifications by preference categories
      const eligible = group.notifications.filter((n) => {
        const category = NOTIFICATION_TYPE_CATEGORY[n.type as NotificationType];
        if (!category) return true; // unknown type — include by default
        const prefField = CATEGORY_TO_PREF_FIELD[category];
        if (!prefs) return true; // no prefs record — all defaults to true
        return (prefs as Record<string, unknown>)[prefField] !== false;
      });

      if (eligible.length === 0) continue;

      await sendDigestEmail(
        group.email,
        group.productionTitle,
        eligible.map((n) => ({ message: n.message, link: n.link })),
      );
    } catch (error) {
      console.error(
        `Failed to send digest email to ${group.email}:`,
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }

  // Mark all notifications as processed regardless of email success
  await prisma.notification.updateMany({
    where: { id: { in: allIds } },
    data: { emailSentAt: new Date() },
  });
}

export function startEmailBatchProcessor(intervalMs = 60_000): void {
  intervalHandle = setInterval(() => {
    processEmailBatch().catch((error) => {
      console.error(
        'Email batch processor error:',
        error instanceof Error ? error.message : 'Unknown error',
      );
    });
  }, intervalMs);
}

export function stopEmailBatchProcessor(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}
