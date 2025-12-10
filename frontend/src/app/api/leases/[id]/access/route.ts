import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('mode') || 'second';

  // Check for X-PAYMENT header
  const paymentHeader = request.headers.get('x-payment');

  if (!paymentHeader) {
    // Return 402 Payment Required
    return NextResponse.json(
      {
        success: false,
        error: "Payment required",
        paymentRequirements: {
          scheme: "exact",
          network: "base-sepolia",
          asset: process.env.NEXT_PUBLIC_STABLECOIN || "0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e",
          maxAmountRequired: mode === 'second' ? "277" : "1385", // ~1 USDC / hour = 0.000277 USDC / sec
          payTo: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // Anvil default account #0
          resource: `/api/leases/${id}/access`,
          description: `Access lease ${id} for ${mode === 'second' ? '1s' : '5s'}`,
          extra: {
            decimals: 6,
            verifyOptimistically: true,
            paymentMode: mode
          }
        }
      },
      { status: 402 }
    );
  }

  // Verify payment (mock)
  try {
    const payment = JSON.parse(Buffer.from(paymentHeader, 'base64').toString());
    console.log(`Payment received for lease ${id}:`, payment);
    
    // In production: Verify signature/tx on-chain
    
    return NextResponse.json({
      success: true,
      txHash: payment.txHash,
      access: "granted",
      leaseId: id,
      expiresAt: new Date(Date.now() + (mode === 'second' ? 1000 : 5000)).toISOString()
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: "Invalid payment header" }, { status: 400 });
  }
}

