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
import {
  heroEntrance,
  scaleInBounce,
  glowPulse,
  cardFlip,
} from '@/lib/demo/motion-variants';
import { t } from '@/lib/demo/step-config';

// ---- Types ----

type LaunchPhase = 'idle' | 'launch' | 'metadata' | 'token-ring' | 'link' | 'complete';

// ---- Mission stage definitions ----
const MISSION_STAGES = [
  { key: 'hash', label: 'Hash Metadata', icon: '#', color: 'blue' },
  { key: 'deploy', label: 'Deploy ERC-20', icon: 'T', color: 'indigo' },
  { key: 'link', label: 'Link On-Chain', icon: 'L', color: 'emerald' },
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

  // Split metadata into left and right columns for grid rendering
  const leftFields = useMemo(() => metadataFields.slice(0, Math.ceil(metadataFields.length / 2)), [metadataFields]);
  const rightFields = useMemo(() => metadataFields.slice(Math.ceil(metadataFields.length / 2)), [metadataFields]);

  // Parse token supply for CountUp
  const tokenSupplyNum = useMemo(
    () => parseFloat(assetMetadata.tokenSupply.replace(/,/g, '')),
    [assetMetadata.tokenSupply]
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
    }, t(300)));

    // Phase 2: Metadata fields materialize as HUD tags
    timers.push(setTimeout(() => setPhase('metadata'), t(1000)));
    metadataFields.forEach((_, idx) => {
      timers.push(
        setTimeout(() => {
          setMetadataRevealed(idx + 1);
        }, t(1200) + idx * t(300))
      );
    });

    // Phase 3: Token ring forms
    const afterMetadata = t(1200 + metadataFields.length * 300 + 400);
    timers.push(setTimeout(() => {
      setPhase('token-ring');
      setActiveStage(1); // Deploy stage active
    }, afterMetadata));

    // Animate token ring progress
    for (let i = 1; i <= 10; i++) {
      timers.push(
        setTimeout(() => {
          setTokenRingProgress(i * 10);
        }, afterMetadata + i * t(120))
      );
    }

    // Phase 4: Link on-chain
    const afterToken = afterMetadata + t(1500);
    timers.push(setTimeout(() => {
      setPhase('link');
      setActiveStage(2); // Link stage active
    }, afterToken));

    // Phase 5: Complete
    const afterLink = afterToken + t(1000);
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
      }, afterLink + t(300))
    );

    return () => timers.forEach(clearTimeout);
  }, [isActive, completeStep, assetMetadata, metadataFields]);

  return (
    <StepContainer stepNumber={3}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hero: Asset launch sequence */}
        <div className="lg:col-span-2 flex flex-col justify-center">
          {/* Asset card with orbital HUD */}
          <div className="relative flex items-center justify-center w-full min-h-[400px] overflow-hidden rounded-2xl border border-slate-800/50 bg-slate-900/20">
            {/* Background radial glow */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: phase !== 'idle' ? 1 : 0 }}
              transition={{ duration: 1 }}
            >
              <div
                className="w-full h-full"
                style={{
                  background:
                    'radial-gradient(circle at center, rgba(59,130,246,0.1) 0%, transparent 60%)',
                }}
              />
            </motion.div>

            {/* Stable Grid Layout for Asset + Tags */}
            <div className="relative z-10 w-full grid grid-cols-[1fr_auto_1fr] gap-6 px-4 sm:px-8 items-center">

              {/* Left Tags */}
              <div className="flex flex-col gap-6 items-end">
                {leftFields.map(([key, value], idx) => {
                  const isRevealed = idx < metadataRevealed;
                  return (
                    <motion.div
                      key={key}
                      className="relative pr-4 text-right border-r-2 border-cyan-500/30"
                      initial={{ opacity: 0, x: -30 }}
                      animate={isRevealed ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                    >
                      <span className="text-xs text-cyan-300 uppercase tracking-widest block mb-0.5">
                        {key}
                      </span>
                      <span className="text-base font-mono text-cyan-100 font-bold">
                        {String(value)}
                      </span>
                      {/* Tech connector lines */}
                      <div className="absolute top-1/2 -right-[2px] w-[2px] h-3 bg-cyan-400 -translate-y-1/2 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                      <div className="absolute top-1/2 right-[-24px] w-5 h-px bg-cyan-500/30 -translate-y-1/2" />
                    </motion.div>
                  );
                })}
              </div>

              {/* Central Asset Card */}
              <div className="relative flex items-center justify-center w-64 h-64">


                <motion.div
                  className="relative z-20 w-full"
                  initial={{ y: 50, opacity: 0, scale: 0.8 }}
                  animate={
                    phase !== 'idle'
                      ? { y: 0, opacity: 1, scale: 1 }
                      : { y: 50, opacity: 0, scale: 0.8 }
                  }
                  transition={{
                    type: 'spring',
                    stiffness: 150,
                    damping: 18,
                  }}
                >
                  <motion.div
                    variants={phase === 'complete' ? cardFlip : {}}
                    initial="hidden"
                    animate={phase === 'complete' ? "visible" : "hidden"}
                    className="w-full"
                  >
                    <GlowCard
                      color={phase === 'complete' ? 'emerald' : 'blue'}
                      intensity={phase === 'complete' ? 'high' : 'medium'}
                      active={phase !== 'idle'}
                      delay={0}
                    >
                      <div className="p-5 text-center flex flex-col items-center justify-center min-h-[14rem]">
                        <motion.div
                          className="text-lg font-bold text-white mb-1"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.4 }}
                        >
                          {assetMetadata.name}
                        </motion.div>
                        <div className="text-xs text-slate-400 mb-4 tracking-wider uppercase">
                          Asset ID: {assetMetadata.assetId} &bull; Type: {assetMetadata.typeId}
                        </div>

                        {/* Token info */}
                        <motion.div
                          className={cn(
                            'rounded-xl p-3 w-full border relative overflow-hidden',
                            phase === 'complete'
                              ? 'border-emerald-500/40 bg-emerald-950/40'
                              : 'border-indigo-500/30 bg-indigo-950/40'
                          )}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={
                            phase === 'token-ring' || phase === 'link' || phase === 'complete'
                              ? { opacity: 1, scale: 1 }
                              : { opacity: 0, scale: 0.9 }
                          }
                          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                        >
                          {/* Inner shimmer when complete */}
                          {phase === 'complete' && (
                            <motion.div
                              className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-400/20 to-transparent"
                              transition={{ duration: 1.5, repeat: phase === 'complete' ? 0 : Infinity, ease: 'linear' }}
                            />
                          )}
                          <span className="text-xs text-slate-300 uppercase tracking-widest block mb-1">
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
                              className="text-lg font-mono font-bold text-white shadow-emerald-500/50 drop-shadow-md"
                              duration={1.2}
                            />
                            <span className="text-sm font-mono text-indigo-300 font-medium">
                              {assetMetadata.tokenSymbol}
                            </span>
                          </div>
                        </motion.div>

                        {/* Status badge */}
                        <AnimatePresence mode="wait">
                          {phase === 'complete' ? (
                            <motion.div
                              key="registered"
                              className="absolute -bottom-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 px-3 py-1 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/50 font-bold text-sm tracking-widest shadow-lg"
                              variants={scaleInBounce}
                              initial="hidden"
                              animate="visible"
                            >
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              REGISTERED
                            </motion.div>
                          ) : phase !== 'idle' ? (
                            <motion.div
                              key="registering"
                              className="absolute -bottom-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 px-3 py-1 rounded bg-slate-900 text-slate-400 border border-slate-700 text-sm tracking-widest shadow-lg"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                            >
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-400/50 animate-pulse" />
                              INITIALIZING
                            </motion.div>
                          ) : null}
                        </AnimatePresence>
                      </div>
                    </GlowCard>
                  </motion.div>
                </motion.div>
              </div>

              {/* Right Tags */}
              <div className="flex flex-col gap-6 items-start">
                {rightFields.map(([key, value], idx) => {
                  const isRevealed = idx + leftFields.length < metadataRevealed;
                  return (
                    <motion.div
                      key={key}
                      className="relative pl-4 text-left border-l-2 border-cyan-500/30"
                      initial={{ opacity: 0, x: 30 }}
                      animate={isRevealed ? { opacity: 1, x: 0 } : { opacity: 0, x: 30 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                    >
                      <span className="text-xs text-cyan-300 uppercase tracking-widest block mb-0.5">
                        {key}
                      </span>
                      <span className="text-base font-mono text-cyan-100 font-bold">
                        {String(value)}
                      </span>
                      {/* Tech connector lines */}
                      <div className="absolute top-1/2 -left-[2px] w-[2px] h-3 bg-cyan-400 -translate-y-1/2 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                      <div className="absolute top-1/2 left-[-24px] w-5 h-px bg-cyan-500/30 -translate-y-1/2" />
                    </motion.div>
                  );
                })}
              </div>

            </div>

            {/* Particle burst */}
            <ParticleBurst trigger={showBurst} color="emerald" particleCount={24} />
          </div>

          {/* Mission stages */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            {MISSION_STAGES.map((stage, idx) => {
              const isReached = activeStage >= idx;
              const isDone = activeStage > idx || phase === 'complete';
              const isCurrent = activeStage === idx && phase !== 'complete';

              const borderColor = isDone
                ? 'border-emerald-500/30'
                : isCurrent
                  ? stage.color === 'blue'
                    ? 'border-blue-500/30'
                    : stage.color === 'indigo'
                      ? 'border-indigo-500/30'
                      : 'border-emerald-500/30'
                  : 'border-slate-800/60';

              return (
                <motion.div
                  key={stage.key}
                  className={cn(
                    'bg-slate-900/60 border rounded-xl p-3 transition-colors duration-300',
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
                        className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center shrink-0",
                          stage.color === 'emerald' ? 'bg-emerald-500/20' :
                            stage.color === 'blue' ? 'bg-blue-500/20' : 'bg-indigo-500/20'
                        )}
                        variants={scaleInBounce}
                        initial="hidden"
                        animate="visible"
                      >
                        <motion.svg
                          className={cn(
                            "w-3.5 h-3.5",
                            stage.color === 'emerald' ? 'text-emerald-400' :
                              stage.color === 'blue' ? 'text-blue-400' : 'text-indigo-400'
                          )}
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
                      <div className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700" />
                    )}
                    <span className="text-base font-bold text-white">{stage.label}</span>
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {stage.key === 'hash' && 'Compute keccak256 of metadata'}
                    {stage.key === 'deploy' &&
                      `${assetMetadata.tokenSymbol} with ${assetMetadata.tokenSupply} supply`}
                    {stage.key === 'link' && 'Associate asset, token, and hash'}
                  </p>
                  {isDone && stage.key === 'hash' && (
                    <code className="text-xs font-mono text-blue-400 block mt-1.5 truncate">
                      {truncateHash(HASHES.metadataHash, 6)}
                    </code>
                  )}
                  {isDone && stage.key === 'deploy' && (
                    <code className="text-xs font-mono text-emerald-400 block mt-1.5 truncate">
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
              <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-3">
                Registration Details
              </h4>
              <div className="space-y-4">
                <div>
                  <span className="text-sm text-slate-500 uppercase tracking-wider block mb-1">
                    Registry
                  </span>
                  <code className="text-base font-mono text-emerald-400">
                    {truncateAddress(CONTRACTS.assetRegistry.address)}
                  </code>
                </div>
                <div>
                  <span className="text-sm text-slate-500 uppercase tracking-wider block mb-1">
                    Metadata Store
                  </span>
                  <code className="text-base font-mono text-emerald-400">
                    {truncateAddress(CONTRACTS.metadataStorage.address)}
                  </code>
                </div>
                <div>
                  <span className="text-sm text-slate-500 uppercase tracking-wider block mb-1">
                    Owner
                  </span>
                  <code className="text-base font-mono text-indigo-400">
                    {truncateAddress(LESSOR)}
                  </code>
                </div>
                <div>
                  <span className="text-sm text-slate-500 uppercase tracking-wider block mb-1">
                    Token Supply
                  </span>
                  <span className="text-base font-mono text-cyan-400">
                    {assetMetadata.tokenSupply} {assetMetadata.tokenSymbol}
                  </span>
                </div>
              </div>
            </div>
          </GlowCard>

          {/* Block info */}
          <GlowCard color="amber" intensity="low" active={phase === 'complete'} delay={0.5}>
            <div className="p-5">
              <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-3">
                Block Confirmation
              </h4>
              <div className="space-y-4">
                <div>
                  <span className="text-sm text-slate-500 uppercase tracking-wider block mb-1">
                    Block
                  </span>
                  <span className="text-base font-mono text-amber-400">
                    #{BLOCK_NUMBERS.registerBlock.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-slate-500 uppercase tracking-wider block mb-1">
                    Tx Hash
                  </span>
                  {phase === 'complete' ? (
                    <TypedText
                      text={truncateHash(TX_HASHES.registerAsset)}
                      speed={18}
                      className="text-base font-mono text-cyan-400"
                      cursor={false}
                    />
                  ) : (
                    <span className="text-base font-mono text-slate-600">pending...</span>
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
