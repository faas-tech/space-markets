import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
  foundry,
} from 'wagmi/chains';

// For local development, we can use a placeholder projectId
// WalletConnect is optional for local dev (MetaMask/Injected wallet works without it)
export const config = getDefaultConfig({
  appName: 'Space Markets',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '00000000000000000000000000000000',
  chains: [
    foundry,
  ],
  ssr: true,
});
