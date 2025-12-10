'use client';

import { useState } from 'react';
import { MarketplaceService } from '@/lib/contracts/marketplace';
import { useWallet } from '@/hooks/useWallet';
import { Button } from '@/components/ui/button';

export function AcceptBidButton({
  offerId,
  bidIndex
}: {
  offerId: string;
  bidIndex: number;
}) {
  const { signer } = useWallet();
  const [loading, setLoading] = useState(false);

  const handleAcceptBid = async () => {
    if (!signer) return;
    setLoading(true);
    try {
      const chainId = 31337; 

      const service = new MarketplaceService(
        process.env.NEXT_PUBLIC_MARKETPLACE!,
        process.env.NEXT_PUBLIC_STABLECOIN!,
        process.env.NEXT_PUBLIC_LEASE_FACTORY!,
        signer,
        chainId
      );

      const result = await service.acceptBid(offerId, bidIndex);

      alert(
        `Bid accepted!\nLease NFT: ${result.leaseTokenId}\nLessee: ${result.lessee}\nTx: ${result.txHash}`
      );
    } catch (error) {
      console.error('Accept failed:', error);
      alert('Accept failed: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleAcceptBid} disabled={loading || !signer} size="sm">
      {loading ? 'Accepting...' : 'Accept Bid'}
    </Button>
  );
}

