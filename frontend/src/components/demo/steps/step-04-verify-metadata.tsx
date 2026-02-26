'use client';

import React, { useEffect, useState } from 'react';
import { StepContainer } from '../step-container';
import { useDemoContext } from '../demo-provider';
import { ASSET_METADATA, HASHES, CONTRACTS, truncateAddress } from '@/lib/demo/demo-data';
import { cn } from '@/lib/utils';

interface VerificationField {
  label: string;
  expected: string;
  actual: string;
  verified: boolean;
}

export function Step04VerifyMetadata() {
  const { state, completeStep } = useDemoContext();
  const isActive = state.currentStep === 4;
  const [fields, setFields] = useState<VerificationField[]>([]);
  const [allVerified, setAllVerified] = useState(false);

  useEffect(() => {
    if (!isActive) {
      setFields([]);
      setAllVerified(false);
      return;
    }

    const verificationFields: VerificationField[] = [
      { label: 'Asset Name', expected: ASSET_METADATA.name, actual: ASSET_METADATA.name, verified: false },
      { label: 'Compute Units', expected: `${ASSET_METADATA.computeUnits}`, actual: `${ASSET_METADATA.computeUnits}`, verified: false },
      { label: 'Memory (GB)', expected: `${ASSET_METADATA.memoryGB}`, actual: `${ASSET_METADATA.memoryGB}`, verified: false },
      { label: 'Storage (GB)', expected: `${ASSET_METADATA.storageGB}`, actual: `${ASSET_METADATA.storageGB}`, verified: false },
      { label: 'Bandwidth', expected: `${ASSET_METADATA.bandwidthMbps}`, actual: `${ASSET_METADATA.bandwidthMbps}`, verified: false },
      { label: 'Altitude', expected: ASSET_METADATA.altitude, actual: ASSET_METADATA.altitude, verified: false },
      { label: 'Metadata Hash', expected: HASHES.metadataHash.slice(0, 18) + '...', actual: HASHES.metadataHash.slice(0, 18) + '...', verified: false },
    ];

    setFields(verificationFields);

    const timers: ReturnType<typeof setTimeout>[] = [];

    verificationFields.forEach((_, idx) => {
      timers.push(
        setTimeout(() => {
          setFields((prev) =>
            prev.map((f, i) => (i === idx ? { ...f, verified: true } : f))
          );
        }, 400 + idx * 350)
      );
    });

    timers.push(
      setTimeout(() => {
        setAllVerified(true);
        completeStep(4, {
          fieldsVerified: verificationFields.length,
          metadataIntegrity: 'VALID',
          hashMatch: true,
        });
      }, 400 + verificationFields.length * 350 + 300)
    );

    return () => timers.forEach(clearTimeout);
  }, [isActive, completeStep]);

  return (
    <StepContainer stepNumber={4}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Verification table */}
        <div className="lg:col-span-2">
          <div className="bg-slate-900/60 backdrop-blur border border-slate-800/60 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800/60 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">On-Chain Metadata Query</h3>
              <code className="text-[10px] font-mono text-emerald-400">
                MetadataStorage.getMetadata({ASSET_METADATA.assetId})
              </code>
            </div>

            {/* Header row */}
            <div className="grid grid-cols-[1fr_1fr_1fr_40px] gap-2 px-4 py-2 border-b border-slate-800/60 bg-slate-900/30">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Field</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Expected</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">On-Chain</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 text-center">OK</span>
            </div>

            {/* Data rows */}
            <div className="divide-y divide-slate-800/30">
              {fields.map((field, idx) => (
                <div
                  key={field.label}
                  className={cn(
                    'grid grid-cols-[1fr_1fr_1fr_40px] gap-2 px-4 py-2.5 transition-all duration-300',
                    field.verified && 'bg-emerald-900/5'
                  )}
                  style={{
                    opacity: idx < fields.filter(f => f.verified).length + 1 ? 1 : 0.3,
                    transition: 'opacity 300ms ease-out',
                  }}
                >
                  <span className="text-xs text-slate-400">{field.label}</span>
                  <span className="text-xs font-mono text-slate-300 truncate">{field.expected}</span>
                  <span
                    className={cn(
                      'text-xs font-mono truncate transition-colors duration-300',
                      field.verified ? 'text-emerald-400' : 'text-slate-500'
                    )}
                  >
                    {field.actual}
                  </span>
                  <div className="flex justify-center">
                    {field.verified ? (
                      <svg
                        className="w-4 h-4 text-emerald-400 animate-[fadeInUp_0.3s_ease-out]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-700 bg-slate-800" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* All verified banner */}
          {allVerified && (
            <div className="mt-4 bg-emerald-900/20 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-3 animate-[fadeInUp_0.4s_ease-out]">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-emerald-400">Metadata Integrity Verified</p>
                <p className="text-xs text-slate-400">All {fields.length} fields match on-chain records. Hash validated.</p>
              </div>
            </div>
          )}
        </div>

        {/* Query details panel */}
        <div className="space-y-4">
          <div className="bg-slate-900/60 backdrop-blur border border-slate-800/60 rounded-xl p-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
              Query Target
            </h4>
            <div className="space-y-3">
              <div>
                <span className="text-[10px] text-slate-600 uppercase tracking-wider block mb-0.5">Contract</span>
                <code className="text-xs font-mono text-emerald-400">
                  {truncateAddress(CONTRACTS.metadataStorage.address)}
                </code>
              </div>
              <div>
                <span className="text-[10px] text-slate-600 uppercase tracking-wider block mb-0.5">Method</span>
                <code className="text-xs font-mono text-blue-400">getMetadata(uint256)</code>
              </div>
              <div>
                <span className="text-[10px] text-slate-600 uppercase tracking-wider block mb-0.5">Call Type</span>
                <span className="text-xs text-slate-300">staticcall (view)</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-600 uppercase tracking-wider block mb-0.5">Block</span>
                <span className="text-xs font-mono text-amber-400">#18,500,001</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/60 backdrop-blur border border-slate-800/60 rounded-xl p-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
              Verification Status
            </h4>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{
                    width: `${(fields.filter((f) => f.verified).length / Math.max(fields.length, 1)) * 100}%`,
                  }}
                />
              </div>
              <span className="text-xs font-mono text-slate-400">
                {fields.filter((f) => f.verified).length}/{fields.length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </StepContainer>
  );
}
