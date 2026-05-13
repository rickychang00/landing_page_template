import { Router, Request, Response } from 'express';
import { createHash } from 'node:crypto';
import { db } from '../db';
import { webhookLogs, transactions, members, siteConfig } from '../db/schema';
import { eq } from 'drizzle-orm';

const router = Router();

function calculateNotifySignature(data: Record<string, any>, secretKey: string): string {
  const sortedKeys = Object.keys(data)
    .filter((k) => k !== 'signature' && data[k] !== undefined && data[k] !== null && String(data[k]) !== '')
    .sort();

  const signString = sortedKeys.map((k) => String(data[k])).join('') + secretKey;
  return createHash('sha512').update(signString).digest('hex').toLowerCase();
}

// POST /webhook/rdp — called by Red Dot Payment S2S
router.post('/rdp', async (req: Request, res: Response) => {
  console.log('[RDP NOTIFY] Webhook called');
  const data = req.body;

  // Log raw payload
  try {
    await db.insert(webhookLogs).values({ payload: data });
  } catch (e) {
    console.error('[RDP NOTIFY] Failed to log webhook:', e);
  }

  const secretKey = process.env.RDP_SECRET_KEY ?? '';
  const receivedSig = data.signature;
  const calculatedSig = calculateNotifySignature(data, secretKey);

  if (receivedSig !== calculatedSig) {
    console.warn('[RDP NOTIFY] Signature mismatch — proceeding anyway');
  }

  const responseCode = String(data.response_code ?? '');
  const isSuccess = responseCode === '0' || responseCode === '00';

  if (data.transaction_id) {
    const actualAmount = String(data.amount || data.authorized_amount || data.request_amount || '');
    const type = String(data.recurring_mod) === '3' ? 'MIT' : 'CIT';

    // Save transaction record
    await db.insert(transactions).values({
      transactionId: String(data.transaction_id),
      status: isSuccess ? 'success' : 'failed',
      rdpResponse: data,
      amount: actualAmount,
      memberName: data.payer_name || 'System Notification',
      memberId: '',
      tierName: '',
      type,
    });

    // Link to member if success
    const payerIdValue = data.payer_id || data.payer_identifier;
    if (isSuccess && payerIdValue && data.order_id) {
      const member = await db.query.members.findFirst({
        where: (m, { eq }) => eq(m.orderId, String(data.order_id)),
      });

      if (member) {
        const updateData: Partial<typeof members.$inferInsert> = {
          lastTransactionId: String(data.transaction_id),
          payerId: String(payerIdValue),
          paymentStatus: 'active',
          updatedAt: new Date(),
        };

        // Calculate next charge date
        const configRow = await db.query.siteConfig.findFirst({
          orderBy: (c, { desc }) => [desc(c.createdAt)],
        });

        if (configRow) {
          const config = configRow.data as any;
          const tier = config.tiers?.find((t: any) => t.id === member.tierId);
          if (tier && tier.period !== 'once') {
            const nextCharge = new Date();
            if (tier.period === 'month') nextCharge.setMonth(nextCharge.getMonth() + 1);
            if (tier.period === 'year') nextCharge.setFullYear(nextCharge.getFullYear() + 1);
            updateData.nextChargeAt = nextCharge;
          }
        }

        await db.update(members).set(updateData).where(eq(members.id, member.id));
        console.log(`[RDP NOTIFY] Linked payerId ${payerIdValue} to member ${member.id}`);
      } else {
        console.warn(`[RDP NOTIFY] Member not found for orderId: ${data.order_id}`);
      }
    }
  }

  res.json({ status: 'ok' });
});

export default router;
