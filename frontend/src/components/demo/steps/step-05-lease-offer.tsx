'use client';

import React, { useEffect, useState } from 'react';
import { StepContainer } from '../step-container';
import { useDemoContext } from '../demo-provider';
import {
  ASSET_METADATA,
  LEASE_TERMS,
  LESSOR,
  CONTRACTS,
  USDC_ADDRESS,
  truncateAddress,
} from '@/lib/demo/demo-data';
import { BlockAnimation } from '../animations/block-animation';
import { cn } from '@/lib/utils';

export function Step05LeaseOffer() {
  const { state, completeStep } = useDemoContext();
  const isActive = state.currentStep === 5;
  const [phase, setPhase] = useState<'idle' | 'building' | 'submitting' | 'listed'>('idle');

  useEffect(() => {
    if (!isActive) {
      setPhase('idle');
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setPhase('building'), 300));
    timers.push(setTimeout(() => setPhase('submitting'), 1800));
    timers.push(setTimeout(() => {
      setPhase('listed');
      completeStep(5, {
        leaseId: LEASE_TERMS.leaseId,
        assetId: LEASE_TERMS.assetId,
        ratePerDay: LEASE_TERMS.ratePerDay,
        duration: LEASE_TERMS.duration,
        totalCost: LEASE_TERMS.totalCost,
      });
    }, 2800));

    return () => timers.forEach(clearTimeout);
  }, [isActive, completeStep]);

  return (
    <StepContainer stepNumber={5}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Offer card */}
        <div className="lg:col-span-2">
          <div
            className={cn(
              'bg-slate-900/60 backdrop-blur border rounded-xl overflow-hidden transition-all duration-700',
              phase === 'listed'
                ? 'border-amber-500/30 shadow-[0_0_30px_-10px_rgba(245,158,11,0.15)]'
                : 'border-slate-800/60'
            )}
          >
            {/* Card header */}
            <div className="px-5 py-4 border-b border-slate-800/60 bg-gradient-to-r from-slate-900/80 to-slate-900/40">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold text-white">Lease Offer</h3>
                    <span
                      className={cn(
                        'text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider transition-all duration-500',
                        phase === 'listed'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-slate-800 text-slate-500 border border-slate-700'
                      )}
                    >
                      {phase === 'listed' ? 'ACTIVE' : phase === 'submitting' ? 'SUBMITTING' : 'DRAFT'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{ASSET_METADATA.name} -- Orbital Compute Station</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-white font-mono">{LEASE_TERMS.totalCost}</p>
                  <p className="text-xs text-slate-500">USDC total</p>
                </div>
              </div>
            </div>

            {/* Terms grid */}
            <div
              className={cn(
                'transition-all duration-500',
                phase !== 'idle' ? 'opacity-100' : 'opacity-0'
              )}
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-slate-800/30">
                {[
                  { label: 'Rate / Second', value: `${LEASE_TERMS.ratePerSecond} USDC`, color: 'text-cyan-400' },
                  { label: 'Rate / Hour', value: `${LEASE_TERMS.ratePerHour} USDC`, color: 'text-cyan-400' },
                  { label: 'Rate / Day', value: `${LEASE_TERMS.ratePerDay} USDC`, color: 'text-cyan-400' },
                  { label: 'Duration', value: LEASE_TERMS.duration, color: 'text-slate-300' },
                  { label: 'Escrow Required', value: `${LEASE_TERMS.escrowAmount} USDC`, color: 'text-amber-400' },
                  { label: 'Currency', value: 'USDC (Base Sepolia)', color: 'text-slate-300' },
                ].map((item) => (
                  <div key={item.label} className="bg-slate-900/60 px-4 py-3">
                    <span className="text-[10px] text-slate-600 uppercase tracking-wider block mb-0.5">
                      {item.label}
                    </span>
                    <span className={cn('text-xs font-mono', item.color)}>{item.value}</span>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-slate-800/60 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-[10px] text-slate-600 block">Lessor</span>
                    <code className="text-xs font-mono text-emerald-400">{truncateAddress(LESSOR)}</code>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-600 block">Marketplace</span>
                    <code className="text-xs font-mono text-emerald-400">{truncateAddress(CONTRACTS.marketplace.address)}</code>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-600 block text-right">Payment Token</span>
                  <code className="text-xs font-mono text-emerald-400">{truncateAddress(USDC_ADDRESS)}</code>
                </div>
              </div>
            </div>
          </div>

          {/* Transaction progress */}
          {phase === 'submitting' && (
            <div className="mt-4 flex items-center gap-3 animate-[fadeInUp_0.3s_ease-out]">
              <div className="w-4 h-4 border-2 border-blue-400/60 border-t-blue-400 rounded-full animate-spin" />
              <span className="text-sm text-slate-400">Submitting offer to Marketplace contract...</span>
            </div>
          )}
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          <div className="bg-slate-900/60 backdrop-blur border border-slate-800/60 rounded-xl p-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
              Offer Details
            </h4>
            <div className="space-y-3">
              <div>
                <span className="text-[10px] text-slate-600 uppercase tracking-wider block mb-0.5">Lease ID</span>
                <span className="text-xs font-mono text-amber-400">#{LEASE_TERMS.leaseId}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-600 uppercase tracking-wider block mb-0.5">Asset ID</span>
                <span className="text-xs font-mono text-slate-300">#{LEASE_TERMS.assetId}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-600 uppercase tracking-wider block mb-0.5">Start Block</span>
                <span className="text-xs font-mono text-amber-400">#{LEASE_TERMS.startBlock.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-600 uppercase tracking-wider block mb-0.5">End Block</span>
                <span className="text-xs font-mono text-amber-400">#{LEASE_TERMS.endBlock.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <BlockAnimation
            blockNumber={18_500_010}
            txHash="0x901234...34567890"
            active={phase === 'listed'}
          />
        </div>
      </div>
    </StepContainer>
  );
}
