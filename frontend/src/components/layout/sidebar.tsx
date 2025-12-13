'use client';

import React from 'react';
import { Heading } from '../ui/heading';
import { Panel } from '../ui/panel';
import { Button } from '../ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const Sidebar = ({ collapsed, onToggle }: SidebarProps) => {
  // Realistic asset counts for each category
  const assetCounts = {
    'Spectrum': 18,
    'Imaging': 10,
    'Compute': 6,
    'Storage': 12,
    'Relay': 8,
    'Fuel': 15,
  };
  
  const totalAssets = Object.values(assetCounts).reduce((sum, count) => sum + count, 0);
  
  const handleViewFutures = () => {
    // Update hash without reloading
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', '/#futures');
      // Trigger custom event that the page can listen to
      window.dispatchEvent(new CustomEvent('switchTab', { detail: 'Futures' }));
    }
  };

  return (
    <aside className={cn(
      "hidden md:block border-r border-slate-800 min-h-[calc(100vh-6rem)] bg-slate-950/50 transition-all duration-300",
      collapsed ? "w-8" : "w-64"
    )}>
      <div className="relative h-full">
        {/* Collapse Toggle Button */}
        <button
          onClick={onToggle}
          className="absolute -right-3 top-6 z-10 w-6 h-6 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center hover:bg-slate-700 hover:border-blue-500/50 transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="w-3 h-3 text-blue-400" />
          ) : (
            <ChevronLeft className="w-3 h-3 text-blue-400" />
          )}
        </button>

        <div className={cn("p-6 transition-opacity duration-300", collapsed && "opacity-0 pointer-events-none")}>
          <Heading level={4} className="mb-4">Off-Planet Commodities</Heading>
          <div className="space-y-1 mb-8">
            <button className="w-full text-left px-3 py-2 rounded-md text-sm text-slate-400 hover:text-white hover:bg-slate-900 transition-colors flex justify-between group">
              <span className="truncate">All Off-Planet Assets</span>
              <span className="text-xs text-slate-600 group-hover:text-slate-500 ml-2">{totalAssets}</span>
            </button>
            {Object.entries(assetCounts).map(([category, count]) => (
              <button key={category} className="w-full text-left px-3 py-2 rounded-md text-sm text-slate-400 hover:text-white hover:bg-slate-900 transition-colors flex justify-between group">
                <span className="truncate">{category}</span>
                <span className="text-xs text-slate-600 group-hover:text-slate-500 ml-2">{count}</span>
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
              <Button variant="outline" size="sm" className="w-full" onClick={handleViewFutures}>View Futures</Button>
            </Panel>
          </div>
        </div>
      </div>
    </aside>
  );
};
