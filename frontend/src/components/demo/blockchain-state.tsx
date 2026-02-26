'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { truncateAddress, truncateHash } from '@/lib/demo/demo-data';

interface BlockchainField {
  label: string;
  value: string;
  type: 'address' | 'hash' | 'block' | 'amount' | 'text';
  highlight?: boolean;
}

interface BlockchainStateProps {
  fields: BlockchainField[];
  title?: string;
  className?: string;
  compact?: boolean;
}

function formatByType(value: string, type: BlockchainField['type']): string {
  switch (type) {
    case 'address':
      return truncateAddress(value);
    case 'hash':
      return truncateHash(value);
    default:
      return value;
  }
}

function colorByType(type: BlockchainField['type'], highlight?: boolean): string {
  if (highlight) return 'text-emerald-400';
  switch (type) {
    case 'address':
      return 'text-emerald-400';
    case 'hash':
      return 'text-blue-400';
    case 'block':
      return 'text-amber-400';
    case 'amount':
      return 'text-cyan-400';
    default:
      return 'text-slate-300';
  }
}

export function BlockchainState({
  fields,
  title,
  className,
  compact = false,
}: BlockchainStateProps) {
  return (
    <div
      className={cn(
        'bg-slate-900/60 backdrop-blur border border-slate-800/60 rounded-xl overflow-hidden',
        className
      )}
    >
      {title && (
        <div className="px-4 py-2.5 border-b border-slate-800/60 bg-slate-900/40">
          <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">
            {title}
          </h4>
        </div>
      )}
      <div className={cn('divide-y divide-slate-800/40', compact ? 'text-xs' : 'text-sm')}>
        {fields.map((field, i) => (
          <div
            key={`${field.label}-${i}`}
            className={cn(
              'flex items-center justify-between gap-4',
              compact ? 'px-3 py-2' : 'px-4 py-3'
            )}
          >
            <span className="text-slate-500 font-medium shrink-0">{field.label}</span>
            <span
              className={cn(
                'font-mono truncate text-right',
                colorByType(field.type, field.highlight)
              )}
              title={field.value}
            >
              {formatByType(field.value, field.type)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface AddressTagProps {
  label: string;
  address: string;
  className?: string;
}

export function AddressTag({ label, address, className }: AddressTagProps) {
  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <span className="text-xs text-slate-500">{label}</span>
      <code className="text-xs font-mono text-emerald-400 bg-slate-800/60 px-2 py-0.5 rounded">
        {truncateAddress(address)}
      </code>
    </div>
  );
}
