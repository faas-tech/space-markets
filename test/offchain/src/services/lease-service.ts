/**
 * LeaseService - Simple lease management
 *
 * Handles lease creation, signatures, and acceptance.
 * All the complexity is hidden - just simple method calls.
 *
 * Example:
 * ```typescript
 * const service = new LeaseService(blockchain, database, cache);
 *
 * // Create a lease offer
 * const lease = await service.createLeaseOffer({
 *   assetId: '1',
 *   lessor: '0x123...',
 *   lessee: '0x456...',
 *   terms: { ... }
 * });
 *
 * console.log('Lease created:', lease.leaseId);
 * ```
 */

import { BlockchainClient } from '../core/blockchain-client.js';
import { Database } from '../storage/database.js';
import { Cache } from '../storage/cache.js';
import type { LeaseAgreement } from '../types/index.js';
import { ethers } from 'ethers';

export interface LeaseCreationResult {
  leaseId: string;
  transactionHash: string;
  blockNumber: number;
  gasUsed: string;
}

/**
 * Simple lease management
 */
export class LeaseService {
  private blockchain: BlockchainClient;
  private database: Database;
  private cache: Cache;

  constructor(blockchain: BlockchainClient, database: Database, cache: Cache) {
    this.blockchain = blockchain;
    this.database = database;
    this.cache = cache;
  }

  /**
   * Create a lease offer
   *
   * This posts a lease to the marketplace where others can bid
   */
  async createLeaseOffer(
    assetId: string,
    lessor: string,
    terms: any
  ): Promise<LeaseCreationResult> {
    console.log('\n▶ Creating lease offer...');
    console.log(`  Asset ID: ${assetId}`);
    console.log(`  Lessor: ${lessor}`);

    // Get marketplace contract
    const marketplace = this.blockchain.getContract('Marketplace');

    // Create lease intent
    const leaseIntent = {
      assetTypeId: ethers.keccak256(ethers.toUtf8Bytes('OrbitalComputeSchema')),
      leasor: lessor, // Note: contract has typo "leasor" instead of "lessor"
      offerDeadline: Math.floor(Date.now() / 1000) + 86400, // 24 hours
      metadataHash: ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(terms)))
    };

    // Submit transaction
    console.log('  Submitting to marketplace...');
    const result = await this.blockchain.submitTransaction(
      marketplace,
      'postLeaseOffer',
      [leaseIntent]
    );

    console.log(`  ✓ Lease offer posted`);
    console.log(`    Transaction: ${result.transactionHash}`);
    console.log(`    Block: ${result.blockNumber}`);

    // Parse offer ID from events
    const offerEvent = result.events?.find((e: any) => e?.name === 'LeaseOfferPosted');
    const offerId = offerEvent ? offerEvent.args.offerId.toString() : 'unknown';

    // Store in database
    await this.database.saveLease({
      leaseId: offerId,
      assetId,
      chainId: Number((await this.blockchain.getNetworkInfo()).chainId),
      contractAddress: await marketplace.getAddress(),
      lessor,
      lessee: ethers.ZeroAddress,
      agreement: terms as LeaseAgreement,
      status: 'pending',
      blockNumber: result.blockNumber,
      transactionHash: result.transactionHash
    });

    console.log('  ✓ Lease stored in database\n');

    return {
      leaseId: offerId,
      transactionHash: result.transactionHash,
      blockNumber: result.blockNumber,
      gasUsed: result.gasUsed
    };
  }

  /**
   * Get lease by ID
   */
  async getLease(leaseId: string) {
    return await this.database.getLease(leaseId);
  }

  /**
   * Get all leases for an asset
   */
  async getLeasesByAsset(assetId: string) {
    return await this.database.getLeasesByAsset(assetId);
  }

  /**
   * Update lease status
   */
  async updateLeaseStatus(leaseId: string, status: 'pending' | 'active' | 'completed' | 'terminated') {
    console.log(`\n▶ Updating lease ${leaseId} status to ${status}`);

    await this.database.updateLease(leaseId, { status });

    console.log('  ✓ Lease status updated\n');
  }
}
