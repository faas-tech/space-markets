'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { StepContainer } from '../step-container';
import { useDemoContext } from '../demo-provider';
import {
  LEASE_NFT_ID,
} from '@/lib/demo/demo-data';
import { GlowCard } from '../animations/glow-card';
import { CountUp } from '../animations/count-up';
import { cn } from '@/lib/utils';
import {
  heroEntrance,
  fadeInUp,
} from '@/lib/demo/motion-variants';

// ---- Types ----
type Phase = 'idle' | 'metrics' | 'lifecycle' | 'takeaway';

export function Step12Summary() {
  const { state, completeStep, presetData } = useDemoContext();
  const isActive = state.currentStep === 12;
  const [phase, setPhase] = useState<Phase>('idle');
  const [revealedMetrics, setRevealedMetrics] = useState(0);
  const [revealedSteps, setRevealedSteps] = useState(0);

  const totalRevenue = useMemo(() => parseFloat(presetData.leaseTerms.totalCost.replace(/,/g, '')), [presetData]);
  const terms = presetData.leaseTerms;
  const asset = presetData.assetMetadata;

  // Lifecycle milestones — the story of what just happened
  const milestones = useMemo(() => [
    {
      title: 'Asset Tokenized',
      detail: `${asset.name} registered with ${asset.tokenSupply} ${asset.tokenSymbol} fractional ownership tokens`,
      color: 'text-primary',
      dotColor: 'bg-blue-400',
      borderColor: 'border-blue-500/30',
    },
    {
      title: 'Lease Matched on Marketplace',
      detail: `${terms.duration} lease at ${terms.ratePerDay} USDC/day — bids placed, winner selected, both parties signed`,
      color: 'text-warning',
      dotColor: 'bg-amber-400',
      borderColor: 'border-amber-500/30',
    },
    {
      title: 'Lease NFT Minted',
      detail: `Lease certificate #${LEASE_NFT_ID} — a portable, tradeable digital contract with all terms permanently embedded`,
      color: 'text-purple-400',
      dotColor: 'bg-purple-400',
      borderColor: 'border-purple-500/30',
    },
    {
      title: 'Per-Second Streaming Payments',
      detail: `${terms.ratePerSecond} USDC streamed every second with automated verification — no invoicing or billing infrastructure`,
      color: 'text-cyan-400',
      dotColor: 'bg-cyan-400',
      borderColor: 'border-cyan-500/30',
    },
    {
      title: 'Revenue Automatically Distributed',
      detail: `${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDC split proportionally to 4 fractional owners based on their ownership share`,
      color: 'text-success',
      dotColor: 'bg-emerald-400',
      borderColor: 'border-emerald-500/30',
    },
  ], [asset, terms, totalRevenue]);

  // Key metrics
  const metrics = useMemo(() => [
    {
      label: 'Total Value',
      value: totalRevenue,
      suffix: ' USDC',
      decimals: 2,
      color: 'text-success',
      glowColor: 'emerald' as const,
    },
    {
      label: 'Payment Rate',
      value: parseFloat(terms.ratePerSecond),
      suffix: ' /sec',
      decimals: 6,
      color: 'text-cyan-400',
      glowColor: 'cyan' as const,
    },
    {
      label: 'Token Holders',
      value: 4,
      suffix: ' paid',
      decimals: 0,
      color: 'text-purple-400',
      glowColor: 'purple' as const,
    },
    {
      label: 'Lease Duration',
      value: terms.durationDays,
      suffix: ' days',
      decimals: 0,
      color: 'text-warning',
      glowColor: 'amber' as const,
    },
  ], [totalRevenue, terms]);

  useEffect(() => {
    if (!isActive) {
      setPhase('idle');
      setRevealedMetrics(0);
      setRevealedSteps(0);
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];

    // Phase 1: Metrics appear
    timers.push(setTimeout(() => setPhase('metrics'), 300));
    metrics.forEach((_, idx) => {
      timers.push(setTimeout(() => setRevealedMetrics(idx + 1), 500 + idx * 250));
    });

    // Phase 2: Lifecycle milestones
    const lifecycleStart = 500 + metrics.length * 250 + 400;
    timers.push(setTimeout(() => setPhase('lifecycle'), lifecycleStart));
    milestones.forEach((_, idx) => {
      timers.push(setTimeout(() => setRevealedSteps(idx + 1), lifecycleStart + 200 + idx * 300));
    });

    // Phase 3: Takeaway
    const takeawayStart = lifecycleStart + 200 + milestones.length * 300 + 400;
    timers.push(setTimeout(() => setPhase('takeaway'), takeawayStart));

    // Complete step
    timers.push(setTimeout(() => {
      completeStep(12, {
        protocolComplete: true,
        totalValue: totalRevenue,
        holdersCount: 4,
      });
    }, takeawayStart + 600));

    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  const phaseIdx = ['idle', 'metrics', 'lifecycle', 'takeaway'].indexOf(phase);
  const showLifecycle = phaseIdx >= 2;
  const showTakeaway = phaseIdx >= 3;

  return (
    <StepContainer stepNumber={12}>
      <motion.div
        variants={heroEntrance}
        initial="hidden"
        animate="visible"
        className="space-y-8"
      >
        {/* ===== Key Metrics ===== */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((metric, idx) => {
            const isRevealed = idx < revealedMetrics;
            return (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                animate={isRevealed ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 30, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 200, damping: 18 }}
              >
                <GlowCard
                  color={metric.glowColor}
                  intensity={isRevealed ? 'high' : 'low'}
                  active={isRevealed}
                >
                  <div className="p-5 text-center">
                    <div className={cn('text-2xl sm:text-3xl font-bold font-mono', metric.color)}>
                      {isRevealed ? (
                        <CountUp
                          value={metric.value}
                          decimals={metric.decimals}
                          suffix={metric.suffix}
                          className={metric.color}
                          delay={0.1}
                        />
                      ) : (
                        <span className="text-muted-foreground/40">--</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground uppercase tracking-wider mt-2">
                      {metric.label}
                    </p>
                  </div>
                </GlowCard>
              </motion.div>
            );
          })}
        </div>

        {/* ===== Protocol Lifecycle — What Just Happened ===== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={showLifecycle ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5 }}
        >
          <GlowCard
            color="cyan"
            intensity={showLifecycle ? 'medium' : 'low'}
            active={showLifecycle}
          >
            <div className="px-6 py-5 border-b border-border/60">
              <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                What You Just Saw
              </h4>
            </div>
            <div className="p-6 space-y-0">
              {milestones.map((milestone, idx) => {
                const isRevealed = idx < revealedSteps;
                return (
                  <div key={milestone.title}>
                    <motion.div
                      className="flex items-start gap-5 py-4"
                      initial={{ opacity: 0, x: -20 }}
                      animate={isRevealed ? { opacity: 1, x: 0 } : { opacity: 0.15, x: -20 }}
                      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    >
                      {/* Step number + dot */}
                      <div className="flex flex-col items-center shrink-0 pt-0.5">
                        <div className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500',
                          isRevealed
                            ? `${milestone.dotColor}/20 ${milestone.color}`
                            : 'bg-secondary text-muted-foreground/40'
                        )}
                          style={isRevealed ? { backgroundColor: `color-mix(in srgb, currentColor 12%, transparent)` } : undefined}
                        >
                          <span className={cn(isRevealed ? milestone.color : 'text-muted-foreground/40')}>
                            {idx + 1}
                          </span>
                        </div>
                        {/* Connecting line (except last) */}
                        {idx < milestones.length - 1 && (
                          <motion.div
                            className={cn(
                              'w-px h-8 mt-1 transition-colors duration-500',
                              isRevealed ? 'bg-border/60' : 'bg-border/20'
                            )}
                            initial={{ scaleY: 0 }}
                            animate={isRevealed ? { scaleY: 1 } : { scaleY: 0 }}
                            transition={{ duration: 0.3, delay: 0.2 }}
                            style={{ transformOrigin: 'top' }}
                          />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-lg font-bold', isRevealed ? milestone.color : 'text-muted-foreground/40')}>
                          {milestone.title}
                        </p>
                        <p className="text-base text-muted-foreground leading-relaxed mt-0.5">
                          {milestone.detail}
                        </p>
                      </div>
                    </motion.div>
                  </div>
                );
              })}
            </div>
          </GlowCard>
        </motion.div>

        {/* ===== Why This Matters ===== */}
        <motion.div
          variants={fadeInUp}
          initial={{ opacity: 0, y: 20 }}
          animate={showTakeaway ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5 }}
        >
          <GlowCard
            color="emerald"
            intensity={showTakeaway ? 'medium' : 'low'}
            active={showTakeaway}
          >
            <div className="p-6">
              <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-5">
                Why This Matters
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {[
                  {
                    title: 'No Intermediaries',
                    detail: 'Trustless matching, escrow, and settlement — the protocol replaces brokers, billing systems, and payment processors.',
                  },
                  {
                    title: 'Real-Time Economics',
                    detail: 'Per-second streaming payments mean you only pay for what you use. Revenue reaches token holders instantly.',
                  },
                  {
                    title: 'Composable Ownership',
                    detail: 'Fractional ownership, tradeable lease certificates, and automated revenue splits create liquid markets for any asset class.',
                  },
                ].map((point, idx) => (
                  <motion.div
                    key={point.title}
                    initial={{ opacity: 0, y: 10 }}
                    animate={showTakeaway ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                    transition={{ delay: 0.2 + idx * 0.15, duration: 0.4 }}
                  >
                    <p className="text-lg font-bold text-foreground mb-1.5">{point.title}</p>
                    <p className="text-base text-muted-foreground leading-relaxed">{point.detail}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </GlowCard>
        </motion.div>
      </motion.div>
    </StepContainer>
  );
}
