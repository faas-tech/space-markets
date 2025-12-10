'use client';

import { Panel } from '../ui/panel';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Activity, Database, Clock, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Bid {
  id: string;
  assetId: string;
  assetName: string;
  assetType: string;
  offerId: string;
  bidPrice: string;
  bidAmount: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  placedAt: string;
  expiresAt: string;
  icon: React.ReactNode;
}

const sampleBids: Bid[] = [
  {
    id: 'bid-001',
    assetId: 'SAT-BW-882',
    assetName: 'Ka-Band Spectrum Block',
    assetType: 'Spectrum',
    offerId: 'offer-1247',
    bidPrice: '14.8 USDC',
    bidAmount: '500 MHz',
    status: 'pending',
    placedAt: '2 hours ago',
    expiresAt: 'T-minus 2h',
    icon: <Activity className="w-5 h-5" />,
  },
  {
    id: 'bid-003',
    assetId: 'OCS-ALPHA-01',
    assetName: 'Orbital Compute',
    assetType: 'Compute',
    offerId: 'offer-2156',
    bidPrice: '17.5 USDC/hr',
    bidAmount: '64 Cores',
    status: 'pending',
    placedAt: '1 day ago',
    expiresAt: 'T-minus 23h',
    icon: <Database className="w-5 h-5" />,
  },
  {
    id: 'bid-002',
    assetId: 'LEO-DEP-04',
    assetName: 'Propellant Storage Unit',
    assetType: 'Storage',
    offerId: 'offer-0891',
    bidPrice: '4.0 USDC',
    bidAmount: '200 kg',
    status: 'pending',
    placedAt: '5 hours ago',
    expiresAt: 'T-minus 5h',
    icon: <Database className="w-5 h-5" />,
  },
  {
    id: 'bid-004',
    assetId: 'SAT-BW-445',
    assetName: 'Ku-Band Spectrum Block',
    assetType: 'Spectrum',
    offerId: 'offer-0923',
    bidPrice: '12.2 USDC',
    bidAmount: '300 MHz',
    status: 'accepted',
    placedAt: '3 days ago',
    expiresAt: 'N/A',
    icon: <Activity className="w-5 h-5" />,
  },
];

const getStatusBadge = (status: Bid['status']) => {
  switch (status) {
    case 'pending':
      return <Badge color="blue">Pending</Badge>;
    case 'accepted':
      return <Badge color="green">Accepted</Badge>;
    case 'rejected':
      return <Badge color="red">Rejected</Badge>;
    case 'expired':
      return <Badge color="slate">Expired</Badge>;
  }
};

const getStatusIcon = (status: Bid['status']) => {
  switch (status) {
    case 'pending':
      return <Clock className="w-4 h-4 text-blue-400" />;
    case 'accepted':
      return <CheckCircle className="w-4 h-4 text-green-400" />;
    case 'rejected':
      return <XCircle className="w-4 h-4 text-red-400" />;
    case 'expired':
      return <Clock className="w-4 h-4 text-slate-400" />;
  }
};

export const MyOrders = () => {
  const pendingBids = sampleBids.filter(bid => bid.status === 'pending');
  const otherBids = sampleBids.filter(bid => bid.status !== 'pending');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-white mb-2">My Orders</h3>
        <p className="text-sm text-slate-400">View and manage your bids on lease offers</p>
      </div>

      {/* Pending Bids Section */}
      {pendingBids.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-blue-400" />
            <h4 className="text-sm font-bold text-white">Pending Bids ({pendingBids.length})</h4>
          </div>
          <div className="space-y-3">
            {pendingBids.map((bid) => (
              <Panel key={bid.id} hoverEffect className="p-4">
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Asset Info */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={cn(
                      "p-2.5 rounded-lg border bg-slate-900 flex-shrink-0",
                      bid.assetType === 'Spectrum' ? "border-blue-500/20 text-blue-400" :
                      bid.assetType === 'Storage' ? "border-orange-500/20 text-orange-400" :
                      bid.assetType === 'Compute' ? "border-purple-500/20 text-purple-400" :
                      "border-slate-700 text-slate-400"
                    )}>
                      {bid.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-bold text-white text-base">{bid.assetName}</h3>
                        {getStatusBadge(bid.status)}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                        <span className="font-mono">Asset: {bid.assetId}</span>
                        <span>•</span>
                        <span className="font-mono">Offer: {bid.offerId}</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                        <div>
                          <div className="text-xs text-slate-500 mb-1">Bid Price</div>
                          <div className="text-sm font-mono text-white font-semibold">{bid.bidPrice}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 mb-1">Amount</div>
                          <div className="text-sm font-mono text-slate-300">{bid.bidAmount}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 mb-1">Placed</div>
                          <div className="text-sm text-slate-300 flex items-center gap-1">
                            {getStatusIcon(bid.status)}
                            {bid.placedAt}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 mb-1">Expires</div>
                          <div className="text-sm text-slate-300">{bid.expiresAt}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <Button variant="ghost" size="sm">View Offer</Button>
                    <Button variant="outline" size="sm" className="border-red-500/50 text-red-400 hover:bg-red-500/10">
                      Cancel Bid
                    </Button>
                  </div>
                </div>
              </Panel>
            ))}
          </div>
        </div>
      )}

      {/* Other Bids Section */}
      {otherBids.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <h4 className="text-sm font-bold text-white">Recent Activity ({otherBids.length})</h4>
          </div>
          <div className="space-y-3">
            {otherBids.map((bid) => (
              <Panel key={bid.id} className="p-4 opacity-75">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={cn(
                      "p-2.5 rounded-lg border bg-slate-900 flex-shrink-0",
                      bid.assetType === 'Spectrum' ? "border-blue-500/20 text-blue-400" :
                      bid.assetType === 'Storage' ? "border-orange-500/20 text-orange-400" :
                      bid.assetType === 'Compute' ? "border-purple-500/20 text-purple-400" :
                      "border-slate-700 text-slate-400"
                    )}>
                      {bid.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-bold text-white text-base">{bid.assetName}</h3>
                        {getStatusBadge(bid.status)}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                        <span className="font-mono">Asset: {bid.assetId}</span>
                        <span>•</span>
                        <span className="font-mono">Offer: {bid.offerId}</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                        <div>
                          <div className="text-xs text-slate-500 mb-1">Bid Price</div>
                          <div className="text-sm font-mono text-white font-semibold">{bid.bidPrice}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 mb-1">Amount</div>
                          <div className="text-sm font-mono text-slate-300">{bid.bidAmount}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 mb-1">Placed</div>
                          <div className="text-sm text-slate-300 flex items-center gap-1">
                            {getStatusIcon(bid.status)}
                            {bid.placedAt}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 mb-1">Status</div>
                          <div className="text-sm text-slate-300 capitalize">{bid.status}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <Button variant="ghost" size="sm">View Details</Button>
                  </div>
                </div>
              </Panel>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {sampleBids.length === 0 && (
        <Panel className="p-12 text-center">
          <Clock className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">No Orders Yet</h3>
          <p className="text-sm text-slate-400 mb-4">Place your first bid on a lease offer to get started.</p>
          <Button variant="primary">Browse Marketplace</Button>
        </Panel>
      )}
    </div>
  );
};

