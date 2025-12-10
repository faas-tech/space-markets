import { ethers } from 'ethers';

export interface X402PaymentRequirements {
  scheme: 'exact' | 'max';
  network: string;  // 'base-sepolia' | 'base-mainnet'
  asset: string;  // USDC contract address
  maxAmountRequired: string;  // Amount in minor units (6 decimals for USDC)
  payTo: string;  // Lessor address
  resource: string;  // API endpoint
  description: string;
  extra: {
    decimals: number;
    verifyOptimistically: boolean;
    paymentMode: 'second' | 'batch-5s';
  };
}

export interface X402PaymentHeader {
  payer: string;
  amount: string;
  txHash: string;
  issuedAt: string;
}

export class X402StreamingClient {
  private apiBase: string;
  private payer: string;
  private active: boolean = false;
  private intervalId?: NodeJS.Timeout;

  constructor(apiBase: string, payerAddress: string) {
    this.apiBase = apiBase;
    this.payer = payerAddress;
  }

  /**
   * Start streaming payments for lease access
   */
  async startStream(
    leaseId: string,
    mode: 'second' | 'batch-5s' = 'second',
    onPayment?: (amount: string, tx: string) => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    if (this.active) {
      throw new Error('Stream already active');
    }

    this.active = true;
    const intervalMs = mode === 'second' ? 1000 : 5000;

    this.intervalId = setInterval(async () => {
      try {
        await this.makePayment(leaseId, mode, onPayment);
      } catch (error) {
        console.error('Payment error:', error);
        if (onError) {
          onError(error instanceof Error ? error : new Error('Payment failed'));
        }
      }
    }, intervalMs);

    console.log(`X402 stream started: ${mode} mode (${intervalMs}ms interval)`);
  }

  /**
   * Stop streaming payments
   */
  stopStream(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    this.active = false;
    console.log('X402 stream stopped');
  }

  /**
   * Make single payment
   */
  private async makePayment(
    leaseId: string,
    mode: 'second' | 'batch-5s',
    onPayment?: (amount: string, tx: string) => void
  ): Promise<void> {
    const accessUrl = `${this.apiBase}/api/leases/${leaseId}/access?mode=${mode}`;

    // Step 1: Request access (triggers 402)
    const unpaidResponse = await fetch(accessUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (unpaidResponse.status !== 402) {
      console.warn('Unexpected status:', unpaidResponse.status);
      return;
    }

    const unpaidBody = await unpaidResponse.json();
    const requirements: X402PaymentRequirements = unpaidBody.paymentRequirements;

    // Step 2: Create payment header
    const paymentHeader = this.encodePaymentHeader({
      payer: this.payer,
      amount: requirements.maxAmountRequired,
      txHash: `0x${this.generateMockTxHash()}`, // In production, use real tx hash
      issuedAt: new Date().toISOString()
    });

    // Step 3: Retry with payment
    const paidResponse = await fetch(accessUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-PAYMENT': paymentHeader
      }
    });

    if (!paidResponse.ok) {
      throw new Error(`Payment failed: ${paidResponse.statusText}`);
    }

    const paidBody = await paidResponse.json();

    // Notify callback
    if (onPayment) {
      onPayment(
        this.formatAmount(requirements.maxAmountRequired),
        paidBody.txHash
      );
    }
  }

  /**
   * Encode payment header (Base64)
   */
  private encodePaymentHeader(payment: X402PaymentHeader): string {
    const json = JSON.stringify(payment);
    return Buffer.from(json, 'utf-8').toString('base64');
  }

  /**
   * Format USDC amount from minor units
   */
  private formatAmount(minorUnits: string): string {
    const amount = parseFloat(minorUnits) / 1_000_000;
    return amount.toFixed(6);
  }

  /**
   * Generate mock transaction hash (for testing)
   * In production, use actual on-chain transaction
   */
  private generateMockTxHash(): string {
    return Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
  }

  isActive(): boolean {
    return this.active;
  }
}

