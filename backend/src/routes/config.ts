import { Router, Request, Response } from 'express';
import { db } from '../db';
import { siteConfig } from '../db/schema';
import { requireAuth } from '../middleware/auth';
import { eq } from 'drizzle-orm';

const router = Router();

// GET /site-config — public
router.get('/', async (_req: Request, res: Response) => {
  const record = await db.query.siteConfig.findFirst({
    orderBy: (c, { desc }) => [desc(c.createdAt)],
  });
  res.json(record ? record.data : null);
});

// PUT /site-config — admin only
router.put('/', requireAuth, async (req: Request, res: Response) => {
  const data = req.body;
  if (!data || typeof data !== 'object') {
    res.status(400).json({ error: 'Invalid config data' });
    return;
  }

  const existing = await db.query.siteConfig.findFirst({
    orderBy: (c, { desc }) => [desc(c.createdAt)],
  });

  if (existing) {
    await db
      .update(siteConfig)
      .set({ data, updatedAt: new Date() })
      .where(eq(siteConfig.id, existing.id));
  } else {
    await db.insert(siteConfig).values({ data });
  }

  res.json({ success: true });
});

export default router;
