'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StepContainer } from '../step-container';
import { useDemoContext } from '../demo-provider';
import {
  HASHES,
  CONTRACTS,
  BLOCK_NUMBERS,
  truncateAddress,
  truncateHash,
} from '@/lib/demo/demo-data';
import { GlowCard } from '../animations/glow-card';
import { CountUp } from '../animations/count-up';
import { ParticleBurst } from '../animations/particle-burst';
import { cn } from '@/lib/utils';
import { t } from '@/lib/demo/step-config';
import { heroEntrance, scaleInBounce, glowPulse } from '@/lib/demo/motion-variants';

// ---- Types ----

interface VerificationField {
  label: string;
  expected: string;
  actual: string;
  verified: boolean;
}

type ScanPhase = 'idle' | 'scanning' | 'complete';

export function Step04VerifyMetadata() {
  const { state, completeStep, presetData } = useDemoContext();
  const isActive = state.currentStep === 4;
  const [phase, setPhase] = useState<ScanPhase>('idle');
  const [fields, setFields] = useState<VerificationField[]>([]);
  const [showBurst, setShowBurst] = useState(false);

  const assetMetadata = presetData.assetMetadata;
  const metadata = presetData.metadata;

  // Build verification fields from preset data
  const verificationSource = useMemo(() => {
    const metaFields = Object.entries(assetMetadata.fields).map(([key, val]) => ({
      label: key,
      expected: String(val),
      actual: String(val),
      verified: false,
    }));

    // Add metadata hash as final field
    metaFields.push({
      label: 'Metadata Hash',
      expected: truncateHash(HASHES.metadataHash, 6),
      actual: truncateHash(HASHES.metadataHash, 6),
      verified: false,
    });

    return metaFields;
  }, [assetMetadata.fields]);

  const totalFields = verificationSource.length;
  const verifiedCount = fields.filter((f) => f.verified).length;

  // Phase sequencing
  useEffect(() => {
    if (!isActive) {
      setPhase('idle');
      setFields([]);
      setShowBurst(false);
      return;
    }

    setFields(verificationSource);

    const timers: ReturnType<typeof setTimeout>[] = [];

    // Start scanning
    timers.push(setTimeout(() => setPhase('scanning'), t(300)));

    const scanDuration = t(totalFields * 450); // Slower scan

    // Verify fields sequentially as scan line passes them (centered)
    verificationSource.forEach((_, idx) => {
      // Trigger when scan line is roughly over the center of the row 
      const verifyTime = t(400) + ((idx + 0.5) / totalFields) * scanDuration;
      timers.push(
        setTimeout(() => {
          setFields((prev) =>
            prev.map((f, i) => (i === idx ? { ...f, verified: true } : f))
          );
        }, verifyTime)
      );
    });

    // Complete
    const afterScan = t(500) + scanDuration + t(400);
    timers.push(
      setTimeout(() => {
        setPhase('complete');
        setShowBurst(true);
      }, afterScan)
    );

    timers.push(
      setTimeout(() => {
        completeStep(4, {
          fieldsVerified: totalFields,
          metadataIntegrity: 'VALID',
          hashMatch: true,
        });
      }, afterScan + t(300))
    );

    return () => timers.forEach(clearTimeout);
  }, [isActive, completeStep, verificationSource, totalFields]);

  return (
    <StepContainer stepNumber={4}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hero: Scanning beam verification table */}
        <div className="lg:col-span-2">
          <div className="relative">
            {/* Data panel with scan effect */}
            <GlowCard
              color={phase === 'complete' ? 'emerald' : 'blue'}
              intensity={phase === 'complete' ? 'high' : 'low'}
              active={phase !== 'idle'}
              delay={0.1}
            >
              <div className="overflow-hidden rounded-xl">
                {/* Header */}
                <div className="px-4 py-3 border-b border-slate-800/60 flex items-center justify-between bg-slate-900/40">
                  <h3 className="text-base font-bold text-white">On-Chain Metadata Query</h3>
                  <code className="text-sm font-mono text-emerald-400">
                    MetadataStorage.getMetadata({assetMetadata.assetId})
                  </code>
                </div>

                {/* Column headers */}
                <div className="grid grid-cols-[1fr_1fr_1fr_48px] gap-2 px-4 py-2 border-b border-slate-800/60 bg-slate-900/30">
                  <span className="text-sm font-bold uppercase tracking-wider text-slate-300">
                    Field
                  </span>
                  <span className="text-sm font-bold uppercase tracking-wider text-slate-300">
                    Expected
                  </span>
                  <span className="text-sm font-bold uppercase tracking-wider text-slate-300">
                    On-Chain
                  </span>
                  <span className="text-sm font-bold uppercase tracking-wider text-slate-300 text-center">
                    Status
                  </span>
                </div>

                {/* Data rows with scan line overlay */}
                <div className="relative">
                  {/* Scan line */}
                  <AnimatePresence>
                    {phase === 'scanning' && (
                      <motion.div
                        className="absolute left-0 right-0 h-10 pointer-events-none z-20"
                        initial={{ top: '0%', opacity: 0 }}
                        animate={{ top: '100%', opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{
                          top: { duration: (totalFields * 450) / 1000, ease: 'linear' },
                          opacity: { duration: 0.3 }
                        }}
                        style={{
                          background:
                            'linear-gradient(180deg, transparent 0%, rgba(59,130,246,0.15) 30%, rgba(59,130,246,0.4) 50%, rgba(59,130,246,0.15) 70%, transparent 100%)',
                        }}
                      >
                        {/* Scan line bright center */}
                        <div
                          className="absolute left-0 right-0 h-0.5"
                          style={{
                            top: '50%',
                            background:
                              'linear-gradient(90deg, transparent 0%, rgba(59,130,246,0.9) 20%, rgba(255,255,255,1) 50%, rgba(59,130,246,0.9) 80%, transparent 100%)',
                            boxShadow: '0 0 16px rgba(59,130,246,0.8), 0 0 32px rgba(59,130,246,0.5)',
                          }}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Rows */}
                  <div className="divide-y divide-slate-800/30">
                    {fields.map((field, idx) => (
                      <motion.div
                        key={field.label}
                        className={cn(
                          'grid grid-cols-[1fr_1fr_1fr_48px] gap-2 px-4 py-3 transition-colors duration-500 relative rounded-md',
                          field.verified && 'bg-emerald-950/20'
                        )}
                        initial={{ opacity: 0.3, x: 0 }}
                        animate={{
                          opacity: field.verified || idx <= verifiedCount ? 1 : 0.3,
                          x: field.verified && phase === 'scanning' ? [0, -4, 4, -2, 2, 0] : 0,
                        }}
                        transition={{ duration: 0.4 }}
                      >
                        {/* Row verified flash effect */}
                        {field.verified && (
                          <motion.div
                            className="absolute inset-0 bg-emerald-500/5 pointer-events-none"
                            initial={{ opacity: 0.4 }}
                            animate={{ opacity: 0 }}
                            transition={{ duration: 0.8 }}
                          />
                        )}

                        <span className="text-sm text-slate-300 font-medium">
                          {field.label}
                        </span>
                        <span className="text-base font-mono text-slate-300 truncate">
                          {field.expected}
                        </span>
                        <motion.span
                          className={cn(
                            'text-base font-mono truncate transition-colors duration-300',
                            field.verified ? 'text-emerald-400' : 'text-slate-300'
                          )}
                          animate={
                            field.verified ? { color: '#34d399' } : {}
                          }
                        >
                          {field.actual}
                        </motion.span>
                        <div className="flex justify-center">
                          <AnimatePresence mode="wait">
                            {field.verified ? (
                              <motion.div
                                key="check"
                                variants={scaleInBounce}
                                initial="hidden"
                                animate="visible"
                              >
                                <svg
                                  className="w-4 h-4"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth={2.5}
                                >
                                  <motion.path
                                    d="M5 13l4 4L19 7"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="text-emerald-400"
                                    initial={{ pathLength: 0 }}
                                    animate={{ pathLength: 1 }}
                                    transition={{ duration: 0.3 }}
                                  />
                                </svg>
                              </motion.div>
                            ) : (
                              <motion.div
                                key="empty"
                                className="w-4 h-4 rounded-full border border-slate-700 bg-slate-800"
                                exit={{ scale: 0, opacity: 0 }}
                                transition={{ duration: 0.15 }}
                              />
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </GlowCard>

            {/* INTEGRITY CONFIRMED stamp */}
            <AnimatePresence>
              {phase === 'complete' && (
                <motion.div
                  className="mt-4 relative z-10"
                  variants={heroEntrance}
                  initial="hidden"
                  animate="visible"
                >
                  <motion.div variants={glowPulse} initial="idle" animate="active" className="rounded-2xl">
                    <GlowCard color="emerald" intensity="high" active={true} delay={0}>
                      <div className="p-5 flex items-center gap-4">
                        <motion.div
                          className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 relative"
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{
                            type: 'spring',
                            stiffness: 250,
                            damping: 15,
                            delay: 0.1,
                          }}
                        >
                          <svg
                            className="w-6 h-6 text-emerald-400"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <motion.path
                              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              initial={{ pathLength: 0 }}
                              animate={{ pathLength: 1 }}
                              transition={{ duration: 0.8, delay: 0.2 }}
                            />
                          </svg>
                          <ParticleBurst
                            trigger={showBurst}
                            color="emerald"
                            particleCount={32}
                          />
                        </motion.div>
                        <div>
                          <motion.p
                            className="text-base font-bold text-emerald-400 tracking-wide"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3, duration: 0.4 }}
                          >
                            INTEGRITY CONFIRMED
                          </motion.p>
                          <motion.p
                            className="text-base text-slate-300"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5, duration: 0.3 }}
                          >
                            All {totalFields} fields match on-chain records. Hash validated.
                          </motion.p>
                        </div>
                      </div>
                    </GlowCard>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Side panel */}
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, x: 30 }}
          animate={
            phase !== 'idle'
              ? { opacity: 1, x: 0 }
              : { opacity: 0, x: 30 }
          }
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
        >
          {/* Query target info */}
          <GlowCard color="blue" intensity="low" active={phase !== 'idle'} delay={0.3}>
            <div className="p-5">
              <h4 className="text-sm font-bold uppercase tracking-widest text-slate-300 mb-3">
                Query Target
              </h4>
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-slate-300 uppercase tracking-wider block mb-0.5">
                    Contract
                  </span>
                  <code className="text-base font-mono text-emerald-400">
                    {truncateAddress(CONTRACTS.metadataStorage.address)}
                  </code>
                </div>
                <div>
                  <span className="text-sm text-slate-300 uppercase tracking-wider block mb-0.5">
                    Method
                  </span>
                  <code className="text-base font-mono text-blue-400">
                    getMetadata(uint256)
                  </code>
                </div>
                <div>
                  <span className="text-sm text-slate-300 uppercase tracking-wider block mb-0.5">
                    Call Type
                  </span>
                  <span className="text-base text-slate-300">staticcall (view)</span>
                </div>
                <div>
                  <span className="text-sm text-slate-300 uppercase tracking-wider block mb-0.5">
                    Block
                  </span>
                  <span className="text-base font-mono text-amber-400">
                    #{BLOCK_NUMBERS.verifyBlock.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </GlowCard>

          {/* Verification progress */}
          <GlowCard
            color={phase === 'complete' ? 'emerald' : 'cyan'}
            intensity={phase === 'complete' ? 'medium' : 'low'}
            active={phase !== 'idle'}
            delay={0.4}
          >
            <div className="p-5">
              <h4 className="text-sm font-bold uppercase tracking-widest text-slate-300 mb-3">
                Verification Progress
              </h4>
              {/* Animated progress bar */}
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-3">
                <motion.div
                  className={cn(
                    'h-full rounded-full',
                    phase === 'complete' ? 'bg-emerald-500' : 'bg-cyan-500'
                  )}
                  initial={{ width: '0%' }}
                  animate={{
                    width: `${totalFields > 0 ? (verifiedCount / totalFields) * 100 : 0}%`,
                  }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                />
              </div>
              {/* Counter */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">Fields Verified</span>
                <div className="flex items-baseline gap-1">
                  <CountUp
                    value={verifiedCount}
                    decimals={0}
                    className={cn(
                      'text-lg font-mono font-bold',
                      phase === 'complete' ? 'text-emerald-400' : 'text-cyan-400'
                    )}
                    duration={0.3}
                  />
                  <span className="text-sm text-slate-300 font-mono">
                    / {totalFields}
                  </span>
                  <span
                    className={cn(
                      'text-sm font-bold uppercase tracking-wider ml-1',
                      phase === 'complete' ? 'text-emerald-400' : 'text-slate-300'
                    )}
                  >
                    {phase === 'complete' ? 'VERIFIED' : 'SCANNING'}
                  </span>
                </div>
              </div>
            </div>
          </GlowCard>

          {/* Metadata hash card */}
          <AnimatePresence>
            {phase === 'complete' && (
              <motion.div
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  type: 'spring',
                  stiffness: 200,
                  damping: 20,
                }}
              >
                <GlowCard color="emerald" intensity="low" active={true} delay={0}>
                  <div className="p-5">
                    <h4 className="text-sm font-bold uppercase tracking-widest text-slate-300 mb-3">
                      Hash Verification
                    </h4>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm text-slate-300 uppercase tracking-wider block mb-0.5">
                          Stored Hash
                        </span>
                        <code className="text-[13px] font-mono text-emerald-400 break-all">
                          {truncateHash(HASHES.metadataHash)}
                        </code>
                      </div>
                      <div>
                        <span className="text-sm text-slate-300 uppercase tracking-wider block mb-0.5">
                          Computed Hash
                        </span>
                        <code className="text-[13px] font-mono text-emerald-400 break-all">
                          {truncateHash(HASHES.metadataHash)}
                        </code>
                      </div>
                      <div className="flex items-center gap-1.5 pt-1">
                        <motion.svg
                          className="w-3.5 h-3.5 text-emerald-400"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <motion.path
                            d="M5 13l4 4L19 7"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 0.3, delay: 0.2 }}
                          />
                        </motion.svg>
                        <span className="text-sm font-bold text-emerald-400">
                          MATCH CONFIRMED
                        </span>
                      </div>
                    </div>
                  </div>
                </GlowCard>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </StepContainer>
  );
}
