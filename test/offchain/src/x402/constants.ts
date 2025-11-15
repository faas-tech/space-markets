import { getConfig } from '../config/index.js';

export const USDC_DECIMALS = 6;
export const USDC_DECIMAL_FACTOR = BigInt(10) ** BigInt(USDC_DECIMALS);

export function getUsdcAddress(): string {
  const config = getConfig();
  return config.x402.usdcAddress;
}

