/**
 * Database abstraction layer
 *
 * Provides a simple interface for data storage that can be swapped
 * between mock (in-memory) and real (PostgreSQL) implementations.
 *
 * Philosophy: Start with mocks, swap to real databases when ready
 */

import type { AssetMetadata, LeaseAgreement } from '../types/index.js';

export interface StoredAsset {
  id: string;
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

export interface StoredLease {
  id: string;
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

export interface StoredEvent {
  id: string;
  eventName: string;
  contractAddress: string;
  blockNumber: number;
  transactionHash: string;
  logIndex: number;
  args: Record<string, any>;
  processed: boolean;
  createdAt: Date;
}

/**
 * Database interface - implement this for your storage backend
 */
export interface Database {
  // Connection
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  // Assets
  saveAsset(asset: Omit<StoredAsset, 'id' | 'createdAt' | 'updatedAt'>): Promise<StoredAsset>;
  getAsset(assetId: string): Promise<StoredAsset | null>;
  getAssetByTokenAddress(tokenAddress: string): Promise<StoredAsset | null>;
  getAllAssets(): Promise<StoredAsset[]>;
  updateAsset(assetId: string, updates: Partial<StoredAsset>): Promise<StoredAsset | null>;

  // Leases
  saveLease(lease: Omit<StoredLease, 'id' | 'createdAt' | 'updatedAt'>): Promise<StoredLease>;
  getLease(leaseId: string): Promise<StoredLease | null>;
  getLeasesByAsset(assetId: string): Promise<StoredLease[]>;
  getLeasesByStatus(status: StoredLease['status']): Promise<StoredLease[]>;
  updateLease(leaseId: string, updates: Partial<StoredLease>): Promise<StoredLease | null>;

  // Events
  saveEvent(event: Omit<StoredEvent, 'id' | 'createdAt'>): Promise<StoredEvent>;
  getEvent(transactionHash: string, logIndex: number): Promise<StoredEvent | null>;
  getUnprocessedEvents(): Promise<StoredEvent[]>;
  markEventProcessed(id: string): Promise<void>;

  // Utility
  clear(): Promise<void>;
}

/**
 * Mock in-memory database implementation
 * Perfect for testing and development
 */
export class MockDatabase implements Database {
  private assets: Map<string, StoredAsset> = new Map();
  private leases: Map<string, StoredLease> = new Map();
  private events: Map<string, StoredEvent> = new Map();
  private connected: boolean = false;
  private nextId: number = 1;

  async connect(): Promise<void> {
    this.connected = true;
    console.log('✓ Connected to mock database (in-memory)');
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    console.log('✓ Disconnected from mock database');
  }

  isConnected(): boolean {
    return this.connected;
  }

  // Assets
  async saveAsset(asset: Omit<StoredAsset, 'id' | 'createdAt' | 'updatedAt'>): Promise<StoredAsset> {
    const stored: StoredAsset = {
      ...asset,
      id: `asset_${this.nextId++}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.assets.set(stored.assetId, stored);
    return stored;
  }

  async getAsset(assetId: string): Promise<StoredAsset | null> {
    return this.assets.get(assetId) || null;
  }

  async getAssetByTokenAddress(tokenAddress: string): Promise<StoredAsset | null> {
    for (const asset of this.assets.values()) {
      if (asset.tokenAddress.toLowerCase() === tokenAddress.toLowerCase()) {
        return asset;
      }
    }
    return null;
  }

  async getAllAssets(): Promise<StoredAsset[]> {
    return Array.from(this.assets.values());
  }

  async updateAsset(assetId: string, updates: Partial<StoredAsset>): Promise<StoredAsset | null> {
    const asset = this.assets.get(assetId);
    if (!asset) return null;

    const updated = {
      ...asset,
      ...updates,
      updatedAt: new Date()
    };

    this.assets.set(assetId, updated);
    return updated;
  }

  // Leases
  async saveLease(lease: Omit<StoredLease, 'id' | 'createdAt' | 'updatedAt'>): Promise<StoredLease> {
    const stored: StoredLease = {
      ...lease,
      id: `lease_${this.nextId++}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.leases.set(stored.leaseId, stored);
    return stored;
  }

  async getLease(leaseId: string): Promise<StoredLease | null> {
    return this.leases.get(leaseId) || null;
  }

  async getLeasesByAsset(assetId: string): Promise<StoredLease[]> {
    return Array.from(this.leases.values()).filter(lease => lease.assetId === assetId);
  }

  async getLeasesByStatus(status: StoredLease['status']): Promise<StoredLease[]> {
    return Array.from(this.leases.values()).filter(lease => lease.status === status);
  }

  async updateLease(leaseId: string, updates: Partial<StoredLease>): Promise<StoredLease | null> {
    const lease = this.leases.get(leaseId);
    if (!lease) return null;

    const updated = {
      ...lease,
      ...updates,
      updatedAt: new Date()
    };

    this.leases.set(leaseId, updated);
    return updated;
  }

  // Events
  async saveEvent(event: Omit<StoredEvent, 'id' | 'createdAt'>): Promise<StoredEvent> {
    const stored: StoredEvent = {
      ...event,
      id: `event_${this.nextId++}`,
      createdAt: new Date()
    };

    const key = `${stored.transactionHash}-${stored.logIndex}`;
    this.events.set(key, stored);
    return stored;
  }

  async getEvent(transactionHash: string, logIndex: number): Promise<StoredEvent | null> {
    const key = `${transactionHash}-${logIndex}`;
    return this.events.get(key) || null;
  }

  async getUnprocessedEvents(): Promise<StoredEvent[]> {
    return Array.from(this.events.values()).filter(event => !event.processed);
  }

  async markEventProcessed(id: string): Promise<void> {
    for (const event of this.events.values()) {
      if (event.id === id) {
        event.processed = true;
        break;
      }
    }
  }

  // Utility
  async clear(): Promise<void> {
    this.assets.clear();
    this.leases.clear();
    this.events.clear();
    this.nextId = 1;
    console.log('✓ Database cleared');
  }

  // Stats
  getStats() {
    return {
      assets: this.assets.size,
      leases: this.leases.size,
      events: this.events.size
    };
  }
}
