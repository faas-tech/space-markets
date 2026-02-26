'use client';

import React, { useState, useCallback } from 'react';
import { useDemoContext } from './demo-provider';
import { cn } from '@/lib/utils';

export function ShareButton() {
  const { state } = useDemoContext();
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(() => {
    const params = new URLSearchParams();
    params.set('preset', state.activePreset);
    params.set('step', String(state.currentStep));
    if (state.playbackSpeed !== 1) {
      params.set('speed', String(state.playbackSpeed));
    }
    if (state.pricingMode !== 'standard') {
      params.set('pricing', state.pricingMode);
    }

    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;

    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // Fallback: select a hidden input
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [state.activePreset, state.currentStep, state.playbackSpeed, state.pricingMode]);

  return (
    <button
      onClick={handleShare}
      className={cn(
        'w-10 h-10 flex items-center justify-center rounded-lg border transition-all relative',
        copied
          ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-400'
          : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600'
      )}
      aria-label={copied ? 'Link copied' : 'Copy share link'}
      title="Copy share link"
    >
      {copied ? (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
        </svg>
      )}

      {/* Copied toast */}
      {copied && (
        <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-[10px] font-bold text-emerald-400 whitespace-nowrap animate-[fadeInUp_0.2s_ease-out]">
          Copied!
        </span>
      )}
    </button>
  );
}
