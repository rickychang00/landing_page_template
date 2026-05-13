"use client";

import { Check, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { MembershipTier } from '@/lib/cms-store';
import Link from 'next/link';

interface TierSectionProps {
  tiers: MembershipTier[];
  title?: string;
  subtitle?: string;
}

export function TierSection({ tiers, title, subtitle }: TierSectionProps) {
  // Filter out tiers that are explicitly marked as hidden
  const visibleTiers = tiers.filter(tier => !tier.hidden);

  if (visibleTiers.length === 0) return null;

  return (
    <section className="py-24 bg-secondary/10">
      <div className="container px-4 mx-auto max-w-7xl">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-4xl font-headline font-bold tracking-tight">
            {title || 'Simple, Transparent Pricing'}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {subtitle || 'Choose the membership that best supports your career or business goals.'}
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {visibleTiers.map((tier) => (
            <Card 
              key={tier.id} 
              className={`relative flex flex-col h-full border-2 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${tier.isPopular ? 'border-primary ring-4 ring-primary/5 scale-105 z-10' : 'border-transparent'}`}
            >
              {tier.isPopular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-accent text-accent-foreground text-sm font-bold rounded-full flex items-center gap-1 shadow-md z-20">
                  <Star className="w-4 h-4 fill-current" /> MOST POPULAR
                </div>
              )}
              
              <CardHeader className="pb-8">
                <CardTitle className="text-2xl font-bold">{tier.name}</CardTitle>
                <CardDescription className="text-base mt-2 min-h-[3rem]">{tier.description}</CardDescription>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-5xl font-extrabold tracking-tight">{tier.price}</span>
                  <span className="text-muted-foreground font-medium">
                    {tier.period === 'once' ? ' one-time' : `/${tier.period}`}
                  </span>
                </div>
              </CardHeader>
              
              <CardContent className="flex-grow">
                <ul className="space-y-4">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="mt-1 p-0.5 rounded-full bg-primary/10">
                        <Check className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-sm leading-tight text-foreground/80">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              
              <CardFooter className="pt-8">
                <Link href={`/register?tier=${tier.id}`} className="w-full">
                  <Button 
                    variant={tier.isPopular ? 'default' : 'outline'} 
                    className={`w-full h-auto min-h-[3rem] py-3 px-4 text-base font-bold whitespace-normal transition-all ${tier.isPopular ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg' : 'hover:bg-primary/10 border-primary/20 text-primary hover:text-primary'}`}
                  >
                    Select {tier.name}
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
