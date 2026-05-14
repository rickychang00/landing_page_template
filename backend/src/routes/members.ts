import { Router, Request, Response } from 'express';
import { db } from '../db';
import { members } from '../db/schema';
import { requireAuth } from '../middleware/auth';
import { eq, lte, and } from 'drizzle-orm';

const router = Router();

// GET /members/taken-dates — public, returns only selectedDate values for calendar blocking
router.get('/taken-dates', async (_req: Request, res: Response) => {
  const rows = await db.query.members.findMany({
    columns: { selectedDate: true },
  });
  const dates = rows.filter((r) => r.selectedDate).map((r) => r.selectedDate);
  res.json(dates);
});

// GET /members — requires auth or API secret
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const { email, orderId, dueForCharge } = req.query;

  if (email) {
    const member = await db.query.members.findFirst({
      where: (m, { eq }) => eq(m.email, String(email)),
    });
    res.json(member ?? null);
    return;
  }

  if (orderId) {
    const member = await db.query.members.findFirst({
      where: (m, { eq }) => eq(m.orderId, String(orderId)),
    });
    res.json(member ?? null);
    return;
  }

  if (dueForCharge === 'true') {
    const now = new Date();
    const due = await db.query.members.findMany({
      where: and(lte(members.nextChargeAt, now), eq(members.paymentStatus, 'active')),
    });
    res.json(due);
    return;
  }

  const all = await db.query.members.findMany({
    orderBy: (m, { desc }) => [desc(m.createdAt)],
  });
  res.json(all);
});

// GET /members/:id — requires auth or API secret
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const member = await db.query.members.findFirst({
    where: (m, { eq }) => eq(m.id, String(req.params.id)),
  });
  if (!member) {
    res.status(404).json({ error: 'Member not found' });
    return;
  }
  res.json(member);
});

// POST /members — public (registration flow)
router.post('/', async (req: Request, res: Response) => {
  const { email, name, tierId, hasPaymentConsent, selectedDate, orderId } = req.body;

  if (!email || !name || !tierId) {
    res.status(400).json({ error: 'email, name, and tierId are required' });
    return;
  }

  const [member] = await db
    .insert(members)
    .values({ email, name, tierId, hasPaymentConsent: !!hasPaymentConsent, selectedDate, orderId })
    .returning();

  res.status(201).json(member);
});

// PUT /members/:id — requires auth or API secret (internal server-to-server calls)
router.put('/:id', async (req: Request, res: Response) => {
  const apiSecret = req.headers['x-api-secret'];
  const authHeader = req.headers.authorization;

  const hasAuth = (apiSecret && apiSecret === process.env.API_SECRET_KEY) || authHeader?.startsWith('Bearer ');

  if (!hasAuth) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const {
    lastTransactionId, payerId, paymentStatus, nextChargeAt,
    rdpResponse, orderId, selectedDate,
  } = req.body;

  const updateData: Partial<typeof members.$inferInsert> = { updatedAt: new Date() };
  if (lastTransactionId !== undefined) updateData.lastTransactionId = lastTransactionId;
  if (payerId !== undefined) updateData.payerId = payerId;
  if (paymentStatus !== undefined) updateData.paymentStatus = paymentStatus;
  if (nextChargeAt !== undefined) updateData.nextChargeAt = nextChargeAt ? new Date(nextChargeAt) : null;
  if (rdpResponse !== undefined) updateData.rdpResponse = rdpResponse;
  if (orderId !== undefined) updateData.orderId = orderId;
  if (selectedDate !== undefined) updateData.selectedDate = selectedDate;

  const [updated] = await db
    .update(members)
    .set(updateData)
    .where(eq(members.id, String(req.params.id)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: 'Member not found' });
    return;
  }

  res.json(updated);
});

export default router;
