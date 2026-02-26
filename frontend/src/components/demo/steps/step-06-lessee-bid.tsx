'use client';

import React, { useEffect, useState } from 'react';
import { StepContainer } from '../step-container';
import { useDemoContext } from '../demo-provider';
import {
  LESSEE,
  LEASE_TERMS,
  HASHES,
  CONTRACTS,
  USDC_ADDRESS,
  truncateAddress,
} from '@/lib/demo/demo-data';
import { SignatureFlow } from '../animations/signature-flow';
import { BlockAnimation } from '../animations/block-animation';
import { cn } from '@/lib/utils';

export function Step06LesseeBid() {
  const { state, completeStep } = useDemoContext();
  const isActive = state.currentStep === 6;
  const [phase, setPhase] = useState<'idle' | 'typing' | 'signing' | 'escrow' | 'submitted'>('idle');

  useEffect(() => {
    if (!isActive) {
      setPhase('idle');
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setPhase('typing'), 300));
    timers.push(setTimeout(() => setPhase('signing'), 1500));
    timers.push(setTimeout(() => setPhase('escrow'), 3200));
    timers.push(setTimeout(() => {
      setPhase('submitted');
      completeStep(6, {
        bidder: LESSEE,
        bidSignature: HASHES.bidSignatureHash,
        escrowDeposited: LEASE_TERMS.escrowAmount,
      });
    }, 4000));

    return () => timers.forEach(clearTimeout);
  }, [isActive, completeStep]);

  const eip712Fields = [
    { name: 'leaseId', value: `${LEASE_TERMS.leaseId}` },
    { name: 'assetId', value: `${LEASE_TERMS.assetId}` },
    { name: 'bidder', value: truncateAddress(LESSEE) },
    { name: 'ratePerSecond', value: `${LEASE_TERMS.ratePerSecond} USDC` },
    { name: 'duration', value: LEASE_TERMS.duration },
    { name: 'escrowAmount', value: `${LEASE_TERMS.escrowAmount} USDC` },
    { name: 'paymentToken', value: truncateAddress(USDC_ADDRESS) },
  ];

  return (
    <StepContainer stepNumber={6}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* EIP-712 Typed Data */}
        <div className="space-y-4">
          <div className="bg-slate-900/60 backdrop-blur border border-slate-800/60 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800/60 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">EIP-712 Typed Data</h3>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/30 text-blue-300 border border-blue-800/40 font-mono">
                LeaseBid
              </span>
            </div>

            {/* Domain separator */}
            <div className="px-4 py-2.5 border-b border-slate-800/40 bg-slate-900/30">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
                Domain Separator
              </span>
              <div className="space-y-1">
                {[
                  { k: 'name', v: 'SpaceMarkets' },
                  { k: 'version', v: '1' },
                  { k: 'chainId', v: '84532' },
                  { k: 'verifyingContract', v: truncateAddress(CONTRACTS.marketplace.address) },
                ].map((item) => (
                  <div key={item.k} className="flex items-center gap-2 text-[10px]">
                    <span className="text-slate-600 font-mono w-28">{item.k}:</span>
                    <span className="text-slate-400 font-mono">{item.v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Message fields */}
            <div className="px-4 py-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block mb-2">
                Message Fields
              </span>
              <div className="space-y-1.5">
                {eip712Fields.map((field, idx) => (
                  <div
                    key={field.name}
                    className={cn(
                      'flex items-center justify-between gap-2 transition-all duration-300',
                      phase !== 'idle' ? 'opacity-100' : 'opacity-30'
                    )}
                    style={{ transitionDelay: `${idx * 80}ms` }}
                  >
                    <code className="text-[10px] font-mono text-blue-400">{field.name}</code>
                    <code className="text-[10px] font-mono text-slate-400 truncate">{field.value}</code>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Signature & Escrow */}
        <div className="space-y-4">
          {/* Signature computation */}
          <div className="bg-slate-900/60 backdrop-blur border border-slate-800/60 rounded-xl p-5">
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">
              Digest Computation
            </h4>
            <SignatureFlow
              label="EIP-712 Digest"
              fields={eip712Fields.slice(0, 4)}
              digest={HASHES.bidSignatureHash}
              active={phase === 'signing' || phase === 'escrow' || phase === 'submitted'}
              delay={100}
            />
          </div>

          {/* Wallet signing */}
          <div
            className={cn(
              'bg-slate-900/60 backdrop-blur border rounded-xl p-4 transition-all duration-500',
              phase === 'signing'
                ? 'border-blue-500/30 shadow-[0_0_20px_-5px_rgba(59,130,246,0.3)]'
                : phase === 'escrow' || phase === 'submitted'
                  ? 'border-emerald-500/20'
                  : 'border-slate-800/60 opacity-40'
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-500',
                  phase === 'signing' ? 'bg-blue-600 animate-pulse' :
                  phase === 'escrow' || phase === 'submitted' ? 'bg-emerald-600/20' : 'bg-slate-800'
                )}
              >
                {phase === 'escrow' || phase === 'submitted' ? (
                  <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                  </svg>
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-white">
                  {phase === 'signing' ? 'Signing with wallet...' :
                   phase === 'escrow' || phase === 'submitted' ? 'Signature confirmed' : 'Awaiting wallet'}
                </p>
                <p className="text-xs text-slate-500">
                  Signer: {truncateAddress(LESSEE)}
                </p>
              </div>
            </div>
          </div>

          {/* Escrow deposit */}
          <div
            className={cn(
              'bg-slate-900/60 backdrop-blur border rounded-xl p-4 transition-all duration-500',
              phase === 'escrow'
                ? 'border-amber-500/30'
                : phase === 'submitted'
                  ? 'border-emerald-500/20'
                  : 'border-slate-800/60 opacity-40'
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white">USDC Escrow Deposit</p>
                <p className="text-[10px] text-slate-500">Locked in Marketplace contract</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold font-mono text-amber-400">
                  {LEASE_TERMS.escrowAmount}
                </p>
                <p className="text-[10px] text-slate-500">USDC</p>
              </div>
            </div>
          </div>

          <BlockAnimation
            blockNumber={18_500_015}
            txHash="0xabcdef...9012abcd"
            active={phase === 'submitted'}
          />
        </div>
      </div>
    </StepContainer>
  );
}
