'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StepContainer } from '../step-container';
import { useDemoContext } from '../demo-provider';
import {
  DEPLOYER,
  LESSOR,
  LESSEE,
  CONTRACTS,
  LEASE_NFT_ID,
  TX_HASHES,
  BLOCK_NUMBERS,
  truncateAddress,
  truncateHash,
} from '@/lib/demo/demo-data';
import { GlowCard } from '../animations/glow-card';
import { CountUp } from '../animations/count-up';
import { ParticleBurst } from '../animations/particle-burst';
import { cn } from '@/lib/utils';
import { t } from '@/lib/demo/step-config';
import {
  heroEntrance,
  scaleInBounce,
  signalPulse,
  glowPulse,
} from '@/lib/demo/motion-variants';

// ---- Types ----
type Phase = 'idle' | 'stats' | 'timeline' | 'health' | 'complete';

// ---- Stat card entrance directions ----
interface StatCard {
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  color: string;
  glowColor: 'blue' | 'emerald' | 'amber' | 'indigo' | 'cyan';
  fromX: number;
  fromY: number;
}

// ---- Transaction timeline entries ----
interface TimelineEntry {
  label: string;
  hash: string;
  block: number;
  color: string;
}

// ---- Health indicators ----
interface HealthIndicator {
  label: string;
  status: string;
  ok: boolean;
}

const HEALTH_ITEMS: HealthIndicator[] = [
  { label: 'Smart Contracts', status: 'Operational', ok: true },
  { label: 'Asset Registry', status: '1 type, 1 asset', ok: true },
  { label: 'Active Leases', status: '1 active', ok: true },
  { label: 'X402 Payments', status: 'Streaming', ok: true },
  { label: 'Revenue Pipeline', status: 'Distributed', ok: true },
  { label: 'Metadata Integrity', status: 'Verified', ok: true },
];

export function Step12Summary() {
  const { state, completeStep, presetData } = useDemoContext();
  const isActive = state.currentStep === 12;
  const [phase, setPhase] = useState<Phase>('idle');
  const [revealedStats, setRevealedStats] = useState(0);
  const [revealedTimeline, setRevealedTimeline] = useState(0);
  const [revealedHealth, setRevealedHealth] = useState(0);
  const [showBanner, setShowBanner] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  const totalRevenue = useMemo(() => parseFloat(presetData.leaseTerms.totalCost.replace(/,/g, '')), [presetData]);

  // Stat cards that fly in from corners
  const statCards: StatCard[] = useMemo(() => [
    {
      label: 'Contracts Deployed',
      value: 5,
      decimals: 0,
      color: 'text-indigo-400',
      glowColor: 'indigo',
      fromX: -80,
      fromY: -60,
    },
    {
      label: 'Transactions',
      value: 10,
      decimals: 0,
      color: 'text-blue-400',
      glowColor: 'blue',
      fromX: 80,
      fromY: -60,
    },
    {
      label: 'Revenue Distributed',
      value: totalRevenue,
      suffix: ' USDC',
      decimals: 2,
      color: 'text-emerald-400',
      glowColor: 'emerald',
      fromX: -80,
      fromY: 60,
    },
    {
      label: 'Cryptographic Lease',
      value: parseInt(LEASE_NFT_ID, 10),
      prefix: '#',
      decimals: 0,
      color: 'text-amber-400',
      glowColor: 'amber',
      fromX: 80,
      fromY: 60,
    },
  ], [totalRevenue]);

  // Timeline entries
  const timelineEntries: TimelineEntry[] = useMemo(() => [
    { label: 'Deploy Contracts', hash: TX_HASHES.deploy, block: BLOCK_NUMBERS.deployBlock, color: 'bg-indigo-400' },
    { label: 'Create Asset Type', hash: TX_HASHES.createType, block: BLOCK_NUMBERS.createTypeBlock, color: 'bg-indigo-400' },
    { label: 'Register Asset', hash: TX_HASHES.registerAsset, block: BLOCK_NUMBERS.registerBlock, color: 'bg-blue-400' },
    { label: 'Lease Offer', hash: TX_HASHES.leaseOffer, block: BLOCK_NUMBERS.offerBlock, color: 'bg-amber-400' },
    { label: 'Lessee Bid', hash: TX_HASHES.lesseeBid, block: BLOCK_NUMBERS.bidBlock, color: 'bg-amber-400' },
    { label: 'Lessor Accept', hash: TX_HASHES.lessorAccept, block: BLOCK_NUMBERS.acceptBlock, color: 'bg-amber-400' },
    { label: 'Mint NFT', hash: TX_HASHES.mintNft, block: BLOCK_NUMBERS.mintBlock, color: 'bg-cyan-400' },
    { label: 'X402 Payments', hash: TX_HASHES.x402Payment, block: BLOCK_NUMBERS.x402StartBlock, color: 'bg-emerald-400' },
    { label: 'Revenue Dist.', hash: TX_HASHES.revenue, block: BLOCK_NUMBERS.revenueBlock, color: 'bg-emerald-400' },
  ], []);

  // Phase progression
  useEffect(() => {
    if (!isActive) {
      setPhase('idle');
      setRevealedStats(0);
      setRevealedTimeline(0);
      setRevealedHealth(0);
      setShowBanner(false);
      setShowCelebration(false);
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];

    // Phase 1: Stats fly in
    timers.push(setTimeout(() => setPhase('stats'), t(200)));
    statCards.forEach((_, idx) => {
      timers.push(setTimeout(() => {
        setRevealedStats(idx + 1);
      }, t(400 + idx * 250)));
    });

    // Phase 2: Timeline draws
    const timelineStart = t(400 + statCards.length * 250 + 300);
    timers.push(setTimeout(() => setPhase('timeline'), timelineStart));
    timelineEntries.forEach((_, idx) => {
      timers.push(setTimeout(() => {
        setRevealedTimeline(idx + 1);
      }, timelineStart + t(200 + idx * 150)));
    });

    // Phase 3: Health indicators light up
    const healthStart = timelineStart + t(200 + timelineEntries.length * 150 + 300);
    timers.push(setTimeout(() => setPhase('health'), healthStart));
    HEALTH_ITEMS.forEach((_, idx) => {
      timers.push(setTimeout(() => {
        setRevealedHealth(idx + 1);
      }, healthStart + t(100 + idx * 200)));
    });

    // Phase 4: Mission Complete banner
    const bannerTime = healthStart + t(100 + HEALTH_ITEMS.length * 200 + 400);
    timers.push(setTimeout(() => {
      setPhase('complete');
      setShowBanner(true);
    }, bannerTime));

    timers.push(setTimeout(() => {
      setShowCelebration(true);
    }, bannerTime + t(300)));

    // Complete step
    timers.push(setTimeout(() => {
      completeStep(12, {
        protocolComplete: true,
        totalTransactions: 10,
        totalContracts: 5,
        nftMinted: true,
        revenueDistributed: true,
      });
    }, bannerTime + t(600)));

    return () => timers.forEach(clearTimeout);
  }, [isActive, completeStep, statCards, timelineEntries]);

  const phaseIdx = ['idle', 'stats', 'timeline', 'health', 'complete'].indexOf(phase);

  return (
    <StepContainer stepNumber={12}>
      <motion.div
        variants={heroEntrance}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* ===== HERO: Stat Cards Flying In From Corners ===== */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {statCards.map((stat, idx) => {
            const isRevealed = idx < revealedStats;

            return (
              <motion.div
                key={stat.label}
                variants={scaleInBounce}
                initial="hidden"
                animate={isRevealed ? "visible" : "hidden"}
                className="h-full"
              >
                <GlowCard
                  color={stat.glowColor}
                  intensity={isRevealed ? 'high' : 'low'}
                  active={isRevealed}
                  className="h-full flex flex-col"
                >
                  <div className="p-4 text-center">
                    <div className={cn('text-2xl sm:text-3xl font-bold font-mono', stat.color)}>
                      {isRevealed ? (
                        <CountUp
                          value={stat.value}
                          decimals={stat.decimals ?? 0}
                          prefix={stat.prefix}
                          suffix={stat.suffix}
                          className={stat.color}
                          delay={0.1}
                        />
                      ) : (
                        <span className="text-slate-700">--</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-300 uppercase tracking-wider mt-1.5">
                      {stat.label}
                    </p>
                  </div>
                </GlowCard>
              </motion.div>
            );
          })}
        </div>

        {/* ===== Transaction Timeline ===== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={phaseIdx >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <GlowCard
            color="cyan"
            intensity={phaseIdx >= 2 ? 'medium' : 'low'}
            active={phaseIdx >= 2}
            className="overflow-hidden"
          >
            <div className="px-4 py-2.5 border-b border-slate-800/60 flex items-center justify-between">
              <h4 className="text-sm font-bold uppercase tracking-widest text-slate-300">
                Transaction Timeline
              </h4>
              <span className="text-sm font-mono text-slate-300">
                {revealedTimeline}/{timelineEntries.length} confirmed
              </span>
            </div>

            {/* Horizontal timeline visualization */}
            <div className="px-4 py-4">
              {/* Timeline track */}
              <div className="relative h-12 mb-2">
                {/* Background track */}
                <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-800 -translate-y-1/2" />

                {/* Animated progress energy conduit */}
                <motion.div
                  className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-indigo-500 via-blue-500 via-amber-500 to-emerald-500 -translate-y-1/2 rounded-full"
                  style={{
                    boxShadow: '0 0 10px rgba(59, 130, 246, 0.5), 0 0 20px rgba(16, 185, 129, 0.5)'
                  }}
                  initial={{ width: '0%' }}
                  animate={{ width: `${(revealedTimeline / timelineEntries.length) * 100}%` }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                />

                {/* Timeline nodes */}
                {timelineEntries.map((entry, idx) => {
                  const isRevealed = idx < revealedTimeline;
                  const leftPct = (idx / (timelineEntries.length - 1)) * 100;

                  return (
                    <motion.div
                      key={entry.label}
                      className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                      style={{ left: `${leftPct}%` }}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={isRevealed ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                    >
                      {/* Node dot */}
                      <div className={cn(
                        'w-3 h-3 rounded-full border-2 border-slate-950',
                        entry.color,
                      )}>
                        {/* Signal pulse ring */}
                        <motion.div
                          className="absolute inset-0 rounded-full"
                          style={{ border: `2px solid ${entry.color.replace('bg-', '')}` }}
                          variants={signalPulse}
                          initial="idle"
                          animate={isRevealed && idx === revealedTimeline - 1 ? "active" : "idle"}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Timeline labels (hidden on very small screens) */}
              <div className="relative h-8 hidden sm:block">
                {timelineEntries.map((entry, idx) => {
                  const isRevealed = idx < revealedTimeline;
                  const leftPct = (idx / (timelineEntries.length - 1)) * 100;

                  return (
                    <motion.div
                      key={`label-${entry.label}`}
                      className="absolute -translate-x-1/2 text-center"
                      style={{ left: `${leftPct}%`, width: 60 }}
                      initial={{ opacity: 0, y: -5 }}
                      animate={isRevealed ? { opacity: 1, y: 0 } : { opacity: 0, y: -5 }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                    >
                      <span className="text-xs text-slate-300 leading-tight block truncate">
                        {entry.label}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Transaction detail list */}
            <div className="border-t border-slate-800/40 divide-y divide-slate-800/20 max-h-48 overflow-y-auto">
              {timelineEntries.map((entry, idx) => {
                const isRevealed = idx < revealedTimeline;

                return (
                  <motion.div
                    key={`detail-${entry.label}`}
                    className="px-4 py-2 flex items-center justify-between gap-3"
                    initial={{ opacity: 0, x: -10 }}
                    animate={isRevealed ? { opacity: 1, x: 0 } : { opacity: 0.15, x: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', entry.color)} />
                      <span className="text-base text-slate-300">{entry.label}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <code className="text-sm font-mono text-blue-400 hidden sm:block">
                        {truncateHash(entry.hash)}
                      </code>
                      <span className="text-sm font-mono text-amber-400">
                        #{entry.block.toLocaleString()}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </GlowCard>
        </motion.div>

        {/* ===== Bottom: Contracts + Health + Participants ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Deployed Contracts */}
          <motion.div
            className="h-full"
            initial={{ opacity: 0, y: 20 }}
            animate={phaseIdx >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <GlowCard
              color="indigo"
              intensity={phaseIdx >= 2 ? 'low' : 'low'}
              active={phaseIdx >= 2}
              className="overflow-hidden h-full flex flex-col"
            >
              <div className="px-4 py-2.5 border-b border-slate-800/60">
                <h4 className="text-sm font-bold uppercase tracking-widest text-slate-300">
                  Deployed Contracts
                </h4>
              </div>
              <div className="divide-y divide-slate-800/30">
                {Object.values(CONTRACTS).map((contract, idx) => (
                  <motion.div
                    key={contract.name}
                    className="px-4 py-2.5 flex items-center justify-between gap-3"
                    initial={{ opacity: 0, x: -10 }}
                    animate={phaseIdx >= 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
                    transition={{ duration: 0.3, delay: idx * 0.08 }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <motion.div
                        className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"
                        animate={phaseIdx >= 2 ? {
                          boxShadow: [
                            '0 0 0px rgba(16, 185, 129, 0)',
                            '0 0 6px rgba(16, 185, 129, 0.6)',
                            '0 0 0px rgba(16, 185, 129, 0)',
                          ],
                        } : {}}
                        transition={{ duration: 2, repeat: phase === 'complete' ? 0 : Infinity, delay: idx * 0.3 }}
                      />
                      <span className="text-base text-white font-medium truncate">{contract.name}</span>
                    </div>
                    <code className="text-sm font-mono text-emerald-400 shrink-0">
                      {truncateAddress(contract.address)}
                    </code>
                  </motion.div>
                ))}
              </div>
            </GlowCard>
          </motion.div>

          {/* System Health */}
          <motion.div
            className="h-full"
            initial={{ opacity: 0, y: 20 }}
            animate={phaseIdx >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.5 }}
          >
            <GlowCard
              color="emerald"
              intensity={revealedHealth >= HEALTH_ITEMS.length ? 'medium' : 'low'}
              active={phaseIdx >= 3}
              className="overflow-hidden h-full flex flex-col"
            >
              <div className="px-4 py-2.5 border-b border-slate-800/60 flex items-center justify-between">
                <h4 className="text-sm font-bold uppercase tracking-widest text-slate-300">
                  System Health
                </h4>
                {revealedHealth >= HEALTH_ITEMS.length && (
                  <motion.span
                    className="text-sm text-emerald-400 font-bold"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    ALL NOMINAL
                  </motion.span>
                )}
              </div>
              <div className="divide-y divide-slate-800/30 flex-1">
                {HEALTH_ITEMS.map((item, idx) => {
                  const isRevealed = idx < revealedHealth;

                  return (
                    <motion.div
                      key={item.label}
                      className="px-4 py-2.5 flex items-center justify-between gap-3"
                      initial={{ opacity: 0.2 }}
                      animate={isRevealed ? { opacity: 1 } : { opacity: 0.2 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="flex items-center gap-2">
                        <motion.div
                          className={cn(
                            'w-2.5 h-2.5 rounded-full',
                            isRevealed ? 'bg-emerald-400' : 'bg-slate-700',
                          )}
                          initial={{ scale: 0 }}
                          animate={isRevealed ? { scale: 1 } : { scale: 0.5 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                        >
                          {/* Flash on reveal */}
                          {isRevealed && (
                            <motion.div
                              className="absolute inset-0 rounded-full bg-emerald-400"
                              initial={{ scale: 1, opacity: 0.8 }}
                              animate={{ scale: 3, opacity: 0 }}
                              transition={{ duration: 0.5 }}
                            />
                          )}
                        </motion.div>
                        <span className={cn(
                          'text-base',
                          isRevealed ? 'text-slate-300' : 'text-slate-300',
                        )}>
                          {item.label}
                        </span>
                      </div>
                      <span className={cn(
                        'text-sm font-medium',
                        isRevealed ? 'text-emerald-400' : 'text-slate-700',
                      )}>
                        {isRevealed ? item.status : '---'}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </GlowCard>
          </motion.div>

          {/* Participants */}
          <motion.div
            className="h-full"
            initial={{ opacity: 0, y: 20 }}
            animate={phaseIdx >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <GlowCard
              color="blue"
              intensity={phaseIdx >= 2 ? 'low' : 'low'}
              active={phaseIdx >= 2}
              className="overflow-hidden h-full flex flex-col"
            >
              <div className="px-4 py-2.5 border-b border-slate-800/60">
                <h4 className="text-sm font-bold uppercase tracking-widest text-slate-300">
                  Participants
                </h4>
              </div>
              <div className="divide-y divide-slate-800/30">
                {[
                  { role: 'Deployer', address: DEPLOYER, color: 'text-indigo-400', dot: 'bg-indigo-400' },
                  { role: 'Lessor', address: LESSOR, color: 'text-blue-400', dot: 'bg-blue-400' },
                  { role: 'Lessee', address: LESSEE, color: 'text-emerald-400', dot: 'bg-emerald-400' },
                  { role: 'Facilitator', address: presetData.x402Config.facilitator, color: 'text-amber-400', dot: 'bg-amber-400' },
                ].map((p, idx) => (
                  <motion.div
                    key={p.role}
                    className="px-4 py-2.5 flex items-center justify-between gap-3"
                    initial={{ opacity: 0, x: 10 }}
                    animate={phaseIdx >= 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: 10 }}
                    transition={{ duration: 0.3, delay: idx * 0.1 }}
                  >
                    <div className="flex items-center gap-2">
                      <div className={cn('w-1.5 h-1.5 rounded-full', p.dot)} />
                      <span className="text-base text-slate-300">{p.role}</span>
                    </div>
                    <code className={cn('text-base font-mono', p.color)}>
                      {truncateAddress(p.address)}
                    </code>
                  </motion.div>
                ))}
              </div>
            </GlowCard>
          </motion.div>
        </div>


      </motion.div>
    </StepContainer>
  );
}
