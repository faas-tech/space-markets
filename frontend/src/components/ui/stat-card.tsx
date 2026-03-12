import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  className?: string;
  sparkline?: React.ReactNode;
}

export const StatCard = ({ label, value, trend, className, sparkline }: StatCardProps) => {
  const isPositive = trend?.direction === 'up';
  
  return (
    <div className={cn(
      "p-4 rounded-xl bg-card border border-card-border transition-all duration-200",
      "hover:border-border-hover hover:bg-card-hover",
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-foreground-muted">
            {label}
          </p>
          <p className="text-2xl font-bold font-data text-foreground tracking-tight">
            {value}
          </p>
        </div>
        {sparkline && (
          <div className="h-10 w-20">
            {sparkline}
          </div>
        )}
      </div>
      {trend && (
        <div className={cn(
          "mt-2 flex items-center gap-1 text-xs font-medium",
          isPositive ? "text-success" : "text-destructive"
        )}>
          {isPositive ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
          <span>{Math.abs(trend.value)}%</span>
        </div>
      )}
    </div>
  );
};
