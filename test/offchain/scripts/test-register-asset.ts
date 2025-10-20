#!/usr/bin/env tsx
/**
 * Test Asset Registration with Refactored Protocol
 */

import { ethers } from 'ethers';
import { readFile } from 'fs/promises';
import { BlockchainService } from '../src/integration/blockchain-refactored.js';
import { jsonToMetadataArray } from '../src/utils/metadata-converter.js';
import { SCHEMA_HASHES } from '../src/utils/schema-hash.js';
import type { AssetMetadata } from '../src/types/index.js';

async function main() {
  console.log('🧪 Testing Asset Registration\n');

  // Load asset JSON
  const assetPath = 'test/offchain/data/assets/ocs-primary.json';
  const assetJson: AssetMetadata = JSON.parse(await readFile(assetPath, 'utf8'));

  console.log(`Asset: ${assetJson.name}`);
  console.log(`Type: ${assetJson.assetType}\n`);

  // Connect to Anvil
  const service = new BlockchainService({
    rpcUrl: 'http://127.0.0.1:8545',
    privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    contracts: {
      assetRegistry: process.argv[2] || '',
      marketplace: process.argv[3] || '',
      leaseFactory: process.argv[4] || ''
    }
  });

  // Convert JSON to metadata array
  console.log('Converting metadata...');
  const metadata = jsonToMetadataArray(assetJson);
  console.log(`Metadata entries: ${metadata.length}\n`);

  // Register asset
  console.log('Registering asset...');
  const result = await service.registerAsset(
    SCHEMA_HASHES.ORBITAL_COMPUTE,
    'OCS-Primary Token',
    'OCS1',
    ethers.parseEther('1000000'),
    service.getSignerAddress(),
    service.getSignerAddress(),
    metadata
  );

  console.log('\n✅ Asset registered successfully!');
  console.log(`  Asset ID: ${result.assetId}`);
  console.log(`  Token Address: ${result.tokenAddress}`);
  console.log(`  Transaction: ${result.txHash}\n`);

  // Verify metadata storage
  console.log('Verifying metadata...');
  const stored = await service.getAssetMetadata(result.tokenAddress, ['name', 'assetType', 'description']);

  console.log(`  Name: ${stored.name}`);
  console.log(`  Type: ${stored.assetType}`);
  console.log(`  Description: ${stored.description.substring(0, 50)}...\n`);

  // Check holders
  console.log('Checking holders...');
  const holders = await service.getAssetHolders(result.tokenAddress);
  console.log(`  Total holders: ${holders.length}`);
  for (const holder of holders) {
    console.log(`  ${holder.address}: ${ethers.formatEther(holder.balance)}`);
  }

  console.log('\n✅ All checks passed!');
}

main().catch(console.error);