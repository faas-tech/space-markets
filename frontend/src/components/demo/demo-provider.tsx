'use client';

import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import { STEP_CONFIGS } from '@/lib/demo/step-config';
import {
  type AssetClassId,
  type PricingMode,
  PRESET_IDS,
  getPresetData,
} from '@/lib/demo/demo-data';

// ---- Types ----

export interface StepData {
  [key: string]: string | number | boolean | Record<string, string | number | boolean>;
}

export interface DemoState {
  currentStep: number;
  isPlaying: boolean;
  playbackSpeed: number;
  completedSteps: Set<number>;
  stepData: Record<number, StepData>;
  activePreset: AssetClassId;
  pricingMode: PricingMode;
}

type DemoAction =
  | { type: 'GO_TO_STEP'; step: number }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'TOGGLE_PLAY' }
  | { type: 'SET_SPEED'; speed: number }
  | { type: 'COMPLETE_STEP'; step: number; data: StepData }
  | { type: 'RESET' }
  | { type: 'SET_PRESET'; preset: AssetClassId }
  | { type: 'SET_PRICING_MODE'; mode: PricingMode }
  | { type: 'INIT_FROM_PARAMS'; preset: AssetClassId; step: number; speed: number; pricingMode: PricingMode };

interface DemoContextValue {
  state: DemoState;
  goToStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  setSpeed: (speed: number) => void;
  completeStep: (step: number, data: StepData) => void;
  reset: () => void;
  setPreset: (preset: AssetClassId) => void;
  setPricingMode: (mode: PricingMode) => void;
  totalSteps: number;
  presetData: ReturnType<typeof getPresetData>;
}

// ---- Reducer ----

const TOTAL_STEPS = 12;

function createInitialState(preset?: AssetClassId, step?: number, speed?: number, pricingMode?: PricingMode): DemoState {
  return {
    currentStep: step ?? 1,
    isPlaying: false,
    playbackSpeed: speed ?? 1,
    completedSteps: new Set<number>(),
    stepData: {},
    activePreset: preset ?? 'orbital',
    pricingMode: pricingMode ?? 'standard',
  };
}

function demoReducer(state: DemoState, action: DemoAction): DemoState {
  switch (action.type) {
    case 'GO_TO_STEP':
      return {
        ...state,
        currentStep: Math.max(1, Math.min(TOTAL_STEPS, action.step)),
      };
    case 'NEXT_STEP':
      if (state.currentStep >= TOTAL_STEPS) {
        return { ...state, isPlaying: false };
      }
      return { ...state, currentStep: state.currentStep + 1 };
    case 'PREV_STEP':
      return {
        ...state,
        currentStep: Math.max(1, state.currentStep - 1),
      };
    case 'PLAY':
      return { ...state, isPlaying: true };
    case 'PAUSE':
      return { ...state, isPlaying: false };
    case 'TOGGLE_PLAY':
      return { ...state, isPlaying: !state.isPlaying };
    case 'SET_SPEED':
      return { ...state, playbackSpeed: action.speed };
    case 'COMPLETE_STEP': {
      const newCompleted = new Set(state.completedSteps);
      newCompleted.add(action.step);
      return {
        ...state,
        completedSteps: newCompleted,
        stepData: {
          ...state.stepData,
          [action.step]: action.data,
        },
      };
    }
    case 'RESET':
      return createInitialState(state.activePreset, undefined, undefined, state.pricingMode);
    case 'SET_PRESET':
      return {
        ...createInitialState(action.preset, undefined, state.playbackSpeed, state.pricingMode),
      };
    case 'SET_PRICING_MODE':
      return {
        ...state,
        pricingMode: action.mode,
        // Reset progress when pricing mode changes so step data is recalculated
        completedSteps: new Set<number>(),
        stepData: {},
        currentStep: 1,
        isPlaying: false,
      };
    case 'INIT_FROM_PARAMS':
      return createInitialState(action.preset, action.step, action.speed, action.pricingMode);
    default:
      return state;
  }
}

// ---- Helpers ----

function isValidPreset(value: string): value is AssetClassId {
  return PRESET_IDS.includes(value as AssetClassId);
}

function isValidPricingMode(value: string): value is PricingMode {
  return ['conservative', 'standard', 'aggressive'].includes(value);
}

// ---- Context ----

const DemoContext = createContext<DemoContextValue | null>(null);

export function useDemoContext(): DemoContextValue {
  const ctx = useContext(DemoContext);
  if (!ctx) {
    throw new Error('useDemoContext must be used within a DemoProvider');
  }
  return ctx;
}

// ---- Provider ----

interface DemoProviderProps {
  children: React.ReactNode;
  initialPreset?: AssetClassId;
  initialStep?: number;
  initialSpeed?: number;
  initialPricingMode?: PricingMode;
}

export function DemoProvider({
  children,
  initialPreset,
  initialStep,
  initialSpeed,
  initialPricingMode,
}: DemoProviderProps) {
  const [state, dispatch] = useReducer(
    demoReducer,
    undefined,
    () => createInitialState(initialPreset, initialStep, initialSpeed, initialPricingMode)
  );
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goToStep = useCallback((step: number) => dispatch({ type: 'GO_TO_STEP', step }), []);
  const nextStep = useCallback(() => dispatch({ type: 'NEXT_STEP' }), []);
  const prevStep = useCallback(() => dispatch({ type: 'PREV_STEP' }), []);
  const play = useCallback(() => dispatch({ type: 'PLAY' }), []);
  const pause = useCallback(() => dispatch({ type: 'PAUSE' }), []);
  const togglePlay = useCallback(() => dispatch({ type: 'TOGGLE_PLAY' }), []);
  const setSpeed = useCallback((speed: number) => dispatch({ type: 'SET_SPEED', speed }), []);
  const completeStep = useCallback(
    (step: number, data: StepData) => dispatch({ type: 'COMPLETE_STEP', step, data }),
    []
  );
  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);
  const setPreset = useCallback(
    (preset: AssetClassId) => dispatch({ type: 'SET_PRESET', preset }),
    []
  );
  const setPricingMode = useCallback(
    (mode: PricingMode) => dispatch({ type: 'SET_PRICING_MODE', mode }),
    []
  );

  // Initialize from URL query params on mount (client-side only)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const presetParam = params.get('preset');
    const stepParam = params.get('step');
    const speedParam = params.get('speed');
    const pricingParam = params.get('pricing');

    const preset = presetParam && isValidPreset(presetParam) ? presetParam : 'orbital';
    const step = stepParam ? Math.max(1, Math.min(TOTAL_STEPS, parseInt(stepParam, 10) || 1)) : 1;
    const speed = speedParam ? parseFloat(speedParam) || 1 : 1;
    const pricingMode = pricingParam && isValidPricingMode(pricingParam) ? pricingParam : 'standard';

    // Only dispatch if something differs from defaults
    if (preset !== 'orbital' || step !== 1 || speed !== 1 || pricingMode !== 'standard') {
      dispatch({ type: 'INIT_FROM_PARAMS', preset, step, speed, pricingMode });
    }
  }, []);

  // Auto-play timer
  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (state.isPlaying && state.currentStep <= TOTAL_STEPS) {
      const config = STEP_CONFIGS[state.currentStep - 1];
      const duration = config ? config.duration / state.playbackSpeed : 5000 / state.playbackSpeed;

      timerRef.current = setTimeout(() => {
        nextStep();
      }, duration);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [state.isPlaying, state.currentStep, state.playbackSpeed, nextStep]);

  // Compute derived preset data
  const presetData = getPresetData(state.activePreset, state.pricingMode);

  const value: DemoContextValue = {
    state,
    goToStep,
    nextStep,
    prevStep,
    play,
    pause,
    togglePlay,
    setSpeed,
    completeStep,
    reset,
    setPreset,
    setPricingMode,
    totalSteps: TOTAL_STEPS,
    presetData,
  };

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}
