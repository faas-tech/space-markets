/**
 * Validation utilities for Asset Leasing Protocol
 *
 * Provides comprehensive validation functions using Zod schemas
 * and custom business logic validation.
 */

import { z } from 'zod';
import { readFile, access } from 'fs/promises';
import { constants } from 'fs';
import path from 'path';

import { schemas } from '../schemas/index.js';
import type { ValidationResult, AssetMetadata, LeaseAgreement } from '../types/index.js';
import { isValidHash, isValidEthereumAddress } from './crypto.js';

/**
 * Validate asset metadata against schema and business rules
 */
export async function validateAssetMetadata(metadata: unknown): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Schema validation
    const validated = schemas.AssetMetadata.parse(metadata);

    // Business rule validation
    await validateAssetBusinessRules(validated, errors, warnings);

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodErrors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
      errors.push(...zodErrors);
    } else {
      errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      valid: false,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }
}

/**
 * Validate lease agreement against schema and business rules
 */
export async function validateLeaseAgreement(lease: unknown): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Schema validation
    const validated = schemas.LeaseAgreement.parse(lease);

    // Business rule validation
    await validateLeaseBusinessRules(validated, errors, warnings);

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodErrors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
      errors.push(...zodErrors);
    } else {
      errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      valid: false,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }
}

/**
 * Validate a JSON file against a specific schema
 */
export async function validateJsonFile<T>(
  filePath: string,
  schema: z.ZodSchema<T>
): Promise<ValidationResult & { data?: T }> {
  const errors: string[] = [];

  try {
    // Check file exists
    await access(filePath, constants.F_OK);

    // Read and parse JSON
    const fileContent = await readFile(filePath, 'utf8');
    const jsonData = JSON.parse(fileContent);

    // Schema validation
    const validated = schema.parse(jsonData);

    return {
      valid: true,
      data: validated
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodErrors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
      errors.push(...zodErrors);
    } else if (error instanceof SyntaxError) {
      errors.push(`JSON syntax error: ${error.message}`);
    } else if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      errors.push(`File not found: ${filePath}`);
    } else {
      errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      valid: false,
      errors
    };
  }
}

/**
 * Validate all JSON files in a directory against their respective schemas
 */
export async function validateDirectory(dirPath: string): Promise<{
  assets: ValidationResult[];
  leases: ValidationResult[];
  revenue: ValidationResult[];
}> {
  const results = {
    assets: [] as ValidationResult[],
    leases: [] as ValidationResult[],
    revenue: [] as ValidationResult[]
  };

  try {
    const { readdir } = await import('fs/promises');

    // Validate assets
    try {
      const assetFiles = await readdir(path.join(dirPath, 'assets'));
      for (const file of assetFiles.filter(f => f.endsWith('.json'))) {
        const result = await validateJsonFile(
          path.join(dirPath, 'assets', file),
          schemas.AssetMetadata
        );
        results.assets.push(result);
      }
    } catch {
      // Assets directory might not exist
    }

    // Validate leases
    try {
      const leaseFiles = await readdir(path.join(dirPath, 'leases'));
      for (const file of leaseFiles.filter(f => f.endsWith('.json'))) {
        const result = await validateJsonFile(
          path.join(dirPath, 'leases', file),
          schemas.LeaseAgreement
        );
        results.leases.push(result);
      }
    } catch {
      // Leases directory might not exist
    }

    // Validate revenue files
    try {
      const revenueFiles = await readdir(path.join(dirPath, 'revenue'));
      for (const file of revenueFiles.filter(f => f.endsWith('.json'))) {
        const result = await validateJsonFile(
          path.join(dirPath, 'revenue', file),
          schemas.RevenueRound
        );
        results.revenue.push(result);
      }
    } catch {
      // Revenue directory might not exist
    }
  } catch (error) {
    console.error('Error validating directory:', error);
  }

  return results;
}

/**
 * Asset-specific business rule validation
 */
async function validateAssetBusinessRules(
  asset: AssetMetadata,
  errors: string[],
  warnings: string[]
): Promise<void> {
  // Validate asset ID format
  if (!/^[A-Z0-9-]+$/.test(asset.assetId)) {
    errors.push('Asset ID must contain only uppercase letters, numbers, and hyphens');
  }

  // Validate orbital parameters based on asset type
  if (asset.specifications.type === 'satellite') {
    const orbital = asset.specifications.orbital;

    // LEO altitude validation
    if (orbital.type === 'leo' && (orbital.altitude_km < 160 || orbital.altitude_km > 2000)) {
      warnings.push('LEO satellites typically operate between 160-2000 km altitude');
    }

    // GEO altitude validation
    if (orbital.type === 'geo' && Math.abs(orbital.altitude_km - 35786) > 100) {
      errors.push('GEO satellites must be at approximately 35,786 km altitude');
    }

    // GEO inclination validation
    if (orbital.type === 'geo' && orbital.inclination_deg > 5) {
      warnings.push('GEO satellites typically have inclination < 5 degrees');
    }

    // Communications satellite validation
    if (asset.specifications.mission.primary_mission === 'communications') {
      if (!asset.specifications.communications) {
        errors.push('Communications satellites must have communications specifications');
      }
    }

    // Earth observation satellite validation
    if (asset.specifications.mission.primary_mission === 'earth_observation') {
      if (!asset.specifications.imaging) {
        errors.push('Earth observation satellites must have imaging specifications');
      }
    }
  }

  // Document validation
  if (asset.documents.length === 0) {
    warnings.push('Assets should have at least one supporting document');
  }

  // Validate document hashes
  for (const doc of asset.documents) {
    if (!isValidHash(doc.hash)) {
      errors.push(`Invalid hash format for document ${doc.documentId}`);
    }
  }

  // Launch date validation
  const launchDate = new Date(asset.specifications.orbital ?
    (asset.specifications as any).mission?.launch_date :
    asset.metadata.createdAt
  );

  if (launchDate > new Date()) {
    warnings.push('Launch date is in the future');
  }

  // Design life validation
  const designLife = asset.specifications.type === 'satellite' ?
    asset.specifications.physical.design_life_years :
    (asset.specifications as any).physical?.design_life_years;

  if (designLife && designLife > 25) {
    warnings.push('Design life exceeds typical satellite operational period');
  }
}

/**
 * Lease-specific business rule validation
 */
async function validateLeaseBusinessRules(
  lease: LeaseAgreement,
  errors: string[],
  warnings: string[]
): Promise<void> {
  // Validate addresses
  if (!isValidEthereumAddress(lease.lessorAddress)) {
    errors.push('Invalid lessor Ethereum address');
  }

  if (!isValidEthereumAddress(lease.lesseeAddress)) {
    errors.push('Invalid lessee Ethereum address');
  }

  if (lease.lessorAddress === lease.lesseeAddress) {
    errors.push('Lessor and lessee cannot be the same address');
  }

  // Validate lease duration
  const start = new Date(lease.terms.startDate);
  const end = new Date(lease.terms.endDate);
  const durationDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);

  if (durationDays < 1) {
    errors.push('Lease duration must be at least 1 day');
  }

  if (durationDays > 365 * 10) {
    warnings.push('Lease duration exceeds 10 years');
  }

  // Validate payment amount
  const paymentAmount = BigInt(lease.terms.paymentAmount);
  if (paymentAmount <= 0n) {
    errors.push('Payment amount must be positive');
  }

  // Validate payment schedule alignment
  const scheduleMinDays = {
    monthly: 25,
    quarterly: 85,
    annual: 350,
    upfront: 1
  };

  const minDays = scheduleMinDays[lease.terms.paymentSchedule];
  if (durationDays < minDays && lease.terms.paymentSchedule !== 'upfront') {
    errors.push(`Lease duration too short for ${lease.terms.paymentSchedule} payment schedule`);
  }

  // Asset-specific term validation
  const specificTerms = lease.terms.specificTerms;

  if (specificTerms.assetType === 'satellite') {
    // Validate orbital period consistency
    if (specificTerms.orbital_period_hours < 1 || specificTerms.orbital_period_hours > 48) {
      errors.push('Orbital period must be between 1 and 48 hours');
    }

    // Communication frequency validation
    if (specificTerms.communication_frequency_ghz &&
        (specificTerms.communication_frequency_ghz < 1 || specificTerms.communication_frequency_ghz > 100)) {
      warnings.push('Communication frequency outside typical satellite bands');
    }
  }

  if (specificTerms.assetType === 'orbital_compute') {
    // Validate compute resources
    if (specificTerms.compute_cores > 128) {
      warnings.push('Compute core allocation exceeds typical orbital systems');
    }

    if (specificTerms.storage_tb > 1000) {
      warnings.push('Storage allocation exceeds typical orbital systems');
    }
  }

  // Signature validation
  if (lease.status === 'active' && (!lease.signatures?.lessor || !lease.signatures?.lessee)) {
    errors.push('Active leases must have signatures from both parties');
  }

  // Legal document validation
  if (!isValidHash(lease.legalDocument.hash)) {
    errors.push('Invalid legal document hash');
  }

  if (!isValidHash(lease.metadataHash)) {
    errors.push('Invalid metadata hash');
  }
}

/**
 * Validate that required lease keys match asset type requirements
 */
export function validateRequiredLeaseKeys(
  assetType: string,
  leaseTerms: Record<string, unknown>
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const requiredKeys = getRequiredKeysForAssetType(assetType);

  for (const key of requiredKeys) {
    if (!(key in leaseTerms)) {
      errors.push(`Missing required lease term: ${key}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

/**
 * Get required lease keys for each asset type
 */
function getRequiredKeysForAssetType(assetType: string): string[] {
  switch (assetType) {
    case 'satellite':
      return [
        'orbital_period_hours',
        'data_download_rights',
        'orbit_maintenance_responsibility'
      ];
    case 'orbital_compute':
      return [
        'compute_cores',
        'storage_tb',
        'bandwidth_gbps',
        'power_consumption_kw'
      ];
    case 'orbital_relay':
      return [
        'relay_channels',
        'max_throughput_gbps',
        'coverage_area_km2',
        'signal_power_dbm'
      ];
    default:
      return [];
  }
}

/**
 * Comprehensive validation summary
 */
export async function generateValidationReport(dataDir: string): Promise<{
  summary: {
    totalFiles: number;
    validFiles: number;
    filesWithErrors: number;
    filesWithWarnings: number;
  };
  details: {
    assets: Array<{ file: string; result: ValidationResult }>;
    leases: Array<{ file: string; result: ValidationResult }>;
    revenue: Array<{ file: string; result: ValidationResult }>;
  };
}> {
  const results = await validateDirectory(dataDir);

  const allResults = [
    ...results.assets,
    ...results.leases,
    ...results.revenue
  ];

  const totalFiles = allResults.length;
  const validFiles = allResults.filter(r => r.valid).length;
  const filesWithErrors = allResults.filter(r => r.errors && r.errors.length > 0).length;
  const filesWithWarnings = allResults.filter(r => r.warnings && r.warnings.length > 0).length;

  return {
    summary: {
      totalFiles,
      validFiles,
      filesWithErrors,
      filesWithWarnings
    },
    details: {
      assets: results.assets.map((result, index) => ({
        file: `asset-${index}.json`,
        result
      })),
      leases: results.leases.map((result, index) => ({
        file: `lease-${index}.json`,
        result
      })),
      revenue: results.revenue.map((result, index) => ({
        file: `revenue-${index}.json`,
        result
      }))
    }
  };
}