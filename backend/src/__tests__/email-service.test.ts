import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock SES client before importing email service
const { mockSend } = vi.hoisted(() => ({
  mockSend: vi.fn(),
}));
vi.mock('@aws-sdk/client-sesv2', () => ({
  SESv2Client: vi.fn(() => ({ send: mockSend })),
  SendEmailCommand: vi.fn((input: unknown) => ({ input })),
}));

import { sendEmail, sendNotificationEmail, sendDigestEmail } from '../services/email-service';

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

describe('sendDigestEmail', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.EMAIL_ENABLED = 'true';
    process.env.EMAIL_FROM = 'noreply@slugmax.com';
    process.env.FRONTEND_URL = 'https://slugmax.com';
    mockSend.mockResolvedValue({ MessageId: 'msg-digest' });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('formats subject with count and production name', async () => {
    await sendDigestEmail('user@example.com', 'My Film', [
      { message: 'Option added on JOHN', link: '/productions/p1/scripts/s1/elements/e1' },
      { message: 'Script uploaded: Draft 2', link: '/productions/p1/scripts/s2' },
    ]);

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          Content: {
            Simple: {
              Subject: { Data: 'Slug Max: 2 new updates on My Film' },
              Body: { Html: { Data: expect.any(String) } },
            },
          },
        }),
      }),
    );
  });

  it('includes notification messages as bullet points', async () => {
    await sendDigestEmail('user@example.com', 'My Film', [
      { message: 'Option added on JOHN', link: '/productions/p1/scripts/s1/elements/e1' },
      { message: 'Script uploaded: Draft 2', link: null },
    ]);

    const htmlArg = mockSend.mock.calls[0][0].input.Content.Simple.Body.Html.Data as string;
    expect(htmlArg).toContain('Option added on JOHN');
    expect(htmlArg).toContain('Script uploaded: Draft 2');
  });

  it('calls sendEmail with formatted HTML', async () => {
    await sendDigestEmail('user@example.com', 'My Film', [
      { message: 'Approval on LOCATION A', link: '/productions/p1/feed' },
    ]);

    expect(mockSend).toHaveBeenCalledTimes(1);
    const htmlArg = mockSend.mock.calls[0][0].input.Content.Simple.Body.Html.Data as string;
    expect(htmlArg).toContain('<li>');
    expect(htmlArg).toContain('Approval on LOCATION A');
  });
});
