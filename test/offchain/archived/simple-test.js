/**
 * Simple test to verify the refactored system works
 * Let's test each component individually first
 */

import * as blockchain from './blockchain.js';

console.log('🧪 Testing Anvil startup...');

try {
  const anvilInfo = await blockchain.startAnvil({ port: 8547, chainId: 31337 });
  console.log('✅ Anvil started:', anvilInfo.rpcUrl);

  console.log('🧪 Testing contract deployment...');
  const deployment = await blockchain.deployAllContracts();
  console.log('✅ Contracts deployed successfully');
  console.log('  - MockStablecoin:', deployment.stablecoin.address);
  console.log('  - AssetRegistry:', deployment.assetRegistry.address);
  console.log('  - LeaseFactory:', deployment.leaseFactory.address);
  console.log('  - Marketplace:', deployment.marketplace.address);

  console.log('🧪 Testing blockchain info...');
  const info = await blockchain.getBlockchainInfo();
  console.log('✅ Blockchain info:', {
    chainId: info.chainId.toString(),
    blockNumber: info.blockNumber
  });

  console.log('🎉 All basic tests passed!');

} catch (error) {
  console.error('❌ Test failed:', error.message);
} finally {
  // Clean up
  await blockchain.stopAnvil();
  console.log('✅ Cleanup completed');
}