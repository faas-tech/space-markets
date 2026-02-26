'use client';

import React, { useEffect, useState } from 'react';
import { StepContainer } from '../step-container';
import { useDemoContext } from '../demo-provider';
import {
  LESSOR,
  LESSEE,
  LEASE_TERMS,
  HASHES,
  truncateAddress,
  truncateHash,
} from '@/lib/demo/demo-data';
import { SignatureFlow } from '../animations/signature-flow';
import { BlockAnimation } from '../animations/block-animation';
import { cn } from '@/lib/utils';

interface BidEntry {
  bidder: string;
  ratePerDay: string;
  escrow: string;
  selected: boolean;
}

export function Step07LessorAccept() {
  const { state, completeStep } = useDemoContext();
  const isActive = state.currentStep === 7;
  const [phase, setPhase] = useState<'idle' | 'reviewing' | 'selecting' | 'signing' | 'accepted'>('idle');

  const bids: BidEntry[] = [
    { bidder: LESSEE, ratePerDay: '33.33', escrow: '200.00', selected: false },
    { bidder: '0x90F79bf6EB2c4f870365E785982E1f101E93b906', ratePerDay: '30.00', escrow: '180.00', selected: false },
    { bidder: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65', ratePerDay: '35.00', escrow: '210.00', selected: false },
  ];

  useEffect(() => {
    if (!isActive) {
      setPhase('idle');
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setPhase('reviewing'), 300));
    timers.push(setTimeout(() => setPhase('selecting'), 1500));
    timers.push(setTimeout(() => setPhase('signing'), 2500));
    timers.push(setTimeout(() => {
      setPhase('accepted');
      completeStep(7, {
        selectedBidder: LESSEE,
        acceptSignature: HASHES.acceptSignatureHash,
        matchedRate: LEASE_TERMS.ratePerDay,
      });
    }, 3800));

    return () => timers.forEach(clearTimeout);
  }, [isActive, completeStep]);

  return (
    <StepContainer stepNumber={7}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bid review */}
        <div className="space-y-4">
          <div className="bg-slate-900/60 backdrop-blur border border-slate-800/60 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800/60 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Active Bids</h3>
              <span className="text-xs text-slate-500">{bids.length} bids received</span>
            </div>

            <div className="divide-y divide-slate-800/40">
              {bids.map((bid, idx) => {
                const isWinner = idx === 0;
                const isSelected = phase === 'selecting' || phase === 'signing' || phase === 'accepted';

                return (
                  <div
                    key={bid.bidder}
                    className={cn(
                      'px-4 py-3 transition-all duration-500',
                      isWinner && isSelected
                        ? 'bg-blue-900/10 border-l-2 border-l-blue-500'
                        : isSelected && !isWinner
                          ? 'opacity-40'
                          : '',
                      phase === 'reviewing' ? 'opacity-100' : phase === 'idle' ? 'opacity-0' : ''
                    )}
                    style={{
                      transitionDelay: phase === 'reviewing' ? `${idx * 150}ms` : '0ms',
                    }}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                            isWinner && isSelected
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-800 text-slate-500'
                          )}
                        >
                          {idx + 1}
                        </div>
                        <div className="min-w-0">
                          <code className="text-xs font-mono text-emerald-400 block truncate">
                            {truncateAddress(bid.bidder)}
                          </code>
                          <span className="text-[10px] text-slate-600">
                            Escrow: {bid.escrow} USDC
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-sm font-mono font-bold text-white">
                          {bid.ratePerDay}
                        </span>
                        <span className="text-[10px] text-slate-600 block">USDC/day</span>
                      </div>
                    </div>

                    {/* Winner badge */}
                    {isWinner && phase === 'accepted' && (
                      <div className="mt-2 flex items-center gap-1.5 animate-[fadeInUp_0.3s_ease-out]">
                        <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                          Winner Selected
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Lessor info */}
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Lessor reviewing:</span>
            <code className="font-mono text-emerald-400">{truncateAddress(LESSOR)}</code>
          </div>
        </div>

        {/* Counter-signature */}
        <div className="space-y-4">
          <div className="bg-slate-900/60 backdrop-blur border border-slate-800/60 rounded-xl p-5">
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">
              Counter-Signature
            </h4>
            <SignatureFlow
              label="Accept Digest"
              fields={[
                { name: 'leaseId', value: `${LEASE_TERMS.leaseId}` },
                { name: 'bidder', value: truncateAddress(LESSEE) },
                { name: 'bidHash', value: truncateHash(HASHES.bidSignatureHash) },
                { name: 'lessor', value: truncateAddress(LESSOR) },
              ]}
              digest={HASHES.acceptSignatureHash}
              active={phase === 'signing' || phase === 'accepted'}
              delay={100}
            />
          </div>

          {/* Acceptance status */}
          <div
            className={cn(
              'bg-slate-900/60 backdrop-blur border rounded-xl p-4 transition-all duration-500',
              phase === 'accepted'
                ? 'border-emerald-500/20'
                : 'border-slate-800/60 opacity-40'
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center transition-colors',
                  phase === 'accepted' ? 'bg-emerald-600/20' : 'bg-slate-800'
                )}
              >
                {phase === 'accepted' ? (
                  <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-white">
                  {phase === 'accepted' ? 'Bid Accepted' : 'Awaiting acceptance'}
                </p>
                <p className="text-xs text-slate-500">
                  Both signatures collected, proceeding to NFT mint
                </p>
              </div>
            </div>
          </div>

          <BlockAnimation
            blockNumber={18_500_020}
            txHash="0xcdef12...901234cd"
            active={phase === 'accepted'}
          />
        </div>
      </div>
    </StepContainer>
  );
}
