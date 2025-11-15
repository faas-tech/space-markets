import type { X402Network } from '../config/index.js';

export type X402PaymentMode = 'second' | 'batch-5s';

export interface X402PaymentRequirements {
  scheme: 'exact';
  network: X402Network;
  asset: string; // token contract address (USDC)
  maxAmountRequired: string; // stringified minor-unit amount (6 decimal precision)
  payTo: string;
  resource: string;
  description?: string;
  extra?: Record<string, any>;
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

