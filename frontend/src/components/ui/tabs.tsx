import { cn } from "@/lib/utils";

export const Tabs = ({ items, active, onChange }: { items: string[], active: string, onChange: (v: string) => void }) => (
  <div className="flex border-b border-slate-800 w-full mb-4">
    {items.map(item => (
      <button
        key={item}
        onClick={() => onChange(item)}
        className={cn(
          "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
          active === item 
            ? "border-blue-500 text-white" 
            : "border-transparent text-slate-500 hover:text-slate-300 hover:border-slate-700"
        )}
      >
        {item}
      </button>
    ))}
  </div>
);

