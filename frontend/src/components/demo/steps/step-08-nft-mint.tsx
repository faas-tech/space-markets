'use client';

import React, { useEffect, useState } from 'react';
import { StepContainer } from '../step-container';
import { useDemoContext } from '../demo-provider';
import {
  LEASE_NFT_ID,
  LEASE_TERMS,
  LESSOR,
  LESSEE,
  ASSET_METADATA,
  HASHES,
  CONTRACTS,
  truncateAddress,
  truncateHash,
} from '@/lib/demo/demo-data';
import { BlockAnimation } from '../animations/block-animation';
import { cn } from '@/lib/utils';

export function Step08NftMint() {
  const { state, completeStep } = useDemoContext();
  const isActive = state.currentStep === 8;
  const [phase, setPhase] = useState<'idle' | 'constructing' | 'minting' | 'minted'>('idle');

  useEffect(() => {
    if (!isActive) {
      setPhase('idle');
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setPhase('constructing'), 300));
    timers.push(setTimeout(() => setPhase('minting'), 1800));
    timers.push(setTimeout(() => {
      setPhase('minted');
      completeStep(8, {
        nftTokenId: LEASE_NFT_ID,
        leaseFactory: CONTRACTS.leaseFactory.address,
        owner: LESSEE,
      });
    }, 3000));

    return () => timers.forEach(clearTimeout);
  }, [isActive, completeStep]);

  const nftAttributes = [
    { trait: 'Lease ID', value: `#${LEASE_TERMS.leaseId}` },
    { trait: 'Asset', value: ASSET_METADATA.name },
    { trait: 'Lessor', value: truncateAddress(LESSOR) },
    { trait: 'Lessee', value: truncateAddress(LESSEE) },
    { trait: 'Rate/Day', value: `${LEASE_TERMS.ratePerDay} USDC` },
    { trait: 'Duration', value: LEASE_TERMS.duration },
    { trait: 'Terms Hash', value: truncateHash(HASHES.leaseTermsHash) },
    { trait: 'Start Block', value: `#${LEASE_TERMS.startBlock.toLocaleString()}` },
  ];

  return (
    <StepContainer stepNumber={8}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* NFT Card */}
        <div className="lg:col-span-2 flex flex-col items-center sm:items-start sm:flex-row gap-6">
          {/* NFT visual */}
          <div
            className={cn(
              'w-56 h-72 shrink-0 rounded-2xl border-2 overflow-hidden transition-all duration-1000 relative',
              phase === 'minted'
                ? 'border-blue-500/40 shadow-[0_0_40px_-10px_rgba(59,130,246,0.4)]'
                : phase === 'minting'
                  ? 'border-blue-500/20 animate-pulse'
                  : 'border-slate-800/60'
            )}
          >
            {/* Gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-950/30 to-slate-900" />

            {/* NFT content */}
            <div className="relative h-full flex flex-col">
              {/* Header */}
              <div className="px-4 pt-4 pb-2">
                <span className="text-[10px] uppercase tracking-widest text-blue-400/60 font-bold">
                  Lease NFT
                </span>
                <p
                  className={cn(
                    'text-3xl font-bold font-mono transition-all duration-700',
                    phase === 'minted' ? 'text-white' : 'text-slate-600'
                  )}
                >
                  #{LEASE_NFT_ID}
                </p>
              </div>

              {/* Visual element */}
              <div className="flex-1 flex items-center justify-center">
                <div
                  className={cn(
                    'w-20 h-20 rounded-full border-2 flex items-center justify-center transition-all duration-700',
                    phase === 'minted'
                      ? 'border-blue-400 bg-blue-500/10 shadow-[0_0_30px_-5px_rgba(59,130,246,0.5)]'
                      : 'border-slate-700 bg-slate-800'
                  )}
                >
                  <svg
                    className={cn(
                      'w-8 h-8 transition-colors duration-500',
                      phase === 'minted' ? 'text-blue-400' : 'text-slate-600'
                    )}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                  </svg>
                </div>
              </div>

              {/* Footer */}
              <div className="px-4 pb-4">
                <p className="text-xs text-slate-400 font-medium">{ASSET_METADATA.name}</p>
                <p className="text-[10px] text-slate-600">{LEASE_TERMS.duration}</p>
              </div>
            </div>
          </div>

          {/* Embedded terms */}
          <div className="flex-1 space-y-3 min-w-0">
            <div className="bg-slate-900/60 backdrop-blur border border-slate-800/60 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-slate-800/60">
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  Embedded Lease Terms
                </h4>
              </div>
              <div className="divide-y divide-slate-800/30">
                {nftAttributes.map((attr, idx) => (
                  <div
                    key={attr.trait}
                    className={cn(
                      'px-4 py-2 flex items-center justify-between gap-3 transition-all duration-300',
                      phase !== 'idle' ? 'opacity-100' : 'opacity-0'
                    )}
                    style={{ transitionDelay: `${idx * 80}ms` }}
                  >
                    <span className="text-[10px] text-slate-600 uppercase tracking-wider shrink-0">
                      {attr.trait}
                    </span>
                    <span className="text-xs font-mono text-slate-300 truncate text-right">
                      {attr.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Minting status */}
            {phase === 'minting' && (
              <div className="flex items-center gap-2 px-2 animate-[fadeInUp_0.3s_ease-out]">
                <div className="w-3 h-3 border-2 border-blue-400/60 border-t-blue-400 rounded-full animate-spin" />
                <span className="text-xs text-slate-400">Minting Lease NFT on LeaseFactory...</span>
              </div>
            )}

            {phase === 'minted' && (
              <div className="bg-emerald-900/20 border border-emerald-500/20 rounded-xl p-3 flex items-center gap-2 animate-[fadeInUp_0.3s_ease-out]">
                <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <span className="text-xs font-bold text-emerald-400">NFT Minted Successfully</span>
                  <span className="text-[10px] text-slate-500 block">
                    Token ID #{LEASE_NFT_ID} on {truncateAddress(CONTRACTS.leaseFactory.address)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          <div className="bg-slate-900/60 backdrop-blur border border-slate-800/60 rounded-xl p-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
              NFT Details
            </h4>
            <div className="space-y-3">
              <div>
                <span className="text-[10px] text-slate-600 uppercase tracking-wider block mb-0.5">Token ID</span>
                <span className="text-lg font-bold font-mono text-blue-400">#{LEASE_NFT_ID}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-600 uppercase tracking-wider block mb-0.5">Contract</span>
                <code className="text-xs font-mono text-emerald-400">{truncateAddress(CONTRACTS.leaseFactory.address)}</code>
              </div>
              <div>
                <span className="text-[10px] text-slate-600 uppercase tracking-wider block mb-0.5">Owner</span>
                <code className="text-xs font-mono text-emerald-400">{truncateAddress(LESSEE)}</code>
              </div>
              <div>
                <span className="text-[10px] text-slate-600 uppercase tracking-wider block mb-0.5">Standard</span>
                <span className="text-xs text-slate-300">ERC-721</span>
              </div>
            </div>
          </div>

          <BlockAnimation
            blockNumber={18_500_021}
            txHash="0xef1234...bcdef9012"
            active={phase === 'minted'}
          />
        </div>
      </div>
    </StepContainer>
  );
}
