#!/usr/bin/env tsx

/**
 * Metadata Hash Generation Script
 *
 * Generates and verifies metadata hashes for all files in the data directory.
 * Useful for ensuring hash consistency and preparing for on-chain registration.
 */

import { readdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { validateJsonFile } from '../src/utils/validation.js';
import { generateMetadataHash, verifyHash } from '../src/utils/crypto.js';
import { schemas } from '../src/schemas/index.js';

/**
 * Configuration for hash generation
 */
interface HashConfig {
  dataDir: string;
  outputFile?: string;
  verifyExisting: boolean;
  verbose: boolean;
  includeLeases: boolean;
  includeRevenue: boolean;
}

const defaultConfig: HashConfig = {
  dataDir: './data',
  verifyExisting: false,
  verbose: false,
  includeLeases: true,
  includeRevenue: true
};

/**
 * Hash result interface
 */
interface HashReport {
  file: string;
  type: 'asset' | 'lease' | 'revenue';
  id: string;
  hash: string;
  verified?: boolean;
  error?: string;
}

/**
 * Generate hash for assets
 */
async function hashAssets(dataDir: string, config: HashConfig): Promise<HashReport[]> {
  const results: HashReport[] = [];
  const assetsDir = path.join(dataDir, 'assets');

  if (!existsSync(assetsDir)) {
    console.log('📁 No assets directory found');
    return results;
  }

  console.log('\n🛰️  Processing Assets...');
  const files = await readdir(assetsDir);

  for (const file of files.filter(f => f.endsWith('.json'))) {
    const filePath = path.join(assetsDir, file);

    try {
      const validation = await validateJsonFile(filePath, schemas.AssetMetadata);

      if (!validation.success || !validation.data) {
        results.push({
          file: `assets/${file}`,
          type: 'asset',
          id: 'unknown',
          hash: '',
          error: `Validation failed: ${validation.errors?.join(', ')}`
        });
        continue;
      }

      const asset = validation.data;
      const hashResult = generateMetadataHash(asset);

      let verified: boolean | undefined;
      if (config.verifyExisting) {
        verified = verifyHash(asset, hashResult.hash);
      }

      results.push({
        file: `assets/${file}`,
        type: 'asset',
        id: asset.assetId,
        hash: hashResult.hash,
        verified
      });

      if (config.verbose) {
        console.log(`   ${asset.assetId}: ${hashResult.hash}`);
        if (verified !== undefined) {
          console.log(`      Verified: ${verified ? '✅' : '❌'}`);
        }
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      results.push({
        file: `assets/${file}`,
        type: 'asset',
        id: 'unknown',
        hash: '',
        error: errorMessage
      });

      console.error(`   ❌ Error processing ${file}: ${errorMessage}`);
    }
  }

  return results;
}

/**
 * Generate hash for leases
 */
async function hashLeases(dataDir: string, config: HashConfig): Promise<HashReport[]> {
  const results: HashReport[] = [];

  if (!config.includeLeases) {
    return results;
  }

  const leasesDir = path.join(dataDir, 'leases');

  if (!existsSync(leasesDir)) {
    console.log('📄 No leases directory found');
    return results;
  }

  console.log('\n📄 Processing Leases...');
  const files = await readdir(leasesDir);

  for (const file of files.filter(f => f.endsWith('.json'))) {
    const filePath = path.join(leasesDir, file);

    try {
      const validation = await validateJsonFile(filePath, schemas.LeaseAgreement);

      if (!validation.success || !validation.data) {
        results.push({
          file: `leases/${file}`,
          type: 'lease',
          id: 'unknown',
          hash: '',
          error: `Validation failed: ${validation.errors?.join(', ')}`
        });
        continue;
      }

      const lease = validation.data;
      const hashResult = generateMetadataHash(lease);

      // Also generate hash for lease terms specifically
      const termsHashResult = generateMetadataHash(lease.terms);

      let verified: boolean | undefined;
      if (config.verifyExisting) {
        verified = verifyHash(lease, hashResult.hash);
      }

      results.push({
        file: `leases/${file}`,
        type: 'lease',
        id: lease.leaseId,
        hash: hashResult.hash,
        verified
      });

      if (config.verbose) {
        console.log(`   ${lease.leaseId}:`);
        console.log(`      Full lease: ${hashResult.hash}`);
        console.log(`      Terms only: ${termsHashResult.hash}`);
        if (verified !== undefined) {
          console.log(`      Verified: ${verified ? '✅' : '❌'}`);
        }
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      results.push({
        file: `leases/${file}`,
        type: 'lease',
        id: 'unknown',
        hash: '',
        error: errorMessage
      });

      console.error(`   ❌ Error processing ${file}: ${errorMessage}`);
    }
  }

  return results;
}

/**
 * Generate hash for revenue rounds
 */
async function hashRevenue(dataDir: string, config: HashConfig): Promise<HashReport[]> {
  const results: HashReport[] = [];

  if (!config.includeRevenue) {
    return results;
  }

  const revenueDir = path.join(dataDir, 'revenue');

  if (!existsSync(revenueDir)) {
    console.log('💰 No revenue directory found');
    return results;
  }

  console.log('\n💰 Processing Revenue Rounds...');
  const files = await readdir(revenueDir);

  for (const file of files.filter(f => f.endsWith('.json'))) {
    const filePath = path.join(revenueDir, file);

    try {
      const validation = await validateJsonFile(filePath, schemas.RevenueRound);

      if (!validation.success || !validation.data) {
        results.push({
          file: `revenue/${file}`,
          type: 'revenue',
          id: 'unknown',
          hash: '',
          error: `Validation failed: ${validation.errors?.join(', ')}`
        });
        continue;
      }

      const round = validation.data;
      const hashResult = generateMetadataHash(round);

      let verified: boolean | undefined;
      if (config.verifyExisting) {
        verified = verifyHash(round, hashResult.hash);
      }

      results.push({
        file: `revenue/${file}`,
        type: 'revenue',
        id: `round-${round.roundId}-${round.assetId}`,
        hash: hashResult.hash,
        verified
      });

      if (config.verbose) {
        console.log(`   Round ${round.roundId} (${round.assetId}): ${hashResult.hash}`);
        if (verified !== undefined) {
          console.log(`      Verified: ${verified ? '✅' : '❌'}`);
        }
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      results.push({
        file: `revenue/${file}`,
        type: 'revenue',
        id: 'unknown',
        hash: '',
        error: errorMessage
      });

      console.error(`   ❌ Error processing ${file}: ${errorMessage}`);
    }
  }

  return results;
}

/**
 * Generate summary report
 */
function generateSummary(results: HashReport[]): void {
  const totalFiles = results.length;
  const successfulHashes = results.filter(r => r.hash && !r.error).length;
  const errors = results.filter(r => r.error).length;
  const verified = results.filter(r => r.verified === true).length;
  const verificationFailed = results.filter(r => r.verified === false).length;

  console.log('\n📊 Hash Generation Summary');
  console.log('═'.repeat(50));
  console.log(`Total Files:       ${totalFiles}`);
  console.log(`Successful Hashes: ${successfulHashes}`);
  console.log(`Errors:            ${errors}`);

  if (results.some(r => r.verified !== undefined)) {
    console.log(`Verified:          ${verified}`);
    console.log(`Verification Failed: ${verificationFailed}`);
  }

  // Break down by type
  const assetResults = results.filter(r => r.type === 'asset');
  const leaseResults = results.filter(r => r.type === 'lease');
  const revenueResults = results.filter(r => r.type === 'revenue');

  if (assetResults.length > 0) {
    const assetSuccess = assetResults.filter(r => r.hash && !r.error).length;
    console.log(`\nAssets:            ${assetSuccess}/${assetResults.length} successful`);
  }

  if (leaseResults.length > 0) {
    const leaseSuccess = leaseResults.filter(r => r.hash && !r.error).length;
    console.log(`Leases:            ${leaseSuccess}/${leaseResults.length} successful`);
  }

  if (revenueResults.length > 0) {
    const revenueSuccess = revenueResults.filter(r => r.hash && !r.error).length;
    console.log(`Revenue Rounds:    ${revenueSuccess}/${revenueResults.length} successful`);
  }

  // Show errors if any
  if (errors > 0) {
    console.log('\n❌ Errors:');
    results.filter(r => r.error).forEach(r => {
      console.log(`   ${r.file}: ${r.error}`);
    });
  }

  console.log('═'.repeat(50));
}

/**
 * Save hash report to file
 */
async function saveHashReport(results: HashReport[], outputFile: string): Promise<void> {
  const report = {
    timestamp: new Date().toISOString(),
    totalFiles: results.length,
    results: results.map(r => ({
      file: r.file,
      type: r.type,
      id: r.id,
      hash: r.hash,
      verified: r.verified,
      error: r.error
    })),
    summary: {
      successful: results.filter(r => r.hash && !r.error).length,
      errors: results.filter(r => r.error).length,
      verified: results.filter(r => r.verified === true).length,
      verificationFailed: results.filter(r => r.verified === false).length
    }
  };

  const { writeFile } = await import('fs/promises');
  await writeFile(outputFile, JSON.stringify(report, null, 2), 'utf8');
  console.log(`\n📄 Hash report saved to: ${outputFile}`);
}

/**
 * Main hash generation function
 */
async function generateHashes(config: HashConfig): Promise<void> {
  console.log('🔐 Asset Leasing Protocol Hash Generator');
  console.log('═'.repeat(50));
  console.log(`Data Directory: ${config.dataDir}`);
  console.log(`Verify Existing: ${config.verifyExisting}`);
  console.log(`Include Leases: ${config.includeLeases}`);
  console.log(`Include Revenue: ${config.includeRevenue}`);

  // Check if data directory exists
  if (!existsSync(config.dataDir)) {
    console.error(`❌ Data directory not found: ${config.dataDir}`);
    process.exit(1);
  }

  try {
    // Generate hashes for all file types
    const [assetResults, leaseResults, revenueResults] = await Promise.all([
      hashAssets(config.dataDir, config),
      hashLeases(config.dataDir, config),
      hashRevenue(config.dataDir, config)
    ]);

    const allResults = [...assetResults, ...leaseResults, ...revenueResults];

    // Generate summary
    generateSummary(allResults);

    // Save report if requested
    if (config.outputFile) {
      await saveHashReport(allResults, config.outputFile);
    }

    // Exit with error if there were any failures
    const hasErrors = allResults.some(r => r.error);
    if (hasErrors) {
      console.log('\n⚠️  Some files had errors during hash generation.');
      process.exit(1);
    }

    console.log('\n✨ Hash generation completed successfully!');

  } catch (error) {
    console.error('\n❌ Hash generation failed:', error);
    process.exit(1);
  }
}

/**
 * CLI interface
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const config = { ...defaultConfig };

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;

    switch (arg) {
      case '--data-dir':
        config.dataDir = args[++i]!;
        break;
      case '--output':
      case '-o':
        config.outputFile = args[++i];
        break;
      case '--verify':
        config.verifyExisting = true;
        break;
      case '--verbose':
      case '-v':
        config.verbose = true;
        break;
      case '--no-leases':
        config.includeLeases = false;
        break;
      case '--no-revenue':
        config.includeRevenue = false;
        break;
      case '--help':
      case '-h':
        console.log(`
🔐 Asset Leasing Protocol Hash Generator

Usage: tsx scripts/hash-metadata.ts [options]

Options:
  --data-dir <dir>     Data directory to process (default: ./data)
  --output <file>      Save hash report to file
  --verify             Verify existing hashes
  --verbose, -v        Show detailed hash information
  --no-leases          Skip lease files
  --no-revenue         Skip revenue files
  --help, -h           Show this help message

Examples:
  tsx scripts/hash-metadata.ts
  tsx scripts/hash-metadata.ts --data-dir ./test-data --verbose
  tsx scripts/hash-metadata.ts --output hashes.json --verify
`);
        process.exit(0);
      default:
        if (arg.startsWith('--')) {
          console.error(`Unknown option: ${arg}`);
          process.exit(1);
        }
    }
  }

  await generateHashes(config);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}