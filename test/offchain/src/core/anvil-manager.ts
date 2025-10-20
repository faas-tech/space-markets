/**
 * Anvil blockchain manager for local testing
 *
 * Provides utilities to start, stop, and manage Anvil instances
 * for comprehensive offchain/onchain integration testing.
 */

import { spawn, ChildProcess } from 'child_process';
import { ethers } from 'ethers';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

export interface AnvilConfig {
  port: number;
  chainId: number;
  blockTime?: number;
  gasLimit?: string;
  gasPrice?: string;
  accounts?: number;
  mnemonic?: string;
  forkUrl?: string;
  forkBlockNumber?: number;
  dataDir?: string;
}

export interface AnvilInstance {
  process: ChildProcess;
  config: AnvilConfig;
  rpcUrl: string;
  accounts: Array<{
    address: string;
    privateKey: string;
    balance: string;
  }>;
}

/**
 * Manages Anvil blockchain instances for testing
 */
export class AnvilManager {
  private instances = new Map<string, AnvilInstance>();

  /**
   * Start a new Anvil instance with specified configuration
   */
  async startAnvil(
    instanceId: string,
    config: AnvilConfig
  ): Promise<AnvilInstance> {
    if (this.instances.has(instanceId)) {
      throw new Error(`Anvil instance '${instanceId}' already running`);
    }

    console.log(`Starting Anvil instance '${instanceId}' on port ${config.port}`);

    // Build anvil command arguments
    const args = [
      '--port', config.port.toString(),
      '--chain-id', config.chainId.toString(),
      '--accounts', (config.accounts || 10).toString(),
      '--balance', '10000', // 10,000 ETH per account
    ];

    if (config.blockTime) {
      args.push('--block-time', config.blockTime.toString());
    }

    if (config.gasLimit) {
      args.push('--gas-limit', config.gasLimit);
    }

    if (config.gasPrice) {
      args.push('--gas-price', config.gasPrice);
    }

    if (config.mnemonic) {
      args.push('--mnemonic', config.mnemonic);
    }

    if (config.forkUrl) {
      args.push('--fork-url', config.forkUrl);
      if (config.forkBlockNumber) {
        args.push('--fork-block-number', config.forkBlockNumber.toString());
      }
    }

    if (config.dataDir) {
      if (!existsSync(config.dataDir)) {
        mkdirSync(config.dataDir, { recursive: true });
      }
      args.push('--state', join(config.dataDir, `anvil-${instanceId}.json`));
    }

    // Start anvil process
    const process = spawn('anvil', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
      shell: false
    });

    // Capture output for debugging
    let output = '';
    process.stdout?.on('data', (data) => {
      output += data.toString();
    });
    process.stderr?.on('data', (data) => {
      output += data.toString();
    });

    const rpcUrl = `http://localhost:${config.port}`;

    // Wait for anvil to be ready
    await this.waitForAnvilReady(rpcUrl);

    // Generate account information
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const accounts = await this.generateAccountInfo(provider, config.accounts || 10);

    const instance: AnvilInstance = {
      process,
      config,
      rpcUrl,
      accounts
    };

    this.instances.set(instanceId, instance);

    // Log startup information
    console.log(`Anvil '${instanceId}' started successfully:`);
    console.log(`  RPC URL: ${rpcUrl}`);
    console.log(`  Chain ID: ${config.chainId}`);
    console.log(`  Accounts: ${accounts.length}`);

    return instance;
  }

  /**
   * Stop an Anvil instance
   */
  async stopAnvil(instanceId: string): Promise<void> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Anvil instance '${instanceId}' not found`);
    }

    console.log(`Stopping Anvil instance '${instanceId}'`);

    return new Promise((resolve, reject) => {
      instance.process.on('exit', () => {
        this.instances.delete(instanceId);
        console.log(`Anvil instance '${instanceId}' stopped`);
        resolve();
      });

      instance.process.on('error', reject);

      // Send SIGTERM to gracefully shut down
      instance.process.kill('SIGTERM');

      // Force kill after 5 seconds if not gracefully shutdown
      setTimeout(() => {
        if (!instance.process.killed) {
          console.warn(`Force killing Anvil instance '${instanceId}'`);
          instance.process.kill('SIGKILL');
        }
      }, 5000);
    });
  }

  /**
   * Stop all running Anvil instances
   */
  async stopAll(): Promise<void> {
    const stopPromises = Array.from(this.instances.keys()).map(id =>
      this.stopAnvil(id).catch(error =>
        console.error(`Error stopping Anvil instance '${id}':`, error)
      )
    );

    await Promise.all(stopPromises);
  }

  /**
   * Get a running Anvil instance
   */
  getInstance(instanceId: string): AnvilInstance | undefined {
    return this.instances.get(instanceId);
  }

  /**
   * List all running instances
   */
  listInstances(): Array<{ id: string; instance: AnvilInstance }> {
    return Array.from(this.instances.entries()).map(([id, instance]) => ({
      id,
      instance
    }));
  }

  /**
   * Save Anvil configuration and account info to file
   */
  saveInstanceConfig(instanceId: string, outputPath: string): void {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Anvil instance '${instanceId}' not found`);
    }

    const config = {
      network: instanceId,
      rpcUrl: instance.rpcUrl,
      chainId: instance.config.chainId,
      accounts: instance.accounts,
      contracts: {
        // These would be filled in after deployment
        assetRegistry: "",
        marketplace: "",
        leaseFactory: ""
      }
    };

    writeFileSync(outputPath, JSON.stringify(config, null, 2));
    console.log(`Anvil configuration saved to ${outputPath}`);
  }

  /**
   * Wait for Anvil to be ready by polling the RPC endpoint
   */
  private async waitForAnvilReady(rpcUrl: string, maxAttempts = 30): Promise<void> {
    // Give Anvil extra time to start up
    await new Promise(resolve => setTimeout(resolve, 2000));

    for (let i = 0; i < maxAttempts; i++) {
      try {
        const provider = new ethers.JsonRpcProvider(rpcUrl, undefined, {
          staticNetwork: true, // Skip network detection
        });
        const blockNumber = await provider.getBlockNumber();
        console.log(`Anvil ready at block ${blockNumber}`);
        return; // Success
      } catch (error) {
        if (i === maxAttempts - 1) {
          throw new Error(`Anvil failed to start after ${maxAttempts} attempts. Last error: ${error}`);
        }
        // Don't spam the console
        if (i % 5 === 0) {
          console.log(`Waiting for Anvil... (attempt ${i + 1}/${maxAttempts})`);
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  /**
   * Generate account information from provider
   */
  private async generateAccountInfo(
    provider: ethers.JsonRpcProvider,
    accountCount: number
  ): Promise<Array<{ address: string; privateKey: string; balance: string }>> {
    const accounts = [];

    // Anvil uses predictable private keys starting from this base
    const basePrivateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

    for (let i = 0; i < accountCount; i++) {
      // Generate deterministic private key (this is how Anvil does it)
      const privateKeyBigInt = BigInt(basePrivateKey) + BigInt(i);
      const privateKey = '0x' + privateKeyBigInt.toString(16).padStart(64, '0');

      const wallet = new ethers.Wallet(privateKey);
      const balance = await provider.getBalance(wallet.address);

      accounts.push({
        address: wallet.address,
        privateKey,
        balance: ethers.formatEther(balance)
      });
    }

    return accounts;
  }

  /**
   * Take a snapshot of blockchain state
   */
  async takeSnapshot(instanceId: string): Promise<string> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Anvil instance '${instanceId}' not found`);
    }

    const provider = new ethers.JsonRpcProvider(instance.rpcUrl);
    const snapshotId = await provider.send('evm_snapshot', []);

    console.log(`Snapshot taken for '${instanceId}': ${snapshotId}`);
    return snapshotId;
  }

  /**
   * Revert to a previously taken snapshot
   */
  async revertToSnapshot(instanceId: string, snapshotId: string): Promise<boolean> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Anvil instance '${instanceId}' not found`);
    }

    const provider = new ethers.JsonRpcProvider(instance.rpcUrl);
    const success = await provider.send('evm_revert', [snapshotId]);

    console.log(`Reverted '${instanceId}' to snapshot ${snapshotId}: ${success}`);
    return success;
  }

  /**
   * Advance blockchain time
   */
  async increaseTime(instanceId: string, seconds: number): Promise<void> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Anvil instance '${instanceId}' not found`);
    }

    const provider = new ethers.JsonRpcProvider(instance.rpcUrl);
    await provider.send('evm_increaseTime', [seconds]);
    await provider.send('evm_mine', []);

    console.log(`Advanced time by ${seconds} seconds for '${instanceId}'`);
  }

  /**
   * Mine a specific number of blocks
   */
  async mineBlocks(instanceId: string, blockCount: number): Promise<void> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Anvil instance '${instanceId}' not found`);
    }

    const provider = new ethers.JsonRpcProvider(instance.rpcUrl);

    for (let i = 0; i < blockCount; i++) {
      await provider.send('evm_mine', []);
    }

    console.log(`Mined ${blockCount} blocks for '${instanceId}'`);
  }
}

/**
 * Global anvil manager instance
 */
export const anvilManager = new AnvilManager();

/**
 * Cleanup function to stop all anvil instances on process exit
 */
process.on('exit', () => {
  anvilManager.stopAll();
});

process.on('SIGINT', async () => {
  await anvilManager.stopAll();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await anvilManager.stopAll();
  process.exit(0);
});