import { cn } from '@/lib/utils';

export const Badge = ({ children, color = 'slate' }: { children: React.ReactNode, color?: 'slate'|'blue'|'green'|'red' }) => {
  const colors = {
    slate: "bg-slate-800 text-slate-300 border-slate-700",
    blue: "bg-blue-900/30 text-blue-300 border-blue-800/50",
    green: "bg-emerald-900/30 text-emerald-300 border-emerald-800/50",
    red: "bg-rose-900/30 text-rose-300 border-rose-800/50",
  };
  return (
    <span className={cn("px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide border", colors[color])}>
      {children}
    </span>
  );
};

