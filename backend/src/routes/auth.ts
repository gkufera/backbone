import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { signToken } from '../lib/jwt';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';
import { VALIDATION } from '@backbone/shared/constants';
import { sendEmail } from '../services/email-service';
import { sendSms } from '../services/sms-service';

const authRouter = Router();

const SALT_ROUNDS = 10;
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3000';

authRouter.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ error: 'Name, email, and password are required' });
      return;
    }

    const trimmedName = String(name).trim();
    if (!trimmedName) {
      res.status(400).json({ error: 'Name cannot be blank' });
      return;
    }

    if (!VALIDATION.EMAIL_REGEX.test(email)) {
      res.status(400).json({ error: 'Invalid email format' });
      return;
    }

    if (String(password).length < VALIDATION.PASSWORD_MIN_LENGTH) {
      res
        .status(400)
        .json({ error: `Password must be at least ${VALIDATION.PASSWORD_MIN_LENGTH} characters` });
      return;
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(409).json({ error: 'A user with this email already exists' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const isTestEnv = process.env.NODE_ENV === 'test';

    const user = await prisma.user.create({
      data: {
        name: trimmedName,
        email,
        passwordHash,
        ...(isTestEnv && { emailVerified: true }),
      },
    });

    if (!isTestEnv) {
      // Generate email verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationExpiresAt = new Date(
        Date.now() + VALIDATION.EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000,
      );

      await prisma.emailVerificationToken.create({
        data: { userId: user.id, token: verificationToken, expiresAt: verificationExpiresAt },
      });

      const verifyUrl = `${FRONTEND_URL}/verify-email?token=${verificationToken}`;
      sendEmail(
        user.email,
        'Verify your Slug Max email',
        `<p>Click the link below to verify your email:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>This link expires in ${VALIDATION.EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS} hours.</p>`,
      ).catch((err) => console.error('Failed to send verification email:', err));
    }

    res.status(201).json({
      message: isTestEnv
        ? 'Account created and verified.'
        : 'Account created. Please check your email to verify your account.',
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

authRouter.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    if (!VALIDATION.EMAIL_REGEX.test(email)) {
      res.status(400).json({ error: 'Invalid email format' });
      return;
    }

    // Dummy hash used when user is not found to prevent timing attacks.
    // bcrypt.compare runs in constant time regardless of whether user exists.
    const DUMMY_HASH = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

    const user = await prisma.user.findUnique({ where: { email } });
    const passwordValid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

    if (!user || !passwordValid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    if (!user.emailVerified) {
      res
        .status(403)
        .json({ error: 'Please verify your email before logging in', code: 'EMAIL_NOT_VERIFIED' });
      return;
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
    });

    res.status(200).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        emailNotificationsEnabled: user.emailNotificationsEnabled,
        phone: user.phone ?? null,
        phoneVerified: user.phoneVerified ?? false,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

authRouter.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;

    const user = await prisma.user.findUnique({
      where: { id: authReq.user.userId },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        emailNotificationsEnabled: user.emailNotificationsEnabled,
        phone: user.phone ?? null,
        phoneVerified: user.phoneVerified ?? false,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

authRouter.patch('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { name, currentPassword, newPassword, emailNotificationsEnabled } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: authReq.user.userId },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const updateData: { name?: string; passwordHash?: string; emailNotificationsEnabled?: boolean } = {};

    if (emailNotificationsEnabled !== undefined) {
      updateData.emailNotificationsEnabled = Boolean(emailNotificationsEnabled);
    }

    if (name !== undefined) {
      const trimmedName = String(name).trim();
      if (!trimmedName) {
        res.status(400).json({ error: 'Name cannot be blank' });
        return;
      }
      updateData.name = trimmedName;
    }

    if (newPassword !== undefined) {
      if (!currentPassword) {
        res.status(400).json({ error: 'Current password is required to set a new password' });
        return;
      }

      if (String(newPassword).length < VALIDATION.PASSWORD_MIN_LENGTH) {
        res.status(400).json({
          error: `Password must be at least ${VALIDATION.PASSWORD_MIN_LENGTH} characters`,
        });
        return;
      }

      const passwordValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!passwordValid) {
        res.status(401).json({ error: 'Current password is incorrect' });
        return;
      }

      updateData.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    res.json({
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        emailVerified: updatedUser.emailVerified,
        emailNotificationsEnabled: updatedUser.emailNotificationsEnabled,
        phone: updatedUser.phone ?? null,
        phoneVerified: updatedUser.phoneVerified ?? false,
        createdAt: updatedUser.createdAt,
      },
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

authRouter.post('/api/auth/verify-email', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      res.status(400).json({ error: 'Token is required' });
      return;
    }

    const verificationToken = await prisma.emailVerificationToken.findFirst({
      where: { token },
    });

    if (!verificationToken) {
      res.status(400).json({ error: 'Invalid verification token' });
      return;
    }

    if (verificationToken.usedAt) {
      res.status(400).json({ error: 'This verification token has already been used' });
      return;
    }

    if (verificationToken.expiresAt < new Date()) {
      res.status(400).json({ error: 'This verification token has expired' });
      return;
    }

    await prisma.$transaction([
      prisma.emailVerificationToken.update({
        where: { id: verificationToken.id },
        data: { usedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: verificationToken.userId },
        data: { emailVerified: true },
      }),
    ]);

    res.status(200).json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

authRouter.post('/api/auth/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (user && !user.emailVerified) {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(
        Date.now() + VALIDATION.EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000,
      );

      await prisma.emailVerificationToken.create({
        data: { userId: user.id, token, expiresAt },
      });

      const verifyUrl = `${FRONTEND_URL}/verify-email?token=${token}`;
      sendEmail(
        user.email,
        'Verify your Slug Max email',
        `<p>Click the link below to verify your email:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>This link expires in ${VALIDATION.EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS} hours.</p>`,
      ).catch((err) => console.error('Failed to send verification email:', err));
    }

    // Always return 200 to not leak whether email exists
    res
      .status(200)
      .json({ message: 'If that email exists, check your email for a verification link' });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

authRouter.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(
        Date.now() + VALIDATION.PASSWORD_RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000,
      );

      await prisma.passwordResetToken.create({
        data: { userId: user.id, token, expiresAt },
      });

      const resetUrl = `${FRONTEND_URL}/reset-password?token=${token}`;
      sendEmail(
        user.email,
        'Reset your Slug Max password',
        `<p>Click the link below to reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in ${VALIDATION.PASSWORD_RESET_TOKEN_EXPIRY_HOURS} hour(s).</p>`,
      ).catch((err) => console.error('Failed to send password reset email:', err));
    }

    // Always return 200 to not leak whether email exists
    res.status(200).json({ message: 'If that email exists, check your email for a reset link' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

authRouter.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      res.status(400).json({ error: 'Token and new password are required' });
      return;
    }

    if (String(newPassword).length < VALIDATION.PASSWORD_MIN_LENGTH) {
      res.status(400).json({
        error: `Password must be at least ${VALIDATION.PASSWORD_MIN_LENGTH} characters`,
      });
      return;
    }

    const resetToken = await prisma.passwordResetToken.findFirst({
      where: { token },
    });

    if (!resetToken) {
      res.status(400).json({ error: 'Invalid or expired reset token' });
      return;
    }

    if (resetToken.usedAt) {
      res.status(400).json({ error: 'This reset token has already been used' });
      return;
    }

    if (resetToken.expiresAt < new Date()) {
      res.status(400).json({ error: 'This reset token has expired' });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await prisma.$transaction([
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
    ]);

    res.status(200).json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

authRouter.post('/api/auth/send-phone-code', requireAuth, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { phone } = req.body;

    if (!phone || !VALIDATION.PHONE_REGEX.test(phone)) {
      res.status(400).json({ error: 'Invalid phone number. Must be E.164 format (e.g., +15551234567)' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: authReq.user.userId },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Generate 6-digit code
    const code = String(crypto.randomInt(100000, 1000000));
    const expiresAt = new Date(
      Date.now() + VALIDATION.PHONE_VERIFICATION_CODE_EXPIRY_MINUTES * 60 * 1000,
    );

    await prisma.phoneVerificationCode.create({
      data: { userId: user.id, phone, code, expiresAt },
    });

    await sendSms(phone, `Your Slug Max verification code is: ${code}`);

    res.status(200).json({ message: 'Verification code sent' });
  } catch (error) {
    console.error('Send phone code error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

authRouter.post('/api/auth/verify-phone', requireAuth, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { code } = req.body;

    if (!code) {
      res.status(400).json({ error: 'Verification code is required' });
      return;
    }

    const verificationCode = await prisma.phoneVerificationCode.findFirst({
      where: {
        userId: authReq.user.userId,
        code: String(code),
        usedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!verificationCode) {
      res.status(400).json({ error: 'Invalid verification code' });
      return;
    }

    if (verificationCode.expiresAt < new Date()) {
      res.status(400).json({ error: 'Verification code has expired' });
      return;
    }

    await prisma.$transaction([
      prisma.phoneVerificationCode.update({
        where: { id: verificationCode.id },
        data: { usedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: authReq.user.userId },
        data: { phone: verificationCode.phone, phoneVerified: true },
      }),
    ]);

    res.status(200).json({ message: 'Phone number verified successfully' });
  } catch (error) {
    console.error('Verify phone error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { authRouter };
