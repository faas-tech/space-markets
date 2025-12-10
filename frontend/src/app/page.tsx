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

export default function Home() {
  const [activeTab, setActiveTab] = useState("Auctions");
  
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
          <Heading level={1}>Market Overview</Heading>
          <p className="text-slate-400 mt-2">Real-time lease availability for verified space assets.</p>
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
          { label: "24H USDC VOLUME", value: "12,459,211.5" },
          { label: "ACTIVE LEASES", value: "8,422" },
          { label: "NEW LEASES (24H)", value: "147" },
        ].map((stat, i) => (
          <Panel key={i} className="p-4">
            <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{stat.label}</div>
            <div className="text-2xl text-white font-mono font-light">{stat.value}</div>
          </Panel>
        ))}
      </div>

      {/* Main List Area */}
      <div className="bg-slate-950 rounded-xl">
        <Tabs
          items={["Auctions", "Spot", "Futures", "My Orders"]}
          active={activeTab}
          onChange={setActiveTab}
        />

        {activeTab === 'Spot' ? (
          <div className="p-4">
            <SpotMarket assets={sampleAssets} />
          </div>
        ) : activeTab === 'Futures' ? (
          <div className="p-4">
            <FuturesMarket assets={sampleAssets} />
          </div>
        ) : activeTab === 'My Orders' ? (
          <div className="p-4">
            <MyOrders />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4 px-2">
              <span className="text-sm text-slate-400">Showing 3 of 156 assets</span>
              <div className="flex items-center gap-2">
                 <span className="text-sm text-slate-500">Sort by:</span>
                 <button className="text-sm text-white flex items-center gap-1 hover:text-blue-400">
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
