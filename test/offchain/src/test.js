/**
 * Unified test runner for Asset Leasing Protocol
 *
 * This single script tests the complete integration between:
 * - Anvil blockchain (local test network)
 * - Smart contract deployment
 * - Off-chain API server
 * - End-to-end asset leasing workflow
 *
 * Why this approach: One script that does everything makes it easy to
 * understand, run, and debug the entire system.
 */

import * as blockchain from './blockchain.js';
import { startServer } from './api.js';
import { existsSync, mkdirSync } from 'fs';
import fetch from 'node-fetch';

// Test configuration
const TEST_CONFIG = {
  anvilPort: 8546, // Use a different port to avoid conflicts
  anvilChainId: 31337,
  apiPort: 3001,
  testTimeout: 60000 // 60 seconds
};

// Global test state
let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  startTime: Date.now()
};

/**
 * Simple test framework
 * Why: We don't need a complex testing framework for this use case
 */
class TestRunner {
  constructor() {
    this.currentTest = '';
  }

  /**
   * Run a single test with error handling and timing
   */
  async test(name, testFn) {
    this.currentTest = name;
    testResults.total++;
    const startTime = Date.now();

    try {
      console.log(`\n🧪 Running test: ${name}`);
      await testFn();
      const duration = Date.now() - startTime;
      console.log(`✅ PASSED: ${name} (${duration}ms)`);
      testResults.passed++;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`❌ FAILED: ${name} (${duration}ms)`);
      console.log(`   Error: ${error.message}`);
      testResults.failed++;
    }
  }

  /**
   * Assert a condition is true
   */
  assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  }

  /**
   * Assert two values are equal
   */
  assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
  }

  /**
   * Assert a value is truthy
   */
  assertTruthy(value, message) {
    if (!value) {
      throw new Error(message || `Expected truthy value, got ${value}`);
    }
  }

  /**
   * Wait for a specified amount of time
   */
  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Make HTTP request to API
   */
  async apiRequest(method, path, body = null) {
    const url = `http://localhost:${TEST_CONFIG.apiPort}${path}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json();

    return {
      status: response.status,
      data,
      ok: response.ok
    };
  }
}

const test = new TestRunner();

/**
 * Setup test environment
 * Why: Create necessary directories and prepare for testing
 */
async function setupTestEnvironment() {
  console.log('🚀 Setting up test environment...');

  // Create test directories
  const dirs = ['./test-output', './deployments', './test-data'];
  for (const dir of dirs) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  }

  console.log('✅ Test environment ready');
}

/**
 * Test 1: Start Anvil blockchain
 * Why: Everything depends on having a working blockchain
 */
async function testStartAnvil() {
  await test.test('Start Anvil blockchain', async () => {
    const anvilInfo = await blockchain.startAnvil({
      port: TEST_CONFIG.anvilPort,
      chainId: TEST_CONFIG.anvilChainId
    });

    test.assertTruthy(anvilInfo.rpcUrl, 'RPC URL should be provided');
    test.assertTruthy(anvilInfo.accounts, 'Accounts should be provided');
    test.assert(anvilInfo.accounts.length >= 10, 'Should have at least 10 accounts');
    test.assertEqual(anvilInfo.chainId, TEST_CONFIG.anvilChainId, 'Chain ID should match');

    console.log(`   📡 RPC URL: ${anvilInfo.rpcUrl}`);
    console.log(`   🔗 Chain ID: ${anvilInfo.chainId}`);
    console.log(`   💰 Test accounts: ${anvilInfo.accounts.length}`);
  });
}

/**
 * Test 2: Deploy smart contracts
 * Why: Contracts must be deployed before we can test the system
 */
async function testDeployContracts() {
  await test.test('Deploy smart contracts', async () => {
    const deployment = await blockchain.deployAllContracts();

    test.assertTruthy(deployment.stablecoin, 'MockStablecoin should be deployed');
    test.assertTruthy(deployment.assetRegistry, 'AssetRegistry should be deployed');
    test.assertTruthy(deployment.leaseFactory, 'LeaseFactory should be deployed');
    test.assertTruthy(deployment.marketplace, 'Marketplace should be deployed');

    test.assertTruthy(deployment.stablecoin.address, 'MockStablecoin address should exist');
    test.assertTruthy(deployment.assetRegistry.address, 'AssetRegistry address should exist');
    test.assertTruthy(deployment.leaseFactory.address, 'LeaseFactory address should exist');
    test.assertTruthy(deployment.marketplace.address, 'Marketplace address should exist');

    console.log(`   💰 MockStablecoin: ${deployment.stablecoin.address}`);
    console.log(`   📋 AssetRegistry: ${deployment.assetRegistry.address}`);
    console.log(`   🏭 LeaseFactory: ${deployment.leaseFactory.address}`);
    console.log(`   🏪 Marketplace: ${deployment.marketplace.address}`);
  });
}

/**
 * Test 3: Start API server
 * Why: The API provides the interface between blockchain and frontend
 */
async function testStartApiServer() {
  await test.test('Start API server', async () => {
    // Start the server
    const server = await startServer();
    test.assertTruthy(server, 'Server should start successfully');

    // Wait a moment for the server to fully initialize
    await test.wait(1000);

    // Test health endpoint
    const healthResponse = await test.apiRequest('GET', '/health');
    test.assertEqual(healthResponse.status, 200, 'Health endpoint should return 200');
    test.assertTruthy(healthResponse.data.success, 'Health check should be successful');

    console.log(`   🌐 API server running on port ${TEST_CONFIG.apiPort}`);
    console.log(`   ❤️  Health check: ${healthResponse.data.message}`);
  });
}

/**
 * Test 4: API blockchain interaction
 * Why: API must be able to communicate with the blockchain
 */
async function testApiBlockchainIntegration() {
  await test.test('API blockchain integration', async () => {
    // Test network info endpoint
    const networkResponse = await test.apiRequest('GET', '/api/network');
    test.assertEqual(networkResponse.status, 200, 'Network endpoint should return 200');
    test.assertTruthy(networkResponse.data.success, 'Network request should be successful');
    test.assertEqual(networkResponse.data.data.chainId, TEST_CONFIG.anvilChainId.toString(), 'Chain ID should match');

    console.log(`   🔗 Connected to chain ID: ${networkResponse.data.data.chainId}`);
    console.log(`   🧱 Current block: ${networkResponse.data.data.blockNumber}`);

    // Test contract deployment via API
    const deployResponse = await test.apiRequest('POST', '/api/deploy');
    test.assertEqual(deployResponse.status, 200, 'Deploy endpoint should return 200');
    test.assertTruthy(deployResponse.data.success, 'Deployment should be successful');

    console.log(`   🚀 Contracts deployed via API`);

    // Test contracts info endpoint
    const contractsResponse = await test.apiRequest('GET', '/api/contracts');
    test.assertEqual(contractsResponse.status, 200, 'Contracts endpoint should return 200');
    test.assertTruthy(contractsResponse.data.data.assetRegistry, 'AssetRegistry info should be available');

    console.log(`   📋 Contract info retrieved via API`);
  });
}

/**
 * Test 5: Complete asset leasing workflow
 * Why: This tests the entire system end-to-end
 */
async function testCompleteAssetLeasingWorkflow() {
  await test.test('Complete asset leasing workflow', async () => {
    // Step 1: Register an asset type
    console.log('   📝 Step 1: Register asset type...');
    const registerTypeResponse = await test.apiRequest('POST', '/api/assets/register-type', {
      name: 'Orbital Satellite Alpha',
      assetType: 'satellite',
      schemaUrl: 'https://example.com/satellite-schema.json'
    });

    test.assertEqual(registerTypeResponse.status, 200, 'Asset type registration should succeed');
    test.assertTruthy(registerTypeResponse.data.success, 'Registration should be successful');
    test.assertTruthy(registerTypeResponse.data.data.transactionHash, 'Transaction hash should be provided');

    console.log(`   ✅ Asset type registered: ${registerTypeResponse.data.data.name}`);
    console.log('\n   📡 SATELLITE ASSET DETAILS:');
    console.log('   ┌─────────────────────────────────────────────────────');
    console.log(`   │ Name:         ${registerTypeResponse.data.data.name}`);
    console.log(`   │ Type:         satellite`);
    console.log(`   │ Schema URL:   https://example.com/satellite-schema.json`);
    console.log(`   │ Tx Hash:      ${registerTypeResponse.data.data.transactionHash}`);
    console.log('   └─────────────────────────────────────────────────────\n');

    // Step 2: Create an asset token
    console.log('   🪙 Step 2: Create asset token...');
    const createTokenResponse = await test.apiRequest('POST', '/api/assets/create-token', {
      assetId: 'satellite-001',
      name: 'Satellite Alpha Token',
      symbol: 'SAT001',
      totalSupply: '1000'
    });

    test.assertEqual(createTokenResponse.status, 200, 'Asset token creation should succeed');
    test.assertTruthy(createTokenResponse.data.success, 'Token creation should be successful');
    test.assertTruthy(createTokenResponse.data.data.transactionHash, 'Transaction hash should be provided');

    console.log(`   ✅ Asset token created: ${createTokenResponse.data.data.symbol}`);
    console.log('\n   🪙 ASSET TOKEN DETAILS:');
    console.log('   ┌─────────────────────────────────────────────────────');
    console.log(`   │ Asset ID:     satellite-001`);
    console.log(`   │ Token Name:   ${createTokenResponse.data.data.name}`);
    console.log(`   │ Symbol:       ${createTokenResponse.data.data.symbol}`);
    console.log(`   │ Total Supply: 1000 tokens`);
    console.log(`   │ Tx Hash:      ${createTokenResponse.data.data.transactionHash}`);
    console.log('   └─────────────────────────────────────────────────────\n');

    // Step 3: Create a lease offer
    console.log('   📋 Step 3: Create lease offer...');
    const createOfferResponse = await test.apiRequest('POST', '/api/leases/create-offer', {
      assetId: 'satellite-001',
      pricePerDay: '100',
      maxLeaseDuration: '365',
      terms: 'Standard satellite lease terms with orbital mechanics clause'
    });

    test.assertEqual(createOfferResponse.status, 200, 'Lease offer creation should succeed');
    test.assertTruthy(createOfferResponse.data.success, 'Offer creation should be successful');
    test.assertTruthy(createOfferResponse.data.data.transactionHash, 'Transaction hash should be provided');

    console.log(`   ✅ Lease offer created for asset: ${createOfferResponse.data.data.assetId}`);
    console.log('\n   📋 LEASE OFFER PARAMETERS:');
    console.log('   ┌─────────────────────────────────────────────────────');
    console.log(`   │ Asset ID:         ${createOfferResponse.data.data.assetId}`);
    console.log(`   │ Price Per Day:    100 (stablecoin units)`);
    console.log(`   │ Max Duration:     365 days`);
    console.log(`   │ Terms:            Standard satellite lease terms with`);
    console.log(`   │                   orbital mechanics clause`);
    console.log(`   │ Tx Hash:          ${createOfferResponse.data.data.transactionHash}`);
    console.log('   └─────────────────────────────────────────────────────\n');

    // Step 4: Verify events were emitted
    console.log('   📡 Step 4: Verify blockchain events...');

    // Wait a moment for events to be processed
    await test.wait(2000);

    const eventsResponse = await test.apiRequest('GET', '/api/events/assetRegistry');
    test.assertEqual(eventsResponse.status, 200, 'Events endpoint should return 200');
    test.assertTruthy(eventsResponse.data.success, 'Events request should be successful');
    test.assert(eventsResponse.data.data.eventsCount > 0, 'Should have some events');

    console.log(`   ✅ Found ${eventsResponse.data.data.eventsCount} blockchain events`);

    // Step 5: Check system status
    console.log('   📊 Step 5: Verify system status...');
    const statusResponse = await test.apiRequest('GET', '/api/status');
    test.assertEqual(statusResponse.status, 200, 'Status endpoint should return 200');
    test.assertTruthy(statusResponse.data.data.contracts.deployed, 'Contracts should be deployed');
    test.assertTruthy(statusResponse.data.data.blockchain.connected, 'Blockchain should be connected');

    console.log(`   ✅ System status verified - all components operational`);
  });
}

/**
 * Test 6: Error handling and edge cases
 * Why: Make sure the system handles errors gracefully
 */
async function testErrorHandling() {
  await test.test('Error handling and edge cases', async () => {
    // Test missing required fields
    const badRequest = await test.apiRequest('POST', '/api/assets/register-type', {
      name: 'Incomplete Asset'
      // Missing assetType and schemaUrl
    });

    test.assertEqual(badRequest.status, 400, 'Should return 400 for missing fields');
    test.assert(!badRequest.data.success, 'Request should not be successful');
    test.assertTruthy(badRequest.data.error, 'Error message should be provided');

    console.log(`   ✅ Bad request handled correctly: ${badRequest.data.error}`);

    // Test non-existent endpoint - parse JSON properly
    const notFoundResponse = await test.apiRequest('GET', '/api/nonexistent');
    test.assertEqual(notFoundResponse.status, 404, 'Should return 404 for non-existent endpoint');
    test.assert(!notFoundResponse.data.success, 'Request should not be successful');

    console.log(`   ✅ 404 error handled correctly`);

    // Test invalid contract name for events
    const invalidContract = await test.apiRequest('GET', '/api/events/nonexistent');
    test.assertEqual(invalidContract.status, 404, 'Should return 404 for invalid contract');

    console.log(`   ✅ Invalid contract name handled correctly`);
  });
}

/**
 * Print final test results
 */
function printTestResults() {
  const duration = Date.now() - testResults.startTime;
  const passRate = Math.round((testResults.passed / testResults.total) * 100);

  console.log('\n' + '='.repeat(60));
  console.log('🏁 TEST RESULTS');
  console.log('='.repeat(60));
  console.log(`Total Tests:  ${testResults.total}`);
  console.log(`Passed:       ${testResults.passed} ✅`);
  console.log(`Failed:       ${testResults.failed} ${testResults.failed > 0 ? '❌' : '✅'}`);
  console.log(`Pass Rate:    ${passRate}%`);
  console.log(`Duration:     ${duration}ms`);
  console.log('='.repeat(60));

  if (testResults.failed === 0) {
    console.log('🎉 ALL TESTS PASSED! The Asset Leasing Protocol is working correctly.');
    console.log('\nThe system successfully tested:');
    console.log('  ✅ Anvil blockchain startup');
    console.log('  ✅ Smart contract deployment');
    console.log('  ✅ API server functionality');
    console.log('  ✅ Blockchain-API integration');
    console.log('  ✅ Complete asset leasing workflow');
    console.log('  ✅ Error handling');
  } else {
    console.log('❌ SOME TESTS FAILED. Please check the error messages above.');
  }
}

/**
 * Cleanup function
 * Why: Stop all services and clean up resources
 */
async function cleanup() {
  console.log('\n🧹 Cleaning up...');

  try {
    await blockchain.stopAnvil();
    console.log('✅ Anvil stopped');
  } catch (error) {
    console.log(`⚠️  Error stopping Anvil: ${error.message}`);
  }

  // Note: API server will be stopped when the process exits
  console.log('✅ Cleanup completed');
}

/**
 * Main test runner function
 * Why: Orchestrate all tests in the correct order
 */
async function runAllTests() {
  console.log('🚀 Asset Leasing Protocol Integration Test Suite');
  console.log('This test validates the complete on-chain to off-chain workflow\n');

  try {
    // Setup
    await setupTestEnvironment();

    // Run all tests in sequence
    await testStartAnvil();
    await testDeployContracts();
    await testStartApiServer();
    await testApiBlockchainIntegration();
    await testCompleteAssetLeasingWorkflow();
    await testErrorHandling();

    // Print results
    printTestResults();

  } catch (error) {
    console.error('💥 Unexpected error during testing:', error);
    testResults.failed++;
  } finally {
    // Always clean up
    await cleanup();

    // Exit with appropriate code
    process.exit(testResults.failed > 0 ? 1 : 0);
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n⚠️  Test interrupted by user');
  await cleanup();
  process.exit(1);
});

process.on('SIGTERM', async () => {
  console.log('\n⚠️  Test terminated');
  await cleanup();
  process.exit(1);
});

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}

export { runAllTests, TestRunner };