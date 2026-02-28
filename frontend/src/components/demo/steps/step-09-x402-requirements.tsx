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
import { TypedText } from '../animations/typed-text';
import { cn } from '@/lib/utils';
import {
  fadeInLeft,
  fadeInRight,
  heroEntrance,
  blockDrop,
  scaleInBounce,
  glowPulse,
} from '@/lib/demo/motion-variants';
import { t } from '@/lib/demo/step-config';

// ---- Phase type ----
type Phase = 'idle' | 'request' | 'arrow' | 'response' | 'parsing' | 'parsed' | 'badges';

// ---- JSON fields to stagger-reveal ----
interface JsonField {
  key: string;
  value: string;
  valueColor: string;
}

// ---- Protocol badge definition ----
interface ProtocolBadge {
  header: string;
  desc: string;
  color: string;
  glowColor: string;
}

const PROTOCOL_BADGES: ProtocolBadge[] = [
  { header: 'Payment-Required', desc: 'Response header (402)', color: 'text-amber-400', glowColor: 'rgba(245, 158, 11, 0.3)' },
  { header: 'Payment-Signature', desc: 'Request header (signed)', color: 'text-blue-400', glowColor: 'rgba(59, 130, 246, 0.3)' },
  { header: 'Payment-Response', desc: 'Success response (200)', color: 'text-emerald-400', glowColor: 'rgba(16, 185, 129, 0.3)' },
  { header: 'paymentPayload', desc: 'Body field name (V2)', color: 'text-indigo-400', glowColor: 'rgba(99, 102, 241, 0.3)' },
];

export function Step09X402Requirements() {
  const { state, completeStep, presetData } = useDemoContext();
  const isActive = state.currentStep === 9;
  const [phase, setPhase] = useState<Phase>('idle');
  const [revealedJsonFields, setRevealedJsonFields] = useState(0);
  const [revealedBadges, setRevealedBadges] = useState(0);

  // Derive JSON fields from preset
  const jsonFields: JsonField[] = useMemo(() => [
    { key: 'x402Version', value: String(presetData.x402Config.version), valueColor: 'text-amber-400' },
    { key: 'scheme', value: '"exact"', valueColor: 'text-emerald-400' },
    { key: 'network', value: `"${presetData.x402Config.network}"`, valueColor: 'text-emerald-400' },
    { key: 'maxAmountRequired', value: `"${presetData.x402Config.maxAmountRequired}"`, valueColor: 'text-amber-400' },
    { key: 'resource', value: `"${presetData.x402Config.resourceUrl}"`, valueColor: 'text-emerald-400' },
    { key: 'payTo', value: `"${truncateAddress(CONTRACTS.marketplace.address)}"`, valueColor: 'text-emerald-400' },
    { key: 'requiredDeadlineSeconds', value: '300', valueColor: 'text-amber-400' },
    { key: 'description', value: `"${presetData.x402Config.description}"`, valueColor: 'text-emerald-400' },
  ], [presetData]);

  // Request lines to type
  const requestLines = useMemo(() => [
    `GET /v1/leases/${presetData.leaseTerms.leaseId}/access HTTP/1.1`,
    `Host: api.spacemarkets.io`,
    `Authorization: Bearer <jwt_token>`,
    `Accept: application/json`,
    `X-Chain-Id: ${presetData.x402Config.network}`,
  ], [presetData]);

  // Phase progression with timer cleanup
  useEffect(() => {
    if (!isActive) {
      setPhase('idle');
      setRevealedJsonFields(0);
      setRevealedBadges(0);
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];

    timers.push(setTimeout(() => setPhase('request'), t(200)));
    timers.push(setTimeout(() => setPhase('arrow'), t(1400)));
    timers.push(setTimeout(() => setPhase('response'), t(2000)));
    timers.push(setTimeout(() => setPhase('parsing'), t(2800)));

    // Stagger JSON field reveals
    jsonFields.forEach((_, idx) => {
      timers.push(setTimeout(() => {
        setRevealedJsonFields(idx + 1);
      }, t(3000 + idx * 180)));
    });

    // After all JSON fields, show badges phase
    const badgeStartMs = t(3000 + jsonFields.length * 180 + 200);
    timers.push(setTimeout(() => setPhase('badges'), badgeStartMs));

    PROTOCOL_BADGES.forEach((_, idx) => {
      timers.push(setTimeout(() => {
        setRevealedBadges(idx + 1);
      }, badgeStartMs + t(100 + idx * 200)));
    });

    // Final parsed state and completion
    const completeMs = badgeStartMs + t(PROTOCOL_BADGES.length * 200 + 400);
    timers.push(setTimeout(() => {
      setPhase('parsed');
      completeStep(9, {
        x402Version: presetData.x402Config.version,
        network: presetData.x402Config.network,
        facilitator: presetData.x402Config.facilitator,
        resourceUrl: presetData.x402Config.resourceUrl,
      });
    }, completeMs));

    return () => timers.forEach(clearTimeout);
  }, [isActive, completeStep, presetData, jsonFields]);

  const phaseIndex = ['idle', 'request', 'arrow', 'response', 'parsing', 'parsed', 'badges'].indexOf(phase);
  const showArrow = phaseIndex >= 2;
  const showResponse = phaseIndex >= 3;
  const showJson = phaseIndex >= 4;
  const showBadges = phaseIndex >= 5;

  return (
    <StepContainer stepNumber={9}>
      <motion.div
        variants={heroEntrance}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* Hero: HTTP Protocol Flow Visualization */}
        <div className="relative">
          {/* Dashed connection line between terminals */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none hidden lg:block"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <motion.line
              x1="48%"
              y1="50%"
              x2="52%"
              y2="50%"
              stroke="rgba(16, 185, 129, 0.15)"
              strokeWidth={1}
              strokeDasharray="4 6"
              initial={{ x1: '48%', x2: '48%' }}
              animate={showArrow ? { x1: '25%', x2: '75%' } : { x1: '48%', x2: '48%' }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            />
          </svg>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 relative">
            {/* Left Terminal: HTTP Request */}
            <motion.div variants={fadeInLeft}>
              <GlowCard
                color="blue"
                intensity={phase !== 'idle' ? 'medium' : 'low'}
                active={phase !== 'idle'}
                className="overflow-hidden"
              >
                {/* Terminal header */}
                <div className="px-4 py-2.5 border-b border-slate-800/60 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
                  </div>
                  <span className="text-sm px-1.5 py-0.5 rounded bg-blue-900/40 text-blue-300 font-bold ml-2">
                    GET
                  </span>
                  <code className="text-base font-mono text-slate-300 truncate">
                    /v1/leases/{presetData.leaseTerms.leaseId}/access
                  </code>
                </div>

                {/* Request body with TypedText */}
                <div className="px-4 py-3 space-y-1 font-mono text-[13px] min-h-[120px]">
                  {phase !== 'idle' && requestLines.map((line, idx) => (
                    <div key={idx} className="flex">
                      <span className="text-slate-700 mr-2 select-none w-4 text-right">{idx + 1}</span>
                      <TypedText
                        text={line}
                        speed={15}
                        delay={200 + idx * 250}
                        className={cn(
                          idx === 0 ? 'text-blue-400 font-bold' : 'text-slate-300'
                        )}
                        cursor={idx === requestLines.length - 1}
                      />
                    </div>
                  ))}
                  {phase === 'idle' && (
                    <div className="text-slate-700 italic text-base">Awaiting request...</div>
                  )}
                </div>
              </GlowCard>
            </motion.div>



            {/* Right Terminal: 402 Response */}
            <motion.div variants={blockDrop} initial="hidden" animate={showResponse ? "visible" : "hidden"}>
              <motion.div variants={glowPulse} initial="idle" animate={showResponse ? "active" : "idle"} className="rounded-2xl">
                <GlowCard
                  color="amber"
                  intensity={showResponse ? 'high' : 'low'}
                  active={showResponse}
                  className="overflow-hidden"
                >
                  {/* Terminal header */}
                  <div className="px-4 py-2.5 border-b border-slate-800/60 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
                      </div>
                      <motion.span
                        className="text-sm px-1.5 py-0.5 rounded bg-amber-900/40 text-amber-300 font-bold ml-2"
                        animate={showResponse ? {
                          boxShadow: [
                            '0 0 0px rgba(245, 158, 11, 0)',
                            '0 0 20px rgba(245, 158, 11, 0.6)',
                            '0 0 8px rgba(245, 158, 11, 0.3)',
                          ],
                        } : {}}
                        transition={{ duration: 0.8 }}
                      >
                        402
                      </motion.span>
                      <span className="text-base text-amber-400 font-medium">
                        {showResponse ? 'Payment Required' : '...'}
                      </span>
                    </div>
                    <motion.span
                      key={`x402-${phase === 'parsed' ? 'static' : 'anim'}`}
                      className="text-sm px-1.5 py-0.5 rounded bg-emerald-900/30 text-emerald-300 border border-emerald-800/40 font-mono"
                      animate={showResponse ? {
                        boxShadow: [
                          '0 0 0px rgba(16, 185, 129, 0)',
                          '0 0 12px rgba(16, 185, 129, 0.5)',
                          '0 0 4px rgba(16, 185, 129, 0.2)',
                        ],
                      } : { boxShadow: '0 0 0px rgba(16, 185, 129, 0)' }}
                      transition={{ duration: 1.5, repeat: phase === 'parsed' ? 0 : Infinity, repeatType: 'reverse' }}
                    >
                      X402 V2
                    </motion.span>
                  </div>

                  {/* Response headers */}
                  <AnimatePresence>
                    {showResponse && (
                      <motion.div
                        className="px-4 py-3 border-b border-slate-800/40 font-mono text-[13px] space-y-1"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <div className="text-slate-300">
                          HTTP/1.1 <span className="text-amber-400 font-bold">402 Payment Required</span>
                        </div>
                        <div className="text-slate-300">
                          Content-Type: <span className="text-slate-300">application/json</span>
                        </div>
                        <motion.div
                          key={`payreq-${phase === 'parsed' ? 'static' : 'anim'}`}
                          className="text-amber-500/80"
                          animate={phase !== 'parsed' ? {
                            textShadow: [
                              '0 0 0px rgba(245, 158, 11, 0)',
                              '0 0 8px rgba(245, 158, 11, 0.5)',
                              '0 0 0px rgba(245, 158, 11, 0)',
                            ],
                          } : { textShadow: '0 0 0px rgba(245, 158, 11, 0)' }}
                          transition={{ duration: 2, repeat: phase === 'parsed' ? 0 : Infinity }}
                        >
                          Payment-Required: <span className="text-amber-400">{'<payment-requirements-json>'}</span>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Hint area */}
                  <div className="px-4 py-3 min-h-[40px]">
                    {showResponse && !showJson && (
                      <motion.p
                        className="text-base text-slate-300"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        Parsing payment requirements...
                      </motion.p>
                    )}
                    {showJson && (
                      <motion.p
                        className="text-base text-emerald-400/70"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        Requirements object extracted successfully.
                      </motion.p>
                    )}
                  </div>
                </GlowCard>
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Bottom section: JSON Requirements + Protocol Badges */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Payment Requirements JSON (2 cols) */}
          <motion.div
            className="xl:col-span-2"
            variants={fadeInLeft}
          >
            <GlowCard
              color="emerald"
              intensity={showJson ? 'medium' : 'low'}
              active={showJson}
              className="overflow-hidden"
            >
              <div className="px-4 py-2.5 border-b border-slate-800/60 flex items-center justify-between">
                <h4 className="text-sm font-bold uppercase tracking-widest text-slate-300">
                  Payment Requirements
                </h4>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-slate-300">application/json</span>
                  {showJson && (
                    <motion.div
                      key={`json-${phase === 'parsed' ? 'static' : 'anim'}`}
                      className="w-2 h-2 rounded-full bg-emerald-400"
                      animate={phase !== 'parsed' ? {
                        boxShadow: [
                          '0 0 0px rgba(16, 185, 129, 0)',
                          '0 0 8px rgba(16, 185, 129, 0.8)',
                          '0 0 0px rgba(16, 185, 129, 0)',
                        ],
                      } : { boxShadow: '0 0 0px rgba(16, 185, 129, 0)' }}
                      transition={{ duration: 1.5, repeat: phase === 'parsed' ? 0 : Infinity }}
                    />
                  )}
                </div>
              </div>

              <div className="p-4 font-mono text-[13px] leading-relaxed">
                {/* Opening brace */}
                <motion.div
                  className="text-slate-300"
                  initial={{ opacity: 0 }}
                  animate={showJson ? { opacity: 1 } : { opacity: 0.3 }}
                  transition={{ duration: 0.3 }}
                >
                  {'{'}
                </motion.div>

                {/* JSON fields with staggered reveal */}
                <div className="pl-4 space-y-0.5">
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
                            className="absolute inset-0 -mx-2 rounded bg-emerald-500/10"
                            initial={{ opacity: 0.6 }}
                            animate={{ opacity: 0 }}
                            transition={{ duration: 0.8 }}
                          />
                        )}
                        <span className="text-blue-400">&quot;{field.key}&quot;</span>
                        <span className="text-slate-300">: </span>
                        <span className={cn(field.valueColor, 'break-all')}>{field.value}</span>
                        {idx < jsonFields.length - 1 && <span className="text-slate-300">,</span>}
                      </motion.div>
                    );
                  })}
                </div>

                {/* Closing brace */}
                <motion.div
                  className="text-slate-300"
                  initial={{ opacity: 0 }}
                  animate={revealedJsonFields >= jsonFields.length ? { opacity: 1 } : { opacity: 0.3 }}
                  transition={{ duration: 0.3 }}
                >
                  {'}'}
                </motion.div>
              </div>
            </GlowCard>
          </motion.div>

          {/* X402 V2 Protocol Badges (1 col) */}
          <motion.div variants={fadeInRight} className="space-y-4">
            <GlowCard
              color="indigo"
              intensity={showBadges ? 'medium' : 'low'}
              active={showBadges}
              className="overflow-hidden"
            >
              <div className="px-4 py-2.5 border-b border-slate-800/60 flex items-center justify-between">
                <h4 className="text-sm font-bold uppercase tracking-widest text-slate-300">
                  X402 V2 Protocol
                </h4>
                <motion.div
                  key={`active-${phase === 'parsed' ? 'static' : 'anim'}`}
                  className="text-sm font-mono text-emerald-400"
                  animate={showBadges && phase !== 'parsed' ? { opacity: [0.5, 1, 0.5] } : { opacity: 0.5 }}
                  transition={{ duration: 2, repeat: phase === 'parsed' ? 0 : Infinity }}
                >
                  ACTIVE
                </motion.div>
              </div>

              <div className="p-4 space-y-2">
                {PROTOCOL_BADGES.map((badge, idx) => {
                  const isRevealed = idx < revealedBadges;
                  return <motion.div
                    key={badge.header}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg relative overflow-hidden"
                    initial={{ opacity: 0, x: idx % 2 === 0 ? -50 : 50, y: 50, scale: 0.5 }}
                    animate={isRevealed ? {
                      opacity: 1,
                      x: 0,
                      y: 0,
                      scale: 1,
                      boxShadow: [
                        `0 0 0px ${badge.glowColor}`,
                        `0 0 20px ${badge.glowColor}`,
                        `0 0 5px ${badge.glowColor}`,
                      ],
                    } : {
                      opacity: 0,
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 20,
                      boxShadow: { duration: 0.8 },
                    }}
                  >
                    {/* Background flare */}
                    {isRevealed && (
                      <motion.div
                        className="absolute inset-0 z-0 opacity-20"
                        style={{ backgroundColor: badge.glowColor }}
                        initial={{ scale: 0 }}
                        animate={{ scale: [0, 1.5, 1] }}
                        transition={{ duration: 0.5 }}
                      />
                    )}
                    <code className={cn('text-sm font-mono font-bold z-10', badge.color)}>
                      {badge.header}
                    </code>
                    <span className="text-sm text-slate-300 z-10">{badge.desc}</span>
                  </motion.div>
                })}
              </div>
            </GlowCard>

            {/* Connection Status */}
            <GlowCard
              color="cyan"
              intensity={showResponse ? 'low' : 'low'}
              active={showResponse}
            >
              <div className="p-4 space-y-3">
                <h4 className="text-sm font-bold uppercase tracking-widest text-slate-300">
                  Connection
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <motion.div
                      key={`conn1-${phase === 'parsed' ? 'static' : 'anim'}`}
                      className="w-2 h-2 rounded-full"
                      animate={showResponse && phase !== 'parsed' ? {
                        backgroundColor: ['#10B981', '#10B981'],
                        boxShadow: [
                          '0 0 0px rgba(16, 185, 129, 0)',
                          '0 0 8px rgba(16, 185, 129, 0.8)',
                          '0 0 0px rgba(16, 185, 129, 0)',
                        ],
                      } : {
                        backgroundColor: showResponse ? '#10B981' : '#475569',
                        boxShadow: '0 0 0px rgba(16, 185, 129, 0)',
                      }}
                      transition={{ duration: 2, repeat: phase === 'parsed' ? 0 : Infinity }}
                    />
                    <span className="text-sm text-slate-300">Facilitator</span>
                    <code className="text-sm font-mono text-indigo-400 ml-auto">
                      {truncateAddress(presetData.x402Config.facilitator, 4)}
                    </code>
                  </div>
                  <div className="flex items-center gap-2">
                    <motion.div
                      key={`conn2-${phase === 'parsed' ? 'static' : 'anim'}`}
                      className="w-2 h-2 rounded-full"
                      animate={showResponse && phase !== 'parsed' ? {
                        backgroundColor: ['#06B6D4', '#06B6D4'],
                        boxShadow: [
                          '0 0 0px rgba(6, 182, 212, 0)',
                          '0 0 8px rgba(6, 182, 212, 0.8)',
                          '0 0 0px rgba(6, 182, 212, 0)',
                        ],
                      } : {
                        backgroundColor: showResponse ? '#06B6D4' : '#475569',
                        boxShadow: '0 0 0px rgba(6, 182, 212, 0)',
                      }}
                      transition={{ duration: 2, repeat: phase === 'parsed' ? 0 : Infinity, delay: 0.5 }}
                    />
                    <span className="text-sm text-slate-300">Network</span>
                    <span className="text-sm font-mono text-cyan-400 ml-auto">
                      {presetData.x402Config.network}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <motion.div
                      key={`conn3-${phase === 'parsed' ? 'static' : 'anim'}`}
                      className="w-2 h-2 rounded-full"
                      animate={showJson && phase !== 'parsed' ? {
                        backgroundColor: ['#F59E0B', '#F59E0B'],
                        boxShadow: [
                          '0 0 0px rgba(245, 158, 11, 0)',
                          '0 0 8px rgba(245, 158, 11, 0.8)',
                          '0 0 0px rgba(245, 158, 11, 0)',
                        ],
                      } : {
                        backgroundColor: showJson ? '#F59E0B' : '#475569',
                        boxShadow: '0 0 0px rgba(245, 158, 11, 0)',
                      }}
                      transition={{ duration: 2, repeat: phase === 'parsed' ? 0 : Infinity, delay: 1 }}
                    />
                    <span className="text-sm text-slate-300">Pay To</span>
                    <code className="text-sm font-mono text-amber-400 ml-auto">
                      {truncateAddress(CONTRACTS.marketplace.address, 4)}
                    </code>
                  </div>
                </div>
              </div>
            </GlowCard>
          </motion.div>
        </div>
      </motion.div>
    </StepContainer>
  );
}
