import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock Resend client before importing email service
const { mockSend } = vi.hoisted(() => ({
  mockSend: vi.fn(),
}));
vi.mock('resend', () => ({
  Resend: vi.fn(function () {
    return { emails: { send: mockSend } };
  }),
}));

import {
  sendEmail,
  sendDigestEmail,
  sendProductionApprovalEmail,
  sendProductionApprovedEmail,
} from '../services/email-service';

describe('Email Service', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('sends email via Resend API when EMAIL_ENABLED is true', async () => {
    process.env.EMAIL_ENABLED = 'true';
    process.env.EMAIL_FROM = 'no-reply@slugmax.com';
    process.env.RESEND_API_KEY = 're_test_123';
    mockSend.mockResolvedValue({ id: 'msg-1' });

    await sendEmail('recipient@example.com', 'Test Subject', '<p>Hello</p>');

    expect(mockSend).toHaveBeenCalledWith({
      from: 'no-reply@slugmax.com',
      to: 'recipient@example.com',
      subject: 'Test Subject',
      html: '<p>Hello</p>',
    });
  });

  it('throws when Resend returns an error', async () => {
    process.env.EMAIL_ENABLED = 'true';
    process.env.RESEND_API_KEY = 're_test_123';
    mockSend.mockResolvedValue({
      data: null,
      error: { message: 'API key invalid', statusCode: 403, name: 'validation_error' },
    });

    await expect(
      sendEmail('recipient@example.com', 'Test Subject', '<p>Hello</p>'),
    ).rejects.toThrow('Email send failed: API key invalid');
  });

  it('logs error details on Resend failure', async () => {
    process.env.EMAIL_ENABLED = 'true';
    process.env.RESEND_API_KEY = 're_test_123';
    mockSend.mockResolvedValue({
      data: null,
      error: { message: 'Daily quota exceeded', statusCode: 429, name: 'rate_limit_error' },
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      sendEmail('recipient@example.com', 'Test', '<p>Hi</p>'),
    ).rejects.toThrow();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Daily quota exceeded'),
    );
    consoleSpy.mockRestore();
  });

  it('logs to console when EMAIL_ENABLED is false', async () => {
    process.env.EMAIL_ENABLED = 'false';
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await sendEmail('recipient@example.com', 'Test Subject', '<p>Hello</p>');

    expect(mockSend).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[Email]'));
    consoleSpy.mockRestore();
  });

});

describe('sendDigestEmail', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.EMAIL_ENABLED = 'true';
    process.env.EMAIL_FROM = 'no-reply@slugmax.com';
    process.env.RESEND_API_KEY = 're_test_123';
    process.env.FRONTEND_URL = 'https://slugmax.com';
    mockSend.mockResolvedValue({ id: 'msg-digest' });
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
        subject: 'Slug Max: 2 new updates on My Film',
      }),
    );
  });

  it('includes notification messages as bullet points', async () => {
    await sendDigestEmail('user@example.com', 'My Film', [
      { message: 'Option added on JOHN', link: '/productions/p1/scripts/s1/elements/e1' },
      { message: 'Script uploaded: Draft 2', link: null },
    ]);

    const htmlArg = mockSend.mock.calls[0][0].html as string;
    expect(htmlArg).toContain('Option added on JOHN');
    expect(htmlArg).toContain('Script uploaded: Draft 2');
  });

  it('escapes HTML in messages and production name', async () => {
    await sendDigestEmail('user@example.com', '<script>alert("xss")</script>', [
      { message: '<img src=x onerror=alert(1)>', link: null },
      { message: 'Normal message & "quotes"', link: '/productions/p1/feed' },
    ]);

    const htmlArg = mockSend.mock.calls[0][0].html as string;
    // Should NOT contain raw HTML tags from user input
    expect(htmlArg).not.toContain('<script>');
    expect(htmlArg).not.toContain('<img');
    // Should contain escaped versions
    expect(htmlArg).toContain('&lt;script&gt;');
    expect(htmlArg).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(htmlArg).toContain('Normal message &amp; &quot;quotes&quot;');
  });

  it('calls sendEmail with formatted HTML', async () => {
    await sendDigestEmail('user@example.com', 'My Film', [
      { message: 'Approval on LOCATION A', link: '/productions/p1/feed' },
    ]);

    expect(mockSend).toHaveBeenCalledTimes(1);
    const htmlArg = mockSend.mock.calls[0][0].html as string;
    expect(htmlArg).toContain('<li>');
    expect(htmlArg).toContain('Approval on LOCATION A');
  });
});

describe('sendProductionApprovalEmail', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.EMAIL_ENABLED = 'true';
    process.env.EMAIL_FROM = 'no-reply@slugmax.com';
    process.env.RESEND_API_KEY = 're_test_123';
    mockSend.mockResolvedValue({ id: 'msg-approval' });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('sends with correct subject format', async () => {
    await sendProductionApprovalEmail(
      'admin@example.com',
      'My Film',
      'Acme Studios',
      'Jane Doe',
      'jane@example.com',
      '$1M',
      'https://slugmax.com/approve/token-123',
    );

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: 'Slug Max: New production request — My Film',
      }),
    );
  });

  it('HTML-escapes user inputs in body', async () => {
    await sendProductionApprovalEmail(
      'admin@example.com',
      '<script>xss</script>',
      'Studio & "Friends"',
      'O\'Brien',
      'ob@example.com',
      null,
      'https://slugmax.com/approve/t1',
    );

    const htmlArg = mockSend.mock.calls[0][0].html as string;
    expect(htmlArg).not.toContain('<script>');
    expect(htmlArg).toContain('&lt;script&gt;xss&lt;/script&gt;');
    expect(htmlArg).toContain('Studio &amp; &quot;Friends&quot;');
    expect(htmlArg).toContain('O&#39;Brien');
  });

  it('shows "Not specified" when budget is null', async () => {
    await sendProductionApprovalEmail(
      'admin@example.com',
      'My Film',
      'Acme',
      'Jane',
      'jane@example.com',
      null,
      'https://slugmax.com/approve/t1',
    );

    const htmlArg = mockSend.mock.calls[0][0].html as string;
    expect(htmlArg).toContain('Not specified');
  });

  it('includes approveUrl in anchor tag', async () => {
    const approveUrl = 'https://slugmax.com/approve/token-abc';
    await sendProductionApprovalEmail(
      'admin@example.com',
      'My Film',
      'Acme',
      'Jane',
      'jane@example.com',
      '$500K',
      approveUrl,
    );

    const htmlArg = mockSend.mock.calls[0][0].html as string;
    expect(htmlArg).toContain(`href="${approveUrl}"`);
    expect(htmlArg).toContain('Approve Production');
  });
});

describe('sendProductionApprovedEmail', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.EMAIL_ENABLED = 'true';
    process.env.EMAIL_FROM = 'no-reply@slugmax.com';
    process.env.RESEND_API_KEY = 're_test_123';
    mockSend.mockResolvedValue({ id: 'msg-approved' });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('sends with correct subject format', async () => {
    await sendProductionApprovedEmail('user@example.com', 'My Film');

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: 'Slug Max: "My Film" has been approved',
      }),
    );
  });

  it('HTML-escapes production title in body', async () => {
    await sendProductionApprovedEmail('user@example.com', '<b>Dangerous & "Title"</b>');

    const htmlArg = mockSend.mock.calls[0][0].html as string;
    expect(htmlArg).not.toContain('<b>Dangerous');
    expect(htmlArg).toContain('&lt;b&gt;Dangerous &amp; &quot;Title&quot;&lt;/b&gt;');
  });

  it('uses FRONTEND_URL env var in link', async () => {
    process.env.FRONTEND_URL = 'https://custom.example.com';
    await sendProductionApprovedEmail('user@example.com', 'My Film');

    const htmlArg = mockSend.mock.calls[0][0].html as string;
    expect(htmlArg).toContain('href="https://custom.example.com"');
  });

  it('falls back to https://slugmax.com when FRONTEND_URL is not set', async () => {
    delete process.env.FRONTEND_URL;
    await sendProductionApprovedEmail('user@example.com', 'My Film');

    const htmlArg = mockSend.mock.calls[0][0].html as string;
    expect(htmlArg).toContain('href="https://slugmax.com"');
  });
});
