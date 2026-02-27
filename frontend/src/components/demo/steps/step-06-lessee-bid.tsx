'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StepContainer } from '../step-container';
import { useDemoContext } from '../demo-provider';
import {
  LESSEE,
  HASHES,
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
  heroEntrance,
  gentleSpring,
} from '@/lib/demo/motion-variants';
import { cn } from '@/lib/utils';

type Phase = 'idle' | 'materializing' | 'hashing' | 'signing' | 'escrow' | 'submitted';

export function Step06LesseeBid() {
  const { state, completeStep, presetData } = useDemoContext();
  const isActive = state.currentStep === 6;
  const [phase, setPhase] = useState<Phase>('idle');

  const terms = presetData.leaseTerms;

  useEffect(() => {
    if (!isActive) {
      setPhase('idle');
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setPhase('materializing'), 200));
    timers.push(setTimeout(() => setPhase('hashing'), 1800));
    timers.push(setTimeout(() => setPhase('signing'), 3400));
    timers.push(setTimeout(() => setPhase('escrow'), 4600));
    timers.push(setTimeout(() => {
      setPhase('submitted');
      completeStep(6, {
        bidder: LESSEE,
        bidSignature: HASHES.bidSignatureHash,
        escrowDeposited: terms.escrowAmount,
      });
    }, 5600));

    return () => timers.forEach(clearTimeout);
  }, [isActive, completeStep, terms]);

  const domainFields = useMemo(() => [
    { key: 'name', value: 'SpaceMarkets' },
    { key: 'version', value: '1' },
    { key: 'chainId', value: '84532' },
    { key: 'verifyingContract', value: truncateAddress(CONTRACTS.marketplace.address) },
  ], []);

  const messageFields = useMemo(() => [
    { name: 'leaseId', value: `${terms.leaseId}`, type: 'uint256' },
    { name: 'assetId', value: `${terms.assetId}`, type: 'uint256' },
    { name: 'bidder', value: truncateAddress(LESSEE), type: 'address' },
    { name: 'ratePerSecond', value: `${terms.ratePerSecond}`, type: 'uint256' },
    { name: 'duration', value: terms.duration, type: 'uint256' },
    { name: 'escrowAmount', value: `${terms.escrowAmount}`, type: 'uint256' },
    { name: 'paymentToken', value: truncateAddress(USDC_ADDRESS), type: 'address' },
  ], [terms]);

  const phaseIdx = ['idle', 'materializing', 'hashing', 'signing', 'escrow', 'submitted'].indexOf(phase);
  const isPostHash = phaseIdx >= 2;
  const isPostSign = phaseIdx >= 3;
  const isPostEscrow = phaseIdx >= 4;

  return (
    <StepContainer stepNumber={6}>
      <motion.div
        variants={heroEntrance}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 lg:grid-cols-12 gap-6"
      >
        {/* LEFT: EIP-712 Data Fields */}
        <motion.div variants={fadeInLeft} className="lg:col-span-4 space-y-4">
          <GlowCard
            color="blue"
            intensity={isPostHash ? 'medium' : 'low'}
            active={phase !== 'idle'}
            delay={0.1}
          >
            <div className="overflow-hidden">
              {/* Header */}
              <div className="px-4 py-3 border-b border-slate-800/60 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">EIP-712 Typed Data</h3>
                <motion.span
                  className="text-xs px-2 py-0.5 rounded bg-blue-900/30 text-blue-300 border border-blue-800/40 font-mono"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4, type: 'spring', stiffness: 300, damping: 20 }}
                >
                  LeaseBid
                </motion.span>
              </div>

              {/* Domain separator */}
              <div className="px-4 py-2.5 border-b border-slate-800/40 bg-slate-900/30">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-2">
                  Domain Separator
                </span>
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  animate={phase !== 'idle' ? 'visible' : 'hidden'}
                  className="space-y-1"
                >
                  {domainFields.map((item, idx) => (
                    <motion.div
                      key={item.key}
                      className="flex items-center gap-2 text-xs"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{
                        opacity: phase !== 'idle' ? 1 : 0,
                        x: phase !== 'idle' ? 0 : -20,
                      }}
                      transition={{ delay: 0.3 + idx * 0.1, duration: 0.4 }}
                    >
                      <span className="text-slate-600 font-mono w-28 shrink-0">{item.key}:</span>
                      <span className="text-slate-400 font-mono truncate">{item.value}</span>
                    </motion.div>
                  ))}
                </motion.div>
              </div>

              {/* Message fields - materialize as floating data blocks */}
              <div className="px-4 py-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-2">
                  Message Fields
                </span>
                <div className="space-y-1.5">
                  {messageFields.map((field, idx) => (
                    <motion.div
                      key={field.name}
                      className={cn(
                        'flex items-center justify-between gap-2 px-2 py-1 rounded-md transition-colors duration-300',
                        isPostHash && 'bg-blue-900/10'
                      )}
                      initial={{ opacity: 0, x: -30, filter: 'blur(4px)' }}
                      animate={{
                        opacity: phase !== 'idle' ? 1 : 0,
                        x: phase !== 'idle' ? 0 : -30,
                        filter: phase !== 'idle' ? 'blur(0px)' : 'blur(4px)',
                      }}
                      transition={{
                        delay: 0.5 + idx * 0.12,
                        duration: 0.5,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    >
                      <div className="flex items-center gap-1.5">
                        <code className="text-xs font-mono text-blue-400">{field.name}</code>
                        <span className="text-[11px] text-slate-700 font-mono">({field.type})</span>
                      </div>
                      <code className="text-xs font-mono text-slate-400 truncate max-w-[100px]">
                        {field.value}
                      </code>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Data flow arrows pointing right */}
              <AnimatePresence>
                {isPostHash && (
                  <motion.div
                    className="px-4 pb-3 flex justify-end"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <motion.svg
                      className="w-16 h-4 text-blue-500/50"
                      viewBox="0 0 64 16"
                      fill="none"
                    >
                      <motion.path
                        d="M0 8h56m0 0l-6-6m6 6l-6 6"
                        stroke="currentColor"
                        strokeWidth={1.5}
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </motion.svg>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </GlowCard>
        </motion.div>

        {/* CENTER: Hash Forge Visualization */}
        <motion.div variants={fadeInUp} className="lg:col-span-4 flex flex-col items-center justify-center">
          <div className="relative w-full max-w-[280px] aspect-square flex items-center justify-center">
            {/* Rotating geometric shapes */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 280 280">
              {/* Outer ring */}
              <motion.circle
                cx="140"
                cy="140"
                r="120"
                fill="none"
                stroke="rgba(59, 130, 246, 0.1)"
                strokeWidth="1"
                strokeDasharray="4 8"
                animate={{ rotate: 360 }}
                transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
                style={{ transformOrigin: '140px 140px' }}
              />

              {/* Middle rotating hexagon */}
              <motion.polygon
                points="140,50 210,85 210,155 140,190 70,155 70,85"
                fill="none"
                stroke={isPostHash ? 'rgba(59, 130, 246, 0.4)' : 'rgba(148, 163, 184, 0.15)'}
                strokeWidth="1.5"
                animate={{ rotate: isPostHash ? 360 : 0 }}
                transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
                style={{ transformOrigin: '140px 140px', transition: 'stroke 0.5s ease' }}
              />

              {/* Inner rotating square */}
              <motion.rect
                x="100"
                y="100"
                width="80"
                height="80"
                rx="4"
                fill="none"
                stroke={isPostHash ? 'rgba(6, 182, 212, 0.4)' : 'rgba(148, 163, 184, 0.1)'}
                strokeWidth="1.5"
                animate={{ rotate: isPostHash ? -360 : 0 }}
                transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                style={{ transformOrigin: '140px 140px', transition: 'stroke 0.5s ease' }}
              />

              {/* Central diamond */}
              <motion.polygon
                points="140,110 170,140 140,170 110,140"
                fill={isPostHash ? 'rgba(59, 130, 246, 0.08)' : 'none'}
                stroke={isPostHash ? 'rgba(59, 130, 246, 0.6)' : 'rgba(148, 163, 184, 0.15)'}
                strokeWidth="2"
                animate={isPostHash ? {
                  scale: [1, 1.05, 1],
                } : {}}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                style={{ transformOrigin: '140px 140px', transition: 'stroke 0.5s ease, fill 0.5s ease' }}
              />
            </svg>

            {/* Central label */}
            <motion.div
              className="relative z-10 text-center"
              animate={isPostHash ? {
                textShadow: [
                  '0 0 0px rgba(59, 130, 246, 0)',
                  '0 0 20px rgba(59, 130, 246, 0.4)',
                  '0 0 0px rgba(59, 130, 246, 0)',
                ],
              } : {}}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <p className="text-xs uppercase tracking-[0.2em] text-slate-600 font-bold mb-1">
                {isPostHash ? 'Digest' : 'Forge'}
              </p>
              <motion.p
                className={cn(
                  'text-lg font-bold font-mono transition-colors duration-500',
                  isPostHash ? 'text-blue-400' : 'text-slate-600'
                )}
              >
                {isPostHash ? 'keccak256' : 'EIP-712'}
              </motion.p>
              {phase === 'hashing' && (
                <motion.div
                  className="mt-2 w-5 h-5 mx-auto rounded-full border-2 border-blue-400/40 border-t-blue-400"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                />
              )}
            </motion.div>
          </div>

          {/* Signature output */}
          <AnimatePresence>
            {isPostHash && (
              <motion.div
                className="w-full mt-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={gentleSpring}
              >
                <GlowCard
                  color={isPostSign ? 'emerald' : 'cyan'}
                  intensity={isPostSign ? 'high' : 'medium'}
                  active
                  delay={0}
                >
                  <div className="px-4 py-3">
                    <span className="text-xs uppercase tracking-wider text-slate-500 font-bold block mb-1">
                      Signature Hash
                    </span>
                    <div className="flex items-center gap-2">
                      <TypedText
                        text={truncateHash(HASHES.bidSignatureHash, 12)}
                        speed={25}
                        delay={200}
                        className="text-sm font-mono text-cyan-400"
                        cursor={!isPostSign}
                      />
                      {isPostSign && (
                        <motion.svg
                          className="w-4 h-4 text-emerald-400 shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </motion.svg>
                      )}
                    </div>
                  </div>
                </GlowCard>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* RIGHT: Wallet Authorization & Escrow */}
        <motion.div variants={fadeInRight} className="lg:col-span-4 space-y-4">
          {/* Wallet signing card */}
          <GlowCard
            color={isPostSign ? 'emerald' : phase === 'signing' ? 'blue' : 'blue'}
            intensity={phase === 'signing' ? 'high' : isPostSign ? 'medium' : 'low'}
            active={phase !== 'idle' && phase !== 'materializing'}
            delay={0.2}
          >
            <div className="p-4">
              <div className="flex items-center gap-3">
                <motion.div
                  className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center transition-colors duration-500 relative overflow-hidden',
                    phase === 'signing' ? 'bg-blue-600' :
                    isPostSign ? 'bg-emerald-900/30' : 'bg-slate-800'
                  )}
                  animate={phase === 'signing' ? {
                    boxShadow: [
                      '0 0 0px rgba(59, 130, 246, 0)',
                      '0 0 25px rgba(59, 130, 246, 0.5)',
                      '0 0 0px rgba(59, 130, 246, 0)',
                    ],
                  } : {}}
                  transition={{ duration: 1.5, repeat: phase === 'signing' ? Infinity : 0 }}
                >
                  {/* Scanning line effect */}
                  {phase === 'signing' && (
                    <motion.div
                      className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-blue-300 to-transparent"
                      initial={{ top: 0 }}
                      animate={{ top: ['0%', '100%', '0%'] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  )}

                  {isPostSign ? (
                    <motion.svg
                      className="w-6 h-6 text-emerald-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 12 }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </motion.svg>
                  ) : (
                    <svg className="w-6 h-6 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                    </svg>
                  )}
                </motion.div>
                <div>
                  <p className="text-sm font-bold text-white">
                    {phase === 'signing' ? 'Authorizing with wallet...' :
                     isPostSign ? 'Wallet authorized' : 'Awaiting wallet'}
                  </p>
                  <p className="text-xs text-slate-500 font-mono">
                    Signer: {truncateAddress(LESSEE)}
                  </p>
                </div>
              </div>
            </div>
          </GlowCard>

          {/* Escrow deposit visualization */}
          <GlowCard
            color="amber"
            intensity={phase === 'escrow' ? 'high' : isPostEscrow ? 'medium' : 'low'}
            active={isPostEscrow || phase === 'escrow'}
            delay={0.35}
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-bold text-white">USDC Escrow Deposit</p>
                  <p className="text-xs text-slate-500">Locked in Marketplace contract</p>
                </div>
                <div className="text-right">
                  {isPostEscrow || phase === 'escrow' ? (
                    <CountUp
                      value={parseFloat(terms.escrowAmount.replace(/,/g, ''))}
                      decimals={2}
                      suffix=" USDC"
                      delay={0}
                      className="text-lg font-bold font-mono text-amber-400"
                    />
                  ) : (
                    <span className="text-lg font-bold font-mono text-slate-600">--- USDC</span>
                  )}
                </div>
              </div>

              {/* Animated flow path: lessee -> marketplace */}
              {(phase === 'escrow' || isPostEscrow) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-2"
                >
                  <div className="flex items-center gap-2">
                    <code className="text-[11px] font-mono text-slate-500 shrink-0">
                      {truncateAddress(LESSEE, 4)}
                    </code>
                    <div className="flex-1 relative h-4">
                      <svg className="w-full h-full" viewBox="0 0 200 16" preserveAspectRatio="none">
                        <motion.path
                          d="M0 8h190m0 0l-6-5m6 5l-6 5"
                          stroke={isPostEscrow ? 'rgba(16, 185, 129, 0.5)' : 'rgba(245, 158, 11, 0.5)'}
                          strokeWidth="1.5"
                          fill="none"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                        />
                      </svg>
                      {phase === 'escrow' && (
                        <motion.div
                          className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-amber-400"
                          initial={{ left: '0%' }}
                          animate={{ left: '95%' }}
                          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                          style={{
                            boxShadow: '0 0 8px rgba(245, 158, 11, 0.6)',
                          }}
                        />
                      )}
                    </div>
                    <code className="text-[11px] font-mono text-slate-500 shrink-0">
                      {truncateAddress(CONTRACTS.marketplace.address, 4)}
                    </code>
                  </div>
                </motion.div>
              )}
            </div>
          </GlowCard>

          {/* Submission confirmation */}
          <AnimatePresence>
            {phase === 'submitted' && (
              <motion.div
                variants={scaleInBounce}
                initial="hidden"
                animate="visible"
              >
                <GlowCard color="emerald" intensity="high" active>
                  <div className="p-4 relative overflow-hidden">
                    <ParticleBurst trigger={phase === 'submitted'} color="emerald" particleCount={14} />
                    <div className="flex items-center gap-3 relative z-10">
                      <motion.svg
                        className="w-6 h-6 text-emerald-400 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </motion.svg>
                      <div>
                        <p className="text-sm font-bold text-emerald-300">Bid Submitted</p>
                        <p className="text-xs text-slate-500 font-mono">
                          Block #{BLOCK_NUMBERS.bidBlock.toLocaleString()} | TX: {truncateHash(TX_HASHES.lesseeBid)}
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
