'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { StepContainer } from '../step-container';
import { useDemoContext } from '../demo-provider';
import {
  LESSEE,
  LESSOR,
  LEASE_TERMS,
  X402_CONFIG,
  truncateAddress,
} from '@/lib/demo/demo-data';
import { OrbitalPath } from '../animations/orbital-path';
import { PaymentPulse } from '../animations/payment-pulse';
import { cn } from '@/lib/utils';

export function Step10X402Streaming() {
  const { state, completeStep } = useDemoContext();
  const isActive = state.currentStep === 10;
  const [phase, setPhase] = useState<'idle' | 'connecting' | 'streaming' | 'complete'>('idle');
  const [runningTotal, setRunningTotal] = useState(0);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [headerEntries, setHeaderEntries] = useState<Array<{ second: number; sig: string }>>([]);
  const completedRef = useRef(false);

  useEffect(() => {
    if (!isActive) {
      setPhase('idle');
      setRunningTotal(0);
      setSecondsElapsed(0);
      setHeaderEntries([]);
      completedRef.current = false;
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setPhase('connecting'), 300));
    timers.push(setTimeout(() => setPhase('streaming'), 1200));

    return () => timers.forEach(clearTimeout);
  }, [isActive]);

  // Streaming pulse counter
  useEffect(() => {
    if (phase !== 'streaming') return;

    const interval = setInterval(() => {
      setSecondsElapsed((prev) => {
        const next = prev + 1;
        const rate = parseFloat(LEASE_TERMS.ratePerSecond);
        setRunningTotal(next * rate);

        // Add header entry
        const sigFragment = `0x${Math.random().toString(16).slice(2, 10)}...`;
        setHeaderEntries((prevEntries) => {
          const updated = [...prevEntries, { second: next, sig: sigFragment }];
          return updated.slice(-5); // keep last 5
        });

        // Complete after 8 seconds of streaming
        if (next >= 8 && !completedRef.current) {
          completedRef.current = true;
          setPhase('complete');
          completeStep(10, {
            totalPaid: (8 * rate).toFixed(6),
            secondsStreamed: 8,
            facilitator: X402_CONFIG.facilitator,
          });
        }
        return next;
      });
    }, 800); // slightly faster than 1s for demo feel

    return () => clearInterval(interval);
  }, [phase, completeStep]);

  const handlePulse = useCallback((total: number) => {
    // handled above
  }, []);

  return (
    <StepContainer stepNumber={10}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main visualization */}
        <div className="lg:col-span-2 space-y-6">
          {/* Orbital payment visualization -- desktop only */}
          <div className="hidden md:flex justify-center">
            <OrbitalPath
              size={280}
              active={phase === 'streaming'}
              color="rgba(16, 185, 129, 0.3)"
            >
              <div className="text-center">
                <p className="text-2xl font-bold font-mono text-white">
                  {runningTotal.toFixed(4)}
                </p>
                <p className="text-xs text-slate-500">USDC Streamed</p>
              </div>
            </OrbitalPath>
          </div>

          {/* Running total -- mobile visible */}
          <div className="md:hidden bg-slate-900/60 backdrop-blur border border-slate-800/60 rounded-xl p-5 text-center">
            <p className="text-3xl font-bold font-mono text-white">
              {runningTotal.toFixed(4)}
            </p>
            <p className="text-xs text-slate-500 mt-1">USDC Streamed</p>
          </div>

          {/* Payment pulse stream */}
          <PaymentPulse
            active={phase === 'streaming'}
            amountPerPulse={parseFloat(LEASE_TERMS.ratePerSecond)}
            interval={800}
            onPulse={handlePulse}
          />

          {/* Payment-Signature headers log */}
          <div className="bg-slate-900/60 backdrop-blur border border-slate-800/60 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-800/60 flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Payment-Signature Headers
              </h4>
              <span className="text-[10px] font-mono text-slate-600">
                {secondsElapsed}s elapsed
              </span>
            </div>

            <div className="max-h-40 overflow-y-auto">
              {headerEntries.length === 0 && (
                <div className="px-4 py-3 text-xs text-slate-600">
                  {phase === 'connecting'
                    ? 'Establishing X402 payment channel...'
                    : 'Waiting for stream to begin...'}
                </div>
              )}

              {headerEntries.map((entry, idx) => (
                <div
                  key={`${entry.second}-${idx}`}
                  className={cn(
                    'px-4 py-2 border-b border-slate-800/20 flex items-center justify-between gap-4 font-mono text-[11px]',
                    idx === headerEntries.length - 1 && 'bg-emerald-900/5'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600">t={entry.second}s</span>
                    <span className="text-blue-400">Payment-Signature:</span>
                    <span className="text-slate-500 truncate">{entry.sig}</span>
                  </div>
                  <span className="text-emerald-400 shrink-0">
                    +{LEASE_TERMS.ratePerSecond}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          {/* Stream status */}
          <div className="bg-slate-900/60 backdrop-blur border border-slate-800/60 rounded-xl p-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
              Stream Status
            </h4>
            <div className="space-y-3">
              <div>
                <span className="text-[10px] text-slate-600 uppercase tracking-wider block mb-0.5">
                  Status
                </span>
                <span
                  className={cn(
                    'text-xs font-bold',
                    phase === 'streaming' ? 'text-emerald-400' :
                    phase === 'complete' ? 'text-blue-400' :
                    phase === 'connecting' ? 'text-amber-400' : 'text-slate-500'
                  )}
                >
                  {phase === 'streaming' ? 'STREAMING' :
                   phase === 'complete' ? 'COMPLETE' :
                   phase === 'connecting' ? 'CONNECTING' : 'IDLE'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-600 uppercase tracking-wider block mb-0.5">
                  Rate
                </span>
                <span className="text-xs font-mono text-cyan-400">
                  {LEASE_TERMS.ratePerSecond} USDC/sec
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-600 uppercase tracking-wider block mb-0.5">
                  Total Streamed
                </span>
                <span className="text-xs font-mono text-white font-bold">
                  {runningTotal.toFixed(6)} USDC
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-600 uppercase tracking-wider block mb-0.5">
                  Elapsed
                </span>
                <span className="text-xs font-mono text-amber-400">
                  {secondsElapsed} seconds
                </span>
              </div>
            </div>
          </div>

          {/* Participants */}
          <div className="bg-slate-900/60 backdrop-blur border border-slate-800/60 rounded-xl p-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
              Participants
            </h4>
            <div className="space-y-3">
              <div>
                <span className="text-[10px] text-slate-600 uppercase tracking-wider block mb-0.5">Payer (Lessee)</span>
                <code className="text-xs font-mono text-emerald-400">{truncateAddress(LESSEE)}</code>
              </div>
              <div>
                <span className="text-[10px] text-slate-600 uppercase tracking-wider block mb-0.5">Receiver (Lessor)</span>
                <code className="text-xs font-mono text-emerald-400">{truncateAddress(LESSOR)}</code>
              </div>
              <div>
                <span className="text-[10px] text-slate-600 uppercase tracking-wider block mb-0.5">Facilitator</span>
                <code className="text-xs font-mono text-purple-400">{truncateAddress(X402_CONFIG.facilitator)}</code>
              </div>
              <div>
                <span className="text-[10px] text-slate-600 uppercase tracking-wider block mb-0.5">Network</span>
                <span className="text-xs font-mono text-slate-300">{X402_CONFIG.network}</span>
              </div>
            </div>
          </div>

          {/* Facilitator verification */}
          <div
            className={cn(
              'bg-slate-900/60 backdrop-blur border rounded-xl p-4 transition-all duration-500',
              phase === 'streaming' || phase === 'complete'
                ? 'border-emerald-500/20'
                : 'border-slate-800/60 opacity-40'
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              {phase === 'streaming' ? (
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              ) : phase === 'complete' ? (
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <div className="w-2 h-2 rounded-full bg-slate-700" />
              )}
              <span className="text-xs font-bold text-white">Facilitator Verification</span>
            </div>
            <p className="text-[10px] text-slate-500">
              Each payment signature is verified by the Coinbase facilitator before forwarding to the resource server.
            </p>
          </div>
        </div>
      </div>
    </StepContainer>
  );
}
