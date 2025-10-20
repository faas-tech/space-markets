/**
 * EventProcessor - Real-time blockchain event monitoring
 *
 * Listens for blockchain events and processes them with automatic
 * reconnection, deduplication, and reorg protection.
 *
 * Philosophy: Make blockchain events as easy as EventEmitter
 */

import { ethers, Contract, EventLog } from 'ethers';
import { EventEmitter } from 'events';

export interface ProcessedEvent {
  eventName: string;
  contractAddress: string;
  blockNumber: number;
  transactionHash: string;
  logIndex: number;
  args: Record<string, any>;
  timestamp?: number;
}

export interface EventProcessorConfig {
  maxBlockRange?: number; // Maximum blocks to query at once (default: 10000)
  pollInterval?: number; // Poll interval in ms (default: 2000)
  confirmations?: number; // Wait for N confirmations (default: 1)
  autoReconnect?: boolean; // Auto-reconnect on error (default: true)
  reconnectDelay?: number; // Reconnect delay in ms (default: 5000)
}

/**
 * Real-time blockchain event processor
 *
 * Example usage:
 * ```typescript
 * const processor = new EventProcessor(provider, {
 *   pollInterval: 2000,
 *   confirmations: 1
 * });
 *
 * // Listen for specific event
 * processor.on('AssetRegistered', (event) => {
 *   console.log('New asset:', event.args.assetId);
 * });
 *
 * // Add contract to monitor
 * processor.addContract('AssetRegistry', registryContract);
 *
 * // Start listening
 * await processor.start();
 * ```
 */
export class EventProcessor extends EventEmitter {
  private provider: ethers.Provider;
  private config: Required<EventProcessorConfig>;
  private contracts: Map<string, Contract> = new Map();
  private processedEvents: Set<string> = new Set();
  private isRunning: boolean = false;
  private lastProcessedBlock: number = 0;
  private pollTimer: NodeJS.Timeout | null = null;
  private eventCount: number = 0;

  constructor(provider: ethers.Provider, config: EventProcessorConfig = {}) {
    super();
    this.provider = provider;
    this.config = {
      maxBlockRange: config.maxBlockRange || 10000,
      pollInterval: config.pollInterval || 2000,
      confirmations: config.confirmations || 1,
      autoReconnect: config.autoReconnect !== false,
      reconnectDelay: config.reconnectDelay || 5000
    };
  }

  /**
   * Add contract to monitor
   */
  addContract(name: string, contract: Contract): void {
    this.contracts.set(name, contract);
    console.log(`✓ Monitoring ${name} for events`);
  }

  /**
   * Remove contract from monitoring
   */
  removeContract(name: string): void {
    this.contracts.delete(name);
    console.log(`✓ Stopped monitoring ${name}`);
  }

  /**
   * Start listening for events
   */
  async start(fromBlock?: number): Promise<void> {
    if (this.isRunning) {
      console.log('⚠ Event processor already running');
      return;
    }

    this.isRunning = true;

    // Determine starting block
    if (fromBlock !== undefined) {
      this.lastProcessedBlock = fromBlock;
    } else {
      const currentBlock = await this.provider.getBlockNumber();
      this.lastProcessedBlock = currentBlock - this.config.confirmations;
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  Event Processor Started');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(`Starting from block: ${this.lastProcessedBlock}`);
    console.log(`Confirmations: ${this.config.confirmations}`);
    console.log(`Poll interval: ${this.config.pollInterval}ms`);
    console.log(`Monitoring ${this.contracts.size} contract(s)\n`);

    // Start polling loop
    this.pollEvents();
  }

  /**
   * Stop listening for events
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }

    console.log('\n✓ Event processor stopped');
    console.log(`  Total events processed: ${this.eventCount}`);
  }

  /**
   * Poll for new events
   */
  private async pollEvents(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      const currentBlock = await this.provider.getBlockNumber();
      const targetBlock = currentBlock - this.config.confirmations;

      if (targetBlock > this.lastProcessedBlock) {
        const fromBlock = this.lastProcessedBlock + 1;
        const toBlock = Math.min(targetBlock, fromBlock + this.config.maxBlockRange - 1);

        await this.processBlockRange(fromBlock, toBlock);

        this.lastProcessedBlock = toBlock;
      }
    } catch (error) {
      console.error('Error polling events:', error);

      if (this.config.autoReconnect) {
        console.log(`  Reconnecting in ${this.config.reconnectDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, this.config.reconnectDelay));
      } else {
        this.isRunning = false;
        this.emit('error', error);
        return;
      }
    }

    // Schedule next poll
    this.pollTimer = setTimeout(() => this.pollEvents(), this.config.pollInterval);
  }

  /**
   * Process events in a block range
   */
  private async processBlockRange(fromBlock: number, toBlock: number): Promise<void> {
    for (const [contractName, contract] of this.contracts) {
      try {
        // Get all events for this contract
        const filter = {
          address: await contract.getAddress(),
          fromBlock,
          toBlock
        };

        const logs = await this.provider.getLogs(filter);

        for (const log of logs) {
          await this.processLog(contractName, contract, log);
        }
      } catch (error) {
        console.error(`Error processing events for ${contractName}:`, error);
        this.emit('error', { contractName, error });
      }
    }
  }

  /**
   * Process a single log entry
   */
  private async processLog(contractName: string, contract: Contract, log: any): Promise<void> {
    try {
      // Create unique event ID for deduplication
      const eventId = `${log.transactionHash}-${log.logIndex}`;

      if (this.processedEvents.has(eventId)) {
        return; // Already processed
      }

      // Parse the log
      const parsedLog = contract.interface.parseLog({
        topics: log.topics,
        data: log.data
      });

      if (!parsedLog) {
        return; // Couldn't parse
      }

      // Convert args to plain object
      const args: Record<string, any> = {};
      if (parsedLog.args) {
        for (let i = 0; i < parsedLog.args.length; i++) {
          const key = parsedLog.fragment.inputs[i]?.name || `arg${i}`;
          args[key] = parsedLog.args[i];
        }
      }

      const processedEvent: ProcessedEvent = {
        eventName: parsedLog.name,
        contractAddress: log.address,
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
        logIndex: log.logIndex,
        args
      };

      // Mark as processed
      this.processedEvents.add(eventId);
      this.eventCount++;

      // Emit the event
      this.emit(parsedLog.name, processedEvent);
      this.emit('event', processedEvent);

      console.log(`  📡 ${parsedLog.name} (block ${log.blockNumber})`);
    } catch (error) {
      console.error(`Error processing log:`, error);
    }
  }

  /**
   * Get the last processed block number
   */
  getLastProcessedBlock(): number {
    return this.lastProcessedBlock;
  }

  /**
   * Get total events processed
   */
  getEventCount(): number {
    return this.eventCount;
  }

  /**
   * Check if processor is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Clear processed events cache (useful for testing)
   */
  clearCache(): void {
    this.processedEvents.clear();
    this.eventCount = 0;
    console.log('✓ Event cache cleared');
  }

  /**
   * Wait for specific event
   */
  async waitForEvent(
    eventName: string,
    timeoutMs: number = 30000
  ): Promise<ProcessedEvent> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.removeListener(eventName, handler);
        reject(new Error(`Timeout waiting for event ${eventName}`));
      }, timeoutMs);

      const handler = (event: ProcessedEvent) => {
        clearTimeout(timeout);
        resolve(event);
      };

      this.once(eventName, handler);
    });
  }
}
