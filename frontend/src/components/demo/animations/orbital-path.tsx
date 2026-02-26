'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface OrbitalPathProps {
  className?: string;
  size?: number;
  children?: React.ReactNode;
  /** Whether the orbit path animation is active */
  active?: boolean;
  /** Color of the orbit ring */
  color?: string;
}

export function OrbitalPath({
  className,
  size = 300,
  children,
  active = true,
  color = 'rgba(59, 130, 246, 0.3)',
}: OrbitalPathProps) {
  const center = size / 2;
  const radius = size / 2 - 20;

  return (
    <div
      className={cn('relative', className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {/* Orbit ring */}
      <svg
        className="absolute inset-0"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={1}
          strokeDasharray="6 4"
          className={cn(active && 'animate-[orbitalRotation_30s_linear_infinite]')}
          style={{ transformOrigin: `${center}px ${center}px` }}
        />
        {/* Secondary orbit */}
        <circle
          cx={center}
          cy={center}
          r={radius * 0.65}
          fill="none"
          stroke={color}
          strokeWidth={0.5}
          strokeDasharray="3 6"
          opacity={0.5}
        />
      </svg>

      {/* Rotating element on the orbit path */}
      {active && (
        <div
          className="absolute animate-[orbitalRotation_12s_linear_infinite]"
          style={{
            width: size,
            height: size,
            transformOrigin: `${center}px ${center}px`,
          }}
        >
          <div
            className="w-3 h-3 bg-blue-500 rounded-full shadow-[0_0_12px_rgba(59,130,246,0.8)]"
            style={{
              position: 'absolute',
              left: center - 6,
              top: center - radius - 6,
            }}
          />
        </div>
      )}

      {/* Center content */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ padding: size * 0.25 }}
      >
        {children}
      </div>
    </div>
  );
}
