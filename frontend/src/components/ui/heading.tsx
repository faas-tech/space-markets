import { cn } from '@/lib/utils';

interface HeadingProps {
  level?: 1 | 2 | 3 | 4;
  className?: string;
  children: React.ReactNode;
  subtitle?: string;
}

export const Heading = ({ level = 1, className, children, subtitle }: HeadingProps) => {
  const styles = {
    1: "text-3xl font-bold tracking-tight text-foreground",
    2: "text-xl font-semibold tracking-tight text-foreground",
    3: "text-lg font-semibold text-foreground-secondary",
    4: "text-sm font-medium uppercase tracking-wider text-foreground-muted"
  };
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;
  
  if (subtitle) {
    return (
      <div className={cn("space-y-1", className)}>
        <Tag className={styles[level]}>{children}</Tag>
        <p className="text-sm text-foreground-muted">{subtitle}</p>
      </div>
    );
  }
  
  return <Tag className={cn(styles[level], className)}>{children}</Tag>;
};

