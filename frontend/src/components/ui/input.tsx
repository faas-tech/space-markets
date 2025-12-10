import React from 'react';
import { cn } from '@/lib/utils';
import { type LucideIcon } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: LucideIcon;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, icon: Icon, ...props }, ref) => {
    return (
      <div className="relative w-full">
        {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />}
        <input 
          ref={ref}
          className={cn(
            "w-full bg-slate-950/50 border border-slate-800 rounded-lg py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all",
            Icon ? "pl-10 pr-4" : "px-4",
            className
          )}
          {...props} 
        />
      </div>
    );
  }
);
Input.displayName = "Input";

