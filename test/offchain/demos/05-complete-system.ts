#!/usr/bin/env tsx
/**
 * Complete System Demo - Asset Leasing Protocol + X402 Streaming Payments
 *
 * This demonstrates the FULL protocol workflow including:
 * 1. Contract deployment (UUPS upgradeable)
 * 2. Asset registration
 * 3. Lease offer creation
 * 4. Lease bidding and acceptance
 * 5. X402 streaming micropayments
 * 6. Revenue claims
 *
 * Run: npx tsx demos/05-complete-system.ts
 *
 * Philosophy: Complete end-to-end demonstration showing ALL protocol capabilities
 */

import { ethers } from 'ethers';
import { BlockchainClient } from '../src/core/blockchain-client.js';
import { ContractManager } from '../src/core/contract-manager.js';
import { AssetService } from '../src/services/asset-service.js';
import { LeaseService } from '../src/services/lease-service.js';
import { MarketplaceService } from '../src/services/marketplace-service.js';
import { RevenueService } from '../src/services/revenue-service.js';
import { MockDatabase } from '../src/storage/database.js';
import { Cache } from '../src/storage/cache.js';
import { getConfig } from '../src/config/index.js';
import type { LeaseIntentData } from '../src/types/lease.js';

// CLI colors
const colors = {
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  dim: '\x1b[2m',
  reset: '\x1b[0m',
  bright: '\x1b[1m'
};

function header(text: string) {
  console.log(`\n${colors.bright}${colors.cyan}${'═'.repeat(70)}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}  ${text}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}${'═'.repeat(70)}${colors.reset}\n`);
}

function section(text: string) {
  console.log(`\n${colors.bright}${colors.magenta}${'─'.repeat(70)}${colors.reset}`);
  console.log(`${colors.bright}${colors.magenta}  ${text}${colors.reset}`);
  console.log(`${colors.bright}${colors.magenta}${'─'.repeat(70)}${colors.reset}\n`);
}

function explain(text: string) {
  console.log(`${colors.dim}💡 ${text}${colors.reset}`);
}

async function retryTransaction<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      if (i < maxRetries - 1 && error.code === 'NONCE_EXPIRED') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}

async function main() {
  header('Asset Leasing Protocol - Complete System Demo');
  explain('This demo shows the full protocol including marketplace bidding and X402 payments');

  const config = getConfig();

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 1: Connect to Blockchain
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  header('STEP 1: Connect to Blockchain');
  explain('Connecting to local Anvil blockchain with pre-funded test accounts');

  const blockchain = new BlockchainClient(config);
  await blockchain.connect();

  const balance = await blockchain.getBalance();
  console.log(`✓ Connected to blockchain`);
  console.log(`  Address: ${blockchain.getAddress()}`);
  console.log(`  Chain ID: ${config.chainId}`);
  console.log(`  Balance: ${balance} ETH\n`);

  // Create test wallets for bidders
  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  const bidder1 = new ethers.Wallet(
    '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d', // Anvil account #1
    provider
  );
  const bidder2 = new ethers.Wallet(
    '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a', // Anvil account #2
    provider
  );

  console.log(`${colors.blue}Test Accounts Created:${colors.reset}`);
  console.log(`  Bidder 1: ${bidder1.address}`);
  console.log(`  Bidder 2: ${bidder2.address}\n`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 2: Deploy Contracts
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  header('STEP 2: Deploy Contracts');
  explain('Deploying all contracts using UUPS upgradeable proxy pattern');

  const manager = new ContractManager(blockchain);
  const deployment = await manager.deployAll();

  console.log(`${colors.green}✓ All contracts deployed successfully!${colors.reset}\n`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 3: Initialize Services
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  header('STEP 3: Initialize Services');

  const database = new MockDatabase();
  await database.connect();

  const cache = new Cache();
  const assetService = new AssetService(blockchain, database, cache);
  const leaseService = new LeaseService(blockchain, database, cache);
  const marketplaceService = new MarketplaceService(blockchain, database, cache);
  const revenueService = new RevenueService(blockchain, database, cache);

  // Set lease service dependency for marketplace (for lease activation after bid acceptance)
  marketplaceService.setLeaseService(leaseService);

  console.log(`${colors.green}✓ All services initialized${colors.reset}\n`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 4: Create Asset Type
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  header('STEP 4: Create Asset Type');
  explain('Creating "Orbital Compute Station" asset type with schema');

  await assetService.createAssetType(
    'Orbital Compute Station',
    'orbital_compute',
    ['rentAmount', 'rentPeriod', 'securityDeposit']
  );

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 5: Register Asset
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  header('STEP 5: Register Asset');
  explain('Registering orbital compute station with complete specifications');

  const timestamp = new Date().toISOString();
  const metadata = {
    assetId: '', // Will be set after registration
    name: 'Orbital Compute Station Alpha',
    description: 'High-performance compute station in low Earth orbit',
    assetType: 'orbital_compute' as const,
    specifications: {
      type: 'orbital_compute',
      compute: {
        cpu_cores: 128,
        ram_gb: 1024,
        storage_tb: 500,
        gpu_count: 8
      },
      orbit: {
        altitude_km: 550,
        inclination_deg: 53
      }
    },
    documents: [], // No documents for this demo
    metadata: {
      createdAt: timestamp,
      updatedAt: timestamp,
      version: '1.0.0'
    }
  };

  const assetResult = await assetService.registerAsset(
    metadata,
    'orbital_compute',
    'OCS Alpha Token',
    'OCS-A',
    BigInt(1000000) * BigInt(10 ** 18) // 1M tokens
  );

  console.log(`${colors.green}✓ Asset ID: ${assetResult.assetId}${colors.reset}`);
  console.log(`${colors.green}✓ Token: ${assetResult.tokenAddress}${colors.reset}\n`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 6: Query Token Holders
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  header('STEP 6: Query Token Holders');

  const holders = await assetService.getHolders(assetResult.assetId.toString());

  console.log(`${colors.green}✓ Total holders: ${holders.length}${colors.reset}\n`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 7: Create Lease Offer
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  header('STEP 7: Create Lease Offer');
  explain('Asset owner posts lease offer on the marketplace');

  const now = Math.floor(Date.now() / 1000);
  const oneYear = 365 * 24 * 60 * 60;

  const leaseResult = await leaseService.createLeaseOffer(
    assetResult.assetId.toString(),
    blockchain.getAddress(), // lessor
    ethers.ZeroAddress, // lessee (open to anyone)
    ethers.parseEther('1000'), // rentAmount: 1000 USDC per period
    BigInt(30 * 24 * 60 * 60), // rentPeriod: 30 days
    ethers.parseEther('5000'), // securityDeposit: 5000 USDC
    now,
    now + oneYear,
    'orbital_compute'
  );

  console.log(`${colors.green}✓ Lease Offer ID: ${leaseResult.leaseId}${colors.reset}\n`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 8: Fund Stablecoin to Bidders
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  header('STEP 8: Fund Bidders with USDC');
  explain('Minting test USDC to bidders for escrow deposits');

  const stablecoin = blockchain.getContract('MockStablecoin');

  // Mint USDC to bidders
  await blockchain.submitTransaction(
    stablecoin,
    'mint',
    [bidder1.address, ethers.parseEther('10000')]
  );

  await blockchain.submitTransaction(
    stablecoin,
    'mint',
    [bidder2.address, ethers.parseEther('10000')]
  );

  console.log(`${colors.green}✓ Bidder 1: 10,000 USDC${colors.reset}`);
  console.log(`${colors.green}✓ Bidder 2: 10,000 USDC${colors.reset}\n`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 9: Place Competing Bids (WITH EIP-712 SIGNATURES)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  header('STEP 9: Place Competing Bids');
  explain('Bidders place bids with EIP-712 signatures');

  // Query the marketplace offer to build LeaseIntent
  const marketplace = blockchain.getContract('Marketplace');
  const offer = await marketplace.leaseOffers(leaseResult.leaseId);

  // Build base LeaseIntent from offer terms
  const baseLeaseIntent: LeaseIntentData = {
    deadline: offer.terms.deadline,
    assetTypeSchemaHash: offer.terms.assetType,  // Note: struct field is "assetType", TYPEHASH uses "assetTypeSchemaHash"
    lease: {
      lessor: offer.lessor,
      lessee: bidder1.address, // Will be updated for each bidder
      assetId: offer.terms.lease.assetId,
      paymentToken: offer.terms.lease.paymentToken,
      rentAmount: offer.terms.lease.rentAmount,
      rentPeriod: offer.terms.lease.rentPeriod,
      securityDeposit: offer.terms.lease.securityDeposit,
      startTime: offer.terms.lease.startTime,
      endTime: offer.terms.lease.endTime,
      legalDocHash: offer.terms.lease.legalDocHash,
      termsVersion: offer.terms.lease.termsVersion
    }
  };

  section('Bidder 1: Places bid with 6000 USDC escrow');
  explain('Higher escrow = stronger commitment signal');

  // Bidder 1 places bid
  const leaseIntent1 = { ...baseLeaseIntent, lease: { ...baseLeaseIntent.lease, lessee: bidder1.address } };
  const bid1Result = await marketplaceService.placeBid(
    leaseResult.leaseId,
    ethers.parseUnits('6000', 6), // 6000 USDC (6 decimals)
    bidder1,
    leaseIntent1
  );

  console.log(`${colors.green}✓ Bid 1 placed successfully${colors.reset}`);
  console.log(`  Bid Index: ${bid1Result.bidIndex}`);
  console.log(`  Escrow: 6000 USDC`);
  console.log(`  Signature: ${bid1Result.signature.substring(0, 20)}...${colors.reset}\n`);

  section('Bidder 2: Places competing bid with 7000 USDC escrow');

  // Bidder 2 places higher bid
  const leaseIntent2 = { ...baseLeaseIntent, lease: { ...baseLeaseIntent.lease, lessee: bidder2.address } };
  const bid2Result = await marketplaceService.placeBid(
    leaseResult.leaseId,
    ethers.parseUnits('7000', 6), // 7000 USDC
    bidder2,
    leaseIntent2
  );

  console.log(`${colors.green}✓ Bid 2 placed successfully${colors.reset}`);
  console.log(`  Bid Index: ${bid2Result.bidIndex}`);
  console.log(`  Escrow: 7000 USDC`);
  console.log(`  Signature: ${bid2Result.signature.substring(0, 20)}...${colors.reset}\n`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 10: Accept Best Bid (WITH EIP-712 SIGNATURE)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  header('STEP 10: Accept Best Bid');
  explain('Lessor accepts Bidder 2 (highest escrow) with EIP-712 signature');

  // Debug: Log the lease intent being used
  console.log(`${colors.dim}  DEBUG: LeaseIntent for acceptance:${colors.reset}`);
  console.log(`${colors.dim}    Lessor: ${leaseIntent2.lease.lessor}${colors.reset}`);
  console.log(`${colors.dim}    Lessee: ${leaseIntent2.lease.lessee}${colors.reset}`);
  console.log(`${colors.dim}    Expected lessor: ${blockchain.getAddress()}${colors.reset}`);
  console.log(`${colors.dim}    Expected lessee: ${bidder2.address}${colors.reset}\n`);

  // Lessor accepts Bidder 2's bid
  const acceptResult = await marketplaceService.acceptBid(
    leaseResult.leaseId,
    bid2Result.bidIndex,
    blockchain.getSigner(), // Lessor wallet
    leaseIntent2 // Same terms bidder2 signed
  );

  console.log(`${colors.green}✓ Bid accepted successfully!${colors.reset}`);
  console.log(`  Lease NFT ID: ${acceptResult.leaseTokenId}`);
  console.log(`  Lessee: ${acceptResult.lessee}`);
  console.log(`  Lessor Signature: ${acceptResult.lessorSignature.substring(0, 20)}...`);
  console.log(`  Transaction: ${acceptResult.transactionHash}`);
  console.log(`  Block: ${acceptResult.blockNumber}`);

  if (acceptResult.lease) {
    console.log(`  ${colors.bright}✓ Lease activated in database${colors.reset}`);
    console.log(`    Status: ${acceptResult.lease.status}`);
  }
  console.log();

  const leaseId = acceptResult.leaseTokenId;

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 11: X402 Streaming Payments (Simulated)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  header('STEP 11: X402 Streaming Payments');
  section('Payment Mode: per-second streaming (HTTP 402)');
  explain('Lessee pays for compute time using X402 micropayments');
  explain('Each second of usage = automatic payment stream');

  console.log(`\n${colors.blue}X402 Payment Flow:${colors.reset}`);
  console.log(`  1. Lessee requests access: POST /api/leases/${leaseId}/access`);
  console.log(`  2. Server responds: 402 Payment Required`);
  console.log(`  3. Lessee includes X-PAYMENT header with signed payment`);
  console.log(`  4. Server verifies payment and grants access`);
  console.log(`  5. Repeat every second for streaming payments\n`);

  console.log(`${colors.yellow}Payment Details:${colors.reset}`);
  console.log(`  Hourly rate: 1000 USDC (from lease terms)`);
  console.log(`  Per-second: 0.000277 USDC (~277 micro-units)`);
  console.log(`  Mode: "second" (1Hz) or "batch-5s" (0.2Hz)`);
  console.log(`  Network: base-sepolia`);
  console.log(`  Token: USDC (6 decimals)\n`);

  console.log(`${colors.dim}To test X402 streaming:${colors.reset}`);
  console.log(`${colors.dim}  1. Start API server: npm run start:api${colors.reset}`);
  console.log(`${colors.dim}  2. Run X402 demo: npm run demo:x402${colors.reset}\n`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 12: Revenue Claims
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  header('STEP 12: Revenue Claims');
  explain('Token holders can claim their share of rental revenue');

  const claimable = await revenueService.getClaimableAmount(blockchain.getAddress());
  console.log(`${colors.yellow}Claimable revenue: ${claimable} USDC${colors.reset}`);

  if (parseFloat(claimable) > 0) {
    const revenueResult = await revenueService.claimRevenue();
    console.log(`${colors.green}✓ Revenue claimed: ${revenueResult.amount} USDC${colors.reset}\n`);
  } else {
    console.log(`${colors.yellow}No revenue to claim yet (lease just started)${colors.reset}\n`);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // DONE!
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  header('✅ Complete System Demo Finished!');

  console.log(`${colors.bright}Summary:${colors.reset}`);
  console.log(`  • Asset registered: ID ${assetResult.assetId}`);
  console.log(`  • Token deployed: ${assetResult.tokenAddress}`);
  console.log(`  • Lease offer created: ID 0`);
  console.log(`  • Bidders funded: 2 accounts with 10,000 USDC each`);
  console.log(`  • Bids placed: 2 (6000 USDC and 7000 USDC with EIP-712 signatures)`);
  console.log(`  • Winning bid accepted: Bidder 2 (7000 USDC)`);
  console.log(`  • Lease NFT minted: ID ${leaseId}`);
  console.log(`  • X402 streaming: Ready (requires API server)`);
  console.log(`  • Revenue claims: Available after payments\n`);

  console.log(`${colors.cyan}The complete protocol is operational! 🚀${colors.reset}\n`);

  console.log(`${colors.dim}Next steps:${colors.reset}`);
  console.log(`${colors.dim}  • Test X402 streaming: npm run demo:x402${colors.reset}`);
  console.log(`${colors.dim}  • Build frontend: See docs/FRONTEND_INTEGRATION_GUIDE.md${colors.reset}`);
  console.log(`${colors.dim}  • Deploy to testnet: Update RPC_URL in .env${colors.reset}\n`);

  // Cleanup
  await database.disconnect();
  await blockchain.disconnect();
}

main().catch((error) => {
  console.error('\n❌ Demo failed:', error);
  process.exit(1);
});
