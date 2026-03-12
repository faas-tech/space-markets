import { useEthersSigner } from '@/lib/ethers-adapter';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useCallback } from 'react';

export function useWallet() {
  const signer = useEthersSigner();
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending: isConnecting, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();

  const connectWallet = useCallback(() => {
    if (!connectors.length) {
      console.error('No wallet connectors available');
      return;
    }
    // Prefer injected (MetaMask/browser) > first available
    const connector = connectors.find(c => c.type === 'injected') || connectors[0];
    connect({ connector });
  }, [connectors, connect]);

  return {
    signer,
    address,
    isConnected,
    connect: connectWallet,
    disconnect,
    isConnecting,
    connectError,
  };
}
