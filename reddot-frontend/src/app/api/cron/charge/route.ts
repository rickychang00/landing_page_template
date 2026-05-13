import { NextResponse } from 'next/server';
import { requestRDPMITPayment } from '@/app/actions/payment';

const BACKEND_URL = (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');
const API_SECRET = process.env.API_SECRET_KEY ?? '';

async function backendFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Secret': API_SECRET,
      ...(options.headers as Record<string, string>),
    },
  });
  if (!res.ok) throw new Error(`Backend ${path} failed: ${res.status}`);
  return res.json();
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const now = new Date();
  console.log(`[CRON] Execution started at ${now.toISOString()}`);

  try {
    const [config, dueMembers] = await Promise.all([
      backendFetch('/site-config'),
      backendFetch('/members?dueForCharge=true'),
    ]);

    if (!config) {
      return NextResponse.json({ error: 'Site config not found' }, { status: 500 });
    }

    console.log(`[CRON] Found ${dueMembers.length} members due for charge.`);
    const results = [];

    for (const member of dueMembers) {
      const tier = config.tiers?.find((t: any) => t.id === member.tierId);

      if (!tier) {
        console.warn(`[CRON] Member ${member.id} skipped - Tier ${member.tierId} not found.`);
        continue;
      }

      if (!member.payerId || !member.lastTransactionId) {
        console.warn(`[CRON] Member ${member.id} skipped - Missing payerId or token.`);
        continue;
      }

      const amount = parseInt(tier.price.replace(/[^0-9]/g, ''));
      const orderId = `M${member.id.slice(-6)}${Date.now()}`;

      console.log(`[CRON] Charging ${member.name} (${member.id}): ${tier.price}`);

      const paymentResult = await requestRDPMITPayment({
        payerName: member.name,
        payerEmail: member.email,
        orderId,
        amount,
        parentTransactionId: member.lastTransactionId,
        payerId: member.payerId,
      });

      if (paymentResult.success) {
        const nextChargeDate = new Date();
        if (tier.period === 'month') {
          nextChargeDate.setMonth(nextChargeDate.getMonth() + 1);
        } else if (tier.period === 'year') {
          nextChargeDate.setFullYear(nextChargeDate.getFullYear() + 1);
        } else {
          await backendFetch(`/members/${member.id}`, {
            method: 'PUT',
            body: JSON.stringify({ paymentStatus: 'completed' }),
          });
          results.push({ memberId: member.id, status: 'converted_to_once' });
          continue;
        }

        const transactionId = paymentResult.data.transaction_id;

        await Promise.all([
          backendFetch(`/members/${member.id}`, {
            method: 'PUT',
            body: JSON.stringify({ nextChargeAt: nextChargeDate.toISOString(), lastTransactionId: transactionId }),
          }),
          backendFetch('/transactions', {
            method: 'POST',
            body: JSON.stringify({
              status: 'success',
              rdpResponse: paymentResult.data,
              amount: String(amount),
              memberName: member.name,
              memberId: member.id,
              type: 'MIT',
              tierName: tier.name,
              transactionId: String(transactionId),
            }),
          }),
        ]);

        results.push({ memberId: member.id, status: 'success', transactionId });
      } else {
        await backendFetch(`/members/${member.id}`, {
          method: 'PUT',
          body: JSON.stringify({ paymentStatus: 'failed' }),
        });
        results.push({ memberId: member.id, status: 'failed', error: paymentResult.error });
      }
    }

    return NextResponse.json({ success: true, processed: dueMembers.length, results });
  } catch (error: any) {
    console.error('[CRON FATAL] Execution failed:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
