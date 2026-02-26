'use client';

import React, { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';

interface PaymentPulseProps {
  /** Whether pulses are active */
  active?: boolean;
  /** USDC amount per pulse */
  amountPerPulse?: number;
  /** Interval between pulses in ms */
  interval?: number;
  /** Callback with running total */
  onPulse?: (total: number) => void;
  className?: string;
}

export function PaymentPulse({
  active = false,
  amountPerPulse = 0.000386,
  interval = 1000,
  onPulse,
  className,
}: PaymentPulseProps) {
  const [pulses, setPulses] = useState<number[]>([]);
  const [total, setTotal] = useState(0);
  const pulseIdRef = useRef(0);

  useEffect(() => {
    if (!active) {
      setPulses([]);
      setTotal(0);
      pulseIdRef.current = 0;
      return;
    }

    const timer = setInterval(() => {
      const id = pulseIdRef.current++;
      setPulses((prev) => {
        const next = [...prev, id];
        // Keep only last 6 pulses for performance
        return next.slice(-6);
      });
      setTotal((prev) => {
        const newTotal = prev + amountPerPulse;
        onPulse?.(newTotal);
        return newTotal;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [active, amountPerPulse, interval, onPulse]);

  return (
    <div className={cn('relative flex items-center gap-4', className)}>
      {/* Source node */}
      <div className="flex flex-col items-center gap-1 shrink-0">
        <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
          <span className="text-xs font-bold text-blue-400">L</span>
        </div>
        <span className="text-[10px] text-slate-600">Lessee</span>
      </div>

      {/* Payment stream */}
      <div className="flex-1 relative h-8 overflow-hidden">
        {/* Track */}
        <div className="absolute inset-y-0 left-0 right-0 flex items-center">
          <div className="w-full h-px bg-slate-800" />
        </div>

        {/* Animated pulses */}
        {pulses.map((id) => (
          <div
            key={id}
            className="absolute top-1/2 -translate-y-1/2 left-0 animate-[dataStream_1.5s_ease-out_forwards]"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          </div>
        ))}

        {/* Amount label */}
        {active && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1">
            <span className="text-[10px] font-mono text-emerald-400/60">
              +{amountPerPulse.toFixed(6)} USDC/s
            </span>
          </div>
        )}
      </div>

      {/* Destination node */}
      <div className="flex flex-col items-center gap-1 shrink-0">
        <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
          <span className="text-xs font-bold text-emerald-400">$</span>
        </div>
        <span className="text-[10px] text-slate-600">Lessor</span>
      </div>
    </div>
  );
}
