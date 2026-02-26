'use client';

import React from 'react';
import { useDemoContext } from './demo-provider';
import { DEMO_PRESETS, PRESET_IDS, PRICING_MULTIPLIERS, type AssetClassId, type PricingMode } from '@/lib/demo/demo-data';
import { cn } from '@/lib/utils';

const PRESET_ICONS: Record<AssetClassId, React.ReactNode> = {
  orbital: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  ),
  'renewable-energy': (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
    </svg>
  ),
  spectrum: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
    </svg>
  ),
  compute: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z" />
    </svg>
  ),
};

const PRICING_MODE_IDS: PricingMode[] = ['conservative', 'standard', 'aggressive'];

export function PresetSelector() {
  const { state, setPreset, setPricingMode } = useDemoContext();

  return (
    <div className="space-y-3">
      {/* Asset class presets */}
      <div className="flex flex-col sm:flex-row gap-2">
        {PRESET_IDS.map((presetId) => {
          const preset = DEMO_PRESETS[presetId];
          const isActive = state.activePreset === presetId;

          return (
            <button
              key={presetId}
              onClick={() => setPreset(presetId)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all text-left flex-1 min-w-0',
                isActive
                  ? 'bg-slate-800/80 border-blue-500/50 shadow-[0_0_12px_-4px_rgba(59,130,246,0.3)]'
                  : 'bg-slate-900/40 border-slate-800/60 hover:border-slate-700 hover:bg-slate-900/60'
              )}
              aria-pressed={isActive}
              aria-label={`Select ${preset.label} asset class`}
            >
              <div
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                  isActive
                    ? 'bg-blue-600/20 text-blue-400'
                    : 'bg-slate-800/60 text-slate-500'
                )}
              >
                {PRESET_ICONS[presetId]}
              </div>
              <div className="min-w-0">
                <p
                  className={cn(
                    'text-xs font-bold truncate transition-colors',
                    isActive ? 'text-white' : 'text-slate-400'
                  )}
                >
                  {preset.label}
                </p>
                <p className="text-[10px] text-slate-600 truncate hidden sm:block">
                  {preset.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Pricing mode toggle */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-widest text-slate-600 font-bold shrink-0">
          Pricing
        </span>
        <div className="flex items-center gap-1 bg-slate-900/60 border border-slate-800/60 rounded-lg p-0.5">
          {PRICING_MODE_IDS.map((mode) => {
            const config = PRICING_MULTIPLIERS[mode];
            const isActive = state.pricingMode === mode;
            return (
              <button
                key={mode}
                onClick={() => setPricingMode(mode)}
                className={cn(
                  'px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all',
                  isActive
                    ? 'bg-slate-700/80 text-white'
                    : 'text-slate-500 hover:text-slate-400'
                )}
                aria-pressed={isActive}
                title={config.description}
              >
                {config.label}
              </button>
            );
          })}
        </div>
        <span className="text-[10px] text-slate-600 hidden sm:inline">
          {PRICING_MULTIPLIERS[state.pricingMode].rate}x rate, {PRICING_MULTIPLIERS[state.pricingMode].duration}x duration
        </span>
      </div>
    </div>
  );
}
