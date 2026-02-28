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
  setup: 'shadow-indigo-500/10',
  asset: 'shadow-blue-500/10',
  market: 'shadow-amber-500/10',
  x402: 'shadow-emerald-500/10',
  summary: 'shadow-cyan-500/10',
};

const CATEGORY_BORDER: Record<string, string> = {
  setup: 'border-indigo-500/20',
  asset: 'border-blue-500/20',
  market: 'border-amber-500/20',
  x402: 'border-emerald-500/20',
  summary: 'border-cyan-500/20',
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
            'w-full rounded-2xl border p-6 sm:p-8',
            'bg-slate-950/60 backdrop-blur-md',
            CATEGORY_BORDER[config.category],
            CATEGORY_GLOW[config.category],
            'shadow-2xl'
          )}
          role="tabpanel"
          aria-label={`Step ${stepNumber}: ${config.title}`}
        >
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
            <div className="flex items-center gap-3 mb-2">
              <span
                className={cn(
                  'text-[11px] uppercase tracking-[0.2em] font-bold px-2 py-0.5 rounded-full border',
                  CATEGORY_COLORS[config.category],
                  CATEGORY_BORDER[config.category],
                  'bg-slate-900/60'
                )}
              >
                {CATEGORY_LABELS[config.category]}
              </span>
              <span className="text-slate-700 text-[11px]">|</span>
              <span className="text-[11px] uppercase tracking-[0.15em] text-slate-600 font-semibold">
                Step {stepNumber} of 12
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1 tracking-tight">
              {config.title}
            </h2>
            <p className="text-base sm:text-lg text-slate-400 max-w-2xl leading-relaxed whitespace-pre-line">
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
