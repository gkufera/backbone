import cors from 'cors';
import express, { type Request, type Response, type NextFunction } from 'express';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { productionsRouter } from './routes/productions.js';
import { scriptsRouter } from './routes/scripts.js';
import { elementsRouter } from './routes/elements.js';
import { optionsRouter } from './routes/options.js';
import { approvalsRouter } from './routes/approvals.js';
import { revisionMatchesRouter } from './routes/revision-matches.js';
import { departmentsRouter } from './routes/departments.js';
import { notificationsRouter } from './routes/notifications.js';
import { notesRouter } from './routes/notes.js';

export function createApp() {
  const app = express();

  const allowedOrigins = process.env.CORS_ORIGINS?.split(',') ?? [];
  app.use(cors(allowedOrigins.length > 0 ? { origin: allowedOrigins } : undefined));
  app.use(express.json());

  app.use(healthRouter);
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

  // Global error handler — safety net for any unhandled errors
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

const app = createApp();
export { app };
