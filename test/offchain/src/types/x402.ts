import type { X402Network } from '../config/index.js';

export type X402PaymentMode = 'second' | 'batch-5s';

/** V2: expanded payment scheme types */
export type X402PaymentScheme = 'exact' | 'tiered' | 'subscription';

export interface X402PaymentRequirements {
  scheme: 'exact';
  network: X402Network;
  asset: string; // token contract address (USDC)
  maxAmountRequired: string; // stringified minor-unit amount (6 decimal precision)
  payTo: string;
  resource: string;
  description?: string;
  extra?: Record<string, unknown>;
  /** V2: protocol version marker */
  version?: 2;
  /** V2: wallet session reference */
  sessionId?: string;
  /** V2: CAIP-2 chain identifier (e.g., 'eip155:84532') */
  chainId?: string;
}

export interface FacilitatorVerifyResult {
  isValid: boolean;
  invalidReason?: string | null;
}

export interface FacilitatorSettleResult {
  success: boolean;
  error?: string | null;
  txHash?: string | null;
  networkId?: string | null;
}

/** V2: request body format using paymentPayload instead of paymentHeader */
export interface FacilitatorRequestBodyV2 {
  x402Version: number;
  paymentPayload: string;
  paymentRequirements: X402PaymentRequirements;
}

/** V2: wallet-based session for opt-in persistent authorization */
export interface X402Session {
  sessionId: string;
  walletAddress: string;
  chainId: string; // CAIP-2 format
  maxAmount: string; // session spending limit in minor units
  expiresAt: string; // ISO 8601 timestamp
  createdAt: string;
  isActive: boolean;
}

export interface StoredX402Payment {
  id: string;
  leaseId: string;
  mode: X402PaymentMode;
  intervalSeconds: number;
  amountMinorUnits: bigint;
  payer: string;
  paymentTimestamp: Date;
  facilitatorTxHash: string;
  bucketSlot: string; // e.g. 2025-01-01T12:00:00Z
  createdAt: Date;
}

export interface StoredX402Batch {
  id: string;
  leaseId: string;
  hourBucket: string; // ISO string at top-of-hour UTC
  totalAmountMinorUnits: bigint;
  paymentCount: number;
  revenueRoundId?: string;
  settlementTxHash?: string;
  startedAt: Date;
  closedAt: Date;
  createdAt: Date;
}
