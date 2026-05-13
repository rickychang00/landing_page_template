import { Router, Request, Response } from 'express';
import { db } from '../db';
import { transactions } from '../db/schema';
import { requireAuth } from '../middleware/auth';

const router = Router();

// GET /transactions — admin only
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Number(req.query.limit) || 50);
  const offset = (page - 1) * limit;

  const rows = await db.query.transactions.findMany({
    orderBy: (t, { desc }) => [desc(t.createdAt)],
    limit,
    offset,
  });
  res.json(rows);
});

// POST /transactions — internal (API secret or auth)
router.post('/', async (req: Request, res: Response) => {
  const apiSecret = req.headers['x-api-secret'];
  const authHeader = req.headers.authorization;

  const hasAuth = (apiSecret && apiSecret === process.env.API_SECRET_KEY) || authHeader?.startsWith('Bearer ');
  if (!hasAuth) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { memberId, memberName, amount, tierName, type, status, transactionId, rdpResponse } = req.body;

  if (!memberName || !amount || !type) {
    res.status(400).json({ error: 'memberName, amount, and type are required' });
    return;
  }

  const [record] = await db
    .insert(transactions)
    .values({
      memberId: memberId ?? '',
      memberName,
      amount,
      tierName: tierName ?? '',
      type,
      status: status ?? 'success',
      transactionId,
      rdpResponse,
    })
    .returning();

  res.status(201).json(record);
});

export default router;
