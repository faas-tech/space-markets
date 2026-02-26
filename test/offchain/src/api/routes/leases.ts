/**
 * Lease API Routes
 *
 * Handles lease access requests with X402 streaming payment validation.
 * Validates that leases are active before granting access.
 */

import { Router } from 'express';
import { X402PaymentService } from '../../x402/payment-service.js';
import { X402FacilitatorClient } from '../../x402/facilitator-client.js';
import type { Database } from '../../storage/database.js';
import type { X402PaymentMode } from '../../types/x402.js';

/**
 * Create leases router with X402 payment validation
 */
export function createLeasesRouter(
  database: Database,
  paymentService: X402PaymentService,
  facilitatorClient: X402FacilitatorClient
): Router {
  const router = Router();

  /**
   * POST /leases/:leaseId/access
   *
   * Request access to a leased resource with streaming payment.
   *
   * Without Payment-Signature (or X-PAYMENT) header:
   * - Returns 402 Payment Required with payment requirements
   *
   * With Payment-Signature (or X-PAYMENT) header:
   * - Verifies payment against lease terms
   * - Grants access if payment is valid
   * - Tracks payment in database
   */
  router.post('/:leaseId/access', async (req, res) => {
    const { leaseId } = req.params;
    const mode = (req.query.mode as X402PaymentMode) || 'second';
    // V2: Accept Payment-Signature header with X-PAYMENT fallback for backward compat
    const paymentHeader = (req.headers['payment-signature'] || req.headers['x-payment']) as string;

    console.log(`\n[X402] Access request for lease ${leaseId}`);
    console.log(`  Mode: ${mode}`);
    console.log(`  Has payment: ${!!paymentHeader}`);

    // 1. Verify lease exists and is active
    const lease = await database.getLease(leaseId);

    if (!lease) {
      console.log(`  ❌ Lease ${leaseId} not found`);
      return res.status(404).json({
        error: 'Lease not found',
        leaseId
      });
    }

    if (lease.status !== 'active') {
      console.log(`  ❌ Lease ${leaseId} is ${lease.status}, not active`);
      return res.status(403).json({
        error: 'Lease is not active',
        status: lease.status,
        leaseId
      });
    }

    // Check if lease has started and not expired
    const now = Math.floor(Date.now() / 1000);
    const startTime = new Date(lease.agreement.startTime).getTime() / 1000;
    const endTime = new Date(lease.agreement.endTime).getTime() / 1000;

    if (now < startTime) {
      console.log(`  ❌ Lease has not started yet (starts at ${lease.agreement.startTime})`);
      return res.status(403).json({
        error: 'Lease has not started yet',
        startTime: lease.agreement.startTime,
        currentTime: new Date(now * 1000).toISOString()
      });
    }

    if (now > endTime) {
      console.log(`  ❌ Lease has expired (ended at ${lease.agreement.endTime})`);
      return res.status(403).json({
        error: 'Lease has expired',
        endTime: lease.agreement.endTime,
        currentTime: new Date(now * 1000).toISOString()
      });
    }

    console.log(`  ✓ Lease is active and valid`);

    // 2. No payment header? Return 402 with requirements
    if (!paymentHeader) {
      console.log(`  → Returning 402 Payment Required`);

      const quote = await paymentService.buildQuote(
        leaseId,
        mode,
        `/api/leases/${leaseId}/access`,
        `Streaming access to asset ${lease.assetId}`
      );

      // V2: Set Payment-Required response header
      res.setHeader('Payment-Required', JSON.stringify(quote.requirements));
      return res.status(402).json({
        error: 'Payment required',
        message: 'Include Payment-Signature header with valid payment',
        ...quote.requirements
      });
    }

    // 3. Verify payment
    console.log(`  → Verifying payment...`);

    const quote = await paymentService.buildQuote(
      leaseId,
      mode,
      `/api/leases/${leaseId}/access`
    );

    try {
      const verified = await facilitatorClient.verifyPayment(
        paymentHeader,
        quote.requirements
      );

      if (!verified) {
        console.log(`  ❌ Payment verification failed`);
        return res.status(402).json({
          error: 'Payment verification failed',
          message: 'Invalid or insufficient payment',
          ...quote.requirements
        });
      }

      console.log(`  ✓ Payment verified: ${quote.formattedAmount}`);

      // 4. Track payment in database
      try {
        await database.recordPayment({
          leaseId,
          amount: quote.amountMinorUnits.toString(),
          timestamp: new Date().toISOString(),
          mode
        });
        console.log(`  ✓ Payment recorded`);
      } catch (error) {
        console.log(`  ⚠️  Warning: Could not record payment: ${error}`);
      }

      // 5. Grant access
      console.log(`  ✓ Access granted\n`);

      // V2: Set Payment-Response header on success
      res.setHeader('Payment-Response', JSON.stringify({
        status: 'access_granted',
        leaseId,
        amount: quote.formattedAmount
      }));

      return res.status(200).json({
        status: 'access_granted',
        leaseId,
        assetId: lease.assetId,
        accessToken: `lease_${leaseId}_${Date.now()}`,
        expiresIn: mode === 'second' ? 1 : 5,
        message: `Access granted for ${mode === 'second' ? '1 second' : '5 seconds'}`,
        payment: {
          amount: quote.formattedAmount,
          mode
        }
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log(`  Payment processing error: ${errorMessage}`);
      return res.status(402).json({
        error: 'Payment processing failed',
        ...quote.requirements
      });
    }
  });

  /**
   * GET /leases/:leaseId
   *
   * Get lease details
   */
  router.get('/:leaseId', async (req, res) => {
    const { leaseId } = req.params;
    const lease = await database.getLease(leaseId);

    if (!lease) {
      return res.status(404).json({
        error: 'Lease not found',
        leaseId
      });
    }

    return res.json({
      leaseId: lease.leaseId,
      assetId: lease.assetId,
      lessor: lease.lessor,
      lessee: lease.lessee,
      status: lease.status,
      agreement: lease.agreement,
      createdAt: lease.createdAt
    });
  });

  /**
   * GET /leases/:leaseId/payments
   *
   * Get payment history for a lease
   */
  router.get('/:leaseId/payments', async (req, res) => {
    const { leaseId } = req.params;

    const lease = await database.getLease(leaseId);
    if (!lease) {
      return res.status(404).json({
        error: 'Lease not found',
        leaseId
      });
    }

    // Query payments (this would need database.getPayments() method)
    // For now, return placeholder
    return res.json({
      leaseId,
      payments: [],
      totalAmount: '0',
      message: 'Payment tracking coming soon'
    });
  });

  return router;
}
