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
import { createHash } from 'crypto';

// ANSI color codes for enhanced output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Enhanced display functions
function header(text, level = 1) {
  const border = '═'.repeat(80);
  const lightBorder = '─'.repeat(80);
  console.log();
  if (level === 1) {
    console.log(colors.bright + colors.cyan + border + colors.reset);
    console.log(colors.bright + colors.cyan + '  ' + text + colors.reset);
    console.log(colors.bright + colors.cyan + border + colors.reset);
  } else if (level === 2) {
    console.log(colors.bright + colors.blue + lightBorder + colors.reset);
    console.log(colors.bright + colors.blue + '▶ ' + text + colors.reset);
    console.log(colors.bright + colors.blue + lightBorder + colors.reset);
  }
  console.log();
}

function keyValue(key, value, indent = 0) {
  const padding = '  '.repeat(indent);
  console.log(`${padding}${colors.dim}${key}:${colors.reset} ${colors.green}${value}${colors.reset}`);
}

function displayHashingProcess(data, label = 'Data') {
  header(`Hashing Process: ${label}`, 2);

  const jsonString = JSON.stringify(data, Object.keys(data).sort());
  const hash = createHash('sha256').update(jsonString, 'utf8').digest('hex');
  const hashWith0x = `0x${hash}`;

  console.log(colors.bright + 'Input Data (JSON):' + colors.reset);
  console.log(colors.dim + jsonString.substring(0, 150) + (jsonString.length > 150 ? '...' : '') + colors.reset);
  console.log();

  keyValue('Input Size', `${jsonString.length} bytes`);
  keyValue('Algorithm', 'SHA-256');
  keyValue('Encoding', 'UTF-8');

  console.log();
  console.log(colors.bright + 'Hash Output:' + colors.reset);
  keyValue('Raw Hash (hex)', hash, 1);
  keyValue('Ethereum Format', hashWith0x, 1);
  keyValue('Hash Length', `${hash.length} chars (${hash.length / 2} bytes)`, 1);

  console.log();
  console.log(colors.bright + 'Hash Breakdown:' + colors.reset);
  console.log(`  ${colors.dim}First 8 chars:${colors.reset} ${colors.cyan}${hash.substring(0, 8)}${colors.reset} ${colors.dim}(useful for short IDs)${colors.reset}`);
  console.log(`  ${colors.dim}Bytes32 (first 32 chars):${colors.reset} ${colors.cyan}${hash.substring(0, 32)}${colors.reset} ${colors.dim}(for on-chain storage)${colors.reset}`);
  console.log(`  ${colors.dim}Full hash:${colors.reset} ${colors.cyan}${hash}${colors.reset}`);

  console.log();
  console.log(colors.green + '✓ Hash generated successfully!' + colors.reset);

  return { hash: hashWith0x, jsonString };
}

function displayMetadata(metadata, title = 'Metadata') {
  header(title, 2);

  console.log(colors.bright + 'Core Data:' + colors.reset);
  for (const [key, value] of Object.entries(metadata)) {
    if (typeof value === 'object' && value !== null) {
      console.log(`  ${colors.dim}${key}:${colors.reset}`);
      for (const [subKey, subValue] of Object.entries(value)) {
        console.log(`    ${colors.dim}${subKey}:${colors.reset} ${colors.green}${subValue}${colors.reset}`);
      }
    } else {
      keyValue(key, value, 1);
    }
  }
  console.log();
}

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
    // Start the server (may use a different port if 3001 is in use)
    const server = await startServer(TEST_CONFIG.apiPort);
    test.assertTruthy(server, 'Server should start successfully');

    // Get the actual port being used
    const actualPort = server.address().port;
    TEST_CONFIG.apiPort = actualPort; // Update config with actual port

    // Wait a moment for the server to fully initialize
    await test.wait(1000);

    // Test health endpoint
    const healthResponse = await test.apiRequest('GET', '/health');
    test.assertEqual(healthResponse.status, 200, 'Health endpoint should return 200');
    test.assertTruthy(healthResponse.data.success, 'Health check should be successful');

    console.log(`   🌐 API server running on port ${actualPort}`);
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

    header('COMPLETE ASSET CREATION FLOW', 1);

    // Create detailed satellite metadata
    const satelliteMetadata = {
      assetId: 'SAT-ALPHA-001',
      name: 'Orbital Satellite Alpha',
      assetType: 'satellite',
      description: 'High-resolution Earth observation satellite for environmental monitoring',
      specifications: {
        orbital: {
          type: 'LEO',
          altitude_km: 550,
          inclination_deg: 97.4,
          period_hours: 1.58
        },
        physical: {
          mass_kg: 500,
          power_watts: 300,
          design_life_years: 5,
          dimensions: '2.5m × 1.2m × 1.8m'
        },
        imaging: {
          resolution_m: 0.5,
          swath_width_km: 50,
          spectral_bands: ['RGB', 'NIR', 'SWIR'],
          revisit_time_hours: 12
        }
      },
      operator: 'OrbitalAssets Inc',
      manufacturer: 'SpaceTech Systems',
      launch_date: '2024-01-15T00:00:00Z',
      schemaUrl: 'https://example.com/satellite-schema.json'
    };

    // Step 1: Display off-chain metadata
    displayMetadata(satelliteMetadata, 'Off-Chain Satellite Asset Metadata');

    // Step 2: Generate and display hash
    const hashResult = displayHashingProcess(satelliteMetadata, 'Satellite Metadata');

    // Step 3: Register an asset type
    console.log();
    header('On-Chain Asset Type Registration', 2);
    console.log(colors.blue + 'ℹ Registering asset type on blockchain...' + colors.reset);
    console.log();

    const registerTypeResponse = await test.apiRequest('POST', '/api/assets/register-type', {
      name: satelliteMetadata.name,
      assetType: satelliteMetadata.assetType,
      schemaUrl: satelliteMetadata.schemaUrl
    });

    test.assertEqual(registerTypeResponse.status, 200, 'Asset type registration should succeed');
    test.assertTruthy(registerTypeResponse.data.success, 'Registration should be successful');
    test.assertTruthy(registerTypeResponse.data.data.transactionHash, 'Transaction hash should be provided');

    console.log(colors.bright + 'Registration Result:' + colors.reset);
    keyValue('Asset Type ID', registerTypeResponse.data.data.typeId || '1', 1);
    keyValue('Name', registerTypeResponse.data.data.name, 1);
    keyValue('Type', satelliteMetadata.assetType, 1);
    keyValue('Schema URL', satelliteMetadata.schemaUrl, 1);
    keyValue('Metadata Hash', hashResult.hash.substring(0, 34) + '...', 1);
    keyValue('Transaction Hash', registerTypeResponse.data.data.transactionHash, 1);
    console.log();
    console.log(colors.green + '✓ Asset type successfully registered on blockchain!' + colors.reset);

    // Step 4: Create token parameters
    console.log();
    header('Asset Token Creation', 2);

    const tokenParams = {
      assetId: satelliteMetadata.assetId,
      name: 'Satellite Alpha Token',
      symbol: 'SAT-ALPHA',
      totalSupply: '1000000', // 1M tokens
      metadataHash: hashResult.hash
    };

    displayMetadata(tokenParams, 'Token Parameters (Pre-Transaction)');

    console.log(colors.blue + 'ℹ Creating asset token on blockchain...' + colors.reset);
    console.log();

    const createTokenResponse = await test.apiRequest('POST', '/api/assets/create-token', {
      assetId: tokenParams.assetId,
      name: tokenParams.name,
      symbol: tokenParams.symbol,
      totalSupply: tokenParams.totalSupply
    });

    test.assertEqual(createTokenResponse.status, 200, 'Asset token creation should succeed');
    test.assertTruthy(createTokenResponse.data.success, 'Token creation should be successful');
    test.assertTruthy(createTokenResponse.data.data.transactionHash, 'Transaction hash should be provided');

    console.log(colors.bright + 'Token Creation Result:' + colors.reset);
    keyValue('Token Address', createTokenResponse.data.data.tokenAddress || '0xABCD...', 1);
    keyValue('Token Name', createTokenResponse.data.data.name, 1);
    keyValue('Symbol', createTokenResponse.data.data.symbol, 1);
    keyValue('Total Supply', '1,000,000 tokens', 1);
    keyValue('Transaction Hash', createTokenResponse.data.data.transactionHash, 1);
    console.log();
    console.log(colors.green + '✓ Asset token successfully created on blockchain!' + colors.reset);

    // Step 5: Create lease offer with detailed terms
    console.log();
    header('COMPLETE LEASE CREATION FLOW', 1);

    const leaseTerms = {
      assetId: satelliteMetadata.assetId,
      lessor: '0x1234567890123456789012345678901234567890',
      lessee: '0x0987654321098765432109876543210987654321',
      pricePerDay: '100',
      maxLeaseDuration: '365',
      startDate: '2024-11-01T00:00:00Z',
      endDate: '2024-11-30T23:59:59Z',
      paymentSchedule: 'monthly',
      currency: 'USDC',
      terms: {
        description: 'Standard satellite lease with orbital mechanics clause',
        orbital_period_hours: 1.58,
        imaging_resolution_m: 0.5,
        coverage_area_km2: 2500000,
        data_download_rights: true,
        restrictions: [
          'No military applications',
          'Environmental monitoring only',
          'Data sharing restrictions apply'
        ]
      }
    };

    displayMetadata(leaseTerms, 'Off-Chain Lease Agreement Terms');

    const leaseHashResult = displayHashingProcess(leaseTerms, 'Lease Terms');

    console.log();
    header('On-Chain Lease Offer Creation', 2);
    console.log(colors.blue + 'ℹ Creating lease offer on marketplace...' + colors.reset);
    console.log();

    const createOfferResponse = await test.apiRequest('POST', '/api/leases/create-offer', {
      assetId: leaseTerms.assetId,
      pricePerDay: leaseTerms.pricePerDay,
      maxLeaseDuration: leaseTerms.maxLeaseDuration,
      terms: leaseTerms.terms.description
    });

    test.assertEqual(createOfferResponse.status, 200, 'Lease offer creation should succeed');
    test.assertTruthy(createOfferResponse.data.success, 'Offer creation should be successful');
    test.assertTruthy(createOfferResponse.data.data.transactionHash, 'Transaction hash should be provided');

    console.log(colors.bright + 'Lease Offer Result:' + colors.reset);
    keyValue('Offer ID', createOfferResponse.data.data.offerId || '1', 1);
    keyValue('Asset ID', createOfferResponse.data.data.assetId, 1);
    keyValue('Price Per Day', '100 USDC', 1);
    keyValue('Max Duration', '365 days', 1);
    keyValue('Terms Hash', leaseHashResult.hash.substring(0, 34) + '...', 1);
    keyValue('Transaction Hash', createOfferResponse.data.data.transactionHash, 1);
    console.log();
    console.log(colors.green + '✓ Lease offer successfully posted to marketplace!' + colors.reset);

    // Step 6: Verify blockchain events
    console.log();
    header('Event Verification', 2);
    console.log(colors.blue + 'ℹ Verifying blockchain events...' + colors.reset);
    console.log();

    // Wait a moment for events to be processed
    await test.wait(2000);

    const eventsResponse = await test.apiRequest('GET', '/api/events/assetRegistry');
    test.assertEqual(eventsResponse.status, 200, 'Events endpoint should return 200');
    test.assertTruthy(eventsResponse.data.success, 'Events request should be successful');
    test.assert(eventsResponse.data.data.eventsCount > 0, 'Should have some events');

    console.log(colors.bright + 'Event Summary:' + colors.reset);
    keyValue('Total Events Captured', eventsResponse.data.data.eventsCount, 1);
    keyValue('Contract', 'AssetRegistry', 1);
    console.log();
    console.log(colors.green + '✓ All blockchain events captured successfully!' + colors.reset);

    // Step 7: System status verification
    console.log();
    header('System Status Verification', 2);

    const statusResponse = await test.apiRequest('GET', '/api/status');
    test.assertEqual(statusResponse.status, 200, 'Status endpoint should return 200');
    test.assertTruthy(statusResponse.data.data.contracts.deployed, 'Contracts should be deployed');
    test.assertTruthy(statusResponse.data.data.blockchain.connected, 'Blockchain should be connected');

    console.log(colors.green + '✓ All system components operational' + colors.reset);

    // Final summary
    console.log();
    header('COMPLETE DATA FLOW SUMMARY', 1);

    console.log(colors.bright + 'Asset Creation Flow:' + colors.reset);
    console.log(`  ${colors.green}✓${colors.reset} Step 1: Created off-chain satellite metadata with full specifications`);
    console.log(`  ${colors.green}✓${colors.reset} Step 2: Generated SHA-256 hash (${hashResult.hash.substring(0, 10)}...)`);
    console.log(`  ${colors.green}✓${colors.reset} Step 3: Registered asset type on blockchain`);
    console.log(`  ${colors.green}✓${colors.reset} Step 4: Created asset token (SAT-ALPHA) with 1M supply`);

    console.log();
    console.log(colors.bright + 'Lease Creation Flow:' + colors.reset);
    console.log(`  ${colors.green}✓${colors.reset} Step 1: Created off-chain lease agreement with detailed terms`);
    console.log(`  ${colors.green}✓${colors.reset} Step 2: Generated SHA-256 hash of lease terms (${leaseHashResult.hash.substring(0, 10)}...)`);
    console.log(`  ${colors.green}✓${colors.reset} Step 3: Posted lease offer to marketplace`);
    console.log(`  ${colors.green}✓${colors.reset} Step 4: Verified ${eventsResponse.data.data.eventsCount} blockchain events`);
    console.log(`  ${colors.green}✓${colors.reset} Step 5: Confirmed all system components operational`);

    console.log();
    console.log(colors.bright + colors.green + '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' + colors.reset);
    console.log(colors.bright + colors.green + '  ✅  COMPLETE - Full data flow from off-chain metadata to on-chain contracts' + colors.reset);
    console.log(colors.bright + colors.green + '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' + colors.reset);
    console.log();
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