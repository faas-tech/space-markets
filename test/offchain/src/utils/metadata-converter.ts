/**
 * Metadata Conversion Utilities
 *
 * Bidirectional conversion between JSON metadata and onchain Metadata[] arrays.
 * Handles flattening of nested objects for onchain storage and reconstruction
 * of nested structures from flat key-value pairs.
 */

import type { AssetMetadata } from '../types/index.js';
import type { Contract } from 'ethers';

/**
 * Metadata key-value pair structure matching onchain Metadata struct
 */
export interface MetadataEntry {
  key: string;
  value: string;
}

/**
 * Convert JSON asset metadata to flat Metadata[] array for onchain storage
 *
 * This function flattens nested JSON structures into a flat array of key-value pairs.
 * Nested objects are flattened with underscore-separated keys (e.g., 'spec_compute_cpu_cores').
 * Arrays are JSON-stringified.
 *
 * @param assetJson - The asset metadata in JSON format
 * @returns Array of {key, value} pairs suitable for onchain storage
 */
export function jsonToMetadataArray(assetJson: AssetMetadata): MetadataEntry[] {
  const metadata: MetadataEntry[] = [];

  // Core fields
  metadata.push({ key: 'name', value: assetJson.name });
  metadata.push({ key: 'description', value: assetJson.description });
  metadata.push({ key: 'assetType', value: assetJson.assetType });

  // Flatten specifications recursively
  function flattenObject(obj: Record<string, unknown>, prefix = ''): void {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}_${key}` : key;

      if (value === null || value === undefined) continue;

      if (typeof value === 'object' && !Array.isArray(value)) {
        // Recursively flatten nested objects
        flattenObject(value as Record<string, unknown>, fullKey);
      } else if (Array.isArray(value)) {
        // Store arrays as JSON strings
        metadata.push({ key: fullKey, value: JSON.stringify(value) });
      } else {
        // Primitive values converted to strings
        metadata.push({ key: fullKey, value: String(value) });
      }
    }
  }

  // Flatten specifications with 'spec' prefix
  if (assetJson.specifications) {
    flattenObject(assetJson.specifications as Record<string, unknown>, 'spec');
  }

  // Store document hashes as comma-separated list
  if (assetJson.documents && assetJson.documents.length > 0) {
    const docHashes = assetJson.documents.map(d => d.hash).join(',');
    metadata.push({ key: 'documentHashes', value: docHashes });
  }

  // Store metadata timestamps
  if (assetJson.metadata) {
    metadata.push({ key: 'meta_createdAt', value: assetJson.metadata.createdAt });
    metadata.push({ key: 'meta_updatedAt', value: assetJson.metadata.updatedAt });
    metadata.push({ key: 'meta_version', value: assetJson.metadata.version });
  }

  return metadata;
}

/**
 * Reconstruct JSON from onchain Metadata[] array
 *
 * This function reverses the flattening process, rebuilding nested object structures
 * from flat key-value pairs.
 *
 * @param metadata - Array of {key, value} pairs from onchain storage
 * @returns Partial asset metadata reconstructed from flat structure
 */
export function metadataArrayToJson(metadata: MetadataEntry[]): Partial<AssetMetadata> {
  const result: Record<string, unknown> = {
    specifications: {} as Record<string, unknown>,
    documents: [],
    metadata: {} as Record<string, string>
  };

  for (const { key, value } of metadata) {
    if (key.startsWith('spec_')) {
      // Handle nested specification fields
      const path = key.substring(5).split('_');
      let current = result.specifications as Record<string, unknown>;

      for (let i = 0; i < path.length - 1; i++) {
        const segment = path[i]!;
        if (!current[segment]) current[segment] = {};
        current = current[segment] as Record<string, unknown>;
      }

      // Try to parse JSON arrays, otherwise store as string
      const lastKey = path[path.length - 1]!;
      current[lastKey] = tryParseJson(value) || value;

    } else if (key.startsWith('meta_')) {
      // Handle metadata fields
      const metaKey = key.substring(5);
      (result.metadata as Record<string, string>)[metaKey] = value;

    } else if (key === 'documentHashes') {
      // Parse comma-separated document hashes
      if (value) {
        result.documents = value.split(',').map((hash: string, index: number) => ({
          documentId: `doc_${index}`,
          hash,
          filename: `document_${index}`,
          documentType: 'specification' as const,
          size: 0,
          uploadedAt: new Date().toISOString()
        }));
      }

    } else {
      // Top-level fields
      result[key] = value;
    }
  }

  return result as Partial<AssetMetadata>;
}

/**
 * Query metadata from onchain contract and convert to JSON
 *
 * @param token - The AssetERC20 contract instance
 * @param assetHash - The keccak256 hash used for metadata storage
 * @returns Reconstructed asset metadata
 */
export async function queryMetadataFromContract(
  token: Contract,
  assetHash: string
): Promise<Partial<AssetMetadata>> {
  // Get all metadata keys for this asset
  const keys: string[] = await token.getAllMetadataKeys(assetHash);

  // Query each key's value
  const metadata: MetadataEntry[] = await Promise.all(
    keys.map(async (key) => ({
      key,
      value: await token.getMetadata(assetHash, key)
    }))
  );

  // Convert flat array back to nested JSON
  return metadataArrayToJson(metadata);
}

/**
 * Try to parse JSON string, return original value if parsing fails
 */
function tryParseJson(str: string): unknown {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

/**
 * Validate metadata array before sending onchain
 *
 * Ensures keys and values meet onchain constraints.
 */
export function validateMetadataArray(metadata: MetadataEntry[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const MAX_KEY_LENGTH = 64;
  const MAX_VALUE_LENGTH = 1024;
  const MAX_TOTAL_KEYS = 100;

  if (metadata.length > MAX_TOTAL_KEYS) {
    errors.push(`Metadata exceeds maximum of ${MAX_TOTAL_KEYS} keys (found ${metadata.length})`);
  }

  const seenKeys = new Set<string>();

  for (const { key, value } of metadata) {
    // Check for duplicate keys
    if (seenKeys.has(key)) {
      errors.push(`Duplicate key: "${key}"`);
    }
    seenKeys.add(key);

    // Validate key length
    if (key.length > MAX_KEY_LENGTH) {
      errors.push(`Key "${key}" exceeds maximum length of ${MAX_KEY_LENGTH} characters`);
    }

    // Validate value length
    if (value.length > MAX_VALUE_LENGTH) {
      errors.push(`Value for "${key}" exceeds maximum length of ${MAX_VALUE_LENGTH} characters`);
    }

    // Validate key format (alphanumeric + underscore only)
    if (!/^[a-zA-Z0-9_]+$/.test(key)) {
      errors.push(`Invalid key format: "${key}" (only alphanumeric and underscore allowed)`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}