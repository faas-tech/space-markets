# Asset Leasing Protocol

A decentralized protocol for tokenizing assets, enabling fractional ownership, and facilitating lease agreements with automated revenue distribution.

## Architecture Overview

The Asset Leasing Protocol follows a modular architecture with clear separation of concerns:

### Core Components

- **MetadataStorage**: Abstract base contract providing flexible key-value metadata storage for all protocol entities
- **AssetRegistry**: Central registry for asset types and asset instances, acting as a factory for AssetERC20 deployments
- **AssetERC20**: Per-asset ERC-20 token representing fractional ownership with integrated metadata storage
- **LeaseFactory**: EIP-712 based lease agreement minting system producing ERC-721 NFTs
- **Marketplace**: Decentralized marketplace for asset token sales and lease bidding with automated revenue distribution

### Design Patterns

- **Factory Pattern**: AssetRegistry deploys individual AssetERC20 contracts for each registered asset
- **Inheritance Chain**: All core contracts inherit MetadataStorage for unified metadata handling
- **Access Control**: Role-based permissions using OpenZeppelin's AccessControl throughout
- **Signature Verification**: EIP-712 typed data signing for secure lease agreements
- **Escrow Pattern**: Marketplace holds funds in escrow ensuring atomic exchanges

## Smart Contract Components

### MetadataStorage (Abstract)

**Purpose**: Provides a flexible system for storing arbitrary metadata on-chain.

**Key Features**:

- Hash-based namespace separation for different entities (assets, leases, etc.)
- Key-value pair storage with enumeration support
- Batch operations for setting multiple metadata entries efficiently
- Admin-only modification with public read access

**Key Functions**:

```solidity
function setMetadata(bytes32 hash, Metadata[] calldata metadata) external onlyRole(DEFAULT_ADMIN_ROLE)
function getMetadata(bytes32 hash, string calldata key) external view returns (string memory)
function getAllMetadata(bytes32 hash) external view returns (Metadata[] memory)
function removeMetadata(bytes32 hash, string calldata key) external onlyRole(DEFAULT_ADMIN_ROLE)
```

### AssetRegistry

**Purpose**: Canonical registry for asset types and individual assets. Acts as the factory for deploying AssetERC20 tokens.

**Key Features**:

- Two-tier system: Asset Types (schemas) and Asset Instances
- Automatic ERC-20 deployment on asset registration
- Schema validation for asset types
- Required lease key enforcement per asset type
- Immutable asset records once registered

**Key Functions**:

```solidity
// Define a new asset type with its schema and required lease metadata
function createAsset(
    string calldata name,
    bytes32 schemaHash,
    bytes32[] calldata requiredLeaseKeys,
    Metadata[] calldata metadata
) external onlyRole(DEFAULT_ADMIN_ROLE)

// Register a specific asset instance, deploys AssetERC20 token
function registerAsset(
    bytes32 schemaHash,
    string calldata name,
    string calldata symbol,
    uint256 totalSupply,
    address initialOwner,
    address admin,
    Metadata[] calldata metadata
) external onlyRole(REGISTRAR_ROLE) returns (uint256 assetId, address tokenAddress)

// Query functions
function getType(bytes32 schemaHash) external view returns (AssetType memory)
function getAsset(uint256 id) external view returns (AssetInstance memory)
```

**Access Control**:

- `DEFAULT_ADMIN_ROLE`: Can create asset types and manage roles
- `REGISTRAR_ROLE`: Can register new asset instances

### AssetERC20

**Purpose**: ERC-20 token representing fractional ownership of a single registered asset.

**Key Features**:

- Deployed per asset with immutable `ASSET_ID` linking to AssetRegistry
- Full EIP-2612 support for gasless approvals via `permit()`
- Integrated metadata storage with asset-specific namespace
- Holder tracking via EnumerableSet for efficient enumeration
- Token URI support for NFT marketplace compatibility
- EIP-712 domain separator for signature verification

**Key Functions**:

```solidity
// Get all current token holders and their balances
function getHolders() external view returns (address[] memory holders, uint256[] memory balances)

// Admin-only metadata updates for the asset
function setMetadata(Metadata[] calldata metadata) external onlyRole(DEFAULT_ADMIN_ROLE)

// Get the hash used for this asset's metadata namespace
function getAssetIdHash() public view returns (bytes32)

// Returns URI from metadata if set (key: "tokenURI")
function tokenURI() public view returns (string memory)

// EIP-2612 gasless approval
function permit(
    address owner,
    address spender,
    uint256 value,
    uint256 deadline,
    uint8 v, bytes32 r, bytes32 s
) external
```

**Metadata Integration**:

- Overrides MetadataStorage functions to automatically use asset-specific hash
- Simplified interface without requiring hash parameter for asset metadata

### LeaseFactory

**Purpose**: Creates ERC-721 Lease NFTs using EIP-712 signed agreements between lessors and lessees.

**Key Features**:

- Dual signature requirement (lessor + lessee) for lease creation
- Structured lease data with comprehensive terms
- Deadline-based signature expiry to prevent stale agreements
- Integration with AssetRegistry for asset validation
- Per-lease metadata storage using inherited MetadataStorage
- EIP-712 domain separation for signature security

**Lease Structure**:

```solidity
struct Lease {
    address lessor;           // Asset token holder leasing the asset
    address lessee;           // Party leasing the asset
    uint256 assetId;          // References AssetRegistry
    address paymentToken;     // Token used for rent payments (e.g., USDC)
    uint256 rentAmount;       // Amount per rent period
    uint256 rentPeriod;       // Duration of each rent period (seconds)
    uint256 securityDeposit;  // Upfront deposit amount
    uint64 startTime;         // Lease start timestamp
    uint64 endTime;           // Lease end timestamp
    bytes32 legalDocHash;     // Hash of off-chain legal document
    uint16 termsVersion;      // Protocol terms version
    Metadata[] metadata;      // Additional lease-specific metadata
}

struct LeaseIntent {
    uint256 deadline;              // Signature expiry
    bytes32 assetTypeSchemaHash;   // Asset type from AssetRegistry
    Lease lease;                   // Lease terms
}
```

**Key Functions**:

```solidity
// Mint a lease NFT with dual signatures
function mintLease(
    LeaseIntent calldata L,
    bytes calldata sigLessor,
    bytes calldata sigLessee
) external returns (uint256 tokenId)

// Helper to compute EIP-712 digest for signing
function hashLeaseIntent(LeaseIntent calldata L) public view returns (bytes32)

// Query lease details
function getLease(uint256 tokenId) external view returns (Lease memory)
```

**Security Features**:

- EIP-712 prevents signature replay attacks across chains/contracts
- Deadline enforcement prevents use of stale signatures
- Asset type validation ensures lease references valid asset schema
- Both parties must explicitly sign before lease creation

**Note on Multiple Leases**: The protocol does not prevent multiple simultaneous leases on the same asset. This design choice enables sub-leasing scenarios, which are common in certain asset markets where primary lessees may sub-lease portions of usage rights to other parties.

### Marketplace

**Purpose**: Facilitates asset token sales and lease bidding with stablecoin escrow and automated revenue distribution.

**Two Main Workflows**:

#### 1. Asset Token Sales

- Token holders post listings for their AssetERC20 tokens
- Buyers submit fully-funded bids in stablecoin
- Seller accepts bids, triggering atomic token/payment exchange
- Automatic refund of non-winning bids

#### 2. Lease Marketplace with Revenue Distribution

- Lessors post lease offers with complete terms
- Lessees submit funded bids with their EIP-712 signatures
- Acceptance triggers LeaseFactory minting and revenue distribution
- **Revenue is automatically distributed proportionally to all AssetERC20 token holders**
- Holders claim their share via `claimRevenue()`

**Revenue Distribution Mechanism**:

When a lease bid is accepted:

1. Payment is received from the lessee (e.g., $10,000 USDC)
2. Marketplace queries AssetERC20 for all current token holders
3. Revenue is allocated proportionally based on token balances
4. Each holder can call `claimRevenue()` to receive their share
5. Example: If Alice owns 30% of tokens, she receives $3,000

**Key Functions**:

```solidity
// Asset Sales
function postSale(
    address assetToken,
    uint256 amount,
    uint256 askPrice
) external returns (uint256 saleId)

function placeSaleBid(
    uint256 saleId,
    uint256 amount,
    uint256 pricePerUnit
) external returns (uint256 bidIndex)

function acceptSaleBid(uint256 saleId, uint256 bidIndex) external

// Lease Marketplace
function postLeaseOffer(
    LeaseFactory.LeaseIntent calldata L
) external returns (uint256 offerId)

function placeLeaseBid(
    uint256 offerId,
    bytes calldata sigLessee,
    uint256 amount
) external returns (uint256 bidIndex)

function acceptLeaseBid(
    uint256 offerId,
    uint256 bidIndex,
    bytes calldata sigLessor
) external returns (uint256 leaseTokenId)

// Revenue Claims
function claimRevenue() external returns (uint256 amount)
function getClaimableRevenue(address user) external view returns (uint256)
```

**Access Control**:

- `DEFAULT_ADMIN_ROLE`: Can set fees and manage marketplace parameters
- `ADMIN_ROLE`: Can pause/unpause marketplace operations

**Security Features**:

- Escrow pattern holds funds until acceptance or cancellation
- Automatic refunds on bid rejection
- Atomic swaps prevent partial executions
- Revenue distribution snapshot at acceptance time prevents manipulation

## Technical Implementation Details

### Access Control Hierarchy

- **DEFAULT_ADMIN_ROLE**: Root admin for all contracts, can grant/revoke roles
- **REGISTRAR_ROLE**: Can register new assets in AssetRegistry
- **ADMIN_ROLE**: Marketplace-specific administration (fees, pausing)

### Token Standards Used

- **ERC-20**: Fractional asset ownership (AssetERC20)
- **ERC-721**: Lease agreement NFTs (LeaseFactory)
- **EIP-712**: Structured data signing for lease agreements
- **EIP-2612**: Permit functionality in AssetERC20 for gasless approvals

### Metadata Architecture

The protocol uses a three-tier metadata system:

1. **On-chain storage**: Key-value pairs via MetadataStorage inherited by all contracts
2. **Hash verification**: Cryptographic hashes (SHA-256, keccak256) for document verification
3. **Off-chain storage**: Full documents on IPFS or centralized storage, referenced by hash

**Hash-based Namespacing**:

- Asset types: `keccak256(abi.encode(schemaHash))`
- Asset instances: `keccak256(abi.encode(assetId))`
- Lease NFTs: `keccak256(abi.encode(tokenId))`

This ensures complete data isolation between different entities.

### Security Considerations

- **Battle-tested implementations**: All token logic uses OpenZeppelin contracts
- **Signature replay prevention**: EIP-712 domain separation across chains and contracts
- **Access control**: Granular role-based permissions prevent unauthorized modifications
- **Escrow pattern**: Marketplace holds funds ensuring atomic exchanges
- **Deadline enforcement**: All signatures expire, preventing stale agreement execution
- **Immutable records**: Asset registration and lease terms cannot be modified after creation

## Deployment Guide

### Prerequisites

- Foundry toolkit installed (`curl -L https://foundry.paradigm.xyz | bash && foundryup`)
- Node.js 18+ for off-chain services (optional)
- Access to Ethereum RPC endpoint (Infura, Alchemy, or local node)
- Admin wallet with deployment funds

### Deployment Order

1. **Deploy AssetRegistry** with admin addresses
2. **Deploy LeaseFactory** pointing to AssetRegistry address
3. **Deploy Marketplace** with stablecoin address and LeaseFactory address
4. **Grant appropriate roles** to operators (REGISTRAR_ROLE, ADMIN_ROLE)

### Integration Points

#### For Asset Issuers

1. Request `REGISTRAR_ROLE` from protocol admin
2. Create asset type with schema hash via `createAsset()`
3. Register asset instance via `registerAsset()` to receive deployed AssetERC20 address
4. Set metadata including `tokenURI` for marketplace display
5. Distribute or sell tokens to investors

#### For Marketplace Operators

1. Deploy or connect to existing stablecoin (USDC, USDT, DAI)
2. Configure marketplace with proper contract addresses
3. Monitor events for off-chain indexing and UI updates
4. Implement frontend for user interactions with marketplace
5. Set marketplace fees via admin functions if needed

#### For Lease Participants

**Lessors** (Asset token holders):

1. Create `LeaseIntent` with comprehensive terms
2. Sign lease terms with EIP-712 signature
3. Post lease offer on marketplace or provide signature to lessee
4. Accept bids to trigger lease minting and revenue distribution

**Lessees** (Renters):

1. Review lease terms from lessor
2. Sign lease terms with EIP-712 signature
3. Submit funded bid to marketplace
4. Receive lease NFT upon acceptance

## Detailed Workflow Examples

### Complete Asset Lifecycle

```solidity
// 1. Admin creates asset type (e.g., "Satellite" asset class)
bytes32 schemaHash = keccak256(abi.encode(assetSchema));
bytes32[] memory requiredKeys = new bytes32[](2);
requiredKeys[0] = keccak256("orbitHeight");
requiredKeys[1] = keccak256("frequency");

registry.createAsset(
    "Satellite",
    schemaHash,
    requiredKeys,
    schemaMetadata
);

// 2. Registrar registers specific satellite asset
MetadataStorage.Metadata[] memory assetMetadata = new MetadataStorage.Metadata[](3);
assetMetadata[0] = MetadataStorage.Metadata("name", "SAT-001");
assetMetadata[1] = MetadataStorage.Metadata("orbitHeight", "550km");
assetMetadata[2] = MetadataStorage.Metadata("frequency", "10.7-12.7GHz");

(uint256 assetId, address tokenAddr) = registry.registerAsset(
    schemaHash,
    "Satellite SAT-001",
    "SAT1",
    1_000_000 * 1e18,  // 1M tokens, 18 decimals
    owner,
    owner,
    assetMetadata
);

// 3. Owner distributes fractional ownership
AssetERC20 assetToken = AssetERC20(tokenAddr);
assetToken.transfer(investor1, 300_000 * 1e18); // 30% ownership
assetToken.transfer(investor2, 200_000 * 1e18); // 20% ownership
// Owner retains 50%

// 4. Create lease agreement for the satellite
LeaseFactory.Lease memory lease = LeaseFactory.Lease({
    lessor: owner,
    lessee: spaceCompany,
    assetId: assetId,
    paymentToken: USDC_ADDRESS,
    rentAmount: 50_000 * 1e6,      // $50,000 USDC per period
    rentPeriod: 30 days,
    securityDeposit: 100_000 * 1e6, // $100,000 USDC deposit
    startTime: uint64(block.timestamp),
    endTime: uint64(block.timestamp + 365 days),
    legalDocHash: keccak256(abi.encodePacked(legalDocument)),
    termsVersion: 1,
    metadata: leaseMetadata
});

LeaseFactory.LeaseIntent memory intent = LeaseFactory.LeaseIntent({
    deadline: block.timestamp + 7 days,
    assetTypeSchemaHash: schemaHash,
    lease: lease
});

// 5. Both parties sign (off-chain EIP-712 signing)
bytes32 digest = leaseFactory.hashLeaseIntent(intent);
bytes memory sigLessor = signEIP712(digest, lessorPrivateKey);
bytes memory sigLessee = signEIP712(digest, lesseePrivateKey);

// 6. Mint lease NFT
uint256 leaseTokenId = leaseFactory.mintLease(intent, sigLessor, sigLessee);
// leaseTokenId is now an ERC-721 NFT representing the lease agreement
```

### Marketplace Revenue Distribution Flow

```solidity
// 1. Lessor posts lease offer on marketplace
LeaseFactory.LeaseIntent memory offer = /* ... lease terms ... */;
uint256 offerId = marketplace.postLeaseOffer(offer);

// 2. Multiple lessees place funded bids
// Lessee 1 bids $500,000 for the year
USDC.approve(address(marketplace), 500_000 * 1e6);
marketplace.placeLeaseBid(offerId, sigLessee1, 500_000 * 1e6);

// Lessee 2 bids $600,000 (better offer)
USDC.approve(address(marketplace), 600_000 * 1e6);
marketplace.placeLeaseBid(offerId, sigLessee2, 600_000 * 1e6);

// 3. Lessor reviews and accepts the best bid
uint256 leaseTokenId = marketplace.acceptLeaseBid(offerId, 1, sigLessor);

// 4. Revenue automatically distributed to ALL token holders at acceptance
// Current token distribution:
// - Owner: 500,000 tokens (50%) → $300,000
// - Investor1: 300,000 tokens (30%) → $180,000
// - Investor2: 200,000 tokens (20%) → $120,000

// 5. Each holder claims their proportional share
marketplace.claimRevenue(); // Owner claims $300,000
// Investor1 calls marketplace.claimRevenue() to claim $180,000
// Investor2 calls marketplace.claimRevenue() to claim $120,000

// 6. Lessee 1's bid is automatically refunded $500,000
```

### Asset Token Sale on Marketplace

```solidity
// 1. Token holder posts sale listing
assetToken.approve(address(marketplace), 100_000 * 1e18);
uint256 saleId = marketplace.postSale(
    address(assetToken),
    100_000 * 1e18,  // Selling 10% ownership
    2 * 1e18         // $2 per token
);

// 2. Buyers place bids
USDC.approve(address(marketplace), 180_000 * 1e6);
marketplace.placeSaleBid(saleId, 90_000 * 1e18, 2 * 1e18); // $180,000 total

USDC.approve(address(marketplace), 210_000 * 1e6);
marketplace.placeSaleBid(saleId, 100_000 * 1e18, 2.1 * 1e18); // $210,000 total (better)

// 3. Seller accepts the better bid
marketplace.acceptSaleBid(saleId, 1);
// Buyer receives 100,000 tokens
// Seller receives $210,000 USDC
// First bidder's $180,000 is automatically refunded
```

## Events and Off-Chain Indexing

### Key Events to Monitor

```solidity
// AssetRegistry
event AssetTypeCreated(bytes32 indexed schemaHash, string name)
event AssetRegistered(uint256 indexed assetId, bytes32 indexed schemaHash, address tokenAddress)

// LeaseFactory
event LeaseMinted(uint256 indexed tokenId, address indexed lessor, address indexed lessee, uint256 assetId)

// Marketplace
event SalePosted(uint256 indexed saleId, address indexed seller, address assetToken)
event SaleBidPlaced(uint256 indexed saleId, uint256 bidIndex, address indexed bidder)
event SaleBidAccepted(uint256 indexed saleId, uint256 bidIndex)

event LeaseOfferPosted(uint256 indexed offerId, address indexed lessor)
event LeaseBidPlaced(uint256 indexed offerId, uint256 bidIndex, address indexed lessee)
event LeaseBidAccepted(uint256 indexed offerId, uint256 bidIndex, uint256 leaseTokenId)

event RevenueClaimed(address indexed user, uint256 amount)
```

### Off-Chain Integration

For production deployments, implement off-chain services to:

1. **Index blockchain events** into a database for fast queries
2. **Store full documents** (PDFs, legal agreements) on IPFS or S3
3. **Verify document hashes** match on-chain stored hashes
4. **Monitor lease lifecycles** (start dates, end dates, payment schedules)
5. **Notify users** of bid acceptances, revenue claims, lease expirations
6. **Provide REST APIs** for frontend applications

## Development

### Build and Test

```bash
# Install dependencies
forge install

# Build contracts
forge build

# Run all tests
forge test

# Run specific test file
forge test --match-path test/MarketplaceFlow.t.sol

# Run with verbosity for debugging
forge test -vvvv

# Generate coverage report
forge coverage

# Format code
forge fmt
```

### Local Development

```bash
# Start local Anvil chain
anvil

# Deploy to local chain
forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast

# Verify contracts (on testnet/mainnet)
forge verify-contract <CONTRACT_ADDRESS> <CONTRACT_NAME> --chain <CHAIN_ID>
```

## Repository Structure

```
src/
├── MetadataStorage.sol      # Abstract base for key-value metadata
├── AssetRegistry.sol         # Asset type and instance registry + factory
├── AssetERC20.sol           # Per-asset ERC-20 fractional ownership token
├── LeaseFactory.sol         # EIP-712 lease agreement minting (ERC-721)
└── Marketplace.sol          # Sales and lease bidding with revenue distribution

test/
├── AssetERC20Simple.t.sol   # Unit tests for asset tokens
├── AssetFlow.t.sol          # Integration tests for asset lifecycle
├── MarketplaceFlow.t.sol    # End-to-end marketplace scenarios
├── MetadataStorage.t.sol    # Metadata system validation
└── mocks/
    └── MockStablecoin.sol   # ERC-20 stablecoin for testing

script/
└── Deploy.s.sol             # Deployment scripts
```

## License

MIT

## Contributing

Contributions are welcome. Please submit issues and pull requests on the repository.

## Security

This protocol handles real-world assets and financial transactions. A professional security audit is strongly recommended before mainnet deployment.

**Note**: This is experimental software. Use at your own risk.
