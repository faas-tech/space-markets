/**
 * Asset Leasing Protocol Off-Chain Test System
 *
 * Main entry point for the off-chain test system. Provides a simple
 * API for testing integration between off-chain metadata and on-chain
 * smart contracts.
 */

// Export all types
export * from './types/index.js';

// Export all schemas
export * from './schemas/index.js';

// Export utility functions
export * from './utils/crypto.js';
export * from './utils/validation.js';
export * from './utils/file-storage.js';

// Export integration utilities
export * from './integration/blockchain.js';

// Re-export commonly used functions for convenience
import { generateMetadataHash, generateDocumentHash, verifyHash } from './utils/crypto.js';
import { validateAssetMetadata, validateLeaseAgreement, validateDirectory } from './utils/validation.js';
import { FileStorageManager, quickSaveAsset, quickLoadAsset, quickSaveLease, quickLoadLease } from './utils/file-storage.js';
import { BlockchainIntegration, createBlockchainIntegration, testBlockchainConnection } from './integration/blockchain.js';

/**
 * Convenience exports for common operations
 */
export const crypto = {
  generateMetadataHash,
  generateDocumentHash,
  verifyHash
};

export const validation = {
  validateAssetMetadata,
  validateLeaseAgreement,
  validateDirectory
};

export const storage = {
  FileStorageManager,
  quickSaveAsset,
  quickLoadAsset,
  quickSaveLease,
  quickLoadLease
};

export const blockchain = {
  BlockchainIntegration,
  createBlockchainIntegration,
  testBlockchainConnection
};

/**
 * Main test system class that orchestrates all components
 */
export class AssetLeasingTestSystem {
  private storage: FileStorageManager;
  private blockchain?: BlockchainIntegration;

  constructor(
    private config: {
      dataDir: string;
      blockchainConfig?: any;
    }
  ) {
    this.storage = new FileStorageManager({ baseDir: config.dataDir });

    if (config.blockchainConfig) {
      this.blockchain = new BlockchainIntegration(config.blockchainConfig);
    }
  }

  /**
   * Initialize the test system
   */
  async initialize(): Promise<void> {
    await this.storage.initialize();

    if (this.blockchain) {
      // Test blockchain connection
      const networkInfo = await this.blockchain.getNetworkInfo();
      console.log(`Connected to chain ID ${networkInfo.chainId} at block ${networkInfo.blockNumber}`);
    }
  }

  /**
   * Load and validate all data in the system
   */
  async validateAllData(): Promise<{
    valid: boolean;
    summary: {
      totalFiles: number;
      validFiles: number;
      errors: number;
      warnings: number;
    };
  }> {
    const results = await validateDirectory(this.config.dataDir);

    const totalFiles = results.assets.length + results.leases.length + results.revenue.length;
    const validFiles = [
      ...results.assets,
      ...results.leases,
      ...results.revenue
    ].filter(r => r.valid).length;

    const errors = [
      ...results.assets,
      ...results.leases,
      ...results.revenue
    ].reduce((count, r) => count + (r.errors?.length || 0), 0);

    const warnings = [
      ...results.assets,
      ...results.leases,
      ...results.revenue
    ].reduce((count, r) => count + (r.warnings?.length || 0), 0);

    return {
      valid: validFiles === totalFiles,
      summary: {
        totalFiles,
        validFiles,
        errors,
        warnings
      }
    };
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<any> {
    return await this.storage.getStorageStats();
  }

  /**
   * Get blockchain network information
   */
  async getNetworkInfo(): Promise<any> {
    if (!this.blockchain) {
      throw new Error('Blockchain integration not configured');
    }

    return await this.blockchain.getNetworkInfo();
  }

  /**
   * Test full integration workflow
   */
  async testIntegrationWorkflow(): Promise<{
    success: boolean;
    steps: Array<{ step: string; success: boolean; details?: any; error?: string }>;
  }> {
    const steps: Array<{ step: string; success: boolean; details?: any; error?: string }> = [];

    try {
      // Step 1: Validate all data
      steps.push({ step: 'Validate off-chain data', success: false });
      const validation = await this.validateAllData();
      if (!validation.valid) {
        steps[steps.length - 1]!.error = `${validation.summary.errors} validation errors found`;
        return { success: false, steps };
      }
      steps[steps.length - 1]!.success = true;
      steps[steps.length - 1]!.details = validation.summary;

      // Step 2: Test blockchain connection
      if (this.blockchain) {
        steps.push({ step: 'Test blockchain connection', success: false });
        const networkInfo = await this.blockchain.getNetworkInfo();
        steps[steps.length - 1]!.success = true;
        steps[steps.length - 1]!.details = networkInfo;

        // Step 3: Load sample asset
        steps.push({ step: 'Load sample asset', success: false });
        const assetsList = await this.storage.listAssets();
        if (!assetsList.success || !assetsList.assets || assetsList.assets.length === 0) {
          steps[steps.length - 1]!.error = 'No assets found';
          return { success: false, steps };
        }

        const sampleAssetId = assetsList.assets[0]!;
        const assetResult = await this.storage.loadAsset(sampleAssetId);
        if (!assetResult.success || !assetResult.data) {
          steps[steps.length - 1]!.error = 'Failed to load sample asset';
          return { success: false, steps };
        }

        steps[steps.length - 1]!.success = true;
        steps[steps.length - 1]!.details = { assetId: sampleAssetId, assetType: assetResult.data.assetType };

        // Step 4: Generate and verify metadata hash
        steps.push({ step: 'Generate and verify metadata hash', success: false });
        const hashResult = generateMetadataHash(assetResult.data);
        const verified = verifyHash(assetResult.data, hashResult.hash);

        if (!verified) {
          steps[steps.length - 1]!.error = 'Hash verification failed';
          return { success: false, steps };
        }

        steps[steps.length - 1]!.success = true;
        steps[steps.length - 1]!.details = { hash: hashResult.hash, verified };
      }

      return { success: true, steps };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (steps.length > 0) {
        steps[steps.length - 1]!.error = errorMessage;
      }
      return { success: false, steps };
    }
  }
}

/**
 * Create a test system instance with default configuration
 */
export function createTestSystem(config: {
  dataDir?: string;
  blockchainConfig?: any;
} = {}): AssetLeasingTestSystem {
  return new AssetLeasingTestSystem({
    dataDir: config.dataDir || './data',
    blockchainConfig: config.blockchainConfig
  });
}

/**
 * Version information
 */
export const version = '1.0.0';