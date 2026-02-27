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

// ---- Types ----

type BlueprintPhase = 'idle' | 'unfold' | 'fields' | 'hashing' | 'complete';

// ---- Blueprint SVG layout constants ----
const BLUEPRINT_CENTER = { x: 220, y: 160 };
const FIELD_RADIUS = 120;

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

  // Compute field positions around the blueprint center
  const fieldPositions = useMemo(() => {
    return schemaEntries.map((_, idx) => {
      const angle = -90 + (360 / schemaEntries.length) * idx;
      const rad = (angle * Math.PI) / 180;
      return {
        x: BLUEPRINT_CENTER.x + Math.cos(rad) * FIELD_RADIUS,
        y: BLUEPRINT_CENTER.y + Math.sin(rad) * FIELD_RADIUS,
        angle,
      };
    });
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

    // Phase 1: Blueprint unfolds
    timers.push(setTimeout(() => setPhase('unfold'), 200));

    // Phase 2: Schema fields appear
    timers.push(setTimeout(() => setPhase('fields'), 800));
    schemaEntries.forEach((_, idx) => {
      timers.push(
        setTimeout(() => {
          setFieldsRevealed(idx + 1);
        }, 1000 + idx * 400)
      );
    });

    // Phase 3: Hash computation
    const afterFields = 1000 + schemaEntries.length * 400 + 300;
    timers.push(setTimeout(() => setPhase('hashing'), afterFields));

    // Simulate hash progress
    for (let i = 1; i <= 5; i++) {
      timers.push(
        setTimeout(() => {
          setHashProgress(i * 20);
        }, afterFields + i * 200)
      );
    }

    // Phase 4: Complete
    const afterHash = afterFields + 1400;
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
      }, afterHash + 300)
    );

    return () => timers.forEach(clearTimeout);
  }, [isActive, completeStep, assetType.name, schemaEntries]);

  return (
    <StepContainer stepNumber={2}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hero: Blueprint schematic */}
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
              <filter id="hashGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feFlood floodColor="rgba(59, 130, 246, 0.6)" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="shadow" />
                <feMerge>
                  <feMergeNode in="shadow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Central blueprint unfold — concentric rings */}
            <motion.circle
              cx={BLUEPRINT_CENTER.x}
              cy={BLUEPRINT_CENTER.y}
              r={30}
              fill="none"
              stroke="rgba(6, 182, 212, 0.4)"
              strokeWidth={1}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={
                phase !== 'idle'
                  ? { pathLength: 1, opacity: 1 }
                  : { pathLength: 0, opacity: 0 }
              }
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            />
            <motion.circle
              cx={BLUEPRINT_CENTER.x}
              cy={BLUEPRINT_CENTER.y}
              r={55}
              fill="none"
              stroke="rgba(6, 182, 212, 0.25)"
              strokeWidth={0.5}
              strokeDasharray="4 4"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={
                phase !== 'idle'
                  ? { pathLength: 1, opacity: 1 }
                  : { pathLength: 0, opacity: 0 }
              }
              transition={{ duration: 1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            />
            <motion.circle
              cx={BLUEPRINT_CENTER.x}
              cy={BLUEPRINT_CENTER.y}
              r={FIELD_RADIUS}
              fill="none"
              stroke="rgba(6, 182, 212, 0.15)"
              strokeWidth={0.5}
              strokeDasharray="2 6"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={
                phase !== 'idle'
                  ? { pathLength: 1, opacity: 1 }
                  : { pathLength: 0, opacity: 0 }
              }
              transition={{ duration: 1.2, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            />

            {/* Center label */}
            <AnimatePresence>
              {phase !== 'idle' && (
                <motion.g
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <text
                    x={BLUEPRINT_CENTER.x}
                    y={BLUEPRINT_CENTER.y - 6}
                    textAnchor="middle"
                    className="fill-cyan-300"
                    style={{ fontFamily: 'ui-monospace, monospace', fontSize: '9px', fontWeight: 'bold' }}
                  >
                    {assetType.name}
                  </text>
                  <text
                    x={BLUEPRINT_CENTER.x}
                    y={BLUEPRINT_CENTER.y + 8}
                    textAnchor="middle"
                    className="fill-slate-500"
                    style={{ fontFamily: 'ui-monospace, monospace', fontSize: '7px' }}
                  >
                    {assetType.category} / {assetType.subcategory}
                  </text>
                </motion.g>
              )}
            </AnimatePresence>

            {/* Schema field callout lines + labels */}
            {schemaEntries.map(([key, field], idx) => {
              const pos = fieldPositions[idx];
              const isRevealed = idx < fieldsRevealed;

              return (
                <g key={key}>
                  {/* Callout line from center to field position */}
                  <motion.line
                    x1={BLUEPRINT_CENTER.x}
                    y1={BLUEPRINT_CENTER.y}
                    x2={pos.x}
                    y2={pos.y}
                    stroke="rgba(6, 182, 212, 0.35)"
                    strokeWidth={1}
                    strokeLinecap="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={
                      isRevealed
                        ? { pathLength: 1, opacity: 1 }
                        : { pathLength: 0, opacity: 0 }
                    }
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  />
                  {/* Field endpoint dot */}
                  <motion.circle
                    cx={pos.x}
                    cy={pos.y}
                    r={4}
                    fill={
                      phase === 'complete'
                        ? 'rgba(16, 185, 129, 0.8)'
                        : 'rgba(6, 182, 212, 0.7)'
                    }
                    filter="url(#blueprintGlow)"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={
                      isRevealed
                        ? { scale: 1, opacity: 1 }
                        : { scale: 0, opacity: 0 }
                    }
                    transition={{
                      type: 'spring',
                      stiffness: 400,
                      damping: 15,
                      delay: 0.1,
                    }}
                  />
                  {/* Field label group */}
                  <AnimatePresence>
                    {isRevealed && (
                      <motion.g
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3, delay: 0.15 }}
                      >
                        {/* Field name */}
                        <text
                          x={pos.x}
                          y={pos.y + (pos.y > BLUEPRINT_CENTER.y ? 16 : -14)}
                          textAnchor="middle"
                          className="fill-cyan-400"
                          style={{ fontFamily: 'ui-monospace, monospace', fontSize: '8px', fontWeight: 'bold' }}
                        >
                          {key}
                        </text>
                        {/* Field type */}
                        <text
                          x={pos.x}
                          y={pos.y + (pos.y > BLUEPRINT_CENTER.y ? 27 : -4)}
                          textAnchor="middle"
                          className="fill-purple-400"
                          style={{ fontFamily: 'ui-monospace, monospace', fontSize: '7px' }}
                        >
                          {field.type}
                        </text>
                      </motion.g>
                    )}
                  </AnimatePresence>
                </g>
              );
            })}

            {/* Hash funnel visualization */}
            {(phase === 'hashing' || phase === 'complete') && (
              <motion.g
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                {/* Funnel lines converging from fields to center */}
                {fieldPositions.map((pos, idx) => (
                  <motion.line
                    key={`hash-flow-${idx}`}
                    x1={pos.x}
                    y1={pos.y}
                    x2={BLUEPRINT_CENTER.x}
                    y2={BLUEPRINT_CENTER.y}
                    stroke="rgba(59, 130, 246, 0.5)"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: phase === 'complete' ? 1 : hashProgress / 100 }}
                    transition={{ duration: 0.4, delay: idx * 0.05 }}
                  />
                ))}
                {/* Center hash glow */}
                <motion.circle
                  cx={BLUEPRINT_CENTER.x}
                  cy={BLUEPRINT_CENTER.y}
                  r={18}
                  fill="rgba(59, 130, 246, 0.15)"
                  filter="url(#hashGlow)"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{
                    scale: phase === 'complete' ? 1.3 : 1,
                    opacity: phase === 'complete' ? 0.8 : 0.5,
                  }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                />
              </motion.g>
            )}
          </svg>

          {/* Particle burst on completion */}
          {phase === 'complete' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
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
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  Schema Definition
                </h4>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/30 text-blue-300 border border-blue-800/40">
                    {assetType.category}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/30 text-amber-300 border border-amber-800/40">
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
                      <code className="text-xs font-mono text-cyan-400">{key}</code>
                      <span className="text-[10px] text-slate-600 hidden sm:inline">
                        {field.description}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-purple-400 bg-purple-900/20 px-1.5 py-0.5 rounded shrink-0">
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
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
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
              <div className="flex items-center gap-2 text-[10px] text-slate-500 mb-3">
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
              <div className="flex items-center gap-2 text-xs text-slate-500">
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
                      <span className="text-sm font-bold text-emerald-400">
                        Asset Type Registered
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">Type ID</span>
                        <span className="text-xs font-mono text-amber-400">1</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">Type Hash</span>
                        <TypedText
                          text={truncateHash(HASHES.assetTypeHash)}
                          speed={15}
                          className="text-xs font-mono text-blue-400"
                          cursor={false}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">Fields</span>
                        <span className="text-xs font-mono text-cyan-400">
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
