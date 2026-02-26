'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface SignatureFlowProps {
  /** Label shown during digest computation */
  label?: string;
  /** The fields being signed */
  fields: Array<{ name: string; value: string }>;
  /** The resulting signature digest */
  digest: string;
  /** Whether the animation is active */
  active?: boolean;
  className?: string;
  /** Delay before starting */
  delay?: number;
}

export function SignatureFlow({
  label = 'EIP-712 Digest',
  fields,
  digest,
  active = false,
  className,
  delay: delayMs = 0,
}: SignatureFlowProps) {
  const [phase, setPhase] = useState<'idle' | 'hashing' | 'revealing' | 'complete'>('idle');
  const [revealedChars, setRevealedChars] = useState(0);

  useEffect(() => {
    if (!active) {
      setPhase('idle');
      setRevealedChars(0);
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];

    timers.push(setTimeout(() => setPhase('hashing'), delayMs));
    timers.push(setTimeout(() => setPhase('revealing'), delayMs + 1200));

    // Reveal hash characters one by one
    const hashLength = Math.min(digest.length, 20);
    for (let i = 0; i <= hashLength; i++) {
      timers.push(
        setTimeout(() => {
          setRevealedChars(i);
          if (i === hashLength) {
            setPhase('complete');
          }
        }, delayMs + 1200 + i * 60)
      );
    }

    return () => timers.forEach(clearTimeout);
  }, [active, delayMs, digest.length]);

  const displayHash =
    phase === 'complete'
      ? `${digest.slice(0, 10)}...${digest.slice(-8)}`
      : phase === 'revealing'
        ? digest.slice(0, 2 + revealedChars) + '...'
        : '0x...';

  return (
    <div className={cn('space-y-3', className)}>
      {/* Field inputs flowing into hash */}
      <div className="space-y-1.5">
        {fields.map((field, idx) => (
          <div
            key={field.name}
            className={cn(
              'flex items-center gap-2 transition-all duration-300',
              phase !== 'idle' ? 'opacity-100' : 'opacity-40'
            )}
            style={{ transitionDelay: `${idx * 100}ms` }}
          >
            <span className="text-[10px] font-mono text-slate-500 w-24 text-right shrink-0">
              {field.name}
            </span>
            <svg className="w-4 h-3 text-slate-700 shrink-0" viewBox="0 0 16 12">
              <path
                d="M0 6h12m0 0l-3-3m3 3l-3 3"
                stroke="currentColor"
                strokeWidth={1.5}
                fill="none"
                className={cn(
                  'transition-colors duration-300',
                  phase === 'hashing' || phase === 'revealing' || phase === 'complete'
                    ? 'text-blue-500'
                    : 'text-slate-700'
                )}
              />
            </svg>
            <span className="text-[10px] font-mono text-slate-400 truncate">
              {field.value}
            </span>
          </div>
        ))}
      </div>

      {/* Hash computation indicator */}
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-500',
            phase === 'hashing' &&
              'bg-blue-900/20 border-blue-500/30 shadow-[0_0_15px_-3px_rgba(59,130,246,0.4)]',
            phase === 'revealing' &&
              'bg-blue-900/20 border-blue-500/40',
            phase === 'complete' &&
              'bg-emerald-900/20 border-emerald-500/30 shadow-[0_0_15px_-3px_rgba(16,185,129,0.3)]',
            phase === 'idle' && 'bg-slate-900/40 border-slate-800/60'
          )}
        >
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold shrink-0">
            {label}
          </span>
          <code
            className={cn(
              'text-xs font-mono transition-colors duration-300',
              phase === 'complete' ? 'text-emerald-400' : 'text-blue-400'
            )}
          >
            {displayHash}
          </code>
          {phase === 'hashing' && (
            <div className="w-3 h-3 border-2 border-blue-400/60 border-t-blue-400 rounded-full animate-spin" />
          )}
          {phase === 'complete' && (
            <svg
              className="w-4 h-4 text-emerald-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}
