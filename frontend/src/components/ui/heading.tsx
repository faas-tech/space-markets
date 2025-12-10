import { cn } from '@/lib/utils';

export const Heading = ({ level = 1, className, children }: { level?: 1|2|3|4, className?: string, children: React.ReactNode }) => {
  const styles = {
    1: "text-3xl font-bold tracking-tight text-white",
    2: "text-xl font-semibold tracking-tight text-white",
    3: "text-lg font-medium text-slate-200",
    4: "text-sm font-semibold uppercase tracking-wider text-slate-500"
  };
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;
  return <Tag className={cn(styles[level], className)}>{children}</Tag>;
};

