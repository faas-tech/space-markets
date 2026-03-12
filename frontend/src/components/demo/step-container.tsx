'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { STEP_CONFIGS, CATEGORY_COLORS, CATEGORY_LABELS } from '@/lib/demo/step-config';
import { useDemoContext } from './demo-provider';
import { stepContainer } from '@/lib/demo/motion-variants';

interface StepContainerProps {
  stepNumber: number;
  children: React.ReactNode;
}

const CATEGORY_GLOW: Record<string, string> = {
  setup: 'shadow-[0_0_20px_rgba(168,85,247,0.15)]',
  asset: 'shadow-[0_0_20px_rgba(59,130,246,0.15)]',
  market: 'shadow-[0_0_20px_rgba(245,158,11,0.15)]',
  x402: 'shadow-[0_0_20px_rgba(16,185,129,0.15)]',
  summary: 'shadow-[0_0_20px_rgba(6,182,212,0.15)]',
};

const CATEGORY_ACCENT: Record<string, string> = {
  setup: 'bg-gradient-to-r from-purple-500/80 via-purple-400/60 to-transparent',
  asset: 'bg-gradient-to-r from-blue-500/80 via-blue-400/60 to-transparent',
  market: 'bg-gradient-to-r from-amber-500/80 via-amber-400/60 to-transparent',
  x402: 'bg-gradient-to-r from-emerald-500/80 via-emerald-400/60 to-transparent',
  summary: 'bg-gradient-to-r from-cyan-500/80 via-cyan-400/60 to-transparent',
};

export function StepContainer({ stepNumber, children }: StepContainerProps) {
  const { state } = useDemoContext();
  const isActive = state.currentStep === stepNumber;
  const config = STEP_CONFIGS[stepNumber - 1];

  return (
    <AnimatePresence mode="wait">
      {isActive && (
        <motion.div
          key={`step-${stepNumber}`}
          variants={stepContainer}
          initial="hidden"
          animate="visible"
          exit="exit"
          className={cn(
            'w-full rounded-2xl border border-white/5 p-6 sm:p-8 relative overflow-hidden',
            'bg-card/80 backdrop-blur-xl',
            CATEGORY_GLOW[config.category],
            'shadow-2xl'
          )}
          role="tabpanel"
          aria-label={`Step ${stepNumber}: ${config.title}`}
        >
          {/* Top accent gradient bar */}
          <div
            className={cn(
              'absolute top-0 left-0 right-0 h-[2px]',
              CATEGORY_ACCENT[config.category]
            )}
          />
          {/* Step Header */}
          <motion.div
            className="mb-6 sm:mb-8"
            variants={{
              hidden: { opacity: 0, x: -20 },
              visible: {
                opacity: 1,
                x: 0,
                transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
              },
            }}
          >
            <div className="flex items-center gap-2.5 mb-2">
              <span
                className={cn(
                  'text-[9px] uppercase tracking-[0.25em] font-bold px-2 py-0.5 rounded-full border',
                  CATEGORY_COLORS[config.category],
                  'border-white/10 bg-white/5'
                )}
              >
                {CATEGORY_LABELS[config.category]}
              </span>
              <span className="text-muted-foreground/30 text-[10px]">|</span>
              <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/50 font-medium">
                Step {stepNumber} of 12
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 tracking-tight">
              {config.title}
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl leading-relaxed">
              {config.description}
            </p>
          </motion.div>

          {/* Step Content */}
          <motion.div
            className="w-full"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { delay: 0.2, duration: 0.4 },
              },
            }}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
