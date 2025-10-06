/**
 * Unit tests for cryptographic hash generation
 *
 * Tests the fix for deterministic JSON serialization in generateMetadataHash
 */

import { describe, it, expect } from 'vitest';
import { generateMetadataHash, verifyHash } from '../src/utils/crypto.js';

describe('Crypto Hash Generation - Determinism Fix', () => {
  it('should generate identical hashes for objects with same keys in different orders', () => {
    // Create two objects with same data but different key insertion order
    const obj1 = {
      name: 'Test Asset',
      type: 'satellite',
      specifications: {
        mass_kg: 500,
        altitude_km: 550
      }
    };

    const obj2 = {
      specifications: {
        altitude_km: 550,
        mass_kg: 500
      },
      type: 'satellite',
      name: 'Test Asset'
    };

    // Generate hashes
    const hash1 = generateMetadataHash(obj1);
    const hash2 = generateMetadataHash(obj2);

    // Hashes should be identical despite different key order
    expect(hash1.hash).toBe(hash2.hash);
    console.log('✓ Hash consistency verified:', hash1.hash);
  });

  it('should generate different hashes for different data', () => {
    const obj1 = { name: 'Asset 1', value: 100 };
    const obj2 = { name: 'Asset 2', value: 200 };

    const hash1 = generateMetadataHash(obj1);
    const hash2 = generateMetadataHash(obj2);

    expect(hash1.hash).not.toBe(hash2.hash);
  });

  it('should generate valid 0x-prefixed 64-character hex hashes', () => {
    const data = { test: 'data' };
    const result = generateMetadataHash(data);

    expect(result.hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
    expect(result.algorithm).toBe('sha256');
  });

  it('should verify hash correctly', () => {
    const data = {
      assetId: 'TEST-001',
      name: 'Test Asset',
      type: 'satellite'
    };

    const hashResult = generateMetadataHash(data);
    const isValid = verifyHash(data, hashResult.hash);

    expect(isValid).toBe(true);
  });

  it('should produce consistent hashes across multiple calls', () => {
    const data = {
      complex: {
        nested: {
          structure: 'with',
          multiple: ['array', 'values', 123]
        }
      },
      timestamp: '2024-10-06T00:00:00Z'
    };

    const hashes = Array.from({ length: 10 }, () => generateMetadataHash(data));

    // All hashes should be identical
    const uniqueHashes = new Set(hashes.map(h => h.hash));
    expect(uniqueHashes.size).toBe(1);

    console.log('✓ Generated same hash 10 times:', hashes[0].hash);
  });

  it('should handle nested objects with key sorting', () => {
    const obj1 = {
      outer: {
        b: 2,
        a: 1,
        c: { z: 3, y: 2, x: 1 }
      },
      prop: 'value'
    };

    const obj2 = {
      prop: 'value',
      outer: {
        c: { x: 1, y: 2, z: 3 },
        a: 1,
        b: 2
      }
    };

    const hash1 = generateMetadataHash(obj1);
    const hash2 = generateMetadataHash(obj2);

    // With recursive key sorting, these should now be identical
    expect(hash1.hash).toBe(hash2.hash);
    console.log('✓ Nested object hash consistency verified:', hash1.hash);
  });

  it('should match expected hash format for asset metadata', () => {
    const assetMetadata = {
      assetId: 'SAT-ALPHA-001',
      name: 'Alpha Satellite',
      description: 'Test satellite asset',
      assetType: 'satellite',
      specifications: {
        type: 'satellite',
        mass_kg: 500,
        orbital_altitude_km: 550
      }
    };

    const result = generateMetadataHash(assetMetadata);

    expect(result.hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
    expect(result.input).toContain('SAT-ALPHA-001');
    expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    console.log('✓ Asset metadata hash:', result.hash);
  });
});
