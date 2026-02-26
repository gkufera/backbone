import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Prisma client
vi.mock('../lib/prisma', () => ({
  prisma: {
    notification: {
      create: vi.fn(),
    },
    productionMember: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from '../lib/prisma';
import {
  createNotification,
  notifyProductionMembers,
  notifyDeciders,
} from '../services/notification-service';

const mockedPrisma = vi.mocked(prisma);

describe('createNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a notification record and returns it', async () => {
    mockedPrisma.notification.create.mockResolvedValue({
      id: 'notif-1',
      userId: 'user-1',
      productionId: 'prod-1',
      type: 'OPTION_APPROVED',
      message: 'Your option was approved',
      link: null,
      read: false,
      emailSentAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const result = await createNotification(
      'user-1',
      'prod-1',
      'OPTION_APPROVED',
      'Your option was approved',
    );

    expect(mockedPrisma.notification.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        productionId: 'prod-1',
        type: 'OPTION_APPROVED',
        message: 'Your option was approved',
        link: null,
      },
    });
    expect(result.id).toBe('notif-1');
  });

  it('does NOT send email — email is handled by batch processor', async () => {
    mockedPrisma.notification.create.mockResolvedValue({
      id: 'notif-1',
      userId: 'user-1',
      productionId: 'prod-1',
      type: 'OPTION_APPROVED',
      message: 'Your option was approved',
      link: null,
      read: false,
      emailSentAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    await createNotification('user-1', 'prod-1', 'OPTION_APPROVED', 'Your option was approved');

    // Should only call prisma.notification.create — no user lookup, no email
    expect(mockedPrisma.notification.create).toHaveBeenCalledTimes(1);
  });

  it('returns notification with emailSentAt=null', async () => {
    mockedPrisma.notification.create.mockResolvedValue({
      id: 'notif-1',
      userId: 'user-1',
      productionId: 'prod-1',
      type: 'OPTION_APPROVED',
      message: 'test',
      link: null,
      read: false,
      emailSentAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const result = await createNotification('user-1', 'prod-1', 'OPTION_APPROVED', 'test');
    expect(result.emailSentAt).toBeNull();
  });
});

describe('notifyProductionMembers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not reject if one notification in the batch fails', async () => {
    mockedPrisma.productionMember.findMany.mockResolvedValue([
      { userId: 'user-1' },
      { userId: 'user-2' },
      { userId: 'user-3' },
    ] as any);

    // First call succeeds, second fails, third succeeds
    mockedPrisma.notification.create
      .mockResolvedValueOnce({ id: 'notif-1' } as any)
      .mockRejectedValueOnce(new Error('DB write failed'))
      .mockResolvedValueOnce({ id: 'notif-3' } as any);

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Should not throw even though one notification failed
    await expect(
      notifyProductionMembers(
        'prod-1',
        'user-actor',
        'SCRIPT_UPLOADED',
        'New script uploaded',
      ),
    ).resolves.not.toThrow();

    // All 3 members should have been attempted (none is excluded since actor is different)
    expect(mockedPrisma.notification.create).toHaveBeenCalledTimes(3);

    consoleSpy.mockRestore();
  });
});

describe('notifyDeciders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('notifies all DECIDER members, excluding the acting user', async () => {
    mockedPrisma.productionMember.findMany.mockResolvedValue([
      { userId: 'user-decider-1' },
      { userId: 'user-decider-2' },
    ] as any);

    mockedPrisma.notification.create.mockResolvedValue({
      id: 'notif-1',
    } as any);

    await notifyDeciders(
      'prod-1',
      'user-actor',
      'TENTATIVE_APPROVAL',
      'A tentative approval was submitted',
      '/productions/prod-1/scripts/s1/elements/e1',
    );

    // Should query for DECIDER members (excluding soft-deleted)
    expect(mockedPrisma.productionMember.findMany).toHaveBeenCalledWith({
      where: { productionId: 'prod-1', role: 'DECIDER', deletedAt: null },
      select: { userId: true },
    });

    // Should create notifications for both deciders (neither is the actor)
    expect(mockedPrisma.notification.create).toHaveBeenCalledTimes(2);
  });

  it('excludes the acting user from decider notifications', async () => {
    mockedPrisma.productionMember.findMany.mockResolvedValue([
      { userId: 'user-actor' }, // same as actor — should be excluded
      { userId: 'user-decider-2' },
    ] as any);

    mockedPrisma.notification.create.mockResolvedValue({
      id: 'notif-1',
    } as any);

    await notifyDeciders(
      'prod-1',
      'user-actor',
      'TENTATIVE_APPROVAL',
      'A tentative approval was submitted',
    );

    // Only user-decider-2 should be notified
    expect(mockedPrisma.notification.create).toHaveBeenCalledTimes(1);
    expect(mockedPrisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-decider-2',
      }),
    });
  });
});
