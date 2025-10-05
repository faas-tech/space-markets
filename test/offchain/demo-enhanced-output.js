#!/usr/bin/env node

/**
 * Enhanced CLI Output Demonstration
 *
 * This standalone script demonstrates the rich CLI output showing
 * the complete data flow from off-chain schemas to on-chain creation
 * WITHOUT requiring Anvil or blockchain connection.
 */

import { createHash } from 'crypto';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function header(text, level = 1) {
  const border = '═'.repeat(80);
  const lightBorder = '─'.repeat(80);

  console.log();
  if (level === 1) {
    console.log(colors.bright + colors.cyan + border + colors.reset);
    console.log(colors.bright + colors.cyan + '  ' + text + colors.reset);
    console.log(colors.bright + colors.cyan + border + colors.reset);
  } else if (level === 2) {
    console.log(colors.bright + colors.blue + lightBorder + colors.reset);
    console.log(colors.bright + colors.blue + '▶ ' + text + colors.reset);
    console.log(colors.bright + colors.blue + lightBorder + colors.reset);
  } else {
    console.log(colors.yellow + '▸ ' + text + colors.reset);
  }
  console.log();
}

function keyValue(key, value, indent = 0) {
  const padding = '  '.repeat(indent);
  console.log(`${padding}${colors.dim}${key}:${colors.reset} ${colors.green}${value}${colors.reset}`);
}

function success(msg) {
  console.log(colors.green + '✓ ' + msg + colors.reset);
}

function info(msg) {
  console.log(colors.blue + 'ℹ ' + msg + colors.reset);
}

// Sample asset metadata
const satelliteMetadata = {
  assetId: 'SAT-1728090000-ABC123',
  name: 'Alpha-1 Earth Observation Satellite',
  description: 'High-resolution Earth observation satellite with multi-spectral imaging capabilities for environmental monitoring, agricultural analysis, and disaster response.',
  assetType: 'satellite',
  specifications: {
    type: 'satellite',
    orbital: {
      type: 'leo',
      altitude_km: 550,
      inclination_deg: 97.4,
      period_hours: 1.58,
    },
    physical: {
      mass_kg: 500,
      power_watts: 300,
      design_life_years: 5,
      dimensions: {
        length_m: 2.5,
        width_m: 1.2,
        height_m: 1.8
      }
    },
    mission: {
      primary_mission: 'earth_observation',
      launch_date: '2024-01-15T00:00:00Z',
      operator: 'OrbitalAssets Inc',
      manufacturer: 'SpaceTech Systems'
    },
    imaging: {
      resolution_m: 0.5,
      swath_width_km: 50,
      spectral_bands: ['RGB', 'NIR', 'SWIR'],
      revisit_time_hours: 12
    }
  },
  documents: [
    {
      documentId: 'doc_1728090000_abc123',
      filename: 'technical_specifications.pdf',
      documentType: 'specification',
      hash: '0xabc123def456...',
      size: 2457600,
      uploadedAt: '2024-10-04T19:00:00Z',
      description: 'Complete technical specifications and performance parameters'
    },
    {
      documentId: 'doc_1728090000_def456',
      filename: 'safety_certification.pdf',
      documentType: 'certification',
      hash: '0xdef456ghi789...',
      size: 1048576,
      uploadedAt: '2024-10-04T19:00:00Z',
      description: 'FCC and ITU safety and compliance certification'
    }
  ],
  metadata: {
    createdAt: '2024-10-04T19:00:00Z',
    updatedAt: '2024-10-04T19:00:00Z',
    version: '1.0.0'
  }
};

// Sample lease agreement
const leaseAgreement = {
  leaseId: 'LEASE-ABC123',
  assetId: 'SAT-1728090000-ABC123',
  lessorAddress: '0x1234567890123456789012345678901234567890',
  lesseeAddress: '0x0987654321098765432109876543210987654321',
  terms: {
    startDate: '2024-11-01T00:00:00Z',
    endDate: '2024-11-30T23:59:59Z',
    paymentAmount: '1000000000000000000000',
    paymentSchedule: 'monthly',
    currency: 'USDC',
    restrictions: [
      'No military applications',
      'Environmental monitoring only',
      'Data sharing restrictions apply'
    ],
    specificTerms: {
      assetType: 'satellite',
      orbital_period_hours: 1.58,
      communication_frequency_ghz: 8.4,
      coverage_area_km2: 2500000,
      imaging_resolution_m: 0.5,
      data_download_rights: true,
      orbit_maintenance_responsibility: 'lessor'
    }
  },
  legalDocument: {
    documentId: 'lease_1728090000_xyz789',
    filename: 'lease_agreement.pdf',
    documentType: 'lease_agreement',
    hash: '0xxyz789...',
    size: 524288,
    uploadedAt: '2024-10-04T19:00:00Z',
    description: 'Legally binding lease agreement with all terms and conditions'
  },
  metadataHash: '0x0000...',
  status: 'pending_signatures',
  metadata: {
    createdAt: '2024-10-04T19:00:00Z',
    updatedAt: '2024-10-04T19:00:00Z',
    version: '1.0.0'
  }
};

// Main demonstration
header('ENHANCED CLI OUTPUT DEMONSTRATION', 1);
console.log('This demonstrates the complete data flow visualization for asset and lease creation.\n');

// ═══════════════════════════════════════════════════════════════
// ASSET CREATION FLOW
// ═══════════════════════════════════════════════════════════════

header('PART 1: ASSET CREATION FLOW', 1);

header('Off-Chain Asset Metadata Schema', 2);

console.log(colors.bright + 'Asset Identity:' + colors.reset);
keyValue('Asset ID', satelliteMetadata.assetId, 1);
keyValue('Name', satelliteMetadata.name, 1);
keyValue('Type', satelliteMetadata.assetType, 1);

console.log();
console.log(colors.bright + 'Orbital Parameters:' + colors.reset);
keyValue('Type', satelliteMetadata.specifications.orbital.type.toUpperCase(), 1);
keyValue('Altitude', `${satelliteMetadata.specifications.orbital.altitude_km} km`, 1);
keyValue('Inclination', `${satelliteMetadata.specifications.orbital.inclination_deg}°`, 1);
keyValue('Period', `${satelliteMetadata.specifications.orbital.period_hours} hours`, 1);

console.log();
console.log(colors.bright + 'Physical Characteristics:' + colors.reset);
keyValue('Mass', `${satelliteMetadata.specifications.physical.mass_kg} kg`, 1);
keyValue('Power', `${satelliteMetadata.specifications.physical.power_watts} W`, 1);
keyValue('Design Life', `${satelliteMetadata.specifications.physical.design_life_years} years`, 1);
keyValue('Dimensions', `${satelliteMetadata.specifications.physical.dimensions.length_m}m × ${satelliteMetadata.specifications.physical.dimensions.width_m}m × ${satelliteMetadata.specifications.physical.dimensions.height_m}m`, 1);

console.log();
console.log(colors.bright + 'Imaging Capabilities:' + colors.reset);
keyValue('Resolution', `${satelliteMetadata.specifications.imaging.resolution_m} meters`, 1);
keyValue('Swath Width', `${satelliteMetadata.specifications.imaging.swath_width_km} km`, 1);
keyValue('Spectral Bands', satelliteMetadata.specifications.imaging.spectral_bands.join(', '), 1);
keyValue('Revisit Time', `${satelliteMetadata.specifications.imaging.revisit_time_hours} hours`, 1);

console.log();
console.log(colors.bright + 'Documents:' + colors.reset);
satelliteMetadata.documents.forEach((doc, idx) => {
  console.log(colors.dim + `  [${idx + 1}] ${doc.filename}` + colors.reset);
  keyValue('Type', doc.documentType, 2);
  keyValue('Size', `${(doc.size / 1024 / 1024).toFixed(2)} MB`, 2);
  keyValue('Description', doc.description, 2);
});

// ═══════════════════════════════════════════════════════════════
// HASHING PROCESS
// ═══════════════════════════════════════════════════════════════

header('Hashing Process: Asset Metadata', 2);

const jsonString = JSON.stringify(satelliteMetadata, Object.keys(satelliteMetadata).sort());

console.log(colors.bright + 'Input Data (JSON):' + colors.reset);
console.log(colors.dim + jsonString.substring(0, 150) + '...' + colors.reset);
console.log();

keyValue('Input Size', `${jsonString.length} bytes`);
keyValue('Algorithm', 'SHA-256');
keyValue('Encoding', 'UTF-8');

const hash = createHash('sha256').update(jsonString, 'utf8').digest('hex');
const hashWith0x = `0x${hash}`;

console.log();
console.log(colors.bright + 'Hash Output:' + colors.reset);
keyValue('Raw Hash (hex)', hash, 1);
keyValue('Ethereum Format', hashWith0x, 1);
keyValue('Hash Length', `${hash.length} chars (${hash.length / 2} bytes)`, 1);

console.log();
console.log(colors.bright + 'Hash Breakdown:' + colors.reset);
console.log(`  ${colors.dim}First 8 chars:${colors.reset} ${colors.cyan}${hash.substring(0, 8)}${colors.reset} ${colors.dim}(useful for short IDs)${colors.reset}`);
console.log(`  ${colors.dim}Bytes32 (first 32 chars):${colors.reset} ${colors.cyan}${hash.substring(0, 32)}${colors.reset} ${colors.dim}(for on-chain storage)${colors.reset}`);
console.log(`  ${colors.dim}Full hash:${colors.reset} ${colors.cyan}${hash}${colors.reset}`);

success('Metadata hash generated successfully!');

// ═══════════════════════════════════════════════════════════════
// ON-CHAIN ASSET REGISTRATION
// ═══════════════════════════════════════════════════════════════

header('On-Chain Asset Registration Parameters', 2);

const assetRegistrationParams = {
  assetTypeId: '1',
  metadataHash: hashWith0x.substring(0, 34), // bytes32
  dataURI: `ipfs://QmAssetMetadata/${satelliteMetadata.assetId}`,
  tokenName: 'Alpha-1 Satellite Shares',
  tokenSymbol: 'ALPHA-SAT',
  totalSupply: '1000000000000000000000000', // 1M tokens in wei
  issuer: '0x1234567890123456789012345678901234567890'
};

console.log(colors.bright + 'Asset Details:' + colors.reset);
keyValue('Asset Type ID', assetRegistrationParams.assetTypeId, 1);
keyValue('Metadata Hash (bytes32)', assetRegistrationParams.metadataHash, 1);
keyValue('Data URI', assetRegistrationParams.dataURI, 1);

console.log();
console.log(colors.bright + 'Token Parameters:' + colors.reset);
keyValue('Token Name', assetRegistrationParams.tokenName, 1);
keyValue('Token Symbol', assetRegistrationParams.tokenSymbol, 1);
keyValue('Total Supply', '1,000,000 tokens', 1);
keyValue('Issuer Address', assetRegistrationParams.issuer, 1);

console.log();
console.log(colors.bright + 'Simulated Transaction Result:' + colors.reset);
keyValue('Asset ID', '42', 1);
keyValue('Token Address', '0xABCDEF1234567890ABCDEF1234567890ABCDEF12', 1);
keyValue('Transaction Hash', '0x123abc456def789...',  1);
keyValue('Block Number', '12345', 1);
keyValue('Gas Used', '2,847,392', 1);

success('Asset successfully registered on blockchain!');

// ═══════════════════════════════════════════════════════════════
// LEASE CREATION FLOW
// ═══════════════════════════════════════════════════════════════

header('PART 2: LEASE CREATION FLOW', 1);

header('Off-Chain Lease Agreement Schema', 2);

console.log(colors.bright + 'Lease Identity:' + colors.reset);
keyValue('Lease ID', leaseAgreement.leaseId, 1);
keyValue('Asset ID', leaseAgreement.assetId, 1);
keyValue('Status', leaseAgreement.status, 1);

console.log();
console.log(colors.bright + 'Parties:' + colors.reset);
keyValue('Lessor', leaseAgreement.lessorAddress, 1);
keyValue('Lessee', leaseAgreement.lesseeAddress, 1);

console.log();
console.log(colors.bright + 'Terms:' + colors.reset);
keyValue('Start Date', leaseAgreement.terms.startDate, 1);
keyValue('End Date', leaseAgreement.terms.endDate, 1);
keyValue('Duration', '30 days', 1);
keyValue('Payment Amount', '1,000 USDC', 1);
keyValue('Payment Schedule', leaseAgreement.terms.paymentSchedule, 1);

console.log();
console.log(colors.bright + 'Satellite-Specific Terms:' + colors.reset);
keyValue('Orbital Period', `${leaseAgreement.terms.specificTerms.orbital_period_hours} hours`, 1);
keyValue('Communication Frequency', `${leaseAgreement.terms.specificTerms.communication_frequency_ghz} GHz`, 1);
keyValue('Coverage Area', `${(leaseAgreement.terms.specificTerms.coverage_area_km2 / 1000000).toFixed(1)} million km²`, 1);
keyValue('Imaging Resolution', `${leaseAgreement.terms.specificTerms.imaging_resolution_m} meters`, 1);
keyValue('Data Download Rights', leaseAgreement.terms.specificTerms.data_download_rights ? 'Granted' : 'Not Granted', 1);

console.log();
console.log(colors.bright + 'Restrictions:' + colors.reset);
leaseAgreement.terms.restrictions.forEach(r => {
  console.log(`  ${colors.yellow}• ${r}${colors.reset}`);
});

// ═══════════════════════════════════════════════════════════════
// LEASE TERMS HASHING
// ═══════════════════════════════════════════════════════════════

header('Hashing Process: Lease Terms', 2);

const leaseTermsString = JSON.stringify(leaseAgreement.terms, Object.keys(leaseAgreement.terms).sort());
const leaseHash = createHash('sha256').update(leaseTermsString, 'utf8').digest('hex');
const leaseHashWith0x = `0x${leaseHash}`;

console.log(colors.bright + 'Input: Lease Terms JSON' + colors.reset);
console.log(colors.dim + leaseTermsString.substring(0, 150) + '...' + colors.reset);
console.log();

keyValue('Algorithm', 'SHA-256');
keyValue('Terms Hash', leaseHashWith0x);
keyValue('Bytes32 Format', leaseHashWith0x.substring(0, 34));

success('Lease terms hash generated successfully!');

// ═══════════════════════════════════════════════════════════════
// ON-CHAIN LEASE OFFER
// ═══════════════════════════════════════════════════════════════

header('On-Chain Lease Offer Parameters', 2);

const leaseOfferParams = {
  assetId: '42',
  lessor: leaseAgreement.lessorAddress,
  lessee: leaseAgreement.lesseeAddress,
  paymentToken: '0xUSDC_ADDRESS_HERE',
  totalPayment: leaseAgreement.terms.paymentAmount,
  startTime: Math.floor(new Date(leaseAgreement.terms.startDate).getTime() / 1000),
  endTime: Math.floor(new Date(leaseAgreement.terms.endDate).getTime() / 1000),
  termsHash: leaseHashWith0x.substring(0, 34)
};

console.log(colors.bright + 'Lease Offer Details:' + colors.reset);
keyValue('Asset ID', leaseOfferParams.assetId, 1);
keyValue('Lessor', leaseOfferParams.lessor, 1);
keyValue('Lessee', leaseOfferParams.lessee, 1);

console.log();
console.log(colors.bright + 'Payment Details:' + colors.reset);
keyValue('Payment Token', leaseOfferParams.paymentToken, 1);
keyValue('Total Payment', '1,000 USDC', 1);

console.log();
console.log(colors.bright + 'Time Parameters:' + colors.reset);
keyValue('Start Time (Unix)', leaseOfferParams.startTime, 1);
keyValue('End Time (Unix)', leaseOfferParams.endTime, 1);
keyValue('Duration', '2,592,000 seconds (30 days)', 1);

console.log();
console.log(colors.bright + 'Verification:' + colors.reset);
keyValue('Terms Hash', leaseOfferParams.termsHash, 1);

console.log();
console.log(colors.bright + 'Simulated Transaction Result:' + colors.reset);
keyValue('Offer ID', '7', 1);
keyValue('Transaction Hash', '0x789def123abc456...', 1);
keyValue('Block Number', '12346', 1);
keyValue('Gas Used', '184,292', 1);

success('Lease offer successfully posted to marketplace!');

// ═══════════════════════════════════════════════════════════════
// COMPLETE FLOW SUMMARY
// ═══════════════════════════════════════════════════════════════

header('Complete Data Flow Summary', 1);

console.log(colors.bright + 'Asset Creation Flow:' + colors.reset);
console.log(`  ${colors.green}✓${colors.reset} Step 1: Created off-chain metadata schema (${Object.keys(satelliteMetadata).length} top-level fields)`);
console.log(`  ${colors.green}✓${colors.reset} Step 2: Generated SHA-256 hash (${hash.length} chars)`);
console.log(`  ${colors.green}✓${colors.reset} Step 3: Registered asset type on-chain (Type ID: 1)`);
console.log(`  ${colors.green}✓${colors.reset} Step 4: Registered asset with ERC-20 token (Asset ID: 42)`);
console.log(`  ${colors.green}✓${colors.reset} Step 5: Verified data consistency across all layers`);

console.log();
console.log(colors.bright + 'Lease Creation Flow:' + colors.reset);
console.log(`  ${colors.green}✓${colors.reset} Step 1: Created off-chain lease agreement schema`);
console.log(`  ${colors.green}✓${colors.reset} Step 2: Generated SHA-256 hash of lease terms`);
console.log(`  ${colors.green}✓${colors.reset} Step 3: Posted lease offer on marketplace (Offer ID: 7)`);
console.log(`  ${colors.yellow}○${colors.reset} Step 4: Bid placement (pending)`);
console.log(`  ${colors.yellow}○${colors.reset} Step 5: Bid acceptance and NFT minting (pending)`);

console.log();
console.log(colors.bright + colors.green + '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' + colors.reset);
console.log(colors.bright + colors.green + '  ✅  DEMONSTRATION COMPLETE - Full data flow from off-chain to on-chain' + colors.reset);
console.log(colors.bright + colors.green + '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' + colors.reset);
console.log();

info('This demonstration shows how off-chain metadata schemas are transformed');
info('through cryptographic hashing into on-chain parameters for smart contracts.');
console.log();
