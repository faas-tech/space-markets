'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface BlockAnimationProps {
  blockNumber: number;
  txHash?: string;
  active?: boolean;
  className?: string;
  onComplete?: () => void;
  delay?: number;
}

export function BlockAnimation({
  blockNumber,
  txHash,
  active = false,
  className,
  onComplete,
  delay: delayMs = 0,
}: BlockAnimationProps) {
  const [phase, setPhase] = useState<'hidden' | 'dropping' | 'landed'>('hidden');

  useEffect(() => {
    if (!active) {
      setPhase('hidden');
      return;
    }

    const t1 = setTimeout(() => setPhase('dropping'), delayMs);
    const t2 = setTimeout(() => {
      setPhase('landed');
      onComplete?.();
    }, delayMs + 600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [active, delayMs, onComplete]);

  return (
    <div className={cn('relative', className)}>
      <div
        className={cn(
          'bg-slate-800/80 border border-slate-700/60 rounded-lg p-3 transition-all duration-500',
          phase === 'hidden' && 'opacity-0 -translate-y-6',
          phase === 'dropping' && 'opacity-70 -translate-y-2',
          phase === 'landed' && 'opacity-100 translate-y-0 border-blue-500/30'
        )}
        style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'w-2 h-2 rounded-full transition-colors duration-300',
                phase === 'landed' ? 'bg-emerald-400' : 'bg-slate-600'
              )}
            />
            <span className="text-xs font-mono text-amber-400">
              #{blockNumber.toLocaleString()}
            </span>
          </div>
          {txHash && (
            <span className="text-[10px] font-mono text-slate-500 truncate max-w-[120px]">
              {txHash}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
