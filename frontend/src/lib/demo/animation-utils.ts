// Shared animation timing and easing utilities

export const EASING = {
  easeOutCubic: 'cubic-bezier(0.22, 1, 0.36, 1)',
  easeInOutCubic: 'cubic-bezier(0.65, 0, 0.35, 1)',
  easeOutExpo: 'cubic-bezier(0.16, 1, 0.3, 1)',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const;

export const DURATION = {
  fast: 200,
  normal: 400,
  slow: 600,
  verySlow: 1000,
} as const;

/**
 * Generates staggered delay values for sequential animations.
 */
export function staggerDelay(index: number, baseDelay: number = 150): number {
  return index * baseDelay;
}

/**
 * Returns a CSS transition string for common animated properties.
 */
export function transition(
  property: string = 'all',
  duration: number = DURATION.normal,
  easing: string = EASING.easeOutCubic
): string {
  return `${property} ${duration}ms ${easing}`;
}

/**
 * Formats a number to add commas as thousand separators.
 */
export function formatNumber(value: number): string {
  return value.toLocaleString('en-US');
}

/**
 * Formats a USDC amount with the appropriate decimals.
 */
export function formatUSDC(value: number, decimals: number = 2): string {
  return value.toFixed(decimals);
}

/**
 * Creates a promise that resolves after a delay -- used in step sequencing.
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Linearly interpolate between two values.
 */
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * Math.max(0, Math.min(1, t));
}
