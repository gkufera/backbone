import nodemailer from 'nodemailer';

function isEmailEnabled(): boolean {
  return process.env.EMAIL_ENABLED === 'true';
}

function getTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
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

  const transport = getTransport();
  await transport.sendMail({
    from: process.env.EMAIL_FROM ?? 'noreply@backbone.app',
    to,
    subject,
    html,
  });
}

export async function sendNotificationEmail(
  to: string,
  notification: { type: string; message: string },
): Promise<void> {
  const subject = `Backbone: ${notification.type.replace(/_/g, ' ').toLowerCase()}`;
  const html = `<p>${notification.message}</p>`;
  await sendEmail(to, subject, html);
}
