'use client';

import React, { useEffect, useState } from 'react';
import { StepContainer } from '../step-container';
import { useDemoContext } from '../demo-provider';
import { CONTRACTS, DEPLOYER, truncateAddress } from '@/lib/demo/demo-data';
import { BlockAnimation } from '../animations/block-animation';
import { cn } from '@/lib/utils';

interface ContractDeployState {
  name: string;
  address: string;
  pattern: string;
  description: string;
  progress: number;
  deployed: boolean;
}

export function Step01Deploy() {
  const { state, completeStep } = useDemoContext();
  const isActive = state.currentStep === 1;
  const [contracts, setContracts] = useState<ContractDeployState[]>([]);
  const [allDeployed, setAllDeployed] = useState(false);

  useEffect(() => {
    if (!isActive) {
      setContracts([]);
      setAllDeployed(false);
      return;
    }

    const contractList = Object.values(CONTRACTS).map((c) => ({
      ...c,
      progress: 0,
      deployed: false,
    }));
    setContracts(contractList);

    // Sequentially deploy each contract with animated progress
    const timers: ReturnType<typeof setTimeout>[] = [];

    contractList.forEach((_, idx) => {
      // Start progress animation
      const startDelay = idx * 800;

      // Progress stages: 0 -> 30 -> 70 -> 100
      timers.push(
        setTimeout(() => {
          setContracts((prev) =>
            prev.map((c, i) => (i === idx ? { ...c, progress: 30 } : c))
          );
        }, startDelay + 100)
      );

      timers.push(
        setTimeout(() => {
          setContracts((prev) =>
            prev.map((c, i) => (i === idx ? { ...c, progress: 70 } : c))
          );
        }, startDelay + 300)
      );

      timers.push(
        setTimeout(() => {
          setContracts((prev) =>
            prev.map((c, i) =>
              i === idx ? { ...c, progress: 100, deployed: true } : c
            )
          );
        }, startDelay + 600)
      );
    });

    // All done
    timers.push(
      setTimeout(() => {
        setAllDeployed(true);
      }, contractList.length * 800 + 200)
    );

    return () => timers.forEach(clearTimeout);
  }, [isActive]);

  // Complete step when all deployed
  useEffect(() => {
    if (allDeployed && isActive) {
      completeStep(1, {
        deployer: DEPLOYER,
        contractsDeployed: 5,
        network: 'Base Sepolia',
      });
    }
  }, [allDeployed, isActive, completeStep]);

  return (
    <StepContainer stepNumber={1}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contract deployment cards */}
        <div className="lg:col-span-2 space-y-3">
          {contracts.map((contract, idx) => (
            <div
              key={contract.name}
              className={cn(
                'bg-slate-900/60 backdrop-blur border rounded-xl p-4 transition-all duration-500',
                contract.deployed
                  ? 'border-emerald-500/20'
                  : 'border-slate-800/60'
              )}
              style={{
                animationDelay: `${idx * 150}ms`,
                opacity: isActive ? 1 : 0,
                transform: isActive ? 'translateY(0)' : 'translateY(8px)',
                transition: `all 400ms cubic-bezier(0.22, 1, 0.36, 1) ${idx * 100}ms`,
              }}
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-bold text-white">{contract.name}</h3>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-900/30 text-purple-300 border border-purple-800/40 font-mono">
                      {contract.pattern}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{contract.description}</p>
                </div>
                <div
                  className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-300',
                    contract.deployed
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-slate-800 text-slate-600'
                  )}
                >
                  {contract.deployed ? (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <div className="w-2.5 h-2.5 border-2 border-slate-600 border-t-slate-400 rounded-full animate-spin" />
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mb-2">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    contract.deployed
                      ? 'bg-emerald-500'
                      : 'bg-blue-500'
                  )}
                  style={{ width: `${contract.progress}%` }}
                />
              </div>

              {/* Deployed address */}
              {contract.deployed && (
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[10px] text-slate-600 uppercase tracking-wider">Proxy</span>
                  <code className="text-xs font-mono text-emerald-400">
                    {truncateAddress(contract.address)}
                  </code>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          {/* Deployer info */}
          <div className="bg-slate-900/60 backdrop-blur border border-slate-800/60 rounded-xl p-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
              Deployment Info
            </h4>
            <div className="space-y-3">
              <div>
                <span className="text-[10px] text-slate-600 uppercase tracking-wider block mb-0.5">
                  Deployer
                </span>
                <code className="text-xs font-mono text-emerald-400">
                  {truncateAddress(DEPLOYER)}
                </code>
              </div>
              <div>
                <span className="text-[10px] text-slate-600 uppercase tracking-wider block mb-0.5">
                  Network
                </span>
                <span className="text-xs text-slate-300">Base Sepolia (84532)</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-600 uppercase tracking-wider block mb-0.5">
                  Pattern
                </span>
                <span className="text-xs text-purple-300">UUPS Transparent Proxy</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-600 uppercase tracking-wider block mb-0.5">
                  Contracts
                </span>
                <span className="text-xs text-slate-300">
                  {contracts.filter((c) => c.deployed).length} / {contracts.length} deployed
                </span>
              </div>
            </div>
          </div>

          {/* Block confirmation */}
          <BlockAnimation
            blockNumber={18_499_990}
            txHash="0xabc123...ef123456"
            active={allDeployed}
          />
        </div>
      </div>
    </StepContainer>
  );
}
