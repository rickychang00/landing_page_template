"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { INITIAL_CONFIG, SiteConfig, MemberProfile, saveMember } from '@/lib/cms-store';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Suspense, useMemo, useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { requestRDPPaymentURL } from '@/app/actions/payment';
import { updateMember } from '@/app/actions/members';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, isSameDay } from "date-fns";
import { CalendarIcon, ArrowLeft, Loader2, Info } from 'lucide-react';
import { cn } from "@/lib/utils";

function RegisterFormContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tierId = searchParams.get('tier') || 'innovation';
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [config, setConfig] = useState<SiteConfig>(INITIAL_CONFIG);
  const [takenDateStrings, setTakenDateStrings] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [configData, dates] = await Promise.all([
          apiClient<SiteConfig>('/site-config'),
          apiClient<string[]>('/members/taken-dates'),
        ]);
        if (configData) setConfig(configData);
        if (dates) setTakenDateStrings(dates);
      } catch (e) {} finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const tier = config.tiers.find(t => t.id === tierId) || config.tiers[0];

  const takenDates = useMemo(() => {
    return takenDateStrings.map(d => new Date(d));
  }, [takenDateStrings]);

  const formSchema = useMemo(() => {
    const shape: any = {};
    config.registrationFields.forEach(f => {
      shape[f.id] = f.required ? z.string().min(1) : z.string().optional();
    });
    shape.selectedDate = z.date();
    return z.object(shape);
  }, [config.registrationFields]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { full_name: "John Doe", email: "john@example.com", selectedDate: undefined as any },
  });

  if (loading) return <div className="text-center py-32">Loading Configuration...</div>;

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      const dateStr = format(values.selectedDate, 'yyyy-MM-dd');
      const isTaken = takenDateStrings.includes(dateStr);
      if (isTaken) {
        toast({ variant: "destructive", title: "Date Taken" });
        return;
      }

      const amount = parseInt(tier.price.replace(/[^0-9]/g, ''));
      const recurringMod = tier.period === 'once' ? undefined : "2";

      // 1. Create member
      const record = await saveMember({
        name: values.full_name,
        email: values.email,
        tierId: tier.id,
        hasPaymentConsent: true,
        selectedDate: dateStr,
        orderId: "",
      });

      // 2. Derive a short order ID (RDP max 20 chars) from the member UUID
      const orderId = record.id!.replace(/-/g, '').slice(0, 20);
      await updateMember(record.id!, { orderId });

      // 3. Request RDP URL
      const result = await requestRDPPaymentURL({
        payerName: values.full_name,
        payerEmail: values.email,
        orderId,
        amount: amount,
        recurringMod: recurringMod
      });

      if (result.success && result.paymentUrl) {
        window.location.href = result.paymentUrl;
      } else {
        toast({ variant: "destructive", title: "Gateway Error", description: result.error });
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "System Error", description: e.message });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="container px-4 py-16 mx-auto max-w-4xl">
      <Link href="/" className="inline-flex items-center text-sm mb-8"><ArrowLeft className="w-4 h-4 mr-2" /> Back</Link>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
        <div className="lg:col-span-3">
          <Card className="shadow-2xl">
            <CardHeader><CardTitle>Registration</CardTitle></CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {config.registrationFields.map((field) => (
                    <FormField key={field.id} control={form.control} name={field.id as any} render={({ field: f }) => (
                        <FormItem>
                          <FormLabel>{field.label}</FormLabel>
                          <FormControl><Input {...f} className="h-12" /></FormControl>
                          <FormMessage />
                        </FormItem>
                    )} />
                  ))}
                  <FormField control={form.control} name="selectedDate" render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl><Button variant="outline" className="h-12 w-full text-left">{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(d) => d < new Date() || takenDates.some(td => isSameDay(d, td))} /></PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                  )} />
                  <Button type="submit" size="lg" className="w-full h-14 font-bold" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="animate-spin" /> : 'Register & Pay'}</Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-2">
           <Card className="bg-primary/5 border-primary/20 p-6">
              <h4 className="font-bold text-lg">{tier.name}</h4>
              <p className="text-2xl font-bold mt-2">{tier.price}</p>
           </Card>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegisterFormContent />
    </Suspense>
  );
}
