'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface DataStreamProps {
  className?: string;
  direction?: 'left' | 'right';
  speed?: 'slow' | 'normal' | 'fast';
  color?: 'blue' | 'emerald' | 'amber' | 'purple' | 'indigo';
  active?: boolean;
  label?: string;
}

const speedDurations = {
  slow: '4s',
  normal: '2s',
  fast: '1s',
};

const colorMap = {
  blue: { particle: 'bg-blue-400', trail: 'bg-blue-400/20' },
  emerald: { particle: 'bg-emerald-400', trail: 'bg-emerald-400/20' },
  amber: { particle: 'bg-amber-400', trail: 'bg-amber-400/20' },
  purple: { particle: 'bg-purple-400', trail: 'bg-purple-400/20' },
  indigo: { particle: 'bg-indigo-400', trail: 'bg-indigo-400/20' },
};

export function DataStream({
  className,
  direction = 'right',
  speed = 'normal',
  color = 'blue',
  active = true,
  label,
}: DataStreamProps) {
  const colors = colorMap[color];

  return (
    <div
      className={cn('relative h-px w-full overflow-hidden', className)}
      role="presentation"
      aria-label={label || 'Data stream'}
    >
      {/* Track line */}
      <div className={cn('absolute inset-0', colors.trail)} />

      {/* Particles */}
      {active && (
        <>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="absolute top-0 h-full"
              style={{
                animation: `dataStream ${speedDurations[speed]} linear infinite`,
                animationDelay: `${i * 0.6}s`,
                animationDirection: direction === 'left' ? 'reverse' : 'normal',
              }}
            >
              <div
                className={cn(
                  'w-8 h-full',
                  colors.particle
                )}
                style={{
                  maskImage: direction === 'right'
                    ? 'linear-gradient(to right, transparent, white 40%, white 60%, transparent)'
                    : 'linear-gradient(to left, transparent, white 40%, white 60%, transparent)',
                  WebkitMaskImage: direction === 'right'
                    ? 'linear-gradient(to right, transparent, white 40%, white 60%, transparent)'
                    : 'linear-gradient(to left, transparent, white 40%, white 60%, transparent)',
                }}
              />
            </div>
          ))}
        </>
      )}
    </div>
  );
}
