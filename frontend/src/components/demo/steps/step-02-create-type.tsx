'use client';

import React, { useEffect, useState } from 'react';
import { StepContainer } from '../step-container';
import { useDemoContext } from '../demo-provider';
import { ASSET_TYPE, HASHES, CONTRACTS, truncateAddress, truncateHash } from '@/lib/demo/demo-data';
import { SignatureFlow } from '../animations/signature-flow';
import { BlockAnimation } from '../animations/block-animation';
import { cn } from '@/lib/utils';

export function Step02CreateType() {
  const { state, completeStep } = useDemoContext();
  const isActive = state.currentStep === 2;
  const [fieldsRevealed, setFieldsRevealed] = useState(0);
  const [hashReady, setHashReady] = useState(false);

  useEffect(() => {
    if (!isActive) {
      setFieldsRevealed(0);
      setHashReady(false);
      return;
    }

    const schemaFields = Object.keys(ASSET_TYPE.schema);
    const timers: ReturnType<typeof setTimeout>[] = [];

    schemaFields.forEach((_, idx) => {
      timers.push(
        setTimeout(() => {
          setFieldsRevealed(idx + 1);
        }, 300 + idx * 400)
      );
    });

    timers.push(
      setTimeout(() => {
        setHashReady(true);
        completeStep(2, {
          typeName: ASSET_TYPE.name,
          typeHash: HASHES.assetTypeHash,
          schemaFields: schemaFields.length,
        });
      }, 300 + schemaFields.length * 400 + 500)
    );

    return () => timers.forEach(clearTimeout);
  }, [isActive, completeStep]);

  const schemaEntries = Object.entries(ASSET_TYPE.schema);

  return (
    <StepContainer stepNumber={2}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Schema definition */}
        <div className="space-y-4">
          <div className="bg-slate-900/60 backdrop-blur border border-slate-800/60 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800/60 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">{ASSET_TYPE.name}</h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/30 text-blue-300 border border-blue-800/40">
                  {ASSET_TYPE.category}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/30 text-amber-300 border border-amber-800/40">
                  {ASSET_TYPE.subcategory}
                </span>
              </div>
            </div>

            <div className="divide-y divide-slate-800/40">
              {schemaEntries.map(([key, field], idx) => (
                <div
                  key={key}
                  className={cn(
                    'px-4 py-3 flex items-center justify-between gap-4 transition-all duration-400',
                    idx < fieldsRevealed ? 'opacity-100' : 'opacity-0 translate-x-2'
                  )}
                  style={{ transitionDelay: `${idx * 50}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <code className="text-xs font-mono text-blue-400">{key}</code>
                    <span className="text-[10px] text-slate-600">{field.description}</span>
                  </div>
                  <span className="text-[10px] font-mono text-purple-400 bg-purple-900/20 px-1.5 py-0.5 rounded shrink-0">
                    {field.type}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Contract target */}
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Target:</span>
            <code className="font-mono text-emerald-400">
              AssetRegistry ({truncateAddress(CONTRACTS.assetRegistry.address)})
            </code>
          </div>
        </div>

        {/* Hash computation */}
        <div className="space-y-4">
          <div className="bg-slate-900/60 backdrop-blur border border-slate-800/60 rounded-xl p-5">
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">
              Type Hash Computation
            </h4>

            <SignatureFlow
              label="keccak256"
              fields={schemaEntries.map(([key, field]) => ({
                name: key,
                value: field.type,
              }))}
              digest={HASHES.assetTypeHash}
              active={isActive && fieldsRevealed >= schemaEntries.length}
              delay={200}
            />
          </div>

          {/* Result */}
          {hashReady && (
            <div className="bg-slate-900/60 backdrop-blur border border-emerald-500/20 rounded-xl p-4 animate-[fadeInUp_0.4s_ease-out]">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm font-bold text-emerald-400">Asset Type Registered</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Type ID</span>
                  <span className="text-xs font-mono text-amber-400">1</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Type Hash</span>
                  <code className="text-xs font-mono text-blue-400">
                    {truncateHash(HASHES.assetTypeHash)}
                  </code>
                </div>
              </div>
            </div>
          )}

          <BlockAnimation
            blockNumber={18_499_995}
            txHash="0xdef456...56789012"
            active={hashReady}
          />
        </div>
      </div>
    </StepContainer>
  );
}
