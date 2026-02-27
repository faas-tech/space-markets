'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StepContainer } from '../step-container';
import { useDemoContext } from '../demo-provider';
import {
  LESSOR,
  CONTRACTS,
  truncateAddress,
} from '@/lib/demo/demo-data';
import { GlowCard } from '../animations/glow-card';
import { CountUp } from '../animations/count-up';
import { ParticleBurst } from '../animations/particle-burst';
import { cn } from '@/lib/utils';
import {
  fadeInUp,
  fadeInLeft,
  fadeInRight,
  heroEntrance,
} from '@/lib/demo/motion-variants';

// ---- Types ----
type Phase = 'idle' | 'source' | 'branching' | 'distributing' | 'settled' | 'done';

interface TokenHolder {
  address: string;
  label: string;
  balance: string;
  percentage: number;
  revenue: number;
  color: string;
  glowColor: string;
  barColor: string;
}

// ---- SVG Layout Constants ----
const TREE_W = 660;
const TREE_H = 360;

// Source node position (top center)
const SOURCE_X = TREE_W / 2;
const SOURCE_Y = 40;

// Holder node positions (bottom row, evenly spaced)
const HOLDER_POSITIONS = [
  { x: 90, y: 300 },
  { x: 260, y: 300 },
  { x: 430, y: 300 },
  { x: 570, y: 300 },
];

// Intermediate split point
const SPLIT_Y = 150;

export function Step11Revenue() {
  const { state, completeStep, presetData } = useDemoContext();
  const isActive = state.currentStep === 11;
  const [phase, setPhase] = useState<Phase>('idle');
  const [revealedBranches, setRevealedBranches] = useState(0);
  const [revealedHolders, setRevealedHolders] = useState(0);
  const [showSettled, setShowSettled] = useState(false);
  const [particleStreams, setParticleStreams] = useState<number[]>([]);

  // Build holders data from preset
  const totalRevenue = useMemo(() => parseFloat(presetData.leaseTerms.totalCost.replace(/,/g, '')), [presetData]);

  const holders: TokenHolder[] = useMemo(() => [
    {
      address: LESSOR,
      label: 'Lessor (Primary)',
      balance: '600,000',
      percentage: 60,
      revenue: totalRevenue * 0.6,
      color: 'text-blue-400',
      glowColor: 'blue',
      barColor: 'bg-blue-500',
    },
    {
      address: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
      label: 'Investor A',
      balance: '200,000',
      percentage: 20,
      revenue: totalRevenue * 0.2,
      color: 'text-purple-400',
      glowColor: 'purple',
      barColor: 'bg-purple-500',
    },
    {
      address: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
      label: 'Investor B',
      balance: '120,000',
      percentage: 12,
      revenue: totalRevenue * 0.12,
      color: 'text-amber-400',
      glowColor: 'amber',
      barColor: 'bg-amber-500',
    },
    {
      address: '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc',
      label: 'Investor C',
      balance: '80,000',
      percentage: 8,
      revenue: totalRevenue * 0.08,
      color: 'text-emerald-400',
      glowColor: 'emerald',
      barColor: 'bg-emerald-500',
    },
  ], [totalRevenue]);

  // Build SVG paths for revenue tree branches
  const branchPaths = useMemo(() => holders.map((holder, idx) => {
    const target = HOLDER_POSITIONS[idx];
    // Smooth S-curve from source to split point to holder
    const midX = (SOURCE_X + target.x) / 2;
    return `M ${SOURCE_X} ${SOURCE_Y + 30} C ${SOURCE_X} ${SPLIT_Y - 20}, ${midX} ${SPLIT_Y}, ${target.x} ${SPLIT_Y} S ${target.x} ${SPLIT_Y + 40}, ${target.x} ${target.y - 30}`;
  }), [holders]);

  // Phase progression
  useEffect(() => {
    if (!isActive) {
      setPhase('idle');
      setRevealedBranches(0);
      setRevealedHolders(0);
      setShowSettled(false);
      setParticleStreams([]);
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];

    // Phase 1: Source appears
    timers.push(setTimeout(() => setPhase('source'), 300));

    // Phase 2: Branches draw
    timers.push(setTimeout(() => setPhase('branching'), 1000));
    holders.forEach((_, idx) => {
      timers.push(setTimeout(() => {
        setRevealedBranches(idx + 1);
      }, 1200 + idx * 400));
    });

    // Phase 3: Distributing (particles flow + holders light up)
    const distributeStart = 1200 + holders.length * 400 + 200;
    timers.push(setTimeout(() => setPhase('distributing'), distributeStart));

    holders.forEach((_, idx) => {
      // Spawn particle stream
      timers.push(setTimeout(() => {
        setParticleStreams((prev) => [...prev, idx]);
      }, distributeStart + idx * 500));

      // Reveal holder card
      timers.push(setTimeout(() => {
        setRevealedHolders(idx + 1);
      }, distributeStart + idx * 500 + 600));
    });

    // Phase 4: Settled
    const settledTime = distributeStart + holders.length * 500 + 800;
    timers.push(setTimeout(() => {
      setPhase('settled');
      setShowSettled(true);
    }, settledTime));

    // Phase 5: Done + complete
    timers.push(setTimeout(() => {
      setPhase('done');
      completeStep(11, {
        totalRevenue: totalRevenue.toFixed(2),
        holdersCount: holders.length,
        distributionMethod: 'ERC20Votes proportional',
      });
    }, settledTime + 600));

    return () => timers.forEach(clearTimeout);
  }, [isActive, completeStep, holders, totalRevenue]);

  const phaseIdx = ['idle', 'source', 'branching', 'distributing', 'settled', 'done'].indexOf(phase);
  const showSource = phaseIdx >= 1;
  const showBranches = phaseIdx >= 2;
  const showDistributing = phaseIdx >= 3;

  return (
    <StepContainer stepNumber={11}>
      <motion.div
        variants={heroEntrance}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* ===== HERO: Revenue Waterfall Tree ===== */}
        <motion.div
          variants={fadeInUp}
          className="relative w-full overflow-hidden rounded-xl border border-slate-800/40 bg-slate-950/80"
        >
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${TREE_W} ${TREE_H}`}
            preserveAspectRatio="xMidYMid meet"
            className="w-full"
            style={{ minHeight: 280 }}
          >
            <defs>
              {/* Branch glow filters */}
              <filter id="branchGlow" x="-10%" y="-10%" width="120%" height="120%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Gradients for branches */}
              <linearGradient id="branchGrad0" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(59, 130, 246, 0.7)" />
                <stop offset="100%" stopColor="rgba(59, 130, 246, 0.2)" />
              </linearGradient>
              <linearGradient id="branchGrad1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(168, 85, 247, 0.7)" />
                <stop offset="100%" stopColor="rgba(168, 85, 247, 0.2)" />
              </linearGradient>
              <linearGradient id="branchGrad2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(245, 158, 11, 0.7)" />
                <stop offset="100%" stopColor="rgba(245, 158, 11, 0.2)" />
              </linearGradient>
              <linearGradient id="branchGrad3" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(16, 185, 129, 0.7)" />
                <stop offset="100%" stopColor="rgba(16, 185, 129, 0.2)" />
              </linearGradient>
            </defs>

            {/* ---- Source Node ---- */}
            <motion.g
              initial={{ opacity: 0, scale: 0.5 }}
              animate={showSource ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              style={{ transformOrigin: `${SOURCE_X}px ${SOURCE_Y}px` }}
            >
              {/* Glow ring */}
              <motion.circle
                cx={SOURCE_X}
                cy={SOURCE_Y}
                r={28}
                fill="none"
                stroke="rgba(6, 182, 212, 0.3)"
                strokeWidth={1}
                animate={showSource ? {
                  r: [28, 34, 28],
                  opacity: [0.3, 0.6, 0.3],
                } : {}}
                transition={{ duration: 2, repeat: Infinity }}
              />
              {/* Node circle */}
              <circle
                cx={SOURCE_X}
                cy={SOURCE_Y}
                r={22}
                fill="rgba(6, 182, 212, 0.1)"
                stroke="rgba(6, 182, 212, 0.5)"
                strokeWidth={1.5}
              />
              {/* Amount text */}
              <text
                x={SOURCE_X}
                y={SOURCE_Y - 3}
                textAnchor="middle"
                fill="rgba(6, 182, 212, 0.9)"
                fontSize={13}
                fontFamily="monospace"
                fontWeight="bold"
              >
                {totalRevenue.toLocaleString()}
              </text>
              <text
                x={SOURCE_X}
                y={SOURCE_Y + 10}
                textAnchor="middle"
                fill="rgba(148, 163, 184, 0.6)"
                fontSize={10}
                fontFamily="monospace"
              >
                USDC
              </text>
            </motion.g>

            {/* ---- Revenue Branch Paths ---- */}
            {branchPaths.map((path, idx) => {
              const isRevealed = idx < revealedBranches;
              // Scale stroke width by percentage
              const strokeW = 1 + (holders[idx].percentage / 100) * 5;
              const branchColors = [
                'rgba(59, 130, 246, 0.5)',
                'rgba(168, 85, 247, 0.5)',
                'rgba(245, 158, 11, 0.5)',
                'rgba(16, 185, 129, 0.5)',
              ];

              return (
                <g key={idx}>
                  {/* Background track */}
                  <path
                    d={path}
                    fill="none"
                    stroke="rgba(51, 65, 85, 0.2)"
                    strokeWidth={strokeW}
                    strokeLinecap="round"
                  />
                  {/* Animated branch */}
                  <motion.path
                    d={path}
                    fill="none"
                    stroke={`url(#branchGrad${idx})`}
                    strokeWidth={strokeW}
                    strokeLinecap="round"
                    filter="url(#branchGlow)"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={isRevealed ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  />

                  {/* Flowing particle dots along branch */}
                  {particleStreams.includes(idx) && [0, 1, 2].map((pIdx) => {
                    const particleColors = [
                      'rgba(59, 130, 246, 0.9)',
                      'rgba(168, 85, 247, 0.9)',
                      'rgba(245, 158, 11, 0.9)',
                      'rgba(16, 185, 129, 0.9)',
                    ];
                    return (
                      <motion.circle
                        key={`p-${idx}-${pIdx}`}
                        r={2 + (holders[idx].percentage / 100) * 3}
                        fill={particleColors[idx]}
                        filter="url(#branchGlow)"
                        initial={{ offsetDistance: '0%', opacity: 0.9 }}
                        animate={{ offsetDistance: '100%', opacity: 0.2 }}
                        transition={{
                          duration: 1,
                          delay: pIdx * 0.25,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        style={{
                          offsetPath: `path("${path}")`,
                          offsetRotate: '0deg',
                        }}
                      />
                    );
                  })}
                </g>
              );
            })}

            {/* ---- Holder Nodes (at bottom of branches) ---- */}
            {holders.map((holder, idx) => {
              const pos = HOLDER_POSITIONS[idx];
              const isRevealed = idx < revealedHolders;
              const nodeColors = [
                { fill: 'rgba(59, 130, 246, 0.1)', stroke: 'rgba(59, 130, 246, 0.5)', text: 'rgba(59, 130, 246, 0.9)' },
                { fill: 'rgba(168, 85, 247, 0.1)', stroke: 'rgba(168, 85, 247, 0.5)', text: 'rgba(168, 85, 247, 0.9)' },
                { fill: 'rgba(245, 158, 11, 0.1)', stroke: 'rgba(245, 158, 11, 0.5)', text: 'rgba(245, 158, 11, 0.9)' },
                { fill: 'rgba(16, 185, 129, 0.1)', stroke: 'rgba(16, 185, 129, 0.5)', text: 'rgba(16, 185, 129, 0.9)' },
              ];
              const colors = nodeColors[idx];

              return (
                <motion.g
                  key={holder.address}
                  initial={{ opacity: 0, scale: 0.3 }}
                  animate={isRevealed ? { opacity: 1, scale: 1 } : { opacity: 0.15, scale: 0.7 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                  style={{ transformOrigin: `${pos.x}px ${pos.y}px` }}
                >
                  {/* Glow pulse */}
                  {isRevealed && (
                    <motion.circle
                      cx={pos.x}
                      cy={pos.y}
                      r={24}
                      fill="none"
                      stroke={colors.stroke}
                      strokeWidth={1}
                      animate={{
                        r: [24, 30, 24],
                        opacity: [0.3, 0.6, 0.3],
                      }}
                      transition={{ duration: 2, repeat: Infinity, delay: idx * 0.3 }}
                    />
                  )}
                  {/* Node background */}
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={20}
                    fill={colors.fill}
                    stroke={colors.stroke}
                    strokeWidth={1.5}
                  />
                  {/* Percentage */}
                  <text
                    x={pos.x}
                    y={pos.y + 1}
                    textAnchor="middle"
                    fill={colors.text}
                    fontSize={12}
                    fontFamily="monospace"
                    fontWeight="bold"
                    dominantBaseline="middle"
                  >
                    {holder.percentage}%
                  </text>
                  {/* Label below */}
                  <text
                    x={pos.x}
                    y={pos.y + 35}
                    textAnchor="middle"
                    fill="rgba(148, 163, 184, 0.6)"
                    fontSize={11}
                    fontFamily="monospace"
                  >
                    {holder.label}
                  </text>
                  {/* Revenue amount below label */}
                  <text
                    x={pos.x}
                    y={pos.y + 48}
                    textAnchor="middle"
                    fill={colors.text}
                    fontSize={12}
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {isRevealed ? `${holder.revenue.toFixed(2)} USDC` : '---'}
                  </text>
                </motion.g>
              );
            })}

            {/* ---- Split Point Label ---- */}
            <motion.g
              initial={{ opacity: 0 }}
              animate={showBranches ? { opacity: 1 } : { opacity: 0 }}
              transition={{ delay: 0.5 }}
            >
              <text
                x={SOURCE_X}
                y={SPLIT_Y - 10}
                textAnchor="middle"
                fill="rgba(100, 116, 139, 0.4)"
                fontSize={10}
                fontFamily="monospace"
              >
                ERC20Votes Proportional Split
              </text>
            </motion.g>
          </svg>

          {/* "ALL DISTRIBUTED" overlay */}
          <AnimatePresence>
            {showSettled && (
              <motion.div
                className="absolute top-4 right-4"
                initial={{ opacity: 0, scale: 0.8, x: 20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <div className="relative px-4 py-2 rounded-lg bg-emerald-900/60 border border-emerald-500/30 backdrop-blur-sm">
                  <span className="text-xs font-bold text-emerald-300 uppercase tracking-widest">
                    All Distributed
                  </span>
                  <ParticleBurst trigger={showSettled} color="emerald" particleCount={16} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ===== Bottom: Holder Cards + Ownership Chart ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Holder Cards (2 cols) */}
          <motion.div className="lg:col-span-2 space-y-4" variants={fadeInLeft}>
            {/* Token Holder Detail Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {holders.map((holder, idx) => {
                const isRevealed = idx < revealedHolders;
                const glowColors: Array<'blue' | 'purple' | 'amber' | 'emerald'> = ['blue', 'purple', 'amber', 'emerald'];

                return (
                  <GlowCard
                    key={holder.address}
                    color={glowColors[idx]}
                    intensity={isRevealed ? 'medium' : 'low'}
                    active={isRevealed}
                    delay={idx * 0.1}
                  >
                    <div className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={cn('text-sm font-bold', holder.color)}>
                          {holder.label}
                        </span>
                        {isRevealed ? (
                          <motion.span
                            className="text-xs px-1.5 py-0.5 rounded bg-emerald-900/30 text-emerald-300 border border-emerald-800/40 font-bold"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                          >
                            PAID
                          </motion.span>
                        ) : (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 border border-slate-700">
                            PENDING
                          </span>
                        )}
                      </div>

                      <code className={cn('text-xs font-mono block', holder.color)}>
                        {truncateAddress(holder.address)}
                      </code>

                      <div className="grid grid-cols-3 gap-2 pt-1">
                        <div>
                          <span className="text-[11px] text-slate-600 uppercase tracking-wider block">Balance</span>
                          <span className="text-xs font-mono text-slate-400">{holder.balance}</span>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-600 uppercase tracking-wider block">Share</span>
                          <span className="text-xs font-mono text-slate-300 font-bold">{holder.percentage}%</span>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-600 uppercase tracking-wider block">Revenue</span>
                          {isRevealed ? (
                            <CountUp
                              value={holder.revenue}
                              decimals={2}
                              suffix=" USDC"
                              className="text-xs font-mono text-cyan-400 font-bold"
                              delay={0.2}
                            />
                          ) : (
                            <span className="text-xs font-mono text-slate-600">---</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </GlowCard>
                );
              })}
            </div>

            {/* Animated Ownership Bar Chart */}
            <GlowCard
              color="cyan"
              intensity={showDistributing ? 'low' : 'low'}
              active={showBranches}
            >
              <div className="p-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
                  Ownership Distribution
                </h4>

                {/* Stacked bar */}
                <div className="flex h-7 rounded-lg overflow-hidden gap-0.5">
                  {holders.map((holder, idx) => {
                    const isRevealed = idx < revealedBranches;
                    return (
                      <motion.div
                        key={holder.address}
                        className={cn(
                          'h-full rounded-sm relative overflow-hidden',
                          holder.barColor,
                        )}
                        initial={{ width: 0, opacity: 0 }}
                        animate={isRevealed ? {
                          width: `${holder.percentage}%`,
                          opacity: 1,
                        } : {
                          width: 0,
                          opacity: 0,
                        }}
                        transition={{
                          duration: 0.6,
                          delay: idx * 0.15,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                      >
                        {/* Shimmer effect */}
                        {isRevealed && (
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                            initial={{ x: '-100%' }}
                            animate={{ x: '200%' }}
                            transition={{ duration: 1.5, delay: idx * 0.15 + 0.3 }}
                          />
                        )}
                      </motion.div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-3 mt-3">
                  {holders.map((holder, idx) => (
                    <motion.div
                      key={holder.address}
                      className="flex items-center gap-1.5"
                      initial={{ opacity: 0 }}
                      animate={idx < revealedBranches ? { opacity: 1 } : { opacity: 0.2 }}
                      transition={{ delay: idx * 0.1 }}
                    >
                      <div className={cn('w-2 h-2 rounded-full', holder.barColor)} />
                      <span className="text-xs text-slate-500">
                        {holder.label} ({holder.percentage}%)
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </GlowCard>
          </motion.div>

          {/* Side Panel (1 col) */}
          <motion.div variants={fadeInRight} className="space-y-4">
            {/* Distribution Details */}
            <GlowCard
              color="cyan"
              intensity={showDistributing ? 'medium' : 'low'}
              active={showSource}
            >
              <div className="p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  Distribution Details
                </h4>

                <div>
                  <span className="text-xs text-slate-600 uppercase tracking-wider block mb-0.5">Total Revenue</span>
                  {showSource ? (
                    <CountUp
                      value={totalRevenue}
                      decimals={2}
                      suffix=" USDC"
                      className="text-lg font-bold font-mono text-cyan-400"
                      delay={0.3}
                    />
                  ) : (
                    <span className="text-lg font-bold font-mono text-slate-600">---</span>
                  )}
                </div>

                <div>
                  <span className="text-xs text-slate-600 uppercase tracking-wider block mb-0.5">Distributed</span>
                  <span className="text-sm font-mono text-white">
                    {showDistributing ? (
                      <CountUp
                        value={holders.slice(0, revealedHolders).reduce((sum, h) => sum + h.revenue, 0)}
                        decimals={2}
                        suffix=" USDC"
                        className="text-sm font-mono text-white font-bold"
                      />
                    ) : (
                      '0.00 USDC'
                    )}
                  </span>
                </div>

                <div>
                  <span className="text-xs text-slate-600 uppercase tracking-wider block mb-0.5">Token</span>
                  <span className="text-sm text-slate-300">
                    {presetData.assetMetadata.tokenSymbol} ({presetData.assetMetadata.tokenSupply} total)
                  </span>
                </div>

                <div>
                  <span className="text-xs text-slate-600 uppercase tracking-wider block mb-0.5">Method</span>
                  <span className="text-sm text-purple-300">ERC20Votes Proportional</span>
                </div>

                <div>
                  <span className="text-xs text-slate-600 uppercase tracking-wider block mb-0.5">Contract</span>
                  <code className="text-sm font-mono text-emerald-400">
                    {truncateAddress(CONTRACTS.marketplace.address)}
                  </code>
                </div>
              </div>
            </GlowCard>

            {/* Distribution Progress */}
            <GlowCard
              color={revealedHolders >= holders.length ? 'emerald' : 'blue'}
              intensity={showDistributing ? 'low' : 'low'}
              active={showBranches}
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-500">Distribution Progress</span>
                  <span className="text-sm font-mono text-slate-400">
                    {revealedHolders}/{holders.length}
                  </span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-emerald-600 to-cyan-500 rounded-full"
                    initial={{ width: '0%' }}
                    animate={{ width: `${(revealedHolders / holders.length) * 100}%` }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>

                {/* Holder status list */}
                <div className="mt-3 space-y-1.5">
                  {holders.map((holder, idx) => {
                    const isRevealed = idx < revealedHolders;
                    return (
                      <motion.div
                        key={holder.address}
                        className="flex items-center justify-between"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: isRevealed ? 1 : 0.3 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="flex items-center gap-1.5">
                          <motion.div
                            className={cn(
                              'w-1.5 h-1.5 rounded-full',
                              isRevealed ? holder.barColor : 'bg-slate-700',
                            )}
                            animate={isRevealed ? {
                              boxShadow: [
                                '0 0 0px rgba(255,255,255,0)',
                                '0 0 6px rgba(255,255,255,0.4)',
                                '0 0 0px rgba(255,255,255,0)',
                              ],
                            } : {}}
                            transition={{ duration: 0.5 }}
                          />
                          <span className="text-xs text-slate-500">{holder.label}</span>
                        </div>
                        <span className={cn(
                          'text-xs font-mono',
                          isRevealed ? 'text-emerald-400' : 'text-slate-700',
                        )}>
                          {isRevealed ? `${holder.revenue.toFixed(2)}` : '---'}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </GlowCard>
          </motion.div>
        </div>
      </motion.div>
    </StepContainer>
  );
}
