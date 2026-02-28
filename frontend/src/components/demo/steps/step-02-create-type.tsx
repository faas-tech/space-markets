'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StepContainer } from '../step-container';
import { useDemoContext } from '../demo-provider';
import {
  HASHES,
  CONTRACTS,
  truncateAddress,
  truncateHash,
} from '@/lib/demo/demo-data';
import { GlowCard } from '../animations/glow-card';
import { ParticleBurst } from '../animations/particle-burst';
import { TypedText } from '../animations/typed-text';
import { cn } from '@/lib/utils';
import { t } from '@/lib/demo/step-config';

// ---- Types ----

type BlueprintPhase = 'idle' | 'unfold' | 'fields' | 'hashing' | 'complete';

// ---- List layout constants ----
const LIST_X = 30;
const LIST_START_Y = 40;
const LIST_ITEM_H = 34;
const CONVERGE_X = 340;
const CONVERGE_Y = 160;

export function Step02CreateType() {
  const { state, completeStep, presetData } = useDemoContext();
  const isActive = state.currentStep === 2;
  const [phase, setPhase] = useState<BlueprintPhase>('idle');
  const [fieldsRevealed, setFieldsRevealed] = useState(0);
  const [hashProgress, setHashProgress] = useState(0);
  const [showBurst, setShowBurst] = useState(false);

  const assetType = presetData.assetType;
  const schemaEntries = useMemo(
    () => Object.entries(assetType.schema),
    [assetType.schema]
  );

  // Compute list item positions
  const listPositions = useMemo(() => {
    return schemaEntries.map((_, idx) => ({
      x: LIST_X,
      y: LIST_START_Y + idx * LIST_ITEM_H,
    }));
  }, [schemaEntries]);

  // Phase sequencing
  useEffect(() => {
    if (!isActive) {
      setPhase('idle');
      setFieldsRevealed(0);
      setHashProgress(0);
      setShowBurst(false);
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];

    // Phase 1: Grid unfolds
    timers.push(setTimeout(() => setPhase('unfold'), t(200)));

    // Phase 2: Schema fields appear as list items (staggered from left)
    timers.push(setTimeout(() => setPhase('fields'), t(800)));
    schemaEntries.forEach((_, idx) => {
      timers.push(
        setTimeout(() => {
          setFieldsRevealed(idx + 1);
        }, t(1000) + idx * t(400))
      );
    });

    // Phase 3: Hash computation — convergence lines draw
    const afterFields = t(1000 + schemaEntries.length * 400 + 300);
    timers.push(setTimeout(() => setPhase('hashing'), afterFields));

    // Simulate hash progress
    for (let i = 1; i <= 5; i++) {
      timers.push(
        setTimeout(() => {
          setHashProgress(i * 20);
        }, afterFields + i * t(200))
      );
    }

    // Phase 4: Complete
    const afterHash = afterFields + t(1400);
    timers.push(
      setTimeout(() => {
        setPhase('complete');
        setShowBurst(true);
      }, afterHash)
    );

    timers.push(
      setTimeout(() => {
        completeStep(2, {
          typeName: assetType.name,
          typeHash: HASHES.assetTypeHash,
          schemaFields: schemaEntries.length,
        });
      }, afterHash + t(300))
    );

    return () => timers.forEach(clearTimeout);
  }, [isActive, completeStep, assetType.name, schemaEntries]);

  return (
    <StepContainer stepNumber={2}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hero: List → Convergence schematic */}
        <div className="relative" style={{ minHeight: 340 }}>
          {/* Blueprint background grid */}
          <motion.div
            className="absolute inset-0 rounded-xl overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: phase !== 'idle' ? 1 : 0 }}
            transition={{ duration: 0.8 }}
          >
            <div
              className="absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(6,182,212,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.5) 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }}
            />
          </motion.div>

          <svg
            viewBox="0 0 440 320"
            className="w-full h-auto relative z-10"
            style={{ maxHeight: 340 }}
          >
            <defs>
              <filter id="blueprintGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feFlood floodColor="rgba(6, 182, 212, 0.5)" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="shadow" />
                <feMerge>
                  <feMergeNode in="shadow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="forgePulse" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="8" result="blur" />
                <feFlood floodColor="rgba(59, 130, 246, 0.8)" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="shadow" />
                <feMerge>
                  <feMergeNode in="shadow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="resultGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feFlood floodColor="rgba(16, 185, 129, 0.7)" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="shadow" />
                <feMerge>
                  <feMergeNode in="shadow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Schema field list items (Left side) */}
            {schemaEntries.map(([key, field], idx) => {
              const pos = { x: 20, y: 30 + idx * 36 };
              const isRevealed = idx < fieldsRevealed;
              const barWidth = 160;
              const barHeight = 28;

              return (
                <g key={key}>
                  {/* List item rect bar */}
                  <motion.rect
                    x={pos.x}
                    y={pos.y}
                    width={barWidth}
                    height={barHeight}
                    rx={4}
                    fill={
                      phase === 'complete'
                        ? 'rgba(16, 185, 129, 0.08)'
                        : 'rgba(6, 182, 212, 0.06)'
                    }
                    stroke={
                      phase === 'complete'
                        ? 'rgba(16, 185, 129, 0.3)'
                        : 'rgba(6, 182, 212, 0.2)'
                    }
                    strokeWidth={0.5}
                    initial={{ opacity: 0, x: -30 }}
                    animate={
                      isRevealed
                        ? { opacity: 1, x: 0 }
                        : { opacity: 0, x: -30 }
                    }
                    transition={{
                      duration: 0.5,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  />

                  {/* Field name text */}
                  <motion.text
                    x={pos.x + 8}
                    y={pos.y + barHeight / 2 + 1}
                    dominantBaseline="middle"
                    className="fill-cyan-400"
                    style={{ fontFamily: 'ui-monospace, monospace', fontSize: '10px', fontWeight: 'bold' }}
                    initial={{ opacity: 0, x: -20 }}
                    animate={
                      isRevealed
                        ? { opacity: 1, x: 0 }
                        : { opacity: 0, x: -20 }
                    }
                    transition={{
                      duration: 0.4,
                      delay: 0.1,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  >
                    {key}
                  </motion.text>

                  {/* Field type badge */}
                  <motion.text
                    x={pos.x + barWidth - 8}
                    y={pos.y + barHeight / 2 + 1}
                    dominantBaseline="middle"
                    textAnchor="end"
                    className="fill-indigo-400"
                    style={{ fontFamily: 'ui-monospace, monospace', fontSize: '9px' }}
                    initial={{ opacity: 0 }}
                    animate={
                      isRevealed
                        ? { opacity: 0.7 }
                        : { opacity: 0 }
                    }
                    transition={{ duration: 0.3, delay: 0.2 }}
                  >
                    {field.type}
                  </motion.text>

                  {/* Convergence lines from list item to Forge */}
                  {(phase === 'hashing' || phase === 'complete') && (
                    <motion.line
                      x1={pos.x + barWidth}
                      y1={pos.y + barHeight / 2}
                      x2={320}
                      y2={150}
                      stroke={
                        phase === 'complete'
                          ? 'rgba(16, 185, 129, 0.3)'
                          : 'rgba(59, 130, 246, 0.3)'
                      }
                      strokeWidth={1}
                      strokeLinecap="round"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{
                        pathLength: phase === 'complete' ? 1 : hashProgress / 100,
                        opacity: 0.6,
                      }}
                      transition={{ duration: 0.5, delay: idx * 0.05 }}
                    />
                  )}

                  {/* Data Packets flying into Forge */}
                  {phase === 'hashing' && (
                    <motion.circle
                      cx={pos.x + barWidth}
                      cy={pos.y + barHeight / 2}
                      r={3}
                      fill="#38bdf8"
                      filter="url(#blueprintGlow)"
                      initial={{ offsetDistance: '0%', opacity: 0 }}
                      animate={{ offsetDistance: '100%', opacity: [0, 1, 1, 0] }}
                      transition={{
                        duration: 0.8,
                        ease: 'easeInOut',
                        repeat: Infinity,
                        delay: Math.random() * 0.5,
                      }}
                      style={{
                        offsetPath: `path("M ${pos.x + barWidth} ${pos.y + barHeight / 2} L 320 150")`,
                      }}
                    />
                  )}
                </g>
              );
            })}

            {/* The Cryptographic Hash Forge (Right side) */}
            {(phase === 'hashing' || phase === 'complete') && (
              <motion.g
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              >
                {/* Forge Outer Hexagon Ring */}
                <motion.polygon
                  points="320,80 380,115 380,185 320,220 260,185 260,115"
                  fill="none"
                  stroke={
                    phase === 'complete'
                      ? 'rgba(16, 185, 129, 0.3)'
                      : 'rgba(59, 130, 246, 0.3)'
                  }
                  strokeWidth={2}
                  animate={phase === 'hashing' ? { rotate: 180, opacity: [0.2, 0.5, 0.2] } : { rotate: 0 }}
                  style={{ transformOrigin: '320px 150px' }}
                  transition={{ duration: 4, repeat: phase === 'complete' ? 0 : Infinity, ease: 'linear' }}
                />

                {/* Forge Inner Rotating Gear */}
                <motion.circle
                  cx={320}
                  cy={150}
                  r={45}
                  fill="none"
                  stroke={
                    phase === 'complete'
                      ? 'rgba(16, 185, 129, 0.5)'
                      : 'rgba(6, 182, 212, 0.5)'
                  }
                  strokeWidth={4}
                  strokeDasharray="15 15"
                  animate={phase === 'hashing' ? { rotate: -360 } : { rotate: 0 }}
                  style={{ transformOrigin: '320px 150px' }}
                  transition={{ duration: 6, repeat: phase === 'complete' ? 0 : Infinity, ease: 'linear' }}
                />

                {/* Forge Core Processing Ring */}
                <motion.circle
                  cx={320}
                  cy={150}
                  r={30}
                  fill={
                    phase === 'complete'
                      ? 'rgba(16, 185, 129, 0.15)'
                      : 'rgba(59, 130, 246, 0.1)'
                  }
                  stroke={
                    phase === 'complete'
                      ? 'rgba(16, 185, 129, 0.8)'
                      : 'rgba(59, 130, 246, 0.8)'
                  }
                  strokeWidth={2}
                  filter={phase === 'hashing' ? 'url(#forgePulse)' : phase === 'complete' ? 'url(#resultGlow)' : ''}
                  animate={phase === 'complete' ? {
                    scale: [1, 1.2, 1],
                    opacity: 1,
                  } : {
                    scale: hashProgress > 0 ? [1, 1.1, 1] : 1,
                    opacity: hashProgress > 0 ? [0.6, 1, 0.6] : 1,
                  }}
                  transition={{ duration: 0.5, repeat: phase === 'complete' ? 0 : Infinity }}
                />

                {/* Core Header Text */}
                <text
                  x={320}
                  y={145}
                  textAnchor="middle"
                  fill={
                    phase === 'complete'
                      ? 'rgba(16, 185, 129, 0.9)'
                      : 'rgba(255, 255, 255, 0.9)'
                  }
                  style={{ fontFamily: 'ui-monospace, monospace', fontSize: '10px', fontWeight: 'bold' }}
                >
                  keccak256
                </text>

                {/* Resulting Bytes Block (appears on complete) */}
                <AnimatePresence>
                  {phase === 'complete' && (
                    <motion.rect
                      x={280}
                      y={105}
                      width={80}
                      height={90}
                      rx={8}
                      fill="rgba(16, 185, 129, 0.15)"
                      stroke="rgba(16, 185, 129, 0.8)"
                      strokeWidth={2}
                      filter="url(#resultGlow)"
                      initial={{ opacity: 0, scale: 0.2, y: 0 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    />
                  )}
                </AnimatePresence>

                {/* Final Hash Output Text */}
                {phase === 'complete' ? (
                  <motion.text
                    x={320}
                    y={155}
                    textAnchor="middle"
                    fill="rgba(16, 185, 129, 0.9)"
                    style={{ fontFamily: 'ui-monospace, monospace', fontSize: '9px', fontWeight: 'bold' }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    bytes32
                  </motion.text>
                ) : (
                  <text
                    x={320}
                    y={155}
                    textAnchor="middle"
                    fill="rgba(148, 163, 184, 0.7)"
                    style={{ fontFamily: 'ui-monospace, monospace', fontSize: '9px' }}
                  >
                    Processing...
                  </text>
                )}
              </motion.g>
            )}

            {/* Asset Signature Title Label */}
            <AnimatePresence>
              {phase === 'complete' && (
                <motion.text
                  x={320}
                  y={250}
                  textAnchor="middle"
                  className="fill-emerald-400"
                  style={{ fontFamily: 'ui-monospace, monospace', fontSize: '14px', fontWeight: 'bold' }}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, type: 'spring' }}
                >
                  Asset Type Signature
                </motion.text>
              )}
            </AnimatePresence>
          </svg>

          {/* Particle burst on completion */}
          {phase === 'complete' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ left: '40%' }}>
              <ParticleBurst trigger={showBurst} color="cyan" particleCount={14} />
            </div>
          )}
        </div>

        {/* Right panel: Hash computation + result */}
        <div className="space-y-4">
          {/* Schema summary */}
          <GlowCard color="cyan" active={fieldsRevealed > 0} delay={0.2}>
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold uppercase tracking-widest text-slate-300">
                  Schema Definition
                </h4>
                <div className="flex items-center gap-2">
                  <span className="text-sm px-1.5 py-0.5 rounded bg-blue-900/30 text-blue-300 border border-blue-800/40">
                    {assetType.category}
                  </span>
                  <span className="text-sm px-1.5 py-0.5 rounded bg-amber-900/30 text-amber-300 border border-amber-800/40">
                    {assetType.subcategory}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                {schemaEntries.map(([key, field], idx) => (
                  <motion.div
                    key={key}
                    className="flex items-center justify-between gap-3 py-1.5 border-b border-slate-800/30 last:border-0"
                    initial={{ opacity: 0, x: 15 }}
                    animate={
                      idx < fieldsRevealed
                        ? { opacity: 1, x: 0 }
                        : { opacity: 0.15, x: 15 }
                    }
                    transition={{
                      duration: 0.4,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <code className="text-base font-mono text-cyan-400">{key}</code>
                      <span className="text-sm text-slate-300 hidden sm:inline">
                        {field.description}
                      </span>
                    </div>
                    <span className="text-sm font-mono text-indigo-400 bg-indigo-900/20 px-1.5 py-0.5 rounded shrink-0">
                      {field.type}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </GlowCard>

          {/* Hash computation */}
          <GlowCard color="blue" active={phase === 'hashing' || phase === 'complete'} delay={0.4}>
            <div className="p-5">
              <h4 className="text-sm font-bold uppercase tracking-widest text-slate-300 mb-3">
                keccak256 Hash Computation
              </h4>
              {/* Progress bar */}
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mb-3">
                <motion.div
                  className={cn(
                    'h-full rounded-full',
                    phase === 'complete' ? 'bg-emerald-500' : 'bg-blue-500'
                  )}
                  initial={{ width: '0%' }}
                  animate={{ width: `${hashProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              {/* Hash funnel visual */}
              <div className="flex items-center gap-2 text-sm text-slate-300 mb-3">
                <span>
                  {schemaEntries.length} fields
                </span>
                <motion.span
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  {'->'} keccak256
                </motion.span>
                <span>bytes32</span>
              </div>
              {/* Target contract */}
              <div className="flex items-center gap-2 text-base text-slate-300">
                <span>Target:</span>
                <code className="font-mono text-emerald-400">
                  AssetRegistry ({truncateAddress(CONTRACTS.assetRegistry.address, 4)})
                </code>
              </div>
            </div>
          </GlowCard>

          {/* Result card */}
          <AnimatePresence>
            {phase === 'complete' && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  type: 'spring',
                  stiffness: 200,
                  damping: 20,
                }}
              >
                <GlowCard color="emerald" intensity="high" active={true} delay={0}>
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <motion.svg
                        className="w-5 h-5 text-emerald-400"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <motion.path
                          d="M5 13l4 4L19 7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.4, delay: 0.2 }}
                        />
                      </motion.svg>
                      <span className="text-base font-bold text-emerald-400">
                        Asset Type Registered
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-300">Type ID</span>
                        <span className="text-base font-mono text-amber-400">1</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-300">Type Hash</span>
                        <TypedText
                          text={truncateHash(HASHES.assetTypeHash)}
                          speed={15}
                          className="text-base font-mono text-blue-400"
                          cursor={false}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-300">Fields</span>
                        <span className="text-base font-mono text-cyan-400">
                          {schemaEntries.length}
                        </span>
                      </div>
                    </div>
                  </div>
                </GlowCard>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </StepContainer>
  );
}
