import { Resend } from 'resend';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isEmailEnabled(): boolean {
  return process.env.EMAIL_ENABLED === 'true';
}

function getResendClient() {
  return new Resend(process.env.RESEND_API_KEY);
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

  const client = getResendClient();
  const { error } = await client.emails.send({
    from: process.env.EMAIL_FROM ?? 'no-reply@slugmax.com',
    to,
    subject,
    html,
  });
  if (error) {
    console.error(`[Email] Resend error: ${error.message}`);
    throw new Error(`Email send failed: ${error.message}`);
  }
}

export async function sendProductionApprovalEmail(
  to: string,
  productionTitle: string,
  studioName: string,
  contactName: string,
  contactEmail: string,
  budget: string | null,
  approveUrl: string,
): Promise<void> {
  const safeTitle = escapeHtml(productionTitle);
  const safeStudio = escapeHtml(studioName);
  const safeName = escapeHtml(contactName);
  const safeEmail = escapeHtml(contactEmail);
  const safeBudget = budget ? escapeHtml(budget) : 'Not specified';

  const subject = `Slug Max: New production request — ${productionTitle}`;
  const html = `
<h2>New Production Request</h2>
<table>
  <tr><td><strong>Production:</strong></td><td>${safeTitle}</td></tr>
  <tr><td><strong>Studio:</strong></td><td>${safeStudio}</td></tr>
  <tr><td><strong>Contact:</strong></td><td>${safeName} (${safeEmail})</td></tr>
  <tr><td><strong>Budget:</strong></td><td>${safeBudget}</td></tr>
</table>
<p><a href="${approveUrl}">Approve Production</a></p>
`.trim();

  await sendEmail(to, subject, html);
}

export async function sendProductionApprovedEmail(
  to: string,
  productionTitle: string,
): Promise<void> {
  const safeTitle = escapeHtml(productionTitle);
  const frontendUrl = process.env.FRONTEND_URL ?? 'https://slugmax.com';

  const subject = `Slug Max: "${productionTitle}" has been approved`;
  const html = `
<h2>Production Approved</h2>
<p>The production <strong>${safeTitle}</strong> has been approved and is now active.</p>
<p><a href="${frontendUrl}">View on Slug Max</a></p>
`.trim();

  await sendEmail(to, subject, html);
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
      const safeMessage = escapeHtml(n.message);
      if (n.link) {
        return `<li><a href="${frontendUrl}${n.link}">${safeMessage}</a></li>`;
      }
      return `<li>${safeMessage}</li>`;
    })
    .join('\n');

  const safeProductionName = escapeHtml(productionName);

  const html = `
<h2>Updates on ${safeProductionName}</h2>
<ul>
${listItems}
</ul>
<p><a href="${frontendUrl}">View on Slug Max</a></p>
`.trim();

  await sendEmail(to, subject, html);
}
