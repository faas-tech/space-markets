/**
 * BlockchainClient - Simple wrapper around ethers.js for Web2 developers
 *
 * This class abstracts away blockchain complexity, providing simple methods
 * for common operations. Web2 developers don't need to understand gas,
 * nonces, or transaction signing - just call methods like any REST API.
 *
 * Philosophy: Make blockchain as easy as Express.js
 */

import { ethers, Contract, TransactionReceipt, TransactionResponse } from 'ethers';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface BlockchainConfig {
  rpcUrl: string;
  privateKey: string;
  chainId?: number;
  gasMultiplier?: number; // Default 1.2 (20% buffer)
  maxRetries?: number; // Default 3
  retryDelay?: number; // Default 1000ms
}

export interface TransactionResult {
  transactionHash: string;
  blockNumber: number;
  gasUsed: string;
  success: boolean;
  events?: any[];
}

export interface AssetResult extends TransactionResult {
  assetId: bigint;
  tokenAddress: string;
  metadataHash: string;
}

export interface LeaseResult extends TransactionResult {
  leaseId: bigint;
  lessee: string;
  lessor: string;
}

/**
 * Simple blockchain client for Web2 developers
 *
 * Example usage:
 * ```typescript
 * const client = new BlockchainClient({
 *   rpcUrl: 'http://localhost:8545',
 *   privateKey: '0x...'
 * });
 *
 * await client.connect();
 * const result = await client.registerAsset(metadata);
 * console.log('Asset registered:', result.assetId);
 * ```
 */
export class BlockchainClient {
  private provider: ethers.JsonRpcProvider | null = null;
  private wallet: ethers.Wallet | null = null;
  private contracts: Map<string, Contract> = new Map();
  private config: Required<BlockchainConfig>;

  constructor(config: BlockchainConfig) {
    this.config = {
      rpcUrl: config.rpcUrl,
      privateKey: config.privateKey,
      chainId: config.chainId || 31337,
      gasMultiplier: config.gasMultiplier || 1.2,
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000
    };
  }

  /**
   * Connect to blockchain
   */
  async connect(): Promise<void> {
    try {
      this.provider = new ethers.JsonRpcProvider(this.config.rpcUrl);
      this.wallet = new ethers.Wallet(this.config.privateKey, this.provider);

      // Verify connection
      const network = await this.provider.getNetwork();
      const balance = await this.provider.getBalance(this.wallet.address);

      console.log('✓ Connected to blockchain');
      console.log(`  Address: ${this.wallet.address}`);
      console.log(`  Chain ID: ${network.chainId}`);
      console.log(`  Balance: ${ethers.formatEther(balance)} ETH`);
    } catch (error) {
      throw new Error(`Failed to connect to blockchain: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Reset provider to clear cached nonces and state
   *
   * This creates a new provider instance, which forces fresh queries to the blockchain.
   * Call this between deployments to avoid nonce caching issues.
   *
   * Why needed: ethers.js caches transaction counts (nonces) for performance.
   * After deploying a contract, the provider may still have the old nonce cached,
   * causing "nonce already used" errors on the next deployment.
   */
  async resetProvider(): Promise<void> {
    if (!this.wallet) {
      throw new Error('Not connected. Call connect() first.');
    }

    // Create new provider instance (clears all caches)
    this.provider = new ethers.JsonRpcProvider(this.config.rpcUrl);

    // Reconnect wallet with new provider
    this.wallet = new ethers.Wallet(this.config.privateKey, this.provider);
  }

  /**
   * Load contract from ABI file
   */
  loadContract(name: string, address: string): Contract {
    if (!this.wallet) {
      throw new Error('Not connected. Call connect() first.');
    }

    // Load ABI from out/ directory (Foundry build artifacts)
    const artifactPath = join(__dirname, '../../../../out', `${name}.sol`, `${name}.json`);

    try {
      const artifact = JSON.parse(readFileSync(artifactPath, 'utf-8'));
      const contract = new ethers.Contract(address, artifact.abi, this.wallet);

      this.contracts.set(name, contract);
      console.log(`✓ Loaded contract ${name} at ${address}`);

      return contract;
    } catch (error) {
      throw new Error(`Failed to load contract ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get loaded contract by name
   */
  getContract(name: string): Contract {
    const contract = this.contracts.get(name);
    if (!contract) {
      throw new Error(`Contract ${name} not loaded. Call loadContract() first.`);
    }
    return contract;
  }

  /**
   * Submit transaction with automatic retry and gas estimation
   */
  async submitTransaction(
    contract: Contract,
    methodName: string,
    args: any[],
    options: { value?: bigint } = {}
  ): Promise<TransactionResult> {
    if (!this.provider) {
      throw new Error('Not connected. Call connect() first.');
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        console.log(`  Attempt ${attempt}/${this.config.maxRetries}: Submitting ${methodName}...`);

        // Estimate gas
        const gasEstimate = await contract[methodName].estimateGas(...args, options);
        const gasLimit = BigInt(Math.floor(Number(gasEstimate) * this.config.gasMultiplier));

        // Submit transaction
        const tx: TransactionResponse = await contract[methodName](...args, {
          ...options,
          gasLimit
        });

        console.log(`  ✓ Transaction submitted: ${tx.hash}`);
        console.log(`    Waiting for confirmation...`);

        // Wait for confirmation
        const receipt = await tx.wait();

        if (!receipt) {
          throw new Error('Transaction receipt is null');
        }

        console.log(`  ✓ Confirmed at block ${receipt.blockNumber}`);
        console.log(`    Gas used: ${receipt.gasUsed.toString()}`);

        // Parse events
        const events = receipt.logs
          .map(log => {
            try {
              return contract.interface.parseLog({
                topics: log.topics as string[],
                data: log.data
              });
            } catch {
              return null;
            }
          })
          .filter(event => event !== null);

        return {
          transactionHash: receipt.hash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString(),
          success: receipt.status === 1,
          events
        };

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.log(`  ✗ Attempt ${attempt} failed: ${lastError.message}`);

        if (attempt < this.config.maxRetries) {
          console.log(`    Retrying in ${this.config.retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
        }
      }
    }

    throw new Error(`Transaction failed after ${this.config.maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForTransaction(txHash: string): Promise<TransactionReceipt> {
    if (!this.provider) {
      throw new Error('Not connected. Call connect() first.');
    }

    console.log(`  Waiting for transaction ${txHash}...`);

    const receipt = await this.provider.waitForTransaction(txHash);

    if (!receipt) {
      throw new Error('Transaction receipt is null');
    }

    console.log(`  ✓ Transaction confirmed at block ${receipt.blockNumber}`);

    return receipt;
  }

  /**
   * Get account balance
   */
  async getBalance(address?: string): Promise<string> {
    if (!this.provider) {
      throw new Error('Not connected. Call connect() first.');
    }

    const addr = address || this.wallet?.address;
    if (!addr) {
      throw new Error('No address provided and wallet not connected');
    }

    const balance = await this.provider.getBalance(addr);
    return ethers.formatEther(balance);
  }

  /**
   * Get current block number
   */
  async getBlockNumber(): Promise<number> {
    if (!this.provider) {
      throw new Error('Not connected. Call connect() first.');
    }

    return await this.provider.getBlockNumber();
  }

  /**
   * Get network information
   */
  async getNetworkInfo(): Promise<{
    chainId: bigint;
    name: string;
    blockNumber: number;
  }> {
    if (!this.provider) {
      throw new Error('Not connected. Call connect() first.');
    }

    const network = await this.provider.getNetwork();
    const blockNumber = await this.provider.getBlockNumber();

    return {
      chainId: network.chainId,
      name: network.name,
      blockNumber
    };
  }

  /**
   * Get wallet address
   */
  getAddress(): string {
    if (!this.wallet) {
      throw new Error('Not connected. Call connect() first.');
    }
    return this.wallet.address;
  }

  /**
   * Get provider (for advanced usage)
   */
  getProvider(): ethers.JsonRpcProvider {
    if (!this.provider) {
      throw new Error('Not connected. Call connect() first.');
    }
    return this.provider;
  }

  /**
   * Get wallet (for advanced usage)
   */
  getWallet(): ethers.Wallet {
    if (!this.wallet) {
      throw new Error('Not connected. Call connect() first.');
    }
    return this.wallet;
  }

  /**
   * Parse events from transaction receipt
   */
  parseEvents(receipt: TransactionReceipt, contractName: string): any[] {
    const contract = this.getContract(contractName);

    return receipt.logs
      .map(log => {
        try {
          return contract.interface.parseLog({
            topics: log.topics as string[],
            data: log.data
          });
        } catch {
          return null;
        }
      })
      .filter(event => event !== null);
  }

  /**
   * Disconnect from blockchain
   */
  async disconnect(): Promise<void> {
    this.provider = null;
    this.wallet = null;
    this.contracts.clear();
    console.log('✓ Disconnected from blockchain');
  }
}
