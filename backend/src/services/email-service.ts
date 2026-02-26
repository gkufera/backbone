import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';

function isEmailEnabled(): boolean {
  return process.env.EMAIL_ENABLED === 'true';
}

function getSesClient() {
  return new SESv2Client({ region: 'us-east-1' });
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  if (!isEmailEnabled()) {
    console.log(`[Email] Would send to ${to}: ${subject}`);
    return;
  }

  const client = getSesClient();
  await client.send(
    new SendEmailCommand({
      FromEmailAddress: process.env.EMAIL_FROM ?? 'noreply@slugmax.com',
      Destination: { ToAddresses: [to] },
      Content: {
        Simple: {
          Subject: { Data: subject },
          Body: { Html: { Data: html } },
        },
      },
    }),
  );
}

export async function sendNotificationEmail(
  to: string,
  notification: { type: string; message: string },
): Promise<void> {
  const subject = `Slug Max: ${notification.type.replace(/_/g, ' ').toLowerCase()}`;
  const html = `<p>${notification.message}</p>`;
  await sendEmail(to, subject, html);
}
