import { ethers } from 'ethers';
import { signLeaseIntent, type LeaseIntentData } from '../utils/eip712';

export const MARKETPLACE_ABI = [
  "function postLeaseOffer(tuple(uint64 deadline, bytes32 assetType, tuple(address lessor, address lessee, uint256 assetId, address paymentToken, uint256 rentAmount, uint256 rentPeriod, uint256 securityDeposit, uint64 startTime, uint64 endTime, bytes32 legalDocHash, uint16 termsVersion, tuple(bytes32 key, bytes value)[] metadata) lease) L) external returns (uint256 offerId)",
  "function placeLeaseBid(uint256 offerId, bytes calldata sigLessee, uint256 funds) external returns (uint256 bidIndex)",
  "function acceptLeaseBid(uint256 offerId, uint256 bidIndex, bytes calldata sigLessor) external returns (uint256 leaseTokenId)",
  "function leaseOffers(uint256 offerId) external view returns (tuple(address lessor, tuple(uint64 deadline, bytes32 assetType, tuple(address lessor, address lessee, uint256 assetId, address paymentToken, uint256 rentAmount, uint256 rentPeriod, uint256 securityDeposit, uint64 startTime, uint64 endTime, bytes32 legalDocHash, uint16 termsVersion) lease) terms) offer)",
  "function leaseBids(uint256 offerId, uint256 bidIndex) external view returns (tuple(address bidder, uint256 funds, bytes sigLessee, bool active))",
  "event LeaseOfferPosted(uint256 indexed offerId, address indexed lessor, uint256 indexed assetId)",
  "event LeaseBidPlaced(uint256 indexed offerId, uint256 indexed bidIndex, address indexed bidder, uint256 escrowAmount)",
  "event LeaseAccepted(uint256 indexed offerId, uint256 indexed bidIndex, address bidder, uint256 leaseTokenId)"
];

export interface LeaseTerms {
  rentAmount: string; // ETH formatted string
  rentPeriod: number; // seconds
  securityDeposit: string; // ETH formatted string
  startTime: number; // unix timestamp
  endTime: number; // unix timestamp
}

export class MarketplaceService {
  private marketplace: ethers.Contract;
  private stablecoin: ethers.Contract;
  private signer: ethers.Signer;
  private leaseFactoryAddress: string;
  private chainId: number;

  constructor(
    marketplaceAddress: string,
    stablecoinAddress: string,
    leaseFactoryAddress: string,
    signer: ethers.Signer,
    chainId: number
  ) {
    this.marketplace = new ethers.Contract(marketplaceAddress, MARKETPLACE_ABI, signer);
    this.stablecoin = new ethers.Contract(
      stablecoinAddress,
      ['function approve(address spender, uint256 amount) external returns (bool)'],
      signer
    );
    this.signer = signer;
    this.leaseFactoryAddress = leaseFactoryAddress;
    this.chainId = chainId;
  }

  async postLeaseOffer(
    assetId: bigint,
    assetType: 'satellite' | 'orbital_compute' | 'orbital_relay',
    terms: LeaseTerms,
    paymentTokenAddress: string, // MockStablecoin address
    lessee: string = ethers.ZeroAddress // ZeroAddress = open to anyone
  ): Promise<{ offerId: bigint; receipt: ethers.ContractTransactionReceipt }> {
    const lessor = await this.signer.getAddress();

    const leaseIntent = {
      deadline: Math.floor(Date.now() / 1000) + 86400, // 24 hours
      assetType: ethers.keccak256(ethers.toUtf8Bytes(assetType)),
      lease: {
        lessor,
        lessee,
        assetId,
        paymentToken: paymentTokenAddress,
        rentAmount: ethers.parseEther(terms.rentAmount),
        rentPeriod: BigInt(terms.rentPeriod),
        securityDeposit: ethers.parseEther(terms.securityDeposit),
        startTime: terms.startTime,
        endTime: terms.endTime,
        legalDocHash: ethers.keccak256(ethers.toUtf8Bytes('legal-doc-v1')),
        termsVersion: 1,
        metadata: []
      }
    };

    const tx = await this.marketplace.postLeaseOffer(leaseIntent);
    const receipt = await tx.wait();

    const event = receipt.logs
      .map((log: any) => {
        try {
          return this.marketplace.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((e: any) => e?.name === 'LeaseOfferPosted');

    return {
      offerId: event?.args.offerId || 0n,
      receipt
    };
  }

  async placeBid(
    offerId: string,
    escrowAmount: string
  ): Promise<{ bidIndex: number; txHash: string; signature: string }> {
    // Step 1: Fetch offer terms
    const offer = await this.marketplace.leaseOffers(offerId);
    const bidderAddress = await this.signer.getAddress();

    // Step 2: Build LeaseIntent with bidder as lessee
    const leaseIntent: LeaseIntentData = {
      deadline: offer.terms.deadline,
      assetTypeSchemaHash: offer.terms.assetType,
      lease: {
        lessor: offer.lessor,
        lessee: bidderAddress, // Bidder becomes lessee
        assetId: offer.terms.lease.assetId,
        paymentToken: offer.terms.lease.paymentToken,
        rentAmount: offer.terms.lease.rentAmount,
        rentPeriod: offer.terms.lease.rentPeriod,
        securityDeposit: offer.terms.lease.securityDeposit,
        startTime: offer.terms.lease.startTime,
        endTime: offer.terms.lease.endTime,
        legalDocHash: offer.terms.lease.legalDocHash,
        termsVersion: offer.terms.lease.termsVersion
      }
    };

    // Step 3: Generate EIP-712 signature
    const signature = await signLeaseIntent(
      this.signer,
      leaseIntent,
      this.leaseFactoryAddress,
      this.chainId
    );

    // Step 4: Approve USDC escrow
    const escrowWei = ethers.parseUnits(escrowAmount, 6); // USDC has 6 decimals
    const approveTx = await this.stablecoin.approve(
      await this.marketplace.getAddress(),
      escrowWei
    );
    await approveTx.wait();

    // Step 5: Place bid
    const bidTx = await this.marketplace.placeLeaseBid(offerId, signature, escrowWei);
    const receipt = await bidTx.wait();

    // Parse bid index from event
    const bidEvent = receipt.logs.find((log: any) => {
      try {
        const parsed = this.marketplace.interface.parseLog(log);
        return parsed?.name === 'LeaseBidPlaced';
      } catch {
        return false;
      }
    });

    let bidIndex = 0;
    if (bidEvent) {
      const parsed = this.marketplace.interface.parseLog(bidEvent);
      bidIndex = Number(parsed?.args?.bidIndex ?? 0);
    }

    return {
      bidIndex,
      txHash: receipt.hash,
      signature
    };
  }

  async acceptBid(
    offerId: string,
    bidIndex: number
  ): Promise<{ leaseTokenId: string; txHash: string; lessee: string }> {
    // Step 1: Fetch offer and bid details
    const offer = await this.marketplace.leaseOffers(offerId);
    const bid = await this.marketplace.leaseBids(offerId, bidIndex);

    // Step 2: Build LeaseIntent with bid's lessee
    const leaseIntent: LeaseIntentData = {
      deadline: offer.terms.deadline,
      assetTypeSchemaHash: offer.terms.assetType,
      lease: {
        lessor: offer.lessor,
        lessee: bid.bidder, // Use bidder's address as lessee
        assetId: offer.terms.lease.assetId,
        paymentToken: offer.terms.lease.paymentToken,
        rentAmount: offer.terms.lease.rentAmount,
        rentPeriod: offer.terms.lease.rentPeriod,
        securityDeposit: offer.terms.lease.securityDeposit,
        startTime: offer.terms.lease.startTime,
        endTime: offer.terms.lease.endTime,
        legalDocHash: offer.terms.lease.legalDocHash,
        termsVersion: offer.terms.lease.termsVersion
      }
    };

    // Step 3: Generate lessor's EIP-712 signature
    const signature = await signLeaseIntent(
      this.signer,
      leaseIntent,
      this.leaseFactoryAddress,
      this.chainId
    );

    // Step 4: Accept bid
    const acceptTx = await this.marketplace.acceptLeaseBid(offerId, bidIndex, signature);
    const receipt = await acceptTx.wait();

    // Parse lease token ID from event
    const leaseEvent = receipt.logs.find((log: any) => {
      try {
        const parsed = this.marketplace.interface.parseLog(log);
        return parsed?.name === 'LeaseAccepted';
      } catch {
        return false;
      }
    });

    let leaseTokenId = '0';
    let lessee = ethers.ZeroAddress;
    if (leaseEvent) {
      const parsed = this.marketplace.interface.parseLog(leaseEvent);
      leaseTokenId = (parsed?.args?.leaseTokenId ?? 0n).toString();
      lessee = parsed?.args?.bidder ?? ethers.ZeroAddress;
    }

    return {
      leaseTokenId,
      txHash: receipt.hash,
      lessee
    };
  }

  async getBids(offerId: string): Promise<Array<{
    bidder: string;
    funds: string;
    active: boolean;
  }>> {
    const bids = [];
    let index = 0;

    try {
      while (true) {
        const bid = await this.marketplace.leaseBids(offerId, index);
        if (bid.bidder === ethers.ZeroAddress) break;

        bids.push({
          bidder: bid.bidder,
          funds: ethers.formatUnits(bid.funds, 6),
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

