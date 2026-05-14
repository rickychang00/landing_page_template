"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, isAuthenticated, clearToken } from '@/lib/api-client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Trash2,
  Layers,
  Save,
  Lock,
  Image as ImageIcon,
  MessageSquare,
  CreditCard,
  Users,
  RefreshCw,
  Loader2,
  Layout,
  Upload,
  Info,
  Globe,
  CalendarDays,
  Building2,
  Settings2,
  MousePointer2,
  X,
  Menu,
  GripVertical
} from 'lucide-react';
import {
  INITIAL_CONFIG,
  updateSiteConfig,
  SiteConfig,
  MembershipTier,
  FeatureSection,
  TransactionRecord,
  MemberProfile
} from '@/lib/cms-store';
import { resolveAssetUrl } from '@/lib/asset-url';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { requestRDPMITPayment } from '@/app/actions/payment';
import Image from 'next/image';

// Image Upload Component
function ImageUploadField({ value, onChange, label }: { value: string, onChange: (val: string) => void, label: string }) {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // 4 MB — Vercel serverless body limit

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_UPLOAD_BYTES) {
      toast({
        variant: "destructive",
        title: "File Too Large",
        description: `Maximum size is 4 MB. Your file is ${(file.size / 1024 / 1024).toFixed(1)} MB.`,
      });
      e.target.value = '';
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { url } = await apiClient<{ url: string }>('/assets', {
        method: 'POST',
        auth: true,
        body: formData,
      });
      onChange(url);
      toast({ title: "Upload Success" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Upload Failed", description: err?.message ?? 'Unknown error' });
    } finally { setIsUploading(false); }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2 items-center">
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://..." className="flex-1" />
        <div className="relative">
          <Input type="file" className="absolute inset-0 opacity-0 cursor-pointer w-10 h-10" onChange={handleUpload} disabled={isUploading} accept="image/*" />
          <Button variant="outline" size="icon" className="w-10 h-10" disabled={isUploading}>{isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}</Button>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="w-4 h-4 text-muted-foreground cursor-help shrink-0" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Max image size: 4 MB</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);
  const [configLoading, setConfigLoading] = useState(true);

  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [localConfig, setLocalConfig] = useState<SiteConfig>(INITIAL_CONFIG);
  const [isProcessingMIT, setIsProcessingMIT] = useState<string | null>(null);

  useEffect(() => {
    const verifyAuth = async () => {
      if (!isAuthenticated()) { router.push('/login'); return; }
      try {
        await apiClient('/auth/refresh', { auth: true });
        setAuthLoading(false);
      } catch {
        clearToken();
        router.push('/login');
      }
    };
    verifyAuth();
  }, [router]);

  useEffect(() => {
    if (authLoading) return;

    const fetchData = async () => {
      try {
        const [config, txRows, memRows] = await Promise.all([
          apiClient<any>('/site-config', { auth: true }),
          apiClient<any[]>('/transactions', { auth: true }),
          apiClient<any[]>('/members', { auth: true }),
        ]);

        if (config) setLocalConfig({ ...INITIAL_CONFIG, ...config });
        setTransactions(txRows.map(it => ({ ...it, timestamp: it.createdAt })));
        setMembers(memRows.map(it => ({ ...it, registeredAt: it.createdAt })));
      } catch (err: any) {
        console.warn('Fetch failed:', err?.message ?? err);
      } finally {
        setConfigLoading(false);
      }
    };

    fetchData();
    const pollInterval = setInterval(fetchData, 30_000);
    return () => clearInterval(pollInterval);
  }, [authLoading]);

  const handleSave = async () => {
    try {
      await updateSiteConfig(localConfig);
      toast({ title: "Settings Published", description: "Your master template has been updated." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Save Failed", description: err?.message });
    }
  };

  const addTier = () => {
    const newTier: MembershipTier = {
      id: `tier_${Date.now()}`,
      name: 'New Membership Tier',
      price: '$99',
      period: 'month',
      description: 'Describe the value proposition of this tier.',
      features: ['Feature 1', 'Feature 2'],
      color: '#000000',
      hidden: false
    };
    setLocalConfig({...localConfig, tiers: [...localConfig.tiers, newTier]});
  };

  const handleTriggerMIT = async (member: MemberProfile) => {
    const tier = localConfig.tiers.find(t => t.id === member.tierId);
    if (!tier || !member.lastTransactionId || !member.payerId) return;
    const amount = parseInt(tier.price.replace(/[^0-9]/g, ''));
    setIsProcessingMIT(member.id || null);
    try {
      const response = await requestRDPMITPayment({
        payerName: member.name, payerEmail: member.email,
        orderId: `M${member.id?.slice(-6)}${Date.now()}`,
        amount: amount, parentTransactionId: member.lastTransactionId, payerId: member.payerId
      });
      if (response.success) toast({ title: "MIT Successful" });
      else toast({ variant: "destructive", title: "MIT Rejected", description: response.error });
    } catch (err: any) { toast({ variant: "destructive", title: "API Failure", description: err.message }); }
    finally { setIsProcessingMIT(null); }
  };

  if (authLoading || configLoading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="container px-4 py-12 mx-auto max-w-6xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-headline font-bold flex items-center gap-3">
            <Lock className="w-8 h-8 text-primary" /> Admin Control Hub
          </h1>
          <p className="text-muted-foreground mt-1 text-lg">Template Management</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="lg" onClick={handleSave} className="flex gap-2 shadow-xl h-14 px-8 rounded-2xl bg-primary text-primary-foreground font-bold hover:scale-105 transition-transform">
            <Save className="w-6 h-6" /> Publish Changes
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-5 h-5 text-muted-foreground cursor-help shrink-0" />
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-64">
                <p className="font-semibold mb-1">After publishing:</p>
                <ul className="text-xs space-y-1">
                  <li>• Content &amp; settings — live within 30 s</li>
                  <li>• Page title — updates within 30 s</li>
                  <li>• Favicon — takes effect on next page load</li>
                  <li className="text-muted-foreground pl-2">(hard refresh to update existing tabs)</li>
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <Tabs defaultValue="landing" className="space-y-8">
        <TabsList className="bg-muted/50 p-1 rounded-2xl h-14">
          <TabsTrigger value="landing" className="px-8 h-full rounded-xl flex gap-2"><Layers className="w-5 h-5" /> Landing</TabsTrigger>
          <TabsTrigger value="transactions" className="px-8 h-full rounded-xl flex gap-2"><CreditCard className="w-5 h-5" /> Payments</TabsTrigger>
          <TabsTrigger value="members" className="px-8 h-full rounded-xl flex gap-2"><Users className="w-5 h-5" /> Members</TabsTrigger>
        </TabsList>

        <TabsContent value="landing" className="space-y-12">
          {/* 0. NAVIGATION MANAGEMENT */}
          <Card className="border-2 border-primary/10">
            <CardHeader className="bg-primary/5 border-b flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <Menu className="w-6 h-6 text-primary" />
                <div>
                  <CardTitle>Top Navigation Bar</CardTitle>
                  <CardDescription>Manage links that appear in the top header.</CardDescription>
                </div>
              </div>
              <Button onClick={() => setLocalConfig({...localConfig, navLinks: [...(localConfig.navLinks || []), { id: `nav_${Date.now()}`, label: 'New Link', href: '#' }]})} variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" /> Add Link
              </Button>
            </CardHeader>
            <CardContent className="p-8">
               <div className="space-y-4">
                  {localConfig.navLinks?.map((link, idx) => (
                    <div key={link.id} className="flex items-center gap-4 p-4 border rounded-xl bg-muted/5 group">
                       <GripVertical className="w-5 h-5 text-muted-foreground/30" />
                       <div className="grid grid-cols-2 gap-4 flex-1">
                          <div className="space-y-1">
                             <Label className="text-[10px] uppercase font-bold text-muted-foreground">Label</Label>
                             <Input value={link.label} onChange={(e) => {
                                const newLinks = [...localConfig.navLinks];
                                newLinks[idx].label = e.target.value;
                                setLocalConfig({...localConfig, navLinks: newLinks});
                             }} />
                          </div>
                          <div className="space-y-1">
                             <Label className="text-[10px] uppercase font-bold text-muted-foreground">Href (Link)</Label>
                             <Input value={link.href} onChange={(e) => {
                                const newLinks = [...localConfig.navLinks];
                                newLinks[idx].href = e.target.value;
                                setLocalConfig({...localConfig, navLinks: newLinks});
                             }} />
                          </div>
                       </div>
                       <Button variant="ghost" size="icon" className="text-destructive opacity-0 group-hover:opacity-100" onClick={() => {
                          setLocalConfig({...localConfig, navLinks: localConfig.navLinks.filter(l => l.id !== link.id)});
                       }}>
                          <Trash2 className="w-4 h-4" />
                       </Button>
                    </div>
                  ))}
               </div>
            </CardContent>
          </Card>

          {/* 1. PROJECT IDENTITY */}
          <Card className="border-2 border-primary/10">
            <CardHeader className="bg-primary/5 border-b flex flex-row items-center gap-3">
              <Building2 className="w-6 h-6 text-primary" />
              <div>
                <CardTitle>Company Identity</CardTitle>
                <CardDescription>Configure your global branding across the template.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="space-y-2"><Label>Company Name</Label><Input value={localConfig.companyName} onChange={(e) => setLocalConfig({...localConfig, companyName: e.target.value})} placeholder="e.g. Acme Hub" /></div>
                  <ImageUploadField label="Logo Image URL" value={localConfig.companyLogoUrl} onChange={(val) => setLocalConfig({...localConfig, companyLogoUrl: val})} />
                </div>
                <div className="flex flex-col items-center justify-center p-6 bg-muted/20 border-2 border-dashed rounded-2xl">
                   <p className="text-xs text-muted-foreground mb-4 uppercase font-bold tracking-widest">Logo Preview</p>
                   <div className="relative w-32 h-32 bg-white rounded-xl shadow-md flex items-center justify-center overflow-hidden">
                      {localConfig.companyLogoUrl ? (
                        <Image src={resolveAssetUrl(localConfig.companyLogoUrl)} alt="Logo" fill unoptimized className="object-contain p-4" />
                      ) : (
                        <Building2 className="w-12 h-12 text-muted/30" />
                      )}
                   </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2. BROWSER TAB & SEO */}
          <Card className="border-2 border-primary/10">
            <CardHeader className="bg-primary/5 border-b flex flex-row items-center gap-3">
              <Globe className="w-6 h-6 text-primary" />
              <div>
                <CardTitle>Browser Tab &amp; SEO</CardTitle>
                <CardDescription>Controls the page title, description, and favicon shown in browser tabs and search results.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-4">
              <div className="space-y-2">
                <Label>Page Title</Label>
                <Input value={localConfig.pageTitle} onChange={(e) => setLocalConfig({...localConfig, pageTitle: e.target.value})} placeholder="e.g. Tiered Access Hub" />
              </div>
              <div className="space-y-2">
                <Label>Page Description</Label>
                <Textarea value={localConfig.pageDescription} onChange={(e) => setLocalConfig({...localConfig, pageDescription: e.target.value})} placeholder="Short description shown in search engine results." rows={3} />
              </div>
              <ImageUploadField label="Favicon URL (.ico or .png, square)" value={localConfig.faviconUrl} onChange={(val) => setLocalConfig({...localConfig, faviconUrl: val})} />
            </CardContent>
          </Card>

          {/* 3. HERO SECTION */}
          <Card className="border-2 border-primary/10">
            <CardHeader className="bg-primary/5 border-b flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <ImageIcon className="w-6 h-6 text-primary" />
                <div>
                  <CardTitle>Hero Banner & Buttons</CardTitle>
                  <CardDescription>Update your main landing page headline and call-to-actions.</CardDescription>
                </div>
              </div>
              <Button onClick={() => setLocalConfig({...localConfig, heroButtons: [...(localConfig.heroButtons || []), { id: `hbtn_${Date.now()}`, label: 'Action', href: '#' }]})} variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" /> Add Button
              </Button>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="space-y-2"><Label>Hero Badge Text (Optional)</Label><Input placeholder="e.g. PREMIUM HUB" value={localConfig.heroBadge} onChange={(e) => setLocalConfig({...localConfig, heroBadge: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Main Headline</Label><Input className="text-xl font-bold h-12" value={localConfig.heroTitle} onChange={(e) => setLocalConfig({...localConfig, heroTitle: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Sub Headline</Label><Textarea rows={3} value={localConfig.heroSubtitle} onChange={(e) => setLocalConfig({...localConfig, heroSubtitle: e.target.value})} /></div>
                  
                  <div className="space-y-4">
                     <Label className="flex items-center gap-2"><MousePointer2 className="w-4 h-4" /> Call-to-Action Buttons</Label>
                     {localConfig.heroButtons?.map((btn, idx) => (
                       <div key={btn.id} className="flex items-center gap-3 p-3 border rounded-xl bg-muted/5 group">
                          <div className="grid grid-cols-2 gap-2 flex-1">
                             <Input placeholder="Label" value={btn.label} onChange={(e) => {
                                const newBtns = [...localConfig.heroButtons];
                                newBtns[idx].label = e.target.value;
                                setLocalConfig({...localConfig, heroButtons: newBtns});
                             }} />
                             <Input placeholder="Link" value={btn.href} onChange={(e) => {
                                const newBtns = [...localConfig.heroButtons];
                                newBtns[idx].href = e.target.value;
                                setLocalConfig({...localConfig, heroButtons: newBtns});
                             }} />
                          </div>
                          <Button variant="ghost" size="icon" className="text-destructive h-8 w-8 opacity-0 group-hover:opacity-100" onClick={() => {
                             setLocalConfig({...localConfig, heroButtons: localConfig.heroButtons.filter(b => b.id !== btn.id)});
                          }}>
                             <Trash2 className="w-4 h-4" />
                          </Button>
                       </div>
                     ))}
                  </div>

                  <ImageUploadField label="Hero Background Image URL" value={localConfig.heroImageUrl} onChange={(val) => setLocalConfig({...localConfig, heroImageUrl: val})} />
                </div>
                <div className="relative aspect-video rounded-2xl overflow-hidden border-4 border-white shadow-2xl">
                  <Image src={resolveAssetUrl(localConfig.heroImageUrl)} alt="Preview" fill unoptimized className="object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center p-8 text-center">
                      {localConfig.heroBadge && (
                        <div className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[8px] font-bold border border-white/20 mb-2">
                           {localConfig.heroBadge}
                        </div>
                      )}
                      <h4 className="text-white text-xl font-bold mb-2">{localConfig.heroTitle}</h4>
                      <p className="text-white/80 text-[10px] max-w-[200px] line-clamp-2">{localConfig.heroSubtitle}</p>
                      <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                         {localConfig.heroButtons?.map((btn, i) => (
                           <div key={i} className={`px-4 py-1 rounded text-[10px] font-bold ${i === 0 ? 'bg-primary text-white' : 'bg-white/20 text-white border border-white/30'}`}>
                              {btn.label}
                           </div>
                         ))}
                      </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 3. FEATURE SECTIONS */}
          <div className="space-y-6">
            <div className="flex justify-between items-center">
               <h2 className="text-2xl font-bold flex items-center gap-2"><MessageSquare className="w-6 h-6 text-primary" /> Feature Sections</h2>
               <Button onClick={() => setLocalConfig({...localConfig, features: [...localConfig.features, { id: `f_${Date.now()}`, title: '', description: '', imageUrl: '', tip: '', imageRight: true }]})} variant="outline" className="rounded-xl h-10 border-primary text-primary hover:bg-primary/5">
                 <Plus className="w-4 h-4 mr-2" /> Add Section
               </Button>
            </div>
            {localConfig.features.map((feature, idx) => (
              <Card key={feature.id} className="border-2 border-primary/10 overflow-hidden group">
                <CardHeader className="flex flex-row items-center justify-between py-4 bg-muted/30 group-hover:bg-primary/5 transition-colors">
                  <CardTitle className="text-lg">Section #{idx + 1}</CardTitle>
                  <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => setLocalConfig({...localConfig, features: localConfig.features.filter(f => f.id !== feature.id)})}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                   <div className="grid md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <div className="space-y-2"><Label>Title</Label><Input value={feature.title} onChange={(e) => setLocalConfig({...localConfig, features: localConfig.features.map(f => f.id === feature.id ? {...f, title: e.target.value} : f)})} /></div>
                        <div className="space-y-2"><Label>Description</Label><Textarea rows={4} value={feature.description} onChange={(e) => setLocalConfig({...localConfig, features: localConfig.features.map(f => f.id === feature.id ? {...f, description: e.target.value} : f)})} /></div>
                        <div className="space-y-2"><Label>Pro Tip (Optional)</Label><Input value={feature.tip} onChange={(e) => setLocalConfig({...localConfig, features: localConfig.features.map(f => f.id === feature.id ? {...f, tip: e.target.value} : f)})} /></div>
                      </div>
                      <div className="space-y-4">
                        <ImageUploadField label="Image URL" value={feature.imageUrl} onChange={(val) => setLocalConfig({...localConfig, features: localConfig.features.map(f => f.id === feature.id ? {...f, imageUrl: val} : f)})} />
                        <div className="relative aspect-video rounded-xl overflow-hidden border-2 bg-muted/10 shadow-sm"><Image src={resolveAssetUrl(feature.imageUrl) || 'https://picsum.photos/800/600'} alt="Preview" fill unoptimized className="object-cover" /></div>
                        <div className="flex items-center justify-between p-4 border rounded-xl bg-muted/20">
                          <Label>Image Position</Label>
                          <div className="flex items-center gap-4">
                             <span className="text-xs font-bold">{feature.imageRight ? 'RIGHT' : 'LEFT'}</span>
                             <Switch checked={feature.imageRight} onCheckedChange={(val) => setLocalConfig({...localConfig, features: localConfig.features.map(f => f.id === feature.id ? {...f, imageRight: val} : f)})} />
                          </div>
                        </div>
                      </div>
                   </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 4. PRICING SECTION */}
          <div className="space-y-8">
             <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold flex items-center gap-2"><Layout className="w-6 h-6 text-primary" /> Pricing & Tiers</h2>
                <Button onClick={addTier} variant="outline" className="rounded-xl h-10 border-primary text-primary hover:bg-primary/5">
                   <Plus className="w-4 h-4 mr-2" /> Add Tier
                </Button>
             </div>
             
             <Card className="border-2 border-primary/10">
                <CardHeader className="bg-primary/5 border-b"><CardTitle className="text-lg">Pricing Header</CardTitle></CardHeader>
                <CardContent className="p-8 space-y-4">
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-2"><Label>Section Title</Label><Input value={localConfig.pricingTitle} onChange={(e) => setLocalConfig({...localConfig, pricingTitle: e.target.value})} /></div>
                    <div className="space-y-2"><Label>Section Subtitle</Label><Input value={localConfig.pricingSubtitle} onChange={(e) => setLocalConfig({...localConfig, pricingSubtitle: e.target.value})} /></div>
                  </div>
                </CardContent>
             </Card>

             <div className="grid md:grid-cols-3 gap-8">
               {localConfig.tiers.map((tier) => (
                 <Card key={tier.id} className={`border-2 transition-all ${tier.hidden ? 'opacity-60 bg-muted/10' : 'border-primary/10 shadow-md hover:shadow-xl'}`}>
                   <CardHeader className="border-b bg-muted/20">
                      <div className="flex justify-between items-center mb-2">
                         <Badge variant={tier.hidden ? "outline" : "default"} className={tier.hidden ? "" : "bg-green-500"}>
                            {tier.hidden ? 'HIDDEN' : 'VISIBLE'}
                         </Badge>
                         <Switch checked={!tier.hidden} onCheckedChange={(val) => setLocalConfig({...localConfig, tiers: localConfig.tiers.map(t => t.id === tier.id ? {...t, hidden: !val} : t)})} />
                      </div>
                      <CardTitle className="flex justify-between items-center group">
                        <Input className="border-none bg-transparent font-bold text-xl p-0 h-auto focus-visible:ring-0" value={tier.name} onChange={(e) => setLocalConfig({...localConfig, tiers: localConfig.tiers.map(t => t.id === tier.id ? {...t, name: e.target.value} : t)})} />
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 text-destructive h-8 w-8" onClick={() => setLocalConfig({...localConfig, tiers: localConfig.tiers.filter(t => t.id !== tier.id)})}>
                           <Trash2 className="w-4 h-4" />
                        </Button>
                      </CardTitle>
                   </CardHeader>
                   <CardContent className="p-6 space-y-6">
                      <div className="flex gap-2">
                        <div className="space-y-2 flex-1"><Label>Price String</Label><Input className="text-lg font-bold" value={tier.price} onChange={(e) => setLocalConfig({...localConfig, tiers: localConfig.tiers.map(t => t.id === tier.id ? {...t, price: e.target.value} : t)})} /></div>
                        <div className="space-y-2 w-28"><Label>Billing</Label>
                          <Select value={tier.period} onValueChange={(val) => setLocalConfig({...localConfig, tiers: localConfig.tiers.map(t => t.id === tier.id ? {...t, period: val as any} : t)})}>
                            <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="month">Monthly</SelectItem><SelectItem value="year">Yearly</SelectItem><SelectItem value="once">One-time</SelectItem></SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2"><Label>Description</Label><Textarea rows={2} value={tier.description} onChange={(e) => setLocalConfig({...localConfig, tiers: localConfig.tiers.map(t => t.id === tier.id ? {...t, description: e.target.value} : t)})} /></div>
                      <div className="space-y-2">
                         <div className="flex justify-between items-center mb-1">
                            <Label>Key Features</Label>
                            <Button variant="ghost" size="sm" className="h-6 text-[10px] uppercase font-bold text-primary" onClick={() => setLocalConfig({...localConfig, tiers: localConfig.tiers.map(t => t.id === tier.id ? {...t, features: [...t.features, 'New feature']} : t)})}>+ Add Feature</Button>
                         </div>
                         <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                            {tier.features.map((f, i) => (
                              <div key={i} className="flex gap-2 group/feat">
                                <Input className="h-8 text-xs" value={f} onChange={(e) => {
                                   const newFeat = [...tier.features];
                                   newFeat[i] = e.target.value;
                                   setLocalConfig({...localConfig, tiers: localConfig.tiers.map(t => t.id === tier.id ? {...t, features: newFeat} : t)});
                                }} />
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-0 group-hover/feat:opacity-100" onClick={() => {
                                   const newFeat = tier.features.filter((_, idx) => idx !== i);
                                   setLocalConfig({...localConfig, tiers: localConfig.tiers.map(t => t.id === tier.id ? {...t, features: newFeat} : t)});
                                }}><X className="w-3 h-3" /></Button>
                              </div>
                            ))}
                         </div>
                      </div>
                   </CardContent>
                 </Card>
               ))}
             </div>
          </div>
        </TabsContent>

        {/* PAYMENTS TAB */}
        <TabsContent value="transactions">
           <Card className="border-2 border-primary/10 shadow-lg">
              <CardHeader className="bg-primary/5 border-b flex flex-row items-center justify-between">
                 <div>
                   <CardTitle className="text-2xl font-bold">Payments Ledger</CardTitle>
                   <CardDescription>Live audit of all Red Dot Payment transactions.</CardDescription>
                 </div>
                 <RefreshCw className="w-6 h-6 text-primary/30" />
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/30"><TableRow><TableHead className="w-48 pl-8">Timestamp</TableHead><TableHead>Member</TableHead><TableHead>Amount</TableHead><TableHead>Type</TableHead><TableHead className="pr-8">Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {transactions.map((tx, idx) => (
                      <TableRow key={idx} className="hover:bg-muted/10">
                        <TableCell className="text-xs text-muted-foreground pl-8">{new Date(tx.timestamp!).toLocaleString()}</TableCell>
                        <TableCell className="font-bold text-foreground">{tx.memberName}</TableCell>
                        <TableCell className="font-black text-primary">{tx.amount}</TableCell>
                        <TableCell><Badge variant="secondary" className="font-bold rounded-md px-2">{tx.type}</Badge></TableCell>
                        <TableCell className="pr-8"><Badge className={tx.status === 'success' ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-red-100 text-red-700 hover:bg-red-100"}>{tx.status.toUpperCase()}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
           </Card>
        </TabsContent>

        {/* MEMBERS TAB */}
        <TabsContent value="members">
           <Card className="border-2 border-primary/10 shadow-lg">
              <CardHeader className="bg-primary/5 border-b">
                 <CardTitle className="text-2xl font-bold">Active Hub Members</CardTitle>
                 <CardDescription>Manage your registered users and authorize automated billing (MIT).</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/30"><TableRow><TableHead className="pl-8">Name</TableHead><TableHead>Email</TableHead><TableHead>Payer ID</TableHead><TableHead>Next Charge</TableHead><TableHead className="pr-8">Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {members.map((member, idx) => {
                      const tier = localConfig.tiers.find(t => t.id === member.tierId);
                      const isOneTime = tier?.period === 'once';
                      const isActive = member.paymentStatus === 'active';
                      return (
                        <TableRow key={idx} className="hover:bg-muted/10">
                          <TableCell className="font-bold text-foreground pl-8">{member.name}</TableCell>
                          <TableCell className="text-muted-foreground">{member.email}</TableCell>
                          <TableCell className="font-mono text-[10px] text-muted-foreground">{member.payerId || 'N/A'}</TableCell>
                          <TableCell>
                             {isOneTime ? (
                               <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">one-time payment</Badge>
                             ) : !isActive ? (
                               <Badge variant="outline" className="text-muted-foreground italic">No Active Subscription</Badge>
                             ) : (
                               <div className="flex items-center gap-3">
                                  <div className="flex flex-col">
                                    <span className="text-sm font-black text-primary flex items-center gap-1.5"><CalendarDays className="w-3 h-3" />{member.nextChargeAt ? new Date(member.nextChargeAt).toLocaleDateString() : 'TBD'}</span>
                                    <div className="flex gap-1 mt-0.5">
                                      <Badge className="text-[8px] h-3 px-1 bg-primary/10 text-primary border-none">SCHEDULED</Badge>
                                      <Badge className="text-[8px] h-3 px-1 bg-primary/10 text-primary border-none uppercase">{tier?.period}</Badge>
                                    </div>
                                  </div>
                               </div>
                             )}
                          </TableCell>
                          <TableCell className="pr-8">
                            {member.payerId && !isOneTime && (
                              <Button size="sm" variant="outline" className="border-primary text-primary hover:bg-primary text-xs font-bold h-9 rounded-lg" disabled={isProcessingMIT === member.id} onClick={() => handleTriggerMIT(member)}>
                                {isProcessingMIT === member.id ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <RefreshCw className="w-3 h-3 mr-2" />} Trigger MIT
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
           </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
