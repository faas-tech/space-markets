'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface SatelliteProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
  label?: string;
}

const sizeMap = {
  sm: 'w-6 h-6',
  md: 'w-10 h-10',
  lg: 'w-14 h-14',
};

export function Satellite({ className, size = 'md', active = true, label }: SatelliteProps) {
  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      role="img"
      aria-label={label || 'Satellite'}
    >
      {/* Glow ring */}
      {active && (
        <div
          className={cn(
            'absolute rounded-full bg-blue-500/20 animate-[pulseGlow_2s_ease-in-out_infinite]',
            size === 'sm' && 'w-10 h-10',
            size === 'md' && 'w-16 h-16',
            size === 'lg' && 'w-22 h-22'
          )}
        />
      )}

      {/* Satellite body (SVG) */}
      <svg
        className={cn(sizeMap[size], 'relative z-10')}
        viewBox="0 0 48 48"
        fill="none"
      >
        {/* Solar panels */}
        <rect
          x="4"
          y="18"
          width="14"
          height="12"
          rx="1"
          fill="currentColor"
          className="text-blue-600"
          opacity={0.8}
        />
        <rect
          x="30"
          y="18"
          width="14"
          height="12"
          rx="1"
          fill="currentColor"
          className="text-blue-600"
          opacity={0.8}
        />
        {/* Panel lines */}
        <line x1="8" y1="18" x2="8" y2="30" stroke="currentColor" className="text-blue-400" strokeWidth={0.5} />
        <line x1="12" y1="18" x2="12" y2="30" stroke="currentColor" className="text-blue-400" strokeWidth={0.5} />
        <line x1="34" y1="18" x2="34" y2="30" stroke="currentColor" className="text-blue-400" strokeWidth={0.5} />
        <line x1="38" y1="18" x2="38" y2="30" stroke="currentColor" className="text-blue-400" strokeWidth={0.5} />
        {/* Body */}
        <rect
          x="18"
          y="14"
          width="12"
          height="20"
          rx="2"
          fill="currentColor"
          className="text-slate-300"
        />
        {/* Antenna */}
        <line
          x1="24"
          y1="14"
          x2="24"
          y2="8"
          stroke="currentColor"
          className="text-slate-400"
          strokeWidth={1.5}
        />
        <circle cx="24" cy="7" r="2" fill="currentColor" className="text-red-400" />
        {/* Sensor */}
        <circle
          cx="24"
          cy="24"
          r="3"
          fill="currentColor"
          className={cn(active ? 'text-emerald-400' : 'text-slate-600')}
        />
      </svg>
    </div>
  );
}
