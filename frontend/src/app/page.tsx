'use client';

import AppLayout from '@/components/layout/app-layout';
import { Heading } from '@/components/ui/heading';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { Tabs } from '@/components/ui/tabs';
import { Sliders, ArrowUpRight, ChevronDown, Activity, Database, Globe } from 'lucide-react';
import { AssetRow } from '@/components/market/asset-row';
import { SpotMarket } from '@/components/market/spot-market';
import { FuturesMarket } from '@/components/market/futures-market';
import { MyOrders } from '@/components/market/my-orders';
import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { ComponentErrorBoundary } from '@/components/error/error-boundary';

const VALID_TABS = ['Auctions', 'Spot', 'Futures', 'My Orders'] as const;
type TabName = typeof VALID_TABS[number];

export default function Home() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = searchParams.get('tab');
  const initialTab: TabName = VALID_TABS.includes(tabParam as TabName)
    ? (tabParam as TabName)
    : 'Auctions';
  const [activeTab, setActiveTab] = useState<TabName>(initialTab);

  const updateTab = (newTab: string) => {
    const tab = newTab as TabName;
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.push(`/?${params.toString()}`, { scroll: false });
  };
  
  const sampleAssets = [
    {
    id: "SAT-BW-882",
    name: "Ka-Band Spectrum Block",
    type: "Spectrum",
    region: "GEO (95°W)",
    volume: "500 MHz",
    slot: "T-minus 4h",
    price: "$15.4 USDC",
    status: "Active",
    trend: "up" as const,
    icon: <Activity />
    },
    {
    id: "OCS-ALPHA-01",
    name: "Orbital Compute",
    type: "Compute",
    region: "LEO (500km)",
    volume: "64 Cores",
    slot: "Immediate",
    price: "$18.50 USDC/hr",
    status: "Active",
    trend: "up" as const,
    icon: <Database />
    },
    {
    id: "LEO-DEP-04",
    name: "Propellant Storage Unit",
    type: "Storage",
    region: "LEO (500km)",
    volume: "200 kg",
    slot: "Immediate",
    price: "$4.2 USDC",
    status: "Reserved",
    trend: "neutral" as const,
    icon: <Database />
    },
  ];

  return (
    <AppLayout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <Heading level={1}>
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Market Overview</span>
          </Heading>
          <p className="text-muted-foreground mt-2">Real-time lease availability for verified space assets.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={Sliders}>Filters</Button>
          <Link href="/assets/register">
            <Button variant="primary" icon={ArrowUpRight}>List Asset</Button>
          </Link>
        </div>
      </div>

      {/* Market Stats Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          { label: "24H USDC VOLUME", value: "12,459,211" },
          { label: "ACTIVE LEASES", value: "8,422" },
          { label: "NEW LEASES (24H)", value: "147" },
        ].map((stat, i) => (
          <Panel key={i} className="p-4">
            <div className="text-muted-foreground text-xs font-bold uppercase tracking-wider mb-1">{stat.label}</div>
            <div className="text-2xl text-foreground font-mono font-light">{stat.value}</div>
          </Panel>
        ))}
      </div>

      {/* Main List Area */}
      <div className="bg-card rounded-xl">
        <Tabs
          items={["Auctions", "Spot", "Futures", "My Orders"]}
          active={activeTab}
          onChange={updateTab}
        />

        {activeTab === 'Spot' ? (
          <ComponentErrorBoundary>
            <div className="p-4">
              <SpotMarket assets={sampleAssets} />
            </div>
          </ComponentErrorBoundary>
        ) : activeTab === 'Futures' ? (
          <ComponentErrorBoundary>
            <div className="p-4">
              <FuturesMarket assets={sampleAssets} />
            </div>
          </ComponentErrorBoundary>
        ) : activeTab === 'My Orders' ? (
          <ComponentErrorBoundary>
            <div className="p-4">
              <MyOrders />
            </div>
          </ComponentErrorBoundary>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4 px-2">
              <span className="text-sm text-muted-foreground">Showing 3 of 156 assets</span>
              <div className="flex items-center gap-2">
                 <span className="text-sm text-muted-foreground">Sort by:</span>
                 <button className="text-sm text-foreground flex items-center gap-1 hover:text-primary">
                   Price: Low to High <ChevronDown className="w-3 h-3" />
                 </button>
              </div>
            </div>

            <div className="space-y-1">
              {sampleAssets.map((asset) => (
                <AssetRow key={asset.id} data={asset} />
              ))}
            </div>

            <div className="mt-6 flex justify-center">
               <Button variant="ghost">Load More Assets</Button>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
