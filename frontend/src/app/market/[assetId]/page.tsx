'use client';

import AppLayout from '@/components/layout/app-layout';
import { CreateLeaseOfferForm } from '@/components/forms/create-lease-offer-form';
import { BidForm } from '@/components/forms/bid-form';
import { AcceptBidButton } from '@/components/market/accept-bid-button';
import { Heading } from '@/components/ui/heading';
import { Panel } from '@/components/ui/panel';
import { use, useState } from 'react';
import { Button } from '@/components/ui/button';

export default function AssetMarketPage({ params }: { params: Promise<{ assetId: string }> }) {
  const { assetId } = use(params);
  const [activeOfferId, setActiveOfferId] = useState<string>(''); 

  return (
    <AppLayout>
      <div className="mb-6">
        <Heading level={2}>Asset Details: {assetId}</Heading>
        <p className="text-slate-400">Manage leasing for this asset.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
           <CreateLeaseOfferForm assetId={BigInt(assetId)} />
        </div>

        <div className="space-y-6">
          <Panel className="p-6">
            <h3 className="text-lg font-bold mb-4 text-white">Active Offers</h3>
            <div className="space-y-4">
               {/* Simulating active offer input for demo */}
               <div>
                 <label className="text-sm text-slate-400">Simulate Offer Interaction (Enter Offer ID)</label>
                 <div className="flex gap-2 mt-1">
                   <input 
                     className="bg-slate-900 border border-slate-700 rounded p-2 text-white w-full"
                     value={activeOfferId}
                     onChange={(e) => setActiveOfferId(e.target.value)}
                     placeholder="e.g. 1"
                   />
                 </div>
               </div>

               {activeOfferId && (
                 <div className="border-t border-slate-800 pt-4">
                   <BidForm offerId={activeOfferId} />
                   
                   <div className="mt-4 pt-4 border-t border-slate-800">
                     <h4 className="text-sm font-semibold text-slate-300 mb-2">Lessor Actions</h4>
                     <div className="flex items-center gap-2">
                        <input className="bg-slate-900 border border-slate-700 rounded p-1 text-white text-sm w-20" placeholder="Bid Index" />
                        <AcceptBidButton offerId={activeOfferId} bidIndex={0} />
                     </div>
                   </div>
                 </div>
               )}
            </div>
          </Panel>
        </div>
      </div>
    </AppLayout>
  );
}

