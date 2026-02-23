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

const app = express();

app.use(cors());
app.use(express.json());

app.use(healthRouter);
app.use(authRouter);
app.use(productionsRouter);
app.use(scriptsRouter);
app.use(elementsRouter);
app.use(optionsRouter);
app.use(approvalsRouter);
app.use(revisionMatchesRouter);

// Global error handler — safety net for any unhandled errors
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

export { app };
