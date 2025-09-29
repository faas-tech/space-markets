/**
 * Event listener for Asset Leasing Protocol smart contracts
 *
 * Provides comprehensive event monitoring with proper error handling,
 * reorg detection, and reliable event processing for testing environments.
 */

import { ethers } from 'ethers';
import { EventEmitter } from 'events';

export interface ContractEvent {
  contractAddress: string;
  eventName: string;
  blockNumber: number;
  blockHash: string;
  transactionHash: string;
  logIndex: number;
  args: Record<string, any>;
  timestamp: number;
}

export interface EventFilter {
  contractAddress?: string;
  eventName?: string;
  fromBlock?: number;
  toBlock?: number;
}

export interface EventListenerConfig {
  rpcUrl: string;
  contracts: {
    assetRegistry: string;
    marketplace: string;
    leaseFactory: string;
  };
  pollingInterval?: number; // milliseconds
  confirmationBlocks?: number;
  maxRetries?: number;
  enableReorgProtection?: boolean;
}

/**
 * Comprehensive event listener for Asset Leasing Protocol
 */
export class AssetLeasingEventListener extends EventEmitter {
  private provider: ethers.JsonRpcProvider;
  private contracts: Map<string, ethers.Contract>;
  private isListening = false;
  private pollingInterval: NodeJS.Timeout | null = null;
  private lastProcessedBlock = 0;
  private eventBuffer: ContractEvent[] = [];
  private config: Required<EventListenerConfig>;

  // Contract ABIs for event parsing
  private static readonly ASSET_REGISTRY_ABI = [
    'event AssetTypeCreated(uint256 indexed typeId, string name, bytes32 schemaHash, bytes32[] requiredLeaseKeys, string schemaURI)',
    'event AssetRegistered(uint256 indexed assetId, uint256 indexed typeId, address tokenAddress)'
  ];

  private static readonly MARKETPLACE_ABI = [
    'event SalePosted(uint256 indexed saleId, address indexed seller, address assetToken, uint256 amount, uint256 askPricePerUnit)',
    'event SaleBidPlaced(uint256 indexed saleId, uint256 indexed bidIndex, address indexed bidder, uint256 amount, uint256 pricePerUnit, uint256 funds)',
    'event SaleBidAccepted(uint256 indexed saleId, uint256 indexed bidIndex, address bidder)',
    'event SaleBidRefunded(uint256 indexed saleId, uint256 indexed bidIndex, address bidder, uint256 amount)',
    'event LeaseOfferPosted(uint256 indexed offerId, address indexed lessor, uint256 assetId)',
    'event LeaseBidPlaced(uint256 indexed offerId, uint256 indexed bidIndex, address indexed bidder, uint256 funds)',
    'event LeaseAccepted(uint256 indexed offerId, uint256 indexed bidIndex, address indexed lessee, uint256 leaseTokenId)',
    'event RevenueRoundOpened(uint256 indexed roundId, address indexed assetToken, uint256 snapshotId, uint256 amount)',
    'event RevenueClaimed(uint256 indexed roundId, address indexed account, uint256 share)'
  ];

  private static readonly LEASE_FACTORY_ABI = [
    'event LeaseCreated(uint256 indexed leaseId, uint256 indexed assetId, address indexed lessee, address lessor, uint256 startTime, uint256 endTime)',
    'event LeaseTerminated(uint256 indexed leaseId, address indexed terminator, uint256 terminationTime)',
    'event LeasePaymentMade(uint256 indexed leaseId, uint256 amount, uint256 paymentTime)'
  ];

  constructor(config: EventListenerConfig) {
    super();

    this.config = {
      ...config,
      pollingInterval: config.pollingInterval || 2000,
      confirmationBlocks: config.confirmationBlocks || 1,
      maxRetries: config.maxRetries || 3,
      enableReorgProtection: config.enableReorgProtection ?? true
    };

    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.contracts = new Map();

    this.initializeContracts();
  }

  /**
   * Initialize contract instances for event parsing
   */
  private initializeContracts(): void {
    this.contracts.set(
      this.config.contracts.assetRegistry.toLowerCase(),
      new ethers.Contract(
        this.config.contracts.assetRegistry,
        AssetLeasingEventListener.ASSET_REGISTRY_ABI,
        this.provider
      )
    );

    this.contracts.set(
      this.config.contracts.marketplace.toLowerCase(),
      new ethers.Contract(
        this.config.contracts.marketplace,
        AssetLeasingEventListener.MARKETPLACE_ABI,
        this.provider
      )
    );

    this.contracts.set(
      this.config.contracts.leaseFactory.toLowerCase(),
      new ethers.Contract(
        this.config.contracts.leaseFactory,
        AssetLeasingEventListener.LEASE_FACTORY_ABI,
        this.provider
      )
    );
  }

  /**
   * Start listening for events
   */
  async startListening(fromBlock?: number): Promise<void> {
    if (this.isListening) {
      throw new Error('Event listener is already running');
    }

    console.log('Starting Asset Leasing Protocol event listener...');

    try {
      // Get current block number
      const currentBlock = await this.provider.getBlockNumber();
      this.lastProcessedBlock = fromBlock || currentBlock;

      console.log(`Starting from block ${this.lastProcessedBlock}`);

      this.isListening = true;

      // Start polling for new events
      this.pollingInterval = setInterval(
        () => this.pollForEvents(),
        this.config.pollingInterval
      );

      this.emit('started', { fromBlock: this.lastProcessedBlock });

    } catch (error) {
      console.error('Failed to start event listener:', error);
      throw error;
    }
  }

  /**
   * Stop listening for events
   */
  async stopListening(): Promise<void> {
    if (!this.isListening) {
      return;
    }

    console.log('Stopping event listener...');

    this.isListening = false;

    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    // Process any remaining events in buffer
    await this.processEventBuffer();

    this.emit('stopped');
    console.log('Event listener stopped');
  }

  /**
   * Poll for new events
   */
  private async pollForEvents(): Promise<void> {
    if (!this.isListening) {
      return;
    }

    try {
      const currentBlock = await this.provider.getBlockNumber();
      const confirmedBlock = currentBlock - this.config.confirmationBlocks;

      if (confirmedBlock <= this.lastProcessedBlock) {
        return; // No new confirmed blocks
      }

      console.log(`Polling for events from block ${this.lastProcessedBlock + 1} to ${confirmedBlock}`);

      // Get events from all contracts
      const events = await this.getEventsInRange(
        this.lastProcessedBlock + 1,
        confirmedBlock
      );

      if (events.length > 0) {
        console.log(`Found ${events.length} events`);

        // Add to buffer and process
        this.eventBuffer.push(...events);
        await this.processEventBuffer();
      }

      this.lastProcessedBlock = confirmedBlock;

    } catch (error) {
      console.error('Error polling for events:', error);
      this.emit('error', error);
    }
  }

  /**
   * Get events in a specific block range
   */
  private async getEventsInRange(fromBlock: number, toBlock: number): Promise<ContractEvent[]> {
    const events: ContractEvent[] = [];

    for (const [address, contract] of this.contracts) {
      try {
        const filter = {
          address: contract.target,
          fromBlock,
          toBlock
        };

        const logs = await this.provider.getLogs(filter);

        for (const log of logs) {
          try {
            const parsedLog = contract.interface.parseLog({
              topics: log.topics,
              data: log.data
            });

            if (parsedLog) {
              const block = await this.provider.getBlock(log.blockNumber);

              const event: ContractEvent = {
                contractAddress: address,
                eventName: parsedLog.name,
                blockNumber: log.blockNumber,
                blockHash: log.blockHash,
                transactionHash: log.transactionHash,
                logIndex: log.index,
                args: this.formatEventArgs(parsedLog.args),
                timestamp: block?.timestamp || 0
              };

              events.push(event);
            }
          } catch (parseError) {
            // Log might not be from our contracts, skip silently
          }
        }
      } catch (error) {
        console.error(`Error getting events for contract ${address}:`, error);
      }
    }

    // Sort events by block number, then log index
    return events.sort((a, b) => {
      if (a.blockNumber !== b.blockNumber) {
        return a.blockNumber - b.blockNumber;
      }
      return a.logIndex - b.logIndex;
    });
  }

  /**
   * Process events in buffer
   */
  private async processEventBuffer(): Promise<void> {
    while (this.eventBuffer.length > 0) {
      const event = this.eventBuffer.shift()!;

      try {
        // Emit specific event
        this.emit(`event:${event.eventName}`, event);

        // Emit general event
        this.emit('event', event);

        // Handle reorg protection if enabled
        if (this.config.enableReorgProtection) {
          await this.handleReorgProtection(event);
        }

      } catch (error) {
        console.error('Error processing event:', error);
        this.emit('error', { error, event });
      }
    }
  }

  /**
   * Handle blockchain reorganization protection
   */
  private async handleReorgProtection(event: ContractEvent): Promise<void> {
    try {
      // Verify the block still exists and hasn't changed
      const currentBlock = await this.provider.getBlock(event.blockNumber);

      if (!currentBlock || currentBlock.hash !== event.blockHash) {
        console.warn(`Detected reorg at block ${event.blockNumber}, event may be invalidated`);
        this.emit('reorg', { event, currentBlock });
      }
    } catch (error) {
      console.error('Error checking for reorg:', error);
    }
  }

  /**
   * Format event arguments for easier consumption
   */
  private formatEventArgs(args: ethers.Result): Record<string, any> {
    const formatted: Record<string, any> = {};

    for (let i = 0; i < args.length; i++) {
      const key = args.getKey(i);
      let value = args.getValue(i);

      // Convert BigInt to string for JSON serialization
      if (typeof value === 'bigint') {
        value = value.toString();
      }

      // Handle arrays
      if (Array.isArray(value)) {
        value = value.map(item =>
          typeof item === 'bigint' ? item.toString() : item
        );
      }

      if (key) {
        formatted[key] = value;
      }
      formatted[i] = value; // Also include numeric index
    }

    return formatted;
  }

  /**
   * Get historical events with filtering
   */
  async getHistoricalEvents(filter: EventFilter): Promise<ContractEvent[]> {
    const fromBlock = filter.fromBlock || 0;
    const toBlock = filter.toBlock || await this.provider.getBlockNumber();

    let events = await this.getEventsInRange(fromBlock, toBlock);

    // Apply filters
    if (filter.contractAddress) {
      events = events.filter(e =>
        e.contractAddress.toLowerCase() === filter.contractAddress!.toLowerCase()
      );
    }

    if (filter.eventName) {
      events = events.filter(e => e.eventName === filter.eventName);
    }

    return events;
  }

  /**
   * Get the current block number
   */
  async getCurrentBlock(): Promise<number> {
    return await this.provider.getBlockNumber();
  }

  /**
   * Get listener status
   */
  getStatus(): {
    isListening: boolean;
    lastProcessedBlock: number;
    bufferedEvents: number;
    config: Required<EventListenerConfig>;
  } {
    return {
      isListening: this.isListening,
      lastProcessedBlock: this.lastProcessedBlock,
      bufferedEvents: this.eventBuffer.length,
      config: this.config
    };
  }

  /**
   * Wait for a specific event
   */
  async waitForEvent(
    eventName: string,
    filter?: (event: ContractEvent) => boolean,
    timeoutMs = 30000
  ): Promise<ContractEvent> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.removeListener(`event:${eventName}`, handler);
        reject(new Error(`Timeout waiting for event ${eventName}`));
      }, timeoutMs);

      const handler = (event: ContractEvent) => {
        if (!filter || filter(event)) {
          clearTimeout(timeout);
          this.removeListener(`event:${eventName}`, handler);
          resolve(event);
        }
      };

      this.on(`event:${eventName}`, handler);
    });
  }

  /**
   * Wait for transaction confirmation and return its events
   */
  async waitForTransactionEvents(
    txHash: string,
    timeoutMs = 30000
  ): Promise<ContractEvent[]> {
    const receipt = await this.provider.waitForTransaction(txHash, this.config.confirmationBlocks);

    if (!receipt) {
      throw new Error(`Transaction ${txHash} not found or failed`);
    }

    // Get events from this transaction
    const events = await this.getEventsInRange(receipt.blockNumber, receipt.blockNumber);
    return events.filter(e => e.transactionHash === txHash);
  }
}

/**
 * Create and configure an event listener
 */
export function createEventListener(config: EventListenerConfig): AssetLeasingEventListener {
  return new AssetLeasingEventListener(config);
}