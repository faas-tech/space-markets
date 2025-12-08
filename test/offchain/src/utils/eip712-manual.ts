/**
 * Manual EIP-712 encoding that exactly matches Solidity's abi.encode
 *
 * This file contains manual struct hash construction to match the exact
 * encoding used in LeaseFactory.sol's _digest() function.
 *
 * Why manual encoding?
 * - Ethers.js TypedDataEncoder handles nested structs automatically
 * - Solidity manually encodes the Lease struct hash
 * - We need to match Solidity's exact encoding to generate valid signatures
 */

import { ethers } from 'ethers';
import type { LeaseIntentData, EIP712Domain } from '../types/lease.js';

/**
 * LEASE_TYPEHASH from LeaseFactory.sol line 61-63:
 * keccak256("Lease(address lessor,address lessee,uint256 assetId,address paymentToken,uint256 rentAmount,uint256 rentPeriod,uint256 securityDeposit,uint64 startTime,uint64 endTime,bytes32 legalDocHash,uint16 termsVersion)")
 */
const LEASE_TYPEHASH = ethers.keccak256(
  ethers.toUtf8Bytes(
    'Lease(address lessor,address lessee,uint256 assetId,address paymentToken,uint256 rentAmount,uint256 rentPeriod,uint256 securityDeposit,uint64 startTime,uint64 endTime,bytes32 legalDocHash,uint16 termsVersion)'
  )
);

/**
 * LEASEINTENT_TYPEHASH from LeaseFactory.sol line 57-58:
 * keccak256("LeaseIntent(uint64 deadline,bytes32 assetTypeSchemaHash,Lease lease)")
 *
 * NOTE: Uses "assetTypeSchemaHash" even though struct field is "assetType"
 */
const LEASEINTENT_TYPEHASH = ethers.keccak256(
  ethers.toUtf8Bytes(
    'LeaseIntent(uint64 deadline,bytes32 assetTypeSchemaHash,Lease lease)'
  )
);

/**
 * Manually encode Lease struct hash to match Solidity's abi.encode
 *
 * Matches LeaseFactory.sol lines 132-147:
 * ```solidity
 * bytes32 leaseHash = keccak256(
 *     abi.encode(
 *         LEASE_TYPEHASH,
 *         L.lease.lessor,
 *         L.lease.lessee,
 *         L.lease.assetId,
 *         // ... etc
 *     )
 * );
 * ```
 */
function encodeLeaseHash(lease: LeaseIntentData['lease']): string {
  // AbiCoder.encode pads and formats exactly like Solidity's abi.encode
  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
    [
      'bytes32',  // LEASE_TYPEHASH
      'address',  // lessor
      'address',  // lessee
      'uint256',  // assetId
      'address',  // paymentToken
      'uint256',  // rentAmount
      'uint256',  // rentPeriod
      'uint256',  // securityDeposit
      'uint64',   // startTime
      'uint64',   // endTime
      'bytes32',  // legalDocHash
      'uint16'    // termsVersion
    ],
    [
      LEASE_TYPEHASH,
      lease.lessor,
      lease.lessee,
      lease.assetId,
      lease.paymentToken,
      lease.rentAmount,
      lease.rentPeriod,
      lease.securityDeposit,
      lease.startTime,
      lease.endTime,
      lease.legalDocHash,
      lease.termsVersion
    ]
  );

  return ethers.keccak256(encoded);
}

/**
 * Manually encode LeaseIntent struct hash to match Solidity's abi.encode
 *
 * Matches LeaseFactory.sol line 148:
 * ```solidity
 * bytes32 structHash = keccak256(abi.encode(LEASEINTENT_TYPEHASH, L.deadline, L.assetType, leaseHash));
 * ```
 */
function encodeLeaseIntentStructHash(leaseIntent: LeaseIntentData): string {
  const leaseHash = encodeLeaseHash(leaseIntent.lease);

  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
    ['bytes32', 'uint64', 'bytes32', 'bytes32'],
    [LEASEINTENT_TYPEHASH, leaseIntent.deadline, leaseIntent.assetTypeSchemaHash, leaseHash]
  );

  return ethers.keccak256(encoded);
}

/**
 * Calculate EIP-712 domain separator
 * Matches OpenZeppelin's EIP712Upgradeable._domainSeparatorV4()
 */
function buildDomainSeparator(domain: EIP712Domain): string {
  const TYPE_HASH = ethers.keccak256(
    ethers.toUtf8Bytes(
      'EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)'
    )
  );

  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
    ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
    [
      TYPE_HASH,
      ethers.keccak256(ethers.toUtf8Bytes(domain.name)),
      ethers.keccak256(ethers.toUtf8Bytes(domain.version)),
      domain.chainId,
      domain.verifyingContract
    ]
  );

  return ethers.keccak256(encoded);
}

/**
 * Calculate the complete EIP-712 digest for a LeaseIntent
 * This EXACTLY matches LeaseFactory.sol's _digest() function
 *
 * @param leaseIntent - The lease intent data
 * @param leaseFactoryAddress - Address of the LeaseFactory contract
 * @param chainId - Chain ID
 * @returns The digest as a bytes32 hex string (exactly matches Solidity)
 */
export function calculateLeaseIntentDigestManual(
  leaseIntent: LeaseIntentData,
  leaseFactoryAddress: string,
  chainId: number
): string {
  const domain: EIP712Domain = {
    name: 'Lease',
    version: '1',
    chainId,
    verifyingContract: leaseFactoryAddress
  };

  const domainSeparator = buildDomainSeparator(domain);
  const structHash = encodeLeaseIntentStructHash(leaseIntent);

  // EIP-712 final digest: keccak256("\x19\x01" ‖ domainSeparator ‖ structHash)
  const digest = ethers.keccak256(
    ethers.concat([
      '0x1901',
      domainSeparator,
      structHash
    ])
  );

  return digest;
}

/**
 * Sign a LeaseIntent using manual digest calculation
 * This generates a signature that will be valid in the Solidity contract
 */
export async function signLeaseIntentManual(
  wallet: ethers.Wallet,
  leaseIntent: LeaseIntentData,
  leaseFactoryAddress: string,
  chainId: number
): Promise<string> {
  const digest = calculateLeaseIntentDigestManual(
    leaseIntent,
    leaseFactoryAddress,
    chainId
  );

  // Sign the raw digest using the wallet's signing key
  // IMPORTANT: Don't use signMessage() as it adds Ethereum prefix
  // EIP-712 digest already includes the \x19\x01 prefix
  const sig = wallet.signingKey.sign(digest);

  // Return as compact signature (r + s + v format)
  return sig.serialized;
}
