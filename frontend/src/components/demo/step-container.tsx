'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { STEP_CONFIGS, CATEGORY_COLORS, CATEGORY_LABELS } from '@/lib/demo/step-config';
import { useDemoContext } from './demo-provider';

interface StepContainerProps {
  stepNumber: number;
  children: React.ReactNode;
}

export function StepContainer({ stepNumber, children }: StepContainerProps) {
  const { state } = useDemoContext();
  const [mounted, setMounted] = useState(false);
  const isActive = state.currentStep === stepNumber;
  const config = STEP_CONFIGS[stepNumber - 1];

  useEffect(() => {
    if (isActive) {
      // Small delay to trigger CSS transition
      const timer = setTimeout(() => setMounted(true), 50);
      return () => clearTimeout(timer);
    }
    setMounted(false);
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div
      className={cn(
        'w-full transition-all duration-500',
        mounted
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-4'
      )}
      style={{ transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
      role="tabpanel"
      aria-label={`Step ${stepNumber}: ${config.title}`}
    >
      {/* Step Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span
            className={cn(
              'text-[10px] uppercase tracking-widest font-bold',
              CATEGORY_COLORS[config.category]
            )}
          >
            {CATEGORY_LABELS[config.category]}
          </span>
          <span className="text-slate-700 text-[10px]">|</span>
          <span className="text-[10px] uppercase tracking-widest text-slate-600 font-semibold">
            Step {stepNumber} of 12
          </span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1">
          {config.title}
        </h2>
        <p className="text-sm sm:text-base text-slate-400 max-w-2xl">
          {config.description}
        </p>
      </div>

      {/* Step Content */}
      <div className="w-full">{children}</div>
    </div>
  );
}
