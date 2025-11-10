# Asset Leasing Protocol

A smart contract system for tokenizing real-world assets, creating leases, and distributing revenue to fractional owners.

## What It Does

This protocol enables:
- **Tokenize Assets**: Register assets and represent ownership as ERC-20 tokens (full or fractional)
- **Create Leases**: Sign lease agreements onchain as ERC-721 NFTs with dual-party signatures
- **Run a Marketplace**: Buy/sell asset fractions or post/accept lease offers
- **Distribute Revenue**: Share lease payments proportionally among all token holders via snapshots

**Key Design**: All heavy data (schemas, metadata, legal docs) lives offchain. Onchain contracts only store cryptographic hashes for verification.

## Quick Start

### Installation
```bash
# Install dependencies
forge install

# Build contracts
forge build
```

### Run Tests
```bash
# Run all tests (179 tests)
forge test

# Run with verbosity
forge test -vvv

# Run specific test suite
forge test --match-path test/component/AssetRegistry.t.sol
```

### Test Coverage
```bash
forge coverage
```

## Protocol Components

### 1. AssetRegistry
Creates asset types and registers individual assets. Each asset gets its own ERC-20 token contract deployed automatically.

```solidity
// Create asset type
registry.createAssetType("Satellite", assetTypeHash, requiredKeys, metadata);

// Register asset (deploys new ERC-20)
registry.registerAsset(assetType, "Satellite Alpha", "SATA", 1000e18, ...);
```

### 2. AssetERC20
Standard ERC-20 token per asset with:
- Full supply minted to initial owner
- Fractional ownership transfers
- ERC20Votes integration for revenue snapshots
- Auto-delegation for voting power

### 3. LeaseFactory
Mints Lease NFTs when both parties sign EIP-712 lease terms:

```solidity
// Both lessor and lessee sign the lease intent
LeaseIntent memory intent = LeaseIntent({
    deadline: block.timestamp + 7 days,
    assetType: assetTypeHash,
    lease: Lease({ ... })
});

// Mint lease NFT with dual signatures
leaseFactory.mintLease(intent, sigLessor, sigLessee);
```

### 4. Marketplace
Handles asset sales and lease bidding:

**Asset Sales**
```solidity
marketplace.postSale(assetToken, amount, minPrice);
marketplace.placeSaleBid(saleId, bidAmount);
marketplace.acceptSaleBid(saleId, bidId); // Atomic swap + refunds
```

**Lease Offers**
```solidity
marketplace.postLeaseOffer(leaseIntent);
marketplace.placeLeaseBid(offerId, leaseIntent, signature);
marketplace.acceptLeaseBid(offerId, bidId); // Mints NFT + distributes revenue
```

### 5. Revenue Distribution
When leases are accepted, payments are distributed proportionally:

```solidity
// Snapshot balances at payment time
assetToken.snapshot();

// Token holders claim their share
marketplace.claimRevenue(assetId, roundId);
```

## Project Structure

```
src/
├── AssetRegistry.sol      # Asset type & registration system
├── AssetERC20.sol         # ERC-20 token per asset
├── LeaseFactory.sol       # Lease NFT minting with EIP-712
├── Marketplace.sol        # Sales & lease bidding
└── MetadataStorage.sol    # Metadata management

test/
├── component/             # Unit tests per contract
├── integration/           # Multi-contract workflows
└── offchain/             # Offchain integration tests
```

## Testing Architecture

**Component Tests** (Tier 1): Individual contract validation
- `AssetRegistry.t.sol` - Asset types, registration, events
- `AssetERC20.t.sol` - Token transfers, snapshots, revenue
- `LeaseFactory.t.sol` - Lease minting, signatures, metadata
- `Marketplace.t.sol` - Sales, leases, bidding, revenue

**Integration Tests** (Tier 2-3): Multi-contract workflows
- `Integration.t.sol` - End-to-end asset → lease → revenue flow

**Offchain Tests**: Validates blockchain-to-API integration
- Event processing and indexing
- Hash compatibility (SHA-256 ↔ bytes32)
- JSON metadata synchronization

## Key Features

**Cryptographic Verification**: All metadata, schemas, and legal documents are stored offchain with SHA-256 hashes stored onchain for verification.

**Fractional Ownership**: Each asset is an ERC-20 token. Transfer any amount to represent partial ownership.

**Dual-Signature Leases**: Leases require both lessor and lessee to sign EIP-712 structured data before minting.

**Revenue Snapshots**: Uses ERC20Votes checkpoints for gas-efficient historical balance queries during revenue distribution.

**Event-Driven**: All state changes emit events for offchain indexing and API synchronization.

## Development Notes

- Contracts use Solidity 0.8.30
- Built with Foundry (forge/cast/anvil)
- Uses OpenZeppelin upgradeable contracts
- Role-based access control for admin functions
- 179 tests passing (100% core functionality)
