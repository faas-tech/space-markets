'use client';

import React, { useEffect, useState } from 'react';
import { StepContainer } from '../step-container';
import { useDemoContext } from '../demo-provider';
import {
  DEPLOYER,
  LESSOR,
  LESSEE,
  CONTRACTS,
  LEASE_NFT_ID,
  TX_HASHES,
  X402_CONFIG,
  BLOCK_NUMBERS,
  truncateAddress,
  truncateHash,
} from '@/lib/demo/demo-data';
import { cn } from '@/lib/utils';

export function Step12Summary() {
  const { state, completeStep } = useDemoContext();
  const isActive = state.currentStep === 12;
  const [revealedSections, setRevealedSections] = useState(0);

  useEffect(() => {
    if (!isActive) {
      setRevealedSections(0);
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i <= 5; i++) {
      timers.push(
        setTimeout(() => setRevealedSections(i), i * 500)
      );
    }

    timers.push(
      setTimeout(() => {
        completeStep(12, {
          protocolComplete: true,
          totalTransactions: 10,
          totalContracts: 5,
          nftMinted: true,
          revenueDistributed: true,
        });
      }, 3500)
    );

    return () => timers.forEach(clearTimeout);
  }, [isActive, completeStep]);

  const sectionVisible = (idx: number) => revealedSections >= idx;

  return (
    <StepContainer stepNumber={12}>
      <div className="space-y-6">
        {/* Top stats row */}
        <div
          className={cn(
            'grid grid-cols-2 sm:grid-cols-4 gap-3 transition-all duration-500',
            sectionVisible(1) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          )}
        >
          {[
            { label: 'Contracts Deployed', value: '5', color: 'text-purple-400' },
            { label: 'Transactions', value: '10', color: 'text-blue-400' },
            { label: 'Revenue Distributed', value: '1,000 USDC', color: 'text-emerald-400' },
            { label: 'Lease NFT', value: `#${LEASE_NFT_ID}`, color: 'text-amber-400' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-slate-900/60 backdrop-blur border border-slate-800/60 rounded-xl p-4 text-center"
            >
              <p className={cn('text-xl sm:text-2xl font-bold font-mono', stat.color)}>
                {stat.value}
              </p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Deployed contracts */}
          <div
            className={cn(
              'transition-all duration-500',
              sectionVisible(2) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            )}
          >
            <div className="bg-slate-900/60 backdrop-blur border border-slate-800/60 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-slate-800/60">
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  Deployed Contracts
                </h4>
              </div>
              <div className="divide-y divide-slate-800/30">
                {Object.values(CONTRACTS).map((contract) => (
                  <div key={contract.name} className="px-4 py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                      <span className="text-xs text-white font-medium">{contract.name}</span>
                    </div>
                    <code className="text-[10px] font-mono text-emerald-400 shrink-0">
                      {truncateAddress(contract.address)}
                    </code>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Transaction log */}
          <div
            className={cn(
              'transition-all duration-500',
              sectionVisible(3) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            )}
          >
            <div className="bg-slate-900/60 backdrop-blur border border-slate-800/60 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-slate-800/60">
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  Transaction Log
                </h4>
              </div>
              <div className="divide-y divide-slate-800/30 max-h-60 overflow-y-auto">
                {[
                  { label: 'Deploy Contracts', hash: TX_HASHES.deploy, block: BLOCK_NUMBERS.deployBlock },
                  { label: 'Create Asset Type', hash: TX_HASHES.createType, block: BLOCK_NUMBERS.createTypeBlock },
                  { label: 'Register Asset', hash: TX_HASHES.registerAsset, block: BLOCK_NUMBERS.registerBlock },
                  { label: 'Lease Offer', hash: TX_HASHES.leaseOffer, block: BLOCK_NUMBERS.offerBlock },
                  { label: 'Lessee Bid', hash: TX_HASHES.lesseeBid, block: BLOCK_NUMBERS.bidBlock },
                  { label: 'Lessor Accept', hash: TX_HASHES.lessorAccept, block: BLOCK_NUMBERS.acceptBlock },
                  { label: 'Mint NFT', hash: TX_HASHES.mintNft, block: BLOCK_NUMBERS.mintBlock },
                  { label: 'X402 Payments', hash: TX_HASHES.x402Payment, block: BLOCK_NUMBERS.x402StartBlock },
                  { label: 'Revenue Distribution', hash: TX_HASHES.revenue, block: BLOCK_NUMBERS.revenueBlock },
                ].map((tx) => (
                  <div key={tx.label} className="px-4 py-2 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-xs text-slate-400 block">{tx.label}</span>
                      <code className="text-[10px] font-mono text-blue-400 truncate block">
                        {truncateHash(tx.hash)}
                      </code>
                    </div>
                    <span className="text-[10px] font-mono text-amber-400 shrink-0">
                      #{tx.block.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Participants */}
          <div
            className={cn(
              'transition-all duration-500',
              sectionVisible(4) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            )}
          >
            <div className="bg-slate-900/60 backdrop-blur border border-slate-800/60 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-slate-800/60">
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  Participants
                </h4>
              </div>
              <div className="divide-y divide-slate-800/30">
                {[
                  { role: 'Deployer', address: DEPLOYER },
                  { role: 'Lessor', address: LESSOR },
                  { role: 'Lessee', address: LESSEE },
                  { role: 'Facilitator', address: X402_CONFIG.facilitator },
                ].map((p) => (
                  <div key={p.role} className="px-4 py-2.5 flex items-center justify-between gap-3">
                    <span className="text-xs text-slate-400">{p.role}</span>
                    <code className="text-xs font-mono text-emerald-400">
                      {truncateAddress(p.address)}
                    </code>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Protocol health */}
          <div
            className={cn(
              'transition-all duration-500',
              sectionVisible(5) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            )}
          >
            <div className="bg-slate-900/60 backdrop-blur border border-slate-800/60 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-slate-800/60">
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  System Health
                </h4>
              </div>
              <div className="p-4 space-y-3">
                {[
                  { label: 'Smart Contracts', status: 'Operational', ok: true },
                  { label: 'Asset Registry', status: '1 type, 1 asset', ok: true },
                  { label: 'Active Leases', status: '1 active', ok: true },
                  { label: 'X402 Payments', status: 'Streaming', ok: true },
                  { label: 'Revenue Pipeline', status: 'Distributed', ok: true },
                  { label: 'Metadata Integrity', status: 'Verified', ok: true },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className={cn('w-2 h-2 rounded-full', item.ok ? 'bg-emerald-400' : 'bg-red-400')} />
                      <span className="text-xs text-slate-400">{item.label}</span>
                    </div>
                    <span className={cn('text-[10px] font-medium', item.ok ? 'text-emerald-400' : 'text-red-400')}>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Final message */}
        {sectionVisible(5) && (
          <div className="text-center py-6 animate-[fadeInUp_0.5s_ease-out]">
            <p className="text-lg font-bold text-white mb-2">
              Protocol Demo Complete
            </p>
            <p className="text-sm text-slate-400 max-w-xl mx-auto">
              The Asset Leasing Protocol has been demonstrated end-to-end: from contract deployment,
              through asset tokenization and marketplace matching, to X402 V2 streaming payments and
              proportional revenue distribution.
            </p>
          </div>
        )}
      </div>
    </StepContainer>
  );
}
