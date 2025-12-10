import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export const DataText = ({ value, label, trend }: { value: string, label?: string, trend?: 'up' | 'down' | 'neutral' }) => (
  <div className="flex flex-col">
    {label && <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">{label}</span>}
    <div className="flex items-center gap-2">
      <span className="font-mono text-slate-100 font-medium">{value}</span>
      {trend === 'up' && <ArrowUpRight className="w-3 h-3 text-emerald-500" />}
      {trend === 'down' && <ArrowDownRight className="w-3 h-3 text-rose-500" />}
    </div>
  </div>
);

