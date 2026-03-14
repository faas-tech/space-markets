'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StepContainer } from '../step-container';
import { useDemoContext } from '../demo-provider';
import {
  CONTRACTS,
  DEPLOYER,
  BLOCK_NUMBERS,
  TX_HASHES,
  truncateAddress,
  truncateHash,
} from '@/lib/demo/demo-data';
import { GlowCard } from '../animations/glow-card';
import { TypedText } from '../animations/typed-text';
import { ParticleBurst } from '../animations/particle-burst';
import { cn } from '@/lib/utils';
import { fadeInRight } from '@/lib/demo/motion-variants';

// ---- Types ----

type DeployPhase = 'idle' | 'left-deploying' | 'right-deploying' | 'connecting' | 'complete';

// Contract groups: left = asset layer, right = market layer
const LEFT_GROUP = ['assetRegistry', 'assetERC20', 'metadataStorage'] as const;
const RIGHT_GROUP = ['marketplace', 'leaseFactory'] as const;

const GROUP_LABELS = {
  left: 'Asset Layer',
  right: 'Market Layer',
} as const;

// ---- Card component for a single contract ----

function ContractCard({
  name,
  address,
  description,
  deployed,
  complete,
  index,
}: {
  name: string;
  address: string;
  description: string;
  deployed: boolean;
  complete: boolean;
  index: number;
}) {
  return (
    <motion.div
      className={cn(
        'relative px-5 py-4 rounded-lg border backdrop-blur-sm transition-colors duration-500 overflow-hidden',
        complete
          ? 'border-emerald-500/40 bg-emerald-500/5'
          : deployed
          ? 'border-purple-500/40 bg-purple-500/5'
          : 'border-white/5 bg-card/30'
      )}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={
        deployed
          ? { opacity: 1, y: 0, scale: 1 }
          : { opacity: 0.3, y: 0, scale: 0.95 }
      }
      transition={{
        type: 'spring',
        stiffness: 150,
        damping: 20,
        delay: index * 0.3,
      }}
    >
      {/* Pulse ring on deploy */}
      {deployed && !complete && (
        <motion.div
          className="absolute inset-0 rounded-lg border-2 border-purple-400/50"
          initial={{ opacity: 0.8, scale: 1 }}
          animate={{ opacity: 0, scale: 1.08 }}
          transition={{ duration: 2.4, repeat: 2, ease: 'easeOut' }}
        />
      )}
      {/* Complete pulse */}
      {complete && (
        <motion.div
          className="absolute inset-0 rounded-lg border-2 border-emerald-400/50"
          initial={{ opacity: 0.6, scale: 1 }}
          animate={{ opacity: 0, scale: 1.06 }}
          transition={{ duration: 3, repeat: 1, ease: 'easeOut' }}
        />
      )}

      <div className="flex items-center gap-3">
        {/* Status dot */}
        <motion.div
          className={cn(
            'w-2.5 h-2.5 rounded-full shrink-0',
            complete
              ? 'bg-emerald-400'
              : deployed
              ? 'bg-purple-400'
              : 'bg-slate-600'
          )}
          animate={
            deployed && !complete
              ? {
                  boxShadow: [
                    '0 0 4px rgba(168,85,247,0.6)',
                    '0 0 12px rgba(168,85,247,0.3)',
                    '0 0 4px rgba(168,85,247,0.6)',
                  ],
                }
              : complete
              ? {
                  boxShadow: [
                    '0 0 4px rgba(16,185,129,0.6)',
                    '0 0 12px rgba(16,185,129,0.3)',
                    '0 0 4px rgba(16,185,129,0.6)',
                  ],
                }
              : {}
          }
          transition={{ duration: 4, repeat: 2, ease: 'easeInOut' }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-base font-bold text-foreground-secondary truncate">
              {name}
            </span>
            {deployed && (
              <motion.code
                className="text-xs font-mono text-purple-400/70 truncate"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                {truncateAddress(address, 4)}
              </motion.code>
            )}
          </div>
          <span className="text-sm text-muted-foreground/60 leading-tight block truncate">
            {description}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ---- Main component ----

export function Step01Deploy() {
  const { state, completeStep } = useDemoContext();
  const isActive = state.currentStep === 1;
  const [phase, setPhase] = useState<DeployPhase>('idle');
  const [leftDeployed, setLeftDeployed] = useState(0);
  const [rightDeployed, setRightDeployed] = useState(0);
  const [showBurst, setShowBurst] = useState(false);

  const contractEntries = useMemo(() => Object.entries(CONTRACTS), []);

  const leftContracts = useMemo(
    () => LEFT_GROUP.map((key) => ({ key, ...CONTRACTS[key] })),
    []
  );
  const rightContracts = useMemo(
    () => RIGHT_GROUP.map((key) => ({ key, ...CONTRACTS[key] })),
    []
  );

  // Phase sequencing
  useEffect(() => {
    if (!isActive) {
      setPhase('idle');
      setLeftDeployed(0);
      setRightDeployed(0);
      setShowBurst(false);
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];

    // Phase 1: Deploy left group (asset layer) sequentially
    timers.push(setTimeout(() => setPhase('left-deploying'), 600));
    LEFT_GROUP.forEach((_, idx) => {
      timers.push(
        setTimeout(() => setLeftDeployed(idx + 1), 1000 + idx * 1000)
      );
    });

    // Phase 2: Deploy right group (market layer) sequentially
    const rightStart = 1000 + LEFT_GROUP.length * 1000 + 600;
    timers.push(setTimeout(() => setPhase('right-deploying'), rightStart));
    RIGHT_GROUP.forEach((_, idx) => {
      timers.push(
        setTimeout(() => setRightDeployed(idx + 1), rightStart + 400 + idx * 1000)
      );
    });

    // Phase 3: Draw connecting arrow
    const connectStart = rightStart + 400 + RIGHT_GROUP.length * 1000 + 800;
    timers.push(setTimeout(() => setPhase('connecting'), connectStart));

    // Phase 4: Complete
    const completeStart = connectStart + 2400;
    timers.push(
      setTimeout(() => {
        setPhase('complete');
        setShowBurst(true);
      }, completeStart)
    );

    // Signal step complete
    timers.push(
      setTimeout(() => {
        completeStep(1, {
          deployer: DEPLOYER,
          contractsDeployed: contractEntries.length,
          network: 'Base Sepolia',
        });
      }, completeStart + 600)
    );

    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  const isComplete = phase === 'complete';
  const showArrow = phase === 'connecting' || phase === 'complete';

  return (
    <StepContainer stepNumber={1}>
      <div className="space-y-6">
        {/* Hero: Two-group contract visualization */}
        <div>
          <div className="relative w-full" style={{ minHeight: 320 }}>
            {/* Background grid pattern */}
            <motion.div
              className="absolute inset-0 opacity-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: phase !== 'idle' ? 0.06 : 0 }}
              transition={{ duration: 1.5 }}
            >
              <svg width="100%" height="100%" className="absolute inset-0">
                <defs>
                  <pattern id="deploygrid" width="24" height="24" patternUnits="userSpaceOnUse">
                    <path
                      d="M 24 0 L 0 0 0 24"
                      fill="none"
                      stroke="rgba(168, 85, 247, 0.2)"
                      strokeWidth="0.5"
                    />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#deploygrid)" />
              </svg>
            </motion.div>

            {/* Two-column layout for contract groups */}
            <div className="relative z-10 flex items-stretch gap-4 sm:gap-6 px-2 py-4">
              {/* Left group: Asset Layer */}
              <div className="flex-1 space-y-3">
                <motion.div
                  className="text-center mb-3"
                  initial={{ opacity: 0, y: -10 }}
                  animate={
                    phase !== 'idle'
                      ? { opacity: 1, y: 0 }
                      : { opacity: 0, y: -10 }
                  }
                  transition={{ duration: 0.4 }}
                >
                  <span
                    className={cn(
                      'text-xs uppercase tracking-[0.2em] font-bold px-3 py-1 rounded-full border inline-block',
                      isComplete
                        ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                        : 'text-purple-400 border-purple-500/30 bg-purple-500/10'
                    )}
                  >
                    {GROUP_LABELS.left}
                  </span>
                </motion.div>

                {leftContracts.map((contract, idx) => (
                  <ContractCard
                    key={contract.key}
                    name={contract.name}
                    address={contract.address}
                    description={contract.description}
                    deployed={idx < leftDeployed}
                    complete={isComplete}
                    index={idx}
                  />
                ))}
              </div>

              {/* Center: Connecting arrow */}
              <div className="flex items-center justify-center shrink-0 w-12 sm:w-16">
                <AnimatePresence>
                  {showArrow && (
                    <motion.div
                      className="flex flex-col items-center gap-1"
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 100, damping: 18 }}
                    >
                      <svg
                        width="48"
                        height="80"
                        viewBox="0 0 48 80"
                        className="overflow-visible"
                      >
                        <defs>
                          <linearGradient id="arrowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop
                              offset="0%"
                              stopColor={isComplete ? 'rgba(16,185,129,0.8)' : 'rgba(168,85,247,0.8)'}
                            />
                            <stop
                              offset="100%"
                              stopColor={isComplete ? 'rgba(16,185,129,0.8)' : 'rgba(6,182,212,0.8)'}
                            />
                          </linearGradient>
                          <filter id="arrowGlow" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="3" result="blur" />
                            <feFlood
                              floodColor={isComplete ? 'rgba(16,185,129,0.4)' : 'rgba(168,85,247,0.4)'}
                              result="color"
                            />
                            <feComposite in="color" in2="blur" operator="in" result="shadow" />
                            <feMerge>
                              <feMergeNode in="shadow" />
                              <feMergeNode in="SourceGraphic" />
                            </feMerge>
                          </filter>
                        </defs>

                        {/* Left arrow: ← */}
                        <motion.path
                          d="M 44 30 L 4 30"
                          stroke="url(#arrowGrad)"
                          strokeWidth="2"
                          strokeLinecap="round"
                          fill="none"
                          filter="url(#arrowGlow)"
                          initial={{ pathLength: 0, opacity: 0 }}
                          animate={{ pathLength: 1, opacity: 1 }}
                          transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
                        />
                        <motion.path
                          d="M 12 24 L 4 30 L 12 36"
                          stroke="url(#arrowGrad)"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill="none"
                          filter="url(#arrowGlow)"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 1.2, duration: 0.6 }}
                        />

                        {/* Right arrow: → */}
                        <motion.path
                          d="M 4 50 L 44 50"
                          stroke="url(#arrowGrad)"
                          strokeWidth="2"
                          strokeLinecap="round"
                          fill="none"
                          filter="url(#arrowGlow)"
                          initial={{ pathLength: 0, opacity: 0 }}
                          animate={{ pathLength: 1, opacity: 1 }}
                          transition={{ duration: 1.6, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
                        />
                        <motion.path
                          d="M 36 44 L 44 50 L 36 56"
                          stroke="url(#arrowGrad)"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill="none"
                          filter="url(#arrowGlow)"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 1.6, duration: 0.6 }}
                        />
                      </svg>

                      {/* "Connected" label */}
                      <motion.span
                        className={cn(
                          'text-xs uppercase tracking-[0.15em] font-bold',
                          isComplete ? 'text-emerald-400/70' : 'text-purple-400/70'
                        )}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.8, duration: 0.8 }}
                      >
                        linked
                      </motion.span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Right group: Market Layer */}
              <div className="flex-1 space-y-3">
                <motion.div
                  className="text-center mb-3"
                  initial={{ opacity: 0, y: -10 }}
                  animate={
                    phase === 'right-deploying' || phase === 'connecting' || isComplete
                      ? { opacity: 1, y: 0 }
                      : { opacity: 0, y: -10 }
                  }
                  transition={{ duration: 0.4 }}
                >
                  <span
                    className={cn(
                      'text-xs uppercase tracking-[0.2em] font-bold px-3 py-1 rounded-full border inline-block',
                      isComplete
                        ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                        : 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10'
                    )}
                  >
                    {GROUP_LABELS.right}
                  </span>
                </motion.div>

                {rightContracts.map((contract, idx) => (
                  <ContractCard
                    key={contract.key}
                    name={contract.name}
                    address={contract.address}
                    description={contract.description}
                    deployed={idx < rightDeployed}
                    complete={isComplete}
                    index={idx}
                  />
                ))}

                {/* Spacer to vertically center the 2-card group against 3-card left */}
                <div aria-hidden className="h-0" />
              </div>
            </div>

            {/* Completion burst */}
            {isComplete && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                <motion.div
                  className="w-32 h-32 rounded-full"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{
                    opacity: [0, 0.25, 0],
                    scale: [0.5, 2.5, 3],
                  }}
                  transition={{ duration: 3, ease: 'easeOut' }}
                  style={{
                    background:
                      'radial-gradient(circle, rgba(16,185,129,0.3) 0%, transparent 70%)',
                  }}
                />
                <ParticleBurst trigger={showBurst} color="emerald" particleCount={18} />
              </div>
            )}
          </div>
        </div>

        {/* Deployment info bar */}
        <motion.div
          variants={fadeInRight}
          initial="hidden"
          animate={phase !== 'idle' ? 'visible' : 'hidden'}
        >
          <GlowCard color="purple" active={isComplete} delay={0.3}>
            <div className="px-6 py-4 flex flex-wrap items-center gap-x-10 gap-y-3">
              <div>
                <span className="text-sm text-muted-foreground/60 uppercase tracking-wider block mb-0.5">
                  Network
                </span>
                <span className="text-base text-foreground-secondary">Base Sepolia</span>
              </div>
              <div>
                <span className="text-sm text-muted-foreground/60 uppercase tracking-wider block mb-0.5">
                  Contract Type
                </span>
                <span className="text-base text-purple-300">Upgradeable Protocol</span>
              </div>
              <div>
                <span className="text-sm text-muted-foreground/60 uppercase tracking-wider block mb-0.5">
                  Block
                </span>
                <span className="text-base font-mono text-warning">
                  #{BLOCK_NUMBERS.deployBlock.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-sm text-muted-foreground/60 uppercase tracking-wider block mb-0.5">
                  Progress
                </span>
                <span className="text-base text-foreground-secondary">
                  {leftDeployed + rightDeployed} / {contractEntries.length} deployed
                </span>
              </div>
            </div>
          </GlowCard>
        </motion.div>
      </div>
    </StepContainer>
  );
}
