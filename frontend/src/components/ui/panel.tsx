import React from 'react';
import { cn } from '@/lib/utils';

interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverEffect?: boolean;
}

export const Panel = ({ className, children, hoverEffect = false, ...props }: PanelProps) => (
  <div className={cn(
    "bg-slate-900/40 backdrop-blur-md border border-slate-800/60 rounded-xl",
    hoverEffect && "transition-all duration-300 hover:border-slate-600 hover:bg-slate-900/60 hover:shadow-lg hover:shadow-blue-900/10",
    className
  )} {...props}>
    {children}
  </div>
);

