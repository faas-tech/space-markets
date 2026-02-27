'use client';

import React from 'react';
import { motion, type Variants } from 'framer-motion';
import { cn } from '@/lib/utils';

interface GlowCardProps {
  children: React.ReactNode;
  color?: 'blue' | 'emerald' | 'amber' | 'purple' | 'cyan' | 'rose';
  intensity?: 'low' | 'medium' | 'high';
  active?: boolean;
  className?: string;
  delay?: number;
}

const GLOW_COLORS = {
  blue: {
    border: 'border-blue-500/40',
    shadow: 'rgba(59, 130, 246, VAR)',
    bg: 'bg-blue-500/5',
  },
  emerald: {
    border: 'border-emerald-500/40',
    shadow: 'rgba(16, 185, 129, VAR)',
    bg: 'bg-emerald-500/5',
  },
  amber: {
    border: 'border-amber-500/40',
    shadow: 'rgba(245, 158, 11, VAR)',
    bg: 'bg-amber-500/5',
  },
  purple: {
    border: 'border-purple-500/40',
    shadow: 'rgba(168, 85, 247, VAR)',
    bg: 'bg-purple-500/5',
  },
  cyan: {
    border: 'border-cyan-500/40',
    shadow: 'rgba(6, 182, 212, VAR)',
    bg: 'bg-cyan-500/5',
  },
  rose: {
    border: 'border-rose-500/40',
    shadow: 'rgba(244, 63, 94, VAR)',
    bg: 'bg-rose-500/5',
  },
};

const INTENSITY = {
  low: { spread: 15, opacity: 0.15 },
  medium: { spread: 25, opacity: 0.25 },
  high: { spread: 40, opacity: 0.4 },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      delay,
      ease: [0.22, 1, 0.36, 1],
    },
  }),
};

export function GlowCard({
  children,
  color = 'blue',
  intensity = 'medium',
  active = true,
  className,
  delay = 0,
}: GlowCardProps) {
  const colorConfig = GLOW_COLORS[color];
  const intensityConfig = INTENSITY[intensity];

  const shadowColor = colorConfig.shadow.replace('VAR', String(intensityConfig.opacity));
  const boxShadow = active
    ? `0 0 ${intensityConfig.spread}px ${shadowColor}`
    : 'none';

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      custom={delay}
      className={cn(
        'rounded-xl border backdrop-blur-sm transition-colors duration-500',
        active ? colorConfig.border : 'border-slate-800/60',
        active ? colorConfig.bg : 'bg-slate-900/40',
        className
      )}
      style={{ boxShadow }}
    >
      {children}
    </motion.div>
  );
}
