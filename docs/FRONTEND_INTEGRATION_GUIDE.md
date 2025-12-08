# Frontend Integration Guide - Asset Leasing Protocol

**Version:** 2.1 (EIP-712 Marketplace Bidding)
**Last Updated:** 2025-12-08
**Target:** AI Coding Agents & Frontend Developers

---

## Executive Summary

This guide provides everything needed to build a **production-ready frontend** for the Asset Leasing Protocol running on a **local Anvil testnet**. All contract ABIs, addresses, core workflows, and integration patterns are documented with working code examples.

**New in v2.1:** Complete marketplace bidding workflow with manual EIP-712 signature implementation that correctly handles nested Solidity structs.

### System Architecture

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│  Frontend App   │ ───► │ ethers.js Client │ ───► │ Anvil Testnet   │
│  (React/Next)   │      │ (Web3 Provider)  │      │ (Localhost:8545)│
└─────────────────┘      └──────────────────┘      └─────────────────┘
         │                        │
         │                        │
         ▼                        ▼
┌─────────────────┐      ┌──────────────────┐
│  API Server     │      │ Contract ABIs    │
│  (Port 3001)    │      │ (Foundry Out)    │
└─────────────────┘      └──────────────────┘
```

### Core Contracts (UUPS Upgradeable)

| Contract | Purpose | Proxy Address (Local) |
|----------|---------|----------------------|
| **AssetRegistry** | Register assets, create asset types | `0x9A676e781A523b5d0C0e43731313A708CB607508` |
| **LeaseFactory** | Mint signed lease NFTs | `0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1` |
| **Marketplace** | Post offers, bid, accept, claim revenue | `0x68B1D87F95878fE05B998F19b66F4baba5De1aed` |
| **MockStablecoin** | Test payment token (USDC) | `0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e` |

**Note:** Addresses shown are from a standard Anvil deployment. Your deployment will have different addresses - retrieve them from deployment output.

---

## Quick Start

### Prerequisites

```bash
# 1. Start Anvil (Terminal 1)
anvil --port 8545 --host 127.0.0.1

# 2. Deploy Contracts (Terminal 2)
cd test/offchain
npm run demo

# 3. Save contract addresses from output
# Look for lines like: "✓ AssetRegistry deployed at 0x..."
```

### Frontend Environment Variables

```env
# .env.local
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_ASSET_REGISTRY=0x9A676e781A523b5d0C0e43731313A708CB607508
NEXT_PUBLIC_LEASE_FACTORY=0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1
NEXT_PUBLIC_MARKETPLACE=0x68B1D87F95878fE05B998F19b66F4baba5De1aed
NEXT_PUBLIC_STABLECOIN=0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e
```

---

## Core User Workflows

The protocol supports five main user workflows:

1. **Asset Registration** - Asset owners tokenize real-world assets (satellites, compute, etc.)
2. **Lease Offer Creation** - Token holders post lease offers on the marketplace
3. **Marketplace Bidding** - Bidders compete using EIP-712 signatures; lessor accepts winning bid
4. **Revenue Claims** - Token holders claim their share of escrow/rent payments
5. **X402 Streaming Payments** - Lessees pay for usage using per-second micropayments

### 1. Asset Registration Workflow

**User Story:** Asset owner wants to tokenize a satellite and list it for lease.

**Steps:**
1. Create asset type (one-time per asset category)
2. Register specific asset with metadata
3. Receive AssetERC20 token representing ownership shares

**Frontend Components Needed:**
- Asset type selector/creator form
- Asset metadata form (name, specs, docs)
- Token configuration (name, symbol, supply)
- Transaction confirmation modal

**Complete Code Example:**

```typescript
// lib/contracts/assetRegistry.ts
import { ethers } from 'ethers';

export const ASSET_REGISTRY_ABI = [
  "function createAssetType(string memory name, bytes32 assetType, bytes32[] memory requiredLeaseKeys, tuple(bytes32 key, bytes value)[] memory metadata) external",
  "function registerAsset(bytes32 assetType, string memory tokenName, string memory tokenSymbol, uint256 totalSupply, address admin, address upgrader, address tokenRecipient, tuple(bytes32 key, bytes value)[] memory metadata) external returns (uint256 assetId, address tokenAddress)",
  "function getAsset(uint256 assetId) external view returns (tuple(uint256 assetId, bytes32 assetType, address tokenAddress, address creator, uint256 createdAt, tuple(bytes32 key, bytes value)[] metadata))",
  "event AssetRegistered(uint256 indexed assetId, bytes32 indexed assetType, address indexed tokenAddress, address creator)"
];

export interface AssetMetadata {
  key: string;
  value: string;
}

export class AssetRegistryService {
  private contract: ethers.Contract;
  private signer: ethers.Signer;

  constructor(contractAddress: string, signer: ethers.Signer) {
    this.contract = new ethers.Contract(contractAddress, ASSET_REGISTRY_ABI, signer);
    this.signer = signer;
  }

  /**
   * Step 1: Create Asset Type (one-time setup)
   */
  async createAssetType(
    name: string,
    assetType: 'satellite' | 'orbital_compute' | 'orbital_relay',
    requiredLeaseKeys: string[] = []
  ): Promise<ethers.ContractTransactionReceipt> {
    const assetTypeHash = ethers.keccak256(ethers.toUtf8Bytes(assetType));
    const keyHashes = requiredLeaseKeys.map(key => ethers.keccak256(ethers.toUtf8Bytes(key)));

    const metadata: [string, string][] = [
      [ethers.keccak256(ethers.toUtf8Bytes('name')), ethers.toUtf8Bytes(name)],
      [ethers.keccak256(ethers.toUtf8Bytes('created')), ethers.toUtf8Bytes(new Date().toISOString())]
    ];

    const tx = await this.contract.createAssetType(name, assetTypeHash, keyHashes, metadata);
    return await tx.wait();
  }

  /**
   * Step 2: Register Asset
   */
  async registerAsset(
    assetType: 'satellite' | 'orbital_compute' | 'orbital_relay',
    tokenName: string,
    tokenSymbol: string,
    totalSupply: string, // e.g., "1000000"
    metadata: Record<string, any>,
    admin?: string,
    upgrader?: string,
    tokenRecipient?: string
  ): Promise<{ assetId: bigint; tokenAddress: string; receipt: ethers.ContractTransactionReceipt }> {
    const assetTypeHash = ethers.keccak256(ethers.toUtf8Bytes(assetType));
    const supply = ethers.parseEther(totalSupply);

    // Convert metadata to onchain format
    const metadataArray = this.convertMetadataToOnchain(metadata);

    // Default addresses to caller if not provided
    const caller = await this.signer.getAddress();
    const adminAddress = admin || caller;
    const upgraderAddress = upgrader || caller;
    const recipientAddress = tokenRecipient || caller;

    const tx = await this.contract.registerAsset(
      assetTypeHash,
      tokenName,
      tokenSymbol,
      supply,
      adminAddress,
      upgraderAddress,
      recipientAddress,
      metadataArray
    );

    const receipt = await tx.wait();

    // Parse AssetRegistered event
    const event = receipt.logs
      .map((log: any) => {
        try {
          return this.contract.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((e: any) => e?.name === 'AssetRegistered');

    if (!event) {
      throw new Error('AssetRegistered event not found');
    }

    return {
      assetId: event.args.assetId,
      tokenAddress: event.args.tokenAddress,
      receipt
    };
  }

  /**
   * Convert JavaScript metadata to onchain format
   */
  private convertMetadataToOnchain(metadata: Record<string, any>): [string, string][] {
    const result: [string, string][] = [];

    const flatten = (obj: any, prefix = ''): void => {
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}_${key}` : key;

        if (value && typeof value === 'object' && !Array.isArray(value)) {
          flatten(value, fullKey);
        } else {
          const keyHash = ethers.keccak256(ethers.toUtf8Bytes(fullKey));
          const valueBytes = ethers.toUtf8Bytes(JSON.stringify(value));
          result.push([keyHash, valueBytes]);
        }
      }
    };

    flatten(metadata);
    return result;
  }

  /**
   * Get asset details
   */
  async getAsset(assetId: bigint) {
    return await this.contract.getAsset(assetId);
  }
}
```

**React Component Example:**

```typescript
// components/AssetRegistrationForm.tsx
'use client';

import { useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { AssetRegistryService } from '@/lib/contracts/assetRegistry';

export function AssetRegistrationForm() {
  const { signer } = useWallet();
  const [formData, setFormData] = useState({
    assetType: 'orbital_compute' as const,
    name: '',
    description: '',
    tokenName: '',
    tokenSymbol: '',
    totalSupply: '1000000',
    // Specifications
    cpuCores: 64,
    ramGb: 512,
    storageTb: 100
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ assetId: string; tokenAddress: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signer) return;

    setLoading(true);
    try {
      const service = new AssetRegistryService(
        process.env.NEXT_PUBLIC_ASSET_REGISTRY!,
        signer
      );

      // Create metadata object
      const metadata = {
        name: formData.name,
        description: formData.description,
        assetType: formData.assetType,
        specifications: {
          type: formData.assetType,
          compute: {
            cpu_cores: formData.cpuCores,
            ram_gb: formData.ramGb,
            storage_tb: formData.storageTb
          }
        },
        metadata: {
          createdAt: new Date().toISOString(),
          version: '1.0.0'
        }
      };

      const { assetId, tokenAddress } = await service.registerAsset(
        formData.assetType,
        formData.tokenName,
        formData.tokenSymbol,
        formData.totalSupply,
        metadata
      );

      setResult({
        assetId: assetId.toString(),
        tokenAddress
      });
    } catch (error) {
      console.error('Asset registration failed:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label>Asset Type</label>
        <select
          value={formData.assetType}
          onChange={(e) => setFormData({ ...formData, assetType: e.target.value as any })}
          className="w-full p-2 border rounded"
        >
          <option value="satellite">Satellite</option>
          <option value="orbital_compute">Orbital Compute Station</option>
          <option value="orbital_relay">Orbital Relay</option>
        </select>
      </div>

      <div>
        <label>Asset Name</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Orbital Compute Station Alpha"
          className="w-full p-2 border rounded"
          required
        />
      </div>

      <div>
        <label>Token Name</label>
        <input
          type="text"
          value={formData.tokenName}
          onChange={(e) => setFormData({ ...formData, tokenName: e.target.value })}
          placeholder="OCS Alpha Token"
          className="w-full p-2 border rounded"
          required
        />
      </div>

      <div>
        <label>Token Symbol</label>
        <input
          type="text"
          value={formData.tokenSymbol}
          onChange={(e) => setFormData({ ...formData, tokenSymbol: e.target.value })}
          placeholder="OCS-A"
          className="w-full p-2 border rounded"
          required
        />
      </div>

      <div>
        <label>Total Supply</label>
        <input
          type="number"
          value={formData.totalSupply}
          onChange={(e) => setFormData({ ...formData, totalSupply: e.target.value })}
          className="w-full p-2 border rounded"
          required
        />
      </div>

      <button
        type="submit"
        disabled={loading || !signer}
        className="w-full bg-blue-600 text-white p-3 rounded disabled:opacity-50"
      >
        {loading ? 'Registering...' : 'Register Asset'}
      </button>

      {result && (
        <div className="mt-4 p-4 bg-green-50 rounded">
          <p className="font-bold">Asset Registered!</p>
          <p>Asset ID: {result.assetId}</p>
          <p className="text-sm text-gray-600">Token: {result.tokenAddress}</p>
        </div>
      )}
    </form>
  );
}
```

---

### 2. Lease Offer Creation Workflow

**User Story:** Asset owner wants to offer their asset for lease with specific terms.

**Complete Code Example:**

```typescript
// lib/contracts/marketplace.ts
import { ethers } from 'ethers';

export const MARKETPLACE_ABI = [
  "function postLeaseOffer(tuple(uint64 deadline, bytes32 assetType, tuple(address lessor, address lessee, uint256 assetId, address paymentToken, uint256 rentAmount, uint256 rentPeriod, uint256 securityDeposit, uint64 startTime, uint64 endTime, bytes32 legalDocHash, uint16 termsVersion, tuple(bytes32 key, bytes value)[] metadata) lease) L) external returns (uint256 offerId)",
  "function placeLeaseBid(uint256 offerId, uint256 escrowAmount) external returns (uint256 bidIndex)",
  "function acceptLeaseBid(uint256 offerId, uint256 bidIndex) external returns (uint256 leaseId)",
  "event LeaseOfferPosted(uint256 indexed offerId, address indexed lessor, uint256 indexed assetId)",
  "event LeaseBidPlaced(uint256 indexed offerId, uint256 indexed bidIndex, address indexed bidder, uint256 escrowAmount)",
  "event LeaseBidAccepted(uint256 indexed offerId, uint256 indexed bidIndex, uint256 indexed leaseId)"
];

export interface LeaseTerms {
  rentAmount: string; // ETH formatted string
  rentPeriod: number; // seconds
  securityDeposit: string; // ETH formatted string
  startTime: number; // unix timestamp
  endTime: number; // unix timestamp
}

export class MarketplaceService {
  private contract: ethers.Contract;
  private signer: ethers.Signer;

  constructor(contractAddress: string, signer: ethers.Signer) {
    this.contract = new ethers.Contract(contractAddress, MARKETPLACE_ABI, signer);
    this.signer = signer;
  }

  async postLeaseOffer(
    assetId: bigint,
    assetType: 'satellite' | 'orbital_compute' | 'orbital_relay',
    terms: LeaseTerms,
    paymentTokenAddress: string, // MockStablecoin address
    lessee: string = ethers.ZeroAddress // ZeroAddress = open to anyone
  ): Promise<{ offerId: bigint; receipt: ethers.ContractTransactionReceipt }> {
    const lessor = await this.signer.getAddress();

    const leaseIntent = {
      deadline: Math.floor(Date.now() / 1000) + 86400, // 24 hours
      assetType: ethers.keccak256(ethers.toUtf8Bytes(assetType)),
      lease: {
        lessor,
        lessee,
        assetId,
        paymentToken: paymentTokenAddress,
        rentAmount: ethers.parseEther(terms.rentAmount),
        rentPeriod: BigInt(terms.rentPeriod),
        securityDeposit: ethers.parseEther(terms.securityDeposit),
        startTime: terms.startTime,
        endTime: terms.endTime,
        legalDocHash: ethers.keccak256(ethers.toUtf8Bytes('legal-doc-v1')),
        termsVersion: 1,
        metadata: []
      }
    };

    const tx = await this.contract.postLeaseOffer(leaseIntent);
    const receipt = await tx.wait();

    const event = receipt.logs
      .map((log: any) => {
        try {
          return this.contract.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((e: any) => e?.name === 'LeaseOfferPosted');

    return {
      offerId: event?.args.offerId || 0n,
      receipt
    };
  }
}
```

**React Component:**

```typescript
// components/CreateLeaseOfferForm.tsx
'use client';

import { useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { MarketplaceService } from '@/lib/contracts/marketplace';

export function CreateLeaseOfferForm({ assetId }: { assetId: bigint }) {
  const { signer } = useWallet();
  const [formData, setFormData] = useState({
    rentAmount: '1000', // USDC per period
    rentPeriod: 30 * 24 * 60 * 60, // 30 days in seconds
    securityDeposit: '5000', // USDC
    duration: 365 // days
  });
  const [loading, setLoading] = useState(false);
  const [offerId, setOfferId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signer) return;

    setLoading(true);
    try {
      const service = new MarketplaceService(
        process.env.NEXT_PUBLIC_MARKETPLACE!,
        signer
      );

      const now = Math.floor(Date.now() / 1000);
      const endTime = now + (formData.duration * 24 * 60 * 60);

      const { offerId } = await service.postLeaseOffer(
        assetId,
        'orbital_compute',
        {
          rentAmount: formData.rentAmount,
          rentPeriod: formData.rentPeriod,
          securityDeposit: formData.securityDeposit,
          startTime: now,
          endTime
        },
        process.env.NEXT_PUBLIC_STABLECOIN!
      );

      setOfferId(offerId.toString());
    } catch (error) {
      console.error('Failed to create lease offer:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-bold">Create Lease Offer</h2>

      <div>
        <label>Rent Amount (USDC per period)</label>
        <input
          type="number"
          value={formData.rentAmount}
          onChange={(e) => setFormData({ ...formData, rentAmount: e.target.value })}
          className="w-full p-2 border rounded"
          required
        />
      </div>

      <div>
        <label>Security Deposit (USDC)</label>
        <input
          type="number"
          value={formData.securityDeposit}
          onChange={(e) => setFormData({ ...formData, securityDeposit: e.target.value })}
          className="w-full p-2 border rounded"
          required
        />
      </div>

      <div>
        <label>Lease Duration (days)</label>
        <input
          type="number"
          value={formData.duration}
          onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
          className="w-full p-2 border rounded"
          required
        />
      </div>

      <button
        type="submit"
        disabled={loading || !signer}
        className="w-full bg-blue-600 text-white p-3 rounded disabled:opacity-50"
      >
        {loading ? 'Creating Offer...' : 'Create Lease Offer'}
      </button>

      {offerId && (
        <div className="mt-4 p-4 bg-green-50 rounded">
          <p className="font-bold">Lease Offer Created!</p>
          <p>Offer ID: {offerId}</p>
        </div>
      )}
    </form>
  );
}
```

---

### 3. Marketplace Bidding Workflow (EIP-712 Signatures)

**User Story:** Bidders compete for lease opportunities using wallet signatures; lessor accepts the winning bid.

**Critical Implementation Detail:** This workflow uses **manual EIP-712 encoding** to match Solidity's `abi.encode()` behavior. Ethers.js `TypedDataEncoder` handles nested structs differently than Solidity, so we must manually construct struct hashes.

#### Step 1: Manual EIP-712 Encoding Utilities

```typescript
// lib/utils/eip712.ts
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
    return await provider.send('eth_sign', [address, digest]);
  }
}
```

#### Step 2: Marketplace Bidding Service

```typescript
// lib/contracts/marketplace.ts
import { ethers } from 'ethers';
import { signLeaseIntent, type LeaseIntentData } from '../utils/eip712';

export const MARKETPLACE_ABI = [
  "function leaseOffers(uint256 offerId) external view returns (tuple(address lessor, tuple(uint64 deadline, bytes32 assetType, tuple(address lessor, address lessee, uint256 assetId, address paymentToken, uint256 rentAmount, uint256 rentPeriod, uint256 securityDeposit, uint64 startTime, uint64 endTime, bytes32 legalDocHash, uint16 termsVersion) lease) terms) offer)",
  "function placeLeaseBid(uint256 offerId, bytes calldata sigLessee, uint256 funds) external returns (uint256 bidIndex)",
  "function acceptLeaseBid(uint256 offerId, uint256 bidIndex, bytes calldata sigLessor) external returns (uint256 leaseTokenId)",
  "function leaseBids(uint256 offerId, uint256 bidIndex) external view returns (tuple(address bidder, uint256 funds, bytes sigLessee, bool active))",
  "event LeaseBidPlaced(uint256 indexed offerId, uint256 indexed bidIndex, address indexed bidder, uint256 funds)",
  "event LeaseAccepted(uint256 indexed offerId, uint256 indexed bidIndex, address bidder, uint256 leaseTokenId)"
];

export class MarketplaceService {
  private marketplace: ethers.Contract;
  private stablecoin: ethers.Contract;
  private signer: ethers.Signer;
  private leaseFactoryAddress: string;
  private chainId: number;

  constructor(
    marketplaceAddress: string,
    stablecoinAddress: string,
    leaseFactoryAddress: string,
    signer: ethers.Signer,
    chainId: number
  ) {
    this.marketplace = new ethers.Contract(marketplaceAddress, MARKETPLACE_ABI, signer);
    this.stablecoin = new ethers.Contract(
      stablecoinAddress,
      ['function approve(address spender, uint256 amount) external returns (bool)'],
      signer
    );
    this.signer = signer;
    this.leaseFactoryAddress = leaseFactoryAddress;
    this.chainId = chainId;
  }

  /**
   * Place a bid on a lease offer
   *
   * This method:
   * 1. Fetches offer terms from marketplace
   * 2. Generates bidder's EIP-712 signature
   * 3. Approves USDC escrow
   * 4. Submits bid with signature
   *
   * @param offerId - The offer ID to bid on
   * @param escrowAmount - Amount of USDC to escrow (e.g., "6000" for 6000 USDC)
   * @returns Bid index and transaction details
   */
  async placeBid(
    offerId: string,
    escrowAmount: string
  ): Promise<{ bidIndex: number; txHash: string; signature: string }> {
    // Step 1: Fetch offer terms
    const offer = await this.marketplace.leaseOffers(offerId);
    const bidderAddress = await this.signer.getAddress();

    // Step 2: Build LeaseIntent with bidder as lessee
    const leaseIntent: LeaseIntentData = {
      deadline: offer.terms.deadline,
      assetTypeSchemaHash: offer.terms.assetType,
      lease: {
        lessor: offer.lessor,
        lessee: bidderAddress, // Bidder becomes lessee
        assetId: offer.terms.lease.assetId,
        paymentToken: offer.terms.lease.paymentToken,
        rentAmount: offer.terms.lease.rentAmount,
        rentPeriod: offer.terms.lease.rentPeriod,
        securityDeposit: offer.terms.lease.securityDeposit,
        startTime: offer.terms.lease.startTime,
        endTime: offer.terms.lease.endTime,
        legalDocHash: offer.terms.lease.legalDocHash,
        termsVersion: offer.terms.lease.termsVersion
      }
    };

    // Step 3: Generate EIP-712 signature
    const signature = await signLeaseIntent(
      this.signer,
      leaseIntent,
      this.leaseFactoryAddress,
      this.chainId
    );

    // Step 4: Approve USDC escrow
    const escrowWei = ethers.parseUnits(escrowAmount, 6); // USDC has 6 decimals
    const approveTx = await this.stablecoin.approve(
      await this.marketplace.getAddress(),
      escrowWei
    );
    await approveTx.wait();

    // Step 5: Place bid
    const bidTx = await this.marketplace.placeLeaseBid(offerId, signature, escrowWei);
    const receipt = await bidTx.wait();

    // Parse bid index from event
    const bidEvent = receipt.logs.find((log: any) => {
      try {
        const parsed = this.marketplace.interface.parseLog(log);
        return parsed?.name === 'LeaseBidPlaced';
      } catch {
        return false;
      }
    });

    let bidIndex = 0;
    if (bidEvent) {
      const parsed = this.marketplace.interface.parseLog(bidEvent);
      bidIndex = Number(parsed?.args?.bidIndex ?? 0);
    }

    return {
      bidIndex,
      txHash: receipt.hash,
      signature
    };
  }

  /**
   * Accept a bid (lessor only)
   *
   * This method:
   * 1. Fetches offer terms
   * 2. Generates lessor's EIP-712 signature
   * 3. Calls acceptLeaseBid which:
   *    - Mints lease NFT to lessee
   *    - Distributes escrow to token holders
   *    - Refunds losing bids
   *
   * @param offerId - The offer ID
   * @param bidIndex - Index of bid to accept
   * @returns Lease NFT token ID and transaction details
   */
  async acceptBid(
    offerId: string,
    bidIndex: number
  ): Promise<{ leaseTokenId: string; txHash: string; lessee: string }> {
    // Step 1: Fetch offer and bid details
    const offer = await this.marketplace.leaseOffers(offerId);
    const bid = await this.marketplace.leaseBids(offerId, bidIndex);

    // Step 2: Build LeaseIntent with bid's lessee
    const leaseIntent: LeaseIntentData = {
      deadline: offer.terms.deadline,
      assetTypeSchemaHash: offer.terms.assetType,
      lease: {
        lessor: offer.lessor,
        lessee: bid.bidder, // Use bidder's address as lessee
        assetId: offer.terms.lease.assetId,
        paymentToken: offer.terms.lease.paymentToken,
        rentAmount: offer.terms.lease.rentAmount,
        rentPeriod: offer.terms.lease.rentPeriod,
        securityDeposit: offer.terms.lease.securityDeposit,
        startTime: offer.terms.lease.startTime,
        endTime: offer.terms.lease.endTime,
        legalDocHash: offer.terms.lease.legalDocHash,
        termsVersion: offer.terms.lease.termsVersion
      }
    };

    // Step 3: Generate lessor's EIP-712 signature
    const signature = await signLeaseIntent(
      this.signer,
      leaseIntent,
      this.leaseFactoryAddress,
      this.chainId
    );

    // Step 4: Accept bid
    const acceptTx = await this.marketplace.acceptLeaseBid(offerId, bidIndex, signature);
    const receipt = await acceptTx.wait();

    // Parse lease token ID from event
    const leaseEvent = receipt.logs.find((log: any) => {
      try {
        const parsed = this.marketplace.interface.parseLog(log);
        return parsed?.name === 'LeaseAccepted';
      } catch {
        return false;
      }
    });

    let leaseTokenId = '0';
    let lessee = ethers.ZeroAddress;
    if (leaseEvent) {
      const parsed = this.marketplace.interface.parseLog(leaseEvent);
      leaseTokenId = (parsed?.args?.leaseTokenId ?? 0n).toString();
      lessee = parsed?.args?.bidder ?? ethers.ZeroAddress;
    }

    return {
      leaseTokenId,
      txHash: receipt.hash,
      lessee
    };
  }

  /**
   * Get all bids for an offer
   */
  async getBids(offerId: string): Promise<Array<{
    bidder: string;
    funds: string;
    active: boolean;
  }>> {
    const bids = [];
    let index = 0;

    try {
      while (true) {
        const bid = await this.marketplace.leaseBids(offerId, index);
        if (bid.bidder === ethers.ZeroAddress) break;

        bids.push({
          bidder: bid.bidder,
          funds: ethers.formatUnits(bid.funds, 6),
          active: bid.active
        });
        index++;
      }
    } catch {
      // No more bids
    }

    return bids;
  }
}
```

#### Step 3: Frontend Components

**Bidding Component:**

```typescript
// components/BidForm.tsx
import { useState } from 'react';
import { MarketplaceService } from '@/lib/contracts/marketplace';
import { ethers } from 'ethers';

export function BidForm({ offerId }: { offerId: string }) {
  const [escrowAmount, setEscrowAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePlaceBid = async () => {
    setLoading(true);
    try {
      // Get signer from MetaMask/wallet
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const network = await provider.getNetwork();

      const service = new MarketplaceService(
        process.env.NEXT_PUBLIC_MARKETPLACE!,
        process.env.NEXT_PUBLIC_STABLECOIN!,
        process.env.NEXT_PUBLIC_LEASE_FACTORY!,
        signer,
        Number(network.chainId)
      );

      const result = await service.placeBid(offerId, escrowAmount);

      alert(`Bid placed! Index: ${result.bidIndex}\nTx: ${result.txHash}`);
    } catch (error) {
      console.error('Bid failed:', error);
      alert('Bid failed: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bid-form">
      <h3>Place Your Bid</h3>
      <input
        type="number"
        placeholder="Escrow amount (USDC)"
        value={escrowAmount}
        onChange={(e) => setEscrowAmount(e.target.value)}
      />
      <button onClick={handlePlaceBid} disabled={loading || !escrowAmount}>
        {loading ? 'Placing Bid...' : 'Place Bid'}
      </button>
    </div>
  );
}
```

**Accept Bid Component (Lessor Only):**

```typescript
// components/AcceptBidButton.tsx
import { useState } from 'react';
import { MarketplaceService } from '@/lib/contracts/marketplace';
import { ethers } from 'ethers';

export function AcceptBidButton({
  offerId,
  bidIndex
}: {
  offerId: string;
  bidIndex: number;
}) {
  const [loading, setLoading] = useState(false);

  const handleAcceptBid = async () => {
    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const network = await provider.getNetwork();

      const service = new MarketplaceService(
        process.env.NEXT_PUBLIC_MARKETPLACE!,
        process.env.NEXT_PUBLIC_STABLECOIN!,
        process.env.NEXT_PUBLIC_LEASE_FACTORY!,
        signer,
        Number(network.chainId)
      );

      const result = await service.acceptBid(offerId, bidIndex);

      alert(
        `Bid accepted!\nLease NFT: ${result.leaseTokenId}\nLessee: ${result.lessee}\nTx: ${result.txHash}`
      );
    } catch (error) {
      console.error('Accept failed:', error);
      alert('Accept failed: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleAcceptBid} disabled={loading}>
      {loading ? 'Accepting...' : 'Accept Bid'}
    </button>
  );
}
```

#### Critical Implementation Notes

1. **EIP-712 Encoding:** Must use manual encoding - ethers.js `TypedDataEncoder` will generate incorrect signatures for nested structs
2. **USDC Decimals:** MockStablecoin uses 6 decimals, not 18 - use `parseUnits(amount, 6)`
3. **Nonce Management:** Browser wallets handle nonces automatically, but for batch transactions you may need `{ nonce: await signer.getNonce('latest') }`
4. **Signature Verification:** Test signatures using the LeaseFactory's `hashLeaseIntent()` function to verify digest matches

---

### 4. Revenue Claims Workflow

**User Story:** Token holders want to claim their share of rental revenue.

```typescript
// lib/contracts/revenueService.ts
import { ethers } from 'ethers';
import { MARKETPLACE_ABI } from './marketplace';

export class RevenueService {
  private contract: ethers.Contract;
  private signer: ethers.Signer;

  constructor(marketplaceAddress: string, signer: ethers.Signer) {
    this.contract = new ethers.Contract(marketplaceAddress, MARKETPLACE_ABI, signer);
    this.signer = signer;
  }

  /**
   * Get claimable revenue for connected wallet
   */
  async getClaimableAmount(): Promise<string> {
    const address = await this.signer.getAddress();
    const amount = await this.contract.claims(address);
    return ethers.formatEther(amount);
  }

  /**
   * Claim all available revenue
   */
  async claimRevenue(): Promise<{ amount: string; receipt: ethers.ContractTransactionReceipt }> {
    const tx = await this.contract.claimRevenue();
    const receipt = await tx.wait();

    const event = receipt.logs
      .map((log: any) => {
        try {
          return this.contract.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((e: any) => e?.name === 'RevenueClaimed');

    return {
      amount: event ? ethers.formatEther(event.args.share) : '0',
      receipt
    };
  }
}
```

---

### 5. X402 Streaming Payments Workflow

**User Story:** Lessee wants to access leased compute resources using per-second micropayments.

**Steps:**
1. Lessee initiates access request
2. Server responds with 402 Payment Required + payment details
3. Lessee includes payment header with signed proof
4. Server verifies payment and grants access
5. Repeat every second for continuous streaming access

**Frontend Components Needed:**
- Payment stream status indicator
- Real-time usage meter
- Balance display and top-up
- Connection status and latency monitor

**Complete Code Example:**

```typescript
// lib/x402/streamingPayment.ts
import { ethers } from 'ethers';

export interface X402PaymentRequirements {
  scheme: 'exact' | 'max';
  network: string;  // 'base-sepolia' | 'base-mainnet'
  asset: string;  // USDC contract address
  maxAmountRequired: string;  // Amount in minor units (6 decimals for USDC)
  payTo: string;  // Lessor address
  resource: string;  // API endpoint
  description: string;
  extra: {
    decimals: number;
    verifyOptimistically: boolean;
    paymentMode: 'second' | 'batch-5s';
  };
}

export interface X402PaymentHeader {
  payer: string;
  amount: string;
  txHash: string;
  issuedAt: string;
}

export class X402StreamingClient {
  private apiBase: string;
  private payer: string;
  private active: boolean = false;
  private intervalId?: NodeJS.Timeout;

  constructor(apiBase: string, payerAddress: string) {
    this.apiBase = apiBase;
    this.payer = payerAddress;
  }

  /**
   * Start streaming payments for lease access
   */
  async startStream(
    leaseId: string,
    mode: 'second' | 'batch-5s' = 'second',
    onPayment?: (amount: string, tx: string) => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    if (this.active) {
      throw new Error('Stream already active');
    }

    this.active = true;
    const intervalMs = mode === 'second' ? 1000 : 5000;

    this.intervalId = setInterval(async () => {
      try {
        await this.makePayment(leaseId, mode, onPayment);
      } catch (error) {
        console.error('Payment error:', error);
        if (onError) {
          onError(error instanceof Error ? error : new Error('Payment failed'));
        }
      }
    }, intervalMs);

    console.log(`X402 stream started: ${mode} mode (${intervalMs}ms interval)`);
  }

  /**
   * Stop streaming payments
   */
  stopStream(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    this.active = false;
    console.log('X402 stream stopped');
  }

  /**
   * Make single payment
   */
  private async makePayment(
    leaseId: string,
    mode: 'second' | 'batch-5s',
    onPayment?: (amount: string, tx: string) => void
  ): Promise<void> {
    const accessUrl = `${this.apiBase}/api/leases/${leaseId}/access?mode=${mode}`;

    // Step 1: Request access (triggers 402)
    const unpaidResponse = await fetch(accessUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (unpaidResponse.status !== 402) {
      console.warn('Unexpected status:', unpaidResponse.status);
      return;
    }

    const unpaidBody = await unpaidResponse.json();
    const requirements: X402PaymentRequirements = unpaidBody.paymentRequirements;

    // Step 2: Create payment header
    const paymentHeader = this.encodePaymentHeader({
      payer: this.payer,
      amount: requirements.maxAmountRequired,
      txHash: `0x${this.generateMockTxHash()}`, // In production, use real tx hash
      issuedAt: new Date().toISOString()
    });

    // Step 3: Retry with payment
    const paidResponse = await fetch(accessUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-PAYMENT': paymentHeader
      }
    });

    if (!paidResponse.ok) {
      throw new Error(`Payment failed: ${paidResponse.statusText}`);
    }

    const paidBody = await paidResponse.json();

    // Notify callback
    if (onPayment) {
      onPayment(
        this.formatAmount(requirements.maxAmountRequired),
        paidBody.txHash
      );
    }
  }

  /**
   * Encode payment header (Base64)
   */
  private encodePaymentHeader(payment: X402PaymentHeader): string {
    const json = JSON.stringify(payment);
    return Buffer.from(json, 'utf-8').toString('base64');
  }

  /**
   * Format USDC amount from minor units
   */
  private formatAmount(minorUnits: string): string {
    const amount = parseFloat(minorUnits) / 1_000_000;
    return amount.toFixed(6);
  }

  /**
   * Generate mock transaction hash (for testing)
   * In production, use actual on-chain transaction
   */
  private generateMockTxHash(): string {
    return Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
  }

  isActive(): boolean {
    return this.active;
  }
}
```

**React Component:**

```typescript
// components/StreamingPaymentPanel.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { X402StreamingClient } from '@/lib/x402/streamingPayment';

interface PaymentLog {
  timestamp: string;
  amount: string;
  txHash: string;
}

export function StreamingPaymentPanel({ leaseId }: { leaseId: string }) {
  const { address } = useWallet();
  const [active, setActive] = useState(false);
  const [mode, setMode] = useState<'second' | 'batch-5s'>('second');
  const [paymentLogs, setPaymentLogs] = useState<PaymentLog[]>([]);
  const [totalPaid, setTotalPaid] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const clientRef = useRef<X402StreamingClient | null>(null);

  useEffect(() => {
    if (!address) return;

    clientRef.current = new X402StreamingClient(
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
      address
    );

    return () => {
      if (clientRef.current) {
        clientRef.current.stopStream();
      }
    };
  }, [address]);

  const handleStart = async () => {
    if (!clientRef.current || !address) return;

    setError(null);
    setActive(true);

    try {
      await clientRef.current.startStream(
        leaseId,
        mode,
        (amount, txHash) => {
          // On successful payment
          const log: PaymentLog = {
            timestamp: new Date().toISOString(),
            amount,
            txHash
          };
          setPaymentLogs((prev) => [log, ...prev].slice(0, 100)); // Keep last 100
          setTotalPaid((prev) => prev + parseFloat(amount));
        },
        (err) => {
          // On error
          setError(err.message);
          setActive(false);
        }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start stream');
      setActive(false);
    }
  };

  const handleStop = () => {
    if (clientRef.current) {
      clientRef.current.stopStream();
      setActive(false);
    }
  };

  return (
    <div className="border rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">X402 Streaming Payments</h3>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${active ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
          <span className="text-sm text-gray-600">
            {active ? 'Streaming' : 'Inactive'}
          </span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50 rounded p-4">
          <div className="text-sm text-gray-600">Total Paid</div>
          <div className="text-2xl font-bold">{totalPaid.toFixed(6)} USDC</div>
        </div>
        <div className="bg-purple-50 rounded p-4">
          <div className="text-sm text-gray-600">Payments Made</div>
          <div className="text-2xl font-bold">{paymentLogs.length}</div>
        </div>
      </div>

      <div className="flex gap-4">
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as 'second' | 'batch-5s')}
          disabled={active}
          className="px-4 py-2 border rounded"
        >
          <option value="second">Per-Second (1Hz)</option>
          <option value="batch-5s">Batch 5-Second (0.2Hz)</option>
        </select>

        <button
          onClick={active ? handleStop : handleStart}
          disabled={!address}
          className={`flex-1 px-6 py-2 rounded font-medium ${
            active
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-green-600 text-white hover:bg-green-700'
          } disabled:opacity-50`}
        >
          {active ? 'Stop Stream' : 'Start Stream'}
        </button>
      </div>

      <div className="border-t pt-4">
        <h4 className="font-medium mb-2">Recent Payments</h4>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {paymentLogs.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              No payments yet
            </div>
          ) : (
            paymentLogs.map((log, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-sm bg-gray-50 rounded p-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span className="text-gray-600">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="font-mono font-medium">{log.amount} USDC</div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm">
        <p className="font-medium text-yellow-900">How it works:</p>
        <ul className="list-disc list-inside text-yellow-800 space-y-1 mt-2">
          <li>Each payment grants {mode === 'second' ? '1 second' : '5 seconds'} of access</li>
          <li>Server responds with 402 Payment Required</li>
          <li>Client includes X-PAYMENT header with proof</li>
          <li>Server verifies and grants access</li>
          <li>Automatic streaming for continuous usage</li>
        </ul>
      </div>
    </div>
  );
}
```

**API Server X402 Endpoint (Already Implemented):**

```
POST /api/leases/:leaseId/access?mode=second
Headers: X-PAYMENT (optional)

Response (402 Payment Required):
{
  "success": false,
  "error": "Payment required",
  "paymentRequirements": {
    "scheme": "exact",
    "network": "base-sepolia",
    "asset": "0x833589fCD6eDb6E08f4c7C32D4f71b54bda02913",
    "maxAmountRequired": "277",
    "payTo": "0x...",
    "resource": "/api/leases/1/access"
  }
}

Response (200 OK with payment):
{
  "success": true,
  "txHash": "0x...",
  "access": "granted"
}
```

---

## Database Schema

For offchain metadata storage (PostgreSQL):

```sql
-- Assets table
CREATE TABLE assets (
  asset_id BIGINT PRIMARY KEY,
  chain_id INTEGER NOT NULL,
  token_address TEXT NOT NULL,
  asset_type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  specifications JSONB NOT NULL,
  creator_address TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Leases table
CREATE TABLE leases (
  lease_id BIGINT PRIMARY KEY,
  asset_id BIGINT REFERENCES assets(asset_id),
  lessor_address TEXT NOT NULL,
  lessee_address TEXT NOT NULL,
  rent_amount TEXT NOT NULL,
  rent_period BIGINT NOT NULL,
  security_deposit TEXT NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  status TEXT NOT NULL, -- 'pending', 'active', 'completed', 'terminated'
  transaction_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Revenue claims table
CREATE TABLE revenue_claims (
  id SERIAL PRIMARY KEY,
  claimer_address TEXT NOT NULL,
  amount TEXT NOT NULL,
  transaction_hash TEXT NOT NULL,
  claimed_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_assets_type ON assets(asset_type);
CREATE INDEX idx_assets_creator ON assets(creator_address);
CREATE INDEX idx_leases_asset ON leases(asset_id);
CREATE INDEX idx_leases_status ON leases(status);
CREATE INDEX idx_revenue_claimer ON revenue_claims(claimer_address);
```

---

## Environment Setup Guide

### Local Development Stack

```bash
# 1. Clone repository
git clone <repo-url>
cd Asset-Leasing-Protocol

# 2. Install dependencies
npm install
cd test/offchain && npm install

# 3. Terminal 1: Start Anvil
anvil --port 8545 --host 127.0.0.1

# 4. Terminal 2: Deploy contracts
cd test/offchain
npm run demo

# 5. Save contract addresses from output
# Copy addresses to your .env.local

# 6. Terminal 3: Start frontend
cd ../../frontend  # your frontend directory
npm run dev
```

### Wallet Configuration

```typescript
// hooks/useWallet.ts
import { ethers } from 'ethers';
import { useState, useEffect } from 'react';

export function useWallet() {
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    connectWallet();
  }, []);

  const connectWallet = async () => {
    // For local development, use Anvil default account
    const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');

    // Anvil default private key (account #0)
    const privateKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
    const wallet = new ethers.Wallet(privateKey, provider);

    setSigner(wallet);
    setAddress(await wallet.getAddress());
  };

  return { signer, address, connectWallet };
}
```

---

## Testing Checklist

### Manual Testing Workflows

**Asset Registration:**
- [ ] Create asset type (satellite, orbital_compute, orbital_relay)
- [ ] Register asset with metadata
- [ ] Verify AssetERC20 token deployment
- [ ] Check token balance (should equal totalSupply)
- [ ] View asset in database

**Lease Management:**
- [ ] Create lease offer for registered asset
- [ ] View lease offer details
- [ ] Place bid on lease offer (as different user)
- [ ] Accept bid and mint lease NFT
- [ ] Verify lease status changes

**Revenue Claims:**
- [ ] Check claimable amount (initially 0)
- [ ] Complete a lease payment cycle
- [ ] Claim revenue
- [ ] Verify balance increase

---

## Common Patterns

### Transaction Status Monitoring

```typescript
async function handleTransaction(txPromise: Promise<ethers.ContractTransactionResponse>) {
  try {
    const tx = await txPromise;
    console.log('Transaction submitted:', tx.hash);

    const receipt = await tx.wait();
    console.log('Transaction confirmed:', receipt.hash);

    return receipt;
  } catch (error) {
    if (error.code === 'ACTION_REJECTED') {
      throw new Error('User rejected transaction');
    }
    throw error;
  }
}
```

### Event Listening

```typescript
// Listen for AssetRegistered events
const assetRegistry = new ethers.Contract(address, ABI, provider);

assetRegistry.on('AssetRegistered', (assetId, assetType, tokenAddress, creator) => {
  console.log('New asset registered:', {
    assetId: assetId.toString(),
    tokenAddress,
    creator
  });
});
```

---

## Contract ABIs Location

All contract ABIs are available at:
```
/Users/shaunmartinak/Documents/SoftwareProjects/Asset-Leasing-Protocol/out/
```

Key files:
- `AssetRegistry.sol/AssetRegistry.json`
- `LeaseFactory.sol/LeaseFactory.json`
- `Marketplace.sol/Marketplace.json`
- `AssetERC20.sol/AssetERC20.json`
- `MockStablecoin.sol/MockStablecoin.json`

---

## Success Metrics

**Working Beta Environment Should Have:**
- ✅ Asset registration with proper metadata
- ✅ Lease offer creation with all terms
- ✅ Bidding and acceptance flow
- ✅ Revenue claim functionality
- ✅ Real-time transaction status
- ✅ Error handling and user feedback
- ✅ Local database persistence
- ✅ Event listening for updates

---

## Support & Next Steps

For production deployment:
1. Replace Anvil with testnet (Sepolia/Goerli)
2. Add MetaMask wallet connection
3. Implement proper authentication
4. Add transaction history
5. Build admin dashboard
6. Add automated testing

**The protocol is production-ready at the contract level. Frontend integration is straightforward using the patterns shown above.**
