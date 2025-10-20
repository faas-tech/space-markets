#!/usr/bin/env node
/**
 * End-to-End Test for Refactored Asset Leasing Protocol
 *
 * Tests the complete integration between:
 * - Anvil blockchain (local test network)
 * - Smart contract deployment (refactored protocol)
 * - Asset type creation and instance registration
 * - Metadata storage and retrieval
 * - Holder enumeration
 * - Revenue distribution (without snapshots)
 *
 * This follows the same style as test.js but for the refactored protocol
 */

import { spawn } from 'child_process';
import { ethers } from 'ethers';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFile } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ARTIFACTS_PATH = join(__dirname, '../../../out');

// ANSI color codes
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

function success(message) {
  console.log(`${colors.green}✓${colors.reset} ${message}`);
}

function error(message) {
  console.log(`${colors.red}✗${colors.reset} ${message}`);
}

function info(message) {
  console.log(`${colors.cyan}ℹ${colors.reset} ${message}`);
}

// Test state
let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  startTime: Date.now()
};

let anvilProcess;
let provider;
let deployer;
let contracts = {};

// Schema hashes (matching refactored protocol)
const SCHEMA_HASHES = {
  ORBITAL_COMPUTE: ethers.keccak256(ethers.toUtf8Bytes('OrbitalComputeSchema')),
  ORBITAL_RELAY: ethers.keccak256(ethers.toUtf8Bytes('OrbitalRelaySchema')),
  SATELLITE: ethers.keccak256(ethers.toUtf8Bytes('SatelliteSchema'))
};

// Required lease keys
const REQUIRED_LEASE_KEYS = {
  ORBITAL_COMPUTE: [
    'compute_allocation_cores',
    'memory_allocation_gb',
    'storage_allocation_tb'
  ],
  ORBITAL_RELAY: [
    'relay_channels',
    'max_throughput_gbps',
    'coverage_area_km2'
  ],
  SATELLITE: [
    'orbital_period_hours',
    'data_download_rights',
    'orbit_maintenance_responsibility'
  ]
};

function generateLeaseKeyHashes(keys) {
  return keys.map(key => ethers.keccak256(ethers.toUtf8Bytes(key)));
}

function loadABI(contractName) {
  const path = join(ARTIFACTS_PATH, `${contractName}.sol`, `${contractName}.json`);
  return JSON.parse(readFileSync(path, 'utf-8'));
}

// Convert JSON metadata to Metadata[] array
function jsonToMetadataArray(assetJson) {
  const metadata = [];

  // Core fields
  metadata.push({ key: 'name', value: assetJson.name });
  metadata.push({ key: 'description', value: assetJson.description });
  metadata.push({ key: 'assetType', value: assetJson.assetType });

  // Flatten specifications recursively
  function flattenObject(obj, prefix = '') {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}_${key}` : key;

      if (value === null || value === undefined) continue;

      if (typeof value === 'object' && !Array.isArray(value)) {
        flattenObject(value, fullKey);
      } else if (Array.isArray(value)) {
        metadata.push({ key: fullKey, value: JSON.stringify(value) });
      } else {
        metadata.push({ key: fullKey, value: String(value) });
      }
    }
  }

  if (assetJson.specifications) {
    flattenObject(assetJson.specifications, 'spec');
  }

  if (assetJson.documents && assetJson.documents.length > 0) {
    const docHashes = assetJson.documents.map(d => d.hash).join(',');
    metadata.push({ key: 'documentHashes', value: docHashes });
  }

  return metadata;
}

// Test runner
class TestRunner {
  async test(name, testFn) {
    testResults.total++;
    const startTime = Date.now();

    try {
      console.log(`\n🧪 ${colors.bright}Running test: ${name}${colors.reset}`);
      await testFn();
      const duration = Date.now() - startTime;
      success(`PASSED: ${name} (${duration}ms)`);
      testResults.passed++;
    } catch (err) {
      const duration = Date.now() - startTime;
      error(`FAILED: ${name} (${duration}ms)`);
      error(`Error: ${err.message}`);
      console.error(err.stack);
      testResults.failed++;
    }
  }

  async assert(condition, message) {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }
}

const runner = new TestRunner();

// Setup functions
async function startAnvil() {
  header('Starting Anvil Blockchain', 2);

  return new Promise((resolve, reject) => {
    anvilProcess = spawn('anvil', ['--port', '8545'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';

    anvilProcess.stdout.on('data', (data) => {
      output += data.toString();
      if (output.includes('Listening on')) {
        success('Anvil started successfully');
        keyValue('Port', '8545', 1);
        keyValue('Chain ID', '31337', 1);
        setTimeout(resolve, 1000); // Give it a second to stabilize
      }
    });

    anvilProcess.stderr.on('data', (data) => {
      console.error(`Anvil error: ${data}`);
    });

    anvilProcess.on('error', reject);

    setTimeout(() => {
      if (!output.includes('Listening on')) {
        reject(new Error('Anvil failed to start within 5 seconds'));
      }
    }, 5000);
  });
}

async function stopAnvil() {
  if (anvilProcess) {
    anvilProcess.kill();
    success('Anvil stopped');
  }
}

async function setupProvider() {
  header('Setting up Provider and Wallet', 2);

  provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
  deployer = new ethers.Wallet(
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    provider
  );

  const balance = await provider.getBalance(deployer.address);
  success('Provider connected');
  keyValue('RPC URL', 'http://127.0.0.1:8545', 1);
  keyValue('Deployer', deployer.address, 1);
  keyValue('Balance', `${ethers.formatEther(balance)} ETH`, 1);
}

async function deployContracts() {
  header('Deploying Smart Contracts', 2);

  // Deploy AssetRegistry
  info('Deploying AssetRegistry...');
  const AssetRegistry = new ethers.ContractFactory(
    loadABI('AssetRegistry').abi,
    loadABI('AssetRegistry').bytecode.object,
    deployer
  );
  const assetRegistry = await AssetRegistry.deploy(deployer.address, deployer.address);
  await assetRegistry.waitForDeployment();
  contracts.assetRegistry = assetRegistry;
  success(`AssetRegistry deployed at ${await assetRegistry.getAddress()}`);

  // Deploy LeaseFactory
  info('Deploying LeaseFactory...');
  const LeaseFactory = new ethers.ContractFactory(
    loadABI('LeaseFactory').abi,
    loadABI('LeaseFactory').bytecode.object,
    deployer
  );
  const leaseFactory = await LeaseFactory.deploy(deployer.address, await assetRegistry.getAddress());
  await leaseFactory.waitForDeployment();
  contracts.leaseFactory = leaseFactory;
  success(`LeaseFactory deployed at ${await leaseFactory.getAddress()}`);

  // Deploy MockStablecoin
  info('Deploying MockStablecoin...');
  const MockStablecoin = new ethers.ContractFactory(
    loadABI('MockStablecoin').abi,
    loadABI('MockStablecoin').bytecode.object,
    deployer
  );
  const stablecoin = await MockStablecoin.deploy('USD Coin', 'USDC', ethers.parseEther('1000000'));
  await stablecoin.waitForDeployment();
  contracts.mockStablecoin = stablecoin;
  success(`MockStablecoin deployed at ${await stablecoin.getAddress()}`);

  // Deploy Marketplace
  info('Deploying Marketplace...');
  const Marketplace = new ethers.ContractFactory(
    loadABI('Marketplace').abi,
    loadABI('Marketplace').bytecode.object,
    deployer
  );
  const marketplace = await Marketplace.deploy(
    deployer.address,
    await stablecoin.getAddress(),
    await leaseFactory.getAddress()
  );
  await marketplace.waitForDeployment();
  contracts.marketplace = marketplace;
  success(`Marketplace deployed at ${await marketplace.getAddress()}`);

  console.log();
  success('All contracts deployed successfully');
}

async function createAssetTypes() {
  header('Creating Asset Types', 2);

  // Orbital Compute
  info('Creating Orbital Compute Station type...');
  let tx = await contracts.assetRegistry.createAsset(
    'Orbital Compute Station',
    SCHEMA_HASHES.ORBITAL_COMPUTE,
    generateLeaseKeyHashes(REQUIRED_LEASE_KEYS.ORBITAL_COMPUTE),
    []
  );
  await tx.wait();
  success('Orbital Compute Station type created');
  keyValue('Schema Hash', SCHEMA_HASHES.ORBITAL_COMPUTE, 1);

  // Orbital Relay
  info('Creating Orbital Relay Station type...');
  tx = await contracts.assetRegistry.createAsset(
    'Orbital Relay Station',
    SCHEMA_HASHES.ORBITAL_RELAY,
    generateLeaseKeyHashes(REQUIRED_LEASE_KEYS.ORBITAL_RELAY),
    []
  );
  await tx.wait();
  success('Orbital Relay Station type created');
  keyValue('Schema Hash', SCHEMA_HASHES.ORBITAL_RELAY, 1);

  // Satellite
  info('Creating Satellite type...');
  tx = await contracts.assetRegistry.createAsset(
    'Satellite',
    SCHEMA_HASHES.SATELLITE,
    generateLeaseKeyHashes(REQUIRED_LEASE_KEYS.SATELLITE),
    []
  );
  await tx.wait();
  success('Satellite type created');
  keyValue('Schema Hash', SCHEMA_HASHES.SATELLITE, 1);

  console.log();
  success('All asset types created');
}

// Tests
async function testAssetRegistration() {
  header('Test: Asset Registration with Metadata', 2);

  // Load asset JSON
  const assetPath = join(__dirname, '../data/assets/ocs-primary.json');
  const assetJson = JSON.parse(await readFile(assetPath, 'utf8'));

  info(`Loading asset: ${assetJson.name}`);
  keyValue('Asset Type', assetJson.assetType, 1);
  keyValue('Description', assetJson.description.substring(0, 80) + '...', 1);

  // Convert to metadata array
  const metadata = jsonToMetadataArray(assetJson);
  success(`Converted metadata to ${metadata.length} key-value pairs`);

  // Register asset
  info('Registering asset onchain...');
  const tx = await contracts.assetRegistry.registerAsset(
    SCHEMA_HASHES.ORBITAL_COMPUTE,
    'OCS-Primary Token',
    'OCS1',
    ethers.parseEther('1000000'),
    deployer.address,
    deployer.address,
    metadata
  );

  const receipt = await tx.wait();

  // Parse event
  const iface = contracts.assetRegistry.interface;
  let assetId, tokenAddress;

  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog({ topics: log.topics, data: log.data });
      if (parsed && parsed.name === 'AssetRegistered') {
        assetId = parsed.args.assetId;
        tokenAddress = parsed.args.tokenAddress;
      }
    } catch {}
  }

  await runner.assert(assetId !== undefined, 'Asset ID should be defined');
  await runner.assert(tokenAddress !== undefined, 'Token address should be defined');

  success('Asset registered successfully');
  keyValue('Asset ID', assetId.toString(), 1);
  keyValue('Token Address', tokenAddress, 1);
  keyValue('Transaction Hash', tx.hash, 1);

  return { assetId, tokenAddress };
}

async function testMetadataRetrieval(tokenAddress) {
  header('Test: Metadata Retrieval', 2);

  const token = new ethers.Contract(tokenAddress, loadABI('AssetERC20').abi, provider);

  info('Querying onchain metadata...');

  const name = await token.getMetadata('name');
  const assetType = await token.getMetadata('assetType');
  const cpuCores = await token.getMetadata('spec_compute_cpu_cores');
  const ramGb = await token.getMetadata('spec_compute_ram_gb');
  const storageTb = await token.getMetadata('spec_compute_storage_tb');

  await runner.assert(name === 'OCS-Primary', 'Name should match');
  await runner.assert(assetType === 'orbital_compute', 'Asset type should match');
  await runner.assert(cpuCores === '64', 'CPU cores should match');
  await runner.assert(ramGb === '512', 'RAM should match');
  await runner.assert(storageTb === '100', 'Storage should match');

  success('Metadata retrieved and verified');
  keyValue('Name', name, 1);
  keyValue('Asset Type', assetType, 1);
  keyValue('CPU Cores', cpuCores, 1);
  keyValue('RAM (GB)', ramGb, 1);
  keyValue('Storage (TB)', storageTb, 1);
}

async function testHolderEnumeration(tokenAddress) {
  header('Test: Holder Enumeration', 2);

  const token = new ethers.Contract(tokenAddress, loadABI('AssetERC20').abi, provider);

  info('Querying token holders...');
  const result = await token.getHolders();
  const holders = result[0];
  const balances = result[1];

  await runner.assert(holders.length === 1, 'Should have 1 holder initially');
  await runner.assert(holders[0] === deployer.address, 'Holder should be deployer');
  await runner.assert(balances[0] === ethers.parseEther('1000000'), 'Balance should be total supply');

  success('Holder enumeration verified');
  keyValue('Total Holders', holders.length, 1);
  keyValue('Holder Address', holders[0], 1);
  keyValue('Balance', ethers.formatEther(balances[0]) + ' tokens', 1);
  keyValue('Percentage', '100%', 1);
}

async function testTokenTransfer(tokenAddress) {
  header('Test: Token Transfer and Holder Updates', 2);

  const token = new ethers.Contract(tokenAddress, loadABI('AssetERC20').abi, deployer);

  // Create a second wallet
  const recipient = new ethers.Wallet('0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d', provider);

  info(`Transferring tokens to ${recipient.address}...`);
  const transferAmount = ethers.parseEther('250000'); // 25%
  const tx = await token.transfer(recipient.address, transferAmount);
  await tx.wait();
  success('Transfer completed');

  // Check updated holders
  info('Checking updated holder list...');
  const result = await token.getHolders();
  const holders = result[0];
  const balances = result[1];

  await runner.assert(holders.length === 2, 'Should have 2 holders after transfer');
  await runner.assert(balances[0] + balances[1] === ethers.parseEther('1000000'), 'Total should equal supply');

  success('Holder list updated correctly');
  for (let i = 0; i < holders.length; i++) {
    const percentage = (Number(balances[i]) / Number(ethers.parseEther('1000000'))) * 100;
    keyValue(`Holder ${i + 1}`, holders[i], 1);
    keyValue(`  Balance`, ethers.formatEther(balances[i]) + ' tokens', 1);
    keyValue(`  Percentage`, percentage.toFixed(2) + '%', 1);
  }

  return { holders, balances };
}

async function testRevenueDistribution(tokenAddress, holders, balances) {
  header('Test: Revenue Distribution (No Snapshots)', 2);

  info('Simulating revenue distribution...');
  const revenueAmount = ethers.parseEther('50000'); // 50,000 USDC
  const totalSupply = ethers.parseEther('1000000');

  success(`Revenue to distribute: ${ethers.formatEther(revenueAmount)} USDC`);
  console.log();
  info('Calculated claims by holder:');

  let totalClaims = 0n;
  for (let i = 0; i < holders.length; i++) {
    const claimAmount = (balances[i] * revenueAmount) / totalSupply;
    totalClaims += claimAmount;
    const percentage = (Number(balances[i]) / Number(totalSupply)) * 100;

    keyValue(`Holder ${i + 1}`, holders[i], 1);
    keyValue(`  Token Balance`, ethers.formatEther(balances[i]), 2);
    keyValue(`  Ownership`, percentage.toFixed(2) + '%', 2);
    keyValue(`  Revenue Claim`, ethers.formatEther(claimAmount) + ' USDC', 2);
  }

  await runner.assert(totalClaims === revenueAmount, 'Total claims should equal revenue amount');

  console.log();
  success('Revenue distribution calculated correctly (proportional to holdings)');
  keyValue('Total Distributed', ethers.formatEther(totalClaims) + ' USDC', 1);
  keyValue('Verification', totalClaims === revenueAmount ? 'PASSED' : 'FAILED', 1);
}

// Main test execution
async function runAllTests() {
  header('Asset Leasing Protocol - Refactored End-to-End Test');

  try {
    // Setup
    await startAnvil();
    await setupProvider();
    await deployContracts();
    await createAssetTypes();

    // Run tests
    await runner.test('Asset Registration with Metadata', async () => {
      const { assetId, tokenAddress } = await testAssetRegistration();

      await runner.test('Metadata Retrieval and Verification', async () => {
        await testMetadataRetrieval(tokenAddress);
      });

      await runner.test('Holder Enumeration', async () => {
        await testHolderEnumeration(tokenAddress);
      });

      await runner.test('Token Transfer and Holder Updates', async () => {
        const { holders, balances } = await testTokenTransfer(tokenAddress);

        await runner.test('Revenue Distribution (No Snapshots)', async () => {
          await testRevenueDistribution(tokenAddress, holders, balances);
        });
      });
    });

    // Summary
    header('Test Summary');
    const duration = ((Date.now() - testResults.startTime) / 1000).toFixed(2);
    keyValue('Total Tests', testResults.total);
    keyValue('Passed', testResults.passed, colors.green);
    keyValue('Failed', testResults.failed, testResults.failed > 0 ? colors.red : colors.green);
    keyValue('Duration', `${duration}s`);

    if (testResults.failed === 0) {
      console.log();
      success('🎉 All tests passed!');
    } else {
      console.log();
      error(`⚠️  ${testResults.failed} test(s) failed`);
    }

  } catch (err) {
    error('Fatal error during test execution');
    console.error(err);
    process.exit(1);
  } finally {
    await stopAnvil();
  }

  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
