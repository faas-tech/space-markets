import fetch from 'node-fetch';
import crypto from 'crypto';
import type { FacilitatorSettleResult, FacilitatorVerifyResult, X402PaymentRequirements } from '../types/x402.js';
import type { X402Config } from '../config/index.js';

interface FacilitatorRequestBody {
  x402Version: number;
  paymentHeader: string;
  paymentRequirements: X402PaymentRequirements;
}

export class X402FacilitatorClient {
  constructor(private readonly config: X402Config) {}

  async verify(paymentHeader: string, requirements: X402PaymentRequirements): Promise<FacilitatorVerifyResult> {
    if (this.config.useMockFacilitator) {
      return { isValid: true };
    }

    const url = `${this.config.facilitatorUrl.replace(/\/$/, '')}/verify`;
    const body: FacilitatorRequestBody = {
      x402Version: 1,
      paymentHeader,
      paymentRequirements: requirements
    };
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      return {
        isValid: false,
        invalidReason: `Facilitator responded with ${response.status}`
      };
    }

    return response.json() as Promise<FacilitatorVerifyResult>;
  }

  async settle(paymentHeader: string, requirements: X402PaymentRequirements): Promise<FacilitatorSettleResult> {
    if (this.config.useMockFacilitator) {
      return {
        success: true,
        txHash: `0xmock${crypto.randomBytes(12).toString('hex')}`,
        networkId: this.config.network,
        error: null
      };
    }

    const url = `${this.config.facilitatorUrl.replace(/\/$/, '')}/settle`;
    const body: FacilitatorRequestBody = {
      x402Version: 1,
      paymentHeader,
      paymentRequirements: requirements
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Facilitator responded with ${response.status}`,
        txHash: null,
        networkId: null
      };
    }

    return response.json() as Promise<FacilitatorSettleResult>;
  }
}

