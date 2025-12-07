/**
 * TypeScript type definitions for Lease data structures
 * Matches the Solidity structs in LeaseFactory.sol
 */

export interface LeaseData {
  lessor: string;
  lessee: string;
  assetId: bigint | string | number;
  paymentToken: string;
  rentAmount: bigint | string | number;
  rentPeriod: bigint | string | number;
  securityDeposit: bigint | string | number;
  startTime: bigint | string | number;
  endTime: bigint | string | number;
  legalDocHash: string;
  termsVersion: number;
}

export interface LeaseIntentData {
  deadline: bigint | string | number;
  assetTypeSchemaHash: string;
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
