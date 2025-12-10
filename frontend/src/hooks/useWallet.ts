import { useEthersSigner } from '@/lib/ethers-adapter';
import { useAccount, useConnect, useDisconnect } from 'wagmi';

export function useWallet() {
  const signer = useEthersSigner();
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  return { 
    signer, 
    address, 
    isConnected,
    connect: () => connect({ connector: connectors[0] }), // Connect to first available connector (e.g. Injected)
    disconnect 
  };
}

