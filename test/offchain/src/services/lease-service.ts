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
    lessee: string,
    rentAmount: bigint,
    rentPeriod: bigint,
    securityDeposit: bigint,
    startTime: number,
    endTime: number,
    assetType: 'satellite' | 'orbital_compute' | 'orbital_relay' = 'orbital_compute'
  ): Promise<LeaseCreationResult> {
    console.log('\n▶ Creating lease offer...');
    console.log(`  Asset ID: ${assetId}`);
    console.log(`  Lessor: ${lessor}`);
    console.log(`  Rent: ${ethers.formatEther(rentAmount)} per period`);

    // Get contracts
    const marketplace = this.blockchain.getContract('Marketplace');
    const stablecoin = this.blockchain.getContract('MockStablecoin');

    // Create lease intent structure matching LeaseFactory.LeaseIntent
    const leaseIntent = {
      deadline: Math.floor(Date.now() / 1000) + 86400, // 24 hours from now
      assetType: ethers.keccak256(ethers.toUtf8Bytes(assetType)),
      lease: {
        lessor,
        lessee,
        assetId: BigInt(assetId),
        paymentToken: await stablecoin.getAddress(),
        rentAmount,
        rentPeriod,
        securityDeposit,
        startTime,
        endTime,
        legalDocHash: ethers.keccak256(ethers.toUtf8Bytes('legal-doc-v1')),
        termsVersion: 1,
        metadata: [] // Can add metadata as needed
      }
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

    // Store in database with lease terms
    const agreement: LeaseAgreement = {
      rentAmount: ethers.formatEther(rentAmount),
      rentPeriod: rentPeriod.toString(),
      securityDeposit: ethers.formatEther(securityDeposit),
      startTime: new Date(startTime * 1000).toISOString(),
      endTime: new Date(endTime * 1000).toISOString(),
      terms: 'Standard lease terms',
      conditions: []
    };

    await this.database.saveLease({
      leaseId: offerId,
      assetId,
      chainId: Number((await this.blockchain.getNetworkInfo()).chainId),
      contractAddress: await marketplace.getAddress(),
      lessor,
      lessee,
      agreement,
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
   * Activate a lease after bid acceptance
   *
   * This method queries the LeaseFactory for the lease NFT details
   * and syncs them to the offchain database as an active lease.
   *
   * @param leaseTokenId - The lease NFT ID from LeaseFactory
   * @param offerId - The marketplace offer ID (for reference)
   * @returns The activated lease data
   */
  async activateLease(leaseTokenId: string, offerId?: string) {
    console.log('\n▶ Activating lease...');
    console.log(`  Lease NFT ID: ${leaseTokenId}`);

    const leaseFactory = this.blockchain.getContract('LeaseFactory');

    // Query onchain lease data
    const leaseData = await leaseFactory.leases(leaseTokenId);

    // Build agreement from onchain data
    const agreement: LeaseAgreement = {
      rentAmount: ethers.formatUnits(leaseData.rentAmount, 6), // USDC has 6 decimals
      rentPeriod: leaseData.rentPeriod.toString(),
      securityDeposit: ethers.formatUnits(leaseData.securityDeposit, 6),
      startTime: new Date(Number(leaseData.startTime) * 1000).toISOString(),
      endTime: new Date(Number(leaseData.endTime) * 1000).toISOString(),
      terms: `Lease agreement for asset ${leaseData.assetId}`,
      conditions: []
    };

    // Store in database
    await this.database.saveLease({
      leaseId: leaseTokenId,
      assetId: leaseData.assetId.toString(),
      chainId: await this.blockchain.getChainId(),
      contractAddress: await leaseFactory.getAddress(),
      lessor: leaseData.lessor,
      lessee: leaseData.lessee,
      agreement,
      status: 'active',
      blockNumber: await this.blockchain.getBlockNumber(),
      transactionHash: '' // Will be updated if needed
    });

    console.log(`  ✓ Lease activated and stored in database`);
    console.log(`    Lessor: ${leaseData.lessor}`);
    console.log(`    Lessee: ${leaseData.lessee}`);
    console.log(`    Asset ID: ${leaseData.assetId}`);
    console.log(`    Status: active\n`);

    return await this.database.getLease(leaseTokenId);
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
