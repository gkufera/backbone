import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock nodemailer before importing email service
const mockSendMail = vi.fn();
vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: mockSendMail,
    })),
  },
}));

import { sendEmail, sendNotificationEmail } from '../services/email-service.js';

describe('Email Service', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('sends email when EMAIL_ENABLED is true', async () => {
    process.env.EMAIL_ENABLED = 'true';
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'user@example.com';
    process.env.SMTP_PASS = 'secret';
    process.env.EMAIL_FROM = 'noreply@slugmax.com';
    mockSendMail.mockResolvedValue({ messageId: 'msg-1' });

    await sendEmail('recipient@example.com', 'Test Subject', '<p>Hello</p>');

    expect(mockSendMail).toHaveBeenCalledWith({
      from: 'noreply@slugmax.com',
      to: 'recipient@example.com',
      subject: 'Test Subject',
      html: '<p>Hello</p>',
    });
  });

  it('logs to console when EMAIL_ENABLED is false', async () => {
    process.env.EMAIL_ENABLED = 'false';
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await sendEmail('recipient@example.com', 'Test Subject', '<p>Hello</p>');

    expect(mockSendMail).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Email]'),
    );
    consoleSpy.mockRestore();
  });

  it('formats notification email correctly', async () => {
    process.env.EMAIL_ENABLED = 'true';
    process.env.EMAIL_FROM = 'noreply@slugmax.com';
    mockSendMail.mockResolvedValue({ messageId: 'msg-2' });

    await sendNotificationEmail('user@example.com', {
      type: 'OPTION_APPROVED',
      message: 'Your option on JOHN was approved',
    });

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        subject: expect.stringContaining('Slug Max'),
        html: expect.stringContaining('Your option on JOHN was approved'),
      }),
    );
  });
});
