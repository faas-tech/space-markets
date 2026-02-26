import fetch from 'node-fetch';
import crypto from 'crypto';
import { Buffer } from 'buffer';

const leaseId = process.argv[2] || 'LEASE-DEMO-001';
const mode = (process.argv.includes('--mode=batch') ? 'batch-5s' : 'second') as 'second' | 'batch-5s';
const durationSeconds = 60;
const intervalMs = mode === 'second' ? 1000 : 5000;
const payer = process.env.X402_PAYER || '0xMockLessee0000000000000000000000000000001234';
const apiBase = process.env.X402_API || 'http://localhost:3000';

async function prefundWallet() {
  console.log(`\n[X402 CLI] Prefunding ${payer} with mock USDC...`);
  const response = await fetch(`${apiBase}/api/leases/${leaseId}/prefund`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: payer,
      amountMinorUnits: process.env.X402_PREFUND_AMOUNT || '500000000' // 500 USDC
    })
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(`Prefund failed: ${body.error}`);
  }
  console.log(`[X402 CLI] Prefund complete: ${body.amountMinorUnits} minor units to ${body.recipient}`);
}

async function runStream() {
  console.log(`\n[X402 CLI] Starting ${mode} payment stream for lease ${leaseId}`);
  const iterations = Math.ceil(durationSeconds * 1000 / intervalMs);

  for (let i = 0; i < iterations; i++) {
    await performPayment(i + 1);
    await delay(intervalMs);
  }
}

async function performPayment(iteration: number) {
  const accessUrl = `${apiBase}/api/leases/${leaseId}/access?mode=${mode}`;

  // Step 1: trigger 402 to get requirements
  const unpaidResponse = await fetch(accessUrl, { method: 'POST' });
  const unpaidBody = await unpaidResponse.json();

  if (unpaidResponse.status !== 402) {
    console.log(`[X402 CLI] Iteration ${iteration}: unexpected status ${unpaidResponse.status}`, unpaidBody);
    return;
  }

  const header = encodePaymentHeader(unpaidBody.paymentRequirements.maxAmountRequired);

  // Step 2: retry with payment header
  const paidResponse = await fetch(accessUrl, {
    method: 'POST',
    headers: {
      'Payment-Signature': header
    }
  });
  const paidBody = await paidResponse.json();

  if (!paidResponse.ok) {
    console.log(`[X402 CLI] Iteration ${iteration}: payment failed`, paidBody);
    return;
  }

  console.log(`[X402 CLI] Iteration ${iteration}: paid ${unpaidBody.paymentRequirements.maxAmountRequired} minor units, tx ${paidBody.txHash}`);
}

function encodePaymentHeader(amount: string): string {
  const payload = {
    payer,
    amount,
    txHash: `0x${crypto.randomBytes(12).toString('hex')}`,
    issuedAt: new Date().toISOString()
  };
  return Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64');
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  try {
    await prefundWallet();
    await runStream();
    console.log('\n[X402 CLI] Stream complete!');
  } catch (error) {
    console.error('[X402 CLI] Error:', error);
    process.exit(1);
  }
}

main();

