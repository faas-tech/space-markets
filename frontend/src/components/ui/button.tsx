import React from 'react';
import { cn } from '@/lib/utils';
import { type LucideIcon } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', icon: Icon, children, ...props }, ref) => {
    const variants = {
      primary: "bg-blue-600 text-white hover:bg-blue-500 shadow-[0_0_15px_-3px_rgba(37,99,235,0.4)] border border-blue-400/20",
      secondary: "bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700",
      ghost: "bg-transparent text-slate-400 hover:text-white hover:bg-slate-800/50",
      outline: "bg-transparent border border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white"
    };
    const sizes = { sm: "h-8 px-3 text-xs", md: "h-10 px-4 text-sm", lg: "h-12 px-6 text-base" };

    return (
      <button
        ref={ref}
        className={cn("inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed", variants[variant], sizes[size], className)}
        {...props}
      >
        {Icon && <Icon className="w-4 h-4" />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

