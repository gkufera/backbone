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

export async function sendDigestEmail(
  to: string,
  productionName: string,
  notifications: Array<{ message: string; link: string | null }>,
): Promise<void> {
  const count = notifications.length;
  const subject = `Slug Max: ${count} new update${count !== 1 ? 's' : ''} on ${productionName}`;

  const frontendUrl = process.env.FRONTEND_URL ?? 'https://slugmax.com';

  const listItems = notifications
    .map((n) => {
      if (n.link) {
        return `<li><a href="${frontendUrl}${n.link}">${n.message}</a></li>`;
      }
      return `<li>${n.message}</li>`;
    })
    .join('\n');

  const html = `
<h2>Updates on ${productionName}</h2>
<ul>
${listItems}
</ul>
<p><a href="${frontendUrl}">View on Slug Max</a></p>
`.trim();

  await sendEmail(to, subject, html);
}
