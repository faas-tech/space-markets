import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
  base,
  baseSepolia,
  foundry,
} from 'wagmi/chains';

const isDev = process.env.NODE_ENV === 'development';

export const config = getDefaultConfig({
  appName: 'Space Markets',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '00000000000000000000000000000000',
  chains: isDev
    ? [foundry, baseSepolia]    // Dev: local Anvil + testnet
    : [base, baseSepolia],      // Prod: mainnet + testnet
  ssr: true,
});
