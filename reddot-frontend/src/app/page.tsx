'use client';

import { Hero } from '@/components/landing/Hero';
import { TierSection } from '@/components/landing/TierSection';
import { apiClient } from '@/lib/api-client';
import { INITIAL_CONFIG, SiteConfig, linkTransactionToMember, recordTransaction } from '@/lib/cms-store';
import { resolveAssetUrl } from '@/lib/asset-url';
import { useEffect, Suspense, useState } from 'react';
import { cn } from '@/lib/utils';
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { enquireRDPTransaction } from '@/app/actions/payment';
import { Loader2 } from 'lucide-react';

function HomePageContent() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const transactionId = searchParams.get('transaction_id');
  
  const [isVerifying, setIsVerifying] = useState(false);
  const [config, setConfig] = useState<SiteConfig>(INITIAL_CONFIG);
  const [loading, setLoading] = useState(true);

  // 1. Fetch Config
  useEffect(() => {
    async function fetchConfig() {
      try {
        const data = await apiClient<SiteConfig>('/site-config');
        if (data) setConfig({ ...INITIAL_CONFIG, ...data });
      } catch (e: any) {
        console.warn("Config fetch failed (using defaults):", e?.message ?? e);
      } finally {
        setLoading(false);
      }
    }
    fetchConfig();
  }, []);

  // 2. Verify Payment
  useEffect(() => {
    async function verifyPayment() {
      if (transactionId && !isVerifying) {
        setIsVerifying(true);
        const urlPayerId = searchParams.get('payer_id');

        try {
          const response = await enquireRDPTransaction(transactionId);
          if (response.success) {
            const data = response.data;
            const responseCode = String(data.response_code || "");
            const status = String(data.transaction_status || "").toLowerCase();
            const isSuccess = responseCode === "0" || responseCode === "00" || status === "paid" || status === "success";

            if (isSuccess) {
              const orderId = data.order_id;
              if (orderId) {
                try {
                   const memberRecord = await apiClient<any>(`/members?orderId=${encodeURIComponent(orderId)}`);
                   const finalPayerId = data.payer_id || urlPayerId;

                   await linkTransactionToMember(memberRecord.id, transactionId, finalPayerId);
                   
                   const actualAmount = data.amount || data.authorized_amount;
                   await recordTransaction({
                     memberId: memberRecord.id,
                     memberName: data.payer_name || 'Verified Member',
                     amount: String(actualAmount || '0'),
                     tierName: 'Activated Tier',
                     type: 'CIT'
                   }, transactionId);

                   toast({ title: "Success!", description: "Membership activated." });
                } catch (e) {
                  console.error("Member not found for orderId:", orderId);
                }
              }
            }
          }
        } catch (err) {
          console.error("Verification error:", err);
        } finally {
          setIsVerifying(false);
          router.replace('/', { scroll: false });
        }
      }
    }
    verifyPayment();
  }, [transactionId, toast, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-pulse text-primary font-bold text-xl">Loading Experience...</div>
      </div>
    );
  }

  return (
    <main className="flex flex-col min-h-screen relative">
      {isVerifying && (
        <div className="fixed inset-0 z-[100] bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
          <h2 className="text-xl font-bold text-primary">Verifying Membership...</h2>
        </div>
      )}

      <Hero 
        title={config.heroTitle} 
        subtitle={config.heroSubtitle} 
        imageUrl={resolveAssetUrl(config.heroImageUrl)} 
        buttons={config.heroButtons}
        badge={config.heroBadge}
      />
      
      <div id="tiers">
        <TierSection 
          tiers={config.tiers?.filter(t => !t.hidden)} 
          title={config.pricingTitle} 
          subtitle={config.pricingSubtitle} 
        />
      </div>

      {config.features?.map((feature, index) => (
        <section key={feature.id} className={cn("py-24 border-y", index % 2 === 0 ? "bg-white" : "bg-secondary/10")}>
          <div className="container px-4 mx-auto max-w-6xl">
            <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-16 items-center", !feature.imageRight && "md:flex-row-reverse")}>
              <div className={cn("space-y-6", !feature.imageRight ? "md:order-2" : "md:order-1")}>
                <h2 className="text-4xl font-headline font-bold text-primary">{feature.title}</h2>
                <p className="text-lg text-muted-foreground leading-relaxed">{feature.description}</p>
                {feature.tip && (
                   <div className="flex gap-4 p-4 rounded-xl bg-secondary/30 border border-primary/10 italic">
                     "{feature.tip}"
                   </div>
                )}
              </div>
              <div className={cn("relative aspect-video rounded-3xl overflow-hidden shadow-2xl", !feature.imageRight ? "md:order-1" : "md:order-2")}>
                <img src={resolveAssetUrl(feature.imageUrl) || "https://picsum.photos/seed/cms-preview/800/600"} alt={feature.title} className="object-cover w-full h-full" />
              </div>
            </div>
          </div>
        </section>
      ))}

      <footer className="py-12 bg-secondary/20">
        <div className="container px-4 mx-auto text-center">
          <p className="text-muted-foreground">© 2024 {config.companyName}. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomePageContent />
    </Suspense>
  );
}
