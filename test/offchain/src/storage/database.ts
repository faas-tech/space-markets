/**
 * Database abstraction layer
 *
 * Provides a simple interface for data storage that can be swapped
 * between mock (in-memory) and real (PostgreSQL) implementations.
 *
 * Philosophy: Start with mocks, swap to real databases when ready
 */

import type { AssetMetadata, LeaseAgreement } from '../types/index.js';
import type { StoredX402Batch, StoredX402Payment } from '../types/x402.js';

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

  // X402 streaming payments
  saveX402Payment(payment: Omit<StoredX402Payment, 'id' | 'createdAt'>): Promise<StoredX402Payment>;
  getX402PaymentsByLease(leaseId: string): Promise<StoredX402Payment[]>;
  getX402PaymentsByBucket(bucketSlot: string): Promise<StoredX402Payment[]>;
  saveX402Batch(batch: Omit<StoredX402Batch, 'id' | 'createdAt'>): Promise<StoredX402Batch>;
  getX402BatchesByLease(leaseId: string): Promise<StoredX402Batch[]>;
  getOpenBatchForLease(leaseId: string, bucket: string): Promise<StoredX402Batch | null>;
  updateX402Batch(id: string, updates: Partial<StoredX402Batch>): Promise<StoredX402Batch | null>;

  // Helper method for recording payments
  recordPayment(params: { leaseId: string; amount: string; timestamp: string; mode: string }): Promise<void>;

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
  private x402Payments: Map<string, StoredX402Payment> = new Map();
  private x402Batches: Map<string, StoredX402Batch> = new Map();
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
    this.x402Payments.clear();
    this.x402Batches.clear();
    this.nextId = 1;
    console.log('✓ Database cleared');
  }

  // Stats
  getStats() {
    return {
      assets: this.assets.size,
      leases: this.leases.size,
      events: this.events.size,
      x402Payments: this.x402Payments.size,
      x402Batches: this.x402Batches.size
    };
  }

  // X402 streaming
  async saveX402Payment(payment: Omit<StoredX402Payment, 'id' | 'createdAt'>): Promise<StoredX402Payment> {
    const stored: StoredX402Payment = {
      ...payment,
      id: `x402_payment_${this.nextId++}`,
      createdAt: new Date()
    };

    this.x402Payments.set(stored.id, stored);
    return stored;
  }

  async getX402PaymentsByLease(leaseId: string): Promise<StoredX402Payment[]> {
    return Array.from(this.x402Payments.values()).filter(payment => payment.leaseId === leaseId);
  }

  async getX402PaymentsByBucket(bucketSlot: string): Promise<StoredX402Payment[]> {
    return Array.from(this.x402Payments.values()).filter(payment => payment.bucketSlot === bucketSlot);
  }

  async saveX402Batch(batch: Omit<StoredX402Batch, 'id' | 'createdAt'>): Promise<StoredX402Batch> {
    const stored: StoredX402Batch = {
      ...batch,
      id: `x402_batch_${this.nextId++}`,
      createdAt: new Date()
    };

    this.x402Batches.set(stored.id, stored);
    return stored;
  }

  async getX402BatchesByLease(leaseId: string): Promise<StoredX402Batch[]> {
    return Array.from(this.x402Batches.values()).filter(batch => batch.leaseId === leaseId);
  }

  async getOpenBatchForLease(leaseId: string, bucket: string): Promise<StoredX402Batch | null> {
    const match = Array.from(this.x402Batches.values()).find(batch =>
      batch.leaseId === leaseId && batch.hourBucket === bucket
    );
    return match || null;
  }

  async updateX402Batch(id: string, updates: Partial<StoredX402Batch>): Promise<StoredX402Batch | null> {
    const batch = this.x402Batches.get(id);
    if (!batch) return null;

    const updated: StoredX402Batch = {
      ...batch,
      ...updates
    };

    this.x402Batches.set(id, updated);
    return updated;
  }

  /**
   * Helper method to record a payment (simplified interface)
   */
  async recordPayment(params: { leaseId: string; amount: string; timestamp: string; mode: string }): Promise<void> {
    const bucketSlot = new Date(params.timestamp).toISOString().substring(0, 13); // Hour bucket

    await this.saveX402Payment({
      leaseId: params.leaseId,
      bucketSlot,
      amountMinorUnits: params.amount,
      paymentMode: params.mode as any,
      timestamp: params.timestamp,
      verified: true
    });
  }
}
