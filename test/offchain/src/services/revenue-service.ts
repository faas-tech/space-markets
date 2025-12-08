/**
 * RevenueService - Simple revenue distribution
 *
 * Handles revenue claims from the Marketplace contract.
 * Revenue is earned from lease agreements and claimed directly.
 *
 * Example:
 * ```typescript
 * const service = new RevenueService(blockchain, database, cache);
 *
 * // Check claimable amount
 * const amount = await service.getClaimableAmount(address);
 *
 * // Claim revenue
 * await service.claimRevenue();
 * ```
 */

import { BlockchainClient } from '../core/blockchain-client.js';
import { Database } from '../storage/database.js';
import { Cache } from '../storage/cache.js';
import { ethers } from 'ethers';

export interface RevenueClaimResult {
  amount: string;
  transactionHash: string;
  blockNumber: number;
  gasUsed: string;
}

/**
 * Simple revenue distribution via Marketplace
 */
export class RevenueService {
  private blockchain: BlockchainClient;
  private database: Database;
  private cache: Cache;

  constructor(blockchain: BlockchainClient, database: Database, cache: Cache) {
    this.blockchain = blockchain;
    this.database = database;
    this.cache = cache;
  }

  /**
   * Claim revenue from Marketplace
   *
   * Claims all accumulated revenue for the connected wallet
   */
  async claimRevenue(): Promise<RevenueClaimResult> {
    console.log('\n▶ Claiming revenue from Marketplace...');

    const marketplace = this.blockchain.getContract('Marketplace');

    const result = await this.blockchain.submitTransaction(
      marketplace,
      'claimRevenue',
      []
    );

    const claimEvent = result.events?.find((e: any) => e?.name === 'RevenueClaimed');
    const amount = claimEvent ? ethers.formatEther(claimEvent.args.share) : '0';

    console.log(`  ✓ Revenue claimed: ${amount} USDC`);
    console.log(`    Transaction: ${result.transactionHash}\n`);

    return {
      amount,
      transactionHash: result.transactionHash,
      blockNumber: result.blockNumber,
      gasUsed: result.gasUsed
    };
  }

  /**
   * Get claimable amount for an address
   */
  async getClaimableAmount(address: string): Promise<string> {
    const marketplace = this.blockchain.getContract('Marketplace');

    try {
      const amount = await marketplace.claims(address);
      return ethers.formatEther(amount);
    } catch (error) {
      return '0';
    }
  }
}
