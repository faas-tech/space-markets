/**
 * MarketplaceService - Wallet-based marketplace operations with EIP-712 signatures
 *
 * Handles offers, bids, and acceptances using proper EIP-712 signatures.
 * Bidders and lessors use their own wallets to interact with the deployed marketplace.
 *
 * Example:
 * ```typescript
 * const service = new MarketplaceService(blockchain, database, cache);
 *
 * // Bidder places bid with their wallet
 * const bid = await service.placeBid(
 *   offerId,
 *   escrowAmount,
 *   bidderWallet,
 *   leaseIntent
 * );
 *
 * // Lessor accepts bid with their wallet
 * const result = await service.acceptBid(
 *   offerId,
 *   bidIndex,
 *   lessorWallet,
 *   leaseIntent
 * );
 * ```
 */

import { BlockchainClient } from '../core/blockchain-client.js';
import { Database } from '../storage/database.js';
import { Cache } from '../storage/cache.js';
import { ethers } from 'ethers';
import { signLeaseIntent } from '../utils/eip712-signatures.js';
import type { LeaseIntentData } from '../types/lease.js';
import type { StoredLease } from '../storage/database.js';

export interface BidResult {
  bidIndex: number;
  transactionHash: string;
  blockNumber: number;
  escrowAmount: string;
  signature: string;
}

export interface AcceptBidResult {
  leaseTokenId: string;
  transactionHash: string;
  blockNumber: number;
  lessee: string;
  lessorSignature: string;
  lease?: StoredLease; // Activated lease data
}

/**
 * Marketplace operations with wallet-based EIP-712 signing
 */
export class MarketplaceService {
  private blockchain: BlockchainClient;
  private database: Database;
  private cache: Cache;
  private leaseService?: any; // Will be injected to avoid circular dependency

  constructor(blockchain: BlockchainClient, database: Database, cache: Cache) {
    this.blockchain = blockchain;
    this.database = database;
    this.cache = cache;
  }

  /**
   * Set lease service for activating leases after bid acceptance
   * Call this after both services are constructed to avoid circular dependencies
   */
  setLeaseService(leaseService: any) {
    this.leaseService = leaseService;
  }

  /**
   * Place a bid on a lease offer using bidder's wallet and EIP-712 signature
   *
   * This method:
   * 1. Generates lessee's EIP-712 signature for the lease intent
   * 2. Approves marketplace to spend bidder's USDC
   * 3. Places bid on marketplace with signature and escrow
   *
   * @param offerId - The offer ID to bid on
   * @param escrowAmount - Amount of USDC to escrow (in minor units, 6 decimals)
   * @param bidderWallet - The bidder's wallet (will become lessee)
   * @param leaseIntent - The complete lease intent with terms
   * @returns Bid result with transaction details
   */
  async placeBid(
    offerId: string,
    escrowAmount: bigint,
    bidderWallet: ethers.Wallet,
    leaseIntent: LeaseIntentData
  ): Promise<BidResult> {
    console.log('\n▶ Placing bid on marketplace...');
    console.log(`  Offer ID: ${offerId}`);
    console.log(`  Bidder: ${bidderWallet.address}`);
    console.log(`  Escrow: ${ethers.formatUnits(escrowAmount, 6)} USDC`);

    // Get contract addresses
    const marketplaceAddress = this.blockchain.getContractAddress('Marketplace');
    const stablecoinAddress = this.blockchain.getContractAddress('MockStablecoin');
    const leaseFactoryAddress = this.blockchain.getContractAddress('LeaseFactory');
    const chainId = await this.blockchain.getChainId();

    // Ensure lessee in lease intent matches bidder
    if (leaseIntent.lease.lessee.toLowerCase() !== bidderWallet.address.toLowerCase()) {
      throw new Error(
        `Lessee in lease intent (${leaseIntent.lease.lessee}) must match bidder wallet (${bidderWallet.address})`
      );
    }

    // Step 1: Generate lessee's EIP-712 signature
    console.log('  [1/3] Generating lessee signature (EIP-712)...');
    const sigLessee = await signLeaseIntent(
      bidderWallet,
      leaseIntent,
      leaseFactoryAddress,
      chainId
    );
    console.log(`    ✓ Lessee signature generated`);
    console.log(`      Signer: ${bidderWallet.address}`);

    // Step 2: Approve marketplace to spend USDC
    console.log('  [2/3] Approving escrow...');
    const stablecoin = new ethers.Contract(
      stablecoinAddress,
      ['function approve(address spender, uint256 amount) external returns (bool)'],
      bidderWallet
    );

    const approveTx = await stablecoin.approve(marketplaceAddress, escrowAmount);
    const approveReceipt = await approveTx.wait();
    console.log(`    ✓ Escrow approved`);
    console.log(`      Transaction: ${approveReceipt?.hash}`);

    // Step 3: Place bid with signature
    console.log('  [3/3] Submitting bid to marketplace...');
    const marketplace = new ethers.Contract(
      marketplaceAddress,
      [
        'function placeLeaseBid(uint256 offerId, bytes calldata sigLessee, uint256 funds) external returns (uint256 bidIndex)',
        'event LeaseBidPlaced(uint256 indexed offerId, uint256 indexed bidIndex, address indexed bidder, uint256 funds)'
      ],
      bidderWallet
    );

    // Get fresh nonce to avoid cached nonce issues
    const currentNonce = await bidderWallet.getNonce('latest');
    const bidTx = await marketplace.placeLeaseBid(offerId, sigLessee, escrowAmount, {
      nonce: currentNonce
    });
    const receipt = await bidTx.wait();

    // Parse bid index from events
    const bidEvent = receipt?.logs.find((log: any) => {
      try {
        const parsed = marketplace.interface.parseLog(log);
        return parsed?.name === 'LeaseBidPlaced';
      } catch {
        return false;
      }
    });

    let bidIndex = 0;
    if (bidEvent) {
      const parsed = marketplace.interface.parseLog(bidEvent);
      bidIndex = Number(parsed?.args?.bidIndex ?? 0);
    }

    console.log(`  ✓ Bid placed successfully`);
    console.log(`    Bid Index: ${bidIndex}`);
    console.log(`    Transaction: ${receipt?.hash}`);
    console.log(`    Block: ${receipt?.blockNumber}\n`);

    return {
      bidIndex,
      transactionHash: receipt?.hash || '',
      blockNumber: receipt?.blockNumber || 0,
      escrowAmount: escrowAmount.toString(),
      signature: sigLessee
    };
  }

  /**
   * Accept a bid using lessor's wallet and EIP-712 signature
   *
   * This method:
   * 1. Generates lessor's EIP-712 signature for the lease intent
   * 2. Calls acceptLeaseBid on marketplace
   * 3. Marketplace calls LeaseFactory.mintLease with both signatures
   * 4. Lease NFT is minted to the lessee
   * 5. Escrow is distributed to asset token holders
   * 6. Losing bids are refunded
   *
   * @param offerId - The offer ID
   * @param bidIndex - Index of the bid to accept
   * @param lessorWallet - The lessor's wallet
   * @param leaseIntent - The complete lease intent (same as what lessee signed)
   * @returns Accept result with lease NFT ID and transaction details
   */
  async acceptBid(
    offerId: string,
    bidIndex: number,
    lessorWallet: ethers.Wallet,
    leaseIntent: LeaseIntentData
  ): Promise<AcceptBidResult> {
    console.log('\n▶ Accepting bid on marketplace...');
    console.log(`  Offer ID: ${offerId}`);
    console.log(`  Bid Index: ${bidIndex}`);
    console.log(`  Lessor: ${lessorWallet.address}`);

    // Get contract addresses
    const marketplaceAddress = this.blockchain.getContractAddress('Marketplace');
    const leaseFactoryAddress = this.blockchain.getContractAddress('LeaseFactory');
    const chainId = await this.blockchain.getChainId();

    // Ensure lessor in lease intent matches lessor wallet
    if (leaseIntent.lease.lessor.toLowerCase() !== lessorWallet.address.toLowerCase()) {
      throw new Error(
        `Lessor in lease intent (${leaseIntent.lease.lessor}) must match lessor wallet (${lessorWallet.address})`
      );
    }

    // Step 1: Generate lessor's EIP-712 signature
    console.log('  [1/2] Generating lessor signature (EIP-712)...');

    // Debug: Calculate digest for comparison
    const { calculateLeaseIntentDigest } = await import('../utils/eip712-signatures.js');
    const tsDigest = calculateLeaseIntentDigest(leaseIntent, leaseFactoryAddress, chainId);
    console.log(`    DEBUG - TypeScript Digest: ${tsDigest}`);

    // Debug: Query contract for its digest calculation
    const leaseFactory = new ethers.Contract(
      leaseFactoryAddress,
      [
        'function hashLeaseIntent((uint64 deadline, bytes32 assetType, (address lessor, address lessee, uint256 assetId, address paymentToken, uint256 rentAmount, uint256 rentPeriod, uint256 securityDeposit, uint64 startTime, uint64 endTime, bytes32 legalDocHash, uint16 termsVersion, (string,string)[] metadata) lease)) external view returns (bytes32)'
      ],
      lessorWallet
    );

    // Build Solidity-formatted LeaseIntent
    const solidityLeaseIntent = {
      deadline: leaseIntent.deadline,
      assetType: leaseIntent.assetTypeSchemaHash,  // Note: field name mismatch
      lease: {
        lessor: leaseIntent.lease.lessor,
        lessee: leaseIntent.lease.lessee,
        assetId: leaseIntent.lease.assetId,
        paymentToken: leaseIntent.lease.paymentToken,
        rentAmount: leaseIntent.lease.rentAmount,
        rentPeriod: leaseIntent.lease.rentPeriod,
        securityDeposit: leaseIntent.lease.securityDeposit,
        startTime: leaseIntent.lease.startTime,
        endTime: leaseIntent.lease.endTime,
        legalDocHash: leaseIntent.lease.legalDocHash,
        termsVersion: leaseIntent.lease.termsVersion,
        metadata: []  // Empty metadata
      }
    };

    const solidityDigest = await leaseFactory.hashLeaseIntent(solidityLeaseIntent);
    console.log(`    DEBUG - Solidity Digest:  ${solidityDigest}`);
    console.log(`    DEBUG - Digests match: ${tsDigest.toLowerCase() === solidityDigest.toLowerCase() ? '✅' : '❌'}`);

    const sigLessor = await signLeaseIntent(
      lessorWallet,
      leaseIntent,
      leaseFactoryAddress,
      chainId
    );
    console.log(`    ✓ Lessor signature generated`);
    console.log(`      Signer: ${lessorWallet.address}`);

    // Step 2: Accept bid on marketplace
    console.log('  [2/2] Accepting bid on marketplace...');
    const marketplace = new ethers.Contract(
      marketplaceAddress,
      [
        'function acceptLeaseBid(uint256 offerId, uint256 bidIndex, bytes calldata sigLessor) external returns (uint256 leaseTokenId)',
        'event LeaseAccepted(uint256 indexed offerId, uint256 indexed bidIndex, address bidder, uint256 leaseTokenId)'
      ],
      lessorWallet
    );

    const acceptTx = await marketplace.acceptLeaseBid(offerId, bidIndex, sigLessor);
    const receipt = await acceptTx.wait();

    // Parse lease token ID from events
    const leaseEvent = receipt?.logs.find((log: any) => {
      try {
        const parsed = marketplace.interface.parseLog(log);
        return parsed?.name === 'LeaseAccepted';
      } catch {
        return false;
      }
    });

    let leaseTokenId = '0';
    let lessee = ethers.ZeroAddress;
    if (leaseEvent) {
      const parsed = marketplace.interface.parseLog(leaseEvent);
      leaseTokenId = (parsed?.args?.leaseTokenId ?? 0n).toString();
      lessee = parsed?.args?.bidder ?? ethers.ZeroAddress;
    }

    console.log(`  ✓ Bid accepted successfully`);
    console.log(`    Lease NFT ID: ${leaseTokenId}`);
    console.log(`    Lessee: ${lessee}`);
    console.log(`    Transaction: ${receipt?.hash}`);
    console.log(`    Block: ${receipt?.blockNumber}\n`);

    // Activate lease in database if lease service is available
    let activatedLease: StoredLease | undefined;
    if (this.leaseService && leaseTokenId !== '0') {
      try {
        activatedLease = await this.leaseService.activateLease(leaseTokenId, offerId);
      } catch (error) {
        console.log(`  ⚠️  Warning: Could not activate lease in database: ${error}`);
      }
    }

    return {
      leaseTokenId,
      transactionHash: receipt?.hash || '',
      blockNumber: receipt?.blockNumber || 0,
      lessee,
      lessorSignature: sigLessor,
      lease: activatedLease
    };
  }

  /**
   * Get all offers (placeholder for now)
   */
  async getOffers() {
    console.log('  Querying marketplace offers...');
    // In a real implementation, this would query the marketplace contract
    // and return an array of offer details
    return [];
  }

  /**
   * Get offer details
   *
   * @param offerId - The offer ID to query
   * @returns Offer details from marketplace contract
   */
  async getOffer(offerId: string) {
    const marketplace = this.blockchain.getContract('Marketplace');
    return await marketplace.leaseOffers(offerId);
  }

  /**
   * Get all bids for an offer
   *
   * @param offerId - The offer ID
   * @returns Array of bids
   */
  async getBids(offerId: string) {
    const marketplace = this.blockchain.getContract('Marketplace');
    // Note: This requires calling leaseBids(offerId, index) for each index
    // In a real implementation, you'd track the number of bids via events
    const bids = [];
    let index = 0;

    try {
      while (true) {
        const bid = await marketplace.leaseBids(offerId, index);
        if (bid.bidder === ethers.ZeroAddress) break;
        bids.push({
          bidder: bid.bidder,
          funds: bid.funds,
          signature: bid.sigLessee,
          active: bid.active
        });
        index++;
      }
    } catch {
      // No more bids
    }

    return bids;
  }
}
