import { getConfig } from '../config/index.js';
import type { Database, StoredLease } from '../storage/database.js';
import type { X402PaymentMode, X402PaymentRequirements } from '../types/x402.js';
import { formatUsdcMinorUnits, perFiveSecondAmount, perSecondAmount, weiToUsdcMinorUnits } from './amounts.js';
import { X402Error } from '../errors.js';

interface PaymentQuote {
  leaseId: string;
  mode: X402PaymentMode;
  amountMinorUnits: bigint;
  formattedAmount: string;
  requirements: X402PaymentRequirements;
  warning?: string;
}

export class X402PaymentService {
  constructor(
    private readonly database: Database
  ) {}

  async buildQuote(
    leaseId: string,
    mode: X402PaymentMode,
    resource: string,
    description?: string
  ): Promise<PaymentQuote> {
    const config = getConfig();
    const lease = await this.database.getLease(leaseId);
    if (!lease) {
      throw new X402Error(`Lease ${leaseId} not found`, { leaseId });
    }

    const hourlyMinorUnits = this.getHourlyMinorUnits(lease);
    const { amount, remainder } = mode === 'second'
      ? perSecondAmount(hourlyMinorUnits)
      : perFiveSecondAmount(hourlyMinorUnits);

    const requirements: X402PaymentRequirements = {
      scheme: 'exact',
      network: config.x402.network,
      asset: config.x402.usdcAddress,
      maxAmountRequired: amount.toString(),
      payTo: lease.lessor,
      resource,
      description: description || `Lease ${leaseId} streaming payment (${mode})`,
      extra: {
        decimals: config.x402.usdcDecimals,
        verifyOptimistically: config.x402.verifyOptimistically,
        paymentMode: mode
      },
      version: 2,
      chainId: config.x402.networkCAIP
    };

    const quote: PaymentQuote = {
      leaseId,
      mode,
      amountMinorUnits: amount,
      formattedAmount: formatUsdcMinorUnits(amount),
      requirements
    };

    if (remainder !== 0n) {
      quote.warning = `Hourly total ${hourlyMinorUnits} not evenly divisible by interval count. Remainder ${remainder} will be settled during hourly batch.`;
    }

    return quote;
  }

  private getHourlyMinorUnits(lease: StoredLease): bigint {
    const weiAmount = BigInt(lease.agreement.terms.paymentAmount || '0');
    return weiToUsdcMinorUnits(weiAmount);
  }
}
