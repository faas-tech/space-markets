/**
 * Contract Deployer for Integration Testing
 *
 * Deploys compiled smart contracts to a local Anvil instance.
 * Uses compiled bytecode from Foundry artifacts and performs
 * actual blockchain transactions with verifiable results.
 */

import { ethers } from 'ethers';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { AssetMetadata } from '../types/index.js';

// Path to compiled Foundry artifacts
const ARTIFACTS_PATH = '/Users/shaunmartinak/Documents/SoftwareProjects/Asset-Leasing-Protocol/out';

interface ContractArtifact {
  abi: any[];
  bytecode: {
    object: string;
  };
}

interface DeployedContract {
  address: string;
  transactionHash: string;
  blockNumber: number;
  contract: ethers.Contract;
}

export interface DeploymentResult {
  assetRegistry: DeployedContract;
  marketplace: DeployedContract;
  leaseFactory: DeployedContract;
  mockStablecoin: DeployedContract;
  deploymentBlock: number;
  deployer: string;
  chainId: number;
}

export class ContractDeployer {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private deployment?: DeploymentResult;

  constructor(
    private rpcUrl: string,
    private privateKey: string
  ) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
  }

  /**
   * Load contract artifact from Foundry output
   */
  private loadArtifact(contractName: string): ContractArtifact {
    const artifactPath = join(ARTIFACTS_PATH, `${contractName}.sol`, `${contractName}.json`);

    if (!existsSync(artifactPath)) {
      throw new Error(`Contract artifact not found: ${artifactPath}`);
    }

    const artifact = JSON.parse(readFileSync(artifactPath, 'utf-8'));

    if (!artifact.abi || !artifact.bytecode?.object) {
      throw new Error(`Invalid artifact format for ${contractName}`);
    }

    return artifact;
  }

  /**
   * Deploy a contract and wait for confirmation
   */
  private async deployContract(
    contractName: string,
    constructorArgs: any[] = []
  ): Promise<DeployedContract> {
    console.log(`  Deploying ${contractName}...`);

    const artifact = this.loadArtifact(contractName);
    const factory = new ethers.ContractFactory(
      artifact.abi,
      artifact.bytecode.object,
      this.wallet
    );

    // Deploy with proper gas settings
    const contract = await factory.deploy(...constructorArgs, {
      gasLimit: 10000000 // High gas limit for complex contracts
    });

    // Wait for deployment transaction to be mined
    const deployTx = await contract.deploymentTransaction()!.wait(1);

    if (!deployTx) {
      throw new Error(`Failed to deploy ${contractName}`);
    }

    const deployedAddress = await contract.getAddress();

    console.log(`    ✓ ${contractName} deployed at ${deployedAddress}`);
    console.log(`      Block: ${deployTx.blockNumber}, Tx: ${deployTx.hash}`);

    return {
      address: deployedAddress,
      transactionHash: deployTx.hash,
      blockNumber: deployTx.blockNumber,
      contract
    };
  }

  /**
   * Deploy all contracts in the correct order
   */
  async deployAll(): Promise<DeploymentResult> {
    console.log('Deploying Asset Leasing Protocol contracts...');
    console.log(`  Deployer: ${this.wallet.address}`);
    console.log(`  RPC URL: ${this.rpcUrl}`);

    const chainId = Number((await this.provider.getNetwork()).chainId);
    console.log(`  Chain ID: ${chainId}`);

    // Get initial block number
    const deploymentBlock = await this.provider.getBlockNumber();
    console.log(`  Starting block: ${deploymentBlock}`);

    // Deploy MockStablecoin first
    const mockStablecoin = await this.deployContract('MockStablecoin', [
      'USD Coin',       // name
      'USDC',          // symbol
      ethers.parseEther('1000000') // initial supply: 1M USDC
    ]);

    // Deploy AssetRegistry
    const assetRegistry = await this.deployContract('AssetRegistry', [
      this.wallet.address // admin
    ]);

    // Deploy LeaseFactory
    const leaseFactory = await this.deployContract('LeaseFactory', [
      this.wallet.address,        // admin
      assetRegistry.address       // assetRegistry
    ]);

    // Deploy Marketplace
    const marketplace = await this.deployContract('Marketplace', [
      this.wallet.address,        // admin
      mockStablecoin.address,     // stablecoin
      leaseFactory.address        // leaseFactory
    ]);

    // Store deployment result
    this.deployment = {
      assetRegistry,
      marketplace,
      leaseFactory,
      mockStablecoin,
      deploymentBlock,
      deployer: this.wallet.address,
      chainId
    };

    console.log('\n✅ All contracts deployed successfully!');
    console.log('Deployment Summary:');
    console.log(`  MockStablecoin: ${mockStablecoin.address}`);
    console.log(`  AssetRegistry:  ${assetRegistry.address}`);
    console.log(`  LeaseFactory:   ${leaseFactory.address}`);
    console.log(`  Marketplace:    ${marketplace.address}`);

    return this.deployment;
  }

  /**
   * Get deployed contracts (throws if not deployed)
   */
  getDeployment(): DeploymentResult {
    if (!this.deployment) {
      throw new Error('Contracts not deployed yet. Call deployAll() first.');
    }
    return this.deployment;
  }

  /**
   * Register an asset type onchain
   * This actually calls the smart contract
   */
  async registerAssetType(
    name: string,
    schemaHash: string,
    requiredLeaseKeys: string[] = [],
    schemaURI: string = ''
  ): Promise<{ typeId: bigint; transactionHash: string }> {
    const deployment = this.getDeployment();
    const registry = deployment.assetRegistry.contract;

    console.log(`Registering asset type: ${name}`);

    // Convert string keys to bytes32
    const bytes32Keys = requiredLeaseKeys.map(key =>
      ethers.encodeBytes32String(key)
    );

    const tx = await registry.createAssetType(
      name,
      ethers.encodeBytes32String(schemaHash),
      bytes32Keys,
      schemaURI
    );

    const receipt = await tx.wait(1);

    // Parse the AssetTypeCreated event to get the type ID
    const event = receipt.logs.find((log: any) => {
      try {
        const parsed = registry.interface.parseLog(log);
        return parsed?.name === 'AssetTypeCreated';
      } catch {
        return false;
      }
    });

    if (!event) {
      throw new Error('AssetTypeCreated event not found');
    }

    const parsedEvent = registry.interface.parseLog(event);
    const typeId = parsedEvent!.args[0]; // First arg is typeId

    console.log(`  ✓ Asset type registered with ID: ${typeId}`);

    return {
      typeId,
      transactionHash: receipt.hash
    };
  }

  /**
   * Register an asset onchain
   * Returns the asset ID and token address
   */
  async registerAsset(
    typeId: bigint,
    metadataHash: string,
    dataURI: string,
    tokenName: string,
    tokenSymbol: string,
    totalSupply: bigint
  ): Promise<{ assetId: bigint; tokenAddress: string; transactionHash: string }> {
    const deployment = this.getDeployment();
    const registry = deployment.assetRegistry.contract;

    console.log(`Registering asset: ${tokenName} (${tokenSymbol})`);

    const tx = await registry.registerAsset(
      typeId,
      this.wallet.address, // owner
      ethers.encodeBytes32String(metadataHash),
      dataURI,
      tokenName,
      tokenSymbol,
      totalSupply
    );

    const receipt = await tx.wait(1);

    // Parse the AssetRegistered event
    const event = receipt.logs.find((log: any) => {
      try {
        const parsed = registry.interface.parseLog(log);
        return parsed?.name === 'AssetRegistered';
      } catch {
        return false;
      }
    });

    if (!event) {
      throw new Error('AssetRegistered event not found');
    }

    const parsedEvent = registry.interface.parseLog(event);
    const assetId = parsedEvent!.args[0];     // assetId
    const tokenAddress = parsedEvent!.args[4]; // tokenAddress

    console.log(`  ✓ Asset registered with ID: ${assetId}`);
    console.log(`    Token address: ${tokenAddress}`);

    return {
      assetId,
      tokenAddress,
      transactionHash: receipt.hash
    };
  }

  /**
   * Verify asset exists onchain by querying the contract
   * This provides independent verification
   */
  async verifyAssetOnChain(assetId: bigint): Promise<{
    exists: boolean;
    typeId?: bigint;
    issuer?: string;
    metadataHash?: string;
    dataURI?: string;
    tokenAddress?: string;
  }> {
    const deployment = this.getDeployment();
    const registry = deployment.assetRegistry.contract;

    try {
      const asset = await registry.getAsset(assetId);

      return {
        exists: asset.exists,
        typeId: asset.typeId,
        issuer: asset.issuer,
        metadataHash: asset.metadataHash,
        dataURI: asset.dataURI,
        tokenAddress: asset.tokenAddress
      };
    } catch (error) {
      console.error(`Failed to verify asset ${assetId}:`, error);
      return { exists: false };
    }
  }

  /**
   * Post a lease offer on the marketplace
   */
  async postLeaseOffer(
    assetId: bigint,
    paymentAmount: bigint,
    startTime: number,
    endTime: number,
    termsHash: string
  ): Promise<{ offerId: bigint; transactionHash: string }> {
    const deployment = this.getDeployment();
    const marketplace = deployment.marketplace.contract;

    console.log(`Posting lease offer for asset ${assetId}`);

    const leaseIntent = {
      lessor: this.wallet.address,
      lessee: ethers.ZeroAddress, // Open offer
      assetId,
      paymentToken: deployment.mockStablecoin.address,
      totalPayment: paymentAmount,
      startTime,
      endTime,
      termsHash: ethers.encodeBytes32String(termsHash)
    };

    const tx = await marketplace.postLeaseOffer(leaseIntent);
    const receipt = await tx.wait(1);

    // Parse LeaseOfferPosted event
    const event = receipt.logs.find((log: any) => {
      try {
        const parsed = marketplace.interface.parseLog(log);
        return parsed?.name === 'LeaseOfferPosted';
      } catch {
        return false;
      }
    });

    if (!event) {
      throw new Error('LeaseOfferPosted event not found');
    }

    const parsedEvent = marketplace.interface.parseLog(event);
    const offerId = parsedEvent!.args[0]; // offerId

    console.log(`  ✓ Lease offer posted with ID: ${offerId}`);

    return {
      offerId,
      transactionHash: receipt.hash
    };
  }

  /**
   * Get balance of mock stablecoin for testing
   */
  async getStablecoinBalance(address: string): Promise<bigint> {
    const deployment = this.getDeployment();
    return await deployment.mockStablecoin.contract.balanceOf(address);
  }

  /**
   * Mint stablecoins for testing
   */
  async mintStablecoins(to: string, amount: bigint): Promise<void> {
    const deployment = this.getDeployment();
    const tx = await deployment.mockStablecoin.contract.mint(to, amount);
    await tx.wait(1);
    console.log(`  ✓ Minted ${ethers.formatEther(amount)} USDC to ${to}`);
  }
}