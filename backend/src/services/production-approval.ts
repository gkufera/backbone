import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import {
  PRODUCTION_APPROVAL_EMAILS,
  PRODUCTION_APPROVAL_TOKEN_EXPIRY_DAYS,
} from '@backbone/shared/constants';
import { sendProductionApprovalEmail, sendProductionApprovedEmail } from './email-service';

/**
 * Approve a production using a token. Validates token, marks as used, activates production.
 * Returns either an error object or the production title + contact email.
 */
export async function approveProductionByToken(token: string) {
  const result = await prisma.$transaction(async (tx) => {
    const approvalToken = await tx.productionApprovalToken.findUnique({
      where: { token },
      include: { production: true },
    });

    if (!approvalToken) {
      return { error: 'Invalid approval token', status: 400 as const };
    }

    if (approvalToken.usedAt) {
      return { error: 'This approval token has already been used', status: 400 as const };
    }

    if (approvalToken.expiresAt < new Date()) {
      return { error: 'This approval token has expired', status: 400 as const };
    }

    // Mark token as used
    await tx.productionApprovalToken.update({
      where: { id: approvalToken.id },
      data: { usedAt: new Date() },
    });

    // Activate production
    await tx.production.update({
      where: { id: approvalToken.productionId },
      data: { status: 'ACTIVE' },
    });

    return {
      productionTitle: approvalToken.production.title,
      contactEmail: approvalToken.production.contactEmail,
    };
  });

  return result;
}

/**
 * Generate an approval token for a production inside a transaction.
 */
export async function generateApprovalToken(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  productionId: string,
): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + PRODUCTION_APPROVAL_TOKEN_EXPIRY_DAYS);

  await tx.productionApprovalToken.create({
    data: { productionId, token, expiresAt },
  });

  return token;
}

/**
 * Fire-and-forget: send approval request emails to all configured approval addresses.
 */
export function sendApprovalEmails(
  productionTitle: string,
  studioName: string,
  contactName: string,
  contactEmail: string,
  budget: string | null,
  approvalToken: string,
): void {
  const frontendUrl = process.env.FRONTEND_URL ?? 'https://slugmax.com';
  const approveUrl = `${frontendUrl}/approve-production?token=${approvalToken}`;

  for (const email of PRODUCTION_APPROVAL_EMAILS) {
    sendProductionApprovalEmail(
      email,
      productionTitle,
      studioName,
      contactName,
      contactEmail,
      budget,
      approveUrl,
    ).catch((err) => console.error('Failed to send approval email:', err));
  }
}

/**
 * Fire-and-forget: send confirmation emails after production approval.
 * Deduplicates if contactEmail is already an approval address.
 */
export function sendApprovalConfirmationEmails(
  productionTitle: string,
  contactEmail: string | null,
): void {
  const approvedRecipients = new Set(PRODUCTION_APPROVAL_EMAILS);
  if (contactEmail) {
    approvedRecipients.add(contactEmail);
  }
  for (const email of approvedRecipients) {
    sendProductionApprovedEmail(email, productionTitle).catch((err) =>
      console.error('Failed to send approved email:', err),
    );
  }
}
