import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { Buffer } from 'buffer';
import { MockDatabase } from '../src/storage/database.js';
import type { LeaseAgreement } from '../src/types/index.js';
import { X402PaymentService } from '../src/x402/payment-service.js';
import { X402FacilitatorClient } from '../src/x402/facilitator-client.js';
import { getConfig } from '../src/config/index.js';
import type { X402PaymentMode } from '../src/types/x402.js';

describe('X402 Streaming Payments Showcase', () => {
  it('walks through per-second and batch payment flows with vivid CLI narration', async () => {
    announce('X402 Streaming Payment Showcase', 1);
    const database = new MockDatabase();
    await database.connect();
    const seedLease = await database.saveLease(createLeaseRecord());
    const paymentService = new X402PaymentService(database);
    const facilitator = new X402FacilitatorClient(getConfig().x402);

    await runStreamingDemo({
      title: 'Per-second streaming authorization',
      mode: 'second',
      intervalSeconds: 1,
      leaseId: seedLease.leaseId,
      paymentService,
      facilitator,
      database
    });

    await runStreamingDemo({
      title: 'Five-second batch streaming authorization',
      mode: 'batch-5s',
      intervalSeconds: 5,
      leaseId: seedLease.leaseId,
      paymentService,
      facilitator,
      database
    });

    const storedPayments = await database.getX402PaymentsByLease(seedLease.leaseId);
    expect(storedPayments).toHaveLength(2);
    expect(storedPayments.map(p => p.mode)).toEqual(['second', 'batch-5s']);
    await database.disconnect();
  }, 20000);
});

interface StreamingDemoParams {
  title: string;
  mode: X402PaymentMode;
  intervalSeconds: number;
  leaseId: string;
  paymentService: X402PaymentService;
  facilitator: X402FacilitatorClient;
  database: MockDatabase;
}

async function runStreamingDemo(params: StreamingDemoParams): Promise<void> {
  const {
    title,
    mode,
    intervalSeconds,
    leaseId,
    paymentService,
    facilitator,
    database
  } = params;

  announce(title, 2);
  info(`Requesting ${mode} quote for lease ${leaseId}...`);
  const quote = await paymentService.buildQuote(
    leaseId,
    mode,
    `/api/leases/${leaseId}/access`,
    `CLI demo: ${mode}`
  );
  narrateQuote(quote.formattedAmount, quote);

  const paymentHeader = encodePaymentHeader({
    payer: '0xMockLessee0000000000000000000000000000001234',
    amount: quote.amountMinorUnits.toString()
  });
  info('Verifying payment header with facilitator...');
  const verification = await facilitator.verify(paymentHeader, quote.requirements);
  expect(verification.isValid).toBe(true);
  success('Facilitator verification succeeded (optimistic grant).');

  info('Settling payment with facilitator...');
  const settlement = await facilitator.settle(paymentHeader, quote.requirements);
  expect(settlement.success).toBe(true);
  success(`Payment settled: tx ${settlement.txHash}`);

  info('Recording streaming payment in mock database...');
  const now = new Date();
  await database.saveX402Payment({
    leaseId,
    mode,
    intervalSeconds,
    amountMinorUnits: quote.amountMinorUnits,
    payer: '0xMockLessee0000000000000000000000000000001234',
    paymentTimestamp: now,
    facilitatorTxHash: settlement.txHash || '0xmockTx',
    bucketSlot: getUtcHourBucket(now)
  });
  success('Streaming payment stored in ledger.');
  divider();
}

function createLeaseRecord() {
  const leaseAgreement: LeaseAgreement = {
    leaseId: 'LEASE-X402-001',
    assetId: 'SAT-X402-001',
    lessorAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    lesseeAddress: '0xdD11751cdD3f6EFf01B1f6151B640685bfa5dB4a',
    terms: {
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 3600_000).toISOString(),
      paymentAmount: '1000000000000000000000', // 1,000 USDC in wei
      paymentToken: 'USDC',
      paymentSchedule: 'hourly',
      specificTerms: {
        downlink_bandwidth_gbps: 2.5,
        imaging_resolution_m: 0.5
      }
    },
    legalDocument: {
      type: 'lease_agreement',
      hash: '0x' + crypto.randomBytes(32).toString('hex'),
      uri: 'ipfs://QmLeaseDoc/X402'
    },
    status: 'active',
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: '1.0.0'
    }
  };

  return {
    leaseId: leaseAgreement.leaseId,
    assetId: leaseAgreement.assetId,
    chainId: 31337,
    contractAddress: '0x2B0d36FACD61B71CC05ab8F3D2355ec3631C0dd5',
    lessor: leaseAgreement.lessorAddress,
    lessee: leaseAgreement.lesseeAddress,
    agreement: leaseAgreement,
    status: 'active' as const,
    blockNumber: 1,
    transactionHash: '0xmockleasehash',
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

function encodePaymentHeader(params: { payer: string; amount: string }): string {
  const payload = {
    payer: params.payer,
    amount: params.amount,
    issuedAt: new Date().toISOString(),
    txHash: `0xmock${crypto.randomBytes(12).toString('hex')}`
  };
  return Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64');
}

function getUtcHourBucket(date: Date): string {
  const bucket = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    0,
    0,
    0
  ));
  return bucket.toISOString();
}

function announce(title: string, level: 1 | 2 = 1): void {
  const line = '═'.repeat(60);
  console.log('\n' + line);
  console.log(`${' '.repeat(level)}${title.toUpperCase()}`);
  console.log(line);
}

function info(message: string): void {
  console.log(`ℹ ${message}`);
}

function success(message: string): void {
  console.log(`✅ ${message}`);
}

function divider(): void {
  console.log('─'.repeat(60));
}

function narrateQuote(formattedAmount: string, quote: { warning?: string }): void {
  console.log(`💵 Payment requirement: ${formattedAmount} USDC minor units per interval`);
  if (quote.warning) {
    console.log(`⚠ ${quote.warning}`);
  }
}

