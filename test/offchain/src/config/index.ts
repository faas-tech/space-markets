/**
 * Simple configuration system
 *
 * Loads configuration based on environment.
 * Defaults to development settings.
 */

export type X402Network = 'base-mainnet' | 'base-sepolia';

export interface X402Config {
  enabled: boolean;
  facilitatorUrl: string;
  network: X402Network;
  usdcAddress: string;
  usdcDecimals: number;
  verifyOptimistically: boolean;
  paymentModes: Array<'second' | 'batch-5s'>;
  defaultPaymentMode: 'second' | 'batch-5s';
  useMockFacilitator: boolean;
}

export interface AppConfig {
  // Network
  rpcUrl: string;
  chainId: number;
  privateKey: string;

  // Services
  useMockDatabase: boolean;
  useMockCache: boolean;

  // API (if using)
  apiPort?: number;
  apiHost?: string;

  // Paths
  deploymentsDir: string;
  dataDir: string;

  // X402 streaming payments
  x402: X402Config;
}

/**
 * Default configuration (Development with Anvil)
 */
export const defaultConfig: AppConfig = {
  rpcUrl: 'http://127.0.0.1:8545',
  chainId: 31337,
  privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', // Anvil account #0

  useMockDatabase: true,
  useMockCache: true,

  apiPort: 3000,
  apiHost: '127.0.0.1',

  deploymentsDir: './deployments',
  dataDir: './data',

  x402: {
    enabled: true,
    facilitatorUrl: process.env.X402_FACILITATOR_URL || 'https://api.x402.xyz/facilitator',
    network: (process.env.X402_NETWORK as X402Network) || 'base-sepolia',
    usdcAddress: process.env.X402_USDC_ADDRESS || '0x833589fCD6eDb6E08f4c7C32D4f71b54bda02913',
    usdcDecimals: 6,
    verifyOptimistically: true,
    paymentModes: ['second', 'batch-5s'],
    defaultPaymentMode: 'second',
    useMockFacilitator: process.env.X402_USE_MOCK ? process.env.X402_USE_MOCK === 'true' : true
  }
};

/**
 * Get configuration based on NODE_ENV
 */
export function getConfig(): AppConfig {
  const env = process.env.NODE_ENV || 'development';

  // For now, we only have development config
  // You can add production config later
  return defaultConfig;
}
