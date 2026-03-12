import React from 'react';
import { cn } from '@/lib/utils';

type ElevationLevel = 'base' | 'raised' | 'elevated' | 'glass';
type AccentColor = 'primary' | 'accent' | 'success' | 'warning' | 'destructive' | 'tertiary' | null;

interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  level?: ElevationLevel;
  accent?: AccentColor;
  interactive?: boolean;
  /** @deprecated Use `interactive` instead */
  hoverEffect?: boolean;
}

const accentColors: Record<NonNullable<AccentColor>, string> = {
  primary: 'border-l-primary/50 border-t-primary/20',
  accent: 'border-l-accent/50 border-t-accent/20',
  success: 'border-l-success/50 border-t-success/20',
  warning: 'border-l-warning/50 border-t-warning/20',
  destructive: 'border-l-destructive/50 border-t-destructive/20',
  tertiary: 'border-l-tertiary/50 border-t-tertiary/20',
};

const levelStyles: Record<ElevationLevel, string> = {
  base: 'bg-transparent border border-border',
  raised: 'bg-card border border-card-border',
  elevated: 'bg-card border border-border shadow-lg shadow-black/20 hover:border-border-hover',
  glass: 'bg-card/60 backdrop-blur-md border border-white/5',
};

export const Panel = React.forwardRef<HTMLDivElement, PanelProps>(
  ({ className, level = 'raised', accent = null, interactive = false, hoverEffect = false, children, ...props }, ref) => {
    // backwards compat: hoverEffect maps to interactive
    const isInteractive = interactive || hoverEffect;
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-xl transition-all duration-250',
          levelStyles[level],
          accent && accentColors[accent],
          isInteractive && 'cursor-pointer hover:bg-card-hover hover:scale-[1.01] active:scale-[0.99]',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Panel.displayName = "Panel";

