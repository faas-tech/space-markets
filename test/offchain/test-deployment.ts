#!/usr/bin/env tsx
/**
 * Simple deployment test to verify contract-manager works
 */

import { BlockchainClient } from './src/core/blockchain-client.js';
import { ContractManager } from './src/core/contract-manager.js';
import { getConfig } from './src/config/index.js';

async function main() {
  console.log('\n🧪 Testing Contract Deployment\n');

  const config = getConfig();

  // Connect to blockchain
  console.log('1. Connecting to blockchain...');
  const blockchain = new BlockchainClient({
    rpcUrl: config.rpcUrl,
    privateKey: config.privateKey
  });

  await blockchain.connect();
  console.log('   ✓ Connected\n');

  // Deploy contracts
  console.log('2. Deploying contracts...');
  const manager = new ContractManager(blockchain);

  try {
    const deployment = await manager.deployAll();

    console.log('\n✅ Deployment successful!\n');
    console.log('Contract Addresses:');
    console.log('  MockStablecoin:', deployment.addresses.mockStablecoin);
    console.log('  AssetRegistry:', deployment.addresses.assetRegistry);
    console.log('  LeaseFactory:', deployment.addresses.leaseFactory);
    console.log('  Marketplace:', deployment.addresses.marketplace);
    console.log('\nImplementation Addresses:');
    console.log('  AssetERC20:', deployment.addresses.assetERC20Implementation);
    console.log('  AssetRegistry impl:', deployment.addresses.assetRegistryImplementation);
    console.log('  LeaseFactory impl:', deployment.addresses.leaseFactoryImplementation);
    console.log('  Marketplace impl:', deployment.addresses.marketplaceImplementation);
    console.log('\nGas Used:', deployment.gasUsed);
    console.log('Deployment Time:', (deployment.deploymentTime / 1000).toFixed(2) + 's');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Deployment failed:', error);
    process.exit(1);
  }
}

main();
