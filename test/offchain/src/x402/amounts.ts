import { USDC_DECIMAL_FACTOR } from './constants.js';

const WEI_DECIMAL_FACTOR = BigInt(10) ** BigInt(18);

/**
 * Convert a Wei-denominated bigint into USDC minor units (6 decimals).
 */
export function weiToUsdcMinorUnits(weiAmount: bigint): bigint {
  if (weiAmount === 0n) return 0n;
  return (weiAmount * USDC_DECIMAL_FACTOR) / WEI_DECIMAL_FACTOR;
}

/**
 * Convert a decimal-like string with 6 decimal precision into a display string.
 */
export function formatUsdcMinorUnits(minorUnits: bigint): string {
  const isNegative = minorUnits < 0n;
  const value = isNegative ? minorUnits * -1n : minorUnits;
  const integerPart = value / USDC_DECIMAL_FACTOR;
  const fractionalPart = value % USDC_DECIMAL_FACTOR;
  const fractionalStr = fractionalPart.toString().padStart(6, '0').replace(/0+$/, '');
  return `${isNegative ? '-' : ''}${integerPart.toString()}${fractionalStr ? '.' + fractionalStr : ''}`;
}

export function perSecondAmount(totalMinorUnits: bigint): { amount: bigint; remainder: bigint } {
  const secondsPerHour = 3600n;
  if (totalMinorUnits < secondsPerHour) {
    return { amount: 0n, remainder: totalMinorUnits };
  }
  return {
    amount: totalMinorUnits / secondsPerHour,
    remainder: totalMinorUnits % secondsPerHour
  };
}

export function perFiveSecondAmount(totalMinorUnits: bigint): { amount: bigint; remainder: bigint } {
  const intervalsPerHour = 720n; // 3600 / 5
  if (totalMinorUnits < intervalsPerHour) {
    return { amount: 0n, remainder: totalMinorUnits };
  }
  return {
    amount: totalMinorUnits / intervalsPerHour,
    remainder: totalMinorUnits % intervalsPerHour
  };
}

