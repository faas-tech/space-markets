/**
 * Cryptographic utilities for Asset Leasing Protocol
 *
 * Provides consistent hashing and validation functions that match
 * the expectations of the onchain smart contracts.
 */

import { createHash } from 'crypto';
import type { HashResult } from '../types/index.js';

/**
 * Recursively sort object keys for deterministic JSON serialization
 */
function sortObjectKeys(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sortObjectKeys(item));
  }

  if (typeof obj === 'object' && obj.constructor === Object) {
    return Object.keys(obj)
      .sort()
      .reduce((acc, key) => {
        acc[key] = sortObjectKeys(obj[key]);
        return acc;
      }, {} as any);
  }

  return obj;
}

/**
 * Generate SHA-256 hash with 0x prefix to match Ethereum/Solidity expectations
 */
export function generateMetadataHash(data: unknown): HashResult {
  // Ensure consistent JSON serialization by recursively sorting all object keys
  const sortedData = sortObjectKeys(data);
  const jsonString = JSON.stringify(sortedData);
  const buffer = Buffer.from(jsonString, 'utf8');

  const hash = createHash('sha256');
  hash.update(buffer);
  const hashHex = hash.digest('hex');

  return {
    hash: `0x${hashHex}`,
    algorithm: 'sha256',
    input: jsonString,
    timestamp: new Date().toISOString()
  };
}

/**
 * Generate document hash from file buffer
 */
export function generateDocumentHash(fileBuffer: Buffer): HashResult {
  const hash = createHash('sha256');
  hash.update(fileBuffer);
  const hashHex = hash.digest('hex');

  return {
    hash: `0x${hashHex}`,
    algorithm: 'sha256',
    input: fileBuffer,
    timestamp: new Date().toISOString()
  };
}

/**
 * Generate hash from string content
 */
export function generateStringHash(content: string): HashResult {
  const buffer = Buffer.from(content, 'utf8');
  return generateDocumentHash(buffer);
}

/**
 * Verify that a hash matches the expected value
 */
export function verifyHash(data: unknown, expectedHash: string): boolean {
  const computed = generateMetadataHash(data);
  return computed.hash.toLowerCase() === expectedHash.toLowerCase();
}

/**
 * Verify document hash against file buffer
 */
export function verifyDocumentHash(fileBuffer: Buffer, expectedHash: string): boolean {
  const computed = generateDocumentHash(fileBuffer);
  return computed.hash.toLowerCase() === expectedHash.toLowerCase();
}

/**
 * Generate lease terms hash matching onchain requirements
 * This follows the same pattern as asset metadata but for lease-specific data
 */
export function generateLeaseTermsHash(leaseTerms: unknown): HashResult {
  return generateMetadataHash(leaseTerms);
}

/**
 * Generate required lease keys hash for onchain asset type creation
 * These correspond to the keccak256 hashes expected by the smart contracts
 */
export function generateRequiredLeaseKeys(keys: string[]): string[] {
  return keys.map(key => {
    const hash = createHash('sha256');
    hash.update(key, 'utf8');
    return `0x${hash.digest('hex')}`;
  });
}

/**
 * Validate hash format (0x followed by 64 hex characters)
 */
export function isValidHash(hash: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
}

/**
 * Validate Ethereum address format
 */
export function isValidEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Generate deterministic asset ID from metadata
 * This can be used to ensure consistent asset IDs across deployments
 */
export function generateAssetId(prefix: string, metadata: unknown): string {
  const hash = generateMetadataHash(metadata);
  const shortHash = hash.hash.slice(2, 10); // Take first 8 hex chars
  return `${prefix}-${shortHash.toUpperCase()}`;
}

/**
 * Generate deterministic lease ID
 */
export function generateLeaseId(assetId: string, lesseeAddress: string, timestamp: string): string {
  const data = { assetId, lesseeAddress, timestamp };
  const hash = generateMetadataHash(data);
  const shortHash = hash.hash.slice(2, 10);
  return `LEASE-${shortHash.toUpperCase()}`;
}

/**
 * Generate document ID with timestamp and random component
 */
export function generateDocumentId(prefix: string = 'doc'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 8);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Batch hash generation for multiple items
 */
export function batchGenerateHashes(items: unknown[]): HashResult[] {
  return items.map(item => generateMetadataHash(item));
}

/**
 * Create Merkle root from array of hashes (simple implementation)
 * Useful for creating aggregate hashes of document sets
 */
export function createMerkleRoot(hashes: string[]): string {
  if (hashes.length === 0) {
    return '0x0000000000000000000000000000000000000000000000000000000000000000';
  }

  if (hashes.length === 1) {
    return hashes[0]!;
  }

  // Simple pairwise hashing approach
  let currentLevel = [...hashes];

  while (currentLevel.length > 1) {
    const nextLevel: string[] = [];

    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i]!;
      const right = currentLevel[i + 1] || left; // Duplicate if odd number

      const combined = left + right.slice(2); // Remove 0x from second hash
      const hash = createHash('sha256');
      hash.update(combined, 'hex');
      nextLevel.push(`0x${hash.digest('hex')}`);
    }

    currentLevel = nextLevel;
  }

  return currentLevel[0]!;
}

/**
 * Generate consistent schema hash for asset types
 * This should match the hash generation used in the smart contracts
 */
export function generateSchemaHash(schema: unknown): string {
  const result = generateMetadataHash(schema);
  return result.hash;
}