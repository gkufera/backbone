import { Router } from 'express';
import nodemailer from 'nodemailer';

const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

healthRouter.get('/health/email-diag', async (_req, res) => {
  const config = {
    EMAIL_ENABLED: process.env.EMAIL_ENABLED,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER ? 'SET' : 'MISSING',
    SMTP_PASS: process.env.SMTP_PASS ? 'SET' : 'MISSING',
    EMAIL_FROM: process.env.EMAIL_FROM,
    FRONTEND_URL: process.env.FRONTEND_URL,
  };

  let smtpVerify = 'not tested';
  try {
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT ?? '587', 10),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      connectionTimeout: 10000,
    });
    await transport.verify();
    smtpVerify = 'OK';
  } catch (err) {
    smtpVerify = `FAILED: ${err instanceof Error ? err.message : String(err)}`;
  }

  res.json({ config, smtpVerify });
});

export { healthRouter };
