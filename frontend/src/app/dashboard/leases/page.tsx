'use client';

import AppLayout from '@/components/layout/app-layout';
import { StreamingPaymentPanel } from '@/components/streaming/streaming-payment-panel';
import { Heading } from '@/components/ui/heading';
import { useState } from 'react';

export default function LeasesPage() {
  const [leaseId, setLeaseId] = useState('');

  return (
    <AppLayout>
      <div className="mb-6">
        <Heading level={2}>Active Leases</Heading>
        <p className="text-slate-400">Manage your active streaming payments.</p>
      </div>

      <div className="max-w-2xl">
        <div className="mb-6">
           <label className="block text-sm text-slate-400 mb-2">Enter Lease Token ID to Stream Payment</label>
           <input 
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
              value={leaseId}
              onChange={(e) => setLeaseId(e.target.value)}
              placeholder="e.g. 1"
           />
        </div>

        {leaseId && (
          <StreamingPaymentPanel leaseId={leaseId} />
        )}
      </div>
    </AppLayout>
  );
}

