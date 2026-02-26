import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock Prisma client
vi.mock('../lib/prisma', () => ({
  prisma: {
    notification: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    notificationPreference: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock email service
vi.mock('../services/email-service', () => ({
  sendDigestEmail: vi.fn(),
}));

import { prisma } from '../lib/prisma';
import { sendDigestEmail } from '../services/email-service';
import {
  processEmailBatch,
  startEmailBatchProcessor,
  stopEmailBatchProcessor,
  _resetProcessingFlag,
} from '../services/email-batch-processor';

const mockedPrisma = vi.mocked(prisma);
const mockedSendDigestEmail = vi.mocked(sendDigestEmail);

describe('processEmailBatch', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    _resetProcessingFlag();
  });

  it('sends nothing when no pending notifications', async () => {
    mockedPrisma.notification.findMany.mockResolvedValue([]);

    await processEmailBatch();

    expect(mockedSendDigestEmail).not.toHaveBeenCalled();
    expect(mockedPrisma.notification.updateMany).not.toHaveBeenCalled();
  });

  it('groups notifications by userId+productionId and sends one digest per group', async () => {
    mockedPrisma.notification.findMany.mockResolvedValue([
      {
        id: 'n1',
        userId: 'user-1',
        productionId: 'prod-1',
        type: 'OPTION_READY',
        message: 'Option ready on JOHN',
        link: '/productions/prod-1/scripts/s1/elements/e1',
        user: { email: 'user1@example.com', emailNotificationsEnabled: true },
        production: { title: 'Film A' },
      },
      {
        id: 'n2',
        userId: 'user-1',
        productionId: 'prod-1',
        type: 'NOTE_ADDED',
        message: 'Note on LOCATION A',
        link: null,
        user: { email: 'user1@example.com', emailNotificationsEnabled: true },
        production: { title: 'Film A' },
      },
      {
        id: 'n3',
        userId: 'user-2',
        productionId: 'prod-1',
        type: 'SCRIPT_UPLOADED',
        message: 'New script uploaded',
        link: '/productions/prod-1/scripts/s2',
        user: { email: 'user2@example.com', emailNotificationsEnabled: true },
        production: { title: 'Film A' },
      },
    ] as any);

    mockedPrisma.notificationPreference.findUnique.mockResolvedValue(null);
    mockedSendDigestEmail.mockResolvedValue(undefined);
    mockedPrisma.notification.updateMany.mockResolvedValue({ count: 3 } as any);

    await processEmailBatch();

    // Two groups: user-1+prod-1, user-2+prod-1
    expect(mockedSendDigestEmail).toHaveBeenCalledTimes(2);
    expect(mockedSendDigestEmail).toHaveBeenCalledWith(
      'user1@example.com',
      'Film A',
      expect.arrayContaining([
        expect.objectContaining({ message: 'Option ready on JOHN' }),
        expect.objectContaining({ message: 'Note on LOCATION A' }),
      ]),
    );
    expect(mockedSendDigestEmail).toHaveBeenCalledWith(
      'user2@example.com',
      'Film A',
      [expect.objectContaining({ message: 'New script uploaded' })],
    );
  });

  it('marks all processed notifications with emailSentAt timestamp', async () => {
    mockedPrisma.notification.findMany.mockResolvedValue([
      {
        id: 'n1',
        userId: 'user-1',
        productionId: 'prod-1',
        type: 'OPTION_READY',
        message: 'test',
        link: null,
        user: { email: 'user1@example.com', emailNotificationsEnabled: true },
        production: { title: 'Film A' },
      },
    ] as any);

    mockedPrisma.notificationPreference.findUnique.mockResolvedValue(null);
    mockedSendDigestEmail.mockResolvedValue(undefined);
    mockedPrisma.notification.updateMany.mockResolvedValue({ count: 1 } as any);

    await processEmailBatch();

    expect(mockedPrisma.notification.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['n1'] } },
      data: { emailSentAt: expect.any(Date) },
    });
  });

  it('skips user when emailNotificationsEnabled is false', async () => {
    mockedPrisma.notification.findMany.mockResolvedValue([
      {
        id: 'n1',
        userId: 'user-1',
        productionId: 'prod-1',
        type: 'OPTION_READY',
        message: 'test',
        link: null,
        user: { email: 'user1@example.com', emailNotificationsEnabled: false },
        production: { title: 'Film A' },
      },
    ] as any);

    mockedPrisma.notification.updateMany.mockResolvedValue({ count: 1 } as any);

    await processEmailBatch();

    // No email sent but notification still marked as processed
    expect(mockedSendDigestEmail).not.toHaveBeenCalled();
    expect(mockedPrisma.notification.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['n1'] } },
      data: { emailSentAt: expect.any(Date) },
    });
  });

  it('skips notifications in disabled preference categories', async () => {
    mockedPrisma.notification.findMany.mockResolvedValue([
      {
        id: 'n1',
        userId: 'user-1',
        productionId: 'prod-1',
        type: 'OPTION_READY',
        message: 'Option ready',
        link: null,
        user: { email: 'user1@example.com', emailNotificationsEnabled: true },
        production: { title: 'Film A' },
      },
      {
        id: 'n2',
        userId: 'user-1',
        productionId: 'prod-1',
        type: 'NOTE_ADDED',
        message: 'Note added',
        link: null,
        user: { email: 'user1@example.com', emailNotificationsEnabled: true },
        production: { title: 'Film A' },
      },
    ] as any);

    // User disabled option emails but kept note emails
    mockedPrisma.notificationPreference.findUnique.mockResolvedValue({
      optionEmails: false,
      noteEmails: true,
      approvalEmails: true,
      scriptEmails: true,
      memberEmails: true,
    } as any);

    mockedSendDigestEmail.mockResolvedValue(undefined);
    mockedPrisma.notification.updateMany.mockResolvedValue({ count: 2 } as any);

    await processEmailBatch();

    // Only note notification should be in the digest
    expect(mockedSendDigestEmail).toHaveBeenCalledWith(
      'user1@example.com',
      'Film A',
      [expect.objectContaining({ message: 'Note added' })],
    );

    // Both notifications still marked as processed
    expect(mockedPrisma.notification.updateMany).toHaveBeenCalledWith({
      where: { id: { in: expect.arrayContaining(['n1', 'n2']) } },
      data: { emailSentAt: expect.any(Date) },
    });
  });

  it('sends email for all categories when no NotificationPreference record exists (defaults)', async () => {
    mockedPrisma.notification.findMany.mockResolvedValue([
      {
        id: 'n1',
        userId: 'user-1',
        productionId: 'prod-1',
        type: 'OPTION_READY',
        message: 'Option ready',
        link: null,
        user: { email: 'user1@example.com', emailNotificationsEnabled: true },
        production: { title: 'Film A' },
      },
    ] as any);

    // No preference record — all defaults to true
    mockedPrisma.notificationPreference.findUnique.mockResolvedValue(null);
    mockedSendDigestEmail.mockResolvedValue(undefined);
    mockedPrisma.notification.updateMany.mockResolvedValue({ count: 1 } as any);

    await processEmailBatch();

    expect(mockedSendDigestEmail).toHaveBeenCalledTimes(1);
    expect(mockedSendDigestEmail).toHaveBeenCalledWith(
      'user1@example.com',
      'Film A',
      [expect.objectContaining({ message: 'Option ready' })],
    );
  });

  it('does not crash if sendDigestEmail fails for one user', async () => {
    mockedPrisma.notification.findMany.mockResolvedValue([
      {
        id: 'n1',
        userId: 'user-1',
        productionId: 'prod-1',
        type: 'OPTION_READY',
        message: 'test',
        link: null,
        user: { email: 'user1@example.com', emailNotificationsEnabled: true },
        production: { title: 'Film A' },
      },
      {
        id: 'n2',
        userId: 'user-2',
        productionId: 'prod-1',
        type: 'OPTION_READY',
        message: 'test',
        link: null,
        user: { email: 'user2@example.com', emailNotificationsEnabled: true },
        production: { title: 'Film A' },
      },
    ] as any);

    mockedPrisma.notificationPreference.findUnique.mockResolvedValue(null);
    // First user's email fails, second succeeds
    mockedSendDigestEmail
      .mockRejectedValueOnce(new Error('Resend error'))
      .mockResolvedValueOnce(undefined);
    mockedPrisma.notification.updateMany.mockResolvedValue({ count: 2 } as any);

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Should not throw
    await expect(processEmailBatch()).resolves.not.toThrow();

    // Both notifications still marked as processed
    expect(mockedPrisma.notification.updateMany).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe('processEmailBatch concurrency', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    _resetProcessingFlag();
  });

  it('skips if already processing', async () => {
    // First call will hang until we resolve it
    let resolveFirst!: () => void;
    mockedPrisma.notification.findMany.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFirst = () => resolve([]);
        }),
    );

    const first = processEmailBatch();
    const second = processEmailBatch();

    // Resolve the first call
    resolveFirst();
    await first;
    await second;

    // findMany should only have been called once — second call was skipped
    expect(mockedPrisma.notification.findMany).toHaveBeenCalledTimes(1);
  });

  it('resets processing flag after error so next call proceeds', async () => {
    mockedPrisma.notification.findMany.mockRejectedValueOnce(new Error('DB error'));

    await expect(processEmailBatch()).rejects.toThrow('DB error');

    // Next call should proceed normally
    mockedPrisma.notification.findMany.mockResolvedValueOnce([]);
    await processEmailBatch();

    expect(mockedPrisma.notification.findMany).toHaveBeenCalledTimes(2);
  });
});

describe('startEmailBatchProcessor / stopEmailBatchProcessor', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    stopEmailBatchProcessor();
    vi.useRealTimers();
  });

  it('sets up interval that calls processEmailBatch', async () => {
    mockedPrisma.notification.findMany.mockResolvedValue([]);

    startEmailBatchProcessor(30_000);

    // Advance by one interval
    await vi.advanceTimersByTimeAsync(30_000);

    expect(mockedPrisma.notification.findMany).toHaveBeenCalled();
  });

  it('stopEmailBatchProcessor clears interval', async () => {
    mockedPrisma.notification.findMany.mockResolvedValue([]);

    startEmailBatchProcessor(30_000);
    stopEmailBatchProcessor();

    vi.resetAllMocks();
    await vi.advanceTimersByTimeAsync(60_000);

    expect(mockedPrisma.notification.findMany).not.toHaveBeenCalled();
  });
});
