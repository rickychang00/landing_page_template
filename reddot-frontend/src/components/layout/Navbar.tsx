"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Shield, Settings, User, LogOut, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiClient, isAuthenticated, clearToken, getToken } from '@/lib/api-client';
import { SiteConfig, INITIAL_CONFIG } from '@/lib/cms-store';
import { resolveAssetUrl } from '@/lib/asset-url';

export function Navbar() {
  const [isAuthed, setIsAuthed] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [config, setConfig] = useState<SiteConfig>(INITIAL_CONFIG);

  useEffect(() => {
    const authed = isAuthenticated();
    setIsAuthed(authed);

    if (authed) {
      try {
        const token = getToken();
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          setUserEmail(payload.email ?? null);
        }
      } catch {}
    }

    const fetchConfig = async () => {
      try {
        const data = await apiClient<SiteConfig>('/site-config');
        if (data) setConfig({ ...INITIAL_CONFIG, ...data });
      } catch (e: any) {
        console.warn('[Navbar fetchConfig] failed:', e?.message);
      }
    };
    fetchConfig();

    const poll = setInterval(fetchConfig, 30_000);
    return () => clearInterval(poll);
  }, []);

  useEffect(() => {
    if (config.pageTitle) document.title = config.pageTitle;
    if (config.faviconUrl) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = config.faviconUrl;
    }
  }, [config.pageTitle, config.faviconUrl]);

  const handleSignOut = () => {
    clearToken();
    window.location.href = '/';
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 sm:px-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center space-x-2">
            {config.companyLogoUrl ? (
              <img
                src={resolveAssetUrl(config.companyLogoUrl)}
                alt={config.companyName}
                className="h-8 w-auto object-contain"
              />
            ) : (
              <Shield className="h-6 w-6 text-primary" />
            )}
            <span className="font-headline font-bold text-xl hidden sm:inline-block">
              {config.companyName}
            </span>
          </Link>
          <div className="ml-10 hidden md:flex items-center gap-6">
            {config.navLinks?.map((link) => (
              <Link key={link.id} href={link.href} className="text-sm font-medium hover:text-primary transition-colors">
                {link.label}
              </Link>
            ))}
            {isAuthed && (
              <Link href="/admin" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
                <Settings className="w-4 h-4" /> Admin Panel
              </Link>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {isAuthed ? (
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground px-3 py-1 bg-secondary rounded-full">
                <User className="w-4 h-4" />
                <span className="max-w-[120px] truncate">{userEmail}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground hover:text-destructive">
                <LogOut className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" className="text-sm font-medium flex items-center gap-2">
                  <LogIn className="w-4 h-4" /> Log in
                </Button>
              </Link>
              <Link href="/register">
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg px-6">
                  Get Started
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
