import { Panel } from '../ui/panel';
import { DataText } from '../ui/data-text';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { Activity, Database, Globe } from 'lucide-react';

export const AssetRow = ({ data }: { data: any }) => (
  <Panel hoverEffect className="mb-3 p-4">
    {/* Row 1: Asset Name, Status, and Actions */}
    <div className="flex items-center justify-between gap-4 mb-3">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className={cn("p-2.5 rounded-lg border bg-slate-900 flex-shrink-0",
          data.type === 'Spectrum' ? "border-blue-500/20 text-blue-400" :
          data.type === 'Storage' ? "border-orange-500/20 text-orange-400" :
          data.type === 'Compute' ? "border-purple-500/20 text-purple-400" :
          "border-slate-700 text-slate-400"
        )}>
          {data.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-slate-100 text-base">{data.name}</h3>
            <Badge color={data.status === 'Active' ? 'green' : 'slate'}>{data.status}</Badge>
          </div>
        </div>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <Button variant="ghost" size="sm">Details</Button>
        <Button variant="primary" size="sm">Trade</Button>
      </div>
    </div>

    {/* Row 2: ID and Region */}
    <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
      <span className="font-mono">ID: {data.id}</span>
      <span>•</span>
      <span>{data.region}</span>
    </div>

    {/* Row 3: Metrics */}
    <div className="grid grid-cols-3 gap-4 md:gap-8">
      <DataText label="Volume" value={data.volume} />
      <DataText label="Next Slot" value={data.slot} />
      <DataText label="Ask Price" value={data.price} trend={data.trend} />
    </div>
  </Panel>
);
