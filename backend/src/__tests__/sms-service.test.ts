import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { sendSms } from '../services/sms-service';

describe('SMS Service', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('logs to console when SMS_ENABLED is false', async () => {
    process.env.SMS_ENABLED = 'false';
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await sendSms('+15551234567', 'Your code is 123456');

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[SMS]'),
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('+15551234567'),
    );
    consoleSpy.mockRestore();
  });

  it('logs to console when SMS_ENABLED is not set', async () => {
    delete process.env.SMS_ENABLED;
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await sendSms('+15551234567', 'Your code is 654321');

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[SMS]'),
    );
    consoleSpy.mockRestore();
  });

  it('does not log the actual verification code (S10)', async () => {
    process.env.SMS_ENABLED = 'false';
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await sendSms('+15551234567', 'Your Slug Max verification code is: 987654');

    const loggedMessage = consoleSpy.mock.calls[0]?.[0] as string;
    expect(loggedMessage).not.toContain('987654');
    expect(loggedMessage).toContain('+15551234567');
    consoleSpy.mockRestore();
  });
});
