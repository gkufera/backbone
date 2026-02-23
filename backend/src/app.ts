import cors from 'cors';
import express from 'express';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use(healthRouter);
app.use(authRouter);

export { app };
