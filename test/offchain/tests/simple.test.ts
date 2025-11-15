/**
 * Simple Integration Test - Validates core functionality
 */

import { describe, it, expect } from 'vitest';
import { AnvilManager, AnvilInstance } from '../src/core/anvil-manager';
import { ContractDeployer, DeploymentResult } from '../src/testing/contract-deployer';
import { ethers } from 'ethers';

describe('Simple Integration Test', () => {
  it('should deploy contracts and verify basic functionality', async () => {
    console.log('\n🚀 Starting Simple Integration Test\n');

    // Start Anvil
    const anvilManager = new AnvilManager();
    console.log('Starting Anvil on port 8548...');

    const anvilInstance = await anvilManager.startAnvil('simple-test', {
      port: 8548,
      chainId: 31337,
      accounts: 5,
      blockTime: 1,
    });

    console.log(`✓ Anvil started at ${anvilInstance.rpcUrl}`);
    console.log(`✓ Test account: ${anvilInstance.accounts[0].address}`);

    try {
      // Create deployer
      const deployer = new ContractDeployer(
        anvilInstance.rpcUrl,
        anvilInstance.accounts[0].privateKey
      );

      console.log('\nDeploying contracts...');
      const deployment = await deployer.deployContracts();

      console.log('✓ Contracts deployed:');
      console.log(`  AssetRegistry: ${deployment.assetRegistry.address}`);
      console.log(`  Marketplace: ${deployment.marketplace.address}`);
      console.log(`  LeaseFactory: ${deployment.leaseFactory.address}`);

      // Verify deployment
      const provider = new ethers.JsonRpcProvider(anvilInstance.rpcUrl);

      // Check AssetRegistry
      const registryCode = await provider.getCode(deployment.assetRegistry.address);
      expect(registryCode).not.toBe('0x');
      expect(registryCode.length).toBeGreaterThan(2);
      console.log('✓ AssetRegistry contract verified');

      // Check Marketplace
      const marketplaceCode = await provider.getCode(deployment.marketplace.address);
      expect(marketplaceCode).not.toBe('0x');
      expect(marketplaceCode.length).toBeGreaterThan(2);
      console.log('✓ Marketplace contract verified');

      // Test basic interaction - create asset type
      console.log('\nTesting AssetRegistry interaction...');
      const registry = deployment.assetRegistry.contract;

      const tx = await registry.createAssetType(
        'Satellite',
        ethers.keccak256(ethers.toUtf8Bytes('test-schema')),
        'ipfs://test-schema'
      );

      const receipt = await tx.wait();
      expect(receipt.status).toBe(1);
      console.log(`✓ Asset type created (tx: ${receipt.hash.slice(0, 10)}...)`);

      // Verify the asset type was created
      const typeCount = await registry.nextAssetTypeId();
      expect(typeCount).toBe(2n); // Should be 2 (IDs start at 1, so after one creation it's 2)
      console.log(`✓ Asset type count verified: ${typeCount.toString()}`);

      console.log('\n✅ All tests passed!\n');

    } finally {
      // Cleanup
      console.log('Stopping Anvil...');
      await anvilManager.stopAll();
      console.log('✓ Cleanup complete\n');
    }
  }, 60000); // 60 second timeout
});