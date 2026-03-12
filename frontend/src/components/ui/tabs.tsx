import { cn } from "@/lib/utils";

interface Tab {
  id: string;
  label: string;
  count?: number;
}

interface TabsProps {
  items: (Tab | string)[];
  active: string;
  onChange: (v: string) => void;
  size?: 'default' | 'compact';
}

function normalizeTab(item: Tab | string): Tab {
  return typeof item === 'string' ? { id: item, label: item } : item;
}

export const Tabs = ({ items, active, onChange, size = 'default' }: TabsProps) => (
  <div className={cn("flex border-b border-border w-full", size === 'compact' ? 'mb-2' : 'mb-4')}>
    {items.map(normalizeTab).map(item => (
      <button
        key={item.id}
        onClick={() => onChange(item.id)}
        className={cn(
          "relative font-medium transition-colors duration-200",
          size === 'default' ? "px-5 py-3 text-sm" : "px-3 py-2 text-xs",
          active === item.id 
            ? "text-foreground" 
            : "text-foreground-muted hover:text-foreground-secondary"
        )}
      >
        <span className="flex items-center gap-2">
          {item.label}
          {item.count !== undefined && (
            <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-secondary text-foreground-muted">
              {item.count}
            </span>
          )}
        </span>
        {active === item.id && (
          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
        )}
      </button>
    ))}
  </div>
);

