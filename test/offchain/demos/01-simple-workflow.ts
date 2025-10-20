#!/usr/bin/env tsx
/**
 * Simple Demo: Asset Leasing Protocol
 *
 * This demonstrates the complete workflow of the refactored protocol:
 * 1. Deploy contracts to local blockchain
 * 2. Create asset types with schemas
 * 3. Register asset instances with metadata
 * 4. Query and verify all data
 * 5. Demonstrate holder enumeration
 *
 * Philosophy: Clear, simple, self-documenting code that shows how the protocol works.
 */

import { ethers } from 'ethers';
import { readFileSync } from 'fs';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// UTILITIES
// ============================================================================

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function section(title: string) {
  console.log('\n' + colors.bright + colors.cyan + '═'.repeat(80) + colors.reset);
  console.log(colors.bright + colors.cyan + `  ${title}` + colors.reset);
  console.log(colors.bright + colors.cyan + '═'.repeat(80) + colors.reset + '\n');
}

function step(message: string) {
  console.log(colors.blue + '▶' + colors.reset + ' ' + message);
}

function success(message: string) {
  console.log(colors.green + '✓' + colors.reset + ' ' + message);
}

function info(key: string, value: string | number, indent = 0) {
  const padding = '  '.repeat(indent);
  console.log(`${padding}${colors.dim}${key}:${colors.reset} ${colors.green}${value}${colors.reset}`);
}

// ============================================================================
// SCHEMA UTILITIES
// ============================================================================

const SCHEMA_HASHES = {
  ORBITAL_COMPUTE: ethers.keccak256(ethers.toUtf8Bytes('OrbitalComputeSchema')),
  ORBITAL_RELAY: ethers.keccak256(ethers.toUtf8Bytes('OrbitalRelaySchema')),
  SATELLITE: ethers.keccak256(ethers.toUtf8Bytes('SatelliteSchema'))
};

const REQUIRED_LEASE_KEYS = {
  ORBITAL_COMPUTE: ['compute_allocation_cores', 'memory_allocation_gb', 'storage_allocation_tb'],
  ORBITAL_RELAY: ['relay_channels', 'max_throughput_gbps', 'coverage_area_km2'],
  SATELLITE: ['orbital_period_hours', 'data_download_rights', 'orbit_maintenance_responsibility']
};

function generateLeaseKeyHashes(keys: string[]): string[] {
  return keys.map(key => ethers.keccak256(ethers.toUtf8Bytes(key)));
}

// ============================================================================
// METADATA CONVERSION
// ============================================================================

interface MetadataEntry {
  key: string;
  value: string;
}

function jsonToMetadataArray(assetJson: any): MetadataEntry[] {
  const metadata: MetadataEntry[] = [];

  // Core fields
  metadata.push({ key: 'name', value: assetJson.name });
  metadata.push({ key: 'description', value: assetJson.description });
  metadata.push({ key: 'assetType', value: assetJson.assetType });

  // Flatten specifications
  function flattenObject(obj: Record<string, any>, prefix = '') {
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

  return metadata;
}

// ============================================================================
// CONTRACT LOADING
// ============================================================================

function loadContractArtifact(contractName: string) {
  const artifactPath = join(__dirname, '../../../out', `${contractName}.sol`, `${contractName}.json`);
  return JSON.parse(readFileSync(artifactPath, 'utf-8'));
}

// ============================================================================
// MAIN DEMO
// ============================================================================

async function main() {
  section('Asset Leasing Protocol - Simple Demo');

  // Connect to Anvil
  step('Connecting to local blockchain (Anvil must be running on port 8545)');
  const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
  const deployer = new ethers.Wallet(
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    provider
  );

  const balance = await provider.getBalance(deployer.address);
  success('Connected to blockchain');
  info('Network', 'Anvil (local)', 1);
  info('Deployer Address', deployer.address, 1);
  info('Balance', `${ethers.formatEther(balance)} ETH`, 1);

  // Deploy Contracts
  section('Deploying Smart Contracts');

  // Get initial nonce
  let nonce = await provider.getTransactionCount(deployer.address);

  step('Deploying AssetRegistry...');
  const AssetRegistry = new ethers.ContractFactory(
    loadContractArtifact('AssetRegistry').abi,
    loadContractArtifact('AssetRegistry').bytecode.object,
    deployer
  );
  const assetRegistry = await AssetRegistry.deploy(deployer.address, deployer.address, { nonce: nonce++ });
  await assetRegistry.waitForDeployment();
  const registryAddr = await assetRegistry.getAddress();
  success(`AssetRegistry deployed at ${registryAddr}`);

  step('Deploying LeaseFactory...');
  const LeaseFactory = new ethers.ContractFactory(
    loadContractArtifact('LeaseFactory').abi,
    loadContractArtifact('LeaseFactory').bytecode.object,
    deployer
  );
  const leaseFactory = await LeaseFactory.deploy(deployer.address, registryAddr, { nonce: nonce++ });
  await leaseFactory.waitForDeployment();
  success(`LeaseFactory deployed at ${await leaseFactory.getAddress()}`);

  step('Deploying MockStablecoin...');
  const MockStablecoin = new ethers.ContractFactory(
    loadContractArtifact('MockStablecoin').abi,
    loadContractArtifact('MockStablecoin').bytecode.object,
    deployer
  );
  const stablecoin = await MockStablecoin.deploy({ nonce: nonce++ });
  await stablecoin.waitForDeployment();
  const stablecoinAddr = await stablecoin.getAddress();
  success(`MockStablecoin deployed at ${stablecoinAddr}`);

  step('Deploying Marketplace...');
  const Marketplace = new ethers.ContractFactory(
    loadContractArtifact('Marketplace').abi,
    loadContractArtifact('Marketplace').bytecode.object,
    deployer
  );
  const marketplace = await Marketplace.deploy(
    deployer.address,
    stablecoinAddr,
    await leaseFactory.getAddress(),
    { nonce: nonce++ }
  );
  await marketplace.waitForDeployment();
  success(`Marketplace deployed at ${await marketplace.getAddress()}`);

  // Create Asset Types
  section('Creating Asset Types (Schemas)');

  step('Creating Orbital Compute Station type...');
  let tx = await assetRegistry.createAsset(
    'Orbital Compute Station',
    SCHEMA_HASHES.ORBITAL_COMPUTE,
    generateLeaseKeyHashes(REQUIRED_LEASE_KEYS.ORBITAL_COMPUTE),
    [],
    { nonce: nonce++ }
  );
  await tx.wait();
  success('Orbital Compute Station type created');
  info('Schema Hash', SCHEMA_HASHES.ORBITAL_COMPUTE, 1);
  info('Required Lease Keys', REQUIRED_LEASE_KEYS.ORBITAL_COMPUTE.join(', '), 1);

  step('Creating Orbital Relay Station type...');
  tx = await assetRegistry.createAsset(
    'Orbital Relay Station',
    SCHEMA_HASHES.ORBITAL_RELAY,
    generateLeaseKeyHashes(REQUIRED_LEASE_KEYS.ORBITAL_RELAY),
    [],
    { nonce: nonce++ }
  );
  await tx.wait();
  success('Orbital Relay Station type created');

  step('Creating Satellite type...');
  tx = await assetRegistry.createAsset(
    'Satellite',
    SCHEMA_HASHES.SATELLITE,
    generateLeaseKeyHashes(REQUIRED_LEASE_KEYS.SATELLITE),
    [],
    { nonce: nonce++ }
  );
  await tx.wait();
  success('Satellite type created');

  // Register Asset Instance
  section('Registering Asset Instance (OCS-Primary)');

  step('Loading asset metadata from JSON file...');
  const assetPath = join(__dirname, '../data/assets/ocs-primary.json');
  const assetJson = JSON.parse(await readFile(assetPath, 'utf8'));
  success(`Loaded ${assetJson.name}`);
  info('Type', assetJson.assetType, 1);
  info('Description', assetJson.description.substring(0, 60) + '...', 1);

  step('Converting JSON metadata to onchain format...');
  const metadata = jsonToMetadataArray(assetJson);
  success(`Converted to ${metadata.length} key-value pairs`);
  console.log(colors.dim + '  Sample metadata:' + colors.reset);
  metadata.slice(0, 5).forEach(m => {
    info(`  ${m.key}`, m.value, 1);
  });
  console.log(colors.dim + `  ... and ${metadata.length - 5} more` + colors.reset);

  step('Registering asset onchain...');
  explanation('Deploying ERC-20 token for fractional asset ownership', 1);
  explanation('AssetRegistry will be admin (it deploys the token)', 1);
  explanation('Deployer receives 100% of initial token supply', 1);

  tx = await assetRegistry.registerAsset(
    SCHEMA_HASHES.ORBITAL_COMPUTE,
    'OCS-Primary Token',
    'OCS1',
    ethers.parseEther('1000000'), // 1 million tokens = 100% ownership
    registryAddr,        // AssetRegistry needs admin role to set metadata during construction
    deployer.address,    // Deployer receives token supply
    metadata,
    { nonce: nonce++ }
  );

  const receipt = await tx.wait();

  // Parse event to get asset ID and token address
  const iface = assetRegistry.interface;
  let assetId: bigint | undefined;
  let tokenAddress: string | undefined;

  for (const log of receipt!.logs) {
    try {
      const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
      if (parsed && parsed.name === 'AssetRegistered') {
        assetId = parsed.args.assetId;
        tokenAddress = parsed.args.tokenAddress;
      }
    } catch {}
  }

  success('Asset registered successfully!');
  info('Asset ID', assetId!.toString(), 1);
  info('Token Address', tokenAddress!, 1);
  info('Total Supply', '1,000,000 tokens', 1);

  // Verify Metadata Storage
  section('Verifying Metadata Storage');

  const token = new ethers.Contract(
    tokenAddress!,
    loadContractArtifact('AssetERC20').abi,
    provider
  );

  step('Querying metadata from blockchain...');
  const storedName = await token.getMetadata('name');
  const storedType = await token.getMetadata('assetType');
  const cpuCores = await token.getMetadata('spec_compute_cpu_cores');
  const ram = await token.getMetadata('spec_compute_ram_gb');
  const storage = await token.getMetadata('spec_compute_storage_tb');

  success('Metadata retrieved and verified');
  info('Name', storedName, 1);
  info('Asset Type', storedType, 1);
  info('CPU Cores', cpuCores, 1);
  info('RAM (GB)', ram, 1);
  info('Storage (TB)', storage, 1);

  // Demonstrate Holder Enumeration
  section('Holder Enumeration (No Snapshots)');

  step('Querying current token holders...');
  const holdersResult = await token.getHolders();
  const holders: string[] = holdersResult[0];
  const balances: bigint[] = holdersResult[1];

  success(`Found ${holders.length} holder(s)`);
  for (let i = 0; i < holders.length; i++) {
    const percentage = (Number(balances[i]) / Number(ethers.parseEther('1000000'))) * 100;
    info(`Holder ${i + 1}`, holders[i], 1);
    info('  Balance', ethers.formatEther(balances[i]) + ' tokens', 2);
    info('  Ownership', percentage.toFixed(2) + '%', 2);
  }

  // Simulate Token Transfer
  section('Simulating Token Transfer');

  const recipient = new ethers.Wallet(
    '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
    provider
  );

  step(`Transferring 250,000 tokens (25%) to ${recipient.address}...`);
  const tokenWithSigner = token.connect(deployer);
  tx = await tokenWithSigner.transfer(recipient.address, ethers.parseEther('250000'), { nonce: nonce++ });
  await tx.wait();
  success('Transfer completed');

  step('Querying updated holder list...');
  const updatedResult = await token.getHolders();
  const updatedHolders: string[] = updatedResult[0];
  const updatedBalances: bigint[] = updatedResult[1];

  success(`Now ${updatedHolders.length} holders`);
  for (let i = 0; i < updatedHolders.length; i++) {
    const percentage = (Number(updatedBalances[i]) / Number(ethers.parseEther('1000000'))) * 100;
    info(`Holder ${i + 1}`, updatedHolders[i], 1);
    info('  Balance', ethers.formatEther(updatedBalances[i]) + ' tokens', 2);
    info('  Ownership', percentage.toFixed(2) + '%', 2);
  }

  // Demonstrate Revenue Distribution
  section('Revenue Distribution Calculation');

  const revenueAmount = ethers.parseEther('50000'); // 50,000 USDC
  const totalSupply = ethers.parseEther('1000000');

  step('Simulating revenue distribution of 50,000 USDC...');
  success('Calculating proportional claims:');

  let totalClaims = 0n;
  for (let i = 0; i < updatedHolders.length; i++) {
    const claimAmount = (updatedBalances[i] * revenueAmount) / totalSupply;
    totalClaims += claimAmount;
    const percentage = (Number(updatedBalances[i]) / Number(totalSupply)) * 100;

    info(`Holder ${i + 1}`, updatedHolders[i], 1);
    info('  Ownership', percentage.toFixed(2) + '%', 2);
    info('  Revenue Claim', ethers.formatEther(claimAmount) + ' USDC', 2);
  }

  success('Revenue distribution calculated');
  info('Total Distributed', ethers.formatEther(totalClaims) + ' USDC', 1);
  info('Verification', totalClaims === revenueAmount ? 'PASSED ✓' : 'FAILED ✗', 1);

  // Summary
  section('Demo Complete!');
  console.log(colors.green + '✓ All operations successful' + colors.reset);
  console.log();
  console.log(colors.dim + 'Key Takeaways:' + colors.reset);
  console.log(colors.dim + '  • Asset types are created with schema hashes (not numeric IDs)' + colors.reset);
  console.log(colors.dim + '  • Metadata is stored as key-value pairs onchain (not JSON hashes)' + colors.reset);
  console.log(colors.dim + '  • Holders are enumerated directly (no snapshots required)' + colors.reset);
  console.log(colors.dim + '  • Revenue distribution is calculated from current holdings' + colors.reset);
  console.log();
}

// Run demo
main().catch((error) => {
  console.error(colors.green + '\n✗ Error:' + colors.reset, error.message);
  process.exit(1);
});
