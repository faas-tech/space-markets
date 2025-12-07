/**
 * ContractManager - Deploy and manage upgradeable Asset Leasing Protocol contracts
 *
 * Handles deployment of all protocol contracts using ERC1967 UUPS proxy pattern.
 * This matches the deployment strategy used in the Foundry test suite.
 *
 * Architecture:
 * 1. Deploy implementation contracts
 * 2. Deploy proxies pointing to implementations
 * 3. Initialize proxies with proper roles and configuration
 *
 * Philosophy: Make blockchain deployment as simple as `npm install`
 */

import { ethers, Contract } from 'ethers';
import { BlockchainClient } from './blockchain-client.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface ContractAddresses {
  // Proxy addresses (these are the actual contract addresses to use)
  assetRegistry: string;
  leaseFactory: string;
  marketplace: string;
  mockStablecoin: string;

  // Implementation addresses (for reference)
  assetRegistryImplementation?: string;
  leaseFactoryImplementation?: string;
  marketplaceImplementation?: string;
  assetERC20Implementation?: string;

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
 * Contract deployment and management for upgradeable contracts
 *
 * Example usage:
 * ```typescript
 * const manager = new ContractManager(blockchainClient);
 *
 * // Deploy all contracts with proxy pattern
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
   * Deploy all protocol contracts using UUPS proxy pattern
   *
   * Deployment Order:
   * 1. MockStablecoin (regular contract, no proxy)
   * 2. AssetERC20 implementation (for cloning by AssetRegistry)
   * 3. AssetRegistry implementation + proxy
   * 4. LeaseFactory implementation + proxy
   * 5. Marketplace implementation + proxy
   */
  async deployAll(): Promise<DeploymentResult> {
    const startTime = Date.now();
    let totalGasUsed = BigInt(0);

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  Deploying Asset Leasing Protocol (Upgradeable)');
    console.log('═══════════════════════════════════════════════════════════\n');

    const deployer = this.blockchain.getAddress();
    const networkInfo = await this.blockchain.getNetworkInfo();

    console.log(`Deployer: ${deployer}`);
    console.log(`Chain ID: ${networkInfo.chainId}`);
    console.log(`Block: ${networkInfo.blockNumber}\n`);

    // Step 1: Deploy MockStablecoin (regular contract)
    console.log('📋 Step 1: Deploy MockStablecoin');
    const mockStablecoin = await this.deployContract('MockStablecoin', []);
    totalGasUsed += BigInt(mockStablecoin.gasUsed);

    // Step 2: Deploy AssetERC20 Implementation (for cloning)
    console.log('\n📋 Step 2: Deploy AssetERC20 Implementation');
    const assetERC20Implementation = await this.deployContract('AssetERC20', []);
    totalGasUsed += BigInt(assetERC20Implementation.gasUsed);

    // Step 3: Deploy AssetRegistry (implementation + proxy)
    console.log('\n📋 Step 3: Deploy AssetRegistry (Upgradeable)');
    const assetRegistry = await this.deployUpgradeable(
      'AssetRegistry',
      'initialize',
      [deployer, deployer, deployer, assetERC20Implementation.address]
    );
    totalGasUsed += BigInt(assetRegistry.gasUsed);

    // Step 4: Deploy LeaseFactory (implementation + proxy)
    console.log('\n📋 Step 4: Deploy LeaseFactory (Upgradeable)');
    const leaseFactory = await this.deployUpgradeable(
      'LeaseFactory',
      'initialize',
      [deployer, deployer, assetRegistry.address]
    );
    totalGasUsed += BigInt(leaseFactory.gasUsed);

    // Step 5: Deploy Marketplace (implementation + proxy)
    console.log('\n📋 Step 5: Deploy Marketplace (Upgradeable)');
    const marketplace = await this.deployUpgradeable(
      'Marketplace',
      'initialize',
      [deployer, deployer, mockStablecoin.address, leaseFactory.address]
    );
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
      assetRegistryImplementation: assetRegistry.implementation,
      leaseFactoryImplementation: leaseFactory.implementation,
      marketplaceImplementation: marketplace.implementation,
      assetERC20Implementation: assetERC20Implementation.address,
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
   * Deploy a regular (non-upgradeable) contract
   */
  private async deployContract(
    contractPath: string,
    constructorArgs: any[]
  ): Promise<{ address: string; gasUsed: string }> {
    const contractName = contractPath.includes(':')
      ? contractPath.split(':')[1]
      : contractPath;

    console.log(`  ▶ Deploying ${contractName}...`);

    // Handle path-based artifact lookup
    let artifactPath: string;
    if (contractPath.includes('/')) {
      // Full path provided (e.g., "test/mocks/MockStablecoin.sol:MockStablecoin")
      const [filePath, name] = contractPath.split(':');
      artifactPath = join(__dirname, '../../../../out', filePath, `${name || contractName}.json`);
    } else {
      // Simple name (e.g., "AssetERC20")
      artifactPath = join(__dirname, '../../../../out', `${contractName}.sol`, `${contractName}.json`);
    }

    const artifact = JSON.parse(readFileSync(artifactPath, 'utf-8'));

    const factory = new ethers.ContractFactory(
      artifact.abi,
      artifact.bytecode.object,
      this.blockchain.getWallet()
    );

    // Let ethers.js manage nonces automatically
    const contract = await factory.deploy(...constructorArgs);
    await contract.waitForDeployment();

    const address = await contract.getAddress();

    // Reset provider to clear nonce cache for next deployment
    await this.blockchain.resetProvider();
    const deployTx = contract.deploymentTransaction();

    if (!deployTx) {
      throw new Error(`Deployment transaction not found for ${contractName}`);
    }

    const receipt = await deployTx.wait();

    if (!receipt) {
      throw new Error(`Deployment receipt not found for ${contractName}`);
    }

    console.log(`    ✓ ${contractName} deployed at ${address}`);
    console.log(`      Gas used: ${receipt.gasUsed.toString()}`);

    return {
      address,
      gasUsed: receipt.gasUsed.toString()
    };
  }

  /**
   * Deploy an upgradeable contract using ERC1967Proxy pattern
   *
   * This follows the same pattern as test/helpers/Setup.sol:
   * 1. Deploy implementation contract
   * 2. Encode initialize call data
   * 3. Deploy ERC1967Proxy with implementation and init data
   * 4. Return proxy address
   */
  private async deployUpgradeable(
    contractName: string,
    initializerName: string,
    initializerArgs: any[]
  ): Promise<{ address: string; implementation: string; gasUsed: string }> {
    console.log(`  ▶ Deploying ${contractName} implementation...`);

    // Step 1: Deploy implementation contract
    const implArtifactPath = join(__dirname, '../../../../out', `${contractName}.sol`, `${contractName}.json`);
    const implArtifact = JSON.parse(readFileSync(implArtifactPath, 'utf-8'));

    const implFactory = new ethers.ContractFactory(
      implArtifact.abi,
      implArtifact.bytecode.object,
      this.blockchain.getWallet()
    );

    // Let ethers.js manage nonces automatically
    const implContract = await implFactory.deploy();
    await implContract.waitForDeployment();

    const implAddress = await implContract.getAddress();

    // Reset provider to clear nonce cache for next deployment
    await this.blockchain.resetProvider();

    console.log(`    ✓ Implementation deployed at ${implAddress}`);

    // Step 2: Encode initializer call data
    console.log(`  ▶ Deploying ${contractName} proxy...`);

    const contractInterface = new ethers.Interface(implArtifact.abi);
    const initData = contractInterface.encodeFunctionData(initializerName, initializerArgs);

    // Step 3: Deploy ERC1967Proxy
    const proxyArtifactPath = join(
      __dirname,
      '../../../../lib/openzeppelin-contracts/build/contracts/ERC1967Proxy.json'
    );

    let proxyArtifact: any;
    try {
      proxyArtifact = JSON.parse(readFileSync(proxyArtifactPath, 'utf-8'));
    } catch {
      // Fallback: use Foundry's output
      const fallbackPath = join(
        __dirname,
        '../../../../out/ERC1967Proxy.sol/ERC1967Proxy.json'
      );
      proxyArtifact = JSON.parse(readFileSync(fallbackPath, 'utf-8'));
    }

    const proxyFactory = new ethers.ContractFactory(
      proxyArtifact.abi,
      proxyArtifact.bytecode || proxyArtifact.bytecode.object,
      this.blockchain.getWallet()
    );

    // Let ethers.js manage nonces automatically
    const proxy = await proxyFactory.deploy(implAddress, initData);
    await proxy.waitForDeployment();

    const proxyAddress = await proxy.getAddress();

    // Reset provider to clear nonce cache for next deployment
    await this.blockchain.resetProvider();

    const proxyTx = proxy.deploymentTransaction();
    if (!proxyTx) {
      throw new Error(`Proxy deployment transaction not found for ${contractName}`);
    }

    const proxyReceipt = await proxyTx.wait();
    if (!proxyReceipt) {
      throw new Error(`Proxy deployment receipt not found for ${contractName}`);
    }

    console.log(`    ✓ Proxy deployed at ${proxyAddress}`);
    console.log(`      Gas used: ${proxyReceipt.gasUsed.toString()}`);
    console.log(`      Implementation: ${implAddress}`);

    return {
      address: proxyAddress,
      implementation: implAddress,
      gasUsed: proxyReceipt.gasUsed.toString()
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

    // Load contracts (use proxy addresses)
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
