'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StepContainer } from '../step-container';
import { useDemoContext } from '../demo-provider';
import {
  HASHES,
  CONTRACTS,
  BLOCK_NUMBERS,
  TX_HASHES,
  LESSOR,
  truncateAddress,
  truncateHash,
} from '@/lib/demo/demo-data';
import { GlowCard } from '../animations/glow-card';
import { CountUp } from '../animations/count-up';
import { ParticleBurst } from '../animations/particle-burst';
import { TypedText } from '../animations/typed-text';
import { cn } from '@/lib/utils';

// ---- Types ----

type LaunchPhase = 'idle' | 'launch' | 'metadata' | 'token-ring' | 'link' | 'complete';

// ---- Mission stage definitions ----
const MISSION_STAGES = [
  { key: 'hash', label: 'Verify Metadata', icon: '#', color: 'blue' },
  { key: 'deploy', label: 'Create Token', icon: 'T', color: 'purple' },
  { key: 'link', label: 'Link Ownership', icon: 'L', color: 'emerald' },
] as const;

export function Step03RegisterAsset() {
  const { state, completeStep, presetData } = useDemoContext();
  const isActive = state.currentStep === 3;
  const [phase, setPhase] = useState<LaunchPhase>('idle');
  const [metadataRevealed, setMetadataRevealed] = useState(0);
  const [tokenRingProgress, setTokenRingProgress] = useState(0);
  const [showBurst, setShowBurst] = useState(false);
  const [activeStage, setActiveStage] = useState(-1);

  const assetMetadata = presetData.assetMetadata;
  const metadataFields = useMemo(
    () => Object.entries(assetMetadata.fields),
    [assetMetadata.fields]
  );

  // Parse token supply for CountUp
  const tokenSupplyNum = useMemo(
    () => parseFloat(assetMetadata.tokenSupply.replace(/,/g, '')),
    [assetMetadata.tokenSupply]
  );

  // Split metadata fields into left and right columns
  const leftFields = useMemo(
    () => metadataFields.filter((_, idx) => idx % 2 === 0),
    [metadataFields]
  );
  const rightFields = useMemo(
    () => metadataFields.filter((_, idx) => idx % 2 === 1),
    [metadataFields]
  );

  // Phase sequencing
  useEffect(() => {
    if (!isActive) {
      setPhase('idle');
      setMetadataRevealed(0);
      setTokenRingProgress(0);
      setShowBurst(false);
      setActiveStage(-1);
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];

    // Phase 1: Asset launches from bottom
    timers.push(setTimeout(() => {
      setPhase('launch');
      setActiveStage(0); // Hash stage active
    }, 300));

    // Phase 2: Metadata fields materialize as HUD tags
    timers.push(setTimeout(() => setPhase('metadata'), 1000));
    metadataFields.forEach((_, idx) => {
      timers.push(
        setTimeout(() => {
          setMetadataRevealed(idx + 1);
        }, 1200 + idx * 300)
      );
    });

    // Phase 3: Token ring forms
    const afterMetadata = 1200 + metadataFields.length * 300 + 400;
    timers.push(setTimeout(() => {
      setPhase('token-ring');
      setActiveStage(1); // Deploy stage active
    }, afterMetadata));

    // Animate token ring progress
    for (let i = 1; i <= 10; i++) {
      timers.push(
        setTimeout(() => {
          setTokenRingProgress(i * 10);
        }, afterMetadata + i * 120)
      );
    }

    // Phase 4: Link on-chain
    const afterToken = afterMetadata + 1500;
    timers.push(setTimeout(() => {
      setPhase('link');
      setActiveStage(2); // Link stage active
    }, afterToken));

    // Phase 5: Complete
    const afterLink = afterToken + 1000;
    timers.push(
      setTimeout(() => {
        setPhase('complete');
        setActiveStage(3); // All done
        setShowBurst(true);
      }, afterLink)
    );

    timers.push(
      setTimeout(() => {
        completeStep(3, {
          assetId: assetMetadata.assetId,
          metadataHash: HASHES.metadataHash,
          tokenSymbol: assetMetadata.tokenSymbol,
          tokenAddress: CONTRACTS.assetERC20.address,
        });
      }, afterLink + 300)
    );

    return () => timers.forEach(clearTimeout);
  }, [isActive, completeStep, assetMetadata, metadataFields]);

  return (
    <StepContainer stepNumber={3}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hero: Asset launch sequence */}
        <div className="lg:col-span-2">
          {/* Asset card with metadata columns */}
          <div className="relative" style={{ minHeight: 360 }}>
            {/* Background radial glow */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: phase !== 'idle' ? 1 : 0 }}
              transition={{ duration: 1 }}
            >
              <div
                className="w-80 h-80 rounded-full"
                style={{
                  background:
                    'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)',
                }}
              />
            </motion.div>

            {/* Three-column layout: left tags | center card | right tags */}
            <div className="relative z-10 flex items-center justify-center gap-5 sm:gap-8 py-6">
              {/* Left metadata column */}
              <div className="flex-1 flex flex-col items-end gap-4 max-w-[200px]">
                {leftFields.map(([key, value], idx) => {
                  const globalIdx = idx * 2;
                  const isRevealed = globalIdx < metadataRevealed;
                  return (
                    <motion.div
                      key={key}
                      className={cn(
                        'flex items-center gap-2',
                      )}
                      initial={{ opacity: 0, x: -20 }}
                      animate={
                        isRevealed
                          ? { opacity: 1, x: 0 }
                          : { opacity: 0, x: -20 }
                      }
                      transition={{
                        type: 'spring',
                        stiffness: 200,
                        damping: 20,
                      }}
                    >
                      <div
                        className={cn(
                          'px-4 py-3 rounded-lg border backdrop-blur-sm text-right',
                          'bg-card/80 border-cyan-500/20'
                        )}
                      >
                        <span className="text-xs text-muted-foreground uppercase tracking-wider block leading-tight mb-0.5">
                          {key}
                        </span>
                        <span className="text-base font-mono text-cyan-300 font-bold">
                          {String(value)}
                        </span>
                      </div>
                      {/* Connector line */}
                      <motion.div
                        className="w-6 h-px bg-cyan-500/30 shrink-0"
                        initial={{ scaleX: 0 }}
                        animate={isRevealed ? { scaleX: 1 } : { scaleX: 0 }}
                        transition={{ delay: 0.2, duration: 0.3 }}
                        style={{ transformOrigin: 'left' }}
                      />
                    </motion.div>
                  );
                })}
              </div>

              {/* Central asset card with token ring */}
              <div className="relative shrink-0">
                {/* Token ring SVG behind the card */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  viewBox="0 0 240 280"
                  style={{ left: '-15%', top: '-12%', width: '130%', height: '124%' }}
                >
                  <defs>
                    <linearGradient id="tokenRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="rgba(168, 85, 247, 0.7)" />
                      <stop offset="50%" stopColor="rgba(59, 130, 246, 0.7)" />
                      <stop offset="100%" stopColor="rgba(6, 182, 212, 0.7)" />
                    </linearGradient>
                    <filter id="tokenGlow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="4" result="blur" />
                      <feFlood floodColor="rgba(168, 85, 247, 0.4)" result="color" />
                      <feComposite in="color" in2="blur" operator="in" result="shadow" />
                      <feMerge>
                        <feMergeNode in="shadow" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <motion.circle
                    cx={120}
                    cy={140}
                    r={110}
                    fill="none"
                    stroke="url(#tokenRingGrad)"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    filter="url(#tokenGlow)"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{
                      pathLength: tokenRingProgress / 100,
                      opacity: phase === 'token-ring' || phase === 'link' || phase === 'complete' ? 1 : 0,
                    }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    style={{ transformOrigin: '120px 140px', rotate: '-90deg' }}
                  />
                  <motion.circle
                    cx={120}
                    cy={140}
                    r={95}
                    fill="none"
                    stroke="rgba(100, 116, 139, 0.15)"
                    strokeWidth={0.5}
                    strokeDasharray="3 8"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: phase !== 'idle' ? 0.5 : 0 }}
                    transition={{ duration: 0.5 }}
                  />
                </svg>

                <motion.div
                  className="relative z-10 w-64"
                  initial={{ y: 80, opacity: 0, scale: 0.85 }}
                  animate={
                    phase !== 'idle'
                      ? { y: 0, opacity: 1, scale: 1 }
                      : { y: 80, opacity: 0, scale: 0.85 }
                  }
                  transition={{
                    type: 'spring',
                    stiffness: 120,
                    damping: 16,
                  }}
                >
                  <GlowCard
                    color={phase === 'complete' ? 'emerald' : 'blue'}
                    intensity={phase === 'complete' ? 'high' : 'medium'}
                    active={phase !== 'idle'}
                    delay={0}
                  >
                    <div className="p-5 text-center">
                      <motion.div
                        className="text-xl font-bold text-foreground mb-1"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                      >
                        {assetMetadata.name}
                      </motion.div>
                      <div className="text-sm text-muted-foreground mb-4">
                        Asset ID: {assetMetadata.assetId} | Type: {assetMetadata.typeId}
                      </div>

                      {/* Token info */}
                      <motion.div
                        className={cn(
                          'rounded-lg p-3 border mb-3',
                          phase === 'complete'
                            ? 'border-success/20 bg-emerald-950/20'
                            : 'border-purple-500/20 bg-purple-950/20'
                        )}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={
                          phase === 'token-ring' || phase === 'link' || phase === 'complete'
                            ? { opacity: 1, scale: 1 }
                            : { opacity: 0, scale: 0.9 }
                        }
                        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                      >
                        <span className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">
                          Token Supply
                        </span>
                        <div className="flex items-baseline justify-center gap-1.5">
                          <CountUp
                            value={
                              phase === 'token-ring' || phase === 'link' || phase === 'complete'
                                ? tokenSupplyNum
                                : 0
                            }
                            decimals={0}
                            className="text-base font-mono font-bold text-purple-300"
                            duration={1.2}
                          />
                          <span className="text-sm font-mono text-purple-400">
                            {assetMetadata.tokenSymbol}
                          </span>
                        </div>
                      </motion.div>

                      {/* Status badge */}
                      <motion.div
                        className={cn(
                          'inline-flex items-center gap-1.5 px-3 py-1 rounded text-sm font-bold',
                          phase === 'complete'
                            ? 'bg-emerald-900/30 text-success border border-emerald-800/40'
                            : 'bg-secondary text-muted-foreground border border-border'
                        )}
                        animate={
                          phase === 'complete'
                            ? { scale: [1, 1.1, 1] }
                            : {}
                        }
                        transition={{ duration: 0.3 }}
                      >
                        {phase === 'complete' ? 'REGISTERED' : 'REGISTERING...'}
                      </motion.div>
                    </div>
                  </GlowCard>

                  {/* Particle burst */}
                  <ParticleBurst trigger={showBurst} color="emerald" particleCount={16} />
                </motion.div>
              </div>

              {/* Right metadata column */}
              <div className="flex-1 flex flex-col items-start gap-4 max-w-[200px]">
                {rightFields.map(([key, value], idx) => {
                  const globalIdx = idx * 2 + 1;
                  const isRevealed = globalIdx < metadataRevealed;
                  return (
                    <motion.div
                      key={key}
                      className="flex items-center gap-2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={
                        isRevealed
                          ? { opacity: 1, x: 0 }
                          : { opacity: 0, x: 20 }
                      }
                      transition={{
                        type: 'spring',
                        stiffness: 200,
                        damping: 20,
                      }}
                    >
                      {/* Connector line */}
                      <motion.div
                        className="w-6 h-px bg-cyan-500/30 shrink-0"
                        initial={{ scaleX: 0 }}
                        animate={isRevealed ? { scaleX: 1 } : { scaleX: 0 }}
                        transition={{ delay: 0.2, duration: 0.3 }}
                        style={{ transformOrigin: 'right' }}
                      />
                      <div
                        className={cn(
                          'px-4 py-3 rounded-lg border backdrop-blur-sm',
                          'bg-card/80 border-cyan-500/20'
                        )}
                      >
                        <span className="text-xs text-muted-foreground uppercase tracking-wider block leading-tight mb-0.5">
                          {key}
                        </span>
                        <span className="text-base font-mono text-cyan-300 font-bold">
                          {String(value)}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Mission stages */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            {MISSION_STAGES.map((stage, idx) => {
              const isReached = activeStage >= idx;
              const isDone = activeStage > idx || phase === 'complete';
              const isCurrent = activeStage === idx && phase !== 'complete';

              const borderColor = isDone
                ? 'border-success/30'
                : isCurrent
                ? stage.color === 'blue'
                  ? 'border-primary/30'
                  : stage.color === 'purple'
                  ? 'border-purple-500/30'
                  : 'border-success/30'
                : 'border-border/60';

              return (
                <motion.div
                  key={stage.key}
                  className={cn(
                    'bg-card/60 border rounded-xl p-3 transition-colors duration-300',
                    borderColor,
                    !isReached && 'opacity-40'
                  )}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: isReached ? 1 : 0.4, y: 0 }}
                  transition={{
                    type: 'spring',
                    stiffness: 200,
                    damping: 20,
                    delay: 0.5 + idx * 0.1,
                  }}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    {isDone ? (
                      <motion.div
                        className="w-5 h-5 rounded-full bg-success-soft flex items-center justify-center"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                      >
                        <motion.svg
                          className="w-3 h-3 text-success"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <motion.path
                            d="M5 13l4 4L19 7"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 0.3 }}
                          />
                        </motion.svg>
                      </motion.div>
                    ) : isCurrent ? (
                      <div className="w-5 h-5 border-2 border-blue-400/60 border-t-blue-400 rounded-full animate-spin" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-secondary border border-border" />
                    )}
                    <span className="text-sm font-bold text-foreground">{stage.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {stage.key === 'hash' && 'Generate cryptographic fingerprint'}
                    {stage.key === 'deploy' &&
                      `${assetMetadata.tokenSymbol} with ${assetMetadata.tokenSupply} supply`}
                    {stage.key === 'link' && 'Associate asset, token, and hash'}
                  </p>
                  {isDone && stage.key === 'hash' && (
                    <code className="text-[11px] font-mono text-primary block mt-1.5 truncate">
                      {truncateHash(HASHES.metadataHash, 6)}
                    </code>
                  )}
                  {isDone && stage.key === 'deploy' && (
                    <code className="text-[11px] font-mono text-success block mt-1.5 truncate">
                      {truncateAddress(CONTRACTS.assetERC20.address, 4)}
                    </code>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Side panel */}
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, x: 30 }}
          animate={
            phase !== 'idle'
              ? { opacity: 1, x: 0 }
              : { opacity: 0, x: 30 }
          }
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
        >
          {/* Registration details */}
          <GlowCard color="blue" active={phase !== 'idle'} delay={0.4}>
            <div className="p-5">
              <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
                Registration Details
              </h4>
              <div className="space-y-3">
                <div>
                  <span className="text-xs text-muted-foreground/60 uppercase tracking-wider block mb-0.5">
                    Registry
                  </span>
                  <code className="text-sm font-mono text-success">
                    {truncateAddress(CONTRACTS.assetRegistry.address)}
                  </code>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground/60 uppercase tracking-wider block mb-0.5">
                    Metadata Store
                  </span>
                  <code className="text-sm font-mono text-success">
                    {truncateAddress(CONTRACTS.metadataStorage.address)}
                  </code>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground/60 uppercase tracking-wider block mb-0.5">
                    Owner
                  </span>
                  <code className="text-sm font-mono text-purple-400">
                    {truncateAddress(LESSOR)}
                  </code>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground/60 uppercase tracking-wider block mb-0.5">
                    Token Supply
                  </span>
                  <span className="text-sm font-mono text-cyan-400">
                    {assetMetadata.tokenSupply} {assetMetadata.tokenSymbol}
                  </span>
                </div>
              </div>
            </div>
          </GlowCard>

          {/* Block info */}
          <GlowCard color="amber" intensity="low" active={phase === 'complete'} delay={0.5}>
            <div className="p-5">
              <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
                Block Confirmation
              </h4>
              <div className="space-y-2">
                <div>
                  <span className="text-xs text-muted-foreground/60 uppercase tracking-wider block mb-0.5">
                    Block
                  </span>
                  <span className="text-sm font-mono text-warning">
                    #{BLOCK_NUMBERS.registerBlock.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground/60 uppercase tracking-wider block mb-0.5">
                    Tx Hash
                  </span>
                  {phase === 'complete' ? (
                    <TypedText
                      text={truncateHash(TX_HASHES.registerAsset)}
                      speed={18}
                      className="text-sm font-mono text-cyan-400"
                      cursor={false}
                    />
                  ) : (
                    <span className="text-sm font-mono text-muted-foreground/40">pending...</span>
                  )}
                </div>
              </div>
            </div>
          </GlowCard>
        </motion.div>
      </div>
    </StepContainer>
  );
}
