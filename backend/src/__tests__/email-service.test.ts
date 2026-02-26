import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock SES client before importing email service
const { mockSend } = vi.hoisted(() => ({
  mockSend: vi.fn(),
}));
vi.mock('@aws-sdk/client-sesv2', () => ({
  SESv2Client: vi.fn(() => ({ send: mockSend })),
  SendEmailCommand: vi.fn((input: unknown) => ({ input })),
}));

import { sendEmail, sendNotificationEmail } from '../services/email-service';

describe('Email Service', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('sends email via SES API when EMAIL_ENABLED is true', async () => {
    process.env.EMAIL_ENABLED = 'true';
    process.env.EMAIL_FROM = 'noreply@slugmax.com';
    process.env.AWS_ACCESS_KEY_ID = 'AKIA123';
    process.env.AWS_SECRET_ACCESS_KEY = 'secret';
    mockSend.mockResolvedValue({ MessageId: 'msg-1' });

    await sendEmail('recipient@example.com', 'Test Subject', '<p>Hello</p>');

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          FromEmailAddress: 'noreply@slugmax.com',
          Destination: { ToAddresses: ['recipient@example.com'] },
          Content: {
            Simple: {
              Subject: { Data: 'Test Subject' },
              Body: { Html: { Data: '<p>Hello</p>' } },
            },
          },
        }),
      }),
    );
  });

  it('logs to console when EMAIL_ENABLED is false', async () => {
    process.env.EMAIL_ENABLED = 'false';
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await sendEmail('recipient@example.com', 'Test Subject', '<p>Hello</p>');

    expect(mockSend).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[Email]'));
    consoleSpy.mockRestore();
  });

  it('formats notification email correctly', async () => {
    process.env.EMAIL_ENABLED = 'true';
    process.env.EMAIL_FROM = 'noreply@slugmax.com';
    mockSend.mockResolvedValue({ MessageId: 'msg-2' });

    await sendNotificationEmail('user@example.com', {
      type: 'OPTION_APPROVED',
      message: 'Your option on JOHN was approved',
    });

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          Destination: { ToAddresses: ['user@example.com'] },
          Content: {
            Simple: {
              Subject: { Data: expect.stringContaining('Slug Max') },
              Body: {
                Html: { Data: expect.stringContaining('Your option on JOHN was approved') },
              },
            },
          },
        }),
      }),
    );
  });
});
