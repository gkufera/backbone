import cors from 'cors';
import express, { type Request, type Response, type NextFunction } from 'express';
import helmet from 'helmet';
import { createGeneralLimiter, createAuthLimiter } from './middleware/rate-limit';
import { healthRouter } from './routes/health';
import { authRouter } from './routes/auth';
import { productionsRouter } from './routes/productions';
import { scriptsRouter } from './routes/scripts';
import { elementsRouter } from './routes/elements';
import { optionsRouter } from './routes/options';
import { approvalsRouter } from './routes/approvals';
import { revisionMatchesRouter } from './routes/revision-matches';
import { departmentsRouter } from './routes/departments';
import { notificationsRouter } from './routes/notifications';
import { notesRouter } from './routes/notes';
import { directorNotesRouter } from './routes/director-notes';
import { testSeedRouter } from './routes/test-seed';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  app.use(helmet());

  if (process.env.NODE_ENV !== 'test') {
    app.use(createGeneralLimiter());

    if (!process.env.CORS_ORIGINS) {
      throw new Error('CORS_ORIGINS environment variable is required. Set it in .env.');
    }
  }

  const allowedOrigins = process.env.CORS_ORIGINS?.split(',') ?? [];
  app.use(cors(allowedOrigins.length > 0 ? { origin: allowedOrigins } : undefined));
  app.use(express.json({ limit: '1mb' }));

  app.use(healthRouter);
  if (process.env.NODE_ENV !== 'test') {
    app.use('/api/auth', createAuthLimiter());
  }
  app.use(authRouter);
  app.use(productionsRouter);
  app.use(scriptsRouter);
  app.use(elementsRouter);
  app.use(optionsRouter);
  app.use(approvalsRouter);
  app.use(revisionMatchesRouter);
  app.use(departmentsRouter);
  app.use(notificationsRouter);
  app.use(notesRouter);
  app.use(directorNotesRouter);

  if (process.env.NODE_ENV === 'test') {
    app.use(testSeedRouter);
  }

  // Global error handler — safety net for any unhandled errors
  app.use((err: Error & { status?: number; type?: string }, _req: Request, res: Response, _next: NextFunction) => {
    // Handle body-parser errors (e.g., payload too large)
    if (err.type === 'entity.too.large') {
      res.status(413).json({ error: 'Request body too large' });
      return;
    }
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

const app = createApp();
export { app };
