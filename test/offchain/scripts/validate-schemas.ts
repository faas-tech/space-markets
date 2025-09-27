#!/usr/bin/env tsx

/**
 * Schema Validation Script
 *
 * Validates all JSON files in the data directory against their respective
 * Zod schemas and generates a comprehensive validation report.
 */

import { readdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { validateDirectory, validateJsonFile, generateValidationReport } from '../src/utils/validation.js';
import { schemas } from '../src/schemas/index.js';

/**
 * Configuration for validation script
 */
interface ValidationConfig {
  dataDir: string;
  verbose: boolean;
  exitOnError: boolean;
  generateReport: boolean;
  reportPath?: string;
}

const defaultConfig: ValidationConfig = {
  dataDir: './data',
  verbose: false,
  exitOnError: false,
  generateReport: true,
  reportPath: './validation-report.json'
};

/**
 * Format validation results for console output
 */
function formatValidationResult(fileName: string, result: any): string {
  const status = result.valid ? '✅ VALID' : '❌ INVALID';
  let output = `${status} ${fileName}`;

  if (result.errors && result.errors.length > 0) {
    output += '\n  Errors:';
    result.errors.forEach((error: string) => {
      output += `\n    - ${error}`;
    });
  }

  if (result.warnings && result.warnings.length > 0) {
    output += '\n  Warnings:';
    result.warnings.forEach((warning: string) => {
      output += `\n    - ${warning}`;
    });
  }

  return output;
}

/**
 * Validate individual file types
 */
async function validateFilesByType(dataDir: string, config: ValidationConfig): Promise<{
  assets: { file: string; valid: boolean }[];
  leases: { file: string; valid: boolean }[];
  revenue: { file: string; valid: boolean }[];
}> {
  const results = {
    assets: [] as { file: string; valid: boolean }[],
    leases: [] as { file: string; valid: boolean }[],
    revenue: [] as { file: string; valid: boolean }[]
  };

  // Validate assets
  const assetsDir = path.join(dataDir, 'assets');
  if (existsSync(assetsDir)) {
    console.log('\n📁 Validating Assets...');
    const assetFiles = await readdir(assetsDir);

    for (const file of assetFiles.filter(f => f.endsWith('.json'))) {
      const filePath = path.join(assetsDir, file);
      const result = await validateJsonFile(filePath, schemas.AssetMetadata);

      results.assets.push({ file, valid: result.valid });

      if (config.verbose || !result.valid) {
        console.log(formatValidationResult(`assets/${file}`, result));
      }
    }
  }

  // Validate leases
  const leasesDir = path.join(dataDir, 'leases');
  if (existsSync(leasesDir)) {
    console.log('\n📄 Validating Leases...');
    const leaseFiles = await readdir(leasesDir);

    for (const file of leaseFiles.filter(f => f.endsWith('.json'))) {
      const filePath = path.join(leasesDir, file);
      const result = await validateJsonFile(filePath, schemas.LeaseAgreement);

      results.leases.push({ file, valid: result.valid });

      if (config.verbose || !result.valid) {
        console.log(formatValidationResult(`leases/${file}`, result));
      }
    }
  }

  // Validate revenue files
  const revenueDir = path.join(dataDir, 'revenue');
  if (existsSync(revenueDir)) {
    console.log('\n💰 Validating Revenue Files...');
    const revenueFiles = await readdir(revenueDir);

    for (const file of revenueFiles.filter(f => f.endsWith('.json'))) {
      const filePath = path.join(revenueDir, file);
      const result = await validateJsonFile(filePath, schemas.RevenueRound);

      results.revenue.push({ file, valid: result.valid });

      if (config.verbose || !result.valid) {
        console.log(formatValidationResult(`revenue/${file}`, result));
      }
    }
  }

  return results;
}

/**
 * Generate summary statistics
 */
function generateSummary(results: {
  assets: { file: string; valid: boolean }[];
  leases: { file: string; valid: boolean }[];
  revenue: { file: string; valid: boolean }[];
}): void {
  const totalFiles = results.assets.length + results.leases.length + results.revenue.length;
  const validFiles = [
    ...results.assets,
    ...results.leases,
    ...results.revenue
  ].filter(r => r.valid).length;

  const assetValid = results.assets.filter(r => r.valid).length;
  const leaseValid = results.leases.filter(r => r.valid).length;
  const revenueValid = results.revenue.filter(r => r.valid).length;

  console.log('\n📊 Validation Summary');
  console.log('═'.repeat(50));
  console.log(`Total Files:     ${totalFiles}`);
  console.log(`Valid Files:     ${validFiles} (${((validFiles / totalFiles) * 100).toFixed(1)}%)`);
  console.log(`Invalid Files:   ${totalFiles - validFiles}`);
  console.log('');
  console.log('By Category:');
  console.log(`  Assets:        ${assetValid}/${results.assets.length} valid`);
  console.log(`  Leases:        ${leaseValid}/${results.leases.length} valid`);
  console.log(`  Revenue:       ${revenueValid}/${results.revenue.length} valid`);

  if (validFiles === totalFiles) {
    console.log('\n🎉 All files passed validation!');
  } else {
    console.log(`\n⚠️  ${totalFiles - validFiles} files failed validation.`);
  }
}

/**
 * Save validation report to file
 */
async function saveValidationReport(
  results: any,
  summary: any,
  reportPath: string
): Promise<void> {
  const report = {
    timestamp: new Date().toISOString(),
    summary,
    details: results,
    metadata: {
      validator: 'Asset Leasing Protocol Schema Validator',
      version: '1.0.0'
    }
  };

  const { writeFile } = await import('fs/promises');
  await writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`\n📄 Validation report saved to: ${reportPath}`);
}

/**
 * Check for common validation issues
 */
async function performDeepValidation(dataDir: string): Promise<void> {
  console.log('\n🔍 Performing Deep Validation...');

  // Check for duplicate asset IDs
  const assetsDir = path.join(dataDir, 'assets');
  if (existsSync(assetsDir)) {
    const assetFiles = await readdir(assetsDir);
    const assetIds = new Set<string>();
    const duplicates: string[] = [];

    for (const file of assetFiles.filter(f => f.endsWith('.json'))) {
      const result = await validateJsonFile(
        path.join(assetsDir, file),
        schemas.AssetMetadata
      );

      if (result.data) {
        if (assetIds.has(result.data.assetId)) {
          duplicates.push(result.data.assetId);
        } else {
          assetIds.add(result.data.assetId);
        }
      }
    }

    if (duplicates.length > 0) {
      console.log('⚠️  Duplicate Asset IDs found:');
      duplicates.forEach(id => console.log(`    - ${id}`));
    } else {
      console.log('✅ No duplicate Asset IDs found');
    }
  }

  // Check for orphaned leases (leases without corresponding assets)
  const leasesDir = path.join(dataDir, 'leases');
  if (existsSync(leasesDir) && existsSync(assetsDir)) {
    const leaseFiles = await readdir(leasesDir);
    const assetFiles = await readdir(assetsDir);

    const assetIds = new Set<string>();
    for (const file of assetFiles.filter(f => f.endsWith('.json'))) {
      const result = await validateJsonFile(
        path.join(assetsDir, file),
        schemas.AssetMetadata
      );
      if (result.data) {
        assetIds.add(result.data.assetId);
      }
    }

    const orphanedLeases: string[] = [];
    for (const file of leaseFiles.filter(f => f.endsWith('.json'))) {
      const result = await validateJsonFile(
        path.join(leasesDir, file),
        schemas.LeaseAgreement
      );
      if (result.data && !assetIds.has(result.data.assetId)) {
        orphanedLeases.push(result.data.leaseId);
      }
    }

    if (orphanedLeases.length > 0) {
      console.log('⚠️  Orphaned leases found (no corresponding asset):');
      orphanedLeases.forEach(id => console.log(`    - ${id}`));
    } else {
      console.log('✅ No orphaned leases found');
    }
  }
}

/**
 * Main validation function
 */
async function validateSchemas(config: ValidationConfig): Promise<void> {
  console.log('🔧 Asset Leasing Protocol Schema Validator');
  console.log('═'.repeat(50));
  console.log(`Data Directory: ${config.dataDir}`);
  console.log(`Verbose Mode:   ${config.verbose}`);
  console.log(`Exit on Error:  ${config.exitOnError}`);

  // Check if data directory exists
  if (!existsSync(config.dataDir)) {
    console.error(`❌ Data directory not found: ${config.dataDir}`);
    process.exit(1);
  }

  try {
    // Validate all files
    const results = await validateFilesByType(config.dataDir, config);

    // Generate summary
    generateSummary(results);

    // Perform deep validation
    await performDeepValidation(config.dataDir);

    // Generate and save report if requested
    if (config.generateReport && config.reportPath) {
      const fullReport = await generateValidationReport(config.dataDir);
      await saveValidationReport(fullReport, {
        totalFiles: results.assets.length + results.leases.length + results.revenue.length,
        validFiles: [...results.assets, ...results.leases, ...results.revenue].filter(r => r.valid).length
      }, config.reportPath);
    }

    // Exit with error code if validation failed and exitOnError is true
    const hasErrors = [...results.assets, ...results.leases, ...results.revenue].some(r => !r.valid);
    if (hasErrors && config.exitOnError) {
      console.log('\n❌ Validation failed. Exiting with error code 1.');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Validation error:', error);
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
      case '--verbose':
      case '-v':
        config.verbose = true;
        break;
      case '--exit-on-error':
        config.exitOnError = true;
        break;
      case '--no-report':
        config.generateReport = false;
        break;
      case '--report-path':
        config.reportPath = args[++i];
        break;
      case '--help':
      case '-h':
        console.log(`
🔧 Asset Leasing Protocol Schema Validator

Usage: tsx scripts/validate-schemas.ts [options]

Options:
  --data-dir <dir>      Data directory to validate (default: ./data)
  --verbose, -v         Show detailed validation results
  --exit-on-error       Exit with error code if validation fails
  --no-report           Don't generate validation report file
  --report-path <path>  Path for validation report (default: ./validation-report.json)
  --help, -h            Show this help message

Examples:
  tsx scripts/validate-schemas.ts
  tsx scripts/validate-schemas.ts --data-dir ./test-data --verbose
  tsx scripts/validate-schemas.ts --exit-on-error --no-report
`);
        process.exit(0);
      default:
        if (arg.startsWith('--')) {
          console.error(`Unknown option: ${arg}`);
          process.exit(1);
        }
    }
  }

  await validateSchemas(config);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}