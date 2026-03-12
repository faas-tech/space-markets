'use client';

import React, { useState } from 'react';
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
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

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
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', '/#futures');
      window.dispatchEvent(new CustomEvent('switchTab', { detail: 'Futures' }));
    }
  };

  return (
    <aside className={cn(
      "hidden md:block border-r border-border min-h-[calc(100vh-6rem)] bg-background/50 transition-all duration-300",
      collapsed ? "w-8" : "w-64"
    )}>
      <div className="relative h-full">
        {/* Collapse Toggle */}
        <button
          onClick={onToggle}
          className="absolute -right-3 top-6 z-10 w-6 h-6 bg-secondary border border-border rounded-full flex items-center justify-center hover:bg-background-hover hover:border-primary/50 transition-all duration-200"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="w-3 h-3 text-primary" />
          ) : (
            <ChevronLeft className="w-3 h-3 text-primary" />
          )}
        </button>

        <div className={cn("p-6 transition-opacity duration-300", collapsed && "opacity-0 pointer-events-none")}>
          {/* Section: Asset Categories */}
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Asset Categories</p>
          <div className="space-y-0.5 mb-8">
            <button
              onClick={() => setActiveCategory(null)}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-200 flex justify-between items-center group",
                activeCategory === null
                  ? "bg-primary/8 text-foreground border-l-[3px] border-l-primary pl-2.5"
                  : "text-muted-foreground hover:text-foreground hover:bg-background-hover"
              )}
            >
              <span className="truncate">All Off-Planet Assets</span>
              <span className={cn(
                "text-[10px] font-mono tabular-nums ml-2",
                activeCategory === null ? "text-primary" : "text-muted-foreground/60 group-hover:text-muted-foreground"
              )}>{totalAssets}</span>
            </button>
            {Object.entries(assetCounts).map(([category, count]) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-200 flex justify-between items-center group",
                  activeCategory === category
                    ? "bg-primary/8 text-foreground border-l-[3px] border-l-primary pl-2.5"
                    : "text-muted-foreground hover:text-foreground hover:bg-background-hover"
                )}
              >
                <span className="truncate">{category}</span>
                <span className={cn(
                  "text-[10px] font-mono tabular-nums ml-2",
                  activeCategory === category ? "text-primary" : "text-muted-foreground/60 group-hover:text-muted-foreground"
                )}>{count}</span>
              </button>
            ))}
          </div>

          {/* Section: Orbit / Region */}
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Orbit / Region</p>
          <div className="space-y-2">
             {['LEO (Low Earth)', 'GEO (Geostationary)', 'Lunar Surface'].map((region) => (
               <label key={region} className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground cursor-pointer transition-colors duration-200">
                 <input type="checkbox" className="rounded border-border bg-background-surface text-primary focus:ring-primary/30 focus:ring-offset-0 w-3.5 h-3.5" />
                 {region}
               </label>
             ))}
          </div>

          {/* CTA Panel */}
          <div className="mt-8 pt-8 border-t border-border">
            <Panel level="elevated" accent="primary" className="p-4">
              <h4 className="text-foreground text-sm font-bold mb-1">Need Hedging?</h4>
              <p className="text-xs text-muted-foreground mb-3">Check out our derivatives market for spectrum futures.</p>
              <Button variant="outline" size="sm" className="w-full" onClick={handleViewFutures}>View Futures</Button>
            </Panel>
          </div>
        </div>
      </div>
    </aside>
  );
};
