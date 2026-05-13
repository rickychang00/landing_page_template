"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { enquireRDPTransaction } from '@/app/actions/payment';
import { linkTransactionToMember } from '@/lib/cms-store';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2, ArrowLeft, Receipt, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

function PaymentResultContent() {
  const searchParams = useSearchParams();
  const transactionId = searchParams.get('transaction_id');
  const payerId = searchParams.get('payer_id');
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function verify() {
      if (!transactionId) {
        setError("Missing transaction identifier.");
        setLoading(false);
        return;
      }

      const response = await enquireRDPTransaction(transactionId);
      if (response.success) {
        setResult(response.data);
        const isSuccess = response.data && (response.data.response_code === "0" || response.data.response_code === 0);
        
        if (isSuccess && payerId && response.data.payer_email) {
          try {
            const memberRecord = await apiClient<any>(`/members?email=${encodeURIComponent(response.data.payer_email)}`);
            if (memberRecord?.id) {
              await linkTransactionToMember(memberRecord.id, transactionId, payerId, response.data);
            }
          } catch (err) {}
        }
      } else {
        setError(response.error || "Failed to verify transaction.");
      }
      setLoading(false);
    }
    verify();
  }, [transactionId, payerId]);

  if (loading) return <div className="text-center py-32"><Loader2 className="animate-spin mx-auto mb-4" /> Verifying...</div>;

  const isSuccess = result && (result.response_code === "0" || result.response_code === 0);

  return (
    <div className="container px-4 py-16 mx-auto max-w-2xl text-center">
      <Card className="shadow-2xl">
        <CardHeader>
          <div className="mx-auto mb-4">{isSuccess ? <CheckCircle2 className="w-16 h-16 text-green-500" /> : <XCircle className="w-16 h-16 text-destructive" />}</div>
          <CardTitle className="text-3xl font-bold">{isSuccess ? 'Payment Successful' : 'Payment Failed'}</CardTitle>
          <CardDescription>{isSuccess ? 'Your membership is now active.' : error}</CardDescription>
        </CardHeader>
        <CardContent>
           {result && (
             <div className="bg-secondary/10 p-6 rounded-xl text-left space-y-2 text-sm">
                <div className="flex justify-between"><span>Order ID:</span> <b>{result.order_id}</b></div>
                <div className="flex justify-between"><span>Transaction ID:</span> <b>{result.transaction_id}</b></div>
                <div className="flex justify-between"><span>Amount:</span> <b>{result.ccy} {result.amount}</b></div>
             </div>
           )}
        </CardContent>
        <CardFooter className="flex-col gap-4">
          <Link href="/" className="w-full"><Button className="w-full h-12 text-lg font-bold">Return to Home</Button></Link>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function PaymentResultPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PaymentResultContent />
    </Suspense>
  );
}
