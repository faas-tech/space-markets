#!/usr/bin/env tsx

/**
 * Deployment Sync Script
 *
 * Synchronizes off-chain data with deployed smart contracts.
 * Can create asset types, register assets, and create marketplace listings
 * using the existing off-chain JSON data.
 */

import { readdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { validateJsonFile } from '../src/utils/validation.js';
import { schemas } from '../src/schemas/index.js';
import { BlockchainIntegration, testBlockchainConnection } from '../src/integration/blockchain.js';
import type { TestConfiguration, AssetMetadata, LeaseAgreement } from '../src/types/index.js';

/**
 * Configuration for deployment sync
 */
interface SyncConfig {
  dataDir: string;
  configFile: string;
  dryRun: boolean;
  skipAssetTypes: boolean;
  skipAssets: boolean;
  skipLeases: boolean;
  verbose: boolean;
  maxGasPrice?: string;
}

const defaultConfig: SyncConfig = {
  dataDir: './data',
  configFile: './config.json',
  dryRun: false,
  skipAssetTypes: false,
  skipAssets: false,
  skipLeases: false,
  verbose: false
};

/**
 * Load configuration from file
 */
async function loadConfiguration(configFile: string): Promise<TestConfiguration> {
  const result = await validateJsonFile(configFile, schemas.TestConfiguration);

  if (!result.success || !result.data) {
    throw new Error(`Invalid configuration file: ${configFile}\n${result.errors?.join('\n')}`);
  }

  return result.data;
}

/**
 * Load and validate assets from data directory
 */
async function loadAssets(dataDir: string): Promise<AssetMetadata[]> {
  const assetsDir = path.join(dataDir, 'assets');
  if (!existsSync(assetsDir)) {
    console.log('📁 No assets directory found');
    return [];
  }

  const files = await readdir(assetsDir);
  const assets: AssetMetadata[] = [];

  for (const file of files.filter(f => f.endsWith('.json'))) {
    const filePath = path.join(assetsDir, file);
    const result = await validateJsonFile(filePath, schemas.AssetMetadata);

    if (result.success && result.data) {
      assets.push(result.data);
    } else {
      console.warn(`⚠️  Skipping invalid asset file: ${file}`);
      if (result.errors) {
        console.warn(`   Errors: ${result.errors.join(', ')}`);
      }
    }
  }

  return assets;
}

/**
 * Load and validate leases from data directory
 */
async function loadLeases(dataDir: string): Promise<LeaseAgreement[]> {
  const leasesDir = path.join(dataDir, 'leases');
  if (!existsSync(leasesDir)) {
    console.log('📄 No leases directory found');
    return [];
  }

  const files = await readdir(leasesDir);
  const leases: LeaseAgreement[] = [];

  for (const file of files.filter(f => f.endsWith('.json'))) {
    const filePath = path.join(leasesDir, file);
    const result = await validateJsonFile(filePath, schemas.LeaseAgreement);

    if (result.success && result.data) {
      leases.push(result.data);
    } else {
      console.warn(`⚠️  Skipping invalid lease file: ${file}`);
      if (result.errors) {
        console.warn(`   Errors: ${result.errors.join(', ')}`);
      }
    }
  }

  return leases;
}

/**
 * Create asset types on blockchain
 */
async function syncAssetTypes(
  blockchain: BlockchainIntegration,
  config: SyncConfig
): Promise<{ [key: string]: { typeId: number; txHash: string } }> {
  console.log('\n🏗️  Creating Asset Types...');

  if (config.dryRun) {
    console.log('   [DRY RUN] Would create asset types: satellite, orbital_compute, orbital_relay');
    return {
      satellite: { typeId: 1, txHash: '0x0000000000000000000000000000000000000000000000000000000000000000' },
      orbital_compute: { typeId: 2, txHash: '0x0000000000000000000000000000000000000000000000000000000000000000' },
      orbital_relay: { typeId: 3, txHash: '0x0000000000000000000000000000000000000000000000000000000000000000' }
    };
  }

  try {
    const typeResults = await blockchain.createAssetTypes();

    console.log(`✅ Satellite Type:           ID ${typeResults.satellite.typeId} (${typeResults.satellite.txHash})`);
    console.log(`✅ Orbital Compute Type:     ID ${typeResults.orbital_compute.typeId} (${typeResults.orbital_compute.txHash})`);
    console.log(`✅ Orbital Relay Type:       ID ${typeResults.orbital_relay.typeId} (${typeResults.orbital_relay.txHash})`);

    return typeResults;
  } catch (error) {
    console.error('❌ Error creating asset types:', error);
    throw error;
  }
}

/**
 * Register assets on blockchain
 */
async function syncAssets(
  blockchain: BlockchainIntegration,
  assets: AssetMetadata[],
  typeMapping: { [key: string]: { typeId: number; txHash: string } },
  config: SyncConfig
): Promise<Array<{ assetId: string; onChainId?: number; tokenAddress?: string; txHash?: string; error?: string }>> {
  console.log('\n🛰️  Registering Assets...');

  const results: Array<{ assetId: string; onChainId?: number; tokenAddress?: string; txHash?: string; error?: string }> = [];

  for (const asset of assets) {
    console.log(`\n   Processing: ${asset.name} (${asset.assetId})`);

    if (config.dryRun) {
      console.log(`   [DRY RUN] Would register ${asset.assetType} asset`);
      results.push({
        assetId: asset.assetId,
        onChainId: Math.floor(Math.random() * 1000),
        tokenAddress: '0x0000000000000000000000000000000000000000',
        txHash: '0x0000000000000000000000000000000000000000000000000000000000000000'
      });
      continue;
    }

    try {
      // Get the correct type ID
      let typeId: number;
      switch (asset.assetType) {
        case 'satellite':
          typeId = typeMapping.satellite.typeId;
          break;
        case 'orbital_compute':
          typeId = typeMapping.orbital_compute.typeId;
          break;
        case 'orbital_relay':
          typeId = typeMapping.orbital_relay.typeId;
          break;
        default:
          throw new Error(`Unknown asset type: ${asset.assetType}`);
      }

      // Generate token details
      const tokenName = asset.name;
      const tokenSymbol = asset.assetId.replace(/-/g, '');
      const totalSupply = '10000000000000000000000'; // 10,000 tokens

      if (config.verbose) {
        console.log(`   Type ID: ${typeId}`);
        console.log(`   Token: ${tokenName} (${tokenSymbol})`);
        console.log(`   Supply: ${totalSupply}`);
      }

      // Register asset
      const result = await blockchain.registerAsset(
        asset,
        typeId,
        tokenName,
        tokenSymbol,
        totalSupply
      );

      if (result.success) {
        console.log(`   ✅ Registered: Asset ID ${result.assetId}, Token ${result.tokenAddress}`);
        results.push({
          assetId: asset.assetId,
          onChainId: result.assetId,
          tokenAddress: result.tokenAddress,
          txHash: result.txHash
        });

        // Verify metadata hash
        if (result.assetId) {
          const verification = await blockchain.verifyAssetMetadata(result.assetId, asset);
          if (verification.success && verification.matches) {
            console.log(`   ✅ Metadata hash verified`);
          } else {
            console.warn(`   ⚠️  Metadata hash mismatch!`);
            if (config.verbose) {
              console.warn(`      On-chain:  ${verification.onChainHash}`);
              console.warn(`      Off-chain: ${verification.offChainHash}`);
            }
          }
        }
      } else {
        console.error(`   ❌ Failed to register: ${result.error}`);
        results.push({
          assetId: asset.assetId,
          error: result.error
        });
      }

      // Add delay to avoid overwhelming the network
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`   ❌ Error: ${errorMessage}`);
      results.push({
        assetId: asset.assetId,
        error: errorMessage
      });
    }
  }

  return results;
}

/**
 * Create lease offers on marketplace
 */
async function syncLeases(
  blockchain: BlockchainIntegration,
  leases: LeaseAgreement[],
  assetResults: Array<{ assetId: string; onChainId?: number; tokenAddress?: string; txHash?: string; error?: string }>,
  config: SyncConfig
): Promise<Array<{ leaseId: string; offerId?: number; txHash?: string; error?: string }>> {
  console.log('\n📄 Creating Lease Offers...');

  const results: Array<{ leaseId: string; offerId?: number; txHash?: string; error?: string }> = [];

  // Create mapping of asset IDs to on-chain IDs
  const assetMapping = new Map<string, number>();
  for (const result of assetResults) {
    if (result.onChainId) {
      assetMapping.set(result.assetId, result.onChainId);
    }
  }

  for (const lease of leases) {
    console.log(`\n   Processing: ${lease.leaseId}`);

    if (config.dryRun) {
      console.log(`   [DRY RUN] Would create lease offer for asset ${lease.assetId}`);
      results.push({
        leaseId: lease.leaseId,
        offerId: Math.floor(Math.random() * 1000),
        txHash: '0x0000000000000000000000000000000000000000000000000000000000000000'
      });
      continue;
    }

    try {
      // Get on-chain asset ID
      const onChainAssetId = assetMapping.get(lease.assetId);
      if (!onChainAssetId) {
        throw new Error(`Asset ${lease.assetId} not found on-chain`);
      }

      if (config.verbose) {
        console.log(`   Asset: ${lease.assetId} (on-chain ID: ${onChainAssetId})`);
        console.log(`   Payment: ${lease.terms.paymentAmount} wei`);
        console.log(`   Duration: ${lease.terms.startDate} to ${lease.terms.endDate}`);
      }

      // Create lease offer
      const result = await blockchain.createLeaseOffer(lease, onChainAssetId);

      if (result.success) {
        console.log(`   ✅ Created offer: ID ${result.offerId}`);
        results.push({
          leaseId: lease.leaseId,
          offerId: result.offerId,
          txHash: result.txHash
        });
      } else {
        console.error(`   ❌ Failed to create offer: ${result.error}`);
        results.push({
          leaseId: lease.leaseId,
          error: result.error
        });
      }

      // Add delay to avoid overwhelming the network
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`   ❌ Error: ${errorMessage}`);
      results.push({
        leaseId: lease.leaseId,
        error: errorMessage
      });
    }
  }

  return results;
}

/**
 * Generate deployment summary
 */
function generateSummary(
  typeResults: { [key: string]: { typeId: number; txHash: string } },
  assetResults: Array<{ assetId: string; onChainId?: number; tokenAddress?: string; txHash?: string; error?: string }>,
  leaseResults: Array<{ leaseId: string; offerId?: number; txHash?: string; error?: string }>
): void {
  console.log('\n📊 Deployment Summary');
  console.log('═'.repeat(60));

  // Asset types
  console.log('\n🏗️  Asset Types:');
  Object.entries(typeResults).forEach(([type, result]) => {
    console.log(`   ${type}: Type ID ${result.typeId}`);
  });

  // Assets
  const successfulAssets = assetResults.filter(r => r.onChainId).length;
  const failedAssets = assetResults.filter(r => r.error).length;

  console.log('\n🛰️  Assets:');
  console.log(`   Successful: ${successfulAssets}`);
  console.log(`   Failed:     ${failedAssets}`);
  console.log(`   Total:      ${assetResults.length}`);

  if (failedAssets > 0) {
    console.log('\n   Failed Assets:');
    assetResults.filter(r => r.error).forEach(r => {
      console.log(`     - ${r.assetId}: ${r.error}`);
    });
  }

  // Leases
  const successfulLeases = leaseResults.filter(r => r.offerId).length;
  const failedLeases = leaseResults.filter(r => r.error).length;

  console.log('\n📄 Lease Offers:');
  console.log(`   Successful: ${successfulLeases}`);
  console.log(`   Failed:     ${failedLeases}`);
  console.log(`   Total:      ${leaseResults.length}`);

  if (failedLeases > 0) {
    console.log('\n   Failed Leases:');
    leaseResults.filter(r => r.error).forEach(r => {
      console.log(`     - ${r.leaseId}: ${r.error}`);
    });
  }

  console.log('\n' + '═'.repeat(60));
}

/**
 * Main sync function
 */
async function syncDeployment(config: SyncConfig): Promise<void> {
  console.log('🚀 Asset Leasing Protocol Deployment Sync');
  console.log('═'.repeat(60));
  console.log(`Data Directory: ${config.dataDir}`);
  console.log(`Config File:    ${config.configFile}`);
  console.log(`Dry Run:        ${config.dryRun}`);

  try {
    // Load configuration
    console.log('\n📋 Loading Configuration...');
    const testConfig = await loadConfiguration(config.configFile);
    console.log(`   Network:     ${testConfig.network}`);
    console.log(`   RPC URL:     ${testConfig.rpcUrl}`);
    console.log(`   Contracts:   AssetRegistry=${testConfig.contracts.assetRegistry}`);

    // Test blockchain connection
    if (!config.dryRun) {
      console.log('\n🔗 Testing Blockchain Connection...');
      const connectionTest = await testBlockchainConnection(testConfig);

      if (!connectionTest.success) {
        throw new Error(`Blockchain connection failed: ${connectionTest.error}`);
      }

      console.log(`   ✅ Connected to chain ID ${connectionTest.networkInfo?.chainId}`);
      console.log(`   Block number: ${connectionTest.networkInfo?.blockNumber}`);
      console.log(`   Gas price: ${connectionTest.networkInfo?.gasPrice} wei`);
      console.log(`   Account balance: ${connectionTest.networkInfo?.balance} ETH`);
    }

    // Create blockchain integration
    const blockchain = new BlockchainIntegration(testConfig);

    // Load data
    console.log('\n📁 Loading Off-Chain Data...');
    const [assets, leases] = await Promise.all([
      loadAssets(config.dataDir),
      loadLeases(config.dataDir)
    ]);

    console.log(`   Loaded ${assets.length} assets`);
    console.log(`   Loaded ${leases.length} leases`);

    // Sync asset types
    let typeResults: { [key: string]: { typeId: number; txHash: string } } = {};
    if (!config.skipAssetTypes) {
      typeResults = await syncAssetTypes(blockchain, config);
    } else {
      console.log('\n⏭️  Skipping asset type creation');
      // Use default type IDs
      typeResults = {
        satellite: { typeId: 1, txHash: '0x0' },
        orbital_compute: { typeId: 2, txHash: '0x0' },
        orbital_relay: { typeId: 3, txHash: '0x0' }
      };
    }

    // Sync assets
    let assetResults: Array<{ assetId: string; onChainId?: number; tokenAddress?: string; txHash?: string; error?: string }> = [];
    if (!config.skipAssets && assets.length > 0) {
      assetResults = await syncAssets(blockchain, assets, typeResults, config);
    } else if (config.skipAssets) {
      console.log('\n⏭️  Skipping asset registration');
    }

    // Sync leases
    let leaseResults: Array<{ leaseId: string; offerId?: number; txHash?: string; error?: string }> = [];
    if (!config.skipLeases && leases.length > 0 && assetResults.length > 0) {
      leaseResults = await syncLeases(blockchain, leases, assetResults, config);
    } else if (config.skipLeases) {
      console.log('\n⏭️  Skipping lease offers');
    }

    // Generate summary
    generateSummary(typeResults, assetResults, leaseResults);

    if (config.dryRun) {
      console.log('\n✨ Dry run completed successfully!');
    } else {
      console.log('\n✨ Deployment sync completed!');
    }

  } catch (error) {
    console.error('\n❌ Deployment sync failed:', error);
    process.exit(1);
  }
}

/**
 * CLI interface
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const config = { ...defaultConfig };

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;

    switch (arg) {
      case '--data-dir':
        config.dataDir = args[++i]!;
        break;
      case '--config':
        config.configFile = args[++i]!;
        break;
      case '--dry-run':
        config.dryRun = true;
        break;
      case '--skip-asset-types':
        config.skipAssetTypes = true;
        break;
      case '--skip-assets':
        config.skipAssets = true;
        break;
      case '--skip-leases':
        config.skipLeases = true;
        break;
      case '--verbose':
      case '-v':
        config.verbose = true;
        break;
      case '--max-gas-price':
        config.maxGasPrice = args[++i];
        break;
      case '--help':
      case '-h':
        console.log(`
🚀 Asset Leasing Protocol Deployment Sync

Usage: tsx scripts/sync-deployment.ts [options]

Options:
  --data-dir <dir>         Data directory with assets/leases (default: ./data)
  --config <file>          Configuration file path (default: ./config.json)
  --dry-run                Show what would be done without executing
  --skip-asset-types       Skip asset type creation
  --skip-assets            Skip asset registration
  --skip-leases            Skip lease offer creation
  --verbose, -v            Show detailed output
  --max-gas-price <price>  Maximum gas price in wei
  --help, -h               Show this help message

Examples:
  tsx scripts/sync-deployment.ts --dry-run
  tsx scripts/sync-deployment.ts --config ./anvil-config.json
  tsx scripts/sync-deployment.ts --skip-asset-types --verbose
`);
        process.exit(0);
      default:
        if (arg.startsWith('--')) {
          console.error(`Unknown option: ${arg}`);
          process.exit(1);
        }
    }
  }

  await syncDeployment(config);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}