/**
 * Schema Hash Generation Utilities
 *
 * Generates deterministic keccak256 hashes for asset schemas and lease keys
 * that match the onchain smart contract hashing logic.
 */

import { ethers } from 'ethers';
import { readFile } from 'fs/promises';

/**
 * Generate deterministic schema hash matching onchain keccak256
 *
 * @param schemaPath - Path to JSON schema file
 * @returns keccak256 hash of normalized JSON schema
 */
export async function generateSchemaHash(schemaPath: string): Promise<string> {
  const schemaJson = await readFile(schemaPath, 'utf8');
  const normalized = JSON.stringify(JSON.parse(schemaJson)); // Normalize whitespace

  return ethers.keccak256(ethers.toUtf8Bytes(normalized));
}

/**
 * Generate required lease key hashes for onchain validation
 *
 * @param keys - Array of lease key strings
 * @returns Array of keccak256 hashes
 */
export function generateLeaseKeyHashes(keys: string[]): string[] {
  return keys.map(key => ethers.keccak256(ethers.toUtf8Bytes(key)));
}

/**
 * Predefined schema hashes for test assets
 *
 * These are deterministic hashes based on simple type names.
 * In production, use full JSON schema hashing via generateSchemaHash().
 */
export const SCHEMA_HASHES = {
  ORBITAL_COMPUTE: ethers.keccak256(ethers.toUtf8Bytes('OrbitalComputeSchema')),
  ORBITAL_RELAY: ethers.keccak256(ethers.toUtf8Bytes('OrbitalRelaySchema')),
  SATELLITE: ethers.keccak256(ethers.toUtf8Bytes('SatelliteSchema'))
} as const;

/**
 * Required lease keys by asset type
 *
 * These keys must be present in lease agreements for each asset type.
 * They are validated onchain during lease creation.
 */
export const REQUIRED_LEASE_KEYS = {
  ORBITAL_COMPUTE: [
    'compute_allocation_cores',
    'memory_allocation_gb',
    'storage_allocation_tb'
  ],
  ORBITAL_RELAY: [
    'relay_channels',
    'max_throughput_gbps',
    'coverage_area_km2'
  ],
  SATELLITE: [
    'orbital_period_hours',
    'data_download_rights',
    'orbit_maintenance_responsibility'
  ]
} as const;

/**
 * Generate asset hash for metadata storage lookup
 *
 * @param assetId - The asset ID (typically a uint256)
 * @returns keccak256 hash used as metadata storage key
 */
export function generateAssetHash(assetId: bigint | number | string): string {
  const ASSET_ID = 'ASSET_ID';
  return ethers.keccak256(ethers.toUtf8Bytes(ASSET_ID));
}