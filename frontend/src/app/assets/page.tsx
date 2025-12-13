'use client';

import AppLayout from '@/components/layout/app-layout';
import { Heading } from '@/components/ui/heading';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { Badge } from '@/components/ui/badge';
import { DataText } from '@/components/ui/data-text';
import { Activity, Database, Radio, ArrowUpRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface Asset {
  id: string;
  name: string;
  type: 'Spectrum' | 'Compute' | 'Storage' | 'Relay';
  region: string;
  volume: string;
  status: 'Active' | 'Inactive' | 'Maintenance';
  price: string;
  icon: React.ReactNode;
  color: string;
}

const userAssets: Asset[] = [
  {
    id: "SAT-KA-001",
    name: "Ka-Band Spectrum Satellite",
    type: "Spectrum",
    region: "GEO (125°W)",
    volume: "800 MHz",
    status: "Active",
    price: "$18.2 USDC/hr",
    icon: <Activity className="w-5 h-5" />,
    color: "blue",
  },
  {
    id: "SAT-KU-042",
    name: "Ku-Band Spectrum Satellite",
    type: "Spectrum",
    region: "GEO (95°E)",
    volume: "600 MHz",
    status: "Active",
    price: "$14.5 USDC/hr",
    icon: <Radio className="w-5 h-5" />,
    color: "blue",
  },
  {
    id: "OCS-BETA-01",
    name: "Orbital Compute Array Beta",
    type: "Compute",
    region: "LEO (550km)",
    volume: "128 Cores",
    status: "Active",
    price: "$22.8 USDC/hr",
    icon: <Database className="w-5 h-5" />,
    color: "purple",
  },
  {
    id: "OCS-GAMMA-02",
    name: "Orbital Compute Array Gamma",
    type: "Compute",
    region: "LEO (600km)",
    volume: "256 Cores",
    status: "Active",
    price: "$35.4 USDC/hr",
    icon: <Database className="w-5 h-5" />,
    color: "purple",
  },
  {
    id: "STOR-DELTA-01",
    name: "Orbital Storage Array Delta",
    type: "Storage",
    region: "LEO (500km)",
    volume: "500 TB",
    status: "Active",
    price: "$8.9 USDC/hr",
    icon: <Database className="w-5 h-5" />,
    color: "orange",
  },
  {
    id: "RELAY-ECHO-01",
    name: "Orbital Relay Station Echo",
    type: "Relay",
    region: "GEO (180°W)",
    volume: "10 Gbps",
    status: "Active",
    price: "$12.3 USDC/hr",
    icon: <Radio className="w-5 h-5" />,
    color: "green",
  },
];

const getStatusColor = (status: Asset['status']) => {
  switch (status) {
    case 'Active':
      return 'green';
    case 'Inactive':
      return 'slate';
    case 'Maintenance':
      return 'blue';
  }
};

export default function AssetsPage() {
  const activeAssets = userAssets.filter(a => a.status === 'Active').length;
  const totalRevenue = userAssets.reduce((sum, asset) => {
    // Extract numeric value from price string (simplified)
    const match = asset.price.match(/\$([\d.]+)/);
    return sum + (match ? parseFloat(match[1]) : 0);
  }, 0);

  return (
    <AppLayout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <Heading level={1}>My Assets</Heading>
          <p className="text-slate-400 mt-2">Manage your registered off-planet assets and lease offers.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/assets/register">
            <Button variant="primary" icon={Plus}>Register New Asset</Button>
          </Link>
        </div>
      </div>

      {/* Stats Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Panel className="p-4">
          <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Total Assets</div>
          <div className="text-2xl text-white font-mono font-light">{userAssets.length}</div>
        </Panel>
        <Panel className="p-4">
          <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Active Assets</div>
          <div className="text-2xl text-white font-mono font-light">{activeAssets}</div>
        </Panel>
        <Panel className="p-4">
          <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Est. Hourly Revenue</div>
          <div className="text-2xl text-white font-mono font-light">${totalRevenue.toFixed(1)}</div>
        </Panel>
      </div>

      {/* Assets Grid */}
      <div className="space-y-3">
        {userAssets.map((asset) => (
          <Panel key={asset.id} hoverEffect className="p-4">
            <div className="flex items-center justify-between gap-4 mb-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className={cn(
                  "p-2.5 rounded-lg border bg-slate-900 flex-shrink-0",
                  asset.color === 'blue' ? "border-blue-500/20 text-blue-400" :
                  asset.color === 'purple' ? "border-purple-500/20 text-purple-400" :
                  asset.color === 'orange' ? "border-orange-500/20 text-orange-400" :
                  asset.color === 'green' ? "border-green-500/20 text-green-400" :
                  "border-slate-700 text-slate-400"
                )}>
                  {asset.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-bold text-slate-100 text-base">{asset.name}</h3>
                    <Badge color={getStatusColor(asset.status)}>{asset.status}</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-mono">ID: {asset.id}</span>
                    <span>•</span>
                    <span>{asset.region}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Link href={`/market/${asset.id}`}>
                  <Button variant="ghost" size="sm">Manage</Button>
                </Link>
                <Button variant="primary" size="sm">Create Offer</Button>
              </div>
            </div>

            {/* Asset Details */}
            <div className="grid grid-cols-3 gap-4 md:gap-8 pt-3 border-t border-slate-800">
              <DataText label="Capacity" value={asset.volume} />
              <DataText label="Status" value={asset.status} />
              <DataText label="Market Rate" value={asset.price} />
            </div>
          </Panel>
        ))}
      </div>

      {/* Empty State (if no assets) */}
      {userAssets.length === 0 && (
        <Panel className="p-12 text-center">
          <Database className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">No Assets Registered</h3>
          <p className="text-sm text-slate-400 mb-4">Register your first off-planet asset to start leasing.</p>
          <Link href="/assets/register">
            <Button variant="primary" icon={Plus}>Register Asset</Button>
          </Link>
        </Panel>
      )}
    </AppLayout>
  );
}

