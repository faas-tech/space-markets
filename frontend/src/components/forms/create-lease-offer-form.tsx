'use client';

import { useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { MarketplaceService } from '@/lib/contracts/marketplace';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Panel } from '@/components/ui/panel';

export function CreateLeaseOfferForm({ assetId }: { assetId: bigint }) {
  const { signer } = useWallet();
  const [formData, setFormData] = useState({
    rentAmount: '1000', // USDC per period
    rentPeriod: 30 * 24 * 60 * 60, // 30 days in seconds
    securityDeposit: '5000', // USDC
    duration: 365 // days
  });
  const [loading, setLoading] = useState(false);
  const [offerId, setOfferId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signer) return;

    setLoading(true);
    try {
      const service = new MarketplaceService(
        process.env.NEXT_PUBLIC_MARKETPLACE!,
        process.env.NEXT_PUBLIC_STABLECOIN!, // Payment token
        process.env.NEXT_PUBLIC_LEASE_FACTORY!, // Not needed for posting offer but needed for constructor
        signer,
        31337 // Chain ID (Anvil)
      );

      const now = Math.floor(Date.now() / 1000);
      const endTime = now + (formData.duration * 24 * 60 * 60);

      const { offerId } = await service.postLeaseOffer(
        assetId,
        'orbital_compute',
        {
          rentAmount: formData.rentAmount,
          rentPeriod: formData.rentPeriod,
          securityDeposit: formData.securityDeposit,
          startTime: now,
          endTime
        },
        process.env.NEXT_PUBLIC_STABLECOIN!
      );

      setOfferId(offerId.toString());
    } catch (error) {
      console.error('Failed to create lease offer:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Panel className="p-6">
      <h2 className="text-xl font-bold mb-4 text-white">Create Lease Offer</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm text-slate-400 mb-1 block">Rent Amount (USDC per period)</label>
          <Input
            type="number"
            value={formData.rentAmount}
            onChange={(e) => setFormData({ ...formData, rentAmount: e.target.value })}
            required
          />
        </div>

        <div>
          <label className="text-sm text-slate-400 mb-1 block">Security Deposit (USDC)</label>
          <Input
            type="number"
            value={formData.securityDeposit}
            onChange={(e) => setFormData({ ...formData, securityDeposit: e.target.value })}
            required
          />
        </div>

        <div>
          <label className="text-sm text-slate-400 mb-1 block">Lease Duration (days)</label>
          <Input
            type="number"
            value={formData.duration}
            onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
            required
          />
        </div>

        <Button
          type="submit"
          disabled={loading || !signer}
          className="w-full"
        >
          {loading ? 'Creating Offer...' : 'Create Lease Offer'}
        </Button>

        {offerId && (
          <div className="mt-4 p-4 bg-emerald-900/20 border border-emerald-500/30 rounded-lg">
            <p className="font-bold text-emerald-400">Lease Offer Created!</p>
            <p className="text-sm text-emerald-200/80">Offer ID: {offerId}</p>
          </div>
        )}
      </form>
    </Panel>
  );
}

