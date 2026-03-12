import React from 'react';
import { cn } from '@/lib/utils';
import { type LucideIcon } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: LucideIcon;
  label?: string;
  error?: string;
  suffix?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, icon: Icon, label, error, suffix, disabled, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="text-sm font-medium text-foreground-secondary">
            {label}
          </label>
        )}
        <div className="relative w-full">
          {Icon && (
            <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted" />
          )}
          <input 
            ref={ref}
            disabled={disabled}
            className={cn(
              "w-full bg-background-surface border rounded-lg py-2.5 text-sm text-foreground placeholder:text-foreground-dim",
              "focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20",
              "transition-all duration-200",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              error && "border-destructive focus:border-destructive/50 focus:ring-destructive/20",
              Icon ? "pl-10 pr-4" : "px-4",
              suffix ? "pr-12" : "pr-4",
              className
            )}
            {...props} 
          />
          {suffix && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted">
              {suffix}
            </div>
          )}
        </div>
        {error && (
          <p className="text-xs text-destructive mt-1">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

