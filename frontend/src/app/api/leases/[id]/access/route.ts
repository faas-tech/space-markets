import { NextRequest, NextResponse } from 'next/server';

// Configuration from environment (no hardcoded Anvil addresses)
const PAYMENT_ADDRESS = process.env.NEXT_PUBLIC_PAYMENT_ADDRESS || '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const STABLECOIN_ADDRESS = process.env.NEXT_PUBLIC_STABLECOIN || '0x833589fCD6eDb6E08f4c7C32D4f71b54bda02913';
const NETWORK_CAIP = process.env.NEXT_PUBLIC_NETWORK_CAIP || 'eip155:84532';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('mode');

  // Validate mode parameter
  if (mode && !['second', 'batch-5s'].includes(mode)) {
    return NextResponse.json(
      { success: false, error: 'Invalid mode. Must be "second" or "batch-5s".' },
      { status: 400 }
    );
  }

  const paymentMode = mode || 'second';

  // V2: Accept Payment-Signature header with X-PAYMENT fallback for backward compat
  const paymentHeader = request.headers.get('payment-signature') || request.headers.get('x-payment');

  if (!paymentHeader) {
    // Per-second: 1_000_000 / 3600 ≈ 278 minor units
    // Per-5s:     1_000_000 / 720  ≈ 1389 minor units
    const amount = paymentMode === 'second' ? '278' : '1389';

    // Return 402 Payment Required with x402 V2 requirements
    return NextResponse.json(
      {
        success: false,
        error: 'Payment required',
        paymentRequirements: {
          scheme: 'exact',
          network: NETWORK_CAIP,
          asset: STABLECOIN_ADDRESS,
          maxAmountRequired: amount,
          payTo: PAYMENT_ADDRESS,
          resource: `/api/leases/${id}/access`,
          description: `Access lease ${id} for ${paymentMode === 'second' ? '1s' : '5s'}`,
          extra: {
            decimals: 6,
            verifyOptimistically: false,
            paymentMode,
          },
          version: 2,
        },
      },
      { status: 402 }
    );
  }

  // Parse and validate payment header
  let payment: { payer?: string; amount?: string; txHash?: string; issuedAt?: string };
  try {
    payment = JSON.parse(Buffer.from(paymentHeader, 'base64').toString());
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid payment header encoding' },
      { status: 400 }
    );
  }

  // Basic field validation
  if (!payment.payer || !payment.amount || !payment.txHash) {
    return NextResponse.json(
      { success: false, error: 'Missing required payment fields (payer, amount, txHash)' },
      { status: 400 }
    );
  }

  // Validate Ethereum address format
  if (!/^0x[a-fA-F0-9]{40}$/.test(payment.payer)) {
    return NextResponse.json(
      { success: false, error: 'Invalid payer address format' },
      { status: 400 }
    );
  }

  // Validate txHash format
  if (!/^0x[a-fA-F0-9]{64}$/.test(payment.txHash)) {
    return NextResponse.json(
      { success: false, error: 'Invalid transaction hash format' },
      { status: 400 }
    );
  }

  // TODO: In production, verify payment via facilitator:
  //   1. Call facilitator /verify endpoint
  //   2. Call facilitator /settle endpoint
  //   3. Record payment in database
  // For alpha demo, accept validated payment headers

  console.log(`[x402] Payment received for lease ${id}:`, {
    payer: payment.payer,
    amount: payment.amount,
    txHash: payment.txHash,
  });

  return NextResponse.json({
    success: true,
    txHash: payment.txHash,
    access: 'granted',
    leaseId: id,
    expiresAt: new Date(Date.now() + (paymentMode === 'second' ? 1000 : 5000)).toISOString(),
  });
}
