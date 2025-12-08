/**
 * EIP-712 Signature Utilities for Lease Intents
 * 
 * This module provides manual EIP-712 encoding that exactly matches Solidity's abi.encode.
 * Why manual? Ethers.js TypedDataEncoder handles nested structs differently than Solidity.
 * 
 * The Solidity contract (LeaseFactory.sol) manually encodes the Lease struct hash:
 * ```solidity
 * bytes32 leaseHash = keccak256(abi.encode(LEASE_TYPEHASH, ...lease fields));
 * bytes32 structHash = keccak256(abi.encode(LEASEINTENT_TYPEHASH, deadline, assetType, leaseHash));
 * ```
 * 
 * Our manual encoding replicates this exactly to generate valid signatures.
 */

import { ethers } from 'ethers';
import type { LeaseIntentData, EIP712Domain } from '../types/lease.js';

// LEASE_TYPEHASH from LeaseFactory.sol
const LEASE_TYPEHASH = ethers.keccak256(
  ethers.toUtf8Bytes(
    'Lease(address lessor,address lessee,uint256 assetId,address paymentToken,uint256 rentAmount,uint256 rentPeriod,uint256 securityDeposit,uint64 startTime,uint64 endTime,bytes32 legalDocHash,uint16 termsVersion)'
  )
);

// LEASEINTENT_TYPEHASH from LeaseFactory.sol  
const LEASEINTENT_TYPEHASH = ethers.keccak256(
  ethers.toUtf8Bytes(
    'LeaseIntent(uint64 deadline,bytes32 assetTypeSchemaHash,Lease lease)'
  )
);

/**
 * Manually encode Lease struct hash to match Solidity's abi.encode
 */
function encodeLeaseHash(lease: LeaseIntentData['lease']): string {
  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
    ['bytes32', 'address', 'address', 'uint256', 'address', 'uint256', 'uint256', 'uint256', 'uint64', 'uint64', 'bytes32', 'uint16'],
    [LEASE_TYPEHASH, lease.lessor, lease.lessee, lease.assetId, lease.paymentToken, lease.rentAmount, lease.rentPeriod, lease.securityDeposit, lease.startTime, lease.endTime, lease.legalDocHash, lease.termsVersion]
  );
  return ethers.keccak256(encoded);
}

/**
 * Manually encode LeaseIntent struct hash to match Solidity's abi.encode
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
 */
function buildDomainSeparator(domain: EIP712Domain): string {
  const TYPE_HASH = ethers.keccak256(
    ethers.toUtf8Bytes('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)')
  );
  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
    ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
    [TYPE_HASH, ethers.keccak256(ethers.toUtf8Bytes(domain.name)), ethers.keccak256(ethers.toUtf8Bytes(domain.version)), domain.chainId, domain.verifyingContract]
  );
  return ethers.keccak256(encoded);
}

/**
 * Calculate the complete EIP-712 digest for a LeaseIntent
 * This EXACTLY matches LeaseFactory.sol's _digest() function
 */
export function calculateLeaseIntentDigest(
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
  return ethers.keccak256(ethers.concat(['0x1901', domainSeparator, structHash]));
}

/**
 * Sign a LeaseIntent using manual digest calculation
 * Generates a signature that will be valid in the Solidity contract
 */
export async function signLeaseIntent(
  wallet: ethers.Wallet,
  leaseIntent: LeaseIntentData,
  leaseFactoryAddress: string,
  chainId: number
): Promise<string> {
  const digest = calculateLeaseIntentDigest(leaseIntent, leaseFactoryAddress, chainId);
  
  // Sign the raw digest using the wallet's signing key
  // IMPORTANT: Don't use signMessage() as it adds Ethereum prefix
  const sig = wallet.signingKey.sign(digest);
  
  return sig.serialized;
}
