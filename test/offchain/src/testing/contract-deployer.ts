/**
 * Contract Deployer for Integration Testing
 *
 * Deploys compiled smart contracts to a local Anvil instance.
 * Uses compiled bytecode from Foundry artifacts and performs
 * actual blockchain transactions with verifiable results.
 */

import { ethers, NonceManager } from 'ethers';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { LeaseAgreement, PaymentSchedule } from '../types/index.js';
type MetadataEntry = { key: string; value: string };

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
  assetERC20Implementation: DeployedContract;
  assetRegistryImplementation?: DeployedContract;
  leaseFactoryImplementation?: DeployedContract;
  marketplaceImplementation?: DeployedContract;
  deploymentBlock: number;
  deployer: string;
  chainId: number;
}

export class ContractDeployer {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private signer: ethers.Signer;
  private deployment?: DeploymentResult;

  constructor(
    private rpcUrl: string,
    private privateKey: string
  ) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    this.signer = new NonceManager(this.wallet);
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

    // Deploy contract
    const contract = await factory.deploy(...constructorArgs);

    // Wait for deployment transaction to be mined
    const deployTx = await contract.deploymentTransaction()!.wait(1);

    if (!deployTx) {
      throw new Error(`Failed to deploy ${contractName}`);
    }

    const deployedAddress = await contract.getAddress();

    console.log(`    ✓ ${contractName} deployed at ${deployedAddress}`);
    console.log(`      Block: ${deployTx.blockNumber}, Tx: ${deployTx.hash}`);
    await this.logNonceState(`${contractName} deploy`);

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

    // Deploy supporting contracts
    const mockStablecoin = await this.deployContract('MockStablecoin', []);
    const assetERC20Implementation = await this.deployContract('AssetERC20', []);

    // Deploy core contracts (no constructor args, use initializer)
    const assetRegistryImpl = await this.deployContract('AssetRegistry', []);
    const leaseFactoryImpl = await this.deployContract('LeaseFactory', []);
    const marketplaceImpl = await this.deployContract('Marketplace', []);

    const assetRegistryInit = assetRegistryImpl.contract.interface.encodeFunctionData('initialize', [
      this.wallet.address,
      this.wallet.address,
      this.wallet.address,
      assetERC20Implementation.address
    ]);

    const assetRegistryProxy = await this.deployContract('ERC1967Proxy', [
      assetRegistryImpl.address,
      assetRegistryInit
    ]);
    const assetRegistryContract = assetRegistryImpl.contract.attach(assetRegistryProxy.address);
    const assetRegistry: DeployedContract = {
      address: assetRegistryProxy.address,
      transactionHash: assetRegistryProxy.transactionHash,
      blockNumber: assetRegistryProxy.blockNumber,
      contract: assetRegistryContract
    };

    const leaseFactoryInit = leaseFactoryImpl.contract.interface.encodeFunctionData('initialize', [
      this.wallet.address,
      this.wallet.address,
      assetRegistry.address
    ]);

    const leaseFactoryProxy = await this.deployContract('ERC1967Proxy', [
      leaseFactoryImpl.address,
      leaseFactoryInit
    ]);
    const leaseFactoryContract = leaseFactoryImpl.contract.attach(leaseFactoryProxy.address);
    const leaseFactory: DeployedContract = {
      address: leaseFactoryProxy.address,
      transactionHash: leaseFactoryProxy.transactionHash,
      blockNumber: leaseFactoryProxy.blockNumber,
      contract: leaseFactoryContract
    };

    const marketplaceInit = marketplaceImpl.contract.interface.encodeFunctionData('initialize', [
      this.wallet.address,
      this.wallet.address,
      mockStablecoin.address,
      leaseFactory.address
    ]);

    const marketplaceProxy = await this.deployContract('ERC1967Proxy', [
      marketplaceImpl.address,
      marketplaceInit
    ]);
    const marketplaceContract = marketplaceImpl.contract.attach(marketplaceProxy.address);
    const marketplace: DeployedContract = {
      address: marketplaceProxy.address,
      transactionHash: marketplaceProxy.transactionHash,
      blockNumber: marketplaceProxy.blockNumber,
      contract: marketplaceContract
    };

    // Store deployment result
    this.deployment = {
      assetRegistry,
      marketplace,
      leaseFactory,
      mockStablecoin,
      assetERC20Implementation,
      assetRegistryImplementation: assetRegistryImpl,
      leaseFactoryImplementation: leaseFactoryImpl,
      marketplaceImplementation: marketplaceImpl,
      deploymentBlock,
      deployer: this.wallet.address,
      chainId
    };

    console.log('\n✅ All contracts deployed successfully!');
    console.log('Deployment Summary:');
    console.log(`  MockStablecoin: ${mockStablecoin.address}`);
    console.log(`  AssetERC20 Impl: ${assetERC20Implementation.address}`);
    console.log(`  AssetRegistry:  ${assetRegistry.address}`);
    console.log(`  LeaseFactory:   ${leaseFactory.address}`);
    console.log(`  Marketplace:    ${marketplace.address}`);

    // Sync nonce manager with the latest onchain nonce after raw deployments
    await this.syncNonce();

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
   * Expose the underlying provider for downstream utilities
   */
  getProvider(): ethers.JsonRpcProvider {
    return this.provider;
  }

  /**
   * Bring the nonce manager back in sync with the network
   */
  async syncNonce(): Promise<void> {
    this.signer = new NonceManager(this.wallet);
    await (this.signer as NonceManager).getNonce('pending');
  }

  /**
   * Return the current chain id (uses cached deployment when possible)
   */
  async getChainId(): Promise<number> {
    if (this.deployment) {
      return this.deployment.chainId;
    }
    const network = await this.provider.getNetwork();
    return Number(network.chainId);
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
    schemaIdentifier: string,
    requiredLeaseKeys: string[] = [],
    schemaURI: string = ''
  ): Promise<{ typeId: string; transactionHash: string }> {
    const deployment = this.getDeployment();
    const registry = deployment.assetRegistry.contract;
    const registryWithSigner = registry.connect(this.signer);

    const schemaHash = this.ensureBytes32(schemaIdentifier);

    console.log(`Creating asset type: ${name}`);
    console.log(`  Schema hash: ${schemaHash}`);

    const bytes32Keys = requiredLeaseKeys.map(key =>
      ethers.encodeBytes32String(key)
    );

    const metadata: MetadataEntry[] = [];
    if (schemaURI) {
      metadata.push({ key: 'schemaURI', value: schemaURI });
    }

    const tx = await registryWithSigner.createAssetType(
      name,
      schemaHash,
      bytes32Keys,
      metadata
    );

    const receipt = await tx.wait(1);
    await this.logNonceState('registerAssetType');

    console.log(`  ✓ Asset type created: ${name}`);
    console.log(`    Type ID (schemaHash): ${schemaHash}`);

    return {
      typeId: schemaHash,
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
    schemaIdentifier: string,
    metadataHash: string,
    dataURI: string,
    tokenName: string,
    tokenSymbol: string,
    totalSupply: bigint,
    options?: {
      admin?: string;
      upgrader?: string;
      tokenRecipient?: string;
      additionalMetadata?: Record<string, string>;
    }
  ): Promise<{
    assetId: bigint;
    tokenAddress: string;
    transactionHash: string;
    registryAddress: string;
    blockNumber: number;
    metadataHash: string;
    dataURI: string;
  }> {
    const deployment = this.getDeployment();
    const registry = deployment.assetRegistry.contract;
    const registryWithSigner = registry.connect(this.signer);
    const registryAddr = await registry.getAddress();
    const schemaHash = this.ensureBytes32(schemaIdentifier);

    const admin = options?.admin ?? registryAddr;
    const upgrader = options?.upgrader ?? this.wallet.address;
    const tokenRecipient = options?.tokenRecipient ?? this.wallet.address;

    const metadata: MetadataEntry[] = [
      { key: 'metadataHash', value: metadataHash },
      { key: 'dataURI', value: dataURI },
      ...this.formatMetadataEntries(options?.additionalMetadata)
    ];

    console.log(`Registering asset: ${tokenName} (${tokenSymbol})`);
    console.log(`  Schema hash: ${schemaHash}`);
    console.log(`  Total supply: ${ethers.formatEther(totalSupply)} tokens`);
    console.log(`  Token recipient: ${tokenRecipient}`);

    const tx = await registryWithSigner.registerAsset(
      schemaHash,
      tokenName,
      tokenSymbol,
      totalSupply,
      admin,
      upgrader,
      tokenRecipient,
      metadata
    );

    const receipt = await tx.wait(1);
    await this.logNonceState('registerAsset');

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
    const assetId = parsedEvent!.args[0];
    const tokenAddress = parsedEvent!.args[2];

    console.log(`  ✓ Asset registered with ID: ${assetId}`);
    console.log(`    Token address: ${tokenAddress}`);

    return {
      assetId,
      tokenAddress,
      transactionHash: receipt.hash,
      registryAddress: registryAddr,
      blockNumber: receipt.blockNumber ?? 0,
      metadataHash,
      dataURI
    };
  }

  /**
   * Verify asset exists onchain by querying the contract
   * This provides independent verification
   */
  async verifyAssetOnChain(assetId: bigint): Promise<{
    exists: boolean;
    assetType?: string;
    issuer?: string;
    tokenAddress?: string;
  }> {
    const deployment = this.getDeployment();
    const registry = deployment.assetRegistry.contract;

    try {
      const asset = await registry.getAsset(assetId);

      return {
        exists: asset.tokenAddress !== ethers.ZeroAddress,
        assetType: asset.assetType,
        issuer: asset.issuer,
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
  async postLeaseOffer(options: {
    assetId: bigint;
    paymentAmount: bigint;
    startTime: number;
    endTime: number;
    termsHash: string;
    leaseAgreement?: LeaseAgreement;
  }): Promise<{ offerId: bigint; transactionHash: string }> {
    const { assetId, paymentAmount, startTime, endTime, termsHash, leaseAgreement } = options;
    const deployment = this.getDeployment();
    const marketplace = deployment.marketplace.contract.connect(this.signer);

    console.log(`Posting lease offer for asset ${assetId}`);

    const termsHashBytes32 = this.ensureBytes32(termsHash);
    const assetData = await deployment.assetRegistry.contract.getAsset(assetId);
    const nowSeconds = Math.floor(Date.now() / 1000);
    const defaultDeadline = Math.max(startTime - 300, nowSeconds + 600);
    const leaseDeadline = BigInt(defaultDeadline);
    const rentPeriodSeconds = this.deriveRentPeriodSeconds(
      startTime,
      endTime,
      leaseAgreement?.terms?.paymentSchedule
    );
    const rentPeriod = BigInt(rentPeriodSeconds);
    const securityDeposit = paymentAmount / 10n;
    const legalDocHash = this.ensureBytes32(leaseAgreement?.legalDocument?.hash || termsHash);
    const leaseMetadata = this.buildLeaseMetadata(leaseAgreement);
    const lessee = leaseAgreement?.lesseeAddress ?? ethers.ZeroAddress;
    const termsVersion = leaseAgreement?.metadata?.version
      ? Number.parseInt(leaseAgreement.metadata.version.split('.')[0] || '1', 10)
      : 1;

    const leaseIntent = {
      deadline: leaseDeadline,
      assetType: assetData.assetType,
      lease: {
        lessor: this.wallet.address,
        lessee,
        assetId,
        paymentToken: deployment.mockStablecoin.address,
        rentAmount: paymentAmount,
        rentPeriod,
        securityDeposit,
        startTime: BigInt(startTime),
        endTime: BigInt(endTime),
        legalDocHash,
        termsVersion,
        metadata: leaseMetadata
      }
    };

    const tx = await marketplace.postLeaseOffer(leaseIntent);
    const receipt = await tx.wait(1);
    await this.logNonceState('postLeaseOffer');

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
    const tx = await deployment.mockStablecoin.contract.connect(this.signer).mint(to, amount);
    await tx.wait(1);
    console.log(`  ✓ Minted ${ethers.formatEther(amount)} USDC to ${to}`);
    await this.logNonceState('mintStablecoins');
  }

  private async logNonceState(context: string): Promise<void> {
    if (!process.env.DEBUG_NONCE) {
      return;
    }
    const latest = await this.provider.getTransactionCount(this.wallet.address, 'latest');
    const pending = await this.provider.getTransactionCount(this.wallet.address, 'pending');
    console.log(`[nonce] ${context}: latest=${latest} pending=${pending}`);
  }

  private ensureBytes32(value: string): string {
    if (value.startsWith('0x') && value.length === 66) {
      return value;
    }
    return ethers.id(value);
  }

  private deriveRentPeriodSeconds(
    startTime: number,
    endTime: number,
    schedule?: PaymentSchedule
  ): number {
    const day = 24 * 60 * 60;
    switch (schedule) {
      case 'monthly':
        return 30 * day;
      case 'quarterly':
        return 90 * day;
      case 'annual':
        return 365 * day;
      case 'upfront':
        return Math.max(endTime - startTime, day);
      default:
        return Math.max(Math.floor((endTime - startTime) / 4), day);
    }
  }

  private buildLeaseMetadata(leaseAgreement?: LeaseAgreement): MetadataEntry[] {
    if (!leaseAgreement) {
      return [];
    }

    const metadata: MetadataEntry[] = [];
    const push = (key: string, value: unknown) => {
      if (value === undefined || value === null) return;
      metadata.push({
        key,
        value: Array.isArray(value) ? JSON.stringify(value) : String(value)
      });
    };

    push('leaseId', leaseAgreement.leaseId);
    push('leaseStatus', leaseAgreement.status);
    push('paymentSchedule', leaseAgreement.terms.paymentSchedule);
    push('paymentAmount', leaseAgreement.terms.paymentAmount);
    push('currency', leaseAgreement.terms.currency);
    push('restrictions', leaseAgreement.terms.restrictions?.join(','));
    push('legalDocUri', leaseAgreement.legalDocument?.uri);
    push('metadataVersion', leaseAgreement.metadata.version);

    if (leaseAgreement.terms.specificTerms) {
      Object.entries(leaseAgreement.terms.specificTerms).forEach(([key, value]) => {
        push(`terms.${key}`, value);
      });
    }

    return metadata;
  }

  private formatMetadataEntries(additional?: Record<string, string>): MetadataEntry[] {
    if (!additional) {
      return [];
    }
    return Object.entries(additional).map(([key, value]) => ({
      key,
      value
    }));
  }
}