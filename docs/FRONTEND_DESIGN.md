Space Markets: The Orbital Design System
This document outlines the visual language and component library for the Space Markets platform. It is designed to be a "Dark Mode First" regulated financial interface.

**Last Updated:** 2025-12-08 (Added marketplace bidding workflow)

## System Workflows

The Asset Leasing Protocol supports the following core user workflows:

1. **Asset Registration** - Asset owners tokenize real-world assets and receive ERC-20 tokens
2. **Lease Offer Creation** - Token holders post lease offers with terms (rent, period, deposit)
3. **Marketplace Bidding** (NEW) - Competitive bidding with EIP-712 signatures:
   - Bidders place bids with USDC escrow
   - Each bid includes a cryptographic signature proving lease agreement
   - Lessor accepts winning bid → Lease NFT minted to lessee
   - Losing bids automatically refunded
4. **Revenue Distribution** - Token holders claim proportional share of escrow/rent
5. **X402 Streaming Payments** - Lessees pay per-second for compute usage

### Marketplace Bidding Flow

```
Bidder                          Marketplace                      Lessor
  |                                  |                              |
  | 1. placeBid(offerId, sig, $)    |                              |
  |--------------------------------->|                              |
  |    [EIP-712 signature]          |                              |
  |    [USDC escrow locked]         |                              |
  |                                  | 2. acceptBid(offerId, idx)  |
  |                                  |<-----------------------------|
  |                                  |    [EIP-712 signature]      |
  |                                  |                              |
  | 3. Lease NFT minted ✓           |                              |
  |<---------------------------------|                              |
  | 4. Escrow → token holders ✓     |----------------------------->|
  | 5. Losing bids refunded ✓       |                              |
```

**Critical Technical Detail:** The frontend must use **manual EIP-712 encoding** to match Solidity's `abi.encode()` behavior. Ethers.js `TypedDataEncoder` will generate invalid signatures for nested structs. See [FRONTEND_INTEGRATION_GUIDE.md](./FRONTEND_INTEGRATION_GUIDE.md#3-marketplace-bidding-workflow-eip-712-signatures) for implementation.

---

1. Visual Identity & Tokens
   The visual style relies on three core pillars:

Deep Space: Backgrounds are not just black, but deep slate/navy (slate-950) to reduce eye strain during long trading sessions.

Glassmorphism: UI elements use semi-transparent backgrounds with blurs to imply depth and hierarchy (Layer 2 scaling metaphor).

Data Density: High-contrast monospace fonts are used for numerical data (prices, coordinates, mass).

Color Palette (Tailwind Mapping)
Background: bg-slate-950 (Main), bg-slate-900 (Secondary/Panels)

Surface: bg-slate-900/50 + backdrop-blur

Borders: border-slate-800 (Default), border-blue-500/50 (Active/Glow)

Primary: text-blue-500, bg-blue-600 (Action)

Semantic: text-emerald-400 (Buy/Long), text-rose-400 (Sell/Short)

2. React Implementation
   Copy the code below into a file named SpaceMarketsSystem.tsx. This file contains the Design System primitives, followed by a Trading Dashboard built using those primitives.

import React, { useState } from 'react';
import {
Activity, Search, Bell, Menu, X, ChevronDown,
ArrowUpRight, ArrowDownRight, Filter, Settings,
Database, Globe, Clock, Shield, Sliders
} from 'lucide-react';
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// --- UTILITIES ---
function cn(...inputs: ClassValue[]) {
return twMerge(clsx(inputs));
}

// ==========================================
// PART 1: ATOMIC DESIGN SYSTEM (The Primitives)
// ==========================================

/\*\*

- 1.  Typography
- Standardized headings and data display to ensure hierarchy.
  \*/
  const Heading = ({ level = 1, className, children }: { level?: 1|2|3|4, className?: string, children: React.ReactNode }) => {
  const styles = {
  1: "text-3xl font-bold tracking-tight text-white",
  2: "text-xl font-semibold tracking-tight text-white",
  3: "text-lg font-medium text-slate-200",
  4: "text-sm font-semibold uppercase tracking-wider text-slate-500"
  };
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;
  return <Tag className={cn(styles[level], className)}>{children}</Tag>;
  };

const DataText = ({ value, label, trend }: { value: string, label?: string, trend?: 'up' | 'down' | 'neutral' }) => (

  <div className="flex flex-col">
    {label && <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">{label}</span>}
    <div className="flex items-center gap-2">
      <span className="font-mono text-slate-100 font-medium">{value}</span>
      {trend === 'up' && <ArrowUpRight className="w-3 h-3 text-emerald-500" />}
      {trend === 'down' && <ArrowDownRight className="w-3 h-3 text-rose-500" />}
    </div>
  </div>
);

/\*\*

- 2.  Surfaces & Containers
- The "Glass" effect used throughout the app.
\*/
const Panel = ({ className, children, hoverEffect = false }: { className?: string, children: React.ReactNode, hoverEffect?: boolean }) => (
  <div className={cn(
    "bg-slate-900/40 backdrop-blur-md border border-slate-800/60 rounded-xl",
    hoverEffect && "transition-all duration-300 hover:border-slate-600 hover:bg-slate-900/60 hover:shadow-lg hover:shadow-blue-900/10",
    className
  )}>
    {children}
  </div>
);

const Divider = () => <div className="h-px w-full bg-slate-800/80 my-4" />;

/\*\*

- 3.  Interactive Elements
- Buttons, Inputs, Tabs, and Badges.
  \*/
  const Button = ({ variant = 'primary', size = 'md', className, children, icon: Icon, ...props }: any) => {
  const variants = {
  primary: "bg-blue-600 text-white hover:bg-blue-500 shadow-[0_0_15px_-3px_rgba(37,99,235,0.4)] border border-blue-400/20",
  secondary: "bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700",
  ghost: "bg-transparent text-slate-400 hover:text-white hover:bg-slate-800/50",
  outline: "bg-transparent border border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white"
  };
  const sizes = { sm: "h-8 px-3 text-xs", md: "h-10 px-4 text-sm", lg: "h-12 px-6 text-base" };

return (
<button className={cn("inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all disabled:opacity-50", variants[variant], sizes[size], className)} {...props}>
{Icon && <Icon className="w-4 h-4" />}
{children}
</button>
);
};

const Input = ({ className, icon: Icon, ...props }: any) => (

  <div className="relative w-full">
    {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />}
    <input 
      className={cn(
        "w-full bg-slate-950/50 border border-slate-800 rounded-lg py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all",
        Icon ? "pl-10 pr-4" : "px-4",
        className
      )}
      {...props} 
    />
  </div>
);

const Badge = ({ children, color = 'slate' }: { children: React.ReactNode, color?: 'slate'|'blue'|'green'|'red' }) => {
const colors = {
slate: "bg-slate-800 text-slate-300 border-slate-700",
blue: "bg-blue-900/30 text-blue-300 border-blue-800/50",
green: "bg-emerald-900/30 text-emerald-300 border-emerald-800/50",
red: "bg-rose-900/30 text-rose-300 border-rose-800/50",
};
return (
<span className={cn("px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide border", colors[color])}>
{children}
</span>
);
};

const Tabs = ({ items, active, onChange }: { items: string[], active: string, onChange: (v: string) => void }) => (

  <div className="flex border-b border-slate-800 w-full mb-4">
    {items.map(item => (
      <button
        key={item}
        onClick={() => onChange(item)}
        className={cn(
          "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
          active === item 
            ? "border-blue-500 text-white" 
            : "border-transparent text-slate-500 hover:text-slate-300 hover:border-slate-700"
        )}
      >
        {item}
      </button>
    ))}
  </div>
);

// ==========================================
// PART 2: MARKETPLACE COMPONENTS (Organisms)
// ==========================================

/\*\*

- 4.  Ticker Strip
- Displays live market data for space commodities.
  \*/
  const TickerStrip = () => {
  const ticks = [
  { symbol: "SPEC-L1", price: "Ξ 12.45", change: "+2.4%" },
  { symbol: "H2O-ICE", price: "Ξ 0.85", change: "-0.5%" },
  { symbol: "LEO-STO", price: "Ξ 4.20", change: "+1.1%" },
  { symbol: "SAR-IMG", price: "Ξ 0.12", change: "+0.0%" },
  ];
  return (
  <div className="w-full bg-slate-950 border-b border-slate-800 h-8 flex items-center overflow-hidden whitespace-nowrap px-4">
  <div className="flex items-center gap-8 animate-pulse-slow">
  {ticks.map((t, i) => (
  <div key={i} className="flex items-center gap-2 text-xs font-mono">
  <span className="text-slate-400">{t.symbol}</span>
  <span className="text-slate-200">{t.price}</span>
  <span className={t.change.startsWith('+') ? "text-emerald-500" : "text-rose-500"}>{t.change}</span>
  </div>
  ))}
  </div>
  </div>
  );
  };

/\*\*

- 5.  Asset List Row
- A complex component for the main trading view.
  \*/
  const AssetRow = ({ data }: { data: any }) => (
  <Panel hoverEffect className="mb-3 p-4 flex flex-col md:flex-row items-center justify-between gap-4">
  <div className="flex items-center gap-4 w-full md:w-auto">
  <div className={cn("p-3 rounded-lg border bg-slate-900",
  data.type === 'Spectrum' ? "border-blue-500/20 text-blue-400" :
  data.type === 'Storage' ? "border-orange-500/20 text-orange-400" :
  "border-slate-700 text-slate-400"
  )}>
  {data.icon}
  </div>
  <div>
  <div className="flex items-center gap-2">
  <h3 className="font-bold text-slate-100">{data.name}</h3>
  <Badge color={data.status === 'Active' ? 'green' : 'slate'}>{data.status}</Badge>
  </div>
  <div className="flex items-center gap-3 mt-1">
  <span className="text-xs text-slate-500 font-mono">ID: {data.id}</span>
  <span className="text-xs text-slate-500">•</span>
  <span className="text-xs text-slate-500">{data.region}</span>
  </div>
  </div>
  </div>

      <div className="grid grid-cols-3 gap-8 w-full md:w-auto">
        <DataText label="Volume" value={data.volume} />
        <DataText label="Next Slot" value={data.slot} />
        <DataText label="Ask Price" value={data.price} trend={data.trend} />
      </div>

      <div className="flex gap-2 w-full md:w-auto justify-end">
        <Button variant="ghost" size="sm">Details</Button>
        <Button variant="primary" size="sm">Trade</Button>
      </div>

    </Panel>
  );

// ==========================================
// PART 3: PAGE LAYOUT (The Implementation)
// ==========================================

export default function SpaceMarketsDashboard() {
const [activeTab, setActiveTab] = useState("Spot Market");

const sampleAssets = [
{
id: "SAT-BW-882",
name: "Ka-Band Spectrum Block",
type: "Spectrum",
region: "GEO (95°W)",
volume: "500 MHz",
slot: "T-minus 4h",
price: "15.4 ETH",
status: "Active",
trend: "up",
icon: <Activity />
},
{
id: "LEO-DEP-04",
name: "Propellant Storage Unit",
type: "Storage",
region: "LEO (500km)",
volume: "200 kg",
slot: "Immediate",
price: "4.2 ETH",
status: "Reserved",
trend: "neutral",
icon: <Database />
},
{
id: "IMG-SAR-X1",
name: "Daily SAR Revisit",
type: "Imagery",
region: "Global",
volume: "12 Scenes",
slot: "Daily",
price: "0.8 ETH",
status: "Active",
trend: "down",
icon: <Globe />
},
];

return (
<div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30">

      {/* 1. TOP NAVIGATION */}
      <nav className="border-b border-slate-800 bg-slate-950 sticky top-0 z-50">
        <TickerStrip />
        <div className="h-16 px-6 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2 text-white font-bold text-lg tracking-tight">
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                <Globe className="w-5 h-5 text-white" />
              </div>
              Space Markets
            </div>
            <div className="hidden md:flex gap-6 text-sm font-medium text-slate-400">
              <a href="#" className="text-white hover:text-blue-400">Marketplace</a>
              <a href="#" className="hover:text-blue-400 transition-colors">Portfolio</a>
              <a href="#" className="hover:text-blue-400 transition-colors">Governance</a>
              <a href="#" className="hover:text-blue-400 transition-colors">Analytics</a>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Input placeholder="Search assets..." icon={Search} className="w-64 hidden lg:block" />
            <Button variant="ghost" size="sm" className="w-10 px-0"><Bell className="w-4 h-4" /></Button>
            <div className="h-4 w-px bg-slate-800 mx-2"></div>
            <div className="flex items-center gap-2">
              <div className="text-right hidden sm:block">
                <div className="text-xs text-slate-400">Balance</div>
                <div className="text-sm font-mono font-bold text-white">420.69 ETH</div>
              </div>
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 border-2 border-slate-950"></div>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* 2. SIDEBAR FILTER (The "Cockpit") */}
        <aside className="w-64 hidden md:block border-r border-slate-800 min-h-[calc(100vh-6rem)] bg-slate-950/50 p-6">
          <Heading level={4} className="mb-4">Commodity Type</Heading>
          <div className="space-y-1 mb-8">
            {['All Assets', 'Spectrum', 'Imagery', 'Lunar Ice', 'Compute', 'Storage'].map(item => (
              <button key={item} className="w-full text-left px-3 py-2 rounded-md text-sm text-slate-400 hover:text-white hover:bg-slate-900 transition-colors flex justify-between group">
                {item}
                <span className="text-xs text-slate-600 group-hover:text-slate-500">24</span>
              </button>
            ))}
          </div>

          <Heading level={4} className="mb-4">Orbit / Region</Heading>
          <div className="space-y-2">
             <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
               <input type="checkbox" className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0" /> LEO (Low Earth)
             </label>
             <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
               <input type="checkbox" className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0" /> GEO (Geostationary)
             </label>
             <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
               <input type="checkbox" className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0" /> Lunar Surface
             </label>
          </div>

          <div className="mt-8 pt-8 border-t border-slate-800">
            <Panel className="p-4 bg-gradient-to-br from-blue-900/20 to-slate-900">
              <h4 className="text-white text-sm font-bold mb-1">Need Hedging?</h4>
              <p className="text-xs text-slate-400 mb-3">Check out our derivatives market for spectrum futures.</p>
              <Button variant="outline" size="sm" className="w-full">View Futures</Button>
            </Panel>
          </div>
        </aside>

        {/* 3. MAIN DASHBOARD AREA */}
        <main className="flex-1 p-6 lg:p-10">

          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
            <div>
              <Heading level={1}>Market Overview</Heading>
              <p className="text-slate-400 mt-2">Real-time lease availability for verified space assets.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" icon={Sliders}>Filters</Button>
              <Button variant="primary" icon={ArrowUpRight}>List Asset</Button>
            </div>
          </div>

          {/* Market Stats Panel */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: "24h Volume", value: "Ξ 1,240.5" },
              { label: "Active Leases", value: "842" },
              { label: "Avg Block Price", value: "Ξ 8.2" },
              { label: "Network Gas", value: "12 gwei" },
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
              items={["Spot Market", "Auctions", "Analytics", "My Orders"]}
              active={activeTab}
              onChange={setActiveTab}
            />

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
          </div>

        </main>
      </div>
    </div>

);
}
