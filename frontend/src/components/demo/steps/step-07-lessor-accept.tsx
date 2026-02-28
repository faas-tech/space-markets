'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StepContainer } from '../step-container';
import { useDemoContext } from '../demo-provider';
import {
  LESSOR,
  LESSEE,
  HASHES,
  TX_HASHES,
  BLOCK_NUMBERS,
  truncateAddress,
  truncateHash,
} from '@/lib/demo/demo-data';
import { GlowCard } from '../animations/glow-card';
import { CountUp } from '../animations/count-up';
import { ParticleBurst } from '../animations/particle-burst';
import { TypedText } from '../animations/typed-text';
import {
  fadeInUp,
  fadeInLeft,
  fadeInRight,
  scaleInBounce,
  heroEntrance,
  gentleSpring,
  staggerContainer,
} from '@/lib/demo/motion-variants';
import { cn } from '@/lib/utils';
import { t } from '@/lib/demo/step-config';

type Phase = 'idle' | 'entering' | 'comparing' | 'selecting' | 'signing' | 'accepted';

interface BidEntry {
  bidder: string;
  bidderName: string;
  ratePerDay: string;
  escrow: string;
  direction: { x: number; y: number };
}

export function Step07LessorAccept() {
  const { state, completeStep, presetData } = useDemoContext();
  const isActive = state.currentStep === 7;
  const [phase, setPhase] = useState<Phase>('idle');

  const terms = presetData.leaseTerms;

  const bids = useMemo<BidEntry[]>(() => [
    {
      bidder: LESSEE,
      bidderName: terms.lesseeName,
      ratePerDay: terms.ratePerDay,
      escrow: terms.escrowAmount,
      direction: { x: -80, y: -30 },
    },
    {
      bidder: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
      bidderName: 'Competitor Alpha',
      ratePerDay: (parseFloat(terms.ratePerDay) * 0.9).toFixed(2),
      escrow: (parseFloat(terms.escrowAmount.replace(/,/g, '')) * 0.9).toFixed(2),
      direction: { x: 80, y: -30 },
    },
    {
      bidder: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
      bidderName: 'Competitor Beta',
      ratePerDay: (parseFloat(terms.ratePerDay) * 1.05).toFixed(2),
      escrow: (parseFloat(terms.escrowAmount.replace(/,/g, '')) * 1.05).toFixed(2),
      direction: { x: 0, y: 60 },
    },
  ], [terms]);

  useEffect(() => {
    if (!isActive) {
      setPhase('idle');
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setPhase('entering'), t(200)));
    timers.push(setTimeout(() => setPhase('comparing'), t(1500)));
    timers.push(setTimeout(() => setPhase('selecting'), t(2800)));
    timers.push(setTimeout(() => setPhase('signing'), t(3800)));
    timers.push(setTimeout(() => {
      setPhase('accepted');
      completeStep(7, {
        selectedBidder: LESSEE,
        acceptSignature: HASHES.acceptSignatureHash,
        matchedRate: terms.ratePerDay,
      });
    }, t(5200)));

    return () => timers.forEach(clearTimeout);
  }, [isActive, completeStep, terms]);

  const phaseIdx = ['idle', 'entering', 'comparing', 'selecting', 'signing', 'accepted'].indexOf(phase);
  const isPostSelect = phaseIdx >= 3;
  const isPostSign = phaseIdx >= 4;

  return (
    <StepContainer stepNumber={7}>
      <motion.div
        variants={heroEntrance}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        {/* LEFT: Bid Comparison Arena */}
        <motion.div variants={fadeInLeft} className="space-y-4">
          {/* Arena header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <motion.div
                key={`indicator-${phase === 'accepted' ? 'static' : 'anim'}`}
                className={cn(
                  'w-2 h-2 rounded-full transition-colors duration-300',
                  phase === 'comparing' ? 'bg-amber-400' :
                    isPostSelect ? 'bg-emerald-400' : 'bg-slate-600'
                )}
                animate={phase === 'comparing' ? {
                  boxShadow: [
                    '0 0 0px rgba(245,158,11,0)',
                    '0 0 8px rgba(245,158,11,0.6)',
                    '0 0 0px rgba(245,158,11,0)',
                  ],
                } : { boxShadow: '0 0 0px rgba(245,158,11,0)' }}
                transition={{ duration: 1.5, repeat: phase === 'comparing' ? Infinity : 0 }}
              />
              <span className="text-sm font-bold uppercase tracking-widest text-slate-300">
                {isPostSelect ? 'Selection Complete' : phase === 'comparing' ? 'Comparing Bids...' : 'Active Bids'}
              </span>
            </div>
            <span className="text-sm text-slate-300 font-mono">
              {bids.length} received
            </span>
          </div>

          {/* Bid cards entering from different directions */}
          <div className="space-y-3">
            {bids.map((bid, idx) => {
              const isWinner = idx === 0;

              return (
                <motion.div
                  key={bid.bidder}
                  initial={{
                    opacity: 0,
                    x: bid.direction.x,
                    y: bid.direction.y,
                    scale: 0.85,
                  }}
                  animate={{
                    opacity: isPostSelect && !isWinner ? 0.3 : phase !== 'idle' ? 1 : 0,
                    x: 0,
                    y: 0,
                    scale: isPostSelect && isWinner ? 1.02 : isPostSelect && !isWinner ? 0.97 : 1,
                    filter: isPostSelect && !isWinner ? 'saturate(0.2)' : 'saturate(1)',
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 200,
                    damping: 20,
                    delay: phase === 'entering' ? idx * 0.2 : 0,
                  }}
                >
                  <div
                    className={cn(
                      'bg-slate-900/70 backdrop-blur border rounded-xl overflow-hidden transition-all duration-500 relative',
                      isWinner && isPostSelect
                        ? 'border-blue-500/40 shadow-[0_0_30px_-10px_rgba(59,130,246,0.3)]'
                        : 'border-slate-800/60',
                    )}
                  >
                    {/* Spotlight effect on winner */}
                    {isWinner && isPostSelect && (
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-blue-500/5 pointer-events-none"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5 }}
                      />
                    )}

                    <div className="px-4 py-3 flex items-center justify-between gap-4 relative z-10">
                      <div className="flex items-center gap-3 min-w-0">
                        <motion.div
                          key={`number-${phase === 'comparing' ? 'anim' : 'static'}`}
                          className={cn(
                            'w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 transition-colors duration-500',
                            isWinner && isPostSelect
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-800 text-slate-300'
                          )}
                          animate={phase === 'comparing' ? {
                            y: [0, -3, 0],
                          } : { y: 0 }}
                          transition={{
                            duration: 2,
                            repeat: phase === 'comparing' ? Infinity : 0,
                            delay: idx * 0.3,
                            ease: 'easeInOut',
                          }}
                        >
                          #{idx + 1}
                        </motion.div>
                        <div className="min-w-0">
                          <p className="text-base font-bold text-white truncate">{bid.bidderName}</p>
                          <code className="text-sm font-mono text-emerald-400/70 block truncate">
                            {truncateAddress(bid.bidder)}
                          </code>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-base font-mono font-bold text-white block">
                          {bid.ratePerDay}
                        </span>
                        <span className="text-sm text-slate-300">USDC/day</span>
                        <span className="text-xs text-slate-700 block">
                          Escrow: {bid.escrow}
                        </span>
                      </div>
                    </div>

                    {/* Winner badge with spring bounce */}
                    <AnimatePresence>
                      {isWinner && phase === 'accepted' && (
                        <motion.div
                          className="px-4 py-2 border-t border-blue-500/20 bg-blue-900/10 flex items-center gap-2"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                        >
                          <motion.div
                            initial={{ scale: 0, rotate: -45 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 12, delay: 0.15 }}
                            className="relative"
                          >
                            <ParticleBurst trigger={phase === 'accepted'} color="amber" particleCount={10} />
                            <div className="bg-amber-500/20 border border-amber-500/40 rounded-md px-2 py-0.5">
                              <span className="text-sm font-extrabold uppercase tracking-[0.15em] text-amber-300">
                                WINNER
                              </span>
                            </div>
                          </motion.div>
                          <motion.svg
                            className="w-4 h-4 text-emerald-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2.5}
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 1 }}
                            transition={{ delay: 0.3, duration: 0.3 }}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </motion.svg>
                          <span className="text-sm text-emerald-400 font-bold">Bid Accepted</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Lessor reviewing line */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: phase !== 'idle' ? 1 : 0 }}
            transition={{ delay: 0.6 }}
            className="flex items-center gap-2 text-base text-slate-300"
          >
            <svg className="w-3.5 h-3.5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
            <span>Lessor reviewing ({terms.lessorName}):</span>
            <code className="font-mono text-emerald-400">{truncateAddress(LESSOR)}</code>
          </motion.div>
        </motion.div>

        {/* RIGHT: Counter-Signature Forge */}
        <motion.div variants={fadeInRight} className="space-y-4">
          {/* Counter-signature forge (compact) */}
          <GlowCard
            color={isPostSign ? 'emerald' : 'indigo'}
            intensity={isPostSign ? 'high' : phase === 'signing' ? 'medium' : 'low'}
            active={isPostSelect}
            delay={0.2}
          >
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold uppercase tracking-widest text-slate-300">
                  Counter-Signature Forge
                </h4>
                {phase === 'signing' && (
                  <motion.div
                    className="w-4 h-4 rounded-full border-2 border-indigo-400/40 border-t-indigo-400"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  />
                )}
              </div>

              {/* Mini forge visualization */}
              <div className="relative mb-4">
                <svg className="w-full h-16" viewBox="0 0 300 60" fill="none">
                  {/* Input fields flowing in */}
                  {[
                    { label: 'leaseId', x: 0, delay: 0 },
                    { label: 'bidder', x: 0, delay: 0.1 },
                    { label: 'bidHash', x: 0, delay: 0.2 },
                    { label: 'lessor', x: 0, delay: 0.3 },
                  ].map((field, idx) => (
                    <motion.g key={field.label}>
                      <motion.text
                        x="10"
                        y={12 + idx * 14}
                        fill="rgba(148, 163, 184, 0.5)"
                        fontSize="10"
                        fontFamily="monospace"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{
                          opacity: isPostSelect ? 0.7 : 0,
                          x: isPostSelect ? 0 : -20,
                        }}
                        transition={{ delay: field.delay + 0.3, duration: 0.4 }}
                      >
                        {field.label}
                      </motion.text>
                      <motion.line
                        x1="65"
                        y1={9 + idx * 14}
                        x2="140"
                        y2="30"
                        stroke={isPostSign ? 'rgba(16, 185, 129, 0.3)' : 'rgba(99, 102, 241, 0.2)'}
                        strokeWidth="0.5"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: isPostSelect ? 1 : 0 }}
                        transition={{ delay: field.delay + 0.5, duration: 0.6 }}
                      />
                    </motion.g>
                  ))}

                  {/* Central hash node */}
                  <motion.circle
                    key={`hash-${phase === 'signing' ? 'anim' : 'static'}`}
                    cx="150"
                    cy="30"
                    r="12"
                    fill={isPostSign ? 'rgba(16, 185, 129, 0.1)' : 'rgba(99, 102, 241, 0.1)'}
                    stroke={isPostSign ? 'rgba(16, 185, 129, 0.5)' : 'rgba(99, 102, 241, 0.4)'}
                    strokeWidth="1.5"
                    animate={phase === 'signing' ? {
                      r: [12, 14, 12],
                    } : { r: 12 }}
                    transition={{ duration: 1, repeat: phase === 'signing' ? Infinity : 0 }}
                  />
                  <motion.text
                    x="150"
                    y="33"
                    fill={isPostSign ? 'rgba(16, 185, 129, 0.8)' : 'rgba(99, 102, 241, 0.6)'}
                    fontSize="6"
                    fontFamily="monospace"
                    textAnchor="middle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isPostSelect ? 1 : 0 }}
                    transition={{ delay: 0.8 }}
                  >
                    hash
                  </motion.text>

                  {/* Output arrow */}
                  <motion.path
                    d="M165 30h100m0 0l-6-5m6 5l-6 5"
                    stroke={isPostSign ? 'rgba(16, 185, 129, 0.5)' : 'rgba(148, 163, 184, 0.2)'}
                    strokeWidth="1.5"
                    fill="none"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: isPostSign ? 1 : 0 }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                  />
                </svg>
              </div>

              {/* Accept signature output */}
              <div className={cn(
                'px-3 py-2 rounded-lg border transition-all duration-500',
                isPostSign
                  ? 'bg-emerald-900/20 border-emerald-500/30'
                  : phase === 'signing'
                    ? 'bg-indigo-900/20 border-indigo-500/30'
                    : 'bg-slate-900/40 border-slate-800/60'
              )}>
                <span className="text-sm uppercase tracking-wider text-slate-300 font-bold block mb-1">
                  Accept Digest
                </span>
                <div className="flex items-center gap-2">
                  {isPostSign ? (
                    <TypedText
                      text={truncateHash(HASHES.acceptSignatureHash, 10)}
                      speed={20}
                      delay={0}
                      className="text-base font-mono text-emerald-400"
                      cursor={false}
                    />
                  ) : (
                    <code className="text-base font-mono text-slate-300">0x...</code>
                  )}
                  {isPostSign && (
                    <motion.svg
                      className="w-4 h-4 text-emerald-400 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </motion.svg>
                  )}
                </div>
              </div>
            </div>
          </GlowCard>

          {/* Dual signature combination */}
          <AnimatePresence>
            {isPostSign && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={gentleSpring}
              >
                <GlowCard color="cyan" intensity="medium" active delay={0}>
                  <div className="p-4">
                    <h4 className="text-sm font-bold uppercase tracking-widest text-slate-300 mb-3">
                      Signature Pair Matched
                    </h4>
                    <div className="space-y-2">
                      {/* Bid signature */}
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs text-slate-300 block">Bid Signature (Lessee)</span>
                          <code className="text-sm font-mono text-blue-400 truncate block">
                            {truncateHash(HASHES.bidSignatureHash)}
                          </code>
                        </div>
                      </div>
                      {/* Connecting line */}
                      <div className="flex items-center gap-2 pl-[3px]">
                        <motion.div
                          className="w-px h-4 bg-gradient-to-b from-blue-500/40 to-emerald-500/40"
                          initial={{ scaleY: 0 }}
                          animate={{ scaleY: 1 }}
                          transition={{ duration: 0.3, delay: 0.2 }}
                        />
                      </div>
                      {/* Accept signature */}
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs text-slate-300 block">Accept Signature (Lessor)</span>
                          <code className="text-sm font-mono text-emerald-400 truncate block">
                            {truncateHash(HASHES.acceptSignatureHash)}
                          </code>
                        </div>
                      </div>
                    </div>
                  </div>
                </GlowCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Final acceptance confirmation */}
          <AnimatePresence>
            {phase === 'accepted' && (
              <motion.div
                variants={scaleInBounce}
                initial="hidden"
                animate="visible"
              >
                <GlowCard color="emerald" intensity="high" active>
                  <div className="p-4 relative overflow-hidden">
                    <ParticleBurst trigger={phase === 'accepted'} color="emerald" particleCount={16} />
                    <div className="flex items-center gap-3 relative z-10">
                      <motion.svg
                        className="w-6 h-6 text-emerald-400 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 12 }}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </motion.svg>
                      <div>
                        <p className="text-base font-bold text-emerald-300">Bid Accepted</p>
                        <p className="text-sm text-slate-300 font-mono">
                          Block #{BLOCK_NUMBERS.acceptBlock.toLocaleString()} | TX: {truncateHash(TX_HASHES.lessorAccept)}
                        </p>
                        <p className="text-sm text-slate-300">
                          Both signatures collected, proceeding to NFT mint
                        </p>
                      </div>
                    </div>
                  </div>
                </GlowCard>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </StepContainer>
  );
}
