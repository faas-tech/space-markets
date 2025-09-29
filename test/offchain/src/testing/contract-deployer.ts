/**
 * Contract deployment helper for testing
 *
 * Provides utilities to deploy and interact with Asset Leasing Protocol
 * smart contracts in test environments.
 */

import { ethers } from 'ethers';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import type { AssetMetadata, LeaseAgreement } from '../types/index.js';
import { generateMetadataHash } from '../utils/crypto.js';

export interface DeploymentConfig {
  rpcUrl: string;
  privateKey: string;
  deploymentsDir: string;
  gasPrice?: string;
  gasLimit?: string;
}

export interface DeploymentResult {
  assetRegistry: string;
  marketplace: string;
  leaseFactory: string;
  mockStablecoin: string;
  deploymentBlock: number;
  deployer: string;
  transactionHashes: {
    mockStablecoin: string;
    assetRegistry: string;
    leaseFactory: string;
    marketplace: string;
  };
}

/**
 * Contract deployer for test environments
 */
export class ContractDeployer {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private config: DeploymentConfig;
  private deployment?: DeploymentResult;

  // Contract bytecode and ABIs (simplified for testing)
  private static readonly MOCK_STABLECOIN_BYTECODE = '0x608060405234801561001057600080fd5b50'; // Placeholder
  private static readonly ASSET_REGISTRY_BYTECODE = '0x608060405234801561001057600080fd5b50'; // Placeholder

  // Contract ABIs
  private static readonly MOCK_STABLECOIN_ABI = [
    'constructor(string name, string symbol, uint256 initialSupply)',
    'function mint(address to, uint256 amount) external',
    'function transfer(address to, uint256 amount) external returns (bool)',
    'function approve(address spender, uint256 amount) external returns (bool)',
    'function balanceOf(address account) external view returns (uint256)'
  ];

  private static readonly ASSET_REGISTRY_ABI = [
    'constructor(address admin)',
    'function createAssetType(string name, bytes32 schemaHash, bytes32[] requiredLeaseKeys, string schemaURI) external returns (uint256)',
    'function registerAsset(uint256 typeId, address owner, bytes32 metadataHash, string dataURI, string tokenName, string tokenSymbol, uint256 totalSupply) external returns (uint256, address)',
    'function getAsset(uint256 assetId) external view returns (tuple(uint256 typeId, address issuer, bytes32 metadataHash, string dataURI, address tokenAddress, bool exists))',
    'function getType(uint256 typeId) external view returns (tuple(string name, bytes32 schemaHash, bytes32[] requiredLeaseKeys, string schemaURI, bool exists))'
  ];

  private static readonly MARKETPLACE_ABI = [
    'constructor(address admin, address stablecoin, address leaseFactory)',
    'function postLeaseOffer(tuple(address lessor, address lessee, uint256 assetId, address paymentToken, uint256 totalPayment, uint32 startTime, uint32 endTime, bytes32 termsHash) leaseIntent) external returns (uint256)',
    'function placeLeaseBid(uint256 offerId, bytes sigLessee, uint256 funds) external returns (uint256)',
    'function acceptLeaseBid(uint256 offerId, uint256 bidIndex, bytes sigLessor, string tokenURI) external returns (uint256, uint256)'
  ];

  private static readonly LEASE_FACTORY_ABI = [
    'constructor(address admin, address assetRegistry)',
    'function mintLease(tuple(address lessor, address lessee, uint256 assetId, address paymentToken, uint256 totalPayment, uint32 startTime, uint32 endTime, bytes32 termsHash) leaseIntent, bytes sigLessor, bytes sigLessee, string tokenURI) external returns (uint256)'
  ];

  constructor(config: DeploymentConfig) {
    this.config = config;
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.wallet = new ethers.Wallet(config.privateKey, this.provider);

    // Ensure deployments directory exists
    if (!existsSync(config.deploymentsDir)) {
      mkdirSync(config.deploymentsDir, { recursive: true });
    }
  }

  /**
   * Deploy all contracts in the correct order
   */
  async deployAll(): Promise<DeploymentResult> {
    console.log('Deploying Asset Leasing Protocol contracts...');
    console.log(`Deployer: ${this.wallet.address}`);

    try {
      // Get initial block number
      const deploymentBlock = await this.provider.getBlockNumber();

      // Step 1: Deploy mock stablecoin
      console.log('1. Deploying mock stablecoin...');
      const mockStablecoin = await this.deployMockStablecoin();

      // Step 2: Deploy AssetRegistry
      console.log('2. Deploying AssetRegistry...');
      const assetRegistry = await this.deployAssetRegistry();

      // Step 3: Deploy LeaseFactory
      console.log('3. Deploying LeaseFactory...');
      const leaseFactory = await this.deployLeaseFactory(assetRegistry.address);

      // Step 4: Deploy Marketplace
      console.log('4. Deploying Marketplace...');
      const marketplace = await this.deployMarketplace(
        mockStablecoin.address,
        leaseFactory.address
      );

      this.deployment = {
        assetRegistry: assetRegistry.address,
        marketplace: marketplace.address,
        leaseFactory: leaseFactory.address,
        mockStablecoin: mockStablecoin.address,
        deploymentBlock,
        deployer: this.wallet.address,
        transactionHashes: {
          mockStablecoin: mockStablecoin.txHash,
          assetRegistry: assetRegistry.txHash,
          leaseFactory: leaseFactory.txHash,
          marketplace: marketplace.txHash
        }
      };

      // Save deployment info
      await this.saveDeployment();

      console.log('All contracts deployed successfully!');
      console.log('Deployment addresses:');
      console.log(`  MockStablecoin: ${this.deployment.mockStablecoin}`);
      console.log(`  AssetRegistry: ${this.deployment.assetRegistry}`);
      console.log(`  LeaseFactory: ${this.deployment.leaseFactory}`);
      console.log(`  Marketplace: ${this.deployment.marketplace}`);

      return this.deployment;

    } catch (error) {
      console.error('Deployment failed:', error);
      throw error;
    }
  }

  /**
   * Deploy mock stablecoin contract
   */
  private async deployMockStablecoin(): Promise<{ address: string; txHash: string }> {
    // In a real implementation, this would use actual contract bytecode
    // For testing, we'll create a minimal mock
    const factory = new ethers.ContractFactory(
      ContractDeployer.MOCK_STABLECOIN_ABI,
      ContractDeployer.MOCK_STABLECOIN_BYTECODE || '0x608060405234801561001057600080fd5b50',
      this.wallet
    );

    // Deploy with constructor parameters
    const contract = await factory.deploy(
      'Test USDC',
      'USDC',
      ethers.parseEther('1000000') // 1M tokens
    );

    await contract.waitForDeployment();

    return {
      address: await contract.getAddress(),
      txHash: contract.deploymentTransaction()?.hash || '0x'
    };
  }

  /**
   * Deploy AssetRegistry contract
   */
  private async deployAssetRegistry(): Promise<{ address: string; txHash: string }> {
    const factory = new ethers.ContractFactory(
      ContractDeployer.ASSET_REGISTRY_ABI,
      ContractDeployer.ASSET_REGISTRY_BYTECODE || '0x608060405234801561001057600080fd5b50',
      this.wallet
    );

    const contract = await factory.deploy(this.wallet.address); // Admin
    await contract.waitForDeployment();

    return {
      address: await contract.getAddress(),
      txHash: contract.deploymentTransaction()?.hash || '0x'
    };
  }

  /**
   * Deploy LeaseFactory contract
   */
  private async deployLeaseFactory(assetRegistryAddress: string): Promise<{ address: string; txHash: string }> {
    const factory = new ethers.ContractFactory(
      ContractDeployer.LEASE_FACTORY_ABI,
      ContractDeployer.ASSET_REGISTRY_BYTECODE || '0x608060405234801561001057600080fd5b50',
      this.wallet
    );

    const contract = await factory.deploy(
      this.wallet.address, // Admin
      assetRegistryAddress
    );
    await contract.waitForDeployment();

    return {
      address: await contract.getAddress(),
      txHash: contract.deploymentTransaction()?.hash || '0x'
    };
  }

  /**
   * Deploy Marketplace contract
   */
  private async deployMarketplace(
    stablecoinAddress: string,
    leaseFactoryAddress: string
  ): Promise<{ address: string; txHash: string }> {
    const factory = new ethers.ContractFactory(
      ContractDeployer.MARKETPLACE_ABI,
      ContractDeployer.ASSET_REGISTRY_BYTECODE || '0x608060405234801561001057600080fd5b50',
      this.wallet
    );

    const contract = await factory.deploy(
      this.wallet.address, // Admin
      stablecoinAddress,
      leaseFactoryAddress
    );
    await contract.waitForDeployment();

    return {
      address: await contract.getAddress(),
      txHash: contract.deploymentTransaction()?.hash || '0x'
    };
  }

  /**
   * Save deployment information to file
   */
  private async saveDeployment(): Promise<void> {
    if (!this.deployment) {
      throw new Error('No deployment to save');
    }

    const deploymentFile = join(this.config.deploymentsDir, 'deployment.json');
    const configFile = join(this.config.deploymentsDir, 'test-config.json');

    // Save detailed deployment info
    writeFileSync(deploymentFile, JSON.stringify(this.deployment, null, 2));

    // Save test configuration
    const testConfig = {
      network: 'anvil',
      rpcUrl: this.config.rpcUrl,
      privateKey: this.config.privateKey,
      contracts: {
        assetRegistry: this.deployment.assetRegistry,
        marketplace: this.deployment.marketplace,
        leaseFactory: this.deployment.leaseFactory,
        mockStablecoin: this.deployment.mockStablecoin
      }
    };

    writeFileSync(configFile, JSON.stringify(testConfig, null, 2));

    console.log(`Deployment info saved to ${deploymentFile}`);
    console.log(`Test config saved to ${configFile}`);
  }

  /**
   * Load existing deployment
   */
  async loadDeployment(): Promise<DeploymentResult | null> {
    const deploymentFile = join(this.config.deploymentsDir, 'deployment.json');

    if (!existsSync(deploymentFile)) {
      return null;
    }

    try {
      const data = readFileSync(deploymentFile, 'utf-8');
      this.deployment = JSON.parse(data);
      return this.deployment!;
    } catch (error) {
      console.error('Failed to load deployment:', error);
      return null;
    }
  }

  /**
   * Register an asset type on-chain
   */
  async registerAssetType(
    name: string,
    schemaUri: string,
    requiredLeaseKeys: string[]
  ): Promise<{
    success: boolean;
    typeId?: number;
    txHash?: string;
    error?: string;
  }> {
    if (!this.deployment) {
      return { success: false, error: 'Contracts not deployed' };
    }

    try {
      const contract = new ethers.Contract(
        this.deployment.assetRegistry,
        ContractDeployer.ASSET_REGISTRY_ABI,
        this.wallet
      );

      // Generate schema hash and lease key hashes
      const schemaHash = ethers.keccak256(ethers.toUtf8Bytes(schemaUri));
      const leaseKeyHashes = requiredLeaseKeys.map(key =>
        ethers.keccak256(ethers.toUtf8Bytes(key))
      );

      const tx = await contract.createAssetType(
        name,
        schemaHash,
        leaseKeyHashes,
        schemaUri
      );

      const receipt = await tx.wait();

      // Parse the event to get type ID
      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed?.name === 'AssetTypeCreated';
        } catch {
          return false;
        }
      });

      let typeId = 1; // Default for first type
      if (event) {
        const parsed = contract.interface.parseLog(event);
        typeId = Number(parsed!.args.typeId);
      }

      return {
        success: true,
        typeId,
        txHash: tx.hash
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Register an asset on-chain
   */
  async registerAsset(
    metadata: AssetMetadata,
    typeId: number,
    tokenName: string,
    tokenSymbol: string
  ): Promise<{
    success: boolean;
    assetId?: number;
    tokenAddress?: string;
    txHash?: string;
    error?: string;
  }> {
    if (!this.deployment) {
      return { success: false, error: 'Contracts not deployed' };
    }

    try {
      const contract = new ethers.Contract(
        this.deployment.assetRegistry,
        ContractDeployer.ASSET_REGISTRY_ABI,
        this.wallet
      );

      // Generate metadata hash
      const metadataHashResult = generateMetadataHash(metadata);
      const dataURI = `ipfs://metadata/${metadata.assetId}.json`;

      const tx = await contract.registerAsset(
        typeId,
        this.wallet.address, // Owner
        metadataHashResult.hash,
        dataURI,
        tokenName,
        tokenSymbol,
        ethers.parseEther('10000') // 10,000 tokens
      );

      const receipt = await tx.wait();

      // Parse the event to get asset ID and token address
      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed?.name === 'AssetRegistered';
        } catch {
          return false;
        }
      });

      let assetId = 1;
      let tokenAddress = '0x0000000000000000000000000000000000000000';

      if (event) {
        const parsed = contract.interface.parseLog(event);
        assetId = Number(parsed!.args.assetId);
        tokenAddress = parsed!.args.tokenAddress;
      }

      return {
        success: true,
        assetId,
        tokenAddress,
        txHash: tx.hash
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Post a lease offer on the marketplace
   */
  async postLeaseOffer(
    assetId: number,
    leaseAgreement: LeaseAgreement
  ): Promise<{
    success: boolean;
    offerId?: number;
    txHash?: string;
    error?: string;
  }> {
    if (!this.deployment) {
      return { success: false, error: 'Contracts not deployed' };
    }

    try {
      const contract = new ethers.Contract(
        this.deployment.marketplace,
        ContractDeployer.MARKETPLACE_ABI,
        this.wallet
      );

      // Create lease intent structure
      const leaseIntent = {
        lessor: this.wallet.address,
        lessee: ethers.ZeroAddress, // Open offer
        assetId,
        paymentToken: this.deployment.mockStablecoin,
        totalPayment: ethers.parseEther(leaseAgreement.terms.paymentAmount),
        startTime: Math.floor(new Date(leaseAgreement.terms.startDate).getTime() / 1000),
        endTime: Math.floor(new Date(leaseAgreement.terms.endDate).getTime() / 1000),
        termsHash: generateMetadataHash(leaseAgreement.terms).hash
      };

      const tx = await contract.postLeaseOffer(leaseIntent);
      const receipt = await tx.wait();

      // Parse event to get offer ID
      let offerId = 1;
      // In a real implementation, parse the event logs

      return {
        success: true,
        offerId,
        txHash: tx.hash
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Place a bid on a lease offer
   */
  async placeLeaseBid(
    offerId: number,
    lesseePrivateKey: string,
    funds: string
  ): Promise<{
    success: boolean;
    bidIndex?: number;
    txHash?: string;
    error?: string;
  }> {
    if (!this.deployment) {
      return { success: false, error: 'Contracts not deployed' };
    }

    try {
      // Create lessee wallet
      const lesseeWallet = new ethers.Wallet(lesseePrivateKey, this.provider);

      // First, mint and approve stablecoin for the lessee
      await this.fundAccount(lesseeWallet.address, funds);

      const stablecoinContract = new ethers.Contract(
        this.deployment.mockStablecoin,
        ContractDeployer.MOCK_STABLECOIN_ABI,
        lesseeWallet
      );

      const marketplaceContract = new ethers.Contract(
        this.deployment.marketplace,
        ContractDeployer.MARKETPLACE_ABI,
        lesseeWallet
      );

      // Approve marketplace to spend stablecoin
      const approveTx = await stablecoinContract.approve(
        this.deployment.marketplace,
        ethers.parseEther(funds)
      );
      await approveTx.wait();

      // Create signature (simplified for testing)
      const signature = '0x' + '00'.repeat(65);

      // Place bid
      const tx = await marketplaceContract.placeLeaseBid(
        offerId,
        signature,
        ethers.parseEther(funds)
      );

      await tx.wait();

      return {
        success: true,
        bidIndex: 0, // First bid
        txHash: tx.hash
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Accept a lease bid
   */
  async acceptLeaseBid(
    offerId: number,
    bidIndex: number,
    lessorPrivateKey: string
  ): Promise<{
    success: boolean;
    leaseTokenId?: number;
    txHash?: string;
    error?: string;
  }> {
    if (!this.deployment) {
      return { success: false, error: 'Contracts not deployed' };
    }

    try {
      const lessorWallet = new ethers.Wallet(lessorPrivateKey, this.provider);

      const contract = new ethers.Contract(
        this.deployment.marketplace,
        ContractDeployer.MARKETPLACE_ABI,
        lessorWallet
      );

      // Create signature (simplified for testing)
      const signature = '0x' + '00'.repeat(65);
      const tokenURI = 'ipfs://lease-metadata/lease-1.json';

      const tx = await contract.acceptLeaseBid(
        offerId,
        bidIndex,
        signature,
        tokenURI
      );

      await tx.wait();

      return {
        success: true,
        leaseTokenId: 1, // Simplified
        txHash: tx.hash
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Fund an account with mock stablecoin
   */
  async fundAccount(address: string, amount: string): Promise<void> {
    if (!this.deployment) {
      throw new Error('Contracts not deployed');
    }

    const contract = new ethers.Contract(
      this.deployment.mockStablecoin,
      ContractDeployer.MOCK_STABLECOIN_ABI,
      this.wallet
    );

    const tx = await contract.mint(address, ethers.parseEther(amount));
    await tx.wait();
  }

  /**
   * Get deployment info
   */
  getDeployment(): DeploymentResult | undefined {
    return this.deployment;
  }

  /**
   * Get contract instance
   */
  getContract(contractName: keyof DeploymentResult['transactionHashes']): ethers.Contract {
    if (!this.deployment) {
      throw new Error('Contracts not deployed');
    }

    const address = this.deployment[contractName];
    let abi: any[];

    switch (contractName) {
      case 'assetRegistry':
        abi = ContractDeployer.ASSET_REGISTRY_ABI;
        break;
      case 'marketplace':
        abi = ContractDeployer.MARKETPLACE_ABI;
        break;
      case 'leaseFactory':
        abi = ContractDeployer.LEASE_FACTORY_ABI;
        break;
      case 'mockStablecoin':
        abi = ContractDeployer.MOCK_STABLECOIN_ABI;
        break;
      default:
        throw new Error(`Unknown contract: ${contractName}`);
    }

    return new ethers.Contract(address, abi, this.wallet);
  }
}