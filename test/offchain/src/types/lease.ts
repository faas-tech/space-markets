/**
 * TypeScript type definitions for Lease data structures
 * Matches the Solidity structs in LeaseFactory.sol
 */

export interface LeaseData {
  lessor: string;
  lessee: string;
  assetId: bigint | string;      // Removed `number` — unsafe for uint256 precision
  paymentToken: string;
  rentAmount: bigint | string;    // Removed `number` — unsafe for uint256 precision
  rentPeriod: bigint | string;    // Removed `number` — unsafe for uint256 precision
  securityDeposit: bigint | string; // Removed `number` — unsafe for uint256 precision
  startTime: bigint | string;     // Removed `number` — consistency with other uint fields
  endTime: bigint | string;       // Removed `number` — consistency with other uint fields
  legalDocHash: string;
  termsVersion: number;           // uint16 — safe as number
}

export interface LeaseIntentData {
  deadline: bigint | string;      // Removed `number` — unsafe for uint64 at edge
  assetTypeSchemaHash: string;    // Must match TYPEHASH field name, not struct field name
  lease: LeaseData;
}

/**
 * Type for EIP-712 domain
 */
export interface EIP712Domain {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: string;
}

/**
 * Result from signature generation
 */
export interface SignatureResult {
  signature: string;
  signer: string;
  digest: string;
}
