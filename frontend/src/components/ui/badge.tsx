import { cn } from '@/lib/utils';
import { Circle } from 'lucide-react';

type BadgeVariant = 'solid' | 'outline' | 'glow' | 'dot';
type BadgeColorCore = 'slate' | 'blue' | 'cyan' | 'emerald' | 'amber' | 'rose' | 'violet';
/** Accepts legacy 'green'/'red' — mapped to 'emerald'/'rose' */
type BadgeColor = BadgeColorCore | 'green' | 'red';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  color?: BadgeColor;
  className?: string;
  pulse?: boolean;
}

const colorStyles: Record<BadgeColorCore, string> = {
  slate: 'bg-secondary text-foreground-secondary border-border',
  blue: 'bg-primary-soft text-primary border-primary/30',
  cyan: 'bg-accent-soft text-accent border-accent/30',
  emerald: 'bg-success-soft text-success border-success/30',
  amber: 'bg-warning-soft text-warning border-warning/30',
  rose: 'bg-destructive-soft text-destructive border-destructive/30',
  violet: 'bg-tertiary-soft text-tertiary border-tertiary/30',
};

const glowStyles: Record<BadgeColorCore, string> = {
  slate: 'shadow-none',
  blue: 'shadow-[0_0_12px_-2px_hsl(var(--primary-glow))]',
  cyan: 'shadow-[0_0_12px_-2px_hsl(var(--accent-glow))]',
  emerald: 'shadow-[0_0_12px_-2px_hsl(160_84%_45%_/_0.2)]',
  amber: 'shadow-[0_0_12px_-2px_hsl(38_92%_55%_/_0.2)]',
  rose: 'shadow-[0_0_12px_-2px_hsl(0_72%_55%_/_0.2)]',
  violet: 'shadow-[0_0_12px_-2px_hsl(var(--tertiary-glow))]',
};

const dotColors: Record<BadgeColorCore, string> = {
  slate: 'bg-foreground-muted',
  blue: 'bg-primary',
  cyan: 'bg-accent',
  emerald: 'bg-success',
  amber: 'bg-warning',
  rose: 'bg-destructive',
  violet: 'bg-tertiary',
};

export const Badge = ({ children, variant = 'solid', color: rawColor = 'slate', className, pulse }: BadgeProps) => {
  // Backwards compat: map old color names
  const color: Exclude<BadgeColor, 'green' | 'red'> = rawColor === 'green' ? 'emerald' : rawColor === 'red' ? 'rose' : rawColor as any;
  const variants = {
    solid: colorStyles[color],
    outline: `bg-transparent border ${colorStyles[color].replace(/bg-[^\s]+/, '').replace(/text-[^\s]+/, '')}`,
    glow: `${colorStyles[color]} ${glowStyles[color]}`,
    dot: colorStyles[color],
  };

  const baseClasses = "px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide border transition-all duration-200";
  
  if (variant === 'dot') {
    return (
      <span className={cn(baseClasses, variants[variant], "flex items-center gap-1.5", className)}>
        <span className="relative flex h-2 w-2">
          {pulse && (
            <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", dotColors[color])} />
          )}
          <span className={cn("relative inline-flex rounded-full h-2 w-2", dotColors[color])} />
        </span>
        {children}
      </span>
    );
  }

  return (
    <span className={cn(baseClasses, variants[variant], className)}>
      {children}
    </span>
  );
};

