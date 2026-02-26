'use client';

import React, { useEffect, useState } from 'react';
import { StepContainer } from '../step-container';
import { useDemoContext } from '../demo-provider';
import {
  ASSET_METADATA,
  LESSOR,
  CONTRACTS,
  truncateAddress,
} from '@/lib/demo/demo-data';
import { DataStream } from '../animations/data-stream';
import { cn } from '@/lib/utils';

interface TokenHolder {
  address: string;
  label: string;
  balance: string;
  percentage: number;
  revenue: string;
  revealed: boolean;
}

export function Step11Revenue() {
  const { state, completeStep } = useDemoContext();
  const isActive = state.currentStep === 11;
  const [holders, setHolders] = useState<TokenHolder[]>([]);
  const [totalDistributed, setTotalDistributed] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'calculating' | 'distributing' | 'done'>('idle');

  useEffect(() => {
    if (!isActive) {
      setHolders([]);
      setTotalDistributed(0);
      setPhase('idle');
      return;
    }

    const holderData: TokenHolder[] = [
      { address: LESSOR, label: 'Lessor (Primary)', balance: '600,000', percentage: 60, revenue: '600.00', revealed: false },
      { address: '0x90F79bf6EB2c4f870365E785982E1f101E93b906', label: 'Investor A', balance: '200,000', percentage: 20, revenue: '200.00', revealed: false },
      { address: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65', label: 'Investor B', balance: '120,000', percentage: 12, revenue: '120.00', revealed: false },
      { address: '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc', label: 'Investor C', balance: '80,000', percentage: 8, revenue: '80.00', revealed: false },
    ];

    setPhase('calculating');

    const timers: ReturnType<typeof setTimeout>[] = [];

    timers.push(setTimeout(() => {
      setPhase('distributing');
      setHolders(holderData);
    }, 800));

    // Reveal each holder sequentially
    holderData.forEach((_, idx) => {
      timers.push(
        setTimeout(() => {
          setHolders((prev) =>
            prev.map((h, i) => (i === idx ? { ...h, revealed: true } : h))
          );
          setTotalDistributed((prev) => prev + parseFloat(holderData[idx].revenue));
        }, 1200 + idx * 600)
      );
    });

    timers.push(
      setTimeout(() => {
        setPhase('done');
        completeStep(11, {
          totalRevenue: '1,000.00',
          holdersCount: holderData.length,
          distributionMethod: 'ERC20Votes proportional',
        });
      }, 1200 + holderData.length * 600 + 400)
    );

    return () => timers.forEach(clearTimeout);
  }, [isActive, completeStep]);

  return (
    <StepContainer stepNumber={11}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Token holders & distribution */}
        <div className="lg:col-span-2 space-y-4">
          {/* Distribution table */}
          <div className="bg-slate-900/60 backdrop-blur border border-slate-800/60 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800/60 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Revenue Distribution</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">{ASSET_METADATA.tokenSymbol} holders</span>
                <span className="text-xs font-mono text-cyan-400">1,000.00 USDC</span>
              </div>
            </div>

            {/* Header */}
            <div className="grid grid-cols-[1fr_100px_80px_80px_100px] gap-2 px-4 py-2 border-b border-slate-800/60 bg-slate-900/30 hidden sm:grid">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Holder</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 text-right">Balance</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 text-right">Share</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 text-right">Revenue</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 text-right">Status</span>
            </div>

            {/* Rows */}
            <div className="divide-y divide-slate-800/30">
              {holders.map((holder, idx) => (
                <div
                  key={holder.address}
                  className={cn(
                    'px-4 py-3 transition-all duration-500',
                    holder.revealed ? 'opacity-100' : 'opacity-20'
                  )}
                  style={{ transitionDelay: `${idx * 50}ms` }}
                >
                  {/* Desktop layout */}
                  <div className="hidden sm:grid grid-cols-[1fr_100px_80px_80px_100px] gap-2 items-center">
                    <div className="min-w-0">
                      <span className="text-xs text-slate-300 block">{holder.label}</span>
                      <code className="text-[10px] font-mono text-emerald-400">
                        {truncateAddress(holder.address)}
                      </code>
                    </div>
                    <span className="text-xs font-mono text-slate-400 text-right">
                      {holder.balance}
                    </span>
                    <span className="text-xs font-mono text-blue-400 text-right">
                      {holder.percentage}%
                    </span>
                    <span className="text-xs font-mono text-cyan-400 text-right font-bold">
                      {holder.revenue}
                    </span>
                    <div className="flex justify-end">
                      {holder.revealed ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-900/30 text-emerald-300 border border-emerald-800/40 font-bold">
                          PAID
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 border border-slate-700">
                          PENDING
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Mobile layout */}
                  <div className="sm:hidden space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-300">{holder.label}</span>
                      <span className="text-xs font-mono text-cyan-400 font-bold">{holder.revenue} USDC</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <code className="text-[10px] font-mono text-emerald-400">{truncateAddress(holder.address)}</code>
                      <span className="text-[10px] text-blue-400">{holder.percentage}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Distribution visual -- bar chart */}
          <div className="bg-slate-900/60 backdrop-blur border border-slate-800/60 rounded-xl p-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
              Ownership Distribution
            </h4>
            <div className="flex h-6 rounded-lg overflow-hidden gap-0.5">
              {holders.map((holder, idx) => {
                const colors = ['bg-blue-500', 'bg-purple-500', 'bg-amber-500', 'bg-emerald-500'];
                return (
                  <div
                    key={holder.address}
                    className={cn(
                      'h-full transition-all duration-700 rounded-sm',
                      colors[idx % colors.length],
                      holder.revealed ? 'opacity-100' : 'opacity-20'
                    )}
                    style={{
                      width: `${holder.percentage}%`,
                      transitionDelay: `${idx * 100}ms`,
                    }}
                    title={`${holder.label}: ${holder.percentage}%`}
                  />
                );
              })}
            </div>
            <div className="flex flex-wrap gap-3 mt-2">
              {holders.map((holder, idx) => {
                const dotColors = ['bg-blue-500', 'bg-purple-500', 'bg-amber-500', 'bg-emerald-500'];
                return (
                  <div key={holder.address} className="flex items-center gap-1.5">
                    <div className={cn('w-2 h-2 rounded-full', dotColors[idx % dotColors.length])} />
                    <span className="text-[10px] text-slate-500">{holder.label} ({holder.percentage}%)</span>
                  </div>
                );
              })}
            </div>
          </div>

          <DataStream
            active={phase === 'distributing'}
            color="emerald"
            speed="normal"
          />
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          <div className="bg-slate-900/60 backdrop-blur border border-slate-800/60 rounded-xl p-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
              Distribution Details
            </h4>
            <div className="space-y-3">
              <div>
                <span className="text-[10px] text-slate-600 uppercase tracking-wider block mb-0.5">Total Revenue</span>
                <span className="text-lg font-bold font-mono text-cyan-400">1,000.00 USDC</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-600 uppercase tracking-wider block mb-0.5">Distributed</span>
                <span className="text-xs font-mono text-white">
                  {totalDistributed.toFixed(2)} USDC
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-600 uppercase tracking-wider block mb-0.5">Token</span>
                <span className="text-xs text-slate-300">
                  {ASSET_METADATA.tokenSymbol} ({ASSET_METADATA.tokenSupply} total)
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-600 uppercase tracking-wider block mb-0.5">Method</span>
                <span className="text-xs text-purple-300">ERC20Votes Proportional</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-600 uppercase tracking-wider block mb-0.5">Contract</span>
                <code className="text-xs font-mono text-emerald-400">
                  {truncateAddress(CONTRACTS.marketplace.address)}
                </code>
              </div>
            </div>
          </div>

          {/* Progress */}
          <div className="bg-slate-900/60 backdrop-blur border border-slate-800/60 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500">Distribution Progress</span>
              <span className="text-xs font-mono text-slate-400">
                {holders.filter((h) => h.revealed).length}/{holders.length}
              </span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{
                  width: `${(holders.filter((h) => h.revealed).length / Math.max(holders.length, 1)) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </StepContainer>
  );
}
