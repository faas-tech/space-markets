'use client';

import React, { useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useDemoContext } from './demo-provider';
import { cn } from '@/lib/utils';

const SPEEDS = [0.5, 1, 2];

export function DemoController() {
  const { state, togglePlay, nextStep, prevStep, setSpeed, reset, goToStep, totalSteps } =
    useDemoContext();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowRight':
          e.preventDefault();
          nextStep();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          prevStep();
          break;
        case 'r':
        case 'R':
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            reset();
          }
          break;
        case 'Home':
          e.preventDefault();
          goToStep(1);
          break;
        case 'End':
          e.preventDefault();
          goToStep(totalSteps);
          break;
      }
    },
    [togglePlay, nextStep, prevStep, reset, goToStep, totalSteps]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const currentSpeedIndex = SPEEDS.indexOf(state.playbackSpeed);

  function cycleSpeed() {
    const nextIndex = (currentSpeedIndex + 1) % SPEEDS.length;
    setSpeed(SPEEDS[nextIndex]);
  }

  return (
    <div
      className="flex items-center gap-1.5 sm:gap-2 bg-slate-900/60 backdrop-blur-md border border-slate-700/40 rounded-xl px-2 py-1.5"
      role="toolbar"
      aria-label="Demo playback controls"
    >
      {/* Reset */}
      <ControlButton
        onClick={reset}
        label="Reset demo"
        title="Reset (R)"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </ControlButton>

      {/* Previous */}
      <ControlButton
        onClick={prevStep}
        disabled={state.currentStep <= 1}
        label="Previous step"
        title="Previous (Left Arrow)"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </ControlButton>

      {/* Play / Pause */}
      <motion.button
        onClick={togglePlay}
        whileTap={{ scale: 0.9 }}
        className={cn(
          'w-10 h-10 flex items-center justify-center rounded-lg border transition-all relative',
          state.isPlaying
            ? 'bg-blue-600 border-blue-400/50 text-white'
            : 'bg-slate-800/80 border-slate-600/50 text-slate-300 hover:text-white hover:border-blue-500/50'
        )}
        style={{
          boxShadow: state.isPlaying
            ? '0 0 20px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255,255,255,0.1)'
            : 'none',
        }}
        aria-label={state.isPlaying ? 'Pause auto-play' : 'Start auto-play'}
        title={`${state.isPlaying ? 'Pause' : 'Play'} (Space)`}
      >
        {state.isPlaying ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
        {/* Pulsing ring when playing */}
        {state.isPlaying && (
          <motion.div
            className="absolute inset-0 rounded-lg border border-blue-400/30"
            animate={{
              scale: [1, 1.15, 1],
              opacity: [0.5, 0, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}
      </motion.button>

      {/* Next */}
      <ControlButton
        onClick={nextStep}
        disabled={state.currentStep >= totalSteps}
        label="Next step"
        title="Next (Right Arrow)"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </ControlButton>

      {/* Speed */}
      <motion.button
        onClick={cycleSpeed}
        whileTap={{ scale: 0.9 }}
        className="h-8 px-2.5 flex items-center justify-center rounded-lg bg-slate-800/60 border border-slate-700/40 text-slate-400 hover:text-white hover:border-slate-600 transition-colors font-mono text-[11px] min-w-[44px]"
        aria-label={`Playback speed: ${state.playbackSpeed}x`}
        title="Cycle speed"
      >
        {state.playbackSpeed}x
      </motion.button>

      {/* Step indicator */}
      <div className="ml-0.5 text-xs text-slate-500 font-mono tabular-nums">
        <span className="text-slate-300">{state.currentStep}</span>
        <span className="mx-0.5 text-slate-700">/</span>
        <span>{totalSteps}</span>
      </div>
    </div>
  );
}

// Reusable control button
function ControlButton({
  onClick,
  disabled,
  label,
  title,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.85 }}
      className={cn(
        'w-8 h-8 flex items-center justify-center rounded-lg transition-colors',
        disabled
          ? 'text-slate-700 cursor-not-allowed'
          : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
      )}
      aria-label={label}
      title={title}
    >
      {children}
    </motion.button>
  );
}
