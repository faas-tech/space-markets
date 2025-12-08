/**
 * EIP-712 Signature Utilities for Lease Intents
 *
 * This module provides utilities for signing and verifying LeaseIntent structs
 * using EIP-712 typed structured data signing. The domain and types match
 * exactly what's defined in LeaseFactory.sol.
 *
 * EIP-712 Standard: https://eips.ethereum.org/EIPS/eip-712
 *
 * Usage:
 * ```typescript
 * const signature = await signLeaseIntent(
 *   wallet,
 *   leaseIntent,
 *   leaseFactoryAddress,
 *   chainId
 * );
 *
 * const isValid = verifyLeaseIntentSignature(
 *   signature,
 *   leaseIntent,
 *   wallet.address,
 *   leaseFactoryAddress,
 *   chainId
 * );
 * ```
 */

import { ethers } from 'ethers';
import type { LeaseIntentData, EIP712Domain, SignatureResult } from '../types/lease.js';

/**
 * EIP-712 Type definitions for Lease
 * Must match LEASE_TYPEHASH in LeaseFactory.sol:
 * keccak256("Lease(address lessor,address lessee,uint256 assetId,address paymentToken,uint256 rentAmount,uint256 rentPeriod,uint256 securityDeposit,uint64 startTime,uint64 endTime,bytes32 legalDocHash,uint16 termsVersion)")
 */
export const LEASE_TYPES = {
  Lease: [
    { name: 'lessor', type: 'address' },
    { name: 'lessee', type: 'address' },
    { name: 'assetId', type: 'uint256' },
    { name: 'paymentToken', type: 'address' },
    { name: 'rentAmount', type: 'uint256' },
    { name: 'rentPeriod', type: 'uint256' },
    { name: 'securityDeposit', type: 'uint256' },
    { name: 'startTime', type: 'uint64' },
    { name: 'endTime', type: 'uint64' },
    { name: 'legalDocHash', type: 'bytes32' },
    { name: 'termsVersion', type: 'uint16' }
  ]
};

/**
 * EIP-712 Type definitions for LeaseIntent
 * Must match LEASEINTENT_TYPEHASH in LeaseFactory.sol:
 * keccak256("LeaseIntent(uint64 deadline,bytes32 assetTypeSchemaHash,Lease lease)")
 * NOTE: Solidity uses "assetTypeSchemaHash" in TYPEHASH even though struct field is "assetType"
 */
export const LEASE_INTENT_TYPES = {
  LeaseIntent: [
    { name: 'deadline', type: 'uint64' },
    { name: 'assetTypeSchemaHash', type: 'bytes32' },  // Must match TYPEHASH, not struct field name
    { name: 'lease', type: 'Lease' }
  ],
  Lease: LEASE_TYPES.Lease
};

/**
 * Create EIP-712 domain for LeaseFactory
 * Matches the domain initialized in LeaseFactory.sol:
 * __EIP712_init("Lease", "1")
 */
export function createLeaseDomain(
  leaseFactoryAddress: string,
  chainId: number
): EIP712Domain {
  return {
    name: 'Lease',
    version: '1',
    chainId,
    verifyingContract: leaseFactoryAddress
  };
}

/**
 * Sign a LeaseIntent using EIP-712 typed data signing
 *
 * @param wallet - The wallet to sign with (lessor or lessee)
 * @param leaseIntent - The lease intent data to sign
 * @param leaseFactoryAddress - Address of the LeaseFactory contract
 * @param chainId - Chain ID (31337 for Anvil, 1 for mainnet, etc.)
 * @returns The signature as a hex string
 */
export async function signLeaseIntent(
  wallet: ethers.Wallet,
  leaseIntent: LeaseIntentData,
  leaseFactoryAddress: string,
  chainId: number
): Promise<string> {
  const domain = createLeaseDomain(leaseFactoryAddress, chainId);

  // Ensure all bigint values are converted to strings for signing
  const normalizedIntent = normalizeLeaseIntent(leaseIntent);

  const signature = await wallet.signTypedData(
    domain,
    LEASE_INTENT_TYPES,
    normalizedIntent
  );

  return signature;
}

/**
 * Sign a LeaseIntent and return detailed signature result
 *
 * @param wallet - The wallet to sign with
 * @param leaseIntent - The lease intent data to sign
 * @param leaseFactoryAddress - Address of the LeaseFactory contract
 * @param chainId - Chain ID
 * @returns Signature result with digest and signer information
 */
export async function signLeaseIntentDetailed(
  wallet: ethers.Wallet,
  leaseIntent: LeaseIntentData,
  leaseFactoryAddress: string,
  chainId: number
): Promise<SignatureResult> {
  const domain = createLeaseDomain(leaseFactoryAddress, chainId);
  const normalizedIntent = normalizeLeaseIntent(leaseIntent);

  // Calculate the digest (same as Solidity's _digest function)
  const digest = ethers.TypedDataEncoder.hash(
    domain,
    LEASE_INTENT_TYPES,
    normalizedIntent
  );

  const signature = await wallet.signTypedData(
    domain,
    LEASE_INTENT_TYPES,
    normalizedIntent
  );

  return {
    signature,
    signer: wallet.address,
    digest
  };
}

/**
 * Verify a LeaseIntent signature
 *
 * @param signature - The signature to verify
 * @param leaseIntent - The lease intent data that was signed
 * @param expectedSigner - The address that should have signed
 * @param leaseFactoryAddress - Address of the LeaseFactory contract
 * @param chainId - Chain ID
 * @returns True if signature is valid and from expected signer
 */
export function verifyLeaseIntentSignature(
  signature: string,
  leaseIntent: LeaseIntentData,
  expectedSigner: string,
  leaseFactoryAddress: string,
  chainId: number
): boolean {
  const domain = createLeaseDomain(leaseFactoryAddress, chainId);
  const normalizedIntent = normalizeLeaseIntent(leaseIntent);

  try {
    const recoveredAddress = ethers.verifyTypedData(
      domain,
      LEASE_INTENT_TYPES,
      normalizedIntent,
      signature
    );

    return recoveredAddress.toLowerCase() === expectedSigner.toLowerCase();
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}

/**
 * Recover the signer address from a LeaseIntent signature
 *
 * @param signature - The signature
 * @param leaseIntent - The lease intent data that was signed
 * @param leaseFactoryAddress - Address of the LeaseFactory contract
 * @param chainId - Chain ID
 * @returns The recovered signer address
 */
export function recoverLeaseIntentSigner(
  signature: string,
  leaseIntent: LeaseIntentData,
  leaseFactoryAddress: string,
  chainId: number
): string {
  const domain = createLeaseDomain(leaseFactoryAddress, chainId);
  const normalizedIntent = normalizeLeaseIntent(leaseIntent);

  return ethers.verifyTypedData(
    domain,
    LEASE_INTENT_TYPES,
    normalizedIntent,
    signature
  );
}

/**
 * Calculate the EIP-712 digest for a LeaseIntent
 * This should match the digest calculated by LeaseFactory._digest()
 *
 * @param leaseIntent - The lease intent data
 * @param leaseFactoryAddress - Address of the LeaseFactory contract
 * @param chainId - Chain ID
 * @returns The digest as a bytes32 hex string
 */
export function calculateLeaseIntentDigest(
  leaseIntent: LeaseIntentData,
  leaseFactoryAddress: string,
  chainId: number
): string {
  const domain = createLeaseDomain(leaseFactoryAddress, chainId);
  const normalizedIntent = normalizeLeaseIntent(leaseIntent);

  return ethers.TypedDataEncoder.hash(
    domain,
    LEASE_INTENT_TYPES,
    normalizedIntent
  );
}

/**
 * Normalize LeaseIntent data for signing
 * Converts bigint values to strings and ensures proper formatting
 */
function normalizeLeaseIntent(leaseIntent: LeaseIntentData): any {
  return {
    deadline: typeof leaseIntent.deadline === 'bigint'
      ? leaseIntent.deadline.toString()
      : leaseIntent.deadline,
    assetTypeSchemaHash: leaseIntent.assetTypeSchemaHash,  // Must match TYPEHASH field name
    lease: {
      lessor: leaseIntent.lease.lessor,
      lessee: leaseIntent.lease.lessee,
      assetId: typeof leaseIntent.lease.assetId === 'bigint'
        ? leaseIntent.lease.assetId.toString()
        : leaseIntent.lease.assetId,
      paymentToken: leaseIntent.lease.paymentToken,
      rentAmount: typeof leaseIntent.lease.rentAmount === 'bigint'
        ? leaseIntent.lease.rentAmount.toString()
        : leaseIntent.lease.rentAmount,
      rentPeriod: typeof leaseIntent.lease.rentPeriod === 'bigint'
        ? leaseIntent.lease.rentPeriod.toString()
        : leaseIntent.lease.rentPeriod,
      securityDeposit: typeof leaseIntent.lease.securityDeposit === 'bigint'
        ? leaseIntent.lease.securityDeposit.toString()
        : leaseIntent.lease.securityDeposit,
      startTime: typeof leaseIntent.lease.startTime === 'bigint'
        ? leaseIntent.lease.startTime.toString()
        : leaseIntent.lease.startTime,
      endTime: typeof leaseIntent.lease.endTime === 'bigint'
        ? leaseIntent.lease.endTime.toString()
        : leaseIntent.lease.endTime,
      legalDocHash: leaseIntent.lease.legalDocHash,
      termsVersion: leaseIntent.lease.termsVersion
    }
  };
}

/**
 * Helper: Create a sample LeaseIntent for testing
 */
export function createSampleLeaseIntent(
  lessor: string,
  lessee: string,
  assetId: number = 1
): LeaseIntentData {
  const now = Math.floor(Date.now() / 1000);

  return {
    deadline: now + 7 * 24 * 60 * 60, // 7 days from now
    assetTypeSchemaHash: ethers.ZeroHash,
    lease: {
      lessor,
      lessee,
      assetId,
      paymentToken: ethers.ZeroAddress, // Will be set to stablecoin address
      rentAmount: ethers.parseUnits('1000', 6), // 1000 USDC
      rentPeriod: 30 * 24 * 60 * 60, // 30 days
      securityDeposit: ethers.parseUnits('5000', 6), // 5000 USDC
      startTime: now + 1 * 24 * 60 * 60, // Starts in 1 day
      endTime: now + 365 * 24 * 60 * 60, // Ends in 1 year
      legalDocHash: ethers.keccak256(ethers.toUtf8Bytes('sample-legal-doc')),
      termsVersion: 1
    }
  };
}
