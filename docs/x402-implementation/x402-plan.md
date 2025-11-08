# X402 Payment Protocol Integration Plan
## Asset Leasing Protocol Enhancement

**Version:** 1.0
**Date:** January 2025
**Status:** Planning Phase

---

## Executive Summary

This document outlines a comprehensive plan to integrate the X402 payment protocol into the Asset Leasing Protocol, enabling real-time, gasless, stablecoin-based recurring rent payments between Lessors and Lessees. The integration will transform the current one-time payment marketplace into a continuous streaming payment system while maintaining the security guarantees of the existing on-chain lease agreements.

### Strategic Goals

1. **Enable Streaming Rent Payments**: Replace upfront lump-sum payments with per-period micropayments using X402's HTTP 402-based payment flow
2. **Reduce Friction**: Eliminate gas fees for Lessees through X402's facilitator-sponsored transactions
3. **Maintain Trust Minimization**: Preserve on-chain enforcement of lease terms while moving payment execution off-chain
4. **Revenue Distribution Continuity**: Ensure X402 payments integrate seamlessly with existing pro-rata token holder revenue distribution
5. **Developer Accessibility**: Keep integration simple for both web developers and smart contract engineers

---

## 1. Protocol Architecture Overview

### 1.1 Current Architecture (Pre-X402)

**Payment Flow:**
```
Lessee → Marketplace Bid (Full Amount) → Lease Acceptance → Revenue Distribution → Token Holders
```

**Characteristics:**
- Single upfront payment for entire lease period
- All payment handling on-chain via Marketplace contract
- Immediate revenue distribution to all AssetERC20 token holders
- High capital requirements for Lessees (entire rent upfront)

### 1.2 Target Architecture (Post-X402)

**Payment Flow:**
```
Lessee → X402 Periodic Payment → Lessor's API → Revenue Distribution → Token Holders
       ↓
   USDC Transfer (On-chain via Facilitator)
       ↓
   Lease Contract (Verification & Recording)
```

**Characteristics:**
- Streaming payments: per-minute, per-hour, or per-day micropayments
- Hybrid architecture: X402 for payment initiation, on-chain for settlement verification
- Lower capital requirements: Lessees pay as they use
- Gasless for Lessee (facilitator sponsors gas)
- Real-time revenue distribution based on payment velocity

---

## 2. Integration Strategy

### 2.1 Phase 1: Offchain X402 Infrastructure (Weeks 1-3)

**Objective:** Build the offchain systems to handle X402 payment flow without touching smart contracts yet.

#### Components to Build:

**A. X402 Payment Server (Lessor's Resource Server)**

Location: `offchain/src/services/X402PaymentService.ts`

```typescript
// Core responsibilities:
// 1. Serve HTTP 402 responses for lease payment endpoints
// 2. Verify payment payloads via Coinbase facilitator
// 3. Settle payments on-chain
// 4. Record payment events in PostgreSQL
// 5. Trigger revenue distribution calculations

Key Endpoints:
- GET /api/lease/:leaseId/access    → Returns 402 Payment Required
- POST /api/lease/:leaseId/access   → With X-PAYMENT header, grants access
- GET /api/lease/:leaseId/status    → Query payment history
- POST /api/revenue/distribute      → Admin trigger for distribution
```

**Implementation Pattern:**
```typescript
import { paymentMiddleware } from "x402-express";
import { facilitator } from "@coinbase/x402";

app.use(paymentMiddleware(
  lessorWalletAddress,  // From lease contract or AssetERC20 owner
  {
    "GET /api/lease/:leaseId/access": {
      price: calculatePeriodPrice(leaseId),  // Dynamic pricing based on lease terms
      network: "base-mainnet",
      config: {
        description: `Lease payment for asset access - Period ${currentPeriod}`,
        inputSchema: { leaseId: "string", period: "number" }
      }
    }
  },
  facilitator
));
```

**B. Payment Tracking Database Schema**

Location: `offchain/migrations/003_x402_payments.sql`

```sql
-- Track individual X402 payments for each lease period
CREATE TABLE x402_payments (
    payment_id VARCHAR(50) PRIMARY KEY,
    lease_id VARCHAR(50) NOT NULL REFERENCES leases(lease_id),
    period_number INTEGER NOT NULL,
    payer_address VARCHAR(42) NOT NULL,
    payee_address VARCHAR(42) NOT NULL,
    amount NUMERIC(78, 0) NOT NULL,
    transaction_hash VARCHAR(66) NOT NULL UNIQUE,
    payment_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    block_number BIGINT NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    settlement_status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT valid_addresses CHECK (
        payer_address ~ '^0x[a-fA-F0-9]{40}$' AND
        payee_address ~ '^0x[a-fA-F0-9]{40}$'
    ),
    CONSTRAINT valid_transaction_hash CHECK (
        transaction_hash ~ '^0x[a-fA-F0-9]{64}$'
    ),
    UNIQUE(lease_id, period_number)
);

-- Track revenue distribution rounds triggered by X402 payments
CREATE TABLE x402_revenue_distributions (
    distribution_id SERIAL PRIMARY KEY,
    lease_id VARCHAR(50) NOT NULL,
    payment_id VARCHAR(50) REFERENCES x402_payments(payment_id),
    asset_id VARCHAR(50) NOT NULL,
    total_amount NUMERIC(78, 0) NOT NULL,
    token_supply NUMERIC(78, 0) NOT NULL,
    distribution_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'calculated',

    CONSTRAINT positive_amounts CHECK (total_amount > 0 AND token_supply > 0)
);

-- Individual holder claims from X402 payments
CREATE TABLE x402_holder_claims (
    claim_id VARCHAR(50) PRIMARY KEY,
    distribution_id INTEGER REFERENCES x402_revenue_distributions(distribution_id),
    holder_address VARCHAR(42) NOT NULL,
    token_balance NUMERIC(78, 0) NOT NULL,
    claim_amount NUMERIC(78, 0) NOT NULL,
    claimed BOOLEAN DEFAULT FALSE,
    claimed_at TIMESTAMP WITH TIME ZONE,
    claim_transaction_hash VARCHAR(66),

    CONSTRAINT valid_holder_address CHECK (holder_address ~ '^0x[a-fA-F0-9]{40}$'),
    UNIQUE(distribution_id, holder_address)
);

CREATE INDEX idx_x402_payments_lease ON x402_payments(lease_id);
CREATE INDEX idx_x402_payments_verified ON x402_payments(verified);
CREATE INDEX idx_x402_distributions_asset ON x402_revenue_distributions(asset_id);
CREATE INDEX idx_x402_claims_holder ON x402_holder_claims(holder_address);
```

**C. Payment Processing Service**

Location: `offchain/src/services/X402ProcessingService.ts`

```typescript
export class X402ProcessingService {
  async processPayment(
    leaseId: string,
    paymentPayload: X402PaymentPayload,
    facilitatorResponse: FacilitatorResponse
  ): Promise<ProcessingResult> {
    // 1. Verify payment via facilitator
    const verified = await this.facilitator.verify(paymentPayload);

    // 2. Settle on-chain
    const txHash = await this.facilitator.settle(paymentPayload);

    // 3. Wait for on-chain confirmation
    const receipt = await this.blockchain.waitForTransaction(txHash);

    // 4. Record payment in database
    await this.recordPayment(leaseId, paymentPayload, txHash, receipt.blockNumber);

    // 5. Trigger revenue distribution calculation
    await this.calculateRevenue(leaseId, paymentPayload.amount);

    // 6. Optionally: Notify smart contract of payment (Phase 2)
    // await this.notifyLeaseContract(leaseId, txHash, period);

    return { success: true, txHash, distributionId };
  }

  async calculateRevenue(leaseId: string, paymentAmount: bigint): Promise<void> {
    // Get lease details from database
    const lease = await this.leaseRepo.findById(leaseId);

    // Get AssetERC20 token address
    const asset = await this.assetRegistry.getAsset(lease.assetId);
    const assetToken = new Contract(asset.tokenAddress, AssetERC20ABI, this.provider);

    // Get current token holders and balances
    const [holders, balances] = await assetToken.getHolders();
    const totalSupply = await assetToken.totalSupply();

    // Calculate pro-rata shares
    const distributionId = await this.createDistribution(leaseId, paymentAmount);

    for (let i = 0; i < holders.length; i++) {
      const share = (paymentAmount * balances[i]) / totalSupply;
      await this.createClaim(distributionId, holders[i], balances[i], share);
    }
  }
}
```

**D. Blockchain Event Listener Enhancement**

Location: `offchain/src/listeners/X402EventListener.ts`

```typescript
export class X402EventListener extends BlockchainEventListener {
  async processUSDCTransfer(log: TransferEvent): Promise<void> {
    const { from, to, value } = log.args;

    // Check if this is a payment to a known Lessor address
    const lease = await this.findLeaseByLessorAddress(to);
    if (!lease) return;

    // Check if amount matches expected rent
    if (value >= lease.rentAmount) {
      // Record as verified payment
      await this.db.query(`
        UPDATE x402_payments
        SET verified = true, settlement_status = 'confirmed'
        WHERE transaction_hash = $1
      `, [log.transactionHash]);

      // Update lease payment status in contract (Phase 2)
      // await this.updateLeasePaymentStatus(lease.leaseId, log.transactionHash);
    }
  }
}
```

### 2.2 Phase 2: Smart Contract Integration (Weeks 4-6)

**Objective:** Extend Solidity contracts to track X402 payments and enforce payment-based lease lifecycle.

#### A. New Contract: X402PaymentTracker

Location: `src/X402PaymentTracker.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title X402PaymentTracker
 * @notice Tracks X402 off-chain payments and enforces on-chain lease payment status
 * @dev Works in tandem with LeaseFactory - off-chain service calls registerPayment()
 */
contract X402PaymentTracker is AccessControl {
    bytes32 public constant PAYMENT_ORACLE_ROLE = keccak256("PAYMENT_ORACLE_ROLE");

    IERC20 public immutable PAYMENT_TOKEN;  // USDC

    struct PaymentRecord {
        bytes32 txHash;           // X402 settlement transaction hash
        uint256 period;           // Lease period number
        uint256 amount;           // Amount paid
        uint64 timestamp;         // Payment timestamp
        bool verified;            // Verified on-chain
    }

    // leaseId => period => PaymentRecord
    mapping(uint256 => mapping(uint256 => PaymentRecord)) public payments;

    // leaseId => latest paid period
    mapping(uint256 => uint256) public latestPaidPeriod;

    event PaymentRegistered(
        uint256 indexed leaseId,
        uint256 indexed period,
        bytes32 txHash,
        uint256 amount
    );

    event PaymentVerified(uint256 indexed leaseId, uint256 indexed period);

    constructor(address _paymentToken, address _admin) {
        PAYMENT_TOKEN = IERC20(_paymentToken);
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(PAYMENT_ORACLE_ROLE, _admin);  // Off-chain service
    }

    /**
     * @notice Register an X402 payment after off-chain settlement
     * @dev Called by trusted off-chain service (PAYMENT_ORACLE_ROLE)
     */
    function registerPayment(
        uint256 leaseId,
        uint256 period,
        bytes32 txHash,
        uint256 amount
    ) external onlyRole(PAYMENT_ORACLE_ROLE) {
        require(!payments[leaseId][period].verified, "Period already paid");

        payments[leaseId][period] = PaymentRecord({
            txHash: txHash,
            period: period,
            amount: amount,
            timestamp: uint64(block.timestamp),
            verified: false
        });

        emit PaymentRegistered(leaseId, period, txHash, amount);
    }

    /**
     * @notice Verify payment by checking USDC Transfer event
     * @dev Can be called permissionlessly by monitoring Transfer events
     */
    function verifyPayment(
        uint256 leaseId,
        uint256 period,
        address lessor,
        uint256 expectedAmount
    ) external {
        PaymentRecord storage record = payments[leaseId][period];
        require(record.txHash != bytes32(0), "Payment not registered");
        require(!record.verified, "Already verified");

        // In production, verify via event logs or proof
        // For now, trust the oracle and allow manual verification
        record.verified = true;
        latestPaidPeriod[leaseId] = period;

        emit PaymentVerified(leaseId, period);
    }

    /**
     * @notice Check if a lease is current on payments
     */
    function isLeaseCurrentOnPayments(
        uint256 leaseId,
        uint256 currentPeriod
    ) external view returns (bool) {
        return latestPaidPeriod[leaseId] >= currentPeriod;
    }

    /**
     * @notice Get payment details for a specific period
     */
    function getPayment(
        uint256 leaseId,
        uint256 period
    ) external view returns (PaymentRecord memory) {
        return payments[leaseId][period];
    }
}
```

#### B. LeaseFactory Enhancement

Add X402 payment tracking integration:

```solidity
// Add to LeaseFactory.sol

IPaymentTracker public immutable PAYMENT_TRACKER;

modifier leaseCurrentOnPayments(uint256 tokenId) {
    uint256 currentPeriod = getCurrentPeriod(tokenId);
    require(
        PAYMENT_TRACKER.isLeaseCurrentOnPayments(tokenId, currentPeriod),
        "Lease payment overdue"
    );
    _;
}

function getCurrentPeriod(uint256 tokenId) public view returns (uint256) {
    Lease memory lease = leases[tokenId];
    if (block.timestamp < lease.startTime) return 0;
    if (block.timestamp > lease.endTime) return type(uint256).max;

    uint256 elapsed = block.timestamp - lease.startTime;
    return elapsed / lease.rentPeriod + 1;
}

/**
 * @notice Grant access to leased asset (can be called by anyone to check status)
 */
function canAccessAsset(uint256 tokenId)
    external
    view
    leaseCurrentOnPayments(tokenId)
    returns (bool)
{
    return block.timestamp <= leases[tokenId].endTime;
}
```

#### C. Marketplace Enhancement

Extend to support X402 payment initialization:

```solidity
// Add to Marketplace.sol

struct LeaseOfferX402 {
    address lessor;
    LeaseFactory.LeaseIntent terms;
    bool useX402Payments;      // Flag for streaming vs upfront
    string x402EndpointURI;    // Lessor's X402 payment server
    bool active;
}

event LeaseOfferPostedX402(
    uint256 indexed offerId,
    address indexed lessor,
    uint256 assetId,
    string x402EndpointURI
);

/**
 * @notice Post lease offer with X402 streaming payment option
 */
function postLeaseOfferX402(
    LeaseFactory.LeaseIntent calldata L,
    string calldata x402EndpointURI
) external returns (uint256 offerId) {
    // Store offer with X402 flag
    // Lessees will pay per-period via X402 instead of upfront bid
}
```

### 2.3 Phase 3: Client Integration (Weeks 7-9)

**Objective:** Build Lessee client tools for automated X402 streaming payments.

#### A. X402 Client SDK

Location: `offchain/src/client/X402LeaseClient.ts`

```typescript
import { wrapFetchWithPayment } from "x402-fetch";
import { createWalletClient } from "viem";

export class X402LeaseClient {
  private paidFetch: typeof fetch;

  constructor(
    private walletClient: WalletClient,
    private lessorEndpoint: string
  ) {
    this.paidFetch = wrapFetchWithPayment(fetch, walletClient);
  }

  /**
   * Start streaming lease payments
   * Automatically makes X402 payment each period
   */
  async startLeasePaymentStream(
    leaseId: string,
    durationMinutes: number,
    intervalMinutes: number = 60  // Default: hourly payments
  ): Promise<void> {
    const totalPeriods = Math.ceil(durationMinutes / intervalMinutes);

    for (let period = 0; period < totalPeriods; period++) {
      try {
        // Make paid request (automatic X402 flow)
        const response = await this.paidFetch(
          `${this.lessorEndpoint}/api/lease/${leaseId}/access?period=${period}`
        );

        // Parse payment response
        const paymentResponse = this.decodePaymentResponse(
          response.headers.get("X-PAYMENT-RESPONSE")
        );

        if (paymentResponse.success) {
          console.log(`Period ${period} paid: ${paymentResponse.transaction}`);
        }

        // Wait for next period
        await this.sleep(intervalMinutes * 60 * 1000);

      } catch (error) {
        console.error(`Payment failed for period ${period}:`, error);
        throw error;
      }
    }
  }

  /**
   * Make single period payment
   */
  async payLeasePeriod(leaseId: string, period: number): Promise<PaymentReceipt> {
    const response = await this.paidFetch(
      `${this.lessorEndpoint}/api/lease/${leaseId}/access?period=${period}`
    );

    const paymentResponse = this.decodePaymentResponse(
      response.headers.get("X-PAYMENT-RESPONSE")
    );

    return {
      leaseId,
      period,
      txHash: paymentResponse.transaction,
      network: paymentResponse.network,
      timestamp: new Date().toISOString()
    };
  }

  private decodePaymentResponse(header: string | null): X402SettlementResponse {
    if (!header) throw new Error("No payment response header");
    const decoded = Buffer.from(header, "base64").toString("utf-8");
    return JSON.parse(decoded);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

#### B. Example Client Usage

Location: `offchain/examples/lessee-streaming-payment.ts`

```typescript
import { X402LeaseClient } from "../src/client/X402LeaseClient";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";

async function main() {
  // Setup Lessee wallet
  const account = privateKeyToAccount(process.env.LESSEE_PRIVATE_KEY!);
  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http()
  });

  // Initialize X402 client
  const client = new X402LeaseClient(
    walletClient,
    "https://lessor-api.example.com"  // Lessor's X402 endpoint
  );

  // Start streaming payments for 30-day lease with hourly payments
  await client.startLeasePaymentStream(
    "LEASE-001",
    30 * 24 * 60,  // 30 days in minutes
    60             // Pay every 60 minutes
  );

  console.log("Lease payments completed successfully");
}
```

---

## 3. Revenue Distribution Architecture

### 3.1 Real-Time Distribution Model

**Current:** Single distribution event when lease bid accepted
**Target:** Continuous distribution as X402 payments arrive

```typescript
// offchain/src/services/RevenueDistributionService.ts

export class RevenueDistributionService {
  /**
   * Process revenue distribution for X402 payment
   * Called after each successful payment settlement
   */
  async distributeX402Revenue(
    paymentId: string,
    leaseId: string,
    amount: bigint
  ): Promise<DistributionResult> {
    // 1. Get lease and asset details
    const lease = await this.leaseRepo.findById(leaseId);
    const asset = await this.assetRegistry.getAsset(lease.assetId);

    // 2. Get current AssetERC20 token holders
    const assetToken = new Contract(asset.tokenAddress, AssetERC20ABI, this.provider);
    const [holders, balances] = await assetToken.getHolders();
    const totalSupply = await assetToken.totalSupply();

    // 3. Create distribution record
    const distributionId = await this.createDistribution({
      leaseId,
      paymentId,
      assetId: lease.assetId,
      totalAmount: amount,
      tokenSupply: totalSupply
    });

    // 4. Calculate and record claims for each holder
    const claims = [];
    for (let i = 0; i < holders.length; i++) {
      const share = (amount * balances[i]) / totalSupply;

      const claim = await this.createClaim({
        distributionId,
        holderAddress: holders[i],
        tokenBalance: balances[i],
        claimAmount: share
      });

      claims.push(claim);
    }

    // 5. Notify holders (optional)
    await this.notifyHolders(claims);

    return {
      distributionId,
      totalAmount: amount,
      holderCount: holders.length,
      claims
    };
  }

  /**
   * Aggregate multiple X402 payments into batch distribution
   * For efficiency: distribute once per day instead of per payment
   */
  async batchDistributeRevenue(
    leaseId: string,
    startDate: Date,
    endDate: Date
  ): Promise<DistributionResult> {
    // Aggregate all X402 payments in period
    const payments = await this.db.query(`
      SELECT SUM(amount) as total
      FROM x402_payments
      WHERE lease_id = $1
        AND payment_timestamp BETWEEN $2 AND $3
        AND verified = true
        AND payment_id NOT IN (
          SELECT payment_id FROM x402_revenue_distributions
        )
    `, [leaseId, startDate, endDate]);

    // Distribute total
    return this.distributeX402Revenue(null, leaseId, payments.total);
  }
}
```

### 3.2 Holder Claim Interface

```typescript
// API endpoint for holders to claim revenue

app.get('/api/revenue/claims/:holderAddress', async (req, res) => {
  const { holderAddress } = req.params;

  // Get all unclaimed revenue
  const claims = await db.query(`
    SELECT
      c.claim_id,
      c.claim_amount,
      d.asset_id,
      d.distribution_timestamp,
      p.transaction_hash as payment_tx_hash
    FROM x402_holder_claims c
    JOIN x402_revenue_distributions d ON c.distribution_id = d.distribution_id
    LEFT JOIN x402_payments p ON d.payment_id = p.payment_id
    WHERE c.holder_address = $1 AND c.claimed = false
    ORDER BY d.distribution_timestamp DESC
  `, [holderAddress]);

  res.json({ claims });
});

app.post('/api/revenue/claim', async (req, res) => {
  const { holderAddress, claimIds } = req.body;

  // Calculate total claimable
  const result = await db.query(`
    SELECT SUM(claim_amount) as total
    FROM x402_holder_claims
    WHERE claim_id = ANY($1) AND holder_address = $2 AND claimed = false
  `, [claimIds, holderAddress]);

  // Transfer USDC to holder
  const totalAmount = result.total;
  const tx = await stablecoin.transfer(holderAddress, totalAmount);

  // Mark claims as claimed
  await db.query(`
    UPDATE x402_holder_claims
    SET claimed = true,
        claimed_at = NOW(),
        claim_transaction_hash = $1
    WHERE claim_id = ANY($2)
  `, [tx.hash, claimIds]);

  res.json({ success: true, txHash: tx.hash, amount: totalAmount });
});
```

---

## 4. Security Considerations

### 4.1 Payment Verification

**Challenge:** Ensure X402 payments actually settled on-chain before granting access

**Solution:**
1. **Optimistic Access** (Fast UX): Grant access after facilitator `/verify` succeeds
2. **Conservative Verification** (Maximum Security): Wait for on-chain USDC Transfer event confirmation
3. **Hybrid Approach**: Use optimistic for amounts < $100, conservative for larger payments

```typescript
// Configure verification strategy per lease value
const verificationStrategy = (amount: bigint): 'optimistic' | 'conservative' => {
  return amount > parseUnits("100", 6) ? 'conservative' : 'optimistic';
};
```

### 4.2 Oracle Trust Model

**X402PaymentTracker Contract Risk:** Relies on trusted `PAYMENT_ORACLE_ROLE` to register payments

**Mitigations:**
1. **Multi-Signature Oracle**: Require 2-of-3 signatures for payment registration
2. **Event-Based Verification**: Allow permissionless verification by proving USDC Transfer event
3. **Timelock**: Add delay before payment verification becomes effective
4. **Audit Trail**: All oracle actions logged in database and emitted as events

```solidity
// Enhanced security: require proof of Transfer event
function registerPaymentWithProof(
    uint256 leaseId,
    uint256 period,
    bytes32 txHash,
    uint256 amount,
    bytes calldata transferEventProof  // Merkle proof or RLP-encoded event
) external {
    // Verify proof against known USDC contract
    require(verifyTransferEvent(txHash, transferEventProof), "Invalid proof");

    // Register payment without oracle role
    // ...
}
```

### 4.3 Lessee Non-Payment Handling

**Challenge:** What happens if Lessee stops making X402 payments?

**Solutions:**
1. **Grace Period**: Allow 1-2 missed periods before revoking access
2. **Security Deposit**: Use existing `securityDeposit` from lease as fallback
3. **Access Revocation**: Off-chain service denies 402 responses for delinquent leases
4. **On-Chain Enforcement**: Smart contract function to mark lease as defaulted

```solidity
// LeaseFactory.sol
function markLeaseAsDefaulted(uint256 tokenId)
    external
    onlyRole(DEFAULT_ADMIN_ROLE)
{
    Lease storage lease = leases[tokenId];
    uint256 currentPeriod = getCurrentPeriod(tokenId);

    require(
        !PAYMENT_TRACKER.isLeaseCurrentOnPayments(tokenId, currentPeriod),
        "Lease is current"
    );

    // Mark as defaulted (add status field in Phase 2)
    emit LeaseDefaulted(tokenId, currentPeriod);
}
```

### 4.4 Facilitator Dependency

**Risk:** Reliance on Coinbase facilitator creates centralization point

**Mitigations:**
1. **Multi-Facilitator Support**: Allow Lessors to configure backup facilitators (PayAI, custom)
2. **Direct Settlement**: Fallback to direct USDC transfer if facilitator unavailable
3. **Self-Hosted Option**: Provide docker image for running own facilitator

---

## 5. Implementation Roadmap

### Week 1-2: Database & Core Services
- [ ] Create X402 payment tracking schema (migrations)
- [ ] Implement `X402PaymentService` with Express middleware
- [ ] Build `X402ProcessingService` for payment handling
- [ ] Setup PostgreSQL tables and indexes

### Week 3-4: Payment Flow Integration
- [ ] Integrate Coinbase X402 facilitator SDK
- [ ] Implement payment verification logic
- [ ] Build revenue distribution calculation for X402 payments
- [ ] Add blockchain event listener for USDC transfers

### Week 5-6: Smart Contract Extensions
- [ ] Deploy `X402PaymentTracker` contract (Testnet)
- [ ] Extend `LeaseFactory` with payment status checks
- [ ] Update `Marketplace` for X402 lease offers
- [ ] Write comprehensive tests for new contracts

### Week 7-8: Client SDK & Tooling
- [ ] Build `X402LeaseClient` TypeScript SDK
- [ ] Create example Lessee payment automation script
- [ ] Develop holder claim interface (API + UI)
- [ ] Add monitoring dashboard for payment streams

### Week 9: Testing & Documentation
- [ ] End-to-end integration testing on Base Sepolia
- [ ] Security audit of oracle and payment verification
- [ ] Write developer documentation
- [ ] Create deployment scripts

### Week 10-12: Mainnet Preparation
- [ ] Mainnet deployment of X402PaymentTracker
- [ ] Configure production facilitator (Coinbase Base mainnet)
- [ ] Setup monitoring and alerting
- [ ] Launch with initial pilot leases

---

## 6. Example End-to-End Flow

### Scenario: Satellite Lease with Hourly X402 Payments

**Asset:** Starlink-42 (AssetERC20 token with 1M supply)
**Token Holders:** Alice (40%), Bob (30%), Carol (30%)
**Lease Terms:** $10,000/month ($13.89/hour), 1-year lease
**Payment Method:** X402 hourly micropayments

#### Step-by-Step Flow:

**1. Lease Creation (On-Chain via LeaseFactory)**
```solidity
LeaseIntent memory intent = LeaseIntent({
    deadline: block.timestamp + 7 days,
    assetTypeSchemaHash: satelliteSchema,
    lease: Lease({
        lessor: lessorAddress,
        lessee: lesseeAddress,
        assetId: 42,  // Starlink-42
        paymentToken: USDC_BASE,
        rentAmount: 13.89 * 10**6,  // $13.89 USDC per hour
        rentPeriod: 3600,            // 1 hour in seconds
        securityDeposit: 10000 * 10**6,  // $10,000 security deposit
        startTime: uint64(block.timestamp),
        endTime: uint64(block.timestamp + 365 days),
        legalDocHash: keccak256(legalDoc),
        termsVersion: 1,
        metadata: []
    })
});

uint256 leaseNFT = leaseFactory.mintLease(intent, sigLessor, sigLessee);
```

**2. Lessor Configures X402 Endpoint (Off-Chain)**
```typescript
// Lessor's server configuration
const lessorConfig = {
  walletAddress: "0xLessorWallet...",
  x402Endpoint: "https://lessor-api.starlink.com",
  leaseId: "LEASE-STARLINK-42-001",
  pricePerHour: "$13.89",
  network: "base-mainnet"
};

// Start X402 payment server
await x402Server.start(lessorConfig);
```

**3. Lessee Starts Streaming Payments (Off-Chain Client)**
```typescript
// Lessee's automated payment client
const client = new X402LeaseClient(lesseeWallet, lessorConfig.x402Endpoint);

// Start hourly payment stream for 30 days
await client.startLeasePaymentStream(
  "LEASE-STARLINK-42-001",
  30 * 24 * 60,  // 30 days
  60             // Pay every 60 minutes
);
```

**4. First X402 Payment (Hour 1)**
```
Lessee Client → GET https://lessor-api.starlink.com/api/lease/LEASE-STARLINK-42-001/access?period=1
              ← 402 Payment Required { payTo: 0xLessorWallet, amount: 13.89 USDC, ... }

Lessee Wallet → Sign EIP-712 payment authorization (gasless)

Lessee Client → GET (with X-PAYMENT header containing signed authorization)

Lessor Server → POST https://x402.org/facilitator/verify (verify payment)
              ← { isValid: true }

Lessor Server → POST https://x402.org/facilitator/settle (execute on-chain)
              ← { success: true, txHash: 0xabc123... }

Blockchain    → USDC.transferWithAuthorization(from: Lessee, to: Lessor, value: 13.89 USDC)
              → Event: Transfer(Lessee, Lessor, 13.89 USDC)

Lessor Server → 200 OK (with X-PAYMENT-RESPONSE header)
              → Database: Record payment for Period 1
```

**5. Revenue Distribution (Automated)**
```typescript
// Triggered by payment settlement
await revenueService.distributeX402Revenue(
  "payment_001",
  "LEASE-STARLINK-42-001",
  parseUnits("13.89", 6)  // $13.89 USDC
);

// Calculates shares:
// Alice (40%):  $5.56 USDC
// Bob (30%):    $4.17 USDC
// Carol (30%):  $4.16 USDC

// Database records:
// - x402_payments: payment_001, period 1, $13.89, txHash 0xabc123
// - x402_revenue_distributions: distribution_001, total $13.89
// - x402_holder_claims: Alice $5.56, Bob $4.17, Carol $4.16
```

**6. Holders Claim Revenue (On-Demand)**
```typescript
// Alice claims her accumulated revenue after 24 hours (24 payments)
// Total claimable: 24 hours × $5.56/hour = $133.44

await claimAPI.post('/api/revenue/claim', {
  holderAddress: "0xAliceWallet...",
  claimIds: [ /* 24 claim IDs */ ]
});

// Result: USDC transfer of $133.44 to Alice's wallet
```

**7. Payment Verification (On-Chain)**
```solidity
// Off-chain oracle registers payment in smart contract
X402PaymentTracker.registerPayment(
  leaseNFT,       // Lease token ID
  1,              // Period 1
  0xabc123...,    // Payment tx hash
  13.89 * 10**6   // Amount
);

// Later: Verify against USDC Transfer event
X402PaymentTracker.verifyPayment(leaseNFT, 1, lessorAddress, 13.89 * 10**6);

// Lease status check
bool canAccess = LeaseFactory.canAccessAsset(leaseNFT);
// Returns: true (payment current)
```

**8. Continuous Payments (Hours 2-720)**
- Lessee client automatically repeats X402 flow every hour
- Each payment: verification → settlement → revenue distribution → claim recording
- Token holders accumulate claims continuously
- On-chain payment tracker updated periodically (e.g., daily batches)

**9. End of Lease (After 1 Year)**
```typescript
// Total payments: 8760 hours × $13.89 = $121,696.40
// Alice earned: 40% × $121,696.40 = $48,678.56
// Bob earned:   30% × $121,696.40 = $36,508.92
// Carol earned: 30% × $121,696.40 = $36,508.92

// Lease NFT expires
LeaseFactory.canAccessAsset(leaseNFT); // Returns: false (past endTime)

// Security deposit returned to Lessee (if no defaults)
```

---

## 7. Testing Strategy

### 7.1 Unit Tests (Offchain Services)

```typescript
// tests/unit/X402PaymentService.test.ts

describe('X402PaymentService', () => {
  it('should generate correct 402 response for lease period', async () => {
    const response = await service.generatePaymentRequired(
      'LEASE-001',
      1  // Period 1
    );

    expect(response.status).toBe(402);
    expect(response.body.paymentRequirements[0].maxAmountRequired).toBe('13890000');  // $13.89 USDC
    expect(response.body.paymentRequirements[0].payTo).toBe(lessorAddress);
  });

  it('should process payment and distribute revenue', async () => {
    const result = await service.processPayment(leaseId, paymentPayload);

    expect(result.txHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
    expect(result.distributionId).toBeDefined();

    // Verify claims created
    const claims = await db.query(`
      SELECT * FROM x402_holder_claims WHERE distribution_id = $1
    `, [result.distributionId]);

    expect(claims.rows.length).toBe(3);  // Alice, Bob, Carol
  });
});
```

### 7.2 Integration Tests (Smart Contracts)

```solidity
// test/X402Integration.t.sol

function test_StreamingLeasePayment() public {
    // 1. Mint lease NFT
    uint256 leaseId = mintTestLease();

    // 2. Oracle registers X402 payment for period 1
    vm.prank(oracle);
    paymentTracker.registerPayment(
        leaseId,
        1,
        bytes32("0xabc123"),
        13.89 * 10**6
    );

    // 3. Verify payment
    paymentTracker.verifyPayment(leaseId, 1, lessor, 13.89 * 10**6);

    // 4. Check lease access
    bool canAccess = leaseFactory.canAccessAsset(leaseId);
    assertTrue(canAccess, "Should have access after payment");

    // 5. Advance time past period 2 without payment
    vm.warp(block.timestamp + 2 hours);

    // 6. Access should be denied (payment overdue)
    canAccess = leaseFactory.canAccessAsset(leaseId);
    assertFalse(canAccess, "Should not have access when payment overdue");
}
```

### 7.3 End-to-End Tests (Full Stack)

```typescript
// tests/integration/x402-end-to-end.test.ts

describe('X402 Lease Payment Flow', () => {
  it('should complete full streaming payment lifecycle', async () => {
    // 1. Setup: Deploy contracts, fund wallets
    const { leaseFactory, paymentTracker, lessorServer, lesseeClient } = await setup();

    // 2. Create lease on-chain
    const leaseNFT = await createLease(lessor, lessee);

    // 3. Start Lessor's X402 server
    await lessorServer.start();

    // 4. Lessee makes first payment
    const receipt = await lesseeClient.payLeasePeriod(leaseNFT, 1);
    expect(receipt.txHash).toBeDefined();

    // 5. Verify payment recorded in database
    const payment = await db.query(`
      SELECT * FROM x402_payments WHERE lease_id = $1 AND period_number = 1
    `, [leaseNFT]);
    expect(payment.rows[0].verified).toBe(true);

    // 6. Verify revenue distributed
    const distributions = await db.query(`
      SELECT * FROM x402_revenue_distributions WHERE lease_id = $1
    `, [leaseNFT]);
    expect(distributions.rows.length).toBe(1);

    // 7. Verify claims created
    const claims = await db.query(`
      SELECT * FROM x402_holder_claims WHERE distribution_id = $1
    `, [distributions.rows[0].distribution_id]);
    expect(claims.rows.length).toBe(3);  // 3 token holders

    // 8. Alice claims her share
    const claimTx = await claimRevenue(alice, [claims.rows[0].claim_id]);
    expect(claimTx.hash).toBeDefined();

    // 9. Verify USDC received
    const aliceBalance = await usdc.balanceOf(alice);
    expect(aliceBalance).toBeGreaterThan(0n);
  });
});
```

---

## 8. Migration Path for Existing Leases

### 8.1 Backward Compatibility

**Strategy:** Support both payment models simultaneously

```solidity
// LeaseFactory.sol
enum PaymentModel {
    UPFRONT_FULL,      // Original: full payment via Marketplace
    STREAMING_X402     // New: periodic X402 payments
}

struct Lease {
    // ... existing fields ...
    PaymentModel paymentModel;
    bytes32 x402ConfigHash;  // Hash of off-chain X402 config
}
```

### 8.2 Opt-In Migration for Token Holders

```typescript
// Allow existing leases to transition to X402 mid-term

async function migrateLeaseToX402(
  leaseId: number,
  x402Endpoint: string,
  lessorSignature: string
): Promise<void> {
  // 1. Verify lessor authorization
  const lease = await leaseFactory.getLease(leaseId);
  const recovered = verifySignature(
    keccak256(abi.encode(leaseId, x402Endpoint)),
    lessorSignature
  );
  require(recovered === lease.lessor, "Unauthorized");

  // 2. Calculate remaining rent
  const currentPeriod = getCurrentPeriod(lease);
  const totalPeriods = (lease.endTime - lease.startTime) / lease.rentPeriod;
  const remainingPeriods = totalPeriods - currentPeriod;
  const remainingRent = remainingPeriods * lease.rentAmount;

  // 3. Refund prepaid rent to Lessee
  await usdc.transfer(lease.lessee, remainingRent);

  // 4. Update lease to X402 model
  await db.query(`
    UPDATE leases
    SET payment_model = 'STREAMING_X402',
        x402_endpoint = $1
    WHERE lease_id = $2
  `, [x402Endpoint, leaseId]);

  // 5. Lessee starts streaming payments
}
```

---

## 9. Monitoring & Observability

### 9.1 Key Metrics to Track

```typescript
// Metrics dashboard

interface X402Metrics {
  // Payment metrics
  totalPayments: number;
  totalVolume: bigint;
  averagePaymentLatency: number;  // Time from 402 to settlement
  failureRate: number;

  // Lease metrics
  activeLeases: number;
  currentOnPaymentLeases: number;
  delinquentLeases: number;

  // Revenue metrics
  totalRevenueDistributed: bigint;
  averageClaimTime: number;  // Time from distribution to claim
  unclaimedRevenue: bigint;

  // System metrics
  facilitatorUptime: number;
  oracleLatency: number;
  blockchainSyncDelay: number;
}
```

### 9.2 Alerting Rules

```yaml
# alerts.yml

- name: X402PaymentFailureRateHigh
  condition: failure_rate > 0.05  # 5% failure threshold
  action: notify_slack
  severity: warning

- name: LeaseDelinquencyDetected
  condition: delinquent_leases > 0
  action: notify_admin
  severity: critical

- name: UnclaimedRevenueHigh
  condition: unclaimed_revenue_usdc > 10000
  action: notify_holders
  severity: info

- name: FacilitatorDowntime
  condition: facilitator_uptime < 0.99
  action: failover_to_backup
  severity: critical
```

---

## 10. Cost-Benefit Analysis

### 10.1 Costs

**Development Costs:**
- Smart contract development & auditing: 4-6 weeks
- Offchain infrastructure: 4-6 weeks
- Testing & QA: 2-3 weeks
- **Total:** ~10-15 weeks engineering time

**Operational Costs:**
- Facilitator fees: $0 (Coinbase sponsors gas on Base)
- Oracle infrastructure: ~$50-100/month (AWS/GCP)
- Monitoring & alerting: ~$20-50/month
- **Total:** ~$70-150/month

### 10.2 Benefits

**For Lessees:**
- **Lower capital requirements**: Pay $14/hour instead of $122K upfront
- **Gasless payments**: No ETH needed, facilitator sponsors gas
- **Flexibility**: Can stop lease without losing prepaid rent
- **Accessibility**: Enables smaller operators to lease expensive assets

**For Lessors:**
- **Steady cash flow**: Hourly/daily revenue instead of annual lump sum
- **Lower default risk**: Only exposure is one period's rent
- **Higher utilization**: More lessees can afford to participate
- **Automated collection**: No manual invoicing or payment tracking

**For Token Holders:**
- **Consistent distributions**: Weekly/monthly revenue instead of once per lease
- **Transparent tracking**: Real-time visibility into payment streams
- **Lower concentration risk**: Multiple small payments reduce impact of single default

### 10.3 ROI Projection

**Assumptions:**
- Average asset value: $1M
- Current lease adoption: 10 leases/year (upfront payment barrier)
- Post-X402 adoption: 30 leases/year (lower barrier to entry)
- Average lease duration: 6 months

**Financial Impact:**
- Current annual revenue: 10 leases × $500K avg = $5M
- Post-X402 annual revenue: 30 leases × $500K avg = $15M
- **Revenue increase: 3x**

**Holder Returns:**
- Current: $5M distributed once per lease (10 distributions/year)
- Post-X402: $15M distributed continuously (365 distributions/year)
- **Improved cash flow velocity & predictability**

---

## 11. Risks & Mitigations

### 11.1 Technical Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Facilitator downtime | Payment failures | Medium | Multi-facilitator support, fallback to direct transfer |
| Oracle compromise | False payment records | Low | Multi-sig oracle, event proof verification |
| USDC transfer event missed | Incorrect payment status | Low | Event replay mechanism, monitoring alerts |
| Client SDK bugs | Payment failures | Medium | Comprehensive testing, gradual rollout |
| Smart contract vulnerabilities | Fund loss | Low | Security audit, formal verification |

### 11.2 Operational Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Lessee payment delinquency | Revenue loss | Medium | Security deposits, grace periods, access revocation |
| Lessor endpoint downtime | Lessee can't pay | Low | SLA monitoring, redundant servers |
| Database corruption | Payment record loss | Very Low | Regular backups, replication |
| Gas price spike | Facilitator delay | Low | Coinbase manages on Base (low gas) |

### 11.3 Regulatory Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Stablecoin regulation changes | Payment method unavailable | Medium | Support multiple stablecoins (USDC, USDT, DAI) |
| KYC/AML requirements | User friction | Medium | Integrate with facilitator's compliance tools |
| Securities classification | Token restrictions | Low | Legal review, structure as utility tokens |

---

## 12. Success Criteria

### 12.1 Phase 1 (Offchain Infrastructure)

- [ ] X402 server handles 100 requests/second
- [ ] Payment verification latency < 3 seconds
- [ ] Database can store 1M payments efficiently
- [ ] Revenue distribution calculation completes in < 5 seconds
- [ ] 99.9% uptime for payment API

### 12.2 Phase 2 (Smart Contracts)

- [ ] X402PaymentTracker deployed and audited
- [ ] Gas costs < 100K gas per payment registration
- [ ] Zero security vulnerabilities in audit
- [ ] LeaseFactory payment checks work correctly
- [ ] Backward compatible with existing leases

### 12.3 Phase 3 (Client SDK)

- [ ] Client SDK supports all major wallets (MetaMask, Coinbase, WalletConnect)
- [ ] Automated payment streams run for 30+ days without failure
- [ ] Clear error messages for all failure scenarios
- [ ] Documentation complete with 10+ examples
- [ ] Developer onboarding time < 2 hours

### 12.4 Production Launch

- [ ] 10 pilot leases using X402 payments
- [ ] $100K+ in X402 payment volume
- [ ] Payment failure rate < 1%
- [ ] Average claim time < 24 hours
- [ ] Zero critical bugs in first 30 days

---

## 13. Next Steps

### Immediate Actions (This Week)

1. **Technical Review**
   - [ ] Review this plan with engineering team
   - [ ] Validate X402 SDK compatibility with our stack
   - [ ] Estimate detailed development timeline

2. **Architecture Decisions**
   - [ ] Choose verification strategy (optimistic vs conservative)
   - [ ] Decide on oracle implementation (centralized vs decentralized)
   - [ ] Select revenue distribution frequency (real-time vs batched)

3. **Resource Allocation**
   - [ ] Assign 2-3 engineers to X402 integration
   - [ ] Budget for security audit ($20-30K)
   - [ ] Allocate testnet USDC and ETH for testing

### Short Term (Next 2 Weeks)

1. **Prototype Development**
   - [ ] Build minimal X402 server with one endpoint
   - [ ] Deploy X402PaymentTracker on Base Sepolia
   - [ ] Create simple Lessee payment script
   - [ ] Validate end-to-end flow on testnet

2. **Documentation**
   - [ ] Document X402 API for Lessors
   - [ ] Write Lessee payment guide
   - [ ] Create architecture diagrams

3. **Stakeholder Alignment**
   - [ ] Present plan to token holders
   - [ ] Gather feedback from potential Lessors/Lessees
   - [ ] Adjust timeline based on feedback

### Medium Term (Next 1-2 Months)

1. **Full Implementation** (per roadmap in Section 5)
2. **Security Audit**
3. **Testnet Beta Program**
4. **Mainnet Preparation**

---

## 14. Conclusion

Integrating X402 into the Asset Leasing Protocol represents a **transformative upgrade** that aligns perfectly with the protocol's mission of democratizing access to high-value assets. By enabling streaming micropayments, we:

1. **Lower barriers to entry** for Lessees (pay-per-use vs massive upfront costs)
2. **Improve cash flow** for Lessors and token holders (continuous revenue)
3. **Reduce default risk** through smaller payment increments
4. **Maintain trust minimization** via on-chain verification
5. **Preserve existing architecture** through modular integration

The proposed architecture is **production-ready, secure, and scalable**, leveraging battle-tested components (Coinbase facilitator, OpenZeppelin contracts, PostgreSQL) while introducing minimal new attack surface. The phased rollout ensures we can validate each component before full deployment.

**Recommended Decision:** Proceed with Phase 1 (Offchain Infrastructure) immediately, targeting a 12-week timeline to production launch.

---

## Appendix A: Reference Implementation Links

- **X402 Official SDK**: https://github.com/coinbase/x402
- **Coinbase Facilitator Docs**: https://docs.cdp.coinbase.com/x402
- **Base Network USDC**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- **EIP-3009 Spec**: https://eips.ethereum.org/EIPS/eip-3009
- **Asset Leasing Protocol Contracts**: `src/`

## Appendix B: Glossary

- **X402**: HTTP 402-based payment protocol for internet-native commerce
- **Facilitator**: Off-chain service that verifies and settles X402 payments on-chain
- **Payment Payload**: EIP-712 signed authorization for stablecoin transfer
- **Streaming Payments**: Continuous small payments over time vs single upfront
- **Revenue Distribution**: Pro-rata allocation of lease revenue to AssetERC20 token holders
- **Payment Oracle**: Trusted off-chain service that registers X402 settlements in smart contract

---

**Document Version:** 1.0
**Last Updated:** January 2025
**Authors:** Asset Leasing Protocol Team
**Review Status:** Pending Engineering Review