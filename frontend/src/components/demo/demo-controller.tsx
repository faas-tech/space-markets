'use client';

import React, { useEffect, useCallback } from 'react';
import { useDemoContext } from './demo-provider';
import { ShareButton } from './share-button';
import { cn } from '@/lib/utils';

const SPEEDS = [0.5, 1, 2];

export function DemoController() {
  const { state, togglePlay, nextStep, prevStep, setSpeed, reset, goToStep, totalSteps } =
    useDemoContext();

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Do not capture if user is focused on an input
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
      className="flex items-center gap-2 sm:gap-3"
      role="toolbar"
      aria-label="Demo playback controls"
    >
      {/* Reset */}
      <button
        onClick={reset}
        className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-800/60 border border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600 transition-colors"
        aria-label="Reset demo"
        title="Reset (R)"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </button>

      {/* Previous */}
      <button
        onClick={prevStep}
        disabled={state.currentStep <= 1}
        className={cn(
          'w-10 h-10 flex items-center justify-center rounded-lg bg-slate-800/60 border border-slate-700/50 transition-colors',
          state.currentStep <= 1
            ? 'text-slate-600 cursor-not-allowed'
            : 'text-slate-400 hover:text-white hover:border-slate-600'
        )}
        aria-label="Previous step"
        title="Previous (Left Arrow)"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Play / Pause */}
      <button
        onClick={togglePlay}
        className={cn(
          'w-12 h-12 flex items-center justify-center rounded-xl border transition-all',
          state.isPlaying
            ? 'bg-blue-600 border-blue-400/40 text-white shadow-[0_0_20px_-4px_rgba(59,130,246,0.5)]'
            : 'bg-slate-800/60 border-slate-700/50 text-slate-300 hover:text-white hover:border-blue-500/50'
        )}
        aria-label={state.isPlaying ? 'Pause auto-play' : 'Start auto-play'}
        title={`${state.isPlaying ? 'Pause' : 'Play'} (Space)`}
      >
        {state.isPlaying ? (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      {/* Next */}
      <button
        onClick={nextStep}
        disabled={state.currentStep >= totalSteps}
        className={cn(
          'w-10 h-10 flex items-center justify-center rounded-lg bg-slate-800/60 border border-slate-700/50 transition-colors',
          state.currentStep >= totalSteps
            ? 'text-slate-600 cursor-not-allowed'
            : 'text-slate-400 hover:text-white hover:border-slate-600'
        )}
        aria-label="Next step"
        title="Next (Right Arrow)"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Speed */}
      <button
        onClick={cycleSpeed}
        className="h-10 px-3 flex items-center justify-center rounded-lg bg-slate-800/60 border border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600 transition-colors font-mono text-xs min-w-[52px]"
        aria-label={`Playback speed: ${state.playbackSpeed}x`}
        title="Cycle speed"
      >
        {state.playbackSpeed}x
      </button>

      {/* Step indicator (mobile-friendly) */}
      <div className="ml-1 sm:ml-2 text-xs text-slate-500 font-mono tabular-nums">
        <span className="text-slate-300">{state.currentStep}</span>
        <span className="mx-0.5">/</span>
        <span>{totalSteps}</span>
      </div>
    </div>
  );
}
