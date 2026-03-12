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
  /** V2: CAIP-2 network identifier (e.g., 'eip155:84532' for Base Sepolia) */
  networkCAIP: string;
  /** V2: X402 protocol version (defaults to 2) */
  x402Version: number;
  /** V2: enable wallet-based sessions (defaults to false) */
  enableSessions: boolean;
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
    useMockFacilitator: process.env.X402_USE_MOCK === 'true',  // Default false — must explicitly opt in to mocks
    networkCAIP: process.env.X402_NETWORK_CAIP || 'eip155:84532',
    x402Version: 2,
    enableSessions: false
  }
};

/**
 * Get configuration based on NODE_ENV
 *
 * In development: returns defaults (Anvil, mocks enabled).
 * In production: validates critical config, refuses to start with unsafe defaults.
 */
export function getConfig(): AppConfig {
  const env = process.env.NODE_ENV || 'development';
  const config = { ...defaultConfig };

  // Override from environment variables
  if (process.env.RPC_URL) config.rpcUrl = process.env.RPC_URL;
  if (process.env.CHAIN_ID) config.chainId = parseInt(process.env.CHAIN_ID, 10);
  if (process.env.PRIVATE_KEY) config.privateKey = process.env.PRIVATE_KEY;
  if (process.env.API_PORT) config.apiPort = parseInt(process.env.API_PORT, 10);
  if (process.env.API_HOST) config.apiHost = process.env.API_HOST;

  // Development: enable mocks by default for convenience
  if (env === 'development' || env === 'test') {
    config.useMockDatabase = process.env.USE_MOCK_DATABASE !== 'false';
    config.useMockCache = process.env.USE_MOCK_CACHE !== 'false';
    config.x402 = {
      ...config.x402,
      useMockFacilitator: process.env.X402_USE_MOCK !== 'false',  // Default true in dev
    };
  }

  // Production: disable mocks, validate critical config
  if (env === 'production') {
    config.useMockDatabase = process.env.USE_MOCK_DATABASE === 'true';
    config.useMockCache = process.env.USE_MOCK_CACHE === 'true';
    config.x402 = {
      ...config.x402,
      useMockFacilitator: process.env.X402_USE_MOCK === 'true',
      verifyOptimistically: false,
    };

    if (config.privateKey === defaultConfig.privateKey) {
      throw new Error('FATAL: Cannot use default Anvil private key in production. Set PRIVATE_KEY env var.');
    }
    if (config.chainId === 31337) {
      throw new Error('FATAL: Cannot use Foundry chainId (31337) in production. Set CHAIN_ID env var.');
    }
  }

  return config;
}
