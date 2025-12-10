'use client';

import { useState } from 'react';
import { MarketplaceService } from '@/lib/contracts/marketplace';
import { useWallet } from '@/hooks/useWallet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ethers } from 'ethers';

export function BidForm({ offerId }: { offerId: string }) {
  const { signer } = useWallet();
  const [escrowAmount, setEscrowAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePlaceBid = async () => {
    if (!signer) return;
    setLoading(true);
    try {
      // In a real app, chainId should come from the wallet/network
      const chainId = 31337; 

      const service = new MarketplaceService(
        process.env.NEXT_PUBLIC_MARKETPLACE!,
        process.env.NEXT_PUBLIC_STABLECOIN!,
        process.env.NEXT_PUBLIC_LEASE_FACTORY!,
        signer,
        chainId
      );

      const result = await service.placeBid(offerId, escrowAmount);

      alert(`Bid placed! Index: ${result.bidIndex}\nTx: ${result.txHash}`);
    } catch (error) {
      console.error('Bid failed:', error);
      alert('Bid failed: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Place Your Bid</h3>
      <div className="flex gap-2">
        <Input
          type="number"
          placeholder="Escrow amount (USDC)"
          value={escrowAmount}
          onChange={(e) => setEscrowAmount(e.target.value)}
        />
        <Button onClick={handlePlaceBid} disabled={loading || !escrowAmount || !signer}>
          {loading ? 'Placing...' : 'Place Bid'}
        </Button>
      </div>
    </div>
  );
}

