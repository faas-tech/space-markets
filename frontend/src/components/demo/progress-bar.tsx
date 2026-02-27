'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useDemoContext } from './demo-provider';
import { STEP_CONFIGS, CATEGORY_COLORS } from '@/lib/demo/step-config';
import { cn } from '@/lib/utils';

const CATEGORY_DOT_COLORS: Record<string, string> = {
  setup: 'bg-purple-500',
  asset: 'bg-blue-500',
  market: 'bg-amber-500',
  x402: 'bg-emerald-500',
  summary: 'bg-cyan-500',
};

const CATEGORY_RING_COLORS: Record<string, string> = {
  setup: 'ring-purple-500/30',
  asset: 'ring-blue-500/30',
  market: 'ring-amber-500/30',
  x402: 'ring-emerald-500/30',
  summary: 'ring-cyan-500/30',
};

export function ProgressBar() {
  const { state, goToStep } = useDemoContext();
  const progress = ((state.currentStep - 1) / (STEP_CONFIGS.length - 1)) * 100;

  return (
    <nav
      className="w-full overflow-x-auto scrollbar-hide px-4 sm:px-6 py-2"
      aria-label="Protocol demo progress"
    >
      <div className="relative min-w-max">
        {/* Track line */}
        <div className="absolute top-1/2 left-4 right-4 h-px bg-slate-800/80 -translate-y-1/2" />

        {/* Progress fill */}
        <motion.div
          className="absolute top-1/2 left-4 h-px bg-gradient-to-r from-purple-500 via-blue-500 via-amber-500 to-emerald-500 -translate-y-1/2 origin-left"
          style={{ right: `calc(${100 - progress}% + 16px)` }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        />

        {/* Step nodes */}
        <ol className="flex items-center justify-between relative">
          {STEP_CONFIGS.map((config, index) => {
            const stepNum = index + 1;
            const isActive = state.currentStep === stepNum;
            const isCompleted = state.completedSteps.has(stepNum);
            const isPast = stepNum < state.currentStep;

            return (
              <li key={config.id} className="relative">
                <button
                  onClick={() => goToStep(stepNum)}
                  className="flex flex-col items-center gap-1.5 px-1.5 sm:px-2 py-1 group"
                  aria-label={`Step ${stepNum}: ${config.title}`}
                  aria-current={isActive ? 'step' : undefined}
                >
                  {/* Node */}
                  <motion.div
                    className={cn(
                      'relative w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[10px] font-bold transition-all border',
                      isActive && [
                        CATEGORY_DOT_COLORS[config.category],
                        'border-transparent text-white',
                        'ring-2',
                        CATEGORY_RING_COLORS[config.category],
                      ],
                      isCompleted && !isActive &&
                        'bg-slate-800/80 border-emerald-500/50 text-emerald-400',
                      isPast && !isCompleted &&
                        'bg-slate-800/60 border-slate-600/50 text-slate-400',
                      !isActive && !isCompleted && !isPast &&
                        'bg-slate-900/60 border-slate-800/60 text-slate-600 group-hover:border-slate-600 group-hover:text-slate-400'
                    )}
                    animate={isActive ? { scale: [1, 1.1, 1] } : {}}
                    transition={isActive ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' } : {}}
                  >
                    {isCompleted && !isActive ? (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      stepNum
                    )}

                    {/* Active glow */}
                    {isActive && (
                      <motion.div
                        className={cn(
                          'absolute inset-0 rounded-full',
                          CATEGORY_DOT_COLORS[config.category]
                        )}
                        animate={{ scale: [1, 1.6], opacity: [0.3, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
                        style={{ filter: 'blur(4px)' }}
                      />
                    )}
                  </motion.div>

                  {/* Label */}
                  <span
                    className={cn(
                      'text-[9px] leading-tight font-medium text-center max-w-[56px] sm:max-w-[68px] truncate hidden sm:block',
                      isActive && CATEGORY_COLORS[config.category],
                      !isActive && isPast && 'text-slate-500',
                      !isActive && !isPast && 'text-slate-700'
                    )}
                  >
                    {config.title}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
