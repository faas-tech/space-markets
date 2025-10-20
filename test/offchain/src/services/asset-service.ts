/**
 * AssetService - Asset registration and management
 *
 * Handles the complete asset lifecycle: registration, metadata management,
 * holder queries, and onchain/offchain data synchronization.
 *
 * Philosophy: One service, complete asset management
 */

import { BlockchainClient } from '../core/blockchain-client.js';
import { Database } from '../storage/database.js';
import { Cache } from '../storage/cache.js';
import { jsonToMetadataArray, validateMetadataArray } from '../utils/metadata-converter.js';
import { SCHEMA_HASHES, generateLeaseKeyHashes, REQUIRED_LEASE_KEYS } from '../utils/schema-hash.js';
import type { AssetMetadata } from '../types/index.js';
import { ethers } from 'ethers';

export interface AssetRegistrationResult {
  assetId: bigint;
  tokenAddress: string;
  metadataHash: string;
  transactionHash: string;
  blockNumber: number;
  gasUsed: string;
}

export interface AssetHolder {
  address: string;
  balance: string;
  percentage: number;
}

/**
 * Complete asset management service
 *
 * Example usage:
 * ```typescript
 * const service = new AssetService(blockchain, database, cache);
 *
 * // Register asset
 * const result = await service.registerAsset(metadata, 'orbital_compute');
 * console.log('Asset ID:', result.assetId);
 *
 * // Get asset details
 * const asset = await service.getAsset(assetId);
 *
 * // Get token holders
 * const holders = await service.getHolders(assetId);
 * ```
 */
export class AssetService {
  private blockchain: BlockchainClient;
  private database: Database;
  private cache: Cache;

  constructor(blockchain: BlockchainClient, database: Database, cache: Cache) {
    this.blockchain = blockchain;
    this.database = database;
    this.cache = cache;
  }

  /**
   * Register a new asset onchain and store metadata offchain
   */
  async registerAsset(
    metadata: AssetMetadata,
    assetType: 'satellite' | 'orbital_compute' | 'orbital_relay',
    tokenName: string,
    tokenSymbol: string,
    totalSupply: bigint
  ): Promise<AssetRegistrationResult> {
    console.log('\n▶ Registering asset:', metadata.name);
    console.log(`  Type: ${assetType}`);
    console.log(`  Token: ${tokenName} (${tokenSymbol})`);
    console.log(`  Supply: ${ethers.formatEther(totalSupply)} tokens\n`);

    // Step 1: Validate and convert metadata
    console.log('  [1/4] Converting metadata to onchain format...');
    const metadataArray = jsonToMetadataArray(metadata);

    const validation = validateMetadataArray(metadataArray);
    if (!validation.valid) {
      throw new Error(`Metadata validation failed: ${validation.errors.join(', ')}`);
    }

    console.log(`    ✓ Converted to ${metadataArray.length} key-value pairs`);

    // Step 2: Get schema hash for asset type
    const schemaHash = this.getSchemaHash(assetType);
    console.log(`    ✓ Schema hash: ${schemaHash.substring(0, 10)}...`);

    // Step 3: Submit transaction
    console.log('  [2/4] Submitting registration transaction...');

    const registry = this.blockchain.getContract('AssetRegistry');
    const deployer = this.blockchain.getAddress();

    const result = await this.blockchain.submitTransaction(
      registry,
      'registerAsset',
      [schemaHash, tokenName, tokenSymbol, totalSupply, deployer, deployer, metadataArray]
    );

    console.log(`    ✓ Transaction confirmed: ${result.transactionHash}`);
    console.log(`    ✓ Block: ${result.blockNumber}`);
    console.log(`    ✓ Gas used: ${result.gasUsed}`);

    // Step 4: Parse events to get asset ID and token address
    console.log('  [3/4] Parsing events...');

    const assetRegisteredEvent = result.events?.find((e: any) => e?.name === 'AssetRegistered');
    if (!assetRegisteredEvent) {
      throw new Error('AssetRegistered event not found in transaction');
    }

    const assetId: bigint = assetRegisteredEvent.args.assetId;
    const tokenAddress: string = assetRegisteredEvent.args.tokenAddress;

    console.log(`    ✓ Asset ID: ${assetId}`);
    console.log(`    ✓ Token Address: ${tokenAddress}`);

    // Step 5: Store in offchain database
    console.log('  [4/4] Storing in database...');

    const networkInfo = await this.blockchain.getNetworkInfo();

    await this.database.saveAsset({
      assetId: assetId.toString(),
      chainId: Number(networkInfo.chainId),
      contractAddress: await registry.getAddress(),
      tokenAddress,
      metadata,
      metadataHash: schemaHash,
      blockNumber: result.blockNumber,
      transactionHash: result.transactionHash
    });

    console.log(`    ✓ Asset stored in database`);
    console.log('\n✅ Asset registration complete!\n');

    return {
      assetId,
      tokenAddress,
      metadataHash: schemaHash,
      transactionHash: result.transactionHash,
      blockNumber: result.blockNumber,
      gasUsed: result.gasUsed
    };
  }

  /**
   * Get asset by ID
   */
  async getAsset(assetId: string): Promise<AssetMetadata | null> {
    // Try cache first
    const cacheKey = `asset:${assetId}`;
    const cached = await this.cache.get<AssetMetadata>(cacheKey);
    if (cached) {
      return cached;
    }

    // Get from database
    const stored = await this.database.getAsset(assetId);
    if (!stored) {
      return null;
    }

    // Cache for 1 hour
    await this.cache.set(cacheKey, stored.metadata, 3600);

    return stored.metadata;
  }

  /**
   * Get all registered assets
   */
  async getAllAssets(): Promise<AssetMetadata[]> {
    const stored = await this.database.getAllAssets();
    return stored.map(s => s.metadata);
  }

  /**
   * Get token holders for an asset
   */
  async getHolders(assetId: string): Promise<AssetHolder[]> {
    console.log(`\n▶ Querying holders for asset ${assetId}...`);

    // Get asset to find token address
    const stored = await this.database.getAsset(assetId);
    if (!stored) {
      throw new Error(`Asset ${assetId} not found`);
    }

    // Load token contract
    const token = this.blockchain.loadContract('AssetERC20', stored.tokenAddress);

    // Query holders
    const holdersResult = await token.getHolders();
    const addresses: string[] = holdersResult[0];
    const balances: bigint[] = holdersResult[1];

    console.log(`  ✓ Found ${addresses.length} holder(s)`);

    // Get total supply
    const totalSupply: bigint = await token.totalSupply();

    // Calculate percentages
    const holders: AssetHolder[] = [];
    for (let i = 0; i < addresses.length; i++) {
      const balance = balances[i];
      const percentage = (Number(balance) / Number(totalSupply)) * 100;

      holders.push({
        address: addresses[i],
        balance: ethers.formatEther(balance),
        percentage
      });

      console.log(`    ${i + 1}. ${addresses[i]}`);
      console.log(`       Balance: ${ethers.formatEther(balance)} tokens (${percentage.toFixed(2)}%)`);
    }

    return holders;
  }

  /**
   * Get metadata from onchain storage
   */
  async getOnchainMetadata(assetId: string): Promise<Record<string, string>> {
    const stored = await this.database.getAsset(assetId);
    if (!stored) {
      throw new Error(`Asset ${assetId} not found`);
    }

    const token = this.blockchain.loadContract('AssetERC20', stored.tokenAddress);

    // Query specific metadata keys
    const keys = ['name', 'assetType', 'spec_compute_cpu_cores', 'spec_compute_ram_gb', 'spec_compute_storage_tb'];
    const metadata: Record<string, string> = {};

    for (const key of keys) {
      try {
        metadata[key] = await token.getMetadata(key);
      } catch {
        // Key might not exist
        metadata[key] = '';
      }
    }

    return metadata;
  }

  /**
   * Create asset type onchain
   */
  async createAssetType(
    name: string,
    assetType: 'satellite' | 'orbital_compute' | 'orbital_relay'
  ): Promise<void> {
    console.log(`\n▶ Creating asset type: ${name}`);

    const schemaHash = this.getSchemaHash(assetType);
    const leaseKeyHashes = generateLeaseKeyHashes(REQUIRED_LEASE_KEYS[assetType.toUpperCase() as keyof typeof REQUIRED_LEASE_KEYS]);

    const registry = this.blockchain.getContract('AssetRegistry');

    const result = await this.blockchain.submitTransaction(
      registry,
      'createAsset',
      [name, schemaHash, leaseKeyHashes, []]
    );

    console.log(`  ✓ Asset type created`);
    console.log(`    Transaction: ${result.transactionHash}`);
  }

  /**
   * Get schema hash for asset type
   */
  private getSchemaHash(assetType: string): string {
    const typeKey = assetType.toUpperCase() as keyof typeof SCHEMA_HASHES;
    const hash = SCHEMA_HASHES[typeKey];

    if (!hash) {
      throw new Error(`Unknown asset type: ${assetType}`);
    }

    return hash;
  }

  /**
   * Get asset statistics
   */
  async getStats() {
    const assets = await this.database.getAllAssets();

    const stats = {
      totalAssets: assets.length,
      byType: {} as Record<string, number>,
      byChain: {} as Record<string, number>
    };

    for (const asset of assets) {
      const type = asset.metadata.assetType;
      stats.byType[type] = (stats.byType[type] || 0) + 1;

      const chain = asset.chainId.toString();
      stats.byChain[chain] = (stats.byChain[chain] || 0) + 1;
    }

    return stats;
  }
}
