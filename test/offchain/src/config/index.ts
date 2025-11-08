/**
 * Simple configuration system
 *
 * Loads configuration based on environment.
 * Defaults to development settings.
 */

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
}

/**
 * Default configuration (Development with Anvil)
 */
export const defaultConfig: AppConfig = {
  rpcUrl: 'http://localhost:8545',
  chainId: 31337,
  privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', // Anvil account #0

  useMockDatabase: true,
  useMockCache: true,

  apiPort: 3000,
  apiHost: 'localhost',

  deploymentsDir: './deployments',
  dataDir: './data'
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
