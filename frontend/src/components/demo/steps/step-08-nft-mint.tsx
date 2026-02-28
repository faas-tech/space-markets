'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StepContainer } from '../step-container';
import { useDemoContext } from '../demo-provider';
import {
  LEASE_NFT_ID,
  LESSOR,
  LESSEE,
  HASHES,
  CONTRACTS,
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
  fadeInRight,
  scaleInBounce,
  heroEntrance,
  gentleSpring,
  staggerContainer,
} from '@/lib/demo/motion-variants';
import { cn } from '@/lib/utils';
import { t } from '@/lib/demo/step-config';

type Phase = 'idle' | 'converging' | 'forming' | 'minting' | 'minted';

// Convergence particle for reverse-burst effect
interface ConvergeParticle {
  id: number;
  startAngle: number;
  startDistance: number;
  size: number;
  delay: number;
  color: string;
}

function generateConvergeParticles(count: number): ConvergeParticle[] {
  const colors = ['#3B82F6', '#60A5FA', '#93C5FD', '#6366F1', '#818CF8'];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    startAngle: (360 / count) * i + (Math.random() - 0.5) * 30,
    startDistance: 80 + Math.random() * 80,
    size: 2 + Math.random() * 3,
    delay: Math.random() * 0.4,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));
}

export function Step08NftMint() {
  const { state, completeStep, presetData } = useDemoContext();
  const isActive = state.currentStep === 8;
  const [phase, setPhase] = useState<Phase>('idle');
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });

  const terms = presetData.leaseTerms;
  const asset = presetData.assetMetadata;

  const convergeParticles = useMemo(() => generateConvergeParticles(24), []);

  useEffect(() => {
    if (!isActive) {
      setPhase('idle');
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setPhase('converging'), t(200)));
    timers.push(setTimeout(() => setPhase('forming'), t(2000)));
    timers.push(setTimeout(() => setPhase('minting'), t(3200)));
    timers.push(setTimeout(() => {
      setPhase('minted');
      completeStep(8, {
        nftTokenId: LEASE_NFT_ID,
        leaseFactory: CONTRACTS.leaseFactory.address,
        owner: LESSEE,
      });
    }, t(4400)));

    return () => timers.forEach(clearTimeout);
  }, [isActive, completeStep, terms, asset]);

  const nftAttributes = useMemo(() => [
    { trait: 'Lease ID', value: `#${terms.leaseId}`, color: 'text-amber-400' },
    { trait: 'Asset', value: asset.name, color: 'text-slate-300' },
    { trait: 'Lessor', value: truncateAddress(LESSOR), color: 'text-emerald-400' },
    { trait: 'Lessee', value: truncateAddress(LESSEE), color: 'text-emerald-400' },
    { trait: 'Rate/Day', value: `${terms.ratePerDay} USDC`, color: 'text-cyan-400' },
    { trait: 'Duration', value: terms.duration, color: 'text-slate-300' },
    { trait: 'Terms Hash', value: truncateHash(HASHES.leaseTermsHash), color: 'text-indigo-400' },
    { trait: 'Start Block', value: `#${terms.startBlock.toLocaleString()}`, color: 'text-amber-400' },
  ], [terms, asset]);

  const phaseIdx = ['idle', 'converging', 'forming', 'minting', 'minted'].indexOf(phase);
  const isPostForm = phaseIdx >= 2;
  const isPostMint = phaseIdx >= 3;

  // Simple mouse parallax for 3D card
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const x = ((e.clientX - centerX) / (rect.width / 2)) * 8;
    const y = ((e.clientY - centerY) / (rect.height / 2)) * -8;
    setMouseOffset({ x, y });
  };

  const handleMouseLeave = () => {
    setMouseOffset({ x: 0, y: 0 });
  };

  return (
    <StepContainer stepNumber={8}>
      <motion.div
        variants={heroEntrance}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* Main NFT Card Area */}
        <motion.div
          variants={fadeInUp}
          className="lg:col-span-2 flex flex-col items-center sm:items-start sm:flex-row gap-6"
        >
          {/* NFT Card with 3D Perspective */}
          <div
            className="shrink-0 relative"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ perspective: '1000px' }}
          >
            {/* Convergence particles (reverse burst) */}
            <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 5 }}>
              <AnimatePresence>
                {phase === 'converging' && convergeParticles.map((p) => {
                  const rad = (p.startAngle * Math.PI) / 180;
                  const startX = Math.cos(rad) * p.startDistance;
                  const startY = Math.sin(rad) * p.startDistance;

                  return (
                    <motion.div
                      key={p.id}
                      className="absolute rounded-full"
                      style={{
                        width: p.size,
                        height: p.size,
                        backgroundColor: p.color,
                        left: '50%',
                        top: '50%',
                        marginLeft: -p.size / 2,
                        marginTop: -p.size / 2,
                      }}
                      initial={{
                        x: startX,
                        y: startY,
                        opacity: 0.8,
                        scale: 1.5,
                      }}
                      animate={{
                        x: 0,
                        y: 0,
                        opacity: 0,
                        scale: 0,
                      }}
                      exit={{ opacity: 0 }}
                      transition={{
                        duration: 1.2,
                        delay: p.delay,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    />
                  );
                })}
              </AnimatePresence>
            </div>

            {/* The NFT Card */}
            <motion.div
              className={cn(
                'w-56 h-72 rounded-2xl border-2 overflow-hidden relative',
                'transition-shadow duration-1000',
              )}
              style={{
                transformStyle: 'preserve-3d',
                transform: isPostForm
                  ? `rotateX(${mouseOffset.y}deg) rotateY(${mouseOffset.x}deg)`
                  : 'rotateX(0) rotateY(0)',
                transition: 'transform 0.15s ease-out',
              }}
              initial={{ opacity: 0, scale: 0.3, rotateY: 180 }}
              animate={{
                opacity: phase !== 'idle' ? 1 : 0,
                scale: phase === 'converging' ? 0.6 : 1,
                rotateY: 0,
                borderColor: phase === 'minted'
                  ? 'rgba(59, 130, 246, 0.6)'
                  : phase === 'minting'
                    ? 'rgba(59, 130, 246, 0.3)'
                    : 'rgba(51, 65, 85, 0.4)',
                boxShadow: phase === 'minted'
                  ? '0 0 60px -15px rgba(59, 130, 246, 0.5), 0 0 30px -10px rgba(245, 158, 11, 0.2)'
                  : phase === 'minting'
                    ? '0 0 30px -10px rgba(59, 130, 246, 0.3)'
                    : '0 0 0px rgba(0,0,0,0)',
              }}
              transition={{
                type: 'spring',
                stiffness: 150,
                damping: 20,
                opacity: { duration: 0.5 },
              }}
            >
              {/* Background gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-950/30 to-slate-900" />

              {/* Holographic shimmer effect */}
              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.03) 45%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 55%, transparent 60%)',
                  backgroundSize: '200% 100%',
                }}
                animate={isPostForm && phase !== 'minted' ? {
                  backgroundPosition: ['200% 0%', '-200% 0%'],
                } : { backgroundPosition: '200% 0%' }}
                transition={{
                  duration: 3,
                  repeat: phase === 'minted' ? 0 : Infinity,
                  ease: 'linear',
                  repeatDelay: 1,
                }}
              />

              {/* Golden glow pulse for minted state */}
              {phase === 'minted' && (
                <motion.div
                  className="absolute inset-0 pointer-events-none rounded-2xl"
                  animate={{
                    boxShadow: [
                      'inset 0 0 0px rgba(245, 158, 11, 0)',
                      'inset 0 0 30px rgba(245, 158, 11, 0.1)',
                      'inset 0 0 0px rgba(245, 158, 11, 0)',
                    ],
                  }}
                  transition={{ duration: 3, repeat: phase === 'minted' ? 0 : Infinity, ease: 'easeInOut' }}
                />
              )}

              {/* NFT Content */}
              <div className="relative h-full flex flex-col z-10">
                {/* Header */}
                <div className="px-4 pt-4 pb-2">
                  <motion.span
                    className="text-sm uppercase tracking-[0.2em] text-blue-400/60 font-bold block"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isPostForm ? 1 : 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    Cryptographic Lease
                  </motion.span>
                  <motion.p
                    className={cn(
                      'text-3xl font-bold font-mono transition-colors duration-700',
                      phase === 'minted' ? 'text-white' : 'text-slate-300'
                    )}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: isPostForm ? 1 : 0, y: isPostForm ? 0 : 10 }}
                    transition={{ delay: 0.5, type: 'spring', stiffness: 200, damping: 20 }}
                  >
                    #{LEASE_NFT_ID}
                  </motion.p>
                </div>

                {/* Central visual - Lease icon with glow */}
                <div className="flex-1 flex items-center justify-center">
                  <motion.div
                    className={cn(
                      'w-20 h-20 rounded-full border-2 flex items-center justify-center relative',
                      'transition-all duration-700',
                    )}
                    animate={{
                      borderColor: phase === 'minted'
                        ? 'rgba(59, 130, 246, 0.8)'
                        : isPostForm
                          ? 'rgba(59, 130, 246, 0.4)'
                          : 'rgba(51, 65, 85, 0.4)',
                      backgroundColor: phase === 'minted'
                        ? 'rgba(59, 130, 246, 0.1)'
                        : 'rgba(30, 41, 59, 0.6)',
                      boxShadow: phase === 'minted'
                        ? '0 0 40px -5px rgba(59, 130, 246, 0.5)'
                        : '0 0 0px rgba(0,0,0,0)',
                    }}
                    transition={{ duration: 0.7 }}
                  >
                    <motion.svg
                      className={cn(
                        'w-8 h-8 transition-colors duration-700',
                        phase === 'minted' ? 'text-blue-400' : isPostForm ? 'text-blue-500/60' : 'text-slate-300'
                      )}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      animate={isPostForm && phase !== 'minted' ? { rotate: [0, 5, -5, 0] } : { rotate: 0 }}
                      transition={{ duration: 4, repeat: phase === 'minted' ? 0 : Infinity, ease: 'easeInOut' }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                    </motion.svg>

                    {/* Minted burst */}
                    <ParticleBurst trigger={phase === 'minted'} color="blue" particleCount={18} />
                  </motion.div>
                </div>

                {/* Footer */}
                <motion.div
                  className="px-4 pb-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: isPostForm ? 1 : 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <p className="text-base text-slate-300 font-medium">{asset.name}</p>
                  <p className="text-sm text-slate-300">{terms.duration} | {terms.ratePerDay} USDC/day</p>
                </motion.div>
              </div>
            </motion.div>
          </div>

          {/* Embedded Lease Terms */}
          <div className="flex-1 space-y-3 min-w-0">
            <GlowCard
              color="blue"
              intensity={phase === 'minted' ? 'medium' : 'low'}
              active={isPostForm}
              delay={0.3}
            >
              <div className="overflow-hidden">
                <div className="px-4 py-2.5 border-b border-slate-800/60">
                  <h4 className="text-sm font-bold uppercase tracking-widest text-slate-300">
                    Embedded Lease Terms
                  </h4>
                </div>
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  animate={isPostForm ? 'visible' : 'hidden'}
                  className="divide-y divide-slate-800/30"
                >
                  {nftAttributes.map((attr, idx) => (
                    <motion.div
                      key={attr.trait}
                      className="px-4 py-2 flex items-center justify-between gap-3"
                      initial={{ opacity: 0, x: -15 }}
                      animate={{
                        opacity: isPostForm ? 1 : 0,
                        x: isPostForm ? 0 : -15,
                      }}
                      transition={{
                        delay: 0.15 + idx * 0.08,
                        duration: 0.4,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    >
                      <span className="text-sm text-slate-300 uppercase tracking-wider shrink-0">
                        {attr.trait}
                      </span>
                      <span className={cn('text-base font-mono truncate text-right', attr.color)}>
                        {attr.value}
                      </span>
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            </GlowCard>

            {/* Minting status */}
            <AnimatePresence mode="wait">
              {phase === 'minting' && (
                <motion.div
                  key="minting"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={gentleSpring}
                  className="flex items-center gap-3 px-2"
                >
                  <motion.div
                    className="w-4 h-4 rounded-full border-2 border-blue-400/40 border-t-blue-400"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  />
                  <span className="text-base text-slate-300 font-mono">
                    Minting Cryptographic Lease on LeaseFactory...
                  </span>
                </motion.div>
              )}

              {phase === 'minted' && (
                <motion.div
                  key="minted"
                  variants={scaleInBounce}
                  initial="hidden"
                  animate="visible"
                >
                  <GlowCard color="emerald" intensity="high" active>
                    <div className="p-3 flex items-center gap-3 relative overflow-hidden">
                      <ParticleBurst trigger={phase === 'minted'} color="amber" particleCount={12} />
                      <motion.svg
                        className="w-5 h-5 text-emerald-400 shrink-0 relative z-10"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 12 }}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </motion.svg>
                      <div className="relative z-10">
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold text-emerald-400">TOKEN #{LEASE_NFT_ID} MINTED</span>
                        </div>
                        <span className="text-sm text-slate-300 block">
                          on {truncateAddress(CONTRACTS.leaseFactory.address)}
                        </span>
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
            color={phase === 'minted' ? 'blue' : 'indigo'}
            intensity={phase === 'minted' ? 'medium' : 'low'}
            active={isPostForm}
            delay={0.4}
          >
            <div className="p-4">
              <h4 className="text-sm font-bold uppercase tracking-widest text-slate-300 mb-4">
                NFT Details
              </h4>
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate={isPostForm ? 'visible' : 'hidden'}
                className="space-y-3"
              >
                <motion.div
                  variants={fadeInUp}
                >
                  <span className="text-sm text-slate-300 uppercase tracking-wider block mb-0.5">Token ID</span>
                  <motion.span
                    className="text-xl font-bold font-mono text-blue-400"
                    animate={phase === 'minted' ? {
                      textShadow: [
                        '0 0 0px rgba(59, 130, 246, 0)',
                        '0 0 15px rgba(59, 130, 246, 0.5)',
                        '0 0 0px rgba(59, 130, 246, 0)',
                      ],
                    } : {}}
                    transition={{ duration: 2, repeat: phase === 'minted' ? 0 : Infinity }}
                  >
                    #{LEASE_NFT_ID}
                  </motion.span>
                </motion.div>
                <motion.div variants={fadeInUp}>
                  <span className="text-sm text-slate-300 uppercase tracking-wider block mb-0.5">Contract</span>
                  <code className="text-base font-mono text-emerald-400">
                    {truncateAddress(CONTRACTS.leaseFactory.address)}
                  </code>
                </motion.div>
                <motion.div variants={fadeInUp}>
                  <span className="text-sm text-slate-300 uppercase tracking-wider block mb-0.5">Owner</span>
                  <code className="text-base font-mono text-emerald-400">
                    {truncateAddress(LESSEE)}
                  </code>
                </motion.div>
                <motion.div variants={fadeInUp}>
                  <span className="text-sm text-slate-300 uppercase tracking-wider block mb-0.5">Standard</span>
                  <span className="text-base text-slate-300">ERC-721</span>
                </motion.div>
                <motion.div variants={fadeInUp}>
                  <span className="text-sm text-slate-300 uppercase tracking-wider block mb-0.5">Total Cost</span>
                  <CountUp
                    value={parseFloat(terms.totalCost.replace(/,/g, ''))}
                    decimals={2}
                    suffix=" USDC"
                    delay={0.5}
                    className="text-base font-bold font-mono text-amber-400"
                  />
                </motion.div>
              </motion.div>
            </div>
          </GlowCard>

          {/* Block confirmation */}
          <AnimatePresence>
            {phase === 'minted' && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.3 }}
              >
                <GlowCard color="emerald" intensity="medium" active delay={0.5}>
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
                        transition={{ duration: 2, repeat: phase === 'minted' ? 0 : Infinity }}
                      />
                      <span className="text-sm font-bold uppercase tracking-wider text-emerald-400">
                        Block Confirmed
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      <div>
                        <span className="text-sm text-slate-300 block">Block</span>
                        <code className="text-base font-mono text-amber-400">
                          #{BLOCK_NUMBERS.mintBlock.toLocaleString()}
                        </code>
                      </div>
                      <div>
                        <span className="text-sm text-slate-300 block">Transaction</span>
                        <code className="text-sm font-mono text-slate-300">
                          {truncateHash(TX_HASHES.mintNft)}
                        </code>
                      </div>
                      <div>
                        <span className="text-sm text-slate-300 block">Gas Used</span>
                        <code className="text-sm font-mono text-slate-300">
                          <CountUp value={284521} decimals={0} delay={0.6} className="text-sm font-mono text-slate-300" />
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
