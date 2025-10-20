#!/usr/bin/env tsx
/**
 * Deploy and Setup Script for Refactored Protocol
 *
 * Deploys contracts to Anvil and creates test asset types
 */

import { ethers } from 'ethers';
import { readFileSync } from 'fs';
import { join } from 'path';
import { SCHEMA_HASHES, REQUIRED_LEASE_KEYS, generateLeaseKeyHashes } from '../src/utils/schema-hash.js';

// Relative path from project root
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ARTIFACTS_PATH = join(__dirname, '../../../out');

function loadABI(contractName: string) {
  const path = join(ARTIFACTS_PATH, `${contractName}.sol`, `${contractName}.json`);
  return JSON.parse(readFileSync(path, 'utf-8'));
}

async function main() {
  console.log('🚀 Deploying Refactored Protocol to Anvil\n');

  const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
  const deployer = new ethers.Wallet(
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', // Anvil account 0
    provider
  );

  console.log(`Deployer: ${deployer.address}\n`);

  // Deploy contracts
  const AssetRegistry = new ethers.ContractFactory(
    loadABI('AssetRegistry').abi,
    loadABI('AssetRegistry').bytecode.object,
    deployer
  );

  console.log('Deploying AssetRegistry...');
  const assetRegistry = await AssetRegistry.deploy(
    deployer.address, // admin
    deployer.address  // registrar
  );
  await assetRegistry.waitForDeployment();
  const registryAddr = await assetRegistry.getAddress();
  console.log(`✅ AssetRegistry: ${registryAddr}\n`);

  // Deploy other contracts
  const LeaseFactory = new ethers.ContractFactory(
    loadABI('LeaseFactory').abi,
    loadABI('LeaseFactory').bytecode.object,
    deployer
  );

  console.log('Deploying LeaseFactory...');
  const leaseFactory = await LeaseFactory.deploy(deployer.address, registryAddr);
  await leaseFactory.waitForDeployment();
  const factoryAddr = await leaseFactory.getAddress();
  console.log(`✅ LeaseFactory: ${factoryAddr}\n`);

  const MockStablecoin = new ethers.ContractFactory(
    loadABI('MockStablecoin').abi,
    loadABI('MockStablecoin').bytecode.object,
    deployer
  );

  console.log('Deploying MockStablecoin...');
  const stablecoin = await MockStablecoin.deploy('USD Coin', 'USDC', ethers.parseEther('1000000'));
  await stablecoin.waitForDeployment();
  const stablecoinAddr = await stablecoin.getAddress();
  console.log(`✅ MockStablecoin: ${stablecoinAddr}\n`);

  const Marketplace = new ethers.ContractFactory(
    loadABI('Marketplace').abi,
    loadABI('Marketplace').bytecode.object,
    deployer
  );

  console.log('Deploying Marketplace...');
  const marketplace = await Marketplace.deploy(deployer.address, stablecoinAddr, factoryAddr);
  await marketplace.waitForDeployment();
  const marketplaceAddr = await marketplace.getAddress();
  console.log(`✅ Marketplace: ${marketplaceAddr}\n`);

  // Create asset types
  console.log('Creating asset types...\n');

  console.log('Creating Orbital Compute Station type...');
  let tx = await assetRegistry.createAsset(
    'Orbital Compute Station',
    SCHEMA_HASHES.ORBITAL_COMPUTE,
    generateLeaseKeyHashes(REQUIRED_LEASE_KEYS.ORBITAL_COMPUTE),
    []
  );
  await tx.wait();
  console.log('✅ Orbital Compute Station type created\n');

  console.log('Creating Orbital Relay Station type...');
  tx = await assetRegistry.createAsset(
    'Orbital Relay Station',
    SCHEMA_HASHES.ORBITAL_RELAY,
    generateLeaseKeyHashes(REQUIRED_LEASE_KEYS.ORBITAL_RELAY),
    []
  );
  await tx.wait();
  console.log('✅ Orbital Relay Station type created\n');

  console.log('Creating Satellite type...');
  tx = await assetRegistry.createAsset(
    'Satellite',
    SCHEMA_HASHES.SATELLITE,
    generateLeaseKeyHashes(REQUIRED_LEASE_KEYS.SATELLITE),
    []
  );
  await tx.wait();
  console.log('✅ Satellite type created\n');

  console.log('═══════════════════════════════════════════');
  console.log('✅ Deployment Complete!');
  console.log('═══════════════════════════════════════════');
  console.log('\nContract Addresses:');
  console.log(`  AssetRegistry:  ${registryAddr}`);
  console.log(`  LeaseFactory:   ${factoryAddr}`);
  console.log(`  Marketplace:    ${marketplaceAddr}`);
  console.log(`  MockStablecoin: ${stablecoinAddr}`);
  console.log('\nAsset types created: 3');
  console.log('  - Orbital Compute Station');
  console.log('  - Orbital Relay Station');
  console.log('  - Satellite');
}

main().catch(console.error);