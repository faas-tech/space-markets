'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StepContainer } from '../step-container';
import { useDemoContext } from '../demo-provider';
import {
  LESSOR,
  CONTRACTS,
  USDC_ADDRESS,
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
  staggerContainer,
  fadeInUp,
  fadeInLeft,
  fadeInRight,
  scaleInBounce,
  drawPath,
  heroEntrance,
  gentleSpring,
} from '@/lib/demo/motion-variants';
import { cn } from '@/lib/utils';

type Phase = 'idle' | 'drawing' | 'typing' | 'submitting' | 'listed';

export function Step05LeaseOffer() {
  const { state, completeStep, presetData } = useDemoContext();
  const isActive = state.currentStep === 5;
  const [phase, setPhase] = useState<Phase>('idle');

  const terms = presetData.leaseTerms;

  useEffect(() => {
    if (!isActive) {
      setPhase('idle');
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setPhase('drawing'), 200));
    timers.push(setTimeout(() => setPhase('typing'), 1400));
    timers.push(setTimeout(() => setPhase('submitting'), 3200));
    timers.push(setTimeout(() => {
      setPhase('listed');
      completeStep(5, {
        leaseId: terms.leaseId,
        assetId: terms.assetId,
        ratePerDay: terms.ratePerDay,
        duration: terms.duration,
        totalCost: terms.totalCost,
      });
    }, 4400));

    return () => timers.forEach(clearTimeout);
  }, [isActive, completeStep, terms]);

  const offerFields = useMemo(() => [
    { label: 'Asset ID', value: `#${terms.assetId}`, color: 'text-slate-300' },
    { label: 'Lessor', value: truncateAddress(LESSOR), color: 'text-emerald-400' },
    { label: 'Duration', value: terms.duration, color: 'text-slate-300' },
    { label: 'Escrow Required', value: `${terms.escrowAmount} USDC`, color: 'text-amber-400' },
    { label: 'Payment Token', value: truncateAddress(USDC_ADDRESS), color: 'text-cyan-400' },
    { label: 'Marketplace', value: truncateAddress(CONTRACTS.marketplace.address), color: 'text-emerald-400' },
  ], [terms]);

  const statusConfig = {
    idle: { label: 'DRAFT', bg: 'bg-slate-700/50', text: 'text-slate-500', border: 'border-slate-600/40' },
    drawing: { label: 'DRAFT', bg: 'bg-slate-700/50', text: 'text-slate-500', border: 'border-slate-600/40' },
    typing: { label: 'DRAFT', bg: 'bg-slate-700/50', text: 'text-slate-400', border: 'border-slate-600/40' },
    submitting: { label: 'SUBMITTING', bg: 'bg-amber-900/30', text: 'text-amber-300', border: 'border-amber-500/40' },
    listed: { label: 'LISTED', bg: 'bg-blue-900/30', text: 'text-blue-300', border: 'border-blue-500/40' },
  };

  const currentStatus = statusConfig[phase];

  return (
    <StepContainer stepNumber={5}>
      <motion.div
        variants={heroEntrance}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* Main Offer Card with SVG border draw-in */}
        <motion.div variants={fadeInUp} className="lg:col-span-2 relative">
          <div className="relative">
            {/* SVG Border Draw-in */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none z-10"
              viewBox="0 0 600 400"
              preserveAspectRatio="none"
              fill="none"
            >
              <motion.rect
                x="1"
                y="1"
                width="598"
                height="398"
                rx="12"
                stroke={
                  phase === 'listed'
                    ? 'rgba(59, 130, 246, 0.6)'
                    : phase === 'submitting'
                      ? 'rgba(245, 158, 11, 0.5)'
                      : 'rgba(148, 163, 184, 0.2)'
                }
                strokeWidth="2"
                variants={drawPath}
                initial="hidden"
                animate={phase !== 'idle' ? 'visible' : 'hidden'}
                style={{ transition: 'stroke 0.5s ease' }}
              />
            </svg>

            {/* Card content */}
            <div
              className={cn(
                'bg-slate-900/70 backdrop-blur-md rounded-xl overflow-hidden relative transition-shadow duration-700',
                phase === 'listed' && 'shadow-[0_0_50px_-15px_rgba(59,130,246,0.3)]',
                phase === 'submitting' && 'shadow-[0_0_30px_-10px_rgba(245,158,11,0.2)]'
              )}
            >
              {/* Marketplace header bar */}
              <div className="px-5 py-4 border-b border-slate-800/60 bg-gradient-to-r from-slate-900/90 to-slate-800/40">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.3 }}
                      >
                        <svg className="w-5 h-5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
                        </svg>
                      </motion.div>
                      <h3 className="text-lg font-bold text-white tracking-tight">Marketplace Listing</h3>
                      <motion.span
                        className={cn(
                          'text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border transition-all duration-500',
                          currentStatus.bg, currentStatus.text, currentStatus.border
                        )}
                        animate={phase === 'submitting' ? {
                          boxShadow: [
                            '0 0 0px rgba(245, 158, 11, 0)',
                            '0 0 15px rgba(245, 158, 11, 0.3)',
                            '0 0 0px rgba(245, 158, 11, 0)',
                          ],
                        } : {}}
                        transition={{ duration: 1.5, repeat: phase === 'submitting' ? Infinity : 0 }}
                      >
                        {currentStatus.label}
                      </motion.span>
                    </div>
                    <p className="text-sm text-slate-500 font-mono">
                      {presetData.assetMetadata.name} -- {presetData.assetType.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <AnimatePresence mode="wait">
                      {phase !== 'idle' && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                        >
                          <div className="text-2xl font-bold text-white font-mono">
                            <CountUp
                              value={parseFloat(terms.totalCost.replace(/,/g, ''))}
                              decimals={2}
                              delay={0.5}
                              className="text-2xl font-bold text-white font-mono"
                            />
                          </div>
                          <p className="text-xs text-slate-500 uppercase tracking-wider">USDC Total</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Pricing rates with animated counters */}
              <AnimatePresence>
                {phase !== 'idle' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="border-b border-slate-800/40"
                  >
                    <div className="grid grid-cols-3 divide-x divide-slate-800/30">
                      {[
                        { label: 'Rate / Second', value: parseFloat(terms.ratePerSecond), decimals: 6, suffix: '' },
                        { label: 'Rate / Hour', value: parseFloat(terms.ratePerHour), decimals: 2, suffix: '' },
                        { label: 'Rate / Day', value: parseFloat(terms.ratePerDay), decimals: 2, suffix: '' },
                      ].map((rate, idx) => (
                        <motion.div
                          key={rate.label}
                          className="px-4 py-3 bg-slate-900/40"
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.6 + idx * 0.15, duration: 0.4 }}
                        >
                          <span className="text-xs text-slate-600 uppercase tracking-wider block mb-1">
                            {rate.label}
                          </span>
                          <CountUp
                            value={rate.value}
                            decimals={rate.decimals}
                            suffix=" USDC"
                            delay={0.8 + idx * 0.2}
                            className="text-sm font-mono text-cyan-400 font-semibold"
                          />
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Offer fields - typed in one by one */}
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate={phase !== 'idle' ? 'visible' : 'hidden'}
                className="px-5 py-4 space-y-2"
              >
                {offerFields.map((field, idx) => (
                  <motion.div
                    key={field.label}
                    variants={fadeInLeft}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="text-xs text-slate-600 uppercase tracking-wider shrink-0">
                      {field.label}
                    </span>
                    <div className="h-px flex-1 bg-slate-800/40" />
                    {phase === 'typing' || phase === 'submitting' || phase === 'listed' ? (
                      <TypedText
                        text={field.value}
                        speed={20}
                        delay={200 + idx * 250}
                        className={cn('text-sm font-mono', field.color)}
                        cursor={false}
                      />
                    ) : (
                      <span className={cn('text-sm font-mono opacity-30', field.color)}>---</span>
                    )}
                  </motion.div>
                ))}
              </motion.div>

              {/* Footer with lessor/marketplace addresses */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: phase !== 'idle' ? 1 : 0 }}
                transition={{ delay: 1, duration: 0.5 }}
                className="px-5 py-3 border-t border-slate-800/60 bg-slate-900/30"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-xs text-slate-600 block">Lease ID</span>
                      <code className="text-sm font-mono text-amber-400">#{terms.leaseId}</code>
                    </div>
                    <div>
                      <span className="text-xs text-slate-600 block">Start Block</span>
                      <code className="text-sm font-mono text-amber-400">#{terms.startBlock.toLocaleString()}</code>
                    </div>
                    <div>
                      <span className="text-xs text-slate-600 block">End Block</span>
                      <code className="text-sm font-mono text-amber-400">#{terms.endBlock.toLocaleString()}</code>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-slate-600 block text-right">Currency</span>
                    <span className="text-sm text-slate-400">{terms.currency} (Base Sepolia)</span>
                  </div>
                </div>
              </motion.div>

              {/* Listed burst overlay */}
              <div className="relative">
                <ParticleBurst trigger={phase === 'listed'} color="amber" particleCount={16} />
              </div>
            </div>

            {/* Submitting spinner */}
            <AnimatePresence>
              {phase === 'submitting' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={gentleSpring}
                  className="mt-4 flex items-center gap-3"
                >
                  <motion.div
                    className="w-5 h-5 rounded-full border-2 border-amber-500/40 border-t-amber-400"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  />
                  <span className="text-sm text-amber-300/80 font-mono">
                    Submitting offer to Marketplace contract...
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Listed confirmation */}
            <AnimatePresence>
              {phase === 'listed' && (
                <motion.div
                  variants={scaleInBounce}
                  initial="hidden"
                  animate="visible"
                  className="mt-4"
                >
                  <GlowCard color="blue" intensity="high" active>
                    <div className="px-4 py-3 flex items-center gap-3">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 15, delay: 0.1 }}
                      >
                        <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </motion.div>
                      <div>
                        <p className="text-sm font-bold text-blue-300">Listed on Marketplace</p>
                        <p className="text-xs text-slate-500 font-mono">
                          TX: {truncateHash(TX_HASHES.leaseOffer)}
                        </p>
                      </div>
                    </div>
                  </GlowCard>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Side Panel */}
        <motion.div variants={fadeInRight} className="space-y-4">
          <GlowCard
            color="amber"
            intensity="low"
            active={phase !== 'idle'}
            delay={0.3}
          >
            <div className="p-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">
                Offer Configuration
              </h4>
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate={phase !== 'idle' ? 'visible' : 'hidden'}
                className="space-y-3"
              >
                {[
                  { label: 'Lease ID', value: `#${terms.leaseId}`, color: 'text-amber-400' },
                  { label: 'Asset ID', value: `#${terms.assetId}`, color: 'text-slate-300' },
                  { label: 'Lessor', value: terms.lessorName, color: 'text-emerald-400' },
                  { label: 'Duration', value: terms.duration, color: 'text-slate-300' },
                  { label: 'Escrow', value: `${terms.escrowAmount} USDC`, color: 'text-amber-400' },
                ].map((item) => (
                  <motion.div key={item.label} variants={fadeInUp}>
                    <span className="text-xs text-slate-600 uppercase tracking-wider block mb-0.5">
                      {item.label}
                    </span>
                    <span className={cn('text-sm font-mono', item.color)}>{item.value}</span>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </GlowCard>

          {/* Block confirmation */}
          <AnimatePresence>
            {phase === 'listed' && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.2 }}
              >
                <GlowCard color="emerald" intensity="low" active delay={0.4}>
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <motion.div
                        className="w-2 h-2 rounded-full bg-emerald-400"
                        animate={{
                          boxShadow: [
                            '0 0 0px rgba(16,185,129,0)',
                            '0 0 8px rgba(16,185,129,0.6)',
                            '0 0 0px rgba(16,185,129,0)',
                          ],
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                        Confirmed
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      <div>
                        <span className="text-xs text-slate-600 block">Block</span>
                        <code className="text-sm font-mono text-amber-400">
                          #{BLOCK_NUMBERS.offerBlock.toLocaleString()}
                        </code>
                      </div>
                      <div>
                        <span className="text-xs text-slate-600 block">Transaction</span>
                        <code className="text-xs font-mono text-slate-400">
                          {truncateHash(TX_HASHES.leaseOffer)}
                        </code>
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
