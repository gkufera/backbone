function isSmsEnabled(): boolean {
  return process.env.SMS_ENABLED === 'true';
}

export async function sendSms(to: string, body: string): Promise<void> {
  if (!isSmsEnabled()) {
    console.log(`[SMS] Would send verification code to ${to}`);
    return;
  }

  // When SMS_ENABLED is true, integrate with a real SMS provider (e.g., Twilio)
  // For now, just log — the provider integration is an infrastructure task
  console.log(`[SMS] Sending verification code to ${to}`);
}
