/**
 * Blockchain integration utilities for Asset Leasing Protocol
 *
 * Provides utilities to interact with deployed smart contracts
 * and sync off-chain data with on-chain state.
 */

import { ethers } from 'ethers';
import type { ContractAddresses, AssetMetadata, LeaseAgreement, TestConfiguration } from '../types/index.js';
import { generateMetadataHash, generateRequiredLeaseKeys, generateSchemaHash } from '../utils/crypto.js';

/**
 * Asset Registry contract ABI (minimal interface)
 */
const ASSET_REGISTRY_ABI = [
  'function createAssetType(string name, bytes32 schemaHash, bytes32[] requiredLeaseKeys, string schemaURI) external returns (uint256)',
  'function registerAsset(uint256 typeId, address owner, bytes32 metadataHash, string dataURI, string tokenName, string tokenSymbol, uint256 totalSupply) external returns (uint256, address)',
  'function getAsset(uint256 assetId) external view returns (tuple(uint256 typeId, address issuer, bytes32 metadataHash, string dataURI, address tokenAddress, bool exists))',
  'function getType(uint256 typeId) external view returns (tuple(string name, bytes32 schemaHash, bytes32[] requiredLeaseKeys, string schemaURI, bool exists))',
  'function assetExists(uint256 assetId) external view returns (bool)',
  'event AssetTypeCreated(uint256 indexed typeId, string name, bytes32 schemaHash, bytes32[] requiredLeaseKeys, string schemaURI)',
  'event AssetRegistered(uint256 indexed assetId, uint256 indexed typeId, address tokenAddress)'
];

/**
 * Marketplace contract ABI (minimal interface)
 */
const MARKETPLACE_ABI = [
  'function postSale(address tokenAddress, uint256 amount, uint256 pricePerToken) external returns (uint256)',
  'function postLeaseOffer(uint256 assetId, bytes32 leaseTermsHash, uint256 totalPayment, uint32 startTime, uint32 endTime) external returns (uint256)',
  'function acceptLeaseBid(uint256 offerId, bytes32 leaseTermsHash, bytes signature) external',
  'event SalePosted(uint256 indexed saleId, address indexed seller, address indexed tokenAddress, uint256 amount, uint256 pricePerToken)',
  'event LeaseOfferPosted(uint256 indexed offerId, uint256 indexed assetId, address indexed offeror, bytes32 leaseTermsHash)',
  'event LeaseBidAccepted(uint256 indexed offerId, address indexed bidder, uint256 paymentAmount, uint256 leaseId)'
];

/**
 * Blockchain integration manager
 */
export class BlockchainIntegration {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private contracts: {
    assetRegistry: ethers.Contract;
    marketplace: ethers.Contract;
  };

  constructor(config: TestConfiguration) {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.wallet = new ethers.Wallet(config.privateKey, this.provider);

    this.contracts = {
      assetRegistry: new ethers.Contract(
        config.contracts.assetRegistry,
        ASSET_REGISTRY_ABI,
        this.wallet
      ),
      marketplace: new ethers.Contract(
        config.contracts.marketplace,
        MARKETPLACE_ABI,
        this.wallet
      )
    };
  }

  /**
   * Create asset types on-chain that match our off-chain schemas
   */
  async createAssetTypes(): Promise<{
    satellite: { typeId: number; txHash: string };
    orbital_compute: { typeId: number; txHash: string };
    orbital_relay: { typeId: number; txHash: string };
  }> {
    console.log('Creating asset types on-chain...');

    // Satellite asset type
    const satelliteKeys = generateRequiredLeaseKeys([
      'lease.orbital_period_hours',
      'lease.communication_frequency_ghz',
      'lease.coverage_area_km2',
      'lease.imaging_resolution_m'
    ]);

    const satelliteTx = await this.contracts.assetRegistry.createAssetType(
      'Satellite',
      generateSchemaHash({ type: 'satellite', version: '1.0.0' }),
      satelliteKeys,
      'ipfs://QmSatelliteSchemaV1/satellite-schema.json'
    );
    await satelliteTx.wait();
    const satelliteTypeId = 1; // First type created

    // Orbital compute asset type
    const computeKeys = generateRequiredLeaseKeys([
      'lease.compute_cores',
      'lease.storage_tb',
      'lease.bandwidth_gbps',
      'lease.power_consumption_kw'
    ]);

    const computeTx = await this.contracts.assetRegistry.createAssetType(
      'Orbital Compute Station',
      generateSchemaHash({ type: 'orbital_compute', version: '1.0.0' }),
      computeKeys,
      'ipfs://QmOrbitalComputeSchemaV1/compute-schema.json'
    );
    await computeTx.wait();
    const computeTypeId = 2;

    // Orbital relay asset type
    const relayKeys = generateRequiredLeaseKeys([
      'lease.relay_channels',
      'lease.max_throughput_gbps',
      'lease.coverage_area_km2',
      'lease.signal_power_dbm'
    ]);

    const relayTx = await this.contracts.assetRegistry.createAssetType(
      'Orbital Relay Station',
      generateSchemaHash({ type: 'orbital_relay', version: '1.0.0' }),
      relayKeys,
      'ipfs://QmOrbitalRelaySchemaV1/relay-schema.json'
    );
    await relayTx.wait();
    const relayTypeId = 3;

    console.log('Asset types created successfully');

    return {
      satellite: { typeId: satelliteTypeId, txHash: satelliteTx.hash },
      orbital_compute: { typeId: computeTypeId, txHash: computeTx.hash },
      orbital_relay: { typeId: relayTypeId, txHash: relayTx.hash }
    };
  }

  /**
   * Register an asset on-chain using off-chain metadata
   */
  async registerAsset(
    metadata: AssetMetadata,
    typeId: number,
    tokenName: string,
    tokenSymbol: string,
    totalSupply: string = '10000000000000000000000' // 10,000 tokens with 18 decimals
  ): Promise<{
    success: boolean;
    assetId?: number;
    tokenAddress?: string;
    txHash?: string;
    error?: string;
  }> {
    try {
      console.log(`Registering asset: ${metadata.name}`);

      // Generate metadata hash
      const metadataHashResult = generateMetadataHash(metadata);
      const dataURI = `ipfs://metadata/${metadata.assetId}.json`;

      // Register asset on-chain
      const tx = await this.contracts.assetRegistry.registerAsset(
        typeId,
        this.wallet.address, // Owner
        metadataHashResult.hash,
        dataURI,
        tokenName,
        tokenSymbol,
        totalSupply
      );

      const receipt = await tx.wait();

      // Parse the AssetRegistered event to get the asset ID
      const assetRegisteredEvent = receipt.logs.find((log: any) => {
        try {
          const parsed = this.contracts.assetRegistry.interface.parseLog(log);
          return parsed?.name === 'AssetRegistered';
        } catch {
          return false;
        }
      });

      if (!assetRegisteredEvent) {
        throw new Error('AssetRegistered event not found in transaction logs');
      }

      const parsedEvent = this.contracts.assetRegistry.interface.parseLog(assetRegisteredEvent);
      const assetId = Number(parsedEvent!.args.assetId);
      const tokenAddress = parsedEvent!.args.tokenAddress;

      console.log(`Asset registered successfully: ID ${assetId}, Token: ${tokenAddress}`);

      return {
        success: true,
        assetId,
        tokenAddress,
        txHash: tx.hash
      };
    } catch (error) {
      console.error('Error registering asset:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Verify that on-chain asset metadata hash matches off-chain data
   */
  async verifyAssetMetadata(assetId: number, metadata: AssetMetadata): Promise<{
    success: boolean;
    matches: boolean;
    onChainHash?: string;
    offChainHash?: string;
    error?: string;
  }> {
    try {
      // Get on-chain asset data
      const onChainAsset = await this.contracts.assetRegistry.getAsset(assetId);

      if (!onChainAsset.exists) {
        return {
          success: false,
          matches: false,
          error: 'Asset does not exist on-chain'
        };
      }

      // Generate off-chain hash
      const offChainHashResult = generateMetadataHash(metadata);

      // Compare hashes
      const matches = onChainAsset.metadataHash.toLowerCase() === offChainHashResult.hash.toLowerCase();

      return {
        success: true,
        matches,
        onChainHash: onChainAsset.metadataHash,
        offChainHash: offChainHashResult.hash
      };
    } catch (error) {
      return {
        success: false,
        matches: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Create a lease offer on the marketplace
   */
  async createLeaseOffer(
    lease: LeaseAgreement,
    assetId: number
  ): Promise<{
    success: boolean;
    offerId?: number;
    txHash?: string;
    error?: string;
  }> {
    try {
      console.log(`Creating lease offer for asset ${assetId}`);

      // Generate lease terms hash
      const leaseTermsHash = generateMetadataHash(lease.terms).hash;

      // Convert dates to Unix timestamps
      const startTime = Math.floor(new Date(lease.terms.startDate).getTime() / 1000);
      const endTime = Math.floor(new Date(lease.terms.endDate).getTime() / 1000);

      // Post lease offer
      const tx = await this.contracts.marketplace.postLeaseOffer(
        assetId,
        leaseTermsHash,
        lease.terms.paymentAmount,
        startTime,
        endTime
      );

      const receipt = await tx.wait();

      // Parse the LeaseOfferPosted event to get the offer ID
      const offerPostedEvent = receipt.logs.find((log: any) => {
        try {
          const parsed = this.contracts.marketplace.interface.parseLog(log);
          return parsed?.name === 'LeaseOfferPosted';
        } catch {
          return false;
        }
      });

      if (!offerPostedEvent) {
        throw new Error('LeaseOfferPosted event not found in transaction logs');
      }

      const parsedEvent = this.contracts.marketplace.interface.parseLog(offerPostedEvent);
      const offerId = Number(parsedEvent!.args.offerId);

      console.log(`Lease offer created successfully: ID ${offerId}`);

      return {
        success: true,
        offerId,
        txHash: tx.hash
      };
    } catch (error) {
      console.error('Error creating lease offer:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get network information
   */
  async getNetworkInfo(): Promise<{
    chainId: number;
    blockNumber: number;
    gasPrice: string;
    balance: string;
  }> {
    const network = await this.provider.getNetwork();
    const blockNumber = await this.provider.getBlockNumber();
    const gasPrice = await this.provider.getFeeData();
    const balance = await this.provider.getBalance(this.wallet.address);

    return {
      chainId: Number(network.chainId),
      blockNumber,
      gasPrice: gasPrice.gasPrice?.toString() || '0',
      balance: ethers.formatEther(balance)
    };
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForTransaction(txHash: string, confirmations = 1): Promise<ethers.TransactionReceipt | null> {
    try {
      return await this.provider.waitForTransaction(txHash, confirmations);
    } catch (error) {
      console.error('Error waiting for transaction:', error);
      return null;
    }
  }

  /**
   * Estimate gas for asset registration
   */
  async estimateAssetRegistrationGas(
    typeId: number,
    metadataHash: string,
    dataURI: string,
    tokenName: string,
    tokenSymbol: string,
    totalSupply: string
  ): Promise<bigint> {
    return await this.contracts.assetRegistry.registerAsset.estimateGas(
      typeId,
      this.wallet.address,
      metadataHash,
      dataURI,
      tokenName,
      tokenSymbol,
      totalSupply
    );
  }

  /**
   * Check if address has required roles
   */
  async checkPermissions(): Promise<{
    hasAdminRole: boolean;
    hasRegistrarRole: boolean;
    address: string;
  }> {
    try {
      // These would need to be implemented based on actual contract interface
      // For now, return basic info
      return {
        hasAdminRole: true, // Assume true for testing
        hasRegistrarRole: true, // Assume true for testing
        address: this.wallet.address
      };
    } catch (error) {
      console.error('Error checking permissions:', error);
      return {
        hasAdminRole: false,
        hasRegistrarRole: false,
        address: this.wallet.address
      };
    }
  }
}

/**
 * Utility function to create blockchain integration from config
 */
export function createBlockchainIntegration(config: TestConfiguration): BlockchainIntegration {
  return new BlockchainIntegration(config);
}

/**
 * Test the blockchain connection
 */
export async function testBlockchainConnection(config: TestConfiguration): Promise<{
  success: boolean;
  networkInfo?: any;
  error?: string;
}> {
  try {
    const integration = new BlockchainIntegration(config);
    const networkInfo = await integration.getNetworkInfo();

    return {
      success: true,
      networkInfo
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}