import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({
  className,
  variant = 'rectangular',
  width,
  height,
}: SkeletonProps) {
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  return (
    <div
      className={cn(
        'bg-muted animate-pulse',
        variantClasses[variant],
        className
      )}
      style={{ width, height }}
    />
  );
}

/** Skeleton matching the AssetRow layout */
export function AssetRowSkeleton() {
  return (
    <div className="p-4 border border-border rounded-xl bg-card space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton variant="circular" width={40} height={40} />
          <div className="space-y-2">
            <Skeleton width={180} height={16} />
            <Skeleton width={120} height={12} />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton width={80} height={32} />
          <Skeleton width={80} height={32} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 pt-3 border-t border-border">
        <Skeleton width="100%" height={24} />
        <Skeleton width="100%" height={24} />
        <Skeleton width="100%" height={24} />
      </div>
    </div>
  );
}

/** Skeleton matching the 3-column market stats grid */
export function MarketStatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-4 border border-border rounded-xl bg-card space-y-2">
          <Skeleton width={120} height={12} />
          <Skeleton width={150} height={24} />
        </div>
      ))}
    </div>
  );
}
