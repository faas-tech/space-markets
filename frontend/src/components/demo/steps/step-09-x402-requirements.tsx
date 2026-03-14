'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StepContainer } from '../step-container';
import { useDemoContext } from '../demo-provider';
import {
  CONTRACTS,
  truncateAddress,
} from '@/lib/demo/demo-data';
import { GlowCard } from '../animations/glow-card';
import { ParticleBurst } from '../animations/particle-burst';
import { cn } from '@/lib/utils';
import {
  fadeInUp,
  heroEntrance,
} from '@/lib/demo/motion-variants';

// ---- Phase type ----
type Phase = 'idle' | 'requesting' | 'response' | 'revealing' | 'complete';

// ---- JSON fields to stagger-reveal ----
interface JsonField {
  key: string;
  value: string;
  valueColor: string;
}

export function Step09X402Requirements() {
  const { state, completeStep, presetData } = useDemoContext();
  const isActive = state.currentStep === 9;
  const [phase, setPhase] = useState<Phase>('idle');
  const [revealedJsonFields, setRevealedJsonFields] = useState(0);
  const [showBurst, setShowBurst] = useState(false);

  const jsonFields: JsonField[] = useMemo(() => [
    { key: 'x402Version', value: String(presetData.x402Config.version), valueColor: 'text-warning' },
    { key: 'scheme', value: '"exact"', valueColor: 'text-success' },
    { key: 'network', value: `"${presetData.x402Config.network}"`, valueColor: 'text-success' },
    { key: 'maxAmountRequired', value: `"${presetData.x402Config.maxAmountRequired}"`, valueColor: 'text-warning' },
    { key: 'resource', value: `"${presetData.x402Config.resourceUrl}"`, valueColor: 'text-success' },
    { key: 'payTo', value: `"${truncateAddress(CONTRACTS.marketplace.address)}"`, valueColor: 'text-success' },
    { key: 'requiredDeadlineSeconds', value: '300', valueColor: 'text-warning' },
    { key: 'description', value: `"${presetData.x402Config.description}"`, valueColor: 'text-success' },
  ], [presetData]);

  useEffect(() => {
    if (!isActive) {
      setPhase('idle');
      setRevealedJsonFields(0);
      setShowBurst(false);
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];

    timers.push(setTimeout(() => setPhase('requesting'), 300));
    timers.push(setTimeout(() => setPhase('response'), 1600));
    timers.push(setTimeout(() => setPhase('revealing'), 2800));

    // Stagger JSON field reveals
    jsonFields.forEach((_, idx) => {
      timers.push(setTimeout(() => {
        setRevealedJsonFields(idx + 1);
      }, 3000 + idx * 200));
    });

    const completeMs = 3000 + jsonFields.length * 200 + 600;
    timers.push(setTimeout(() => {
      setPhase('complete');
      setShowBurst(true);
    }, completeMs));

    timers.push(setTimeout(() => {
      completeStep(9, {
        x402Version: presetData.x402Config.version,
        network: presetData.x402Config.network,
        facilitator: presetData.x402Config.facilitator,
        resourceUrl: presetData.x402Config.resourceUrl,
      });
    }, completeMs + 600));

    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  const phaseIdx = ['idle', 'requesting', 'response', 'revealing', 'complete'].indexOf(phase);
  const showResponse = phaseIdx >= 2;
  const showJson = phaseIdx >= 3;
  const isComplete = phase === 'complete';

  return (
    <StepContainer stepNumber={9}>
      <motion.div
        variants={heroEntrance}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* Top: Visual story flow — 3 steps */}
        <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center gap-4 sm:gap-3 justify-center py-2">
          {/* Step 1: Access Request */}
          <motion.div
            className={cn(
              'flex items-center gap-3 px-5 py-4 rounded-xl border backdrop-blur-sm transition-all duration-500 min-w-[200px]',
              phaseIdx >= 1
                ? 'border-blue-500/40 bg-blue-500/5'
                : 'border-white/5 bg-card/30 opacity-40'
            )}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: phaseIdx >= 1 ? 1 : 0.4, x: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            <div className={cn(
              'w-11 h-11 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-500',
              phaseIdx >= 1 ? 'bg-blue-500/20' : 'bg-secondary'
            )}>
              <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
              </svg>
            </div>
            <div>
              <p className="text-base font-bold text-foreground">Access Request</p>
              <p className="text-sm text-muted-foreground">App requests lease data</p>
            </div>
          </motion.div>

          {/* Arrow 1 */}
          <motion.div
            className="shrink-0 hidden sm:block"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: phaseIdx >= 1 ? 1 : 0, scale: phaseIdx >= 1 ? 1 : 0 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 20 }}
          >
            <svg width="48" height="24" viewBox="0 0 48 24" fill="none">
              <motion.path
                d="M4 12h32m0 0l-6-5m6 5l-6 5"
                stroke="rgba(100,116,139,0.5)"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: phaseIdx >= 1 ? 1 : 0 }}
                transition={{ duration: 0.6 }}
              />
            </svg>
          </motion.div>

          {/* Step 2: 402 Response */}
          <motion.div
            className={cn(
              'flex items-center gap-3 px-5 py-4 rounded-xl border backdrop-blur-sm transition-all duration-500 min-w-[200px]',
              showResponse
                ? 'border-amber-500/40 bg-amber-500/5'
                : 'border-white/5 bg-card/30 opacity-40'
            )}
            initial={{ opacity: 0 }}
            animate={{ opacity: showResponse ? 1 : 0.4 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            <div className={cn(
              'w-11 h-11 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-500',
              showResponse ? 'bg-amber-500/20' : 'bg-secondary'
            )}>
              <motion.span
                className="text-lg font-extrabold font-mono text-warning"
                animate={showResponse ? {
                  textShadow: [
                    '0 0 0px rgba(245,158,11,0)',
                    '0 0 12px rgba(245,158,11,0.6)',
                    '0 0 4px rgba(245,158,11,0.3)',
                  ],
                } : {}}
                transition={{ duration: 1 }}
              >
                402
              </motion.span>
            </div>
            <div>
              <p className="text-base font-bold text-foreground">Payment Required</p>
              <p className="text-sm text-warning">Server says: pay first</p>
            </div>
          </motion.div>

          {/* Arrow 2 */}
          <motion.div
            className="shrink-0 hidden sm:block"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: showResponse ? 1 : 0, scale: showResponse ? 1 : 0 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 20 }}
          >
            <svg width="48" height="24" viewBox="0 0 48 24" fill="none">
              <motion.path
                d="M4 12h32m0 0l-6-5m6 5l-6 5"
                stroke="rgba(100,116,139,0.5)"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: showResponse ? 1 : 0 }}
                transition={{ duration: 0.6 }}
              />
            </svg>
          </motion.div>

          {/* Step 3: Requirements Delivered */}
          <motion.div
            className={cn(
              'flex items-center gap-3 px-5 py-4 rounded-xl border backdrop-blur-sm transition-all duration-500 min-w-[200px]',
              showJson
                ? 'border-emerald-500/40 bg-emerald-500/5'
                : 'border-white/5 bg-card/30 opacity-40'
            )}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: showJson ? 1 : 0.4, x: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            <div className={cn(
              'w-11 h-11 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-500',
              showJson ? 'bg-emerald-500/20' : 'bg-secondary'
            )}>
              <svg className={cn('w-6 h-6', showJson ? 'text-success' : 'text-muted-foreground/60')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <div>
              <p className="text-base font-bold text-foreground">Requirements</p>
              <p className="text-sm text-success">Payment terms delivered</p>
            </div>
          </motion.div>
        </motion.div>

        {/* Bottom: JSON + Network visualization */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Payment Requirements JSON (2 cols) */}
          <motion.div className="lg:col-span-2" variants={fadeInUp}>
            <GlowCard
              color={isComplete ? 'emerald' : 'blue'}
              intensity={showJson ? 'medium' : 'low'}
              active={showJson}
              className="overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-border/60 flex items-center justify-between">
                <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                  Payment Requirements
                </h4>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-muted-foreground/60">application/json</span>
                  {showJson && (
                    <motion.div
                      className="w-2.5 h-2.5 rounded-full bg-emerald-400"
                      animate={{
                        boxShadow: [
                          '0 0 0px rgba(16, 185, 129, 0)',
                          '0 0 8px rgba(16, 185, 129, 0.8)',
                          '0 0 0px rgba(16, 185, 129, 0)',
                        ],
                      }}
                      transition={{ duration: 1.5, repeat: 2 }}
                    />
                  )}
                </div>
              </div>

              <div className="p-6 font-mono text-base leading-relaxed">
                {/* Opening brace */}
                <motion.div
                  className="text-muted-foreground/60"
                  initial={{ opacity: 0 }}
                  animate={showJson ? { opacity: 1 } : { opacity: 0.3 }}
                  transition={{ duration: 0.3 }}
                >
                  {'{'}
                </motion.div>

                {/* JSON fields with staggered reveal */}
                <div className="pl-6 space-y-1">
                  {jsonFields.map((field, idx) => {
                    const isRevealed = idx < revealedJsonFields;
                    const isLatest = idx === revealedJsonFields - 1;
                    return (
                      <motion.div
                        key={field.key}
                        initial={{ opacity: 0, x: -10 }}
                        animate={isRevealed ? { opacity: 1, x: 0 } : { opacity: 0.1, x: -10 }}
                        transition={{
                          duration: 0.3,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        className="relative"
                      >
                        {/* Flash highlight on latest revealed field */}
                        {isLatest && (
                          <motion.div
                            className="absolute inset-0 -mx-2 rounded bg-success-soft"
                            initial={{ opacity: 0.6 }}
                            animate={{ opacity: 0 }}
                            transition={{ duration: 0.8 }}
                          />
                        )}
                        <span className="text-primary">&quot;{field.key}&quot;</span>
                        <span className="text-muted-foreground/60">: </span>
                        <span className={cn(field.valueColor, 'break-all')}>{field.value}</span>
                        {idx < jsonFields.length - 1 && <span className="text-muted-foreground/60">,</span>}
                      </motion.div>
                    );
                  })}
                </div>

                {/* Closing brace */}
                <motion.div
                  className="text-muted-foreground/60"
                  initial={{ opacity: 0 }}
                  animate={revealedJsonFields >= jsonFields.length ? { opacity: 1 } : { opacity: 0.3 }}
                  transition={{ duration: 0.3 }}
                >
                  {'}'}
                </motion.div>
              </div>
            </GlowCard>
          </motion.div>

          {/* Payment Network — vertical flow with connecting lines */}
          <motion.div variants={fadeInUp} className="space-y-4">
            <GlowCard
              color={isComplete ? 'emerald' : 'cyan'}
              intensity={showResponse ? 'medium' : 'low'}
              active={showResponse}
            >
              <div className="p-5">
                <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-5">
                  Payment Network
                </h4>

                {/* Vertical node list with animated connectors */}
                <div className="space-y-0">
                  {/* Node: Lessee */}
                  <motion.div
                    className="flex items-center gap-4"
                    initial={{ opacity: 0, x: -20 }}
                    animate={showResponse ? { opacity: 1, x: 0 } : { opacity: 0.3, x: -20 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.1 }}
                  >
                    <div className={cn(
                      'w-11 h-11 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-500',
                      showResponse ? 'border-cyan-500/60 bg-cyan-500/10' : 'border-border bg-secondary'
                    )}>
                      <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 013 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 013 6v3" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-bold text-foreground">Lessee</p>
                      <p className="text-sm text-muted-foreground">Pays for lease access</p>
                    </div>
                  </motion.div>

                  {/* Connector line 1 */}
                  <div className="flex items-center pl-5 py-1">
                    <motion.div
                      className={cn(
                        'w-px h-6 transition-colors duration-500',
                        showResponse ? 'bg-gradient-to-b from-cyan-500/40 to-amber-500/40' : 'bg-border/30'
                      )}
                      initial={{ scaleY: 0 }}
                      animate={showResponse ? { scaleY: 1 } : { scaleY: 0 }}
                      transition={{ duration: 0.4, delay: 0.3 }}
                      style={{ transformOrigin: 'top' }}
                    />
                    {showJson && (
                      <motion.span
                        className="text-xs text-muted-foreground/50 ml-6"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                      >
                        USDC payment
                      </motion.span>
                    )}
                  </div>

                  {/* Node: Marketplace */}
                  <motion.div
                    className="flex items-center gap-4"
                    initial={{ opacity: 0, x: -20 }}
                    animate={showResponse ? { opacity: 1, x: 0 } : { opacity: 0.3, x: -20 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.3 }}
                  >
                    <div className={cn(
                      'w-11 h-11 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-500',
                      showResponse ? 'border-amber-500/60 bg-amber-500/10' : 'border-border bg-secondary'
                    )}>
                      <svg className="w-5 h-5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-bold text-foreground">Marketplace</p>
                      <p className="text-sm text-muted-foreground">Receives and holds escrow</p>
                    </div>
                  </motion.div>

                  {/* Connector line 2 */}
                  <div className="flex items-center pl-5 py-1">
                    <motion.div
                      className={cn(
                        'w-px h-6 transition-colors duration-500',
                        showResponse ? 'bg-gradient-to-b from-amber-500/40 to-purple-500/40' : 'bg-border/30'
                      )}
                      initial={{ scaleY: 0 }}
                      animate={showResponse ? { scaleY: 1 } : { scaleY: 0 }}
                      transition={{ duration: 0.4, delay: 0.5 }}
                      style={{ transformOrigin: 'top' }}
                    />
                    {showJson && (
                      <motion.span
                        className="text-xs text-muted-foreground/50 ml-6"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8 }}
                      >
                        verifies signature
                      </motion.span>
                    )}
                  </div>

                  {/* Node: Facilitator */}
                  <motion.div
                    className="flex items-center gap-4"
                    initial={{ opacity: 0, x: -20 }}
                    animate={showResponse ? { opacity: 1, x: 0 } : { opacity: 0.3, x: -20 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.5 }}
                  >
                    <div className={cn(
                      'w-11 h-11 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-500',
                      showResponse ? 'border-purple-500/60 bg-purple-500/10' : 'border-border bg-secondary'
                    )}>
                      <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-bold text-foreground">Facilitator</p>
                      <p className="text-sm text-muted-foreground">Coinbase payment verifier</p>
                    </div>
                  </motion.div>
                </div>

                {/* Chain badge */}
                <motion.div
                  className="mt-5 flex items-center justify-center"
                  initial={{ opacity: 0 }}
                  animate={showResponse ? { opacity: 1 } : { opacity: 0 }}
                  transition={{ delay: 0.8, duration: 0.4 }}
                >
                  <div className={cn(
                    'px-4 py-2 rounded-full border text-sm font-mono font-bold transition-all duration-500',
                    isComplete
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-success'
                      : 'border-cyan-500/30 bg-cyan-500/5 text-cyan-400'
                  )}>
                    Base Sepolia
                  </div>
                </motion.div>
              </div>
            </GlowCard>

            {/* Ready confirmation */}
            <AnimatePresence>
              {isComplete && (
                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                >
                  <GlowCard color="emerald" intensity="high" active>
                    <div className="p-5 flex items-center gap-4 relative overflow-hidden">
                      <ParticleBurst trigger={showBurst} color="emerald" particleCount={14} />
                      <motion.svg
                        className="w-7 h-7 text-success shrink-0 relative z-10"
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
                      <div className="relative z-10">
                        <p className="text-base font-bold text-success">Ready to Stream Payments</p>
                        <p className="text-sm text-muted-foreground">
                          X402 requirements parsed, network connected
                        </p>
                      </div>
                    </div>
                  </GlowCard>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </motion.div>
    </StepContainer>
  );
}
