import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Prisma client
vi.mock('../lib/prisma.js', () => ({
  prisma: {
    notification: {
      create: vi.fn(),
    },
    productionMember: {
      findMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock email service
vi.mock('../services/email-service.js', () => ({
  sendNotificationEmail: vi.fn(),
}));

import { prisma } from '../lib/prisma.js';
import { sendNotificationEmail } from '../services/email-service.js';
import { createNotification, notifyProductionMembers } from '../services/notification-service.js';

const mockedPrisma = vi.mocked(prisma);
const mockedSendNotificationEmail = vi.mocked(sendNotificationEmail);

describe('createNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls sendNotificationEmail after creating a notification', async () => {
    mockedPrisma.notification.create.mockResolvedValue({
      id: 'notif-1',
      userId: 'user-1',
      productionId: 'prod-1',
      type: 'OPTION_APPROVED',
      message: 'Your option was approved',
      link: null,
      read: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    mockedPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
    } as any);

    mockedSendNotificationEmail.mockResolvedValue(undefined);

    await createNotification('user-1', 'prod-1', 'OPTION_APPROVED', 'Your option was approved');

    expect(mockedPrisma.notification.create).toHaveBeenCalled();
    expect(mockedPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { email: true },
    });
    expect(mockedSendNotificationEmail).toHaveBeenCalledWith('user@example.com', {
      type: 'OPTION_APPROVED',
      message: 'Your option was approved',
    });
  });

  it('does not block notification creation if email fails', async () => {
    mockedPrisma.notification.create.mockResolvedValue({
      id: 'notif-1',
      userId: 'user-1',
      productionId: 'prod-1',
      type: 'OPTION_APPROVED',
      message: 'Your option was approved',
      link: null,
      read: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    mockedPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
    } as any);

    mockedSendNotificationEmail.mockRejectedValue(new Error('SMTP connection failed'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Should not throw
    const result = await createNotification(
      'user-1',
      'prod-1',
      'OPTION_APPROVED',
      'Your option was approved',
    );

    expect(result).toBeDefined();
    expect(result.id).toBe('notif-1');
    consoleSpy.mockRestore();
  });

  it('skips email if user has no email address', async () => {
    mockedPrisma.notification.create.mockResolvedValue({
      id: 'notif-1',
      userId: 'user-1',
      productionId: 'prod-1',
      type: 'OPTION_APPROVED',
      message: 'Your option was approved',
      link: null,
      read: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    mockedPrisma.user.findUnique.mockResolvedValue(null);

    await createNotification('user-1', 'prod-1', 'OPTION_APPROVED', 'Your option was approved');

    expect(mockedSendNotificationEmail).not.toHaveBeenCalled();
  });
});
