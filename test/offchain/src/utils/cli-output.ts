/**
 * CLI Output Utilities for Integration Tests
 *
 * Provides rich, detailed output showing the complete data flow
 * from off-chain schemas through hashing to on-chain creation.
 */

import { createHash } from 'crypto';
import type { AssetMetadata, LeaseAgreement, LeaseTerms } from '../types/index.js';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',

  // Foreground colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',

  // Background colors
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m'
};

/**
 * Format section header
 */
export function header(text: string, level: number = 1): void {
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

/**
 * Format key-value pair
 */
export function keyValue(key: string, value: any, indent: number = 0): void {
  const padding = '  '.repeat(indent);
  const formattedKey = colors.dim + key + ':' + colors.reset;
  const formattedValue = colors.green + String(value) + colors.reset;
  console.log(`${padding}${formattedKey} ${formattedValue}`);
}

/**
 * Format success message
 */
export function success(message: string): void {
  console.log(colors.green + '✓ ' + message + colors.reset);
}

/**
 * Format error message
 */
export function error(message: string): void {
  console.log(colors.red + '✗ ' + message + colors.reset);
}

/**
 * Format warning message
 */
export function warning(message: string): void {
  console.log(colors.yellow + '⚠ ' + message + colors.reset);
}

/**
 * Format info message
 */
export function info(message: string): void {
  console.log(colors.blue + 'ℹ ' + message + colors.reset);
}

/**
 * Display complete asset metadata with structure
 */
export function displayAssetMetadata(metadata: AssetMetadata): void {
  header('Off-Chain Asset Metadata Schema', 2);

  console.log(colors.bright + 'Asset Identity:' + colors.reset);
  keyValue('Asset ID', metadata.assetId, 1);
  keyValue('Name', metadata.name, 1);
  keyValue('Description', metadata.description, 1);
  keyValue('Type', metadata.assetType, 1);

  console.log();
  console.log(colors.bright + 'Specifications:' + colors.reset);
  displayObject(metadata.specifications, 1);

  if (metadata.documents && metadata.documents.length > 0) {
    console.log();
    console.log(colors.bright + 'Documents:' + colors.reset);
    metadata.documents.forEach((doc, idx) => {
      console.log(colors.dim + `  [${idx + 1}]` + colors.reset);
      keyValue('Document ID', doc.documentId, 2);
      keyValue('Filename', doc.filename, 2);
      keyValue('Type', doc.documentType, 2);
      keyValue('Hash', doc.hash, 2);
      keyValue('Size', `${doc.size} bytes`, 2);
    });
  }

  console.log();
  console.log(colors.bright + 'Metadata Info:' + colors.reset);
  keyValue('Created At', metadata.metadata.createdAt, 1);
  keyValue('Updated At', metadata.metadata.updatedAt, 1);
  keyValue('Version', metadata.metadata.version, 1);
}

/**
 * Display lease agreement details
 */
export function displayLeaseAgreement(lease: LeaseAgreement): void {
  header('Off-Chain Lease Agreement Schema', 2);

  console.log(colors.bright + 'Lease Identity:' + colors.reset);
  keyValue('Lease ID', lease.leaseId, 1);
  keyValue('Asset ID', lease.assetId, 1);
  keyValue('Status', lease.status, 1);

  console.log();
  console.log(colors.bright + 'Parties:' + colors.reset);
  keyValue('Lessor', lease.lessorAddress, 1);
  keyValue('Lessee', lease.lesseeAddress, 1);

  console.log();
  console.log(colors.bright + 'Terms:' + colors.reset);
  displayLeaseTerms(lease.terms, 1);

  console.log();
  console.log(colors.bright + 'Legal Document:' + colors.reset);
  keyValue('Document ID', lease.legalDocument.documentId, 1);
  keyValue('Filename', lease.legalDocument.filename, 1);
  keyValue('Hash', lease.legalDocument.hash, 1);

  console.log();
  console.log(colors.bright + 'Metadata:' + colors.reset);
  keyValue('Metadata Hash', lease.metadataHash, 1);
  keyValue('Created At', lease.metadata.createdAt, 1);
  keyValue('Version', lease.metadata.version, 1);
}

/**
 * Display lease terms
 */
export function displayLeaseTerms(terms: LeaseTerms, indent: number = 0): void {
  const padding = '  '.repeat(indent);

  console.log(`${padding}${colors.dim}Start Date:${colors.reset} ${colors.green}${terms.startDate}${colors.reset}`);
  console.log(`${padding}${colors.dim}End Date:${colors.reset} ${colors.green}${terms.endDate}${colors.reset}`);
  console.log(`${padding}${colors.dim}Payment Amount:${colors.reset} ${colors.green}${terms.paymentAmount} wei${colors.reset}`);
  console.log(`${padding}${colors.dim}Payment Schedule:${colors.reset} ${colors.green}${terms.paymentSchedule}${colors.reset}`);
  console.log(`${padding}${colors.dim}Currency:${colors.reset} ${colors.green}${terms.currency}${colors.reset}`);

  if (terms.restrictions && terms.restrictions.length > 0) {
    console.log(`${padding}${colors.dim}Restrictions:${colors.reset}`);
    terms.restrictions.forEach(r => {
      console.log(`${padding}  ${colors.yellow}• ${r}${colors.reset}`);
    });
  }

  console.log(`${padding}${colors.dim}Specific Terms:${colors.reset}`);
  displayObject(terms.specificTerms, indent + 1);
}

/**
 * Display hashing process
 */
export function displayHashingProcess(
  data: any,
  label: string = 'Data'
): { hash: string; jsonString: string } {
  header(`Hashing Process: ${label}`, 2);

  // Create deterministic JSON string
  const sortedKeys = Object.keys(data).sort();
  const jsonString = JSON.stringify(data, sortedKeys);

  console.log(colors.bright + 'Input Data (JSON):' + colors.reset);
  console.log(colors.dim + jsonString.substring(0, 200) + (jsonString.length > 200 ? '...' : '') + colors.reset);
  console.log();

  keyValue('Input Size', `${jsonString.length} bytes`);
  keyValue('Input Type', typeof data);

  console.log();
  console.log(colors.bright + 'Hash Calculation:' + colors.reset);
  keyValue('Algorithm', 'SHA-256', 1);
  keyValue('Encoding', 'UTF-8', 1);

  // Generate hash
  const hash = createHash('sha256')
    .update(jsonString, 'utf8')
    .digest('hex');

  const hashWith0x = `0x${hash}`;

  console.log();
  console.log(colors.bright + 'Hash Output:' + colors.reset);
  keyValue('Raw Hash (hex)', hash, 1);
  keyValue('Ethereum Format', hashWith0x, 1);
  keyValue('Hash Length', `${hash.length} chars (${hash.length / 2} bytes)`, 1);

  // Display hash breakdown
  console.log();
  console.log(colors.bright + 'Hash Breakdown:' + colors.reset);
  console.log(`  ${colors.dim}First 8 chars:${colors.reset} ${colors.cyan}${hash.substring(0, 8)}${colors.reset} (useful for short IDs)`);
  console.log(`  ${colors.dim}Bytes32 (first 32 chars):${colors.reset} ${colors.cyan}${hash.substring(0, 32)}${colors.reset}`);
  console.log(`  ${colors.dim}Full hash:${colors.reset} ${colors.cyan}${hash}${colors.reset}`);

  return { hash: hashWith0x, jsonString };
}

/**
 * Display on-chain transaction details
 */
export function displayTransaction(
  txHash: string,
  blockNumber: number,
  gasUsed?: bigint,
  from?: string,
  to?: string
): void {
  header('On-Chain Transaction', 3);

  keyValue('Transaction Hash', txHash, 1);
  keyValue('Block Number', blockNumber, 1);

  if (gasUsed) {
    keyValue('Gas Used', gasUsed.toString(), 1);
  }

  if (from) {
    keyValue('From', from, 1);
  }

  if (to) {
    keyValue('To', to, 1);
  }
}

/**
 * Display asset registration summary
 */
export function displayAssetRegistration(params: {
  assetId: bigint;
  typeId: bigint;
  tokenAddress: string;
  tokenName: string;
  tokenSymbol: string;
  totalSupply: bigint;
  metadataHash: string;
  dataURI: string;
  transactionHash: string;
  blockNumber: number;
}): void {
  header('On-Chain Asset Registration', 2);

  console.log(colors.bright + 'Asset Details:' + colors.reset);
  keyValue('Asset ID', params.assetId.toString(), 1);
  keyValue('Asset Type ID', params.typeId.toString(), 1);
  keyValue('Metadata Hash', params.metadataHash, 1);
  keyValue('Data URI', params.dataURI, 1);

  console.log();
  console.log(colors.bright + 'Token Details:' + colors.reset);
  keyValue('Token Address', params.tokenAddress, 1);
  keyValue('Token Name', params.tokenName, 1);
  keyValue('Token Symbol', params.tokenSymbol, 1);
  keyValue('Total Supply', params.totalSupply.toString(), 1);

  console.log();
  console.log(colors.bright + 'Transaction:' + colors.reset);
  keyValue('Transaction Hash', params.transactionHash, 1);
  keyValue('Block Number', params.blockNumber, 1);

  success(`Asset ${params.assetId} successfully registered on-chain!`);
}

/**
 * Display lease creation summary
 */
export function displayLeaseCreation(params: {
  leaseId: bigint;
  offerId: bigint;
  assetId: bigint;
  lessor: string;
  lessee: string;
  paymentAmount: bigint;
  startTime: number;
  endTime: number;
  termsHash: string;
  transactionHash: string;
  blockNumber: number;
  nftId?: bigint;
}): void {
  header('On-Chain Lease Creation', 2);

  console.log(colors.bright + 'Lease Details:' + colors.reset);
  keyValue('Lease ID', params.leaseId.toString(), 1);
  keyValue('Offer ID', params.offerId.toString(), 1);
  keyValue('Asset ID', params.assetId.toString(), 1);

  console.log();
  console.log(colors.bright + 'Parties:' + colors.reset);
  keyValue('Lessor', params.lessor, 1);
  keyValue('Lessee', params.lessee, 1);

  console.log();
  console.log(colors.bright + 'Terms:' + colors.reset);
  keyValue('Payment Amount', `${params.paymentAmount.toString()} wei`, 1);
  keyValue('Start Time', new Date(params.startTime * 1000).toISOString(), 1);
  keyValue('End Time', new Date(params.endTime * 1000).toISOString(), 1);
  keyValue('Duration', `${Math.floor((params.endTime - params.startTime) / 86400)} days`, 1);
  keyValue('Terms Hash', params.termsHash, 1);

  if (params.nftId) {
    console.log();
    console.log(colors.bright + 'Lease NFT:' + colors.reset);
    keyValue('NFT ID', params.nftId.toString(), 1);
  }

  console.log();
  console.log(colors.bright + 'Transaction:' + colors.reset);
  keyValue('Transaction Hash', params.transactionHash, 1);
  keyValue('Block Number', params.blockNumber, 1);

  success(`Lease ${params.leaseId} successfully created on-chain!`);
}

/**
 * Display comparison between off-chain and on-chain data
 */
export function displayDataComparison(
  offChainData: any,
  onChainData: any,
  label: string = 'Data'
): void {
  header(`Data Verification: ${label}`, 3);

  console.log(colors.bright + 'Off-Chain → On-Chain Comparison:' + colors.reset);

  const keys = new Set([...Object.keys(offChainData), ...Object.keys(onChainData)]);

  for (const key of keys) {
    const offChainValue = offChainData[key];
    const onChainValue = onChainData[key];
    const match = String(offChainValue) === String(onChainValue);

    const status = match ? colors.green + '✓' : colors.red + '✗';
    console.log(`  ${status} ${colors.dim}${key}:${colors.reset}`);
    console.log(`    ${colors.dim}Off-Chain:${colors.reset} ${colors.cyan}${offChainValue}${colors.reset}`);
    console.log(`    ${colors.dim}On-Chain:${colors.reset} ${colors.cyan}${onChainValue}${colors.reset}`);
  }
}

/**
 * Display generic object structure
 */
function displayObject(obj: any, indent: number = 0): void {
  const padding = '  '.repeat(indent);

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      console.log(`${padding}${colors.dim}${key}:${colors.reset}`);
      displayObject(value, indent + 1);
    } else if (Array.isArray(value)) {
      console.log(`${padding}${colors.dim}${key}:${colors.reset} ${colors.yellow}[${value.length} items]${colors.reset}`);
      value.forEach((item, idx) => {
        if (typeof item === 'object') {
          console.log(`${padding}  ${colors.dim}[${idx}]:${colors.reset}`);
          displayObject(item, indent + 2);
        } else {
          console.log(`${padding}  ${colors.green}${item}${colors.reset}`);
        }
      });
    } else {
      console.log(`${padding}${colors.dim}${key}:${colors.reset} ${colors.green}${value}${colors.reset}`);
    }
  }
}

/**
 * Display complete flow summary
 */
export function displayFlowSummary(steps: Array<{ step: string; status: 'completed' | 'pending' | 'failed' }>): void {
  header('Complete Flow Summary', 2);

  steps.forEach((step, idx) => {
    const icon = step.status === 'completed' ? colors.green + '✓' :
                 step.status === 'pending' ? colors.yellow + '○' :
                 colors.red + '✗';

    console.log(`  ${icon} ${colors.bright}Step ${idx + 1}:${colors.reset} ${step.step}`);
  });

  console.log();
}
