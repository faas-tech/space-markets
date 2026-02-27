'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StepContainer } from '../step-container';
import { useDemoContext } from '../demo-provider';
import {
  CONTRACTS,
  DEPLOYER,
  BLOCK_NUMBERS,
  TX_HASHES,
  truncateAddress,
  truncateHash,
} from '@/lib/demo/demo-data';
import { GlowCard } from '../animations/glow-card';
import { ParticleBurst } from '../animations/particle-burst';
import { TypedText } from '../animations/typed-text';
import { cn } from '@/lib/utils';
import { fadeInRight } from '@/lib/demo/motion-variants';

// ---- Types ----

interface ContractNode {
  id: string;
  name: string;
  address: string;
  pattern: string;
  description: string;
  x: number;
  y: number;
  deployed: boolean;
}

type DeployPhase = 'idle' | 'materializing' | 'deploying' | 'connecting' | 'complete';

// ---- Node layout positions (hex-ish grid) ----
// Arranged as a pentagonal formation for 5 contract nodes
const NODE_POSITIONS: { x: number; y: number }[] = [
  { x: 200, y: 40 },   // top center — AssetRegistry
  { x: 360, y: 120 },  // right — AssetERC20
  { x: 310, y: 260 },  // bottom right — LeaseFactory
  { x: 90, y: 260 },   // bottom left — Marketplace
  { x: 40, y: 120 },   // left — MetadataStorage
];

// Connection lines between nodes (indices into NODE_POSITIONS)
const CONNECTIONS: [number, number][] = [
  [0, 1], [0, 4], [1, 2], [2, 3], [3, 4], // outer ring
  [0, 2], [0, 3], // inner cross connections
];

export function Step01Deploy() {
  const { state, completeStep } = useDemoContext();
  const isActive = state.currentStep === 1;
  const [phase, setPhase] = useState<DeployPhase>('idle');
  const [deployedCount, setDeployedCount] = useState(0);
  const [connectionsDrawn, setConnectionsDrawn] = useState(0);
  const [showBurst, setShowBurst] = useState(false);

  const contractEntries = useMemo(() => Object.entries(CONTRACTS), []);

  const nodes: ContractNode[] = useMemo(
    () =>
      contractEntries.map(([id, contract], idx) => ({
        id,
        name: contract.name,
        address: contract.address,
        pattern: contract.pattern,
        description: contract.description,
        x: NODE_POSITIONS[idx].x,
        y: NODE_POSITIONS[idx].y,
        deployed: idx < deployedCount,
      })),
    [contractEntries, deployedCount]
  );

  // Phase sequencing
  useEffect(() => {
    if (!isActive) {
      setPhase('idle');
      setDeployedCount(0);
      setConnectionsDrawn(0);
      setShowBurst(false);
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];

    // Phase 1: Grid materializes
    timers.push(setTimeout(() => setPhase('materializing'), 200));

    // Phase 2: Deploy nodes sequentially
    timers.push(setTimeout(() => setPhase('deploying'), 600));
    contractEntries.forEach((_, idx) => {
      timers.push(
        setTimeout(() => {
          setDeployedCount(idx + 1);
        }, 800 + idx * 600)
      );
    });

    // Phase 3: Draw connection lines
    const afterDeploy = 800 + contractEntries.length * 600 + 300;
    timers.push(setTimeout(() => setPhase('connecting'), afterDeploy));
    CONNECTIONS.forEach((_, idx) => {
      timers.push(
        setTimeout(() => {
          setConnectionsDrawn(idx + 1);
        }, afterDeploy + 100 + idx * 200)
      );
    });

    // Phase 4: Complete with burst
    const afterConnect = afterDeploy + 100 + CONNECTIONS.length * 200 + 400;
    timers.push(
      setTimeout(() => {
        setPhase('complete');
        setShowBurst(true);
      }, afterConnect)
    );

    // Complete step
    timers.push(
      setTimeout(() => {
        completeStep(1, {
          deployer: DEPLOYER,
          contractsDeployed: contractEntries.length,
          network: 'Base Sepolia',
        });
      }, afterConnect + 300)
    );

    return () => timers.forEach(clearTimeout);
  }, [isActive, completeStep, contractEntries]);

  return (
    <StepContainer stepNumber={1}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hero: Blockchain Node Grid */}
        <div className="lg:col-span-2">
          <div className="relative w-full" style={{ minHeight: 340 }}>
            {/* Background hex grid pattern */}
            <motion.div
              className="absolute inset-0 opacity-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: phase !== 'idle' ? 0.08 : 0 }}
              transition={{ duration: 1.5 }}
            >
              <svg width="100%" height="100%" className="absolute inset-0">
                <defs>
                  <pattern id="hexgrid" width="30" height="26" patternUnits="userSpaceOnUse">
                    <path
                      d="M15 0 L30 7.5 L30 22.5 L15 30 L0 22.5 L0 7.5 Z"
                      fill="none"
                      stroke="rgba(168, 85, 247, 0.3)"
                      strokeWidth="0.5"
                      transform="scale(0.85)"
                    />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#hexgrid)" />
              </svg>
            </motion.div>

            {/* SVG Canvas for nodes and connections */}
            <svg
              viewBox="0 0 400 310"
              className="w-full h-auto relative z-10"
              style={{ maxHeight: 340 }}
            >
              <defs>
                {/* Glow filters for nodes */}
                <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feFlood floodColor="rgba(168, 85, 247, 0.6)" result="color" />
                  <feComposite in="color" in2="blur" operator="in" result="shadow" />
                  <feMerge>
                    <feMergeNode in="shadow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="completeGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="10" result="blur" />
                  <feFlood floodColor="rgba(16, 185, 129, 0.5)" result="color" />
                  <feComposite in="color" in2="blur" operator="in" result="shadow" />
                  <feMerge>
                    <feMergeNode in="shadow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(168, 85, 247, 0.6)" />
                  <stop offset="100%" stopColor="rgba(6, 182, 212, 0.6)" />
                </linearGradient>
              </defs>

              {/* Connection lines with pathLength animation */}
              {CONNECTIONS.map(([fromIdx, toIdx], idx) => {
                const from = NODE_POSITIONS[fromIdx];
                const to = NODE_POSITIONS[toIdx];
                const isVisible = idx < connectionsDrawn;
                return (
                  <motion.line
                    key={`conn-${fromIdx}-${toIdx}`}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke="url(#lineGrad)"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={
                      isVisible
                        ? { pathLength: 1, opacity: 0.7 }
                        : { pathLength: 0, opacity: 0 }
                    }
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  />
                );
              })}

              {/* Contract nodes */}
              {nodes.map((node, idx) => {
                const isDeployed = node.deployed;
                const isActive = idx < deployedCount;
                return (
                  <g key={node.id}>
                    {/* Node outer ring */}
                    <motion.circle
                      cx={node.x}
                      cy={node.y}
                      r={22}
                      fill="none"
                      stroke={
                        phase === 'complete'
                          ? 'rgba(16, 185, 129, 0.5)'
                          : isDeployed
                          ? 'rgba(168, 85, 247, 0.6)'
                          : 'rgba(100, 116, 139, 0.2)'
                      }
                      strokeWidth={2}
                      filter={isDeployed ? (phase === 'complete' ? 'url(#completeGlow)' : 'url(#nodeGlow)') : undefined}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={
                        isActive
                          ? { scale: 1, opacity: 1 }
                          : { scale: 0, opacity: 0 }
                      }
                      transition={{
                        type: 'spring',
                        stiffness: 300,
                        damping: 20,
                        delay: idx * 0.1,
                      }}
                    />
                    {/* Node inner dot */}
                    <motion.circle
                      cx={node.x}
                      cy={node.y}
                      r={8}
                      fill={
                        phase === 'complete'
                          ? 'rgba(16, 185, 129, 0.8)'
                          : isDeployed
                          ? 'rgba(168, 85, 247, 0.8)'
                          : 'rgba(100, 116, 139, 0.3)'
                      }
                      initial={{ scale: 0, opacity: 0 }}
                      animate={
                        isActive
                          ? { scale: 1, opacity: 1 }
                          : { scale: 0, opacity: 0 }
                      }
                      transition={{
                        type: 'spring',
                        stiffness: 400,
                        damping: 15,
                        delay: idx * 0.1 + 0.15,
                      }}
                    />
                    {/* Pulse animation on deploy */}
                    {isDeployed && phase !== 'complete' && (
                      <motion.circle
                        cx={node.x}
                        cy={node.y}
                        r={22}
                        fill="none"
                        stroke="rgba(168, 85, 247, 0.4)"
                        strokeWidth={1}
                        initial={{ scale: 1, opacity: 0.6 }}
                        animate={{ scale: 2, opacity: 0 }}
                        transition={{
                          duration: 1.2,
                          repeat: Infinity,
                          ease: 'easeOut',
                        }}
                      />
                    )}
                    {/* Node label */}
                    <AnimatePresence>
                      {isDeployed && (
                        <motion.g
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: 0.2 }}
                        >
                          <text
                            x={node.x}
                            y={node.y + 36}
                            textAnchor="middle"
                            className="fill-slate-200 text-[11px] font-bold"
                            style={{ fontFamily: 'ui-monospace, monospace', fontSize: '11px' }}
                          >
                            {node.name}
                          </text>
                          <text
                            x={node.x}
                            y={node.y + 48}
                            textAnchor="middle"
                            className="fill-purple-400 text-[9px]"
                            style={{ fontFamily: 'ui-monospace, monospace', fontSize: '9px' }}
                          >
                            {truncateAddress(node.address, 4)}
                          </text>
                        </motion.g>
                      )}
                    </AnimatePresence>
                  </g>
                );
              })}
            </svg>

            {/* Completion glow overlay + particle burst */}
            {phase === 'complete' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <motion.div
                  className="w-32 h-32 rounded-full"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{
                    opacity: [0, 0.3, 0],
                    scale: [0.5, 2.5, 3],
                  }}
                  transition={{ duration: 1.5, ease: 'easeOut' }}
                  style={{
                    background:
                      'radial-gradient(circle, rgba(16,185,129,0.3) 0%, transparent 70%)',
                  }}
                />
                <ParticleBurst trigger={showBurst} color="emerald" particleCount={18} />
              </div>
            )}
          </div>
        </div>

        {/* Side panel — slides in from right */}
        <motion.div
          className="space-y-4"
          variants={fadeInRight}
          initial="hidden"
          animate={phase !== 'idle' ? 'visible' : 'hidden'}
        >
          {/* Deployment info card */}
          <GlowCard color="purple" active={phase === 'complete'} delay={0.3}>
            <div className="p-5">
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">
                Deployment Info
              </h4>
              <div className="space-y-3">
                <div>
                  <span className="text-xs text-slate-600 uppercase tracking-wider block mb-0.5">
                    Deployer
                  </span>
                  <code className="text-sm font-mono text-purple-400">
                    {truncateAddress(DEPLOYER)}
                  </code>
                </div>
                <div>
                  <span className="text-xs text-slate-600 uppercase tracking-wider block mb-0.5">
                    Network
                  </span>
                  <span className="text-sm text-slate-300">Base Sepolia (84532)</span>
                </div>
                <div>
                  <span className="text-xs text-slate-600 uppercase tracking-wider block mb-0.5">
                    Pattern
                  </span>
                  <span className="text-sm text-purple-300">UUPS Transparent Proxy</span>
                </div>
                <div>
                  <span className="text-xs text-slate-600 uppercase tracking-wider block mb-0.5">
                    Block
                  </span>
                  <span className="text-sm font-mono text-amber-400">
                    #{BLOCK_NUMBERS.deployBlock.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-600 uppercase tracking-wider block mb-0.5">
                    Contracts
                  </span>
                  <span className="text-sm text-slate-300">
                    {deployedCount} / {contractEntries.length} deployed
                  </span>
                </div>
              </div>
            </div>
          </GlowCard>

          {/* Transaction hash card */}
          <GlowCard color="purple" intensity="low" active={deployedCount > 0} delay={0.5}>
            <div className="p-5">
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
                Transaction
              </h4>
              <div className="space-y-2">
                <div>
                  <span className="text-xs text-slate-600 uppercase tracking-wider block mb-0.5">
                    Tx Hash
                  </span>
                  {deployedCount > 0 ? (
                    <TypedText
                      text={truncateHash(TX_HASHES.deploy)}
                      speed={20}
                      className="text-sm font-mono text-cyan-400"
                      cursor={false}
                    />
                  ) : (
                    <span className="text-sm font-mono text-slate-700">pending...</span>
                  )}
                </div>
              </div>
            </div>
          </GlowCard>

          {/* Deployed contract list */}
          <AnimatePresence>
            {deployedCount > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-2 overflow-hidden"
              >
                {nodes.filter((n) => n.deployed).map((node, idx) => (
                  <motion.div
                    key={node.id}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors',
                      phase === 'complete'
                        ? 'border-emerald-500/20 bg-emerald-950/20'
                        : 'border-purple-500/10 bg-slate-900/40'
                    )}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      type: 'spring',
                      stiffness: 200,
                      damping: 20,
                      delay: idx * 0.05,
                    }}
                  >
                    <motion.div
                      className={cn(
                        'w-5 h-5 rounded-full flex items-center justify-center shrink-0',
                        phase === 'complete'
                          ? 'bg-emerald-500/20'
                          : 'bg-purple-500/20'
                      )}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                    >
                      <motion.svg
                        className={cn(
                          'w-3 h-3',
                          phase === 'complete' ? 'text-emerald-400' : 'text-purple-400'
                        )}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <motion.path
                          d="M5 13l4 4L19 7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.3, delay: 0.1 }}
                        />
                      </motion.svg>
                    </motion.div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[13px] font-bold text-slate-300 block truncate">
                        {node.name}
                      </span>
                      <code className="text-[11px] font-mono text-purple-400/70 truncate block">
                        {truncateAddress(node.address, 4)}
                      </code>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </StepContainer>
  );
}
