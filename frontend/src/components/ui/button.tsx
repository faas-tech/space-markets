import React from 'react';
import { cn } from '@/lib/utils';
import { type LucideIcon } from 'lucide-react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', icon: Icon, loading, children, disabled, ...props }, ref) => {
    const variants = {
      primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_-3px_hsl(var(--primary-glow))] border border-white/10",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border",
      ghost: "bg-transparent text-foreground-secondary hover:text-foreground hover:bg-background-hover",
      outline: "bg-transparent border border-border text-foreground-secondary hover:border-border-hover hover:text-foreground",
      danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90 border border-white/10"
    };
    const sizes = { sm: "h-8 px-3 text-xs", md: "h-10 px-4 text-sm", lg: "h-12 px-6 text-base" };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "hover:scale-[1.02] active:scale-[0.98]",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : Icon ? (
          <Icon className="w-4 h-4" />
        ) : null}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

