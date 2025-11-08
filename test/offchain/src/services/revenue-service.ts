/**
 * RevenueService - Simple revenue distribution
 *
 * Handles revenue sharing based on token ownership.
 * Like stock dividends, but for blockchain tokens!
 *
 * Example:
 * ```typescript
 * const service = new RevenueService(blockchain, database, cache);
 *
 * // Open a revenue round
 * const round = await service.openRevenueRound(assetId, amount);
 *
 * // Claim your share
 * await service.claimRevenue(roundId, myAddress);
 * ```
 */

import { BlockchainClient } from '../core/blockchain-client.js';
import { Database } from '../storage/database.js';
import { Cache } from '../storage/cache.js';
import { ethers } from 'ethers';

export interface RevenueRoundResult {
  roundId: string;
  snapshotId: string;
  amount: string;
  transactionHash: string;
  blockNumber: number;
}

/**
 * Simple revenue distribution
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
   * Open a revenue distribution round
   *
   * This takes a snapshot of token holders and distributes revenue proportionally
   */
  async openRevenueRound(
    tokenAddress: string,
    amount: bigint
  ): Promise<RevenueRoundResult> {
    console.log('\n▶ Opening revenue round...');
    console.log(`  Token: ${tokenAddress}`);
    console.log(`  Amount: ${ethers.formatEther(amount)} USDC`);

    // Load token contract
    const token = this.blockchain.loadContract('AssetERC20', tokenAddress);

    // Step 1: Take snapshot
    console.log('  [1/3] Taking snapshot of token holders...');
    const snapshotResult = await this.blockchain.submitTransaction(
      token,
      'snapshot',
      []
    );

    const snapshotEvent = snapshotResult.events?.find((e: any) => e?.name === 'Snapshot');
    const snapshotId = snapshotEvent ? snapshotEvent.args.id.toString() : '0';

    console.log(`    ✓ Snapshot taken: ID ${snapshotId}`);

    // Step 2: Approve tokens for distribution
    console.log('  [2/3] Approving tokens for distribution...');
    const stablecoin = this.blockchain.getContract('MockStablecoin');
    await this.blockchain.submitTransaction(
      stablecoin,
      'approve',
      [tokenAddress, amount]
    );
    console.log(`    ✓ Tokens approved`);

    // Step 3: Open revenue round
    console.log('  [3/3] Opening revenue round...');
    const roundResult = await this.blockchain.submitTransaction(
      token,
      'openRevenueRound',
      [snapshotId, amount]
    );

    const roundEvent = roundResult.events?.find((e: any) => e?.name === 'RevenueRoundOpened');
    const roundId = roundEvent ? roundEvent.args.roundId.toString() : '0';

    console.log(`  ✓ Revenue round opened`);
    console.log(`    Round ID: ${roundId}`);
    console.log(`    Transaction: ${roundResult.transactionHash}\n`);

    return {
      roundId,
      snapshotId,
      amount: amount.toString(),
      transactionHash: roundResult.transactionHash,
      blockNumber: roundResult.blockNumber
    };
  }

  /**
   * Claim revenue from a round
   */
  async claimRevenue(
    tokenAddress: string,
    roundId: string,
    claimer: string
  ): Promise<void> {
    console.log('\n▶ Claiming revenue...');
    console.log(`  Round ID: ${roundId}`);
    console.log(`  Claimer: ${claimer}`);

    const token = this.blockchain.loadContract('AssetERC20', tokenAddress);

    const result = await this.blockchain.submitTransaction(
      token,
      'claimRevenue',
      [roundId]
    );

    const claimEvent = result.events?.find((e: any) => e?.name === 'RevenueClaimed');
    const amount = claimEvent ? ethers.formatEther(claimEvent.args.amount) : '0';

    console.log(`  ✓ Revenue claimed: ${amount} USDC`);
    console.log(`    Transaction: ${result.transactionHash}\n`);
  }

  /**
   * Get claimable amount for an address
   */
  async getClaimableAmount(
    tokenAddress: string,
    roundId: string,
    address: string
  ): Promise<string> {
    const token = this.blockchain.loadContract('AssetERC20', tokenAddress);

    try {
      const amount = await token.getClaimableAmount(roundId, address);
      return ethers.formatEther(amount);
    } catch (error) {
      return '0';
    }
  }

  /**
   * Check if address has claimed from a round
   */
  async hasClaimed(
    tokenAddress: string,
    roundId: string,
    address: string
  ): Promise<boolean> {
    const token = this.blockchain.loadContract('AssetERC20', tokenAddress);

    try {
      return await token.hasClaimed(roundId, address);
    } catch (error) {
      return false;
    }
  }
}
