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
import { t } from '@/lib/demo/step-config';

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
  cluster: 'a' | 'b';
}

// No complex deploy phases, just numerical sequencing
// 1. Asset Header
// 2. Metadata Storage (4)
// 3. Asset Registry (0)
// 4. Asset ERC20 (1)
// 5. Market Header
// 6. Marketplace (3)
// 7. LeaseFactory (2)
// 8. Connections
// 9. Complete

// ---- Two-column vertical stack layout ----
// Cluster A (Asset Infrastructure) — LEFT column, 3 cards stacked top→bottom
// Cluster B (Market Infrastructure) — RIGHT column, 2 cards stacked top→bottom
// Bridge connections run horizontally between aligned rows
//
// Contract order in CONTRACTS: assetRegistry(0), assetERC20(1), leaseFactory(2), marketplace(3), metadataStorage(4)
// Cluster A uses indices 4, 0, 1 — Cluster B uses indices 3, 2

const NODE_POSITIONS: { x: number; y: number }[] = [
  { x: 105, y: 145 }, // 0 — AssetRegistry (Cluster A, row 2)
  { x: 105, y: 220 }, // 1 — AssetERC20 (Cluster A, row 3)
  { x: 375, y: 220 }, // 2 — LeaseFactory (Cluster B, row 2)
  { x: 375, y: 145 }, // 3 — Marketplace (Cluster B, row 1)
  { x: 105, y: 70 },  // 4 — MetadataStorage (Cluster A, row 1)
];

const CLUSTER_A_INDICES = [4, 0, 1];
const CLUSTER_B_INDICES = [3, 2];

// Vertical chain connections (top→middle→bottom in each column)
const CLUSTER_A_CONNECTIONS: [number, number][] = [
  [4, 0], [0, 1],
];

const CLUSTER_B_CONNECTIONS: [number, number][] = [
  [3, 2],
];

// Horizontal bridges between aligned rows
const BRIDGE_CONNECTIONS: [number, number][] = [
  [0, 3], // AssetRegistry(105,145) ↔ Marketplace(375,145) — horizontal
  [1, 2], // AssetERC20(105,220) ↔ LeaseFactory(375,220) — horizontal
];

// Card dimensions (SVG units)
const CARD_W = 100;
const CARD_H = 50;
const CARD_RX = 6;
const HEADER_H = 12;

export function Step01Deploy() {
  const { state, completeStep } = useDemoContext();
  const isActive = state.currentStep === 1;
  const [seqStep, setSeqStep] = useState(0);
  const [showBurst, setShowBurst] = useState(false);

  const contractEntries = useMemo(() => Object.entries(CONTRACTS), []);

  const nodes: ContractNode[] = useMemo(
    () =>
      contractEntries.map(([id, contract], idx) => {
        let isDeployed = false;
        if (idx === 4) isDeployed = seqStep >= 2; // Metadata Storage (A)
        if (idx === 0) isDeployed = seqStep >= 3; // Asset Registry (A)
        if (idx === 1) isDeployed = seqStep >= 4; // Asset ERC20 (A)
        if (idx === 3) isDeployed = seqStep >= 7; // Marketplace (B)
        if (idx === 2) isDeployed = seqStep >= 8; // Lease Factory (B)

        return {
          id,
          name: contract.name,
          address: contract.address,
          pattern: contract.pattern,
          description: contract.description,
          x: NODE_POSITIONS[idx].x,
          y: NODE_POSITIONS[idx].y,
          deployed: isDeployed,
          cluster: CLUSTER_A_INDICES.includes(idx) ? 'a' : 'b',
        };
      }),
    [contractEntries, seqStep]
  );

  let deployedCount = 0;
  if (seqStep >= 2) deployedCount = 1;
  if (seqStep >= 3) deployedCount = 2;
  if (seqStep >= 4) deployedCount = 3;
  if (seqStep >= 7) deployedCount = 4;
  if (seqStep >= 8) deployedCount = 5;

  // ---- Phase sequencing — split into Pillar A, Pillar B, then Bridge ----
  useEffect(() => {
    if (!isActive) {
      setSeqStep(0);
      setShowBurst(false);
      return;
    }

    setSeqStep(0);
    setShowBurst(false);

    const timers: ReturnType<typeof setTimeout>[] = [];

    // Pilllar A (Asset Infrastructure)
    timers.push(setTimeout(() => setSeqStep(1), t(300)));  // Header A
    timers.push(setTimeout(() => setSeqStep(2), t(900)));  // Metadata
    timers.push(setTimeout(() => setSeqStep(3), t(1500))); // Registry
    timers.push(setTimeout(() => setSeqStep(4), t(2100))); // ERC20
    timers.push(setTimeout(() => setSeqStep(5), t(2800))); // Pillar A Connect

    // Pillar B (Market Infrastructure)
    timers.push(setTimeout(() => setSeqStep(6), t(3800))); // Header B
    timers.push(setTimeout(() => setSeqStep(7), t(4400))); // Marketplace
    timers.push(setTimeout(() => setSeqStep(8), t(5000))); // Factory
    timers.push(setTimeout(() => setSeqStep(9), t(5700))); // Pillar B Connect

    // Cross-Pillar Bridge
    timers.push(setTimeout(() => setSeqStep(10), t(6800))); // Bridge Connection

    // Complete
    timers.push(
      setTimeout(() => {
        setSeqStep(11);
        setShowBurst(true);
        completeStep(1, {
          deployer: DEPLOYER,
          contractsDeployed: contractEntries.length,
          network: 'Base Sepolia',
        });
      }, t(8000))
    );

    return () => timers.forEach(clearTimeout);
  }, [isActive, completeStep, contractEntries, state.activePreset]);

  // ---- Color helpers ----

  const getStrokeColor = (cluster: 'a' | 'b', deployed: boolean) => {
    if (seqStep >= 11) return 'rgba(16, 185, 129, 0.7)';
    if (!deployed) return 'rgba(100, 116, 139, 0.2)';
    return cluster === 'a' ? 'rgba(99, 102, 241, 0.7)' : 'rgba(245, 158, 11, 0.7)';
  };

  const getHeaderFill = (cluster: 'a' | 'b', deployed: boolean) => {
    if (seqStep >= 11) return 'rgba(16, 185, 129, 0.15)';
    if (!deployed) return 'rgba(100, 116, 139, 0.08)';
    return cluster === 'a' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(245, 158, 11, 0.15)';
  };

  const getStatusDotColor = (cluster: 'a' | 'b') => {
    if (seqStep >= 11) return 'rgba(16, 185, 129, 0.9)';
    return cluster === 'a' ? 'rgba(99, 102, 241, 0.9)' : 'rgba(245, 158, 11, 0.9)';
  };

  const showCanvas = seqStep !== 0;

  return (
    <StepContainer stepNumber={1}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hero: Two-Cluster Network */}
        <div className="lg:col-span-2">
          <div className="relative w-full" style={{ minHeight: 340 }}>
            {/* Background hex grid */}
            <motion.div
              className="absolute inset-0 opacity-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: showCanvas ? 0.08 : 0 }}
              transition={{ duration: 1.5 }}
            >
              <svg width="100%" height="100%" className="absolute inset-0">
                <defs>
                  <pattern id="hexgrid" width="30" height="26" patternUnits="userSpaceOnUse">
                    <path
                      d="M15 0 L30 7.5 L30 22.5 L15 30 L0 22.5 L0 7.5 Z"
                      fill="none"
                      stroke="rgba(99, 102, 241, 0.3)"
                      strokeWidth="0.5"
                      transform="scale(0.85)"
                    />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#hexgrid)" />
              </svg>
            </motion.div>

            {/* SVG Canvas */}
            <svg
              viewBox="0 0 480 310"
              className="w-full h-auto relative z-10"
              style={{ maxHeight: 340 }}
            >
              <defs>
                {/* Glow filters */}
                <filter id="nodeGlowA" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feFlood floodColor="rgba(99, 102, 241, 0.5)" result="color" />
                  <feComposite in="color" in2="blur" operator="in" result="shadow" />
                  <feMerge>
                    <feMergeNode in="shadow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="nodeGlowB" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feFlood floodColor="rgba(245, 158, 11, 0.5)" result="color" />
                  <feComposite in="color" in2="blur" operator="in" result="shadow" />
                  <feMerge>
                    <feMergeNode in="shadow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="completeGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="8" result="blur" />
                  <feFlood floodColor="rgba(16, 185, 129, 0.4)" result="color" />
                  <feComposite in="color" in2="blur" operator="in" result="shadow" />
                  <feMerge>
                    <feMergeNode in="shadow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="sparkGlow" x="-200%" y="-200%" width="500%" height="500%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Connection gradients */}
                <linearGradient id="lineGradA" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(99, 102, 241, 0.5)" />
                  <stop offset="100%" stopColor="rgba(99, 102, 241, 0.25)" />
                </linearGradient>
                <linearGradient id="lineGradB" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(245, 158, 11, 0.5)" />
                  <stop offset="100%" stopColor="rgba(245, 158, 11, 0.25)" />
                </linearGradient>
              </defs>

              {/* ---- Cluster A internal connections ---- */}
              {CLUSTER_A_CONNECTIONS.map(([fromIdx, toIdx], idx) => {
                const from = NODE_POSITIONS[fromIdx];
                const to = NODE_POSITIONS[toIdx];
                const isVisible = seqStep >= 5;
                return (
                  <motion.line
                    key={`conn-a-${fromIdx}-${toIdx}`}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke="url(#lineGradA)"
                    strokeWidth={2}
                    strokeLinecap="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={
                      isVisible
                        ? { pathLength: 1, opacity: 0.8 }
                        : { pathLength: 0, opacity: 0 }
                    }
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  />
                );
              })}

              {/* ---- Cluster B internal connections ---- */}
              {CLUSTER_B_CONNECTIONS.map(([fromIdx, toIdx], idx) => {
                const from = NODE_POSITIONS[fromIdx];
                const to = NODE_POSITIONS[toIdx];
                const isVisible = seqStep >= 9;
                return (
                  <motion.line
                    key={`conn-b-${fromIdx}-${toIdx}`}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke="url(#lineGradB)"
                    strokeWidth={2}
                    strokeLinecap="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={
                      isVisible
                        ? { pathLength: 1, opacity: 0.8 }
                        : { pathLength: 0, opacity: 0 }
                    }
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  />
                );
              })}

              {/* ---- Bridge connections: track + bidirectional sparks ---- */}
              {BRIDGE_CONNECTIONS.map(([fromIdx, toIdx], idx) => {
                const from = NODE_POSITIONS[fromIdx];
                const to = NODE_POSITIONS[toIdx];
                const isVisible = seqStep >= 10;
                return (
                  <g key={`bridge-${fromIdx}-${toIdx}`}>
                    {/* Faint background track */}
                    <motion.line
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      stroke="rgba(16, 185, 129, 0.2)"
                      strokeWidth={3}
                      strokeLinecap="round"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={
                        isVisible
                          ? { pathLength: 1, opacity: 1 }
                          : { pathLength: 0, opacity: 0 }
                      }
                      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                    />
                    {/* Forward spark: Asset → Market (emerald) */}
                    {isVisible && (
                      <motion.circle
                        cx={from.x}
                        cy={from.y}
                        r={3.5}
                        fill="#10B981"
                        filter="url(#sparkGlow)"
                        initial={{ x: 0, y: 0, opacity: 0 }}
                        animate={{
                          x: [0, to.x - from.x],
                          y: [0, to.y - from.y],
                          opacity: [0, 1, 1, 0],
                        }}
                        transition={{
                          duration: 1.0,
                          ease: 'linear',
                          repeat: seqStep >= 11 ? 0 : Infinity,
                          delay: 0.8,
                        }}
                      />
                    )}
                    {/* Return spark: Market → Asset (amber) */}
                    {isVisible && (
                      <motion.circle
                        cx={to.x}
                        cy={to.y}
                        r={3}
                        fill="#F59E0B"
                        filter="url(#sparkGlow)"
                        initial={{ x: 0, y: 0, opacity: 0 }}
                        animate={{
                          x: [0, from.x - to.x],
                          y: [0, from.y - to.y],
                          opacity: [0, 1, 1, 0],
                        }}
                        transition={{
                          duration: 1.2,
                          ease: 'linear',
                          repeat: seqStep >= 11 ? 0 : Infinity,
                          delay: 1.1,
                        }}
                      />
                    )}
                  </g>
                );
              })}

              {/* ---- Contract nodes (card containers) ---- */}
              {nodes.map((node) => {
                const isDeployed = node.deployed;
                const strokeColor = getStrokeColor(node.cluster, isDeployed);
                const headerFill = getHeaderFill(node.cluster, isDeployed);
                const glowFilter =
                  seqStep >= 11
                    ? 'url(#completeGlow)'
                    : node.cluster === 'a'
                      ? 'url(#nodeGlowA)'
                      : 'url(#nodeGlowB)';

                const nodeOpacity = !showCanvas ? 0 : isDeployed ? 1 : 0.05;

                return (
                  <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
                    <motion.g
                      initial={{ opacity: 0, scale: 0.5, y: -60 }}
                      animate={{
                        opacity: nodeOpacity,
                        scale: isDeployed ? 1 : 0.8,
                        y: isDeployed ? 0 : -20,
                      }}
                      transition={{ type: 'spring', stiffness: 150, damping: 12 }}
                    >
                      {/* Card background */}
                      <rect
                        x={-CARD_W / 2}
                        y={-CARD_H / 2}
                        width={CARD_W}
                        height={CARD_H}
                        rx={CARD_RX}
                        fill="rgba(15, 23, 42, 0.85)"
                        stroke={strokeColor}
                        strokeWidth={isDeployed ? 2.5 : 1}
                        filter={isDeployed ? glowFilter : undefined}
                      />

                      {/* Card header bar */}
                      <rect
                        x={-CARD_W / 2}
                        y={-CARD_H / 2}
                        width={CARD_W}
                        height={HEADER_H}
                        rx={CARD_RX}
                        fill={headerFill}
                      />

                      {/* Status indicator dot */}
                      {isDeployed && (
                        <motion.circle
                          cx={-CARD_W / 2 + 10}
                          cy={-CARD_H / 2 + HEADER_H / 2}
                          r={3}
                          fill={getStatusDotColor(node.cluster)}
                          transition={{ duration: 1.5, repeat: seqStep >= 11 ? 0 : Infinity }}
                        />
                      )}

                      {/* Contract name */}
                      <text
                        x={0}
                        y={5}
                        textAnchor="middle"
                        className="fill-white text-[9px] font-bold"
                        style={{
                          fontFamily: 'ui-monospace, monospace',
                          fontSize: '9px',
                          letterSpacing: '0.05em',
                        }}
                      >
                        {node.name}
                      </text>

                      {/* Truncated address */}
                      <text
                        x={0}
                        y={18}
                        textAnchor="middle"
                        className={cn(
                          'text-[7px]',
                          node.cluster === 'a' ? 'fill-indigo-400/70' : 'fill-amber-400/70'
                        )}
                        style={{
                          fontFamily: 'ui-monospace, monospace',
                          fontSize: '7px',
                        }}
                      >
                        {truncateAddress(node.address, 4)}
                      </text>
                    </motion.g>
                  </g>
                );
              })}

              {/* ---- Cluster labels ---- */}
              <AnimatePresence>
                {seqStep >= 1 && (
                  <motion.text
                    x={105}
                    y={272}
                    textAnchor="middle"
                    className="fill-indigo-400/70"
                    style={{
                      fontFamily: 'ui-monospace, monospace',
                      fontSize: '10px',
                      fontWeight: 'bold',
                    }}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                  >
                    Asset Infrastructure
                  </motion.text>
                )}
              </AnimatePresence>
              <AnimatePresence>
                {seqStep >= 6 && (
                  <motion.text
                    x={375}
                    y={272}
                    textAnchor="middle"
                    className="fill-amber-400/70"
                    style={{
                      fontFamily: 'ui-monospace, monospace',
                      fontSize: '10px',
                      fontWeight: 'bold',
                    }}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                  >
                    Market Infrastructure
                  </motion.text>
                )}
              </AnimatePresence>
            </svg>

            {/* Completion glow overlay + particle burst */}
            {seqStep >= 11 && (
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
                <ParticleBurst trigger={showBurst} color="emerald" particleCount={24} />
              </div>
            )}
          </div>
        </div>

        {/* ---- Side panel ---- */}
        <motion.div
          className="space-y-4"
          variants={fadeInRight}
          initial="hidden"
          animate={showCanvas ? 'visible' : 'hidden'}
        >
          {/* Deployment info card */}
          <GlowCard color="indigo" active={seqStep >= 11} delay={0.3}>
            <div className="p-5">
              <h4 className="text-sm font-bold uppercase tracking-widest text-slate-300 mb-4">
                Deployment Info
              </h4>
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-slate-300 uppercase tracking-wider block mb-0.5">
                    Deployer
                  </span>
                  <code className="text-base font-mono text-indigo-400">
                    {truncateAddress(DEPLOYER)}
                  </code>
                </div>
                <div>
                  <span className="text-sm text-slate-300 uppercase tracking-wider block mb-0.5">
                    Network
                  </span>
                  <span className="text-base text-slate-300">Base Sepolia (84532)</span>
                </div>
                <div>
                  <span className="text-sm text-slate-300 uppercase tracking-wider block mb-0.5">
                    Pattern
                  </span>
                  <span className="text-base text-indigo-300">UUPS Transparent Proxy</span>
                </div>
                <div>
                  <span className="text-sm text-slate-300 uppercase tracking-wider block mb-0.5">
                    Block
                  </span>
                  <span className="text-base font-mono text-amber-400">
                    #{BLOCK_NUMBERS.deployBlock.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-slate-300 uppercase tracking-wider block mb-0.5">
                    Contracts
                  </span>
                  <span className="text-base text-slate-300">
                    {deployedCount} / {contractEntries.length} deployed
                  </span>
                </div>
              </div>
            </div>
          </GlowCard>

          {/* Transaction hash card */}
          <GlowCard color="indigo" intensity="low" active={deployedCount > 0} delay={0.5}>
            <div className="p-5">
              <h4 className="text-sm font-bold uppercase tracking-widest text-slate-300 mb-3">
                Transaction
              </h4>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-slate-300 uppercase tracking-wider block mb-0.5">
                    Tx Hash
                  </span>
                  {deployedCount > 0 ? (
                    <TypedText
                      text={truncateHash(TX_HASHES.deploy)}
                      speed={20}
                      className="text-base font-mono text-cyan-400"
                      cursor={false}
                    />
                  ) : (
                    <span className="text-base font-mono text-slate-700">pending...</span>
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
                {nodes
                  .filter((n) => n.deployed)
                  .map((node, idx) => (
                    <motion.div
                      key={node.id}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors',
                        seqStep >= 11
                          ? 'border-emerald-500/20 bg-emerald-950/20'
                          : node.cluster === 'a'
                            ? 'border-indigo-500/10 bg-slate-900/40'
                            : 'border-amber-500/10 bg-slate-900/40'
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
                          seqStep >= 11
                            ? 'bg-emerald-500/20'
                            : node.cluster === 'a'
                              ? 'bg-indigo-500/20'
                              : 'bg-amber-500/20'
                        )}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                      >
                        <motion.svg
                          className={cn(
                            'w-3 h-3',
                            seqStep >= 11
                              ? 'text-emerald-400'
                              : node.cluster === 'a'
                                ? 'text-indigo-400'
                                : 'text-amber-400'
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
                        <code
                          className={cn(
                            'text-xs font-mono truncate block',
                            node.cluster === 'a'
                              ? 'text-indigo-400/70'
                              : 'text-amber-400/70'
                          )}
                        >
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
