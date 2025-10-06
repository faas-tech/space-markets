#!/usr/bin/env node

/**
 * Quick verification script for hash generation fix
 * Tests with real asset data from the data directory
 */

import { readFileSync } from 'fs';
import { generateMetadataHash, verifyHash } from './src/utils/crypto.js';

console.log('🔍 Verifying Hash Generation Fix\n');

// Test 1: Load real asset data
console.log('Test 1: Loading real asset data...');
const assetPath = './data/assets/satellite-alpha-1.json';
const assetData = JSON.parse(readFileSync(assetPath, 'utf8'));
const hash1 = generateMetadataHash(assetData);
console.log(`✅ Asset hash: ${hash1.hash}`);

// Test 2: Verify same data produces same hash
console.log('\nTest 2: Verifying consistency...');
const hash2 = generateMetadataHash(assetData);
if (hash1.hash === hash2.hash) {
  console.log(`✅ Hashes match: ${hash1.hash}`);
} else {
  console.log(`❌ Hashes don't match!`);
  process.exit(1);
}

// Test 3: Verify hash verification works
console.log('\nTest 3: Testing hash verification...');
const verified = verifyHash(assetData, hash1.hash);
if (verified) {
  console.log(`✅ Hash verification successful`);
} else {
  console.log(`❌ Hash verification failed!`);
  process.exit(1);
}

// Test 4: Key order independence
console.log('\nTest 4: Testing key order independence...');
const reordered = {
  metadata: assetData.metadata,
  documents: assetData.documents,
  specifications: assetData.specifications,
  assetType: assetData.assetType,
  description: assetData.description,
  name: assetData.name,
  assetId: assetData.assetId
};
const hash3 = generateMetadataHash(reordered);
if (hash1.hash === hash3.hash) {
  console.log(`✅ Key order doesn't affect hash: ${hash3.hash}`);
} else {
  console.log(`❌ Different key order produced different hash!`);
  console.log(`   Original: ${hash1.hash}`);
  console.log(`   Reordered: ${hash3.hash}`);
  process.exit(1);
}

// Test 5: Nested key order independence
console.log('\nTest 5: Testing nested object key order...');
const obj1 = {
  outer: { b: 2, a: 1, c: { z: 3, y: 2, x: 1 } },
  prop: 'value'
};
const obj2 = {
  prop: 'value',
  outer: { c: { x: 1, y: 2, z: 3 }, a: 1, b: 2 }
};
const nestedHash1 = generateMetadataHash(obj1);
const nestedHash2 = generateMetadataHash(obj2);
if (nestedHash1.hash === nestedHash2.hash) {
  console.log(`✅ Nested key order handled correctly: ${nestedHash1.hash}`);
} else {
  console.log(`❌ Nested keys produced different hashes!`);
  console.log(`   Obj1: ${nestedHash1.hash}`);
  console.log(`   Obj2: ${nestedHash2.hash}`);
  process.exit(1);
}

console.log('\n🎉 All hash generation tests passed!');
console.log('\n📊 Summary:');
console.log('   ✅ Real asset data hashing works');
console.log('   ✅ Hash consistency verified');
console.log('   ✅ Hash verification function works');
console.log('   ✅ Key order independence confirmed');
console.log('   ✅ Nested object key sorting works');
console.log('\n✅ Hash generation fix is working correctly!\n');
