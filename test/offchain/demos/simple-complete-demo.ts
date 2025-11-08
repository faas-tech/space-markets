#!/usr/bin/env tsx
/**
 * Simple Complete Demo - Asset Leasing Protocol
 *
 * This demonstrates the ENTIRE protocol in one simple script:
 * 1. Start Anvil blockchain
 * 2. Deploy all contracts
 * 3. Register an asset
 * 4. Create a lease
 * 5. Revenue distribution
 *
 * Run: npx tsx demos/simple-complete-demo.ts
 *
 * Philosophy: Show everything working in under 100 lines of code!
 */

import { ethers } from 'ethers';
import { BlockchainClient } from '../src/core/blockchain-client.js';
import { ContractManager } from '../src/core/contract-manager.js';
import { AssetService } from '../src/services/asset-service.js';
import { LeaseService } from '../src/services/lease-service.js';
import { RevenueService } from '../src/services/revenue-service.js';
import { MockDatabase } from '../src/storage/database.js';
import { Cache } from '../src/storage/cache.js';
import { getConfig } from '../src/config/index.js';

// Simple CLI colors
const colors = {
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m',
  bright: '\x1b[1m'
};

function header(text: string) {
  console.log(`\n${colors.bright}${colors.cyan}${'═'.repeat(60)}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}  ${text}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}${'═'.repeat(60)}${colors.reset}\n`);
}

async function main() {
  header('Asset Leasing Protocol - Simple Demo');

  // Load configuration
  const config = getConfig();

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 1: Connect to Blockchain
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  header('STEP 1: Connect to Blockchain');

  console.log(`${colors.yellow}Make sure Anvil is running: anvil${colors.reset}\n`);

  const blockchain = new BlockchainClient({
    rpcUrl: config.rpcUrl,
    privateKey: config.privateKey
  });

  await blockchain.connect();

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 2: Deploy Contracts
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  header('STEP 2: Deploy Contracts');

  const contractManager = new ContractManager(blockchain);
  const deployment = await contractManager.deployAll();

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 3: Initialize Services
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  header('STEP 3: Initialize Services');

  const database = new MockDatabase();
  await database.connect();

  const cache = new Cache();

  const assetService = new AssetService(blockchain, database, cache);
  const leaseService = new LeaseService(blockchain, database, cache);
  const revenueService = new RevenueService(blockchain, database, cache);

  console.log(`${colors.green}✓ All services initialized${colors.reset}\n`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 4: Create Asset Type
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  header('STEP 4: Create Asset Type');

  await assetService.createAssetType('Orbital Compute Station', 'orbital_compute');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 5: Register Asset
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  header('STEP 5: Register Asset');

  const metadata = {
    assetId: 'OCS-001',
    name: 'Orbital Compute Station Alpha',
    description: 'High-performance space-based computing platform',
    assetType: 'orbital_compute' as const,
    specifications: {
      type: 'orbital_compute' as const,
      orbital: {
        type: 'leo' as const,
        altitude_km: 450,
        inclination_deg: 51.6,
        period_hours: 1.53
      },
      compute: {
        cpu_cores: 64,
        ram_gb: 512,
        storage_tb: 100,
        gpu_units: 8,
        specialized_processors: ['AI accelerator']
      },
      networking: {
        bandwidth_gbps: 10,
        latency_ms: 35,
        connectivity: ['optical links']
      },
      physical: {
        power_consumption_kw: 8.5,
        thermal_design_power_kw: 12.0,
        mass_kg: 4200,
        design_life_years: 7
      }
    },
    documents: [],
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: '1.0.0'
    }
  };

  const assetResult = await assetService.registerAsset(
    metadata,
    'orbital_compute',
    'OCS Alpha Token',
    'OCS-A',
    ethers.parseEther('1000000')
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

  const leaseTerms = {
    duration: 365,
    price: '1000',
    conditions: 'Standard lease terms'
  };

  const leaseResult = await leaseService.createLeaseOffer(
    assetResult.assetId.toString(),
    blockchain.getAddress(),
    leaseTerms
  );

  console.log(`${colors.green}✓ Lease Offer ID: ${leaseResult.leaseId}${colors.reset}\n`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 8: Revenue Distribution
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  header('STEP 8: Revenue Distribution');

  const revenueAmount = ethers.parseEther('50000'); // 50,000 USDC

  const revenueResult = await revenueService.openRevenueRound(
    assetResult.tokenAddress,
    revenueAmount
  );

  console.log(`${colors.green}✓ Revenue Round ID: ${revenueResult.roundId}${colors.reset}`);
  console.log(`${colors.green}✓ Amount distributed: ${ethers.formatEther(revenueAmount)} USDC${colors.reset}\n`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // DONE!
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  header('✅ Demo Complete!');

  console.log(`${colors.bright}Summary:${colors.reset}`);
  console.log(`  • Asset registered with ID: ${assetResult.assetId}`);
  console.log(`  • Token deployed at: ${assetResult.tokenAddress}`);
  console.log(`  • Lease offer created: ${leaseResult.leaseId}`);
  console.log(`  • Revenue round opened: ${revenueResult.roundId}`);
  console.log();
  console.log(`${colors.cyan}The protocol is working! 🚀${colors.reset}\n`);

  // Cleanup
  await database.disconnect();
  await blockchain.disconnect();
}

// Run the demo
main().catch((error) => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});
