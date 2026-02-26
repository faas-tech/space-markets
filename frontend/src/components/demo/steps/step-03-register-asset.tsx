'use client';

import React, { useEffect, useState } from 'react';
import { StepContainer } from '../step-container';
import { useDemoContext } from '../demo-provider';
import {
  ASSET_METADATA,
  HASHES,
  CONTRACTS,
  LESSOR,
  truncateAddress,
  truncateHash,
} from '@/lib/demo/demo-data';
import { DataStream } from '../animations/data-stream';
import { BlockAnimation } from '../animations/block-animation';
import { cn } from '@/lib/utils';

export function Step03RegisterAsset() {
  const { state, completeStep } = useDemoContext();
  const isActive = state.currentStep === 3;
  const [phase, setPhase] = useState<'idle' | 'hashing' | 'deploying' | 'linking' | 'done'>('idle');

  useEffect(() => {
    if (!isActive) {
      setPhase('idle');
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setPhase('hashing'), 400));
    timers.push(setTimeout(() => setPhase('deploying'), 1400));
    timers.push(setTimeout(() => setPhase('linking'), 2600));
    timers.push(setTimeout(() => {
      setPhase('done');
      completeStep(3, {
        assetId: ASSET_METADATA.assetId,
        metadataHash: HASHES.metadataHash,
        tokenSymbol: ASSET_METADATA.tokenSymbol,
        tokenAddress: CONTRACTS.assetERC20.address,
      });
    }, 3400));

    return () => timers.forEach(clearTimeout);
  }, [isActive, completeStep]);

  const phaseOrder = ['hashing', 'deploying', 'linking', 'done'] as const;
  const isPhaseReached = (p: typeof phaseOrder[number]) =>
    phaseOrder.indexOf(phase as typeof phaseOrder[number]) >= phaseOrder.indexOf(p);

  return (
    <StepContainer stepNumber={3}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Asset card */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900/60 backdrop-blur border border-slate-800/60 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800/60">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">{ASSET_METADATA.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Asset ID: {ASSET_METADATA.assetId} | Type ID: {ASSET_METADATA.typeId}
                  </p>
                </div>
                <div
                  className={cn(
                    'px-2.5 py-1 rounded-md text-xs font-bold transition-all duration-500',
                    phase === 'done'
                      ? 'bg-emerald-900/30 text-emerald-300 border border-emerald-800/40'
                      : 'bg-slate-800 text-slate-500 border border-slate-700'
                  )}
                >
                  {phase === 'done' ? 'REGISTERED' : 'REGISTERING...'}
                </div>
              </div>
            </div>

            {/* Metadata fields */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-slate-800/30">
              {[
                { label: 'Compute Units', value: `${ASSET_METADATA.computeUnits} vCPU` },
                { label: 'Memory', value: `${ASSET_METADATA.memoryGB} GB` },
                { label: 'Storage', value: `${ASSET_METADATA.storageGB} GB NVMe` },
                { label: 'Bandwidth', value: `${ASSET_METADATA.bandwidthMbps} Mbps` },
                { label: 'Altitude', value: ASSET_METADATA.altitude },
                { label: 'Owner', value: truncateAddress(LESSOR) },
              ].map((item) => (
                <div key={item.label} className="bg-slate-900/60 px-4 py-3">
                  <span className="text-[10px] text-slate-600 uppercase tracking-wider block mb-0.5">
                    {item.label}
                  </span>
                  <span className="text-xs font-mono text-slate-300">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Phase progress */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Hash metadata */}
            <div
              className={cn(
                'bg-slate-900/60 border rounded-xl p-4 transition-all duration-500',
                isPhaseReached('hashing')
                  ? 'border-blue-500/20'
                  : 'border-slate-800/60 opacity-40'
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                {isPhaseReached('deploying') ? (
                  <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : isPhaseReached('hashing') ? (
                  <div className="w-4 h-4 border-2 border-blue-400/60 border-t-blue-400 rounded-full animate-spin" />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-slate-800 border border-slate-700" />
                )}
                <span className="text-xs font-bold text-white">Hash Metadata</span>
              </div>
              <p className="text-[10px] text-slate-500">Compute keccak256 of all metadata fields</p>
              {isPhaseReached('deploying') && (
                <code className="text-[10px] font-mono text-blue-400 block mt-2 truncate">
                  {truncateHash(HASHES.metadataHash)}
                </code>
              )}
            </div>

            {/* Deploy ERC-20 */}
            <div
              className={cn(
                'bg-slate-900/60 border rounded-xl p-4 transition-all duration-500',
                isPhaseReached('deploying')
                  ? 'border-purple-500/20'
                  : 'border-slate-800/60 opacity-40'
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                {isPhaseReached('linking') ? (
                  <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : isPhaseReached('deploying') ? (
                  <div className="w-4 h-4 border-2 border-purple-400/60 border-t-purple-400 rounded-full animate-spin" />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-slate-800 border border-slate-700" />
                )}
                <span className="text-xs font-bold text-white">Deploy ERC-20</span>
              </div>
              <p className="text-[10px] text-slate-500">
                {ASSET_METADATA.tokenSymbol} token with {ASSET_METADATA.tokenSupply} supply
              </p>
              {isPhaseReached('linking') && (
                <code className="text-[10px] font-mono text-emerald-400 block mt-2 truncate">
                  {truncateAddress(CONTRACTS.assetERC20.address)}
                </code>
              )}
            </div>

            {/* Link on-chain */}
            <div
              className={cn(
                'bg-slate-900/60 border rounded-xl p-4 transition-all duration-500',
                isPhaseReached('linking')
                  ? 'border-emerald-500/20'
                  : 'border-slate-800/60 opacity-40'
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                {phase === 'done' ? (
                  <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : isPhaseReached('linking') ? (
                  <div className="w-4 h-4 border-2 border-emerald-400/60 border-t-emerald-400 rounded-full animate-spin" />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-slate-800 border border-slate-700" />
                )}
                <span className="text-xs font-bold text-white">Link On-Chain</span>
              </div>
              <p className="text-[10px] text-slate-500">Associate asset, token, and metadata hash</p>
            </div>
          </div>

          {/* Data stream visual */}
          <DataStream
            active={isPhaseReached('hashing') && phase !== 'done'}
            color="blue"
            speed="normal"
          />
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          <div className="bg-slate-900/60 backdrop-blur border border-slate-800/60 rounded-xl p-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
              Registration Details
            </h4>
            <div className="space-y-3">
              <div>
                <span className="text-[10px] text-slate-600 uppercase tracking-wider block mb-0.5">
                  Registry
                </span>
                <code className="text-xs font-mono text-emerald-400">
                  {truncateAddress(CONTRACTS.assetRegistry.address)}
                </code>
              </div>
              <div>
                <span className="text-[10px] text-slate-600 uppercase tracking-wider block mb-0.5">
                  Metadata Store
                </span>
                <code className="text-xs font-mono text-emerald-400">
                  {truncateAddress(CONTRACTS.metadataStorage.address)}
                </code>
              </div>
              <div>
                <span className="text-[10px] text-slate-600 uppercase tracking-wider block mb-0.5">
                  Token Supply
                </span>
                <span className="text-xs font-mono text-cyan-400">{ASSET_METADATA.tokenSupply} {ASSET_METADATA.tokenSymbol}</span>
              </div>
            </div>
          </div>

          <BlockAnimation
            blockNumber={18_500_000}
            txHash="0x789012...1234abcd"
            active={phase === 'done'}
          />
        </div>
      </div>
    </StepContainer>
  );
}
