/**
 * File storage utilities for Asset Leasing Protocol
 *
 * Provides local JSON file storage and retrieval with proper
 * error handling and type safety.
 */

import { readFile, writeFile, mkdir, readdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { z } from 'zod';

import type { AssetMetadata, LeaseAgreement, RevenueRound, ValidationResult } from '../types/index.js';
import { schemas } from '../schemas/index.js';
import { generateMetadataHash } from './crypto.js';

/**
 * Storage configuration
 */
export interface StorageConfig {
  baseDir: string;
  createDirsIfMissing: boolean;
  validateOnRead: boolean;
  generateBackups: boolean;
}

/**
 * Default storage configuration
 */
const defaultConfig: StorageConfig = {
  baseDir: './data',
  createDirsIfMissing: true,
  validateOnRead: true,
  generateBackups: true
};

/**
 * File storage manager class
 */
export class FileStorageManager {
  private config: StorageConfig;

  constructor(config: Partial<StorageConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Initialize storage directories
   */
  async initialize(): Promise<void> {
    if (this.config.createDirsIfMissing) {
      await this.createDirectories();
    }
  }

  /**
   * Save asset metadata to file
   */
  async saveAsset(asset: AssetMetadata): Promise<{ success: boolean; filePath: string; hash?: string }> {
    try {
      // Validate asset data
      const validated = schemas.AssetMetadata.parse(asset);

      // Generate file path
      const fileName = this.sanitizeFileName(`${validated.assetId}.json`);
      const filePath = path.join(this.config.baseDir, 'assets', fileName);

      // Generate hash for verification
      const hashResult = generateMetadataHash(validated);

      // Create backup if file exists
      if (this.config.generateBackups && existsSync(filePath)) {
        await this.createBackup(filePath);
      }

      // Write file
      await writeFile(filePath, JSON.stringify(validated, null, 2), 'utf8');

      return {
        success: true,
        filePath,
        hash: hashResult.hash
      };
    } catch (error) {
      console.error('Error saving asset:', error);
      return {
        success: false,
        filePath: '',
        hash: undefined
      };
    }
  }

  /**
   * Load asset metadata from file
   */
  async loadAsset(assetId: string): Promise<{ success: boolean; data?: AssetMetadata; errors?: string[] }> {
    try {
      const fileName = this.sanitizeFileName(`${assetId}.json`);
      const filePath = path.join(this.config.baseDir, 'assets', fileName);

      // Check if file exists
      if (!existsSync(filePath)) {
        return {
          success: false,
          errors: [`Asset file not found: ${assetId}`]
        };
      }

      // Read and parse file
      const fileContent = await readFile(filePath, 'utf8');
      const jsonData = JSON.parse(fileContent);

      // Validate if required
      if (this.config.validateOnRead) {
        const validated = schemas.AssetMetadata.parse(jsonData);
        return {
          success: true,
          data: validated
        };
      }

      return {
        success: true,
        data: jsonData as AssetMetadata
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        errors: [`Error loading asset ${assetId}: ${errorMessage}`]
      };
    }
  }

  /**
   * Save lease agreement to file
   */
  async saveLease(lease: LeaseAgreement): Promise<{ success: boolean; filePath: string; hash?: string }> {
    try {
      // Validate lease data
      const validated = schemas.LeaseAgreement.parse(lease);

      // Generate file path
      const fileName = this.sanitizeFileName(`${validated.leaseId}.json`);
      const filePath = path.join(this.config.baseDir, 'leases', fileName);

      // Generate hash for verification
      const hashResult = generateMetadataHash(validated);

      // Create backup if file exists
      if (this.config.generateBackups && existsSync(filePath)) {
        await this.createBackup(filePath);
      }

      // Write file
      await writeFile(filePath, JSON.stringify(validated, null, 2), 'utf8');

      return {
        success: true,
        filePath,
        hash: hashResult.hash
      };
    } catch (error) {
      console.error('Error saving lease:', error);
      return {
        success: false,
        filePath: '',
        hash: undefined
      };
    }
  }

  /**
   * Load lease agreement from file
   */
  async loadLease(leaseId: string): Promise<{ success: boolean; data?: LeaseAgreement; errors?: string[] }> {
    try {
      const fileName = this.sanitizeFileName(`${leaseId}.json`);
      const filePath = path.join(this.config.baseDir, 'leases', fileName);

      // Check if file exists
      if (!existsSync(filePath)) {
        return {
          success: false,
          errors: [`Lease file not found: ${leaseId}`]
        };
      }

      // Read and parse file
      const fileContent = await readFile(filePath, 'utf8');
      const jsonData = JSON.parse(fileContent);

      // Validate if required
      if (this.config.validateOnRead) {
        const validated = schemas.LeaseAgreement.parse(jsonData);
        return {
          success: true,
          data: validated
        };
      }

      return {
        success: true,
        data: jsonData as LeaseAgreement
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        errors: [`Error loading lease ${leaseId}: ${errorMessage}`]
      };
    }
  }

  /**
   * Save revenue round data to file
   */
  async saveRevenueRound(round: RevenueRound): Promise<{ success: boolean; filePath: string; hash?: string }> {
    try {
      // Validate revenue round data
      const validated = schemas.RevenueRound.parse(round);

      // Generate file path
      const fileName = this.sanitizeFileName(`revenue-round-${validated.roundId}-${validated.assetId}.json`);
      const filePath = path.join(this.config.baseDir, 'revenue', fileName);

      // Generate hash for verification
      const hashResult = generateMetadataHash(validated);

      // Create backup if file exists
      if (this.config.generateBackups && existsSync(filePath)) {
        await this.createBackup(filePath);
      }

      // Write file
      await writeFile(filePath, JSON.stringify(validated, null, 2), 'utf8');

      return {
        success: true,
        filePath,
        hash: hashResult.hash
      };
    } catch (error) {
      console.error('Error saving revenue round:', error);
      return {
        success: false,
        filePath: '',
        hash: undefined
      };
    }
  }

  /**
   * List all assets
   */
  async listAssets(): Promise<{ success: boolean; assets?: string[]; errors?: string[] }> {
    try {
      const assetsDir = path.join(this.config.baseDir, 'assets');

      if (!existsSync(assetsDir)) {
        return {
          success: true,
          assets: []
        };
      }

      const files = await readdir(assetsDir);
      const assetIds = files
        .filter(file => file.endsWith('.json'))
        .map(file => file.replace('.json', ''));

      return {
        success: true,
        assets: assetIds
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        errors: [`Error listing assets: ${errorMessage}`]
      };
    }
  }

  /**
   * List all leases
   */
  async listLeases(): Promise<{ success: boolean; leases?: string[]; errors?: string[] }> {
    try {
      const leasesDir = path.join(this.config.baseDir, 'leases');

      if (!existsSync(leasesDir)) {
        return {
          success: true,
          leases: []
        };
      }

      const files = await readdir(leasesDir);
      const leaseIds = files
        .filter(file => file.endsWith('.json'))
        .map(file => file.replace('.json', ''));

      return {
        success: true,
        leases: leaseIds
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        errors: [`Error listing leases: ${errorMessage}`]
      };
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    success: boolean;
    stats?: {
      totalFiles: number;
      totalSize: number;
      assetCount: number;
      leaseCount: number;
      revenueCount: number;
    };
    errors?: string[];
  }> {
    try {
      let totalFiles = 0;
      let totalSize = 0;
      let assetCount = 0;
      let leaseCount = 0;
      let revenueCount = 0;

      // Count assets
      const assetsDir = path.join(this.config.baseDir, 'assets');
      if (existsSync(assetsDir)) {
        const assetFiles = await readdir(assetsDir);
        assetCount = assetFiles.filter(f => f.endsWith('.json')).length;

        for (const file of assetFiles) {
          const filePath = path.join(assetsDir, file);
          const stats = await stat(filePath);
          totalSize += stats.size;
          totalFiles++;
        }
      }

      // Count leases
      const leasesDir = path.join(this.config.baseDir, 'leases');
      if (existsSync(leasesDir)) {
        const leaseFiles = await readdir(leasesDir);
        leaseCount = leaseFiles.filter(f => f.endsWith('.json')).length;

        for (const file of leaseFiles) {
          const filePath = path.join(leasesDir, file);
          const stats = await stat(filePath);
          totalSize += stats.size;
          totalFiles++;
        }
      }

      // Count revenue files
      const revenueDir = path.join(this.config.baseDir, 'revenue');
      if (existsSync(revenueDir)) {
        const revenueFiles = await readdir(revenueDir);
        revenueCount = revenueFiles.filter(f => f.endsWith('.json')).length;

        for (const file of revenueFiles) {
          const filePath = path.join(revenueDir, file);
          const stats = await stat(filePath);
          totalSize += stats.size;
          totalFiles++;
        }
      }

      return {
        success: true,
        stats: {
          totalFiles,
          totalSize,
          assetCount,
          leaseCount,
          revenueCount
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        errors: [`Error getting storage stats: ${errorMessage}`]
      };
    }
  }

  /**
   * Create required directories
   */
  private async createDirectories(): Promise<void> {
    const dirs = ['assets', 'leases', 'revenue', 'backups'];

    for (const dir of dirs) {
      const dirPath = path.join(this.config.baseDir, dir);
      await mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * Create backup of existing file
   */
  private async createBackup(filePath: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(this.config.baseDir, 'backups');
    const fileName = path.basename(filePath);
    const backupPath = path.join(backupDir, `${timestamp}-${fileName}`);

    await mkdir(backupDir, { recursive: true });

    const content = await readFile(filePath, 'utf8');
    await writeFile(backupPath, content, 'utf8');
  }

  /**
   * Sanitize filename to remove invalid characters
   */
  private sanitizeFileName(fileName: string): string {
    return fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  }
}

/**
 * Default storage manager instance
 */
export const defaultStorage = new FileStorageManager();

/**
 * Utility functions for quick file operations
 */
export async function quickSaveAsset(asset: AssetMetadata, baseDir = './data'): Promise<string | null> {
  const storage = new FileStorageManager({ baseDir });
  await storage.initialize();

  const result = await storage.saveAsset(asset);
  return result.success ? result.filePath : null;
}

export async function quickLoadAsset(assetId: string, baseDir = './data'): Promise<AssetMetadata | null> {
  const storage = new FileStorageManager({ baseDir });

  const result = await storage.loadAsset(assetId);
  return result.success ? result.data! : null;
}

export async function quickSaveLease(lease: LeaseAgreement, baseDir = './data'): Promise<string | null> {
  const storage = new FileStorageManager({ baseDir });
  await storage.initialize();

  const result = await storage.saveLease(lease);
  return result.success ? result.filePath : null;
}

export async function quickLoadLease(leaseId: string, baseDir = './data'): Promise<LeaseAgreement | null> {
  const storage = new FileStorageManager({ baseDir });

  const result = await storage.loadLease(leaseId);
  return result.success ? result.data! : null;
}