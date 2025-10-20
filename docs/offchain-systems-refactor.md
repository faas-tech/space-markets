# Offchain Systems Refactor Plan
## Asset Leasing Protocol - Post-Refactor Integration

**Created:** 2025-10-12
**Updated:** 2025-10-12
**Status:** Implementation Phase - In Progress
**Purpose:** Align offchain systems with refactored onchain protocol

---

## Agent Consultation Results

**web2-builder Agent Review:** ✅ APPROVED WITH IMPROVEMENTS
- **Key Recommendation**: Use Viem instead of ethers.js for superior type safety
- **Architecture**: Approved with enhancements for event processing and error handling
- **Critical Additions**: Reorg protection, retry logic, health monitoring
- See detailed recommendations in implementation sections below

---

## Executive Summary

This document provides a comprehensive plan to update the offchain systems (located in `test/offchain/`) to work with the **refactored** Asset Leasing Protocol smart contracts. The refactored protocol introduces significant architectural changes that require corresponding updates to offchain code, data structures, and integration patterns.

### Critical Changes in Refactored Protocol

1. **MetadataStorage Base Contract**: All contracts now inherit from `MetadataStorage` for flexible key-value storage
2. **No ERC20Votes/Snapshots**: Removed ERC20Votes dependency; direct holder enumeration instead
3. **Simplified Asset Types**: Three core types (satellite, orbital_compute, orbital_relay) vs. previous generic approach
4. **Schema-Based Asset Creation**: Two-step process (create type schema → register instance)
5. **Deterministic Hash Generation**: Consistent keccak256-based hashing for schemas and metadata
6. **Constructor Access Control Pattern**: Internal `_setMetadata()` for constructor initialization

### Offchain System Status

**Current State:**
- ✅ TypeScript types and Zod schemas defined
- ✅ JSON test data for all three asset types
- ✅ Validation utilities and crypto helpers
- ✅ Mock testing framework structure
- ⚠️ Written for **OLD** protocol (ERC20Votes, different event structure)
- ⚠️ API endpoints don't match new contract interface
- ⚠️ Event listener expects deprecated event signatures

**Goal State:**
- Full compatibility with refactored smart contracts
- End-to-end Anvil local deployment workflow
- Automated integration testing suite
- Clear documentation and examples

---

## Part 1: Protocol Changes Analysis

### 1.1 Smart Contract Architecture Changes

#### AssetRegistry Changes

**Before (Old Protocol):**
```solidity
function registerAsset(
    uint256 assetTypeId,
    string assetId,
    string metadataHash,
    string metadataURI
) external returns (uint256)
```

**After (Refactored Protocol):**
```solidity
// Step 1: Create asset type
function createAsset(
    string calldata name,
    bytes32 schemaHash,
    bytes32[] calldata requiredLeaseKeys,
    Metadata[] calldata metadata
) external onlyRole(DEFAULT_ADMIN_ROLE)

// Step 2: Register instance
function registerAsset(
    bytes32 schemaHash,
    string calldata tokenName,
    string calldata tokenSymbol,
    uint256 totalSupply,
    address admin,
    address tokenRecipient,
    Metadata[] calldata metadata
) external onlyRole(REGISTRAR_ROLE) returns (uint256 newAssetId, address tokenAddress)
```

**Key Differences:**
- Asset types are now identified by `bytes32 schemaHash` (keccak256) instead of numeric IDs
- Metadata passed as structured `Metadata[]` array with key-value pairs
- Two-step registration: type creation → instance registration
- Returns both `assetId` and `tokenAddress`
- No metadata URI concept (pure onchain key-value storage)

#### AssetERC20 Changes

**Before (Old Protocol):**
- Inherited from ERC20Votes
- Used snapshots for holder tracking
- Complex checkpoint system

**After (Refactored Protocol):**
```solidity
contract AssetERC20 is ERC20, AccessControl, MetadataStorage {
    // Direct holder enumeration via EnumerableSet
    using EnumerableSet for EnumerableSet.AddressSet;
    EnumerableSet.AddressSet private _holders;

    function getHolders() external view returns (address[] memory)
    function getHolderCount() external view returns (uint256)
}
```

**Key Differences:**
- No ERC20Votes inheritance (no checkpoints, no snapshots, no delegation)
- Direct holder tracking in EnumerableSet
- Metadata stored per asset via inherited MetadataStorage
- Constructor uses internal `_setMetadata()` to bypass access control during initialization

#### Event Signature Changes

**Old Protocol Events:**
```solidity
event AssetRegistered(uint256 indexed assetId, address indexed owner, string metadataHash);
event AssetTokenDeployed(uint256 indexed assetId, address indexed tokenAddress);
```

**New Protocol Events:**
```solidity
event AssetTypeCreated(string indexed name, bytes32 indexed schemaHash, bytes32[] requiredLeaseKeys);
event AssetRegistered(uint256 indexed assetId, bytes32 indexed schemaHash, address tokenAddress);
```

**Impact:** Event listeners must be completely rewritten to handle new signatures.

### 1.2 Metadata Storage Changes

**Old Approach:**
- Metadata stored as JSON string hashes
- Offchain references via IPFS/HTTP URIs
- Single monolithic metadata object

**New Approach:**
```solidity
struct Metadata {
    string key;
    string value;
}

mapping(bytes32 => mapping(string => string)) private _metadata;
mapping(bytes32 => string[]) private _metadataKeys;
```

**Implications for Offchain:**
- Must convert JSON objects to key-value pairs for onchain storage
- Need bidirectional mapping: JSON ↔ Metadata[] array
- Metadata queries now use `getMetadata(hash, key)` pattern
- Must track metadata keys separately for enumeration

### 1.3 Revenue Distribution Changes

**Old Protocol:**
```typescript
async getTokenHolders(tokenAddress: string, snapshotId: string): Promise<TokenHolder[]> {
  const balance = await token.balanceOfAt(from, snapshotId);
}
```

**New Protocol:**
```solidity
function getHolders() external view returns (address[] memory)
function balanceOf(address holder) external view returns (uint256)
```

**Impact:**
- No snapshot ID concept
- Must query current holders and current balances
- Revenue distribution calculated at execution time, not historical snapshot
- Simpler but less flexible revenue tracking

---

## Part 2: Required Offchain Updates

### 2.1 Type Definitions (`test/offchain/src/types/index.ts`)

**Status:** ✅ Already aligned with refactored protocol

The TypeScript types in the offchain system already match the new protocol structure:
- Three specific asset types (satellite, orbital_compute, orbital_relay)
- Detailed specification interfaces
- Asset-specific lease terms

**Required Actions:** **NONE** - Types are correct

### 2.2 Validation Schemas (`test/offchain/src/schemas/index.ts`)

**Status:** ✅ Already aligned with refactored protocol

Zod schemas already validate:
- Correct asset types
- Hash format validation (0x-prefixed 64-char hex)
- Ethereum address format
- ISO 8601 dates

**Required Actions:** **NONE** - Schemas are correct

### 2.3 Validation Utilities (`test/offchain/src/utils/validation.ts`)

**Status:** ✅ Largely compatible

Current validation logic checks:
- Asset type-specific business rules
- Orbital parameter validation
- Document hash verification
- Required lease keys validation

**Required Actions:**
1. ✅ Update `getRequiredKeysForAssetType()` to match new onchain keys
2. ✅ Ensure hash validation uses keccak256 (not SHA-256) for schema hashes
3. ✅ Add validation for Metadata[] array structure

**Estimated Effort:** 2-3 hours

### 2.4 Blockchain Integration (CRITICAL UPDATES REQUIRED)

#### File: `test/offchain/src/integration/blockchain.ts` (MISSING)

**Status:** ⚠️ File does not exist - must be created

**Required Implementation:**
```typescript
// test/offchain/src/integration/blockchain.ts

import { ethers, Contract, Wallet } from 'ethers';
import type { ContractAddresses } from '../types/index.js';

export class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private wallet: Wallet;
  private contracts: {
    assetRegistry: Contract;
    marketplace: Contract;
    leaseFactory: Contract;
  };

  constructor(rpcUrl: string, privateKey: string, addresses: ContractAddresses) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.wallet = new Wallet(privateKey, this.provider);

    // Load contract ABIs and create Contract instances
    this.contracts = {
      assetRegistry: new Contract(addresses.assetRegistry, AssetRegistryABI, this.wallet),
      marketplace: new Contract(addresses.marketplace, MarketplaceABI, this.wallet),
      leaseFactory: new Contract(addresses.leaseFactory, LeaseFactoryABI, this.wallet)
    };
  }

  /**
   * Step 1: Create asset type (admin only)
   */
  async createAssetType(
    name: string,
    schemaHash: string,
    requiredLeaseKeys: string[],
    metadata: Array<{key: string; value: string}>
  ): Promise<string> {
    const tx = await this.contracts.assetRegistry.createAsset(
      name,
      schemaHash,
      requiredLeaseKeys,
      metadata
    );
    await tx.wait();
    return tx.hash;
  }

  /**
   * Step 2: Register asset instance (registrar only)
   */
  async registerAsset(
    schemaHash: string,
    tokenName: string,
    tokenSymbol: string,
    totalSupply: bigint,
    admin: string,
    tokenRecipient: string,
    metadata: Array<{key: string; value: string}>
  ): Promise<{ assetId: bigint; tokenAddress: string; txHash: string }> {
    const tx = await this.contracts.assetRegistry.registerAsset(
      schemaHash,
      tokenName,
      tokenSymbol,
      totalSupply,
      admin,
      tokenRecipient,
      metadata
    );

    const receipt = await tx.wait();

    // Parse AssetRegistered event
    const event = receipt.logs.find((log: any) => {
      try {
        const parsed = this.contracts.assetRegistry.interface.parseLog(log);
        return parsed?.name === 'AssetRegistered';
      } catch {
        return false;
      }
    });

    if (!event) throw new Error('AssetRegistered event not found');

    const parsed = this.contracts.assetRegistry.interface.parseLog(event);
    return {
      assetId: parsed.args.assetId,
      tokenAddress: parsed.args.tokenAddress,
      txHash: tx.hash
    };
  }

  /**
   * Query asset token holders (NEW: direct enumeration)
   */
  async getAssetHolders(tokenAddress: string): Promise<Array<{address: string; balance: bigint}>> {
    const token = new Contract(tokenAddress, AssetERC20ABI, this.provider);

    const holders = await token.getHolders();

    const holdersWithBalances = await Promise.all(
      holders.map(async (address: string) => ({
        address,
        balance: await token.balanceOf(address)
      }))
    );

    return holdersWithBalances;
  }

  /**
   * Get asset metadata from onchain storage
   */
  async getAssetMetadata(assetId: bigint, keys: string[]): Promise<Record<string, string>> {
    const asset = await this.contracts.assetRegistry.getAsset(assetId);
    const token = new Contract(asset.tokenAddress, AssetERC20ABI, this.provider);

    const assetHash = ethers.keccak256(ethers.toUtf8Bytes(assetId.toString()));

    const metadata: Record<string, string> = {};
    for (const key of keys) {
      metadata[key] = await token.getMetadata(assetHash, key);
    }

    return metadata;
  }
}
```

**Estimated Effort:** 8-10 hours

#### File: `test/offchain/src/testing/event-listener.ts`

**Status:** ⚠️ Exists but written for old protocol

**Required Updates:**
1. ✅ Remove all ERC20Votes snapshot event handling
2. ✅ Update `AssetRegistered` event signature:
   ```typescript
   // OLD
   'event AssetRegistered(uint256 indexed assetId, address indexed owner, string metadataHash)'

   // NEW
   'event AssetRegistered(uint256 indexed assetId, bytes32 indexed schemaHash, address tokenAddress)'
   ```
3. ✅ Add `AssetTypeCreated` event handler
4. ✅ Remove `AssetTokenDeployed` event (merged into AssetRegistered)
5. ✅ Update holder tracking to use `Transfer` events only (no checkpoints)

**Estimated Effort:** 4-6 hours

### 2.5 API Server Updates

#### File: `test/offchain/src/api/server.ts`

**Status:** ⚠️ Partially compatible, needs updates

**Required Endpoint Changes:**

**POST /asset-types (NEW)**
```typescript
// Create asset type (step 1)
app.post('/asset-types', async (req, res) => {
  const { name, schemaHash, requiredLeaseKeys, metadata } = req.body;

  // Validate admin permissions
  // Create asset type onchain
  const txHash = await blockchainService.createAssetType(
    name,
    schemaHash,
    requiredLeaseKeys,
    metadata
  );

  res.status(201).json({ success: true, data: { txHash } });
});
```

**POST /assets (UPDATE)**
```typescript
// Register asset instance (step 2)
app.post('/assets', async (req, res) => {
  const { schemaHash, tokenName, tokenSymbol, totalSupply, admin, recipient, metadata } = req.body;

  // Validate registrar permissions
  const result = await blockchainService.registerAsset(
    schemaHash,
    tokenName,
    tokenSymbol,
    BigInt(totalSupply),
    admin,
    recipient,
    metadata // Now Metadata[] array, not JSON string
  );

  res.status(201).json({
    success: true,
    data: {
      assetId: result.assetId.toString(),
      tokenAddress: result.tokenAddress,
      transactionHash: result.txHash
    }
  });
});
```

**GET /assets/:assetId/holders (NEW)**
```typescript
// Get current holders (replaces snapshot-based queries)
app.get('/assets/:assetId/holders', async (req, res) => {
  const assetId = BigInt(req.params.assetId);

  // Get asset to find token address
  const asset = await blockchainService.getAsset(assetId);

  // Get current holders
  const holders = await blockchainService.getAssetHolders(asset.tokenAddress);

  res.json({
    success: true,
    data: {
      holders: holders.map(h => ({
        address: h.address,
        balance: h.balance.toString(),
        percentage: calculatePercentage(h.balance, totalSupply)
      }))
    }
  });
});
```

**DELETE Deprecated Endpoints:**
- `GET /assets/:assetId/snapshot/:snapshotId` (no more snapshots)
- `POST /assets/:assetId/snapshot` (no more snapshot creation)

**Estimated Effort:** 6-8 hours

### 2.6 Testing Infrastructure

#### File: `test/offchain/src/testing/anvil-manager.ts`

**Status:** ✅ Compatible - manages Anvil process, no protocol-specific logic

**Required Actions:** **NONE**

#### File: `test/offchain/src/testing/contract-deployer.ts`

**Status:** ⚠️ Must update deployment scripts

**Required Updates:**
1. ✅ Update deployment to grant REGISTRAR_ROLE to test accounts
2. ✅ Deploy with correct constructor parameters (admin, registrar addresses)
3. ✅ Create sample asset types in deployment (for testing)
4. ✅ Update ABI imports to match refactored contracts

**Example:**
```typescript
export async function deployContracts(deployer: Wallet): Promise<ContractAddresses> {
  // Deploy AssetRegistry with roles
  const AssetRegistry = await ethers.getContractFactory('AssetRegistry', deployer);
  const assetRegistry = await AssetRegistry.deploy(
    deployer.address, // admin
    deployer.address  // registrar
  );
  await assetRegistry.waitForDeployment();

  // Create test asset types
  const orbitalComputeSchema = ethers.keccak256(ethers.toUtf8Bytes('OrbitalComputeSchema'));
  await assetRegistry.createAsset(
    'Orbital Compute Station',
    orbitalComputeSchema,
    [
      ethers.keccak256(ethers.toUtf8Bytes('compute_allocation_cores')),
      ethers.keccak256(ethers.toUtf8Bytes('memory_allocation_gb')),
      ethers.keccak256(ethers.toUtf8Bytes('storage_allocation_tb'))
    ],
    [] // metadata
  );

  // Deploy other contracts...

  return {
    assetRegistry: await assetRegistry.getAddress(),
    marketplace: await marketplace.getAddress(),
    leaseFactory: await leaseFactory.getAddress()
  };
}
```

**Estimated Effort:** 3-4 hours

#### File: `test/offchain/src/testing/integration-test-suite.ts`

**Status:** ⚠️ Major updates required

**Test Flow Updates:**

**OLD Test Flow:**
1. Register asset → Get assetId
2. Query metadata from IPFS/HTTP
3. Create snapshot
4. Query balanceOfAt(holder, snapshotId)
5. Distribute revenue based on snapshot

**NEW Test Flow:**
1. Create asset type → Get schemaHash
2. Register asset instance → Get assetId + tokenAddress
3. Query onchain metadata via getMetadata(hash, key)
4. Query current holders via getHolders()
5. Query current balances via balanceOf(holder)
6. Distribute revenue based on current state

**Example Updated Test:**
```typescript
describe('Asset Registration End-to-End', () => {
  it('should create asset type and register instance', async () => {
    // Step 1: Create asset type
    const schemaHash = ethers.keccak256(ethers.toUtf8Bytes('SatelliteSchema'));
    await assetRegistry.createAsset(
      'Satellite',
      schemaHash,
      [keccak256('orbital_period_hours')],
      [{ key: 'schemaURI', value: 'ipfs://...' }]
    );

    // Step 2: Register instance
    const metadata = [
      { key: 'name', value: 'Test Satellite' },
      { key: 'altitude_km', value: '550' }
    ];

    const result = await assetRegistry.registerAsset(
      schemaHash,
      'Test Satellite Token',
      'TST',
      ethers.parseEther('1000000'),
      owner.address,
      owner.address,
      metadata
    );

    const receipt = await result.wait();
    const event = receipt.logs.find(l => l.eventName === 'AssetRegistered');

    expect(event.args.assetId).to.equal(1n);
    expect(event.args.tokenAddress).to.be.properAddress;

    // Step 3: Verify metadata storage
    const token = await ethers.getContractAt('AssetERC20', event.args.tokenAddress);
    const assetHash = ethers.keccak256(ethers.toUtf8Bytes('1'));

    expect(await token.getMetadata(assetHash, 'name')).to.equal('Test Satellite');
    expect(await token.getMetadata(assetHash, 'altitude_km')).to.equal('550');
  });
});
```

**Estimated Effort:** 12-15 hours (comprehensive test rewrite)

---

## Part 3: Data Format Conversion

### 3.1 JSON to Metadata[] Conversion Utility

**NEW Required File:** `test/offchain/src/utils/metadata-converter.ts`

```typescript
/**
 * Convert JSON asset metadata to Metadata[] array for onchain storage
 */
export function jsonToMetadataArray(assetJson: AssetMetadata): Array<{key: string; value: string}> {
  const metadata: Array<{key: string; value: string}> = [];

  // Core fields
  metadata.push({ key: 'name', value: assetJson.name });
  metadata.push({ key: 'description', value: assetJson.description });
  metadata.push({ key: 'assetType', value: assetJson.assetType });

  // Flatten specifications
  function flattenObject(obj: Record<string, any>, prefix = ''): void {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}_${key}` : key;

      if (value === null || value === undefined) continue;

      if (typeof value === 'object' && !Array.isArray(value)) {
        flattenObject(value, fullKey);
      } else if (Array.isArray(value)) {
        metadata.push({ key: fullKey, value: JSON.stringify(value) });
      } else {
        metadata.push({ key: fullKey, value: String(value) });
      }
    }
  }

  flattenObject(assetJson.specifications, 'spec');

  // Document hashes (store as comma-separated list)
  if (assetJson.documents.length > 0) {
    const docHashes = assetJson.documents.map(d => d.hash).join(',');
    metadata.push({ key: 'documentHashes', value: docHashes });
  }

  return metadata;
}

/**
 * Reconstruct JSON from onchain Metadata[] array
 */
export async function metadataArrayToJson(
  token: Contract,
  assetHash: string
): Promise<Partial<AssetMetadata>> {
  const keys = await token.getAllMetadataKeys(assetHash);
  const metadata: Record<string, string> = {};

  for (const key of keys) {
    metadata[key] = await token.getMetadata(assetHash, key);
  }

  // Reconstruct nested structure
  const reconstructed: any = {
    name: metadata['name'],
    description: metadata['description'],
    assetType: metadata['assetType'],
    specifications: {}
  };

  // Unflatten spec_ keys
  for (const [key, value] of Object.entries(metadata)) {
    if (key.startsWith('spec_')) {
      const path = key.substring(5).split('_');
      let current = reconstructed.specifications;

      for (let i = 0; i < path.length - 1; i++) {
        if (!current[path[i]]) current[path[i]] = {};
        current = current[path[i]];
      }

      current[path[path.length - 1]] = tryParseJson(value) || value;
    }
  }

  return reconstructed;
}

function tryParseJson(str: string): any {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}
```

**Estimated Effort:** 4-5 hours

### 3.2 Schema Hash Generation

**NEW Required File:** `test/offchain/src/utils/schema-hash.ts`

```typescript
import { ethers } from 'ethers';
import { readFile } from 'fs/promises';

/**
 * Generate deterministic schema hash matching onchain keccak256
 */
export async function generateSchemaHash(schemaPath: string): Promise<string> {
  const schemaJson = await readFile(schemaPath, 'utf8');
  const normalized = JSON.stringify(JSON.parse(schemaJson)); // Normalize whitespace

  return ethers.keccak256(ethers.toUtf8Bytes(normalized));
}

/**
 * Generate required lease key hashes
 */
export function generateLeaseKeyHashes(keys: string[]): string[] {
  return keys.map(key => ethers.keccak256(ethers.toUtf8Bytes(key)));
}

/**
 * Predefined schema hashes for test assets
 */
export const SCHEMA_HASHES = {
  ORBITAL_COMPUTE: ethers.keccak256(ethers.toUtf8Bytes('OrbitalComputeSchema')),
  ORBITAL_RELAY: ethers.keccak256(ethers.toUtf8Bytes('OrbitalRelaySchema')),
  SATELLITE: ethers.keccak256(ethers.toUtf8Bytes('SatelliteSchema'))
} as const;

/**
 * Required lease keys by asset type
 */
export const REQUIRED_LEASE_KEYS = {
  ORBITAL_COMPUTE: [
    'compute_allocation_cores',
    'memory_allocation_gb',
    'storage_allocation_tb'
  ],
  ORBITAL_RELAY: [
    'relay_channels',
    'max_throughput_gbps',
    'coverage_area_km2'
  ],
  SATELLITE: [
    'orbital_period_hours',
    'data_download_rights',
    'orbit_maintenance_responsibility'
  ]
} as const;
```

**Estimated Effort:** 2-3 hours

---

## Part 4: Anvil Local Deployment Workflow

### 4.1 Complete Setup Script

**NEW Required File:** `test/offchain/scripts/setup-local-anvil.ts`

```typescript
#!/usr/bin/env tsx

import { AnvilManager } from '../src/testing/anvil-manager.js';
import { deployContracts } from '../src/testing/contract-deployer.js';
import { BlockchainService } from '../src/integration/blockchain.js';
import { SCHEMA_HASHES, REQUIRED_LEASE_KEYS, generateLeaseKeyHashes } from '../src/utils/schema-hash.js';
import { ethers } from 'ethers';

async function setupLocalAnvil() {
  console.log('🚀 Starting Anvil local blockchain...');

  // Step 1: Start Anvil
  const anvil = new AnvilManager();
  await anvil.start();

  // Step 2: Deploy contracts
  console.log('📦 Deploying contracts...');
  const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
  const deployer = new ethers.Wallet(
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', // Anvil account 0
    provider
  );

  const addresses = await deployContracts(deployer);

  console.log('✅ Contracts deployed:');
  console.log(`   AssetRegistry: ${addresses.assetRegistry}`);
  console.log(`   Marketplace: ${addresses.marketplace}`);
  console.log(`   LeaseFactory: ${addresses.leaseFactory}`);

  // Step 3: Create asset types
  console.log('\n🏗️  Creating asset types...');
  const blockchain = new BlockchainService(
    'http://127.0.0.1:8545',
    deployer.privateKey,
    addresses
  );

  // Orbital Compute
  await blockchain.createAssetType(
    'Orbital Compute Station',
    SCHEMA_HASHES.ORBITAL_COMPUTE,
    generateLeaseKeyHashes(REQUIRED_LEASE_KEYS.ORBITAL_COMPUTE),
    [{ key: 'schemaURI', value: 'file://./test/offchain/data/schemas/orbital-compute.json' }]
  );
  console.log('   ✅ Orbital Compute Station type created');

  // Orbital Relay
  await blockchain.createAssetType(
    'Orbital Relay Station',
    SCHEMA_HASHES.ORBITAL_RELAY,
    generateLeaseKeyHashes(REQUIRED_LEASE_KEYS.ORBITAL_RELAY),
    [{ key: 'schemaURI', value: 'file://./test/offchain/data/schemas/orbital-relay.json' }]
  );
  console.log('   ✅ Orbital Relay Station type created');

  // Satellite
  await blockchain.createAssetType(
    'Satellite',
    SCHEMA_HASHES.SATELLITE,
    generateLeaseKeyHashes(REQUIRED_LEASE_KEYS.SATELLITE),
    [{ key: 'schemaURI', value: 'file://./test/offchain/data/schemas/satellite.json' }]
  );
  console.log('   ✅ Satellite type created');

  // Step 4: Save configuration
  const config = {
    network: 'anvil',
    rpcUrl: 'http://127.0.0.1:8545',
    contracts: addresses,
    deployerAddress: deployer.address,
    privateKey: deployer.privateKey
  };

  await writeFile(
    './test/offchain/.local-config.json',
    JSON.stringify(config, null, 2)
  );

  console.log('\n✅ Local Anvil setup complete!');
  console.log('\n📝 Configuration saved to: test/offchain/.local-config.json');
  console.log('\n🔗 Next steps:');
  console.log('   1. npm run offchain:api   # Start API server');
  console.log('   2. npm run offchain:test  # Run integration tests');
}

setupLocalAnvil().catch(console.error);
```

**Estimated Effort:** 3-4 hours

### 4.2 End-to-End Test Example

**NEW Required File:** `test/offchain/examples/complete-workflow.ts`

```typescript
#!/usr/bin/env tsx

/**
 * Complete end-to-end workflow demonstration:
 * 1. Setup Anvil
 * 2. Deploy contracts
 * 3. Create asset type
 * 4. Register asset instance
 * 5. Query metadata
 * 6. Track holders
 * 7. Simulate revenue distribution
 */

import { ethers } from 'ethers';
import { readFile } from 'fs/promises';
import { BlockchainService } from '../src/integration/blockchain.js';
import { jsonToMetadataArray } from '../src/utils/metadata-converter.js';
import { SCHEMA_HASHES } from '../src/utils/schema-hash.js';
import type { AssetMetadata } from '../src/types/index.js';

async function runCompleteWorkflow() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Asset Leasing Protocol - Complete Workflow Demo');
  console.log('═══════════════════════════════════════════════════════\n');

  // Load configuration
  const config = JSON.parse(
    await readFile('./test/offchain/.local-config.json', 'utf8')
  );

  const blockchain = new BlockchainService(
    config.rpcUrl,
    config.privateKey,
    config.contracts
  );

  // Load asset JSON
  const assetJson: AssetMetadata = JSON.parse(
    await readFile('./test/offchain/data/assets/ocs-primary.json', 'utf8')
  );

  console.log('Step 1: Asset type already created during setup');
  console.log(`   Schema Hash: ${SCHEMA_HASHES.ORBITAL_COMPUTE}\n`);

  // Step 2: Register asset instance
  console.log('Step 2: Registering asset instance...');
  const metadata = jsonToMetadataArray(assetJson);

  const result = await blockchain.registerAsset(
    SCHEMA_HASHES.ORBITAL_COMPUTE,
    'OCS-Primary Token',
    'OCS1',
    ethers.parseEther('1000000'),
    config.deployerAddress,
    config.deployerAddress,
    metadata
  );

  console.log(`   ✅ Asset ID: ${result.assetId}`);
  console.log(`   ✅ Token Address: ${result.tokenAddress}`);
  console.log(`   ✅ Transaction: ${result.txHash}\n`);

  // Step 3: Query onchain metadata
  console.log('Step 3: Querying onchain metadata...');
  const onchainMetadata = await blockchain.getAssetMetadata(
    result.assetId,
    ['name', 'spec_compute_cpu_cores', 'spec_compute_ram_gb', 'spec_compute_storage_tb']
  );

  console.log('   Metadata retrieved:');
  console.log(`     Name: ${onchainMetadata.name}`);
  console.log(`     CPU Cores: ${onchainMetadata.spec_compute_cpu_cores}`);
  console.log(`     RAM: ${onchainMetadata.spec_compute_ram_gb} GB`);
  console.log(`     Storage: ${onchainMetadata.spec_compute_storage_tb} TB\n`);

  // Step 4: Query holders
  console.log('Step 4: Querying current token holders...');
  const holders = await blockchain.getAssetHolders(result.tokenAddress);

  console.log(`   Total holders: ${holders.length}`);
  for (const holder of holders) {
    const percentage = (Number(holder.balance) / Number(ethers.parseEther('1000000'))) * 100;
    console.log(`     ${holder.address}: ${ethers.formatEther(holder.balance)} (${percentage.toFixed(2)}%)`);
  }
  console.log();

  // Step 5: Simulate revenue distribution
  console.log('Step 5: Simulating revenue distribution...');
  const revenueAmount = ethers.parseEther('50000'); // 50,000 tokens
  const totalSupply = ethers.parseEther('1000000');

  console.log(`   Revenue to distribute: ${ethers.formatEther(revenueAmount)}`);
  console.log('   Claims by holder:');

  for (const holder of holders) {
    const claimAmount = (holder.balance * revenueAmount) / totalSupply;
    console.log(`     ${holder.address}: ${ethers.formatEther(claimAmount)}`);
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  ✅ Complete workflow executed successfully!');
  console.log('═══════════════════════════════════════════════════════\n');
}

runCompleteWorkflow().catch(console.error);
```

**Estimated Effort:** 4-5 hours

---

## Part 5: Implementation Roadmap

### Phase 1: Core Infrastructure (Days 1-3)
**Priority:** CRITICAL
**Duration:** ~24 hours

**Tasks:**
1. ✅ Create `BlockchainService` class (`test/offchain/src/integration/blockchain.ts`)
2. ✅ Implement metadata conversion utilities (`utils/metadata-converter.ts`)
3. ✅ Create schema hash utilities (`utils/schema-hash.ts`)
4. ✅ Update contract deployer with role grants
5. ✅ Test basic contract interactions on Anvil

**Deliverables:**
- Working blockchain service for asset registration
- Metadata conversion between JSON ↔ Metadata[] array
- Local Anvil deployment with asset types created

**Validation:**
```bash
npm run setup:anvil
# Should output: ✅ Local Anvil setup complete!
```

### Phase 2: Event Processing (Days 4-5)
**Priority:** HIGH
**Duration:** ~16 hours

**Tasks:**
1. ✅ Update event listener with new signatures
2. ✅ Remove snapshot-related event handlers
3. ✅ Add `AssetTypeCreated` handler
4. ✅ Update holder tracking logic
5. ✅ Test event processing with sample transactions

**Deliverables:**
- Event listener compatible with refactored protocol
- Real-time holder tracking without snapshots
- Event log database storage

**Validation:**
```bash
npm run test:events
# Should detect and process AssetTypeCreated and AssetRegistered events
```

### Phase 3: API Updates (Days 6-7)
**Priority:** HIGH
**Duration:** ~16 hours

**Tasks:**
1. ✅ Add `POST /asset-types` endpoint
2. ✅ Update `POST /assets` endpoint
3. ✅ Add `GET /assets/:id/holders` endpoint
4. ✅ Remove snapshot-related endpoints
5. ✅ Update API documentation

**Deliverables:**
- RESTful API matching new protocol
- Swagger/OpenAPI documentation
- Integration with BlockchainService

**Validation:**
```bash
curl -X POST http://localhost:3000/asset-types -d '{"name":"Test","schemaHash":"0x..."}'
# Should return: {"success":true,"data":{"txHash":"0x..."}}
```

### Phase 4: Integration Tests (Days 8-10)
**Priority:** CRITICAL
**Duration:** ~24 hours

**Tasks:**
1. ✅ Rewrite asset registration tests
2. ✅ Rewrite revenue distribution tests (no snapshots)
3. ✅ Add metadata round-trip tests (JSON → onchain → JSON)
4. ✅ Add holder enumeration tests
5. ✅ Create comprehensive test suite

**Deliverables:**
- Full integration test coverage
- Test fixtures for all asset types
- Automated test runner

**Validation:**
```bash
npm run test:integration
# Should output: ✅ All 15 integration tests passed
```

### Phase 5: Documentation & Examples (Days 11-12)
**Priority:** MEDIUM
**Duration:** ~16 hours

**Tasks:**
1. ✅ Create complete workflow example (`examples/complete-workflow.ts`)
2. ✅ Write setup guide for local development
3. ✅ Document API endpoints with examples
4. ✅ Create troubleshooting guide
5. ✅ Record demo video/screenshots

**Deliverables:**
- Comprehensive documentation
- Working examples
- Developer onboarding guide

**Validation:**
```bash
npm run example:workflow
# Should execute full end-to-end demo successfully
```

---

## Part 6: Testing Strategy

### 6.1 Unit Tests

**Files to Update:**
- `test/offchain/src/utils/validation.test.ts` - Update for new metadata structure
- `test/offchain/src/utils/metadata-converter.test.ts` - NEW: Test JSON ↔ Metadata[] conversion

**Example Test:**
```typescript
describe('Metadata Converter', () => {
  it('should convert JSON to Metadata[] array', () => {
    const assetJson = {
      name: 'Test Asset',
      specifications: {
        compute: {
          cpu_cores: 64,
          ram_gb: 512
        }
      }
    };

    const metadata = jsonToMetadataArray(assetJson);

    expect(metadata).to.deep.include({ key: 'name', value: 'Test Asset' });
    expect(metadata).to.deep.include({ key: 'spec_compute_cpu_cores', value: '64' });
    expect(metadata).to.deep.include({ key: 'spec_compute_ram_gb', value: '512' });
  });
});
```

### 6.2 Integration Tests

**Test Scenarios:**
1. ✅ Asset type creation with metadata
2. ✅ Asset instance registration with complete metadata
3. ✅ Metadata retrieval and verification
4. ✅ Holder enumeration after transfers
5. ✅ Revenue distribution without snapshots
6. ✅ Event processing and database updates
7. ✅ API endpoint functionality
8. ✅ Error handling and validation

**Success Criteria:**
- All 15+ integration tests pass
- No console errors or warnings
- Event listener processes all events correctly
- API responses match OpenAPI schema

### 6.3 End-to-End Tests

**Complete Workflow Test:**
1. Start Anvil
2. Deploy contracts
3. Create 3 asset types
4. Register 4 asset instances (OCS-Primary, ORS-Gateway, Satellite Alpha-1, Satellite Beta-2)
5. Verify all metadata stored correctly
6. Transfer tokens between accounts
7. Query holders after transfers
8. Simulate revenue distribution
9. Verify claim calculations
10. Cleanup and teardown

**Expected Duration:** ~5 minutes per full workflow

---

## Part 7: Risk Assessment & Mitigation

### 7.1 Technical Risks

**Risk 1: Metadata Size Limits**
- **Issue:** Onchain key-value storage may hit gas limits for large metadata objects
- **Mitigation:**
  - Store only essential metadata onchain
  - Use IPFS/offchain storage for large documents
  - Implement pagination for metadata queries
  - Test with realistic asset data sizes

**Risk 2: Event Reorg Handling**
- **Issue:** Blockchain reorganizations may cause duplicate/missed events
- **Mitigation:**
  - Implement event fingerprinting (tx hash + log index)
  - Use database constraints to prevent duplicate events
  - Add reorg detection and reconciliation logic
  - Test with Anvil snapshot/revert functionality

**Risk 3: Schema Hash Collisions**
- **Issue:** Different schemas could theoretically produce same keccak256 hash
- **Mitigation:**
  - Extremely unlikely with keccak256 (2^256 space)
  - Validate schema uniqueness before creation
  - Store full schema JSON offchain as backup
  - Log warning if hash collision detected

### 7.2 Integration Risks

**Risk 1: API Backward Compatibility**
- **Issue:** Existing clients may expect old API format
- **Mitigation:**
  - Version API endpoints (v1 vs v2)
  - Provide migration guide for clients
  - Support gradual migration period
  - Clear deprecation warnings

**Risk 2: Data Migration**
- **Issue:** Existing offchain data may not match new format
- **Mitigation:**
  - Create data migration scripts
  - Test with production-like data volumes
  - Implement rollback procedures
  - Validate migrated data integrity

### 7.3 Operational Risks

**Risk 1: Anvil State Persistence**
- **Issue:** Anvil resets state on restart, losing all data
- **Mitigation:**
  - Use Anvil `--dump-state` for persistence
  - Implement state snapshot/restore scripts
  - Document manual state recreation process
  - Consider using Hardhat Network for persistent state

**Risk 2: Private Key Management**
- **Issue:** Hardcoded private keys in test code
- **Mitigation:**
  - Use environment variables for keys
  - Never commit private keys to git
  - Use separate keys for dev/test/prod
  - Implement key rotation procedures

---

## Part 8: Success Criteria

### 8.1 Functional Requirements

✅ **Asset Registration:**
- Create asset types with schema hashes
- Register asset instances with metadata
- Deploy ERC20 tokens automatically
- Store metadata onchain as key-value pairs

✅ **Metadata Management:**
- Convert JSON ↔ Metadata[] array bidirectionally
- Query individual metadata keys
- Query all metadata keys for an asset
- Update metadata (admin only)

✅ **Holder Tracking:**
- Enumerate current token holders
- Query holder balances
- Calculate holder percentages
- Track holder changes via Transfer events

✅ **Revenue Distribution:**
- Calculate claims based on current balances
- No snapshot dependency
- Proportional distribution logic
- Claim tracking and verification

✅ **Event Processing:**
- Listen for AssetTypeCreated events
- Listen for AssetRegistered events
- Process Transfer events for holder tracking
- Handle event reorgs gracefully

✅ **API Functionality:**
- POST /asset-types (create type)
- POST /assets (register instance)
- GET /assets/:id (query asset)
- GET /assets/:id/holders (query holders)
- GET /assets/:id/metadata (query metadata)

### 8.2 Non-Functional Requirements

✅ **Performance:**
- Asset registration < 10 seconds
- Metadata queries < 1 second
- Holder enumeration < 5 seconds (up to 1000 holders)
- Event processing < 2 seconds per event

✅ **Reliability:**
- 99.9% uptime for Anvil local node
- Zero data loss during event processing
- Automatic recovery from connection failures
- Graceful error handling

✅ **Maintainability:**
- Full TypeScript type safety
- Comprehensive inline documentation
- Clear separation of concerns
- Testable architecture

✅ **Usability:**
- One-command setup (`npm run setup:anvil`)
- Clear error messages
- Example workflows provided
- API documentation with Swagger

---

## Part 9: Package.json Updates

**NEW Scripts to Add:**

```json
{
  "scripts": {
    "setup:anvil": "tsx test/offchain/scripts/setup-local-anvil.ts",
    "offchain:api": "tsx test/offchain/src/api/standalone-server.ts",
    "offchain:test": "vitest run test/offchain/**/*.test.ts",
    "offchain:test:watch": "vitest test/offchain/**/*.test.ts",
    "example:workflow": "tsx test/offchain/examples/complete-workflow.ts",
    "example:registration": "tsx test/offchain/examples/register-asset.ts",
    "example:revenue": "tsx test/offchain/examples/revenue-distribution.ts"
  }
}
```

---

## Part 10: Next Steps

### Immediate Actions (This Week)

1. **Create Core Integration Files**
   ```bash
   touch test/offchain/src/integration/blockchain.ts
   touch test/offchain/src/utils/metadata-converter.ts
   touch test/offchain/src/utils/schema-hash.ts
   ```

2. **Update Contract ABIs**
   ```bash
   # Export ABIs from Foundry build
   forge build
   cp out/AssetRegistry.sol/AssetRegistry.json test/offchain/abis/
   cp out/AssetERC20.sol/AssetERC20.json test/offchain/abis/
   cp out/Marketplace.sol/Marketplace.json test/offchain/abis/
   ```

3. **Setup Anvil Script**
   ```bash
   npm run setup:anvil
   # Verify contracts deployed and asset types created
   ```

4. **Test Basic Asset Registration**
   ```bash
   npm run example:registration
   # Should register test asset successfully
   ```

### Follow-Up Tasks (Next Week)

1. Update event listener with new signatures
2. Rewrite API endpoints
3. Create comprehensive integration tests
4. Write end-to-end workflow examples
5. Update all documentation

### Long-Term Goals (Next Month)

1. Performance optimization and caching
2. Production deployment procedures
3. Monitoring and alerting setup
4. Security audit preparation
5. User documentation and tutorials

---

## Appendix A: File Checklist

### Files Requiring Updates

- ✅ `test/offchain/src/integration/blockchain.ts` - CREATE NEW
- ✅ `test/offchain/src/utils/metadata-converter.ts` - CREATE NEW
- ✅ `test/offchain/src/utils/schema-hash.ts` - CREATE NEW
- ⚠️ `test/offchain/src/testing/event-listener.ts` - UPDATE
- ⚠️ `test/offchain/src/testing/contract-deployer.ts` - UPDATE
- ⚠️ `test/offchain/src/testing/integration-test-suite.ts` - MAJOR REWRITE
- ⚠️ `test/offchain/src/api/server.ts` - UPDATE
- ⚠️ `test/offchain/src/api/api.test.ts` - UPDATE
- ✅ `test/offchain/src/types/index.ts` - NO CHANGES
- ✅ `test/offchain/src/schemas/index.ts` - NO CHANGES
- ⚠️ `test/offchain/src/utils/validation.ts` - MINOR UPDATES

### Files Not Requiring Changes

- ✅ `test/offchain/src/testing/anvil-manager.ts`
- ✅ `test/offchain/src/testing/mock-services.ts`
- ✅ `test/offchain/src/utils/cli-output.ts`
- ✅ `test/offchain/src/utils/crypto.ts`
- ✅ `test/offchain/src/utils/file-storage.ts`
- ✅ All JSON data files in `test/offchain/data/`

---

## Appendix B: Estimated Effort Summary

| Phase | Tasks | Hours | Days |
|-------|-------|-------|------|
| Phase 1: Core Infrastructure | BlockchainService, converters, schema utils | 24 | 3 |
| Phase 2: Event Processing | Update listeners, remove snapshots | 16 | 2 |
| Phase 3: API Updates | New endpoints, update existing | 16 | 2 |
| Phase 4: Integration Tests | Rewrite tests, create fixtures | 24 | 3 |
| Phase 5: Documentation | Guides, examples, API docs | 16 | 2 |
| **Total** | | **96** | **12** |

**Additional Considerations:**
- Buffer time for debugging: +20% (19 hours)
- Code review and refinement: +10% (10 hours)
- **Total Project Duration:** ~125 hours (~15-16 working days)

---

## Appendix C: Contact & Support

**For Questions:**
- Review existing Foundry tests in `test/AssetCreationAndRegistration.t.sol`
- Check contract documentation in `docs/contract-specific/`
- Refer to CLAUDE.md for testing philosophy

**Common Issues:**
- Anvil won't start: Check port 8545 not already in use
- Contract deployment fails: Verify gas limits and account balance
- Metadata conversion errors: Validate JSON schema structure
- Event listener missing events: Check block range and contract addresses

---

**Document Version:** 1.0
**Last Updated:** 2025-10-12
**Status:** Ready for Implementation