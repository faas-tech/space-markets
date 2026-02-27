'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StepContainer } from '../step-container';
import { useDemoContext } from '../demo-provider';
import {
  LESSEE,
  LESSOR,
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
  drawPath,
} from '@/lib/demo/motion-variants';

// ---- Types ----
type Phase = 'idle' | 'connecting' | 'streaming' | 'finalArc' | 'complete';

interface PaymentEntry {
  id: number;
  second: number;
  sig: string;
  amount: number;
  cumulative: number;
}

interface OrbitalParticle {
  id: number;
  progress: number;
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

// Ground station position (bottom-center-left)
const GROUND_X = 120;
const GROUND_Y = 340;

// Satellite position (top-right orbit)
const SAT_X = 540;
const SAT_Y = 80;

// Bezier control points for the orbital payment arc
const ARC_CP1_X = 160;
const ARC_CP1_Y = 100;
const ARC_CP2_X = 460;
const ARC_CP2_Y = 40;

// Build the SVG Bezier path string
const PAYMENT_ARC_PATH = `M ${GROUND_X} ${GROUND_Y} C ${ARC_CP1_X} ${ARC_CP1_Y}, ${ARC_CP2_X} ${ARC_CP2_Y}, ${SAT_X} ${SAT_Y}`;

// Earth curvature arc (bottom gradient arc)
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
  const particleIdRef = useRef(0);
  const logRef = useRef<HTMLDivElement>(null);

  const rate = useMemo(() => parseFloat(presetData.leaseTerms.ratePerSecond), [presetData]);

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
    if (phase !== 'streaming' && phase !== 'finalArc') return;
    if (phase === 'finalArc') return; // let finalArc play out without new pulses

    const interval = setInterval(() => {
      setPulseCount((prev) => {
        const next = prev + 1;

        // Update running total
        const newTotal = next * rate;
        setRunningTotal(newTotal);
        setSecondsElapsed(next);

        // Generate signature fragment
        const sigFragment = `0x${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 10)}`;

        // Add entry
        setEntries((prevEntries) => {
          const entry: PaymentEntry = {
            id: next,
            second: next,
            sig: sigFragment,
            amount: rate,
            cumulative: newTotal,
          };
          return [...prevEntries, entry].slice(-8);
        });

        // Spawn orbital particle
        const isFinal = next >= TOTAL_PULSES;
        const newParticle: OrbitalParticle = {
          id: particleIdRef.current++,
          progress: 0,
          size: isFinal ? 8 : 3 + (next / TOTAL_PULSES) * 3,
          brightness: 0.4 + (next / TOTAL_PULSES) * 0.6,
          isFinal,
        };
        setParticles((p) => [...p, newParticle]);

        // Remove particle after animation
        setTimeout(() => {
          setParticles((p) => p.filter((pp) => pp.id !== newParticle.id));
        }, 1500);

        // Complete after all pulses
        if (next >= TOTAL_PULSES && !completedRef.current) {
          completedRef.current = true;
          // Trigger final arc phase
          setPhase('finalArc');

          setTimeout(() => {
            setPhase('complete');
            setShowCelebration(true);
            completeStep(10, {
              totalPaid: (TOTAL_PULSES * rate).toFixed(6),
              secondsStreamed: TOTAL_PULSES,
              facilitator: presetData.x402Config.facilitator,
            });
          }, 1200);
        }

        return next;
      });
    }, PULSE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [phase, rate, completeStep, presetData]);

  // Auto-scroll payment log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [entries]);

  // Compute streaming progress (0-1)
  const streamProgress = Math.min(pulseCount / TOTAL_PULSES, 1);

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
          className="relative w-full overflow-hidden rounded-xl border border-slate-800/40 bg-slate-950/80"
          style={{ minHeight: 320 }}
        >
          {/* Background: Earth curvature gradient */}
          <div className="absolute inset-0 pointer-events-none">
            <svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              preserveAspectRatio="xMidYMid meet"
              className="w-full h-full"
            >
              <defs>
                {/* Earth gradient */}
                <linearGradient id="earthGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="transparent" />
                  <stop offset="60%" stopColor="transparent" />
                  <stop offset="80%" stopColor="rgba(16, 185, 129, 0.03)" />
                  <stop offset="100%" stopColor="rgba(16, 185, 129, 0.08)" />
                </linearGradient>

                {/* Atmospheric glow */}
                <radialGradient id="atmosGlow" cx="50%" cy="100%" r="70%">
                  <stop offset="0%" stopColor="rgba(6, 182, 212, 0.06)" />
                  <stop offset="100%" stopColor="transparent" />
                </radialGradient>

                {/* Arc glow filter */}
                <filter id="arcGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Particle glow filter */}
                <filter id="particleGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Star glow */}
                <filter id="starGlow" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="2" />
                </filter>
              </defs>

              {/* Background fill */}
              <rect width={SVG_W} height={SVG_H} fill="url(#earthGrad)" />
              <rect width={SVG_W} height={SVG_H} fill="url(#atmosGlow)" />

              {/* Scattered stars */}
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

              {/* Earth curvature arc */}
              <motion.path
                d={EARTH_ARC}
                fill="none"
                stroke="rgba(16, 185, 129, 0.15)"
                strokeWidth={2}
                initial={{ pathLength: 0 }}
                animate={phase !== 'idle' ? { pathLength: 1 } : { pathLength: 0 }}
                transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
              />
              {/* Earth surface fill below curvature */}
              <path
                d={`${EARTH_ARC} L ${SVG_W} ${SVG_H} L 0 ${SVG_H} Z`}
                fill="rgba(16, 185, 129, 0.03)"
              />

              {/* Ground Station */}
              <g>
                {/* Base */}
                <motion.rect
                  x={GROUND_X - 20}
                  y={GROUND_Y - 5}
                  width={40}
                  height={10}
                  rx={2}
                  fill="rgba(100, 116, 139, 0.6)"
                  initial={{ opacity: 0, scaleX: 0 }}
                  animate={phase !== 'idle' ? { opacity: 1, scaleX: 1 } : { opacity: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                />
                {/* Antenna dish */}
                <motion.path
                  d={`M ${GROUND_X - 12} ${GROUND_Y - 5} Q ${GROUND_X} ${GROUND_Y - 35}, ${GROUND_X + 12} ${GROUND_Y - 5}`}
                  fill="none"
                  stroke="rgba(148, 163, 184, 0.8)"
                  strokeWidth={2}
                  initial={{ pathLength: 0 }}
                  animate={phase !== 'idle' ? { pathLength: 1 } : { pathLength: 0 }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                />
                {/* Signal rings */}
                {phase !== 'idle' && [0, 1, 2].map((ring) => (
                  <motion.circle
                    key={ring}
                    cx={GROUND_X}
                    cy={GROUND_Y - 20}
                    r={8 + ring * 8}
                    fill="none"
                    stroke="rgba(6, 182, 212, 0.3)"
                    strokeWidth={0.5}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{
                      opacity: [0, 0.4, 0],
                      scale: [0.5, 1, 1.3],
                    }}
                    transition={{
                      duration: 2,
                      delay: ring * 0.3,
                      repeat: Infinity,
                      repeatDelay: 1,
                    }}
                  />
                ))}
                {/* Label */}
                <text
                  x={GROUND_X}
                  y={GROUND_Y + 22}
                  textAnchor="middle"
                  fill="rgba(148, 163, 184, 0.6)"
                  fontSize={10}
                  fontFamily="monospace"
                >
                  GROUND STATION
                </text>
              </g>

              {/* Satellite */}
              <motion.g
                initial={{ opacity: 0, y: -20 }}
                animate={phase !== 'idle' ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
                transition={{ duration: 0.8, delay: 0.6, type: 'spring', stiffness: 120, damping: 18 }}
              >
                {/* Orbital ring around satellite */}
                <motion.ellipse
                  cx={SAT_X}
                  cy={SAT_Y}
                  rx={45}
                  ry={18}
                  fill="none"
                  stroke="rgba(59, 130, 246, 0.15)"
                  strokeWidth={0.8}
                  strokeDasharray="3 5"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                  style={{ transformOrigin: `${SAT_X}px ${SAT_Y}px` }}
                />
                {/* Solar panels */}
                <rect x={SAT_X - 30} y={SAT_Y - 5} width={18} height={10} rx={1} fill="rgba(59, 130, 246, 0.6)" />
                <rect x={SAT_X + 12} y={SAT_Y - 5} width={18} height={10} rx={1} fill="rgba(59, 130, 246, 0.6)" />
                {/* Panel grid lines */}
                <line x1={SAT_X - 24} y1={SAT_Y - 5} x2={SAT_X - 24} y2={SAT_Y + 5} stroke="rgba(96, 165, 250, 0.4)" strokeWidth={0.5} />
                <line x1={SAT_X - 18} y1={SAT_Y - 5} x2={SAT_X - 18} y2={SAT_Y + 5} stroke="rgba(96, 165, 250, 0.4)" strokeWidth={0.5} />
                <line x1={SAT_X + 18} y1={SAT_Y - 5} x2={SAT_X + 18} y2={SAT_Y + 5} stroke="rgba(96, 165, 250, 0.4)" strokeWidth={0.5} />
                <line x1={SAT_X + 24} y1={SAT_Y - 5} x2={SAT_X + 24} y2={SAT_Y + 5} stroke="rgba(96, 165, 250, 0.4)" strokeWidth={0.5} />
                {/* Body */}
                <rect x={SAT_X - 8} y={SAT_Y - 10} width={16} height={20} rx={2} fill="rgba(203, 213, 225, 0.8)" />
                {/* Antenna */}
                <line x1={SAT_X} y1={SAT_Y - 10} x2={SAT_X} y2={SAT_Y - 20} stroke="rgba(148, 163, 184, 0.7)" strokeWidth={1.2} />
                <circle cx={SAT_X} cy={SAT_Y - 21} r={2} fill="rgba(248, 113, 113, 0.8)" />
                {/* Status light */}
                <motion.circle
                  cx={SAT_X}
                  cy={SAT_Y}
                  r={3}
                  fill={phase === 'streaming' || phase === 'finalArc' ? 'rgba(16, 185, 129, 0.9)' : 'rgba(100, 116, 139, 0.5)'}
                  animate={phase === 'streaming' || phase === 'finalArc' ? {
                    filter: [
                      'drop-shadow(0 0 0px rgba(16,185,129,0))',
                      'drop-shadow(0 0 6px rgba(16,185,129,0.8))',
                      'drop-shadow(0 0 0px rgba(16,185,129,0))',
                    ],
                  } : {}}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                {/* Label */}
                <text
                  x={SAT_X}
                  y={SAT_Y + 30}
                  textAnchor="middle"
                  fill="rgba(148, 163, 184, 0.6)"
                  fontSize={10}
                  fontFamily="monospace"
                >
                  {presetData.assetMetadata.name}
                </text>
              </motion.g>

              {/* Payment arc path (persistent track) */}
              <motion.path
                d={PAYMENT_ARC_PATH}
                fill="none"
                stroke="rgba(16, 185, 129, 0.08)"
                strokeWidth={1}
                strokeDasharray="4 8"
                variants={drawPath}
                initial="hidden"
                animate={(phase === 'streaming' || phase === 'finalArc' || phase === 'complete') ? 'visible' : 'hidden'}
              />

              {/* Animated payment particles traveling along the arc */}
              {particles.map((particle) => (
                <motion.circle
                  key={particle.id}
                  r={particle.isFinal ? 6 : particle.size}
                  fill={particle.isFinal
                    ? 'rgba(16, 185, 129, 1)'
                    : `rgba(16, 185, 129, ${particle.brightness})`
                  }
                  filter={particle.isFinal ? 'url(#arcGlow)' : 'url(#particleGlow)'}
                  initial={{ offsetDistance: '0%', opacity: 0.8 }}
                  animate={{ offsetDistance: '100%', opacity: particle.isFinal ? 1 : 0.3 }}
                  transition={{ duration: particle.isFinal ? 1.2 : 1, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    offsetPath: `path("${PAYMENT_ARC_PATH}")`,
                    offsetRotate: '0deg',
                  }}
                />
              ))}

              {/* Secondary glow particles following main particles */}
              {particles.map((particle) => (
                <motion.circle
                  key={`trail-${particle.id}`}
                  r={particle.isFinal ? 12 : particle.size * 2}
                  fill={`rgba(16, 185, 129, ${particle.brightness * 0.15})`}
                  initial={{ offsetDistance: '0%', opacity: 0.3 }}
                  animate={{ offsetDistance: '95%', opacity: 0 }}
                  transition={{ duration: particle.isFinal ? 1.4 : 1.2, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    offsetPath: `path("${PAYMENT_ARC_PATH}")`,
                    offsetRotate: '0deg',
                  }}
                />
              ))}

              {/* Central streamed amount overlay */}
              <foreignObject x={SVG_W / 2 - 100} y={SVG_H / 2 - 40} width={200} height={80}>
                <div className="flex flex-col items-center justify-center h-full">
                  <motion.div
                    className="text-center"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={phase !== 'idle' ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.5, delay: 1 }}
                  >
                    <div className="text-2xl sm:text-3xl font-bold font-mono text-white leading-none">
                      {phase === 'complete' ? (
                        <CountUp
                          value={TOTAL_PULSES * rate}
                          decimals={4}
                          className="text-emerald-300"
                        />
                      ) : (
                        <span className="text-emerald-300">
                          {runningTotal.toFixed(4)}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">
                      {presetData.leaseTerms.currency} Streamed
                    </p>
                  </motion.div>
                </div>
              </foreignObject>
            </svg>
          </div>

          {/* Progress bar at bottom of scene */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-900">
            <motion.div
              className="h-full bg-gradient-to-r from-emerald-600 to-cyan-500"
              initial={{ width: '0%' }}
              animate={{ width: `${streamProgress * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* Completion celebration overlay */}
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
                  <div className="px-6 py-3 rounded-full bg-emerald-900/80 border border-emerald-500/40 backdrop-blur-sm">
                    <span className="text-sm font-bold text-emerald-300 uppercase tracking-widest">
                      Stream Complete
                    </span>
                  </div>
                  <ParticleBurst trigger={showCelebration} color="emerald" particleCount={20} />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ===== Bottom Panels ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Payment Log (2 cols) */}
          <motion.div className="lg:col-span-2" variants={fadeInLeft}>
            <GlowCard
              color="emerald"
              intensity={phase === 'streaming' || phase === 'finalArc' ? 'medium' : 'low'}
              active={phase !== 'idle'}
              className="overflow-hidden"
            >
              <div className="px-4 py-2.5 border-b border-slate-800/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                    Payment-Signature Log
                  </h4>
                  {(phase === 'streaming' || phase === 'finalArc') && (
                    <motion.div
                      className="w-2 h-2 rounded-full bg-emerald-400"
                      animate={{
                        boxShadow: [
                          '0 0 0px rgba(16, 185, 129, 0)',
                          '0 0 8px rgba(16, 185, 129, 0.8)',
                          '0 0 0px rgba(16, 185, 129, 0)',
                        ],
                      }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                  )}
                </div>
                <span className="text-[10px] font-mono text-slate-600">
                  {pulseCount}/{TOTAL_PULSES} payments
                </span>
              </div>

              <div ref={logRef} className="max-h-48 overflow-y-auto">
                {entries.length === 0 && (
                  <div className="px-4 py-3 text-xs text-slate-600 font-mono">
                    {phase === 'connecting'
                      ? '> Establishing X402 payment channel...'
                      : '> Awaiting stream initialization...'}
                  </div>
                )}

                <AnimatePresence mode="popLayout">
                  {entries.map((entry, idx) => (
                    <motion.div
                      key={entry.id}
                      layout
                      initial={{ opacity: 0, x: -20, height: 0 }}
                      animate={{ opacity: 1, x: 0, height: 'auto' }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className={cn(
                        'px-4 py-2 border-b border-slate-800/20 font-mono text-[11px]',
                        idx === entries.length - 1 && 'bg-emerald-900/10',
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-slate-700 shrink-0">t={entry.second}s</span>
                          <span className="text-blue-400 shrink-0">Payment-Signature:</span>
                          <span className="text-slate-600 truncate">{entry.sig}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-emerald-400 font-bold">
                            +{entry.amount.toFixed(6)}
                          </span>
                          <motion.div
                            className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                            initial={{ scale: 2, opacity: 1 }}
                            animate={{ scale: 1, opacity: 0.5 }}
                            transition={{ duration: 0.5 }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-slate-800">cumulative:</span>
                        <span className="text-cyan-400/80">{entry.cumulative.toFixed(6)} USDC</span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </GlowCard>
          </motion.div>

          {/* Stream Status Panel (1 col) */}
          <motion.div variants={fadeInRight} className="space-y-4">
            {/* Status */}
            <GlowCard
              color={phase === 'complete' ? 'cyan' : phase === 'streaming' || phase === 'finalArc' ? 'emerald' : 'blue'}
              intensity={phase === 'streaming' || phase === 'finalArc' ? 'high' : 'low'}
              active={phase !== 'idle'}
            >
              <div className="p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  Stream Status
                </h4>

                <div className="space-y-3">
                  {/* Status indicator */}
                  <div>
                    <span className="text-[10px] text-slate-600 uppercase tracking-wider block mb-0.5">
                      Status
                    </span>
                    <div className="flex items-center gap-2">
                      <motion.div
                        className={cn(
                          'w-2.5 h-2.5 rounded-full',
                          phase === 'streaming' || phase === 'finalArc' ? 'bg-emerald-400' :
                          phase === 'complete' ? 'bg-cyan-400' :
                          phase === 'connecting' ? 'bg-amber-400' : 'bg-slate-600'
                        )}
                        animate={(phase === 'streaming' || phase === 'finalArc') ? {
                          boxShadow: [
                            '0 0 0px rgba(16, 185, 129, 0)',
                            '0 0 10px rgba(16, 185, 129, 0.8)',
                            '0 0 0px rgba(16, 185, 129, 0)',
                          ],
                        } : {}}
                        transition={{ duration: 1, repeat: Infinity }}
                      />
                      <span className={cn(
                        'text-xs font-bold uppercase tracking-wider',
                        phase === 'streaming' || phase === 'finalArc' ? 'text-emerald-400' :
                        phase === 'complete' ? 'text-cyan-400' :
                        phase === 'connecting' ? 'text-amber-400' : 'text-slate-500'
                      )}>
                        {phase === 'streaming' || phase === 'finalArc' ? 'STREAMING' :
                         phase === 'complete' ? 'COMPLETE' :
                         phase === 'connecting' ? 'CONNECTING' : 'IDLE'}
                      </span>
                    </div>
                  </div>

                  {/* Elapsed */}
                  <div>
                    <span className="text-[10px] text-slate-600 uppercase tracking-wider block mb-0.5">
                      Elapsed Time
                    </span>
                    <span className="text-sm font-mono text-amber-400 font-bold">
                      {secondsElapsed}s
                    </span>
                  </div>

                  {/* Rate */}
                  <div>
                    <span className="text-[10px] text-slate-600 uppercase tracking-wider block mb-0.5">
                      Rate
                    </span>
                    <span className="text-sm font-mono text-cyan-400">
                      {presetData.leaseTerms.ratePerSecond} USDC/sec
                    </span>
                  </div>

                  {/* Total */}
                  <div>
                    <span className="text-[10px] text-slate-600 uppercase tracking-wider block mb-0.5">
                      Total Streamed
                    </span>
                    <div className="text-lg font-mono text-white font-bold">
                      {phase === 'complete' ? (
                        <CountUp
                          value={TOTAL_PULSES * rate}
                          decimals={6}
                          suffix=" USDC"
                          className="text-emerald-300"
                        />
                      ) : (
                        <span>{runningTotal.toFixed(6)} USDC</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </GlowCard>

            {/* Participants */}
            <GlowCard
              color="purple"
              intensity="low"
              active={phase !== 'idle'}
            >
              <div className="p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  Participants
                </h4>
                <div className="space-y-2.5">
                  {[
                    { role: 'Payer (Lessee)', address: LESSEE, color: 'text-blue-400', dotColor: 'bg-blue-400' },
                    { role: 'Receiver (Lessor)', address: LESSOR, color: 'text-emerald-400', dotColor: 'bg-emerald-400' },
                    { role: 'Facilitator', address: presetData.x402Config.facilitator, color: 'text-purple-400', dotColor: 'bg-purple-400' },
                  ].map((p, idx) => (
                    <motion.div
                      key={p.role}
                      className="flex items-center gap-2"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + idx * 0.15 }}
                    >
                      <div className={cn('w-1.5 h-1.5 rounded-full', p.dotColor)} />
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] text-slate-600 uppercase tracking-wider block">
                          {p.role}
                        </span>
                        <code className={cn('text-[10px] font-mono truncate block', p.color)}>
                          {truncateAddress(p.address)}
                        </code>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </GlowCard>

            {/* Facilitator Verification */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={phase !== 'idle' ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
              transition={{ delay: 0.5 }}
            >
              <GlowCard
                color={phase === 'streaming' || phase === 'finalArc' || phase === 'complete' ? 'emerald' : 'blue'}
                intensity={(phase === 'streaming' || phase === 'finalArc') ? 'medium' : 'low'}
                active={phase !== 'idle'}
              >
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {(phase === 'streaming' || phase === 'finalArc') ? (
                      <motion.div
                        className="w-2 h-2 rounded-full bg-emerald-400"
                        animate={{
                          boxShadow: [
                            '0 0 0px rgba(16, 185, 129, 0)',
                            '0 0 8px rgba(16, 185, 129, 0.8)',
                            '0 0 0px rgba(16, 185, 129, 0)',
                          ],
                        }}
                        transition={{ duration: 1, repeat: Infinity }}
                      />
                    ) : phase === 'complete' ? (
                      <motion.svg
                        className="w-4 h-4 text-emerald-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                      >
                        <motion.path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.4, delay: 0.2 }}
                        />
                      </motion.svg>
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-slate-700" />
                    )}
                    <span className="text-xs font-bold text-white">Facilitator Verification</span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    Each payment signature is verified by the Coinbase facilitator before forwarding to the resource server.
                  </p>
                  {phase !== 'idle' && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-600">Network:</span>
                      <span className="text-[10px] font-mono text-cyan-400">
                        {presetData.x402Config.network}
                      </span>
                    </div>
                  )}
                </div>
              </GlowCard>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </StepContainer>
  );
}
