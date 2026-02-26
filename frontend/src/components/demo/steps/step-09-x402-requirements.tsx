'use client';

import React, { useEffect, useState } from 'react';
import { StepContainer } from '../step-container';
import { useDemoContext } from '../demo-provider';
import {
  X402_CONFIG,
  CONTRACTS,
  truncateAddress,
} from '@/lib/demo/demo-data';
import { cn } from '@/lib/utils';

export function Step09X402Requirements() {
  const { state, completeStep } = useDemoContext();
  const isActive = state.currentStep === 9;
  const [phase, setPhase] = useState<'idle' | 'request' | 'response' | 'parsed'>('idle');

  useEffect(() => {
    if (!isActive) {
      setPhase('idle');
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setPhase('request'), 300));
    timers.push(setTimeout(() => setPhase('response'), 1400));
    timers.push(setTimeout(() => {
      setPhase('parsed');
      completeStep(9, {
        x402Version: X402_CONFIG.version,
        network: X402_CONFIG.network,
        facilitator: X402_CONFIG.facilitator,
        resourceUrl: X402_CONFIG.resourceUrl,
      });
    }, 2800));

    return () => timers.forEach(clearTimeout);
  }, [isActive, completeStep]);

  const paymentRequirements = {
    x402Version: X402_CONFIG.version,
    accepts: [
      {
        scheme: 'exact',
        network: X402_CONFIG.network,
        maxAmountRequired: X402_CONFIG.maxAmountRequired,
        resource: X402_CONFIG.resourceUrl,
        description: X402_CONFIG.description,
        mimeType: 'application/json',
        payTo: truncateAddress(CONTRACTS.marketplace.address),
        requiredDeadlineSeconds: 300,
        outputSchema: null,
        extra: {
          name: 'Orbital Compute Station Access',
          version: '2',
        },
      },
    ],
  };

  return (
    <StepContainer stepNumber={9}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* HTTP Request / Response */}
        <div className="space-y-4">
          {/* Request */}
          <div
            className={cn(
              'bg-slate-900/60 backdrop-blur border rounded-xl overflow-hidden transition-all duration-500',
              phase !== 'idle' ? 'border-blue-500/20' : 'border-slate-800/60 opacity-40'
            )}
          >
            <div className="px-4 py-2.5 border-b border-slate-800/60 flex items-center gap-2">
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/40 text-blue-300 font-bold">
                GET
              </span>
              <code className="text-xs font-mono text-slate-400 truncate">
                /v1/leases/1/access
              </code>
            </div>
            <div className="px-4 py-3 space-y-1 font-mono text-[11px]">
              <div className="text-slate-600">Host: <span className="text-slate-400">api.spacemarkets.io</span></div>
              <div className="text-slate-600">Authorization: <span className="text-slate-400">Bearer ...</span></div>
              <div className="text-slate-600">Accept: <span className="text-slate-400">application/json</span></div>
            </div>
          </div>

          {/* Arrow */}
          {phase !== 'idle' && (
            <div className="flex justify-center">
              <svg className="w-6 h-6 text-slate-700 animate-[fadeInUp_0.3s_ease-out]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
          )}

          {/* 402 Response */}
          <div
            className={cn(
              'bg-slate-900/60 backdrop-blur border rounded-xl overflow-hidden transition-all duration-500',
              phase === 'response' || phase === 'parsed'
                ? 'border-amber-500/30 shadow-[0_0_20px_-5px_rgba(245,158,11,0.15)]'
                : 'border-slate-800/60 opacity-20'
            )}
          >
            <div className="px-4 py-2.5 border-b border-slate-800/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/40 text-amber-300 font-bold">
                  402
                </span>
                <span className="text-xs text-amber-400 font-medium">Payment Required</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-900/30 text-emerald-300 border border-emerald-800/40 font-mono">
                X402 V2
              </span>
            </div>

            {/* Response headers */}
            <div className="px-4 py-3 border-b border-slate-800/40 font-mono text-[11px] space-y-1">
              <div className="text-slate-600">
                Content-Type: <span className="text-slate-400">application/json</span>
              </div>
              <div className="text-amber-500/80">
                Payment-Required: <span className="text-amber-400">&lt;payment-requirements-json&gt;</span>
              </div>
            </div>

            {/* Response body hint */}
            <div className="px-4 py-3">
              <p className="text-xs text-slate-500">
                Response body contains the payment requirements object for X402 V2.
              </p>
            </div>
          </div>
        </div>

        {/* Payment Requirements JSON */}
        <div className="space-y-4">
          <div
            className={cn(
              'bg-slate-900/60 backdrop-blur border rounded-xl overflow-hidden transition-all duration-700',
              phase === 'parsed'
                ? 'border-emerald-500/20'
                : 'border-slate-800/60'
            )}
          >
            <div className="px-4 py-2.5 border-b border-slate-800/60 flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Payment Requirements
              </h4>
              <span className="text-[10px] font-mono text-slate-600">application/json</span>
            </div>

            {/* JSON display */}
            <div className="p-4 font-mono text-[11px] leading-relaxed overflow-x-auto">
              <div className="text-slate-600">{'{'}</div>
              <div className="pl-4">
                <span className="text-blue-400">&quot;x402Version&quot;</span>
                <span className="text-slate-600">: </span>
                <span className="text-amber-400">{paymentRequirements.x402Version}</span>
                <span className="text-slate-600">,</span>
              </div>
              <div className="pl-4">
                <span className="text-blue-400">&quot;accepts&quot;</span>
                <span className="text-slate-600">: [{'{'}</span>
              </div>
              <div className="pl-8">
                <span className="text-blue-400">&quot;scheme&quot;</span>
                <span className="text-slate-600">: </span>
                <span className="text-emerald-400">&quot;exact&quot;</span>
                <span className="text-slate-600">,</span>
              </div>
              <div className="pl-8">
                <span className="text-blue-400">&quot;network&quot;</span>
                <span className="text-slate-600">: </span>
                <span className="text-emerald-400">&quot;{X402_CONFIG.network}&quot;</span>
                <span className="text-slate-600">,</span>
              </div>
              <div className="pl-8">
                <span className="text-blue-400">&quot;maxAmountRequired&quot;</span>
                <span className="text-slate-600">: </span>
                <span className="text-amber-400">&quot;{X402_CONFIG.maxAmountRequired}&quot;</span>
                <span className="text-slate-600">,</span>
              </div>
              <div className="pl-8">
                <span className="text-blue-400">&quot;resource&quot;</span>
                <span className="text-slate-600">: </span>
                <span className="text-emerald-400 break-all">&quot;{X402_CONFIG.resourceUrl}&quot;</span>
                <span className="text-slate-600">,</span>
              </div>
              <div className="pl-8">
                <span className="text-blue-400">&quot;payTo&quot;</span>
                <span className="text-slate-600">: </span>
                <span className="text-emerald-400">&quot;{truncateAddress(CONTRACTS.marketplace.address)}&quot;</span>
                <span className="text-slate-600">,</span>
              </div>
              <div className="pl-8">
                <span className="text-blue-400">&quot;requiredDeadlineSeconds&quot;</span>
                <span className="text-slate-600">: </span>
                <span className="text-amber-400">300</span>
                <span className="text-slate-600">,</span>
              </div>
              <div className="pl-8">
                <span className="text-blue-400">&quot;description&quot;</span>
                <span className="text-slate-600">: </span>
                <span className="text-emerald-400 break-all">&quot;{X402_CONFIG.description}&quot;</span>
              </div>
              <div className="pl-4">
                <span className="text-slate-600">{'}]'}</span>
              </div>
              <div className="text-slate-600">{'}'}</div>
            </div>
          </div>

          {/* V2 highlights */}
          <div className="bg-slate-900/60 backdrop-blur border border-slate-800/60 rounded-xl p-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
              X402 V2 Protocol
            </h4>
            <div className="space-y-2">
              {[
                { header: 'Payment-Required', desc: 'Response header (402)', color: 'text-amber-400' },
                { header: 'Payment-Signature', desc: 'Request header (signed)', color: 'text-blue-400' },
                { header: 'Payment-Response', desc: 'Success response (200)', color: 'text-emerald-400' },
                { header: 'paymentPayload', desc: 'Body field name (V2)', color: 'text-purple-400' },
              ].map((item) => (
                <div key={item.header} className="flex items-center justify-between gap-2">
                  <code className={cn('text-[10px] font-mono font-bold', item.color)}>
                    {item.header}
                  </code>
                  <span className="text-[10px] text-slate-600">{item.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </StepContainer>
  );
}
