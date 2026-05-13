import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ChevronRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { NavLink } from '@/lib/cms-store';
import { resolveAssetUrl } from '@/lib/asset-url';

interface HeroProps {
  title: string;
  subtitle: string;
  imageUrl?: string;
  buttons?: NavLink[];
  badge?: string;
}

export function Hero({ title, subtitle, imageUrl, buttons, badge }: HeroProps) {
  const defaultHero = "https://picsum.photos/seed/tiered-hero/1200/800";
  const bgImage = resolveAssetUrl(imageUrl) || defaultHero;

  return (
    <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
      {/* Background Image with optimized Next.js Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src={bgImage}
          alt="Hero Banner Background"
          fill
          unoptimized
          className="object-cover"
          priority
        />
        {/* Modern Overlay: Darker at bottom for readability, subtle tint throughout */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60 z-10" />
      </div>

      <div className="container relative z-20 px-4 mx-auto text-center">
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in zoom-in duration-1000">
          {badge && (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-sm font-semibold tracking-wide">
              <Sparkles className="w-4 h-4 text-accent" />
              <span>{badge}</span>
            </div>
          )}
          
          <h1 className="text-5xl md:text-8xl font-headline font-black tracking-tight text-white drop-shadow-2xl leading-[1.05]">
            {title}
          </h1>
          
          <p className="text-xl md:text-2xl text-white/90 font-medium leading-relaxed max-w-2xl mx-auto drop-shadow-md">
            {subtitle}
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-6">
            {buttons && buttons.length > 0 ? (
              buttons.map((btn, i) => (
                <Link key={btn.id} href={btn.href} className="w-full sm:w-auto">
                  <Button 
                    size="lg" 
                    variant={i === 0 ? "default" : "outline"}
                    className={i === 0 
                      ? "w-full h-16 px-10 text-xl font-bold bg-primary hover:bg-primary/90 text-white rounded-2xl shadow-2xl transition-all hover:scale-105 active:scale-95"
                      : "w-full h-16 px-10 text-xl font-bold bg-white/10 backdrop-blur-md border-white/30 text-white hover:bg-white/20 rounded-2xl transition-all"
                    }
                  >
                    {btn.label} {i === 0 && <ChevronRight className="ml-2 w-6 h-6" />}
                  </Button>
                </Link>
              ))
            ) : (
              <Link href="/register" className="w-full sm:w-auto">
                <Button size="lg" className="w-full h-16 px-10 text-xl font-bold bg-primary hover:bg-primary/90 text-white rounded-2xl shadow-2xl transition-all hover:scale-105 active:scale-95">
                  Join Now <ChevronRight className="ml-2 w-6 h-6" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
      
      {/* Decorative Gradient Blur */}
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-primary/20 rounded-full blur-[120px] z-10" />
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-accent/10 rounded-full blur-[120px] z-10" />
    </section>
  );
}
