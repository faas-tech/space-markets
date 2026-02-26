/**
 * Mock offchain services for testing
 *
 * Provides realistic implementations of databases, APIs, and other
 * offchain components for comprehensive integration testing.
 */

import { EventEmitter } from 'events';
import type { AssetMetadata, LeaseAgreement } from '../types/index.js';
import type { AssetLeasingEventListener, ContractEvent } from './event-listener.js';

export interface MockServicesConfig {
  databaseUrl?: string;
  redisUrl?: string;
  ipfsGateway?: string;
  eventListener?: AssetLeasingEventListener;
  enableApi?: boolean;
  enableDatabase?: boolean;
}

export interface DatabaseAsset {
  id: number;
  assetId: string;
  chainId: number;
  contractAddress: string;
  tokenAddress: string;
  metadata: AssetMetadata;
  metadataHash: string;
  blockNumber: number;
  transactionHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DatabaseLease {
  id: number;
  leaseId: string;
  assetId: string;
  chainId: number;
  contractAddress: string;
  lessor: string;
  lessee: string;
  agreement: LeaseAgreement;
  status: 'pending' | 'active' | 'completed' | 'terminated';
  blockNumber: number;
  transactionHash: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Mock database implementation using in-memory storage
 */
class MockDatabase {
  private assets: Map<string, DatabaseAsset> = new Map();
  private leases: Map<string, DatabaseLease> = new Map();
  private nextAssetId = 1;
  private nextLeaseId = 1;

  async initialize(): Promise<void> {
    console.log('Initializing mock database...');
    // In a real implementation, this would connect to PostgreSQL
  }

  async cleanup(): Promise<void> {
    console.log('Cleaning up mock database...');
    this.assets.clear();
    this.leases.clear();
  }

  // Asset operations
  async createAsset(asset: Omit<DatabaseAsset, 'id' | 'createdAt' | 'updatedAt'>): Promise<DatabaseAsset> {
    const dbAsset: DatabaseAsset = {
      ...asset,
      id: this.nextAssetId++,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.assets.set(asset.assetId, dbAsset);
    return dbAsset;
  }

  async getAsset(assetId: string): Promise<DatabaseAsset | undefined> {
    return this.assets.get(assetId);
  }

  async updateAsset(assetId: string, updates: Partial<DatabaseAsset>): Promise<DatabaseAsset | undefined> {
    const asset = this.assets.get(assetId);
    if (!asset) return undefined;

    const updatedAsset = { ...asset, ...updates, updatedAt: new Date() };
    this.assets.set(assetId, updatedAsset);
    return updatedAsset;
  }

  async getAllAssets(): Promise<DatabaseAsset[]> {
    return Array.from(this.assets.values());
  }

  // Lease operations
  async createLease(lease: Omit<DatabaseLease, 'id' | 'createdAt' | 'updatedAt'>): Promise<DatabaseLease> {
    const dbLease: DatabaseLease = {
      ...lease,
      id: this.nextLeaseId++,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.leases.set(lease.leaseId, dbLease);
    return dbLease;
  }

  async getLease(leaseId: string): Promise<DatabaseLease | undefined> {
    return this.leases.get(leaseId);
  }

  async updateLease(leaseId: string, updates: Partial<DatabaseLease>): Promise<DatabaseLease | undefined> {
    const lease = this.leases.get(leaseId);
    if (!lease) return undefined;

    const updatedLease = { ...lease, ...updates, updatedAt: new Date() };
    this.leases.set(leaseId, updatedLease);
    return updatedLease;
  }

  async getAllLeases(): Promise<DatabaseLease[]> {
    return Array.from(this.leases.values());
  }

  // Transaction testing
  async testTransactionRollback(): Promise<void> {
    // Simulate a transaction that should rollback
    const originalAssetCount = this.assets.size;

    try {
      // Start "transaction"
      await this.createAsset({
        assetId: 'rollback-test',
        chainId: 31337,
        contractAddress: '0x123',
        tokenAddress: '0x456',
        metadata: {} as AssetMetadata,
        metadataHash: '0xabc',
        blockNumber: 100,
        transactionHash: '0xdef'
      });

      // Simulate error that causes rollback
      throw new Error('Simulated transaction failure');

    } catch (error) {
      // Rollback - remove the asset
      this.assets.delete('rollback-test');
    }

    // Verify rollback worked
    if (this.assets.size !== originalAssetCount) {
      throw new Error('Transaction rollback failed');
    }
  }
}

/**
 * Mock cache implementation using in-memory storage
 */
class MockCache {
  private cache: Map<string, { value: unknown; expiry: number }> = new Map();

  async get(key: string): Promise<unknown> {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  async set(key: string, value: unknown, ttlSeconds = 3600): Promise<void> {
    this.cache.set(key, {
      value,
      expiry: Date.now() + (ttlSeconds * 1000)
    });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }
}

/**
 * Mock API client for testing HTTP endpoints
 */
class MockApiClient {
  private baseUrl: string;

  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  async get(path: string): Promise<{ status: number; data: unknown }> {
    // Mock successful responses
    if (path.includes('/assets')) {
      return { status: 200, data: { assets: [] } };
    }
    if (path.includes('/leases')) {
      return { status: 200, data: { leases: [] } };
    }
    return { status: 404, data: { error: 'Not found' } };
  }

  async post(_path: string, _data: unknown): Promise<{ status: number; data: unknown }> {
    // Mock validation endpoints
    if (_path.includes('/validate')) {
      return { status: 200, data: { valid: true } };
    }
    return { status: 201, data: { success: true } };
  }

  async put(_path: string, _data: unknown): Promise<{ status: number; data: unknown }> {
    return { status: 200, data: { success: true } };
  }

  async delete(_path: string): Promise<{ status: number; data: unknown }> {
    return { status: 204, data: {} };
  }
}

/**
 * Mock IPFS client for metadata storage
 */
class MockIpfsClient {
  private storage: Map<string, unknown> = new Map();

  async add(content: unknown): Promise<{ cid: string; size: number }> {
    const cid = `Qm${Math.random().toString(36).substring(2, 15)}`;
    this.storage.set(cid, content);
    return {
      cid,
      size: JSON.stringify(content).length
    };
  }

  async get(cid: string): Promise<unknown> {
    return this.storage.get(cid);
  }

  async pin(cid: string): Promise<void> {
    // Mock pinning operation
  }

  async unpin(cid: string): Promise<void> {
    // Mock unpinning operation
  }
}

/**
 * Main mock services orchestrator
 */
export class MockOffChainServices extends EventEmitter {
  public readonly database: MockDatabase;
  private cache: MockCache;
  private apiClient: MockApiClient;
  private ipfsClient: MockIpfsClient;
  private eventListener?: AssetLeasingEventListener;
  private config: MockServicesConfig;

  constructor(config: MockServicesConfig) {
    super();
    this.config = config;
    this.database = new MockDatabase();
    this.cache = new MockCache();
    this.apiClient = new MockApiClient();
    this.ipfsClient = new MockIpfsClient();
    this.eventListener = config.eventListener;
  }

  /**
   * Initialize all mock services
   */
  async initialize(): Promise<void> {
    console.log('Initializing mock offchain services...');

    await this.database.initialize();

    // Set up event listeners for blockchain events
    if (this.eventListener) {
      this.setupEventHandlers();
    }

    console.log('Mock offchain services initialized');
  }

  /**
   * Clean up all mock services
   */
  async cleanup(): Promise<void> {
    console.log('Cleaning up mock offchain services...');

    await this.database.cleanup();
    await this.cache.clear();

    if (this.eventListener) {
      this.eventListener.removeAllListeners();
    }

    console.log('Mock offchain services cleaned up');
  }

  async loadSampleData(): Promise<void> {
    console.log('Loading sample data into mock services (noop placeholder)');
  }

  async shutdown(): Promise<void> {
    await this.cleanup();
  }

  /**
   * Set up handlers for blockchain events
   */
  private setupEventHandlers(): void {
    if (!this.eventListener) return;

    // Handle asset registration events
    this.eventListener.on('event:AssetRegistered', async (event: ContractEvent) => {
      try {
        console.log('Processing AssetRegistered event:', event.args.assetId);

        // Simulate storing asset in database
        await this.database.createAsset({
          assetId: event.args.assetId,
          chainId: 31337, // Test chain
          contractAddress: event.contractAddress,
          tokenAddress: event.args.tokenAddress,
          metadata: {} as AssetMetadata, // Would be fetched from IPFS
          metadataHash: '0x' + Math.random().toString(16).substring(2),
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash
        });

        this.emit('assetProcessed', { assetId: event.args.assetId });

      } catch (error) {
        console.error('Error processing AssetRegistered event:', error);
        this.emit('error', { event, error });
      }
    });

    // Handle lease acceptance events
    this.eventListener.on('event:LeaseAccepted', async (event: ContractEvent) => {
      try {
        console.log('Processing LeaseAccepted event:', event.args.leaseTokenId);

        // Update lease status in database
        const leases = await this.database.getAllLeases();
        const matchingLease = leases.find(l =>
          l.lessee.toLowerCase() === event.args.lessee.toLowerCase()
        );

        if (matchingLease) {
          await this.database.updateLease(matchingLease.leaseId, {
            status: 'active',
            blockNumber: event.blockNumber,
            transactionHash: event.transactionHash
          });

          this.emit('leaseActivated', { leaseId: matchingLease.leaseId });
        }

      } catch (error) {
        console.error('Error processing LeaseAccepted event:', error);
        this.emit('error', { event, error });
      }
    });

    // Handle revenue events
    this.eventListener.on('event:RevenueRoundOpened', async (event: ContractEvent) => {
      try {
        console.log('Processing RevenueRoundOpened event:', event.args.roundId);

        // Cache revenue round information
        await this.cache.set(
          `revenue:${event.args.roundId}`,
          {
            roundId: event.args.roundId,
            assetToken: event.args.assetToken,
            snapshotId: event.args.snapshotId,
            amount: event.args.amount,
            blockNumber: event.blockNumber
          },
          86400 // 24 hours
        );

        this.emit('revenueRoundOpened', { roundId: event.args.roundId });

      } catch (error) {
        console.error('Error processing RevenueRoundOpened event:', error);
        this.emit('error', { event, error });
      }
    });
  }

  /**
   * Store asset metadata in IPFS and database
   */
  async storeAssetMetadata(metadata: AssetMetadata): Promise<{
    success: boolean;
    ipfsCid?: string;
    error?: string;
  }> {
    try {
      // Store in IPFS
      const ipfsResult = await this.ipfsClient.add(metadata);

      // Cache metadata
      await this.cache.set(`metadata:${metadata.assetId}`, metadata, 3600);

      return {
        success: true,
        ipfsCid: ipfsResult.cid
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Store lease agreement
   */
  async storeLeaseAgreement(agreement: LeaseAgreement): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Store in database
      await this.database.createLease({
        leaseId: agreement.leaseId,
        assetId: agreement.assetId,
        chainId: 31337,
        contractAddress: '0x0000000000000000000000000000000000000000',
        lessor: agreement.lessor,
        lessee: agreement.lessee,
        agreement,
        status: (agreement.status || 'pending') as 'pending' | 'active' | 'completed' | 'terminated',
        blockNumber: 0,
        transactionHash: '0x0000000000000000000000000000000000000000000000000000000000000000'
      });

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get asset by ID
   */
  async getAssetById(assetId: string): Promise<DatabaseAsset | undefined> {
    return await this.database.getAsset(assetId);
  }

  /**
   * Get lease by ID
   */
  async getLeaseById(leaseId: string): Promise<DatabaseLease> {
    const lease = await this.database.getLease(leaseId);
    if (!lease) {
      throw new Error(`Lease ${leaseId} not found`);
    }
    return lease;
  }

  /**
   * Verify metadata hash consistency
   */
  async verifyMetadataHash(assetId: string, metadata: AssetMetadata): Promise<{
    consistent: boolean;
    onChainHash?: string;
    computedHash?: string;
  }> {
    try {
      const asset = await this.database.getAsset(assetId);
      if (!asset) {
        return { consistent: false };
      }

      // Simulate hash computation
      const computedHash = '0x' + Math.random().toString(16).substring(2);

      return {
        consistent: true, // Simulate consistency for testing
        onChainHash: asset.metadataHash,
        computedHash
      };

    } catch (error) {
      return { consistent: false };
    }
  }

  /**
   * Get API client for testing
   */
  getApiClient(): MockApiClient {
    return this.apiClient;
  }

  /**
   * Get database assets for testing
   */
  async getDatabaseAssets(): Promise<DatabaseAsset[]> {
    return await this.database.getAllAssets();
  }

  /**
   * Get database leases for testing
   */
  async getDatabaseLeases(): Promise<DatabaseLease[]> {
    return await this.database.getAllLeases();
  }

  /**
   * Test transaction rollback
   */
  async testTransactionRollback(): Promise<void> {
    return await this.database.testTransactionRollback();
  }

  /**
   * Simulate network latency
   */
  async simulateNetworkLatency(minMs = 100, maxMs = 500): Promise<void> {
    const delay = Math.random() * (maxMs - minMs) + minMs;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Simulate service failure
   */
  async simulateServiceFailure(failureRate = 0.1): Promise<void> {
    if (Math.random() < failureRate) {
      throw new Error('Simulated service failure');
    }
  }

  /**
   * Get service statistics
   */
  async getStats(): Promise<{
    assetsStored: number;
    leasesStored: number;
    cacheHits: number;
    eventsProcessed: number;
  }> {
    const [assets, leases] = await Promise.all([
      this.database.getAllAssets(),
      this.database.getAllLeases()
    ]);
    return {
      assetsStored: assets.length,
      leasesStored: leases.length,
      cacheHits: 0, // Would track in real implementation
      eventsProcessed: 0 // Would track in real implementation
    };
  }

  /**
   * Minimal system status snapshot for API integrations
   */
  async getSystemStatus(): Promise<{
    timestamp: string;
    database: { assets: number; leases: number };
  }> {
    const [assets, leases] = await Promise.all([
      this.database.getAllAssets(),
      this.database.getAllLeases()
    ]);
    return {
      timestamp: new Date().toISOString(),
      database: {
        assets: assets.length,
        leases: leases.length
      }
    };
  }

  /**
   * Reset stateful stores (database/cache) to a clean slate
   */
  async reset(): Promise<void> {
    await this.database.cleanup();
    await this.cache.clear();
  }
}