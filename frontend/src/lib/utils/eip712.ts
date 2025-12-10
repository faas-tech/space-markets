import { ethers } from 'ethers';

// Type hashes from LeaseFactory.sol
const LEASE_TYPEHASH = ethers.keccak256(
  ethers.toUtf8Bytes(
    'Lease(address lessor,address lessee,uint256 assetId,address paymentToken,uint256 rentAmount,uint256 rentPeriod,uint256 securityDeposit,uint64 startTime,uint64 endTime,bytes32 legalDocHash,uint16 termsVersion)'
  )
);

const LEASEINTENT_TYPEHASH = ethers.keccak256(
  ethers.toUtf8Bytes(
    'LeaseIntent(uint64 deadline,bytes32 assetTypeSchemaHash,Lease lease)'
  )
);

export interface LeaseData {
  lessor: string;
  lessee: string;
  assetId: bigint;
  paymentToken: string;
  rentAmount: bigint;
  rentPeriod: bigint;
  securityDeposit: bigint;
  startTime: bigint;
  endTime: bigint;
  legalDocHash: string;
  termsVersion: number;
}

export interface LeaseIntentData {
  deadline: bigint;
  assetTypeSchemaHash: string;
  lease: LeaseData;
}

/**
 * Manually encode Lease struct hash to match Solidity's abi.encode
 * This is required because ethers.js TypedDataEncoder handles nested structs differently
 */
function encodeLeaseHash(lease: LeaseData): string {
  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
    ['bytes32', 'address', 'address', 'uint256', 'address', 'uint256', 'uint256', 'uint256', 'uint64', 'uint64', 'bytes32', 'uint16'],
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
 * Manually encode LeaseIntent struct hash
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
function buildDomainSeparator(
  leaseFactoryAddress: string,
  chainId: number
): string {
  const TYPE_HASH = ethers.keccak256(
    ethers.toUtf8Bytes('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)')
  );
  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
    ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
    [
      TYPE_HASH,
      ethers.keccak256(ethers.toUtf8Bytes('Lease')),
      ethers.keccak256(ethers.toUtf8Bytes('1')),
      chainId,
      leaseFactoryAddress
    ]
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
  const domainSeparator = buildDomainSeparator(leaseFactoryAddress, chainId);
  const structHash = encodeLeaseIntentStructHash(leaseIntent);

  // EIP-712 final digest: keccak256("\x19\x01" ‖ domainSeparator ‖ structHash)
  return ethers.keccak256(ethers.concat(['0x1901', domainSeparator, structHash]));
}

/**
 * Sign a LeaseIntent using manual digest calculation
 * Generates a signature that will be valid in the Solidity contract
 *
 * IMPORTANT: Use signingKey.sign() instead of signMessage() to avoid Ethereum prefix
 */
export async function signLeaseIntent(
  signer: ethers.Signer,
  leaseIntent: LeaseIntentData,
  leaseFactoryAddress: string,
  chainId: number
): Promise<string> {
  const digest = calculateLeaseIntentDigest(leaseIntent, leaseFactoryAddress, chainId);

  // Get the signing key from the signer
  // For MetaMask/browser wallets, this will request signature via eth_sign
  if ('signingKey' in signer) {
    // Direct wallet (ethers.Wallet)
    const sig = (signer as any).signingKey.sign(digest);
    return sig.serialized;
  } else {
    // Browser wallet (MetaMask, etc.) - use personal_sign
    const address = await signer.getAddress();
    const provider = signer.provider;
    if (!provider) throw new Error('No provider available');

    // Request signature via eth_sign (raw digest, no prefix)
    return await (provider as any).send('eth_sign', [address, digest]);
  }
}

