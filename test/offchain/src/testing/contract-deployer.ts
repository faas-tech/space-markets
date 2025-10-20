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

    // Deploy MockStablecoin first (no constructor parameters needed)
    const mockStablecoin = await this.deployContract('MockStablecoin', []);

    // Deploy AssetRegistry (needs admin and registrar roles)
    const assetRegistry = await this.deployContract('AssetRegistry', [
      this.wallet.address, // admin role
      this.wallet.address  // registrar role (same wallet for simplicity)
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
   * Register an asset type onchain using the new createAsset interface
   *
   * New signature: createAsset(name, schemaHash, requiredLeaseKeys, metadata[])
   *
   * @param name Human-readable asset type name (e.g., "Satellite")
   * @param schemaHash Schema hash (bytes32)
   * @param requiredLeaseKeys Array of required lease key hashes (will be converted to bytes32)
   * @param schemaURI Optional schema URI (will be added to metadata array)
   * @returns Schema hash (used as type ID) and transaction hash
   */
  async registerAssetType(
    name: string,
    schemaHash: string,
    requiredLeaseKeys: string[] = [],
    schemaURI: string = ''
  ): Promise<{ typeId: string; transactionHash: string }> {
    const deployment = this.getDeployment();
    const registry = deployment.assetRegistry.contract;

    console.log(`Creating asset type: ${name}`);
    console.log(`  Schema hash: ${schemaHash}`);

    // Convert string keys to bytes32
    const bytes32Keys = requiredLeaseKeys.map(key =>
      ethers.encodeBytes32String(key)
    );

    // Build metadata array - include schemaURI if provided
    const metadata: Array<{ key: string; value: string }> = [];
    if (schemaURI) {
      metadata.push({ key: 'schemaURI', value: schemaURI });
    }

    const tx = await registry.createAsset(
      name,
      schemaHash,  // Pass schemaHash directly (already bytes32)
      bytes32Keys,
      metadata
    );

    const receipt = await tx.wait(1);

    // Parse the AssetTypeCreated event
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
    // Return schemaHash as the typeId (this is what identifies the type)
    const typeIdFromEvent = parsedEvent!.args[1]; // schemaHash is 2nd arg

    console.log(`  ✓ Asset type created: ${name}`);
    console.log(`    Type ID (schemaHash): ${typeIdFromEvent}`);

    return {
      typeId: typeIdFromEvent,
      transactionHash: receipt.hash
    };
  }

  /**
   * Register an asset onchain using the new interface
   *
   * New signature: registerAsset(schemaHash, tokenName, tokenSymbol, totalSupply, admin, tokenRecipient, metadata[])
   *
   * @param schemaHash The asset type schema hash
   * @param tokenName ERC-20 token name
   * @param tokenSymbol ERC-20 token symbol
   * @param totalSupply Total token supply (100% ownership)
   * @param metadata Array of Metadata structs [{key: string, value: string}]
   * @returns Asset ID, token address, and transaction hash
   */
  async registerAsset(
    schemaHash: string,
    tokenName: string,
    tokenSymbol: string,
    totalSupply: bigint,
    metadata: Array<{ key: string; value: string }>
  ): Promise<{ assetId: bigint; tokenAddress: string; transactionHash: string }> {
    const deployment = this.getDeployment();
    const registry = deployment.assetRegistry.contract;
    const registryAddr = await registry.getAddress();

    console.log(`Registering asset: ${tokenName} (${tokenSymbol})`);
    console.log(`  Schema hash: ${schemaHash}`);
    console.log(`  Total supply: ${ethers.formatEther(totalSupply)} tokens`);
    console.log(`  AssetRegistry (admin): ${registryAddr}`);
    console.log(`  Token recipient: ${this.wallet.address}`);

    const tx = await registry.registerAsset(
      schemaHash,           // schemaHash
      tokenName,            // tokenName
      tokenSymbol,          // tokenSymbol
      totalSupply,          // totalSupply
      registryAddr,         // admin - AssetRegistry needs this role to set metadata
      this.wallet.address,  // tokenRecipient - receives 100% of tokens
      metadata              // metadata array
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
    const assetId = parsedEvent!.args[0];        // assetId
    const tokenAddress = parsedEvent!.args[2];   // tokenAddress (3rd arg in new event)

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