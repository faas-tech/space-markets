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
  glowColor: 'blue' | 'purple' | 'amber' | 'emerald';
  barColor: string;
  strokeColor: string;
  fillColor: string;
  textColor: string;
}

// ---- SVG Layout Constants ----
const TREE_W = 700;
const TREE_H = 420;

// Source card (top center)
const SOURCE_X = TREE_W / 2;
const SOURCE_CARD_W = 260;
const SOURCE_CARD_H = 56;
const SOURCE_CARD_Y = 24;
const SOURCE_BOTTOM = SOURCE_CARD_Y + SOURCE_CARD_H;

// Rail (horizontal distribution line)
const RAIL_Y = SOURCE_BOTTOM + 50;

// Holder nodes (bottom)
const HOLDER_Y = 320;
const HOLDER_X = [100, 275, 440, 600];

export function Step11Revenue() {
  const { state, completeStep, presetData } = useDemoContext();
  const isActive = state.currentStep === 11;
  const [phase, setPhase] = useState<Phase>('idle');
  const [revealedBranches, setRevealedBranches] = useState(0);
  const [revealedHolders, setRevealedHolders] = useState(0);
  const [showSettled, setShowSettled] = useState(false);
  const [particleStreams, setParticleStreams] = useState<number[]>([]);
  const [distributedAmount, setDistributedAmount] = useState(0);

  const totalRevenue = useMemo(() => parseFloat(presetData.leaseTerms.totalCost.replace(/,/g, '')), [presetData]);

  const holders: TokenHolder[] = useMemo(() => [
    {
      address: LESSOR, label: 'Lessor (Primary)', balance: '600,000',
      percentage: 60, revenue: totalRevenue * 0.6,
      color: 'text-primary', glowColor: 'blue', barColor: 'bg-blue-500',
      strokeColor: 'rgba(59, 130, 246, 0.6)', fillColor: 'rgba(59, 130, 246, 0.08)',
      textColor: 'rgba(59, 130, 246, 0.9)',
    },
    {
      address: '0x90F79bf6EB2c4f870365E785982E1f101E93b906', label: 'Investor A', balance: '200,000',
      percentage: 20, revenue: totalRevenue * 0.2,
      color: 'text-purple-400', glowColor: 'purple', barColor: 'bg-purple-500',
      strokeColor: 'rgba(168, 85, 247, 0.6)', fillColor: 'rgba(168, 85, 247, 0.08)',
      textColor: 'rgba(168, 85, 247, 0.9)',
    },
    {
      address: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65', label: 'Investor B', balance: '120,000',
      percentage: 12, revenue: totalRevenue * 0.12,
      color: 'text-warning', glowColor: 'amber', barColor: 'bg-amber-500',
      strokeColor: 'rgba(245, 158, 11, 0.6)', fillColor: 'rgba(245, 158, 11, 0.08)',
      textColor: 'rgba(245, 158, 11, 0.9)',
    },
    {
      address: '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc', label: 'Investor C', balance: '80,000',
      percentage: 8, revenue: totalRevenue * 0.08,
      color: 'text-success', glowColor: 'emerald', barColor: 'bg-emerald-500',
      strokeColor: 'rgba(16, 185, 129, 0.6)', fillColor: 'rgba(16, 185, 129, 0.08)',
      textColor: 'rgba(16, 185, 129, 0.9)',
    },
  ], [totalRevenue]);

  // Build angular SVG paths: trunk down → horizontal to holder X → vertical down
  const branchPaths = useMemo(() => holders.map((_, idx) => {
    const hx = HOLDER_X[idx];
    return `M ${SOURCE_X} ${SOURCE_BOTTOM} L ${SOURCE_X} ${RAIL_Y} L ${hx} ${RAIL_Y} L ${hx} ${HOLDER_Y - 32}`;
  }), [holders]);

  // Phase progression
  useEffect(() => {
    if (!isActive) {
      setPhase('idle');
      setRevealedBranches(0);
      setRevealedHolders(0);
      setShowSettled(false);
      setParticleStreams([]);
      setDistributedAmount(0);
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];

    timers.push(setTimeout(() => setPhase('source'), 300));
    timers.push(setTimeout(() => setPhase('branching'), 1000));
    holders.forEach((_, idx) => {
      timers.push(setTimeout(() => setRevealedBranches(idx + 1), 1200 + idx * 400));
    });

    const distributeStart = 1200 + holders.length * 400 + 200;
    timers.push(setTimeout(() => setPhase('distributing'), distributeStart));

    holders.forEach((holder, idx) => {
      timers.push(setTimeout(() => setParticleStreams((prev) => [...prev, idx]), distributeStart + idx * 500));
      timers.push(setTimeout(() => {
        setRevealedHolders(idx + 1);
        setDistributedAmount((prev) => prev + holder.revenue);
      }, distributeStart + idx * 500 + 600));
    });

    const settledTime = distributeStart + holders.length * 500 + 800;
    timers.push(setTimeout(() => { setPhase('settled'); setShowSettled(true); }, settledTime));
    timers.push(setTimeout(() => {
      setPhase('done');
      completeStep(11, {
        totalRevenue: totalRevenue.toFixed(2),
        holdersCount: holders.length,
        distributionMethod: 'Proportional ownership',
      });
    }, settledTime + 600));

    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

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
        {/* ===== HERO: Revenue Distribution Diagram ===== */}
        <motion.div
          variants={fadeInUp}
          className="relative w-full overflow-hidden rounded-xl border border-border/40 bg-background/80"
        >
          <svg
            width="100%"
            viewBox={`0 0 ${TREE_W} ${TREE_H}`}
            preserveAspectRatio="xMidYMid meet"
            className="w-full"
            style={{ minHeight: 300 }}
          >
            <defs>
              <filter id="branchGlow" x="-10%" y="-10%" width="120%" height="120%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* ---- Source Card (horizontal rect) ---- */}
            <motion.g
              initial={{ opacity: 0, y: -20 }}
              animate={showSource ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            >
              <rect
                x={SOURCE_X - SOURCE_CARD_W / 2}
                y={SOURCE_CARD_Y}
                width={SOURCE_CARD_W}
                height={SOURCE_CARD_H}
                rx={12}
                fill="rgba(6, 182, 212, 0.06)"
                stroke="rgba(6, 182, 212, 0.4)"
                strokeWidth={1.5}
              />
              {/* Subtle glow behind card */}
              <motion.rect
                x={SOURCE_X - SOURCE_CARD_W / 2 - 4}
                y={SOURCE_CARD_Y - 4}
                width={SOURCE_CARD_W + 8}
                height={SOURCE_CARD_H + 8}
                rx={14}
                fill="none"
                stroke="rgba(6, 182, 212, 0.15)"
                strokeWidth={1}
                animate={showSource ? {
                  opacity: [0.3, 0.6, 0.3],
                } : { opacity: 0 }}
                transition={{ duration: 2, repeat: 2 }}
              />
              <text
                x={SOURCE_X}
                y={SOURCE_CARD_Y + 26}
                textAnchor="middle"
                fill={distributedAmount >= totalRevenue * 0.99 ? 'rgba(16, 185, 129, 0.95)' : 'rgba(6, 182, 212, 0.95)'}
                fontSize={20}
                fontFamily="monospace"
                fontWeight="bold"
              >
                {Math.max(0, totalRevenue - distributedAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
              </text>
              <text
                x={SOURCE_X}
                y={SOURCE_CARD_Y + 44}
                textAnchor="middle"
                fill="rgba(148, 163, 184, 0.5)"
                fontSize={11}
                fontFamily="monospace"
              >
                {distributedAmount >= totalRevenue * 0.99 ? 'Fully Distributed' : 'Remaining to Distribute'}
              </text>
            </motion.g>

            {/* ---- Angular Branch Paths ---- */}
            {branchPaths.map((path, idx) => {
              const isRevealed = idx < revealedBranches;
              const strokeW = 1.5 + (holders[idx].percentage / 100) * 5;

              return (
                <g key={idx}>
                  {/* Background track */}
                  <path
                    d={path}
                    fill="none"
                    stroke="rgba(51, 65, 85, 0.15)"
                    strokeWidth={strokeW}
                    strokeLinejoin="round"
                  />
                  {/* Animated colored path */}
                  <motion.path
                    d={path}
                    fill="none"
                    stroke={holders[idx].strokeColor}
                    strokeWidth={strokeW}
                    strokeLinejoin="round"
                    filter="url(#branchGlow)"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={isRevealed ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
                    transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                  />

                  {/* Flowing particles along branch */}
                  {particleStreams.includes(idx) && [0, 1, 2].map((pIdx) => (
                    <motion.circle
                      key={`p-${idx}-${pIdx}`}
                      r={2 + (holders[idx].percentage / 100) * 3}
                      fill={holders[idx].textColor}
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
                  ))}

                  {/* Percentage label on the rail segment */}
                  {isRevealed && (
                    <motion.text
                      x={(SOURCE_X + HOLDER_X[idx]) / 2}
                      y={RAIL_Y - 10}
                      textAnchor="middle"
                      fill={holders[idx].textColor}
                      fontSize={12}
                      fontFamily="monospace"
                      fontWeight="bold"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.8 }}
                      transition={{ delay: 0.5 }}
                    >
                      {holders[idx].percentage}%
                    </motion.text>
                  )}
                </g>
              );
            })}

            {/* ---- "Proportional Split" label on rail ---- */}
            <motion.text
              x={SOURCE_X}
              y={RAIL_Y + 20}
              textAnchor="middle"
              fill="rgba(100, 116, 139, 0.35)"
              fontSize={11}
              fontFamily="monospace"
              initial={{ opacity: 0 }}
              animate={showBranches ? { opacity: 1 } : { opacity: 0 }}
              transition={{ delay: 0.5 }}
            >
              Proportional Ownership Split
            </motion.text>

            {/* ---- Holder Nodes ---- */}
            {holders.map((holder, idx) => {
              const hx = HOLDER_X[idx];
              const isRevealed = idx < revealedHolders;

              return (
                <motion.g
                  key={holder.address}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={isRevealed ? { opacity: 1, scale: 1 } : { opacity: 0.15, scale: 0.7 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                  style={{ transformOrigin: `${hx}px ${HOLDER_Y}px` }}
                >
                  {/* Node rect */}
                  <rect
                    x={hx - 50}
                    y={HOLDER_Y - 28}
                    width={100}
                    height={56}
                    rx={10}
                    fill={holder.fillColor}
                    stroke={holder.strokeColor}
                    strokeWidth={1.5}
                  />
                  {/* Percentage */}
                  <text
                    x={hx}
                    y={HOLDER_Y - 6}
                    textAnchor="middle"
                    fill={holder.textColor}
                    fontSize={16}
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {holder.percentage}%
                  </text>
                  {/* Revenue amount */}
                  <text
                    x={hx}
                    y={HOLDER_Y + 14}
                    textAnchor="middle"
                    fill={holder.textColor}
                    fontSize={11}
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {isRevealed ? `${holder.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '---'}
                  </text>
                  {/* Label below node */}
                  <text
                    x={hx}
                    y={HOLDER_Y + 44}
                    textAnchor="middle"
                    fill="rgba(148, 163, 184, 0.6)"
                    fontSize={12}
                    fontFamily="monospace"
                  >
                    {holder.label}
                  </text>
                </motion.g>
              );
            })}
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
                <div className="relative px-5 py-2.5 rounded-lg bg-emerald-900/60 border border-success/30 backdrop-blur-sm">
                  <span className="text-sm font-bold text-success uppercase tracking-widest">
                    All Distributed
                  </span>
                  <ParticleBurst trigger={showSettled} color="emerald" particleCount={16} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ===== Bottom: Holder Cards + Details ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Holder Cards + Ownership Bar (2 cols) */}
          <motion.div className="lg:col-span-2 space-y-4" variants={fadeInLeft}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {holders.map((holder, idx) => {
                const isRevealed = idx < revealedHolders;
                return (
                  <GlowCard
                    key={holder.address}
                    color={holder.glowColor}
                    intensity={isRevealed ? 'medium' : 'low'}
                    active={isRevealed}
                    delay={idx * 0.1}
                  >
                    <div className="p-5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={cn('text-base font-bold', holder.color)}>
                          {holder.label}
                        </span>
                        {isRevealed ? (
                          <motion.span
                            className="text-xs px-2 py-0.5 rounded bg-emerald-900/30 text-success border border-emerald-800/40 font-bold"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                          >
                            PAID
                          </motion.span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded bg-secondary text-muted-foreground border border-border">
                            PENDING
                          </span>
                        )}
                      </div>

                      <code className={cn('text-sm font-mono block', holder.color)}>
                        {truncateAddress(holder.address)}
                      </code>

                      <div className="grid grid-cols-3 gap-2 pt-1">
                        <div>
                          <span className="text-xs text-muted-foreground/60 uppercase tracking-wider block">Balance</span>
                          <span className="text-sm font-mono text-muted-foreground">{holder.balance}</span>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground/60 uppercase tracking-wider block">Share</span>
                          <span className="text-sm font-mono text-foreground-secondary font-bold">{holder.percentage}%</span>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground/60 uppercase tracking-wider block">Revenue</span>
                          <span className={cn('text-sm font-mono font-bold', isRevealed ? 'text-cyan-400' : 'text-muted-foreground/60')}>
                            {isRevealed ? `${holder.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC` : '---'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </GlowCard>
                );
              })}
            </div>

            {/* Ownership Bar */}
            <GlowCard color="cyan" intensity="low" active={showBranches}>
              <div className="p-5">
                <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">
                  Ownership Distribution
                </h4>
                <div className="flex h-8 rounded-lg overflow-hidden gap-0.5">
                  {holders.map((holder, idx) => {
                    const isRevealed = idx < revealedBranches;
                    return (
                      <motion.div
                        key={holder.address}
                        className={cn('h-full rounded-sm relative overflow-hidden', holder.barColor)}
                        initial={{ width: 0, opacity: 0 }}
                        animate={isRevealed ? { width: `${holder.percentage}%`, opacity: 1 } : { width: 0, opacity: 0 }}
                        transition={{ duration: 0.6, delay: idx * 0.15, ease: [0.22, 1, 0.36, 1] }}
                      >
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
                <div className="flex flex-wrap gap-4 mt-3">
                  {holders.map((holder, idx) => (
                    <motion.div
                      key={holder.address}
                      className="flex items-center gap-2"
                      initial={{ opacity: 0 }}
                      animate={idx < revealedBranches ? { opacity: 1 } : { opacity: 0.2 }}
                      transition={{ delay: idx * 0.1 }}
                    >
                      <div className={cn('w-2.5 h-2.5 rounded-full', holder.barColor)} />
                      <span className="text-sm text-muted-foreground">
                        {holder.label} ({holder.percentage}%)
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </GlowCard>
          </motion.div>

          {/* Side Panel */}
          <motion.div variants={fadeInRight} className="space-y-4">
            <GlowCard
              color="cyan"
              intensity={showDistributing ? 'medium' : 'low'}
              active={showSource}
            >
              <div className="p-5 space-y-4">
                <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                  Distribution Details
                </h4>

                <div>
                  <span className="text-sm text-muted-foreground/60 uppercase tracking-wider block mb-0.5">Total Revenue</span>
                  <span className="text-xl font-bold font-mono text-cyan-400">
                    {totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
                  </span>
                </div>

                <div>
                  <span className="text-sm text-muted-foreground/60 uppercase tracking-wider block mb-0.5">Distributed</span>
                  <span className="text-base font-mono text-foreground font-bold">
                    {distributedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
                  </span>
                </div>

                <div>
                  <span className="text-sm text-muted-foreground/60 uppercase tracking-wider block mb-0.5">Token</span>
                  <span className="text-base text-foreground-secondary">
                    {presetData.assetMetadata.tokenSymbol} ({presetData.assetMetadata.tokenSupply} total)
                  </span>
                </div>

                <div>
                  <span className="text-sm text-muted-foreground/60 uppercase tracking-wider block mb-0.5">Method</span>
                  <span className="text-base text-purple-300">Proportional Ownership</span>
                </div>

                <div>
                  <span className="text-sm text-muted-foreground/60 uppercase tracking-wider block mb-0.5">Contract</span>
                  <code className="text-base font-mono text-success">
                    {truncateAddress(CONTRACTS.marketplace.address)}
                  </code>
                </div>
              </div>
            </GlowCard>

            {/* Distribution Progress */}
            <GlowCard
              color={revealedHolders >= holders.length ? 'emerald' : 'blue'}
              intensity="low"
              active={showBranches}
            >
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-muted-foreground">Distribution Progress</span>
                  <span className="text-sm font-mono text-muted-foreground">
                    {revealedHolders}/{holders.length}
                  </span>
                </div>
                <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-emerald-600 to-cyan-500 rounded-full"
                    initial={{ width: '0%' }}
                    animate={{ width: `${(revealedHolders / holders.length) * 100}%` }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>

                <div className="mt-4 space-y-2">
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
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            'w-2 h-2 rounded-full',
                            isRevealed ? holder.barColor : 'bg-slate-700',
                          )} />
                          <span className="text-sm text-muted-foreground">{holder.label}</span>
                        </div>
                        <span className={cn(
                          'text-sm font-mono',
                          isRevealed ? 'text-success' : 'text-muted-foreground/40',
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
