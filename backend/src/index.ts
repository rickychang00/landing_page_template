import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';

process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});

import authRouter from './routes/auth';
import configRouter from './routes/config';
import membersRouter from './routes/members';
import transactionsRouter from './routes/transactions';
import assetsRouter from './routes/assets';
import webhookRouter from './routes/webhook';

const app = express();

const allowedOrigins = (process.env.FRONTEND_CORS_ORIGIN ?? 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Api-Secret'],
    credentials: true,
  })
);

// Webhook route must parse raw body before express.json()
app.use('/webhook', express.urlencoded({ extended: true }));
app.use('/webhook', express.json());
app.use('/webhook', webhookRouter);

app.use(express.json({ limit: '10mb' }));

app.use('/auth', authRouter);
app.use('/site-config', configRouter);
app.use('/members', membersRouter);
app.use('/transactions', transactionsRouter);
app.use('/assets', assetsRouter);

app.get('/health', (_req, res) => res.json({ ok: true }));

// Global error handler — catches errors from async route handlers
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Express Error]', err.message);
  res.status(500).json({ error: err.message ?? 'Internal server error' });
});

const PORT = Number(process.env.PORT ?? 4000);
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
}

export default app;
