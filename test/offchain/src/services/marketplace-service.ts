/**
 * MarketplaceService - Simple marketplace operations
 *
 * Handles offers, bids, and acceptances.
 * Makes the marketplace easy to use - like buying on Amazon!
 *
 * Example:
 * ```typescript
 * const service = new MarketplaceService(blockchain, database, cache);
 *
 * // Place a bid
 * const bid = await service.placeBid(offerId, amount);
 *
 * // Accept a bid
 * await service.acceptBid(offerId, bidIndex);
 * ```
 */

import { BlockchainClient } from '../core/blockchain-client.js';
import { Database } from '../storage/database.js';
import { Cache } from '../storage/cache.js';
import { ethers } from 'ethers';

export interface BidResult {
  bidIndex: number;
  transactionHash: string;
  blockNumber: number;
  escrowAmount: string;
}

/**
 * Simple marketplace operations
 */
export class MarketplaceService {
  private blockchain: BlockchainClient;
  private database: Database;
  private cache: Cache;

  constructor(blockchain: BlockchainClient, database: Database, cache: Cache) {
    this.blockchain = blockchain;
    this.database = database;
    this.cache = cache;
  }

  /**
   * Place a bid on a lease offer
   *
   * The escrow amount will be locked until the bid is accepted or rejected
   */
  async placeBid(
    offerId: string,
    escrowAmount: bigint,
    bidder: string
  ): Promise<BidResult> {
    console.log('\n▶ Placing bid...');
    console.log(`  Offer ID: ${offerId}`);
    console.log(`  Amount: ${ethers.formatEther(escrowAmount)} USDC`);
    console.log(`  Bidder: ${bidder}`);

    const marketplace = this.blockchain.getContract('Marketplace');
    const stablecoin = this.blockchain.getContract('MockStablecoin');

    // Step 1: Approve escrow
    console.log('  [1/2] Approving escrow...');
    const approveResult = await this.blockchain.submitTransaction(
      stablecoin,
      'approve',
      [await marketplace.getAddress(), escrowAmount]
    );
    console.log(`    ✓ Escrow approved`);

    // Step 2: Place bid
    console.log('  [2/2] Submitting bid...');
    const bidResult = await this.blockchain.submitTransaction(
      marketplace,
      'placeLeaseBid',
      [offerId, escrowAmount, ethers.ZeroHash] // metadataHash not used in simple version
    );

    console.log(`  ✓ Bid placed successfully`);
    console.log(`    Transaction: ${bidResult.transactionHash}`);

    // Parse bid index from events
    const bidEvent = bidResult.events?.find((e: any) => e?.name === 'BidPlaced');
    const bidIndex = bidEvent ? Number(bidEvent.args.bidIndex) : 0;

    console.log(`    Bid Index: ${bidIndex}\n`);

    return {
      bidIndex,
      transactionHash: bidResult.transactionHash,
      blockNumber: bidResult.blockNumber,
      escrowAmount: escrowAmount.toString()
    };
  }

  /**
   * Accept a bid (lessor accepts lessee's offer)
   *
   * This finalizes the lease and transfers the NFT
   */
  async acceptBid(
    offerId: string,
    bidIndex: number,
    lessorSignature: string
  ): Promise<void> {
    console.log('\n▶ Accepting bid...');
    console.log(`  Offer ID: ${offerId}`);
    console.log(`  Bid Index: ${bidIndex}`);

    const marketplace = this.blockchain.getContract('Marketplace');

    const result = await this.blockchain.submitTransaction(
      marketplace,
      'acceptLeaseBid',
      [offerId, bidIndex, lessorSignature, ethers.ZeroHash] // lesseeSignature and metadataHash
    );

    console.log(`  ✓ Bid accepted`);
    console.log(`    Transaction: ${result.transactionHash}`);
    console.log(`    Lease NFT minted and transferred\n`);
  }

  /**
   * Get all offers
   */
  async getOffers() {
    // In a real implementation, this would query the marketplace contract
    console.log('  Querying marketplace offers...');
    return [];
  }

  /**
   * Get offer details
   */
  async getOffer(offerId: string) {
    const marketplace = this.blockchain.getContract('Marketplace');
    return await marketplace.leaseOffers(offerId);
  }
}
