/**
 * ContractManager - Simplified contract deployment and management
 *
 * Handles deployment of all protocol contracts with progress indicators
 * and saves/loads deployment addresses for reuse.
 *
 * Philosophy: Make contract deployment as simple as `npm install`
 */

import { ethers, Contract } from 'ethers';
import { BlockchainClient } from './blockchain-client.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export interface ContractAddresses {
  assetRegistry: string;
  leaseFactory: string;
  marketplace: string;
  mockStablecoin: string;
  chainId: number;
  deployedAt: string;
  deployer: string;
}

export interface DeploymentResult {
  addresses: ContractAddresses;
  contracts: {
    assetRegistry: Contract;
    leaseFactory: Contract;
    marketplace: Contract;
    mockStablecoin: Contract;
  };
  gasUsed: string;
  deploymentTime: number;
}

/**
 * Contract deployment and management
 *
 * Example usage:
 * ```typescript
 * const manager = new ContractManager(blockchainClient);
 *
 * // Deploy all contracts
 * const deployment = await manager.deployAll();
 * console.log('AssetRegistry:', deployment.addresses.assetRegistry);
 *
 * // Save for later
 * await manager.saveDeployment('./deployments/local.json');
 *
 * // Load existing deployment
 * await manager.loadDeployment('./deployments/local.json');
 * const registry = manager.getContract('AssetRegistry');
 * ```
 */
export class ContractManager {
  private blockchain: BlockchainClient;
  private addresses: ContractAddresses | null = null;

  constructor(blockchain: BlockchainClient) {
    this.blockchain = blockchain;
  }

  /**
   * Deploy all protocol contracts with progress indicators
   */
  async deployAll(): Promise<DeploymentResult> {
    const startTime = Date.now();
    let totalGasUsed = BigInt(0);

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  Deploying Smart Contracts');
    console.log('═══════════════════════════════════════════════════════════\n');

    const deployer = this.blockchain.getAddress();
    const networkInfo = await this.blockchain.getNetworkInfo();

    console.log(`Deployer: ${deployer}`);
    console.log(`Chain ID: ${networkInfo.chainId}`);
    console.log(`Block: ${networkInfo.blockNumber}\n`);

    // Deploy contracts in order
    const mockStablecoin = await this.deployContract('MockStablecoin', []);
    totalGasUsed += BigInt(mockStablecoin.gasUsed);

    const assetRegistry = await this.deployContract('AssetRegistry', [deployer, deployer]);
    totalGasUsed += BigInt(assetRegistry.gasUsed);

    const leaseFactory = await this.deployContract('LeaseFactory', [
      deployer,
      assetRegistry.address
    ]);
    totalGasUsed += BigInt(leaseFactory.gasUsed);

    const marketplace = await this.deployContract('Marketplace', [
      deployer,
      mockStablecoin.address,
      leaseFactory.address
    ]);
    totalGasUsed += BigInt(marketplace.gasUsed);

    const deploymentTime = Date.now() - startTime;

    console.log('\n───────────────────────────────────────────────────────────');
    console.log('  Deployment Summary');
    console.log('───────────────────────────────────────────────────────────\n');
    console.log(`Total Gas Used: ${totalGasUsed.toString()}`);
    console.log(`Deployment Time: ${(deploymentTime / 1000).toFixed(2)}s`);
    console.log('\n✓ All contracts deployed successfully!\n');

    // Store addresses
    this.addresses = {
      assetRegistry: assetRegistry.address,
      leaseFactory: leaseFactory.address,
      marketplace: marketplace.address,
      mockStablecoin: mockStablecoin.address,
      chainId: Number(networkInfo.chainId),
      deployedAt: new Date().toISOString(),
      deployer
    };

    // Load contracts into blockchain client
    this.blockchain.loadContract('AssetRegistry', assetRegistry.address);
    this.blockchain.loadContract('LeaseFactory', leaseFactory.address);
    this.blockchain.loadContract('Marketplace', marketplace.address);
    this.blockchain.loadContract('MockStablecoin', mockStablecoin.address);

    return {
      addresses: this.addresses,
      contracts: {
        assetRegistry: this.blockchain.getContract('AssetRegistry'),
        leaseFactory: this.blockchain.getContract('LeaseFactory'),
        marketplace: this.blockchain.getContract('Marketplace'),
        mockStablecoin: this.blockchain.getContract('MockStablecoin')
      },
      gasUsed: totalGasUsed.toString(),
      deploymentTime
    };
  }

  /**
   * Deploy a single contract
   */
  private async deployContract(
    name: string,
    constructorArgs: any[]
  ): Promise<{ address: string; gasUsed: string }> {
    console.log(`▶ Deploying ${name}...`);

    const artifactPath = join(__dirname, '../../../../out', `${name}.sol`, `${name}.json`);
    const artifact = JSON.parse(readFileSync(artifactPath, 'utf-8'));

    const factory = new ethers.ContractFactory(
      artifact.abi,
      artifact.bytecode.object,
      this.blockchain.getWallet()
    );

    const contract = await factory.deploy(...constructorArgs);
    await contract.waitForDeployment();

    const address = await contract.getAddress();
    const deployTx = contract.deploymentTransaction();

    if (!deployTx) {
      throw new Error(`Deployment transaction not found for ${name}`);
    }

    const receipt = await deployTx.wait();

    if (!receipt) {
      throw new Error(`Deployment receipt not found for ${name}`);
    }

    console.log(`  ✓ ${name} deployed at ${address}`);
    console.log(`    Gas used: ${receipt.gasUsed.toString()}`);

    return {
      address,
      gasUsed: receipt.gasUsed.toString()
    };
  }

  /**
   * Load contracts from existing deployment
   */
  async loadExisting(addresses: ContractAddresses): Promise<void> {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  Loading Existing Contracts');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Verify chain ID matches
    const networkInfo = await this.blockchain.getNetworkInfo();
    if (Number(networkInfo.chainId) !== addresses.chainId) {
      throw new Error(
        `Chain ID mismatch. Expected ${addresses.chainId}, got ${networkInfo.chainId}`
      );
    }

    // Load contracts
    this.blockchain.loadContract('AssetRegistry', addresses.assetRegistry);
    this.blockchain.loadContract('LeaseFactory', addresses.leaseFactory);
    this.blockchain.loadContract('Marketplace', addresses.marketplace);
    this.blockchain.loadContract('MockStablecoin', addresses.mockStablecoin);

    this.addresses = addresses;

    console.log('✓ All contracts loaded successfully!\n');
  }

  /**
   * Save deployment to file
   */
  async saveDeployment(path: string): Promise<void> {
    if (!this.addresses) {
      throw new Error('No deployment to save. Deploy contracts first.');
    }

    // Ensure directory exists
    const dir = path.substring(0, path.lastIndexOf('/'));
    if (dir && !existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    writeFileSync(path, JSON.stringify(this.addresses, null, 2));
    console.log(`✓ Deployment saved to ${path}`);
  }

  /**
   * Load deployment from file
   */
  async loadDeployment(path: string): Promise<ContractAddresses> {
    if (!existsSync(path)) {
      throw new Error(`Deployment file not found: ${path}`);
    }

    const addresses: ContractAddresses = JSON.parse(readFileSync(path, 'utf-8'));
    await this.loadExisting(addresses);

    return addresses;
  }

  /**
   * Get contract by name
   */
  getContract(name: string): Contract {
    return this.blockchain.getContract(name);
  }

  /**
   * Get all contract addresses
   */
  getAddresses(): ContractAddresses {
    if (!this.addresses) {
      throw new Error('No contracts deployed or loaded');
    }
    return { ...this.addresses };
  }

  /**
   * Check if contracts are deployed
   */
  isDeployed(): boolean {
    return this.addresses !== null;
  }

  /**
   * Get deployment info as JSON
   */
  toJSON(): ContractAddresses | null {
    return this.addresses ? { ...this.addresses } : null;
  }
}
