'use client';

import React from 'react';
import { useDemoContext } from './demo-provider';
import { STEP_CONFIGS } from '@/lib/demo/step-config';
import { cn } from '@/lib/utils';

export function ProgressBar() {
  const { state, goToStep } = useDemoContext();

  return (
    <nav
      className="w-full overflow-x-auto scrollbar-hide"
      aria-label="Protocol demo progress"
    >
      <ol className="flex items-center gap-0 min-w-max px-2 sm:px-4">
        {STEP_CONFIGS.map((config, index) => {
          const stepNum = index + 1;
          const isActive = state.currentStep === stepNum;
          const isCompleted = state.completedSteps.has(stepNum);
          const isPast = stepNum < state.currentStep;

          return (
            <li key={config.id} className="flex items-center">
              <button
                onClick={() => goToStep(stepNum)}
                className={cn(
                  'flex flex-col items-center gap-1 px-2 sm:px-3 py-2 rounded-lg transition-all group relative',
                  isActive && 'bg-slate-800/60',
                  !isActive && 'hover:bg-slate-800/30'
                )}
                aria-label={`Step ${stepNum}: ${config.title}`}
                aria-current={isActive ? 'step' : undefined}
              >
                {/* Step dot */}
                <div
                  className={cn(
                    'w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all border',
                    isActive &&
                      'bg-blue-600 border-blue-400/40 text-white shadow-[0_0_12px_-2px_rgba(59,130,246,0.6)]',
                    isCompleted &&
                      !isActive &&
                      'bg-emerald-600/20 border-emerald-500/40 text-emerald-400',
                    isPast &&
                      !isCompleted &&
                      'bg-slate-700/50 border-slate-600/50 text-slate-400',
                    !isActive &&
                      !isCompleted &&
                      !isPast &&
                      'bg-slate-800/50 border-slate-700/50 text-slate-500'
                  )}
                >
                  {isCompleted && !isActive ? (
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    stepNum
                  )}
                </div>

                {/* Label - hidden on small screens */}
                <span
                  className={cn(
                    'text-[10px] leading-tight font-medium text-center max-w-[64px] sm:max-w-[72px] truncate hidden sm:block',
                    isActive && 'text-white',
                    !isActive && isPast && 'text-slate-500',
                    !isActive && !isPast && 'text-slate-600'
                  )}
                >
                  {config.title}
                </span>
              </button>

              {/* Connector line */}
              {index < STEP_CONFIGS.length - 1 && (
                <div
                  className={cn(
                    'w-4 sm:w-6 h-px',
                    isPast ? 'bg-slate-600' : 'bg-slate-800'
                  )}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
