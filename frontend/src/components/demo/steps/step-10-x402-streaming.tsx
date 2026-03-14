'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StepContainer } from '../step-container';
import { useDemoContext } from '../demo-provider';
import { GlowCard } from '../animations/glow-card';
import { CountUp } from '../animations/count-up';
import { ParticleBurst } from '../animations/particle-burst';
import { cn } from '@/lib/utils';
import {
  fadeInUp,
  heroEntrance,
  drawPath,
} from '@/lib/demo/motion-variants';

// ---- Types ----
type Phase = 'idle' | 'connecting' | 'streaming' | 'finalArc' | 'complete';

interface PaymentEntry {
  id: number;
  amount: number;
}

interface OrbitalParticle {
  id: number;
  size: number;
  brightness: number;
  isFinal: boolean;
}

// ---- Constants ----
const TOTAL_PULSES = 8;
const PULSE_INTERVAL_MS = 750;

// SVG dimensions for orbital scene
const SVG_W = 700;
const SVG_H = 400;

const GROUND_X = 120;
const GROUND_Y = 340;
const SAT_X = 540;
const SAT_Y = 80;
const ARC_CP1_X = 160;
const ARC_CP1_Y = 100;
const ARC_CP2_X = 460;
const ARC_CP2_Y = 40;
const PAYMENT_ARC_PATH = `M ${GROUND_X} ${GROUND_Y} C ${ARC_CP1_X} ${ARC_CP1_Y}, ${ARC_CP2_X} ${ARC_CP2_Y}, ${SAT_X} ${SAT_Y}`;
const EARTH_ARC = `M 0 ${SVG_H} Q ${SVG_W / 2} ${SVG_H - 80}, ${SVG_W} ${SVG_H}`;

export function Step10X402Streaming() {
  const { state, completeStep, presetData } = useDemoContext();
  const isActive = state.currentStep === 10;
  const [phase, setPhase] = useState<Phase>('idle');
  const [pulseCount, setPulseCount] = useState(0);
  const [runningTotal, setRunningTotal] = useState(0);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [entries, setEntries] = useState<PaymentEntry[]>([]);
  const [particles, setParticles] = useState<OrbitalParticle[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const completedRef = useRef(false);
  const pulseCountRef = useRef(0);
  const particleIdRef = useRef(0);
  const logRef = useRef<HTMLDivElement>(null);

  const rate = useMemo(() => parseFloat(presetData.leaseTerms.ratePerSecond) * 10, [presetData]);

  // Reset on deactivation
  useEffect(() => {
    if (!isActive) {
      setPhase('idle');
      setPulseCount(0);
      setRunningTotal(0);
      setSecondsElapsed(0);
      setEntries([]);
      setParticles([]);
      setShowCelebration(false);
      completedRef.current = false;
      pulseCountRef.current = 0;
      particleIdRef.current = 0;
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setPhase('connecting'), 300));
    timers.push(setTimeout(() => setPhase('streaming'), 1400));

    return () => timers.forEach(clearTimeout);
  }, [isActive]);

  // Streaming pulse engine
  useEffect(() => {
    if (phase !== 'streaming') return;

    const interval = setInterval(() => {
      const next = pulseCountRef.current + 1;
      pulseCountRef.current = next;

      const newTotal = next * rate;
      setPulseCount(next);
      setRunningTotal(newTotal);
      setSecondsElapsed(next);
      setEntries((prev) => [...prev, { id: next, amount: rate }]);

      // Spawn orbital particle
      const isFinal = next >= TOTAL_PULSES;
      const pid = particleIdRef.current++;
      const newParticle: OrbitalParticle = {
        id: pid,
        size: isFinal ? 8 : 3 + (next / TOTAL_PULSES) * 3,
        brightness: 0.4 + (next / TOTAL_PULSES) * 0.6,
        isFinal,
      };
      setParticles((p) => [...p, newParticle]);
      setTimeout(() => {
        setParticles((p) => p.filter((pp) => pp.id !== pid));
      }, 1500);

      if (next >= TOTAL_PULSES && !completedRef.current) {
        completedRef.current = true;
        setPhase('finalArc');
        setTimeout(() => {
          setPhase('complete');
          setShowCelebration(true);
        }, 1200);
        setTimeout(() => {
          completeStep(10, {
            totalPaid: (TOTAL_PULSES * rate).toFixed(6),
            secondsStreamed: TOTAL_PULSES,
            facilitator: presetData.x402Config.facilitator,
          });
        }, 1800);
      }
    }, PULSE_INTERVAL_MS);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Auto-scroll payment log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [entries]);

  const streamProgress = Math.min(pulseCount / TOTAL_PULSES, 1);
  const isStreaming = phase === 'streaming' || phase === 'finalArc';

  return (
    <StepContainer stepNumber={10}>
      <motion.div
        variants={heroEntrance}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* ===== HERO: Orbital Payment Scene ===== */}
        <motion.div
          variants={fadeInUp}
          className="relative w-full overflow-hidden rounded-xl border border-border/40 bg-background/80"
          style={{ minHeight: 320 }}
        >
          <div className="absolute inset-0 pointer-events-none">
            <svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              preserveAspectRatio="xMidYMid meet"
              className="w-full h-full"
            >
              <defs>
                <linearGradient id="earthGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="transparent" />
                  <stop offset="60%" stopColor="transparent" />
                  <stop offset="80%" stopColor="rgba(16, 185, 129, 0.03)" />
                  <stop offset="100%" stopColor="rgba(16, 185, 129, 0.08)" />
                </linearGradient>
                <radialGradient id="atmosGlow" cx="50%" cy="100%" r="70%">
                  <stop offset="0%" stopColor="rgba(6, 182, 212, 0.06)" />
                  <stop offset="100%" stopColor="transparent" />
                </radialGradient>
                <filter id="arcGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="particleGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="starGlow" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="2" />
                </filter>
              </defs>

              <rect width={SVG_W} height={SVG_H} fill="url(#earthGrad)" />
              <rect width={SVG_W} height={SVG_H} fill="url(#atmosGlow)" />

              {/* Stars */}
              {[
                { cx: 80, cy: 30, r: 1.2 }, { cx: 200, cy: 50, r: 0.8 },
                { cx: 350, cy: 20, r: 1 }, { cx: 480, cy: 60, r: 0.7 },
                { cx: 600, cy: 25, r: 1.1 }, { cx: 150, cy: 80, r: 0.6 },
                { cx: 420, cy: 90, r: 0.9 }, { cx: 300, cy: 45, r: 0.8 },
                { cx: 560, cy: 100, r: 0.5 }, { cx: 50, cy: 120, r: 0.7 },
                { cx: 650, cy: 70, r: 0.9 }, { cx: 250, cy: 110, r: 0.6 },
              ].map((star, i) => (
                <g key={i}>
                  <circle cx={star.cx} cy={star.cy} r={star.r * 2} fill="rgba(200, 220, 255, 0.1)" filter="url(#starGlow)" />
                  <circle cx={star.cx} cy={star.cy} r={star.r} fill="rgba(200, 220, 255, 0.6)" />
                </g>
              ))}

              {/* Earth curvature */}
              <motion.path
                d={EARTH_ARC}
                fill="none"
                stroke="rgba(16, 185, 129, 0.15)"
                strokeWidth={2}
                initial={{ pathLength: 0 }}
                animate={phase !== 'idle' ? { pathLength: 1 } : { pathLength: 0 }}
                transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
              />
              <path d={`${EARTH_ARC} L ${SVG_W} ${SVG_H} L 0 ${SVG_H} Z`} fill="rgba(16, 185, 129, 0.03)" />

              {/* Ground Station */}
              <g>
                <motion.rect
                  x={GROUND_X - 20} y={GROUND_Y - 5} width={40} height={10} rx={2}
                  fill="rgba(100, 116, 139, 0.6)"
                  initial={{ opacity: 0, scaleX: 0 }}
                  animate={phase !== 'idle' ? { opacity: 1, scaleX: 1 } : { opacity: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                />
                <motion.path
                  d={`M ${GROUND_X - 12} ${GROUND_Y - 5} Q ${GROUND_X} ${GROUND_Y - 35}, ${GROUND_X + 12} ${GROUND_Y - 5}`}
                  fill="none" stroke="rgba(148, 163, 184, 0.8)" strokeWidth={2}
                  initial={{ pathLength: 0 }}
                  animate={phase !== 'idle' ? { pathLength: 1 } : { pathLength: 0 }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                />
                {phase !== 'idle' && [0, 1, 2].map((ring) => (
                  <motion.circle
                    key={ring} cx={GROUND_X} cy={GROUND_Y - 20} r={8 + ring * 8}
                    fill="none" stroke="rgba(6, 182, 212, 0.3)" strokeWidth={0.5}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: [0, 0.4, 0], scale: [0.5, 1, 1.3] }}
                    transition={{ duration: 2, delay: ring * 0.3, repeat: 2, repeatDelay: 1 }}
                  />
                ))}
                <text x={GROUND_X} y={GROUND_Y + 22} textAnchor="middle"
                  fill="rgba(148, 163, 184, 0.6)" fontSize={12} fontFamily="monospace">
                  GROUND STATION
                </text>
              </g>

              {/* Satellite */}
              <motion.g
                initial={{ opacity: 0, y: -20 }}
                animate={phase !== 'idle' ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
                transition={{ duration: 0.8, delay: 0.6, type: 'spring', stiffness: 120, damping: 18 }}
              >
                <motion.ellipse
                  cx={SAT_X} cy={SAT_Y} rx={45} ry={18}
                  fill="none" stroke="rgba(59, 130, 246, 0.15)" strokeWidth={0.8} strokeDasharray="3 5"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: 2, ease: 'linear' }}
                  style={{ transformOrigin: `${SAT_X}px ${SAT_Y}px` }}
                />
                <rect x={SAT_X - 30} y={SAT_Y - 5} width={18} height={10} rx={1} fill="rgba(59, 130, 246, 0.6)" />
                <rect x={SAT_X + 12} y={SAT_Y - 5} width={18} height={10} rx={1} fill="rgba(59, 130, 246, 0.6)" />
                <rect x={SAT_X - 8} y={SAT_Y - 10} width={16} height={20} rx={2} fill="rgba(203, 213, 225, 0.8)" />
                <line x1={SAT_X} y1={SAT_Y - 10} x2={SAT_X} y2={SAT_Y - 20} stroke="rgba(148, 163, 184, 0.7)" strokeWidth={1.2} />
                <circle cx={SAT_X} cy={SAT_Y - 21} r={2} fill="rgba(248, 113, 113, 0.8)" />
                <motion.circle
                  cx={SAT_X} cy={SAT_Y} r={3}
                  fill={isStreaming ? 'rgba(16, 185, 129, 0.9)' : 'rgba(100, 116, 139, 0.5)'}
                  animate={isStreaming ? {
                    filter: [
                      'drop-shadow(0 0 0px rgba(16,185,129,0))',
                      'drop-shadow(0 0 6px rgba(16,185,129,0.8))',
                      'drop-shadow(0 0 0px rgba(16,185,129,0))',
                    ],
                  } : {}}
                  transition={{ duration: 1.5, repeat: 2 }}
                />
                <text x={SAT_X} y={SAT_Y + 30} textAnchor="middle"
                  fill="rgba(148, 163, 184, 0.6)" fontSize={12} fontFamily="monospace">
                  {presetData.assetMetadata.name}
                </text>
              </motion.g>

              {/* Payment arc track */}
              <motion.path
                d={PAYMENT_ARC_PATH} fill="none"
                stroke="rgba(16, 185, 129, 0.08)" strokeWidth={1} strokeDasharray="4 8"
                variants={drawPath} initial="hidden"
                animate={(isStreaming || phase === 'complete') ? 'visible' : 'hidden'}
              />

              {/* Animated payment particles */}
              {particles.map((particle) => (
                <motion.circle
                  key={particle.id}
                  r={particle.isFinal ? 6 : particle.size}
                  fill={particle.isFinal
                    ? 'rgba(16, 185, 129, 1)'
                    : `rgba(16, 185, 129, ${particle.brightness})`}
                  filter={particle.isFinal ? 'url(#arcGlow)' : 'url(#particleGlow)'}
                  initial={{ offsetDistance: '0%', opacity: 0.8 }}
                  animate={{ offsetDistance: '100%', opacity: particle.isFinal ? 1 : 0.3 }}
                  transition={{ duration: particle.isFinal ? 1.2 : 1, ease: [0.22, 1, 0.36, 1] }}
                  style={{ offsetPath: `path("${PAYMENT_ARC_PATH}")`, offsetRotate: '0deg' }}
                />
              ))}
              {particles.map((particle) => (
                <motion.circle
                  key={`trail-${particle.id}`}
                  r={particle.isFinal ? 12 : particle.size * 2}
                  fill={`rgba(16, 185, 129, ${particle.brightness * 0.15})`}
                  initial={{ offsetDistance: '0%', opacity: 0.3 }}
                  animate={{ offsetDistance: '95%', opacity: 0 }}
                  transition={{ duration: particle.isFinal ? 1.4 : 1.2, ease: [0.22, 1, 0.36, 1] }}
                  style={{ offsetPath: `path("${PAYMENT_ARC_PATH}")`, offsetRotate: '0deg' }}
                />
              ))}

              {/* Central streamed amount */}
              <foreignObject x={SVG_W / 2 - 120} y={SVG_H / 2 - 50} width={240} height={100}>
                <div className="flex flex-col items-center justify-center h-full">
                  <motion.div
                    className="text-center"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={phase !== 'idle' ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.5, delay: 1 }}
                  >
                    <div className="text-3xl sm:text-4xl font-bold font-mono leading-none">
                      {phase === 'complete' ? (
                        <CountUp value={TOTAL_PULSES * rate} decimals={4} className="text-success" />
                      ) : (
                        <span className="text-success">{runningTotal.toFixed(4)}</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1.5 uppercase tracking-wider">
                      {presetData.leaseTerms.currency} Streamed
                    </p>
                  </motion.div>
                </div>
              </foreignObject>
            </svg>
          </div>

          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-background-surface">
            <motion.div
              className="h-full bg-gradient-to-r from-emerald-600 to-cyan-500"
              initial={{ width: '0%' }}
              animate={{ width: `${streamProgress * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* Completion overlay */}
          <AnimatePresence>
            {phase === 'complete' && (
              <motion.div
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  className="relative"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                >
                  <div className="px-8 py-4 rounded-full bg-emerald-900/80 border border-success/40 backdrop-blur-sm">
                    <span className="text-base font-bold text-success uppercase tracking-widest">
                      Stream Complete
                    </span>
                  </div>
                  <ParticleBurst trigger={showCelebration} color="emerald" particleCount={20} />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ===== Bottom: Live Payments + Summary ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Live Payment Feed (2 cols) */}
          <motion.div className="lg:col-span-2" variants={fadeInUp}>
            <GlowCard
              color="emerald"
              intensity={isStreaming ? 'medium' : 'low'}
              active={phase !== 'idle'}
              className="overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-border/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                    Live Payments
                  </h4>
                  {isStreaming && (
                    <motion.div
                      className="w-2.5 h-2.5 rounded-full bg-emerald-400"
                      animate={{
                        boxShadow: [
                          '0 0 0px rgba(16, 185, 129, 0)',
                          '0 0 8px rgba(16, 185, 129, 0.8)',
                          '0 0 0px rgba(16, 185, 129, 0)',
                        ],
                      }}
                      transition={{ duration: 1, repeat: 2 }}
                    />
                  )}
                </div>
                <span className="text-sm font-mono text-muted-foreground/60">
                  {pulseCount} of {TOTAL_PULSES}
                </span>
              </div>

              <div ref={logRef} className="max-h-[280px] overflow-y-auto divide-y divide-border/20">
                {entries.length === 0 && (
                  <div className="px-6 py-5 text-base text-muted-foreground/60">
                    {phase === 'connecting'
                      ? 'Connecting to payment channel...'
                      : 'Waiting for stream to begin...'}
                  </div>
                )}

                {entries.map((entry) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className="px-6 py-3 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-sm font-mono text-muted-foreground/50 w-8 shrink-0 text-right">
                        #{entry.id}
                      </span>
                      <span className="text-base text-foreground">
                        Payment {entry.id}
                      </span>
                    </div>
                    <span className="text-base font-mono font-bold text-success shrink-0">
                      +{entry.amount.toFixed(6)} USDC
                    </span>
                  </motion.div>
                ))}
              </div>
            </GlowCard>
          </motion.div>

          {/* Stream Summary (1 col) */}
          <motion.div variants={fadeInUp} className="space-y-4">
            <GlowCard
              color={phase === 'complete' ? 'emerald' : isStreaming ? 'cyan' : 'blue'}
              intensity={isStreaming ? 'high' : 'low'}
              active={phase !== 'idle'}
            >
              <div className="p-6 space-y-5">
                <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                  Stream Summary
                </h4>

                {/* Status */}
                <div>
                  <span className="text-sm text-muted-foreground/60 uppercase tracking-wider block mb-1">
                    Status
                  </span>
                  <div className="flex items-center gap-2.5">
                    <motion.div
                      className={cn(
                        'w-3 h-3 rounded-full',
                        isStreaming ? 'bg-emerald-400' :
                        phase === 'complete' ? 'bg-cyan-400' :
                        phase === 'connecting' ? 'bg-amber-400' : 'bg-slate-600'
                      )}
                      animate={isStreaming ? {
                        boxShadow: [
                          '0 0 0px rgba(16, 185, 129, 0)',
                          '0 0 10px rgba(16, 185, 129, 0.8)',
                          '0 0 0px rgba(16, 185, 129, 0)',
                        ],
                      } : {}}
                      transition={{ duration: 1, repeat: 2 }}
                    />
                    <span className={cn(
                      'text-base font-bold uppercase tracking-wider',
                      isStreaming ? 'text-success' :
                      phase === 'complete' ? 'text-cyan-400' :
                      phase === 'connecting' ? 'text-warning' : 'text-muted-foreground'
                    )}>
                      {isStreaming ? 'Streaming' :
                       phase === 'complete' ? 'Complete' :
                       phase === 'connecting' ? 'Connecting' : 'Idle'}
                    </span>
                  </div>
                </div>

                {/* Rate */}
                <div>
                  <span className="text-sm text-muted-foreground/60 uppercase tracking-wider block mb-1">
                    Rate
                  </span>
                  <span className="text-lg font-mono text-cyan-400 font-bold">
                    {presetData.leaseTerms.ratePerSecond}
                  </span>
                  <span className="text-sm text-muted-foreground ml-1">USDC / second</span>
                </div>

                {/* Elapsed */}
                <div>
                  <span className="text-sm text-muted-foreground/60 uppercase tracking-wider block mb-1">
                    Elapsed
                  </span>
                  <span className="text-lg font-mono text-warning font-bold">
                    {secondsElapsed}s
                  </span>
                  <span className="text-sm text-muted-foreground ml-1">of {TOTAL_PULSES}s demo</span>
                </div>

                {/* Total Paid */}
                <div>
                  <span className="text-sm text-muted-foreground/60 uppercase tracking-wider block mb-1">
                    Total Paid
                  </span>
                  <div className="text-2xl font-mono text-foreground font-bold">
                    {phase === 'complete' ? (
                      <CountUp
                        value={TOTAL_PULSES * rate}
                        decimals={6}
                        suffix=" USDC"
                        className="text-success"
                      />
                    ) : (
                      <span>{runningTotal.toFixed(6)} <span className="text-base text-muted-foreground">USDC</span></span>
                    )}
                  </div>
                </div>
              </div>
            </GlowCard>

            {/* How it works — simple explainer */}
            <GlowCard
              color="purple"
              intensity="low"
              active={phase !== 'idle'}
            >
              <div className="p-5">
                <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">
                  How It Works
                </h4>
                <div className="space-y-3">
                  {[
                    { icon: '1', text: 'Each second, a signed payment is sent' },
                    { icon: '2', text: 'Payment verifier confirms authenticity' },
                    { icon: '3', text: 'USDC transfers directly to the lessor' },
                  ].map((step, idx) => (
                    <motion.div
                      key={idx}
                      className="flex items-start gap-3"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: phase !== 'idle' ? 1 : 0.3, x: 0 }}
                      transition={{ delay: 0.3 + idx * 0.15 }}
                    >
                      <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0 text-xs font-bold text-purple-400">
                        {step.icon}
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{step.text}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </GlowCard>
          </motion.div>
        </div>
      </motion.div>
    </StepContainer>
  );
}
