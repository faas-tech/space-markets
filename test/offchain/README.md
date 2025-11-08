# Asset Leasing Protocol - Web2 Developer Toolkit

> **Make blockchain as easy as Express.js**

Simple, well-documented infrastructure for building Web2 applications on top of the Asset Leasing Protocol. No blockchain expertise required!

---

## 🚀 Quick Start (30 seconds)

```bash
# 1. Install dependencies
npm install

# 2. Start Anvil (local blockchain)
npm run anvil

# 3. Run the demo (in a new terminal)
npm run demo
```

**That's it!** You just registered an asset, created a lease, and distributed revenue on blockchain. 🎉

---

## 🎯 What You Get

### For Web2 Developers

- **Simple Services** - Call methods like any REST API:
  ```typescript
  const asset = await assetService.registerAsset(metadata, 'satellite', ...);
  console.log('Asset ID:', asset.assetId);
  ```

- **No Blockchain Complexity** - We handle:
  - Gas estimation
  - Transaction retries
  - Event parsing
  - Error handling

- **Educational Output** - Every operation explains what's happening:
  ```
  ▶ Registering asset: Satellite Alpha
    [1/4] Converting metadata...
      ✓ Converted to 23 key-value pairs
    [2/4] Submitting transaction...
      ✓ Transaction confirmed: 0x1a2b3c...
    ...
  ```

- **Mock Everything** - Test without deploying:
  - MockDatabase (in-memory, swap for PostgreSQL later)
  - MockCache (in-memory, swap for Redis later)
  - Local blockchain (Anvil)

---

## 📚 Architecture

```
┌─────────────────────────────────────────┐
│         Your Application                 │
│    (React, Node.js, whatever!)          │
└─────────────────────────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
        ▼                   ▼
┌───────────────┐   ┌───────────────┐
│   Services    │   │     CLI       │
│ (Easy APIs)   │   │   (Demos)     │
└───────────────┘   └───────────────┘
        │
    ┌───┴───┬───────┬──────┐
    ▼       ▼       ▼      ▼
┌────────┐ ┌────┐ ┌────┐ ┌────┐
│Blockchain│Database│Cache│ etc.│
└────────┘ └────┘ └────┘ └────┘
```

**Key Design**: Simple services hide all complexity. Just call methods!

---

## 🛠️ Core Services

### AssetService
Register and manage assets:

```typescript
import { AssetService } from './src/services/asset-service.js';

const service = new AssetService(blockchain, database, cache);

// Register an asset
const result = await service.registerAsset(
  metadata,
  'satellite',
  'My Satellite Token',
  'SAT',
  ethers.parseEther('1000000')
);

// Get token holders
const holders = await service.getHolders(assetId);

// Get asset details
const asset = await service.getAsset(assetId);
```

### LeaseService
Create and manage leases:

```typescript
import { LeaseService } from './src/services/lease-service.js';

const service = new LeaseService(blockchain, database, cache);

// Create a lease offer
const lease = await service.createLeaseOffer(assetId, lessor, terms);

// Get lease details
const details = await service.getLease(leaseId);
```

### MarketplaceService
Handle offers and bids:

```typescript
import { MarketplaceService } from './src/services/marketplace-service.js';

const service = new MarketplaceService(blockchain, database, cache);

// Place a bid
const bid = await service.placeBid(offerId, amount, bidder);

// Accept a bid
await service.acceptBid(offerId, bidIndex, signature);
```

### RevenueService
Distribute revenue to token holders:

```typescript
import { RevenueService } from './src/services/revenue-service.js';

const service = new RevenueService(blockchain, database, cache);

// Open revenue round
const round = await service.openRevenueRound(tokenAddress, amount);

// Claim revenue
await service.claimRevenue(tokenAddress, roundId, claimer);
```

---

## 📖 Examples

### Complete Workflow

```typescript
// 1. Setup
const blockchain = new BlockchainClient({ rpcUrl, privateKey });
await blockchain.connect();

const manager = new ContractManager(blockchain);
await manager.deployAll();

const database = new MockDatabase();
await database.connect();

const cache = new Cache();

// 2. Initialize services
const assetService = new AssetService(blockchain, database, cache);
const leaseService = new LeaseService(blockchain, database, cache);
const revenueService = new RevenueService(blockchain, database, cache);

// 3. Create asset type
await assetService.createAssetType('Satellite', 'satellite');

// 4. Register asset
const asset = await assetService.registerAsset(metadata, 'satellite', ...);

// 5. Create lease
const lease = await leaseService.createLeaseOffer(asset.assetId, ...);

// 6. Distribute revenue
const round = await revenueService.openRevenueRound(asset.tokenAddress, amount);

// Done! 🎉
```

### Just Want to Query Data?

```typescript
// Simple reads - no transactions needed
const blockchain = new BlockchainClient({ rpcUrl, privateKey });
await blockchain.connect();

// Load existing contracts
const manager = new ContractManager(blockchain);
await manager.loadDeployment('./deployments/local.json');

// Query data
const assetService = new AssetService(blockchain, database, cache);
const holders = await assetService.getHolders('1');
const asset = await assetService.getAsset('1');

console.log('Asset:', asset);
console.log('Holders:', holders);
```

---

## 🗂️ Project Structure

```
test/offchain/
├── README.md                    # You are here!
├── package.json                 # Dependencies & scripts
│
├── src/
│   ├── core/                    # Core blockchain infrastructure
│   │   ├── blockchain-client.ts # Simple ethers.js wrapper
│   │   ├── contract-manager.ts  # Deploy & load contracts
│   │   ├── anvil-manager.ts     # Local blockchain management
│   │   └── event-processor.ts   # Real-time event monitoring
│   │
│   ├── services/                # Business logic (USE THESE!)
│   │   ├── asset-service.ts     # Asset management
│   │   ├── lease-service.ts     # Lease management
│   │   ├── marketplace-service.ts # Marketplace operations
│   │   └── revenue-service.ts   # Revenue distribution
│   │
│   ├── storage/                 # Data storage abstractions
│   │   ├── database.ts          # Database interface + mock
│   │   └── cache.ts             # Cache with TTL
│   │
│   ├── utils/                   # Utility functions
│   │   ├── schema-hash.ts       # Schema hashing
│   │   ├── metadata-converter.ts # JSON ↔ onchain format
│   │   └── validation.ts        # Data validation
│   │
│   ├── types/                   # TypeScript types
│   │   └── index.ts             # All type definitions
│   │
│   └── config/                  # Configuration
│       └── index.ts             # App configuration
│
├── demos/                       # Educational demos
│   ├── simple-complete-demo.ts  # Complete workflow (START HERE!)
│   ├── 01-simple-workflow.ts    # Basic asset registration
│   └── 05-complete-system.ts    # Full end-to-end demo
│
├── tests/                       # Test suites
│   ├── unit/                    # Unit tests
│   ├── integration/             # Integration tests
│   └── e2e/                     # End-to-end tests
│
└── data/                        # Sample data
    └── assets/                  # Asset metadata samples
        └── ocs-primary.json     # Example asset
```

---

## 🔧 Configuration

Edit `src/config/index.ts` or set environment variables:

```typescript
export const defaultConfig = {
  rpcUrl: 'http://localhost:8545',  // Anvil default
  chainId: 31337,                    // Anvil default
  privateKey: '0xac0974...',         // Anvil account #0

  useMockDatabase: true,              // Use in-memory database
  useMockCache: true,                 // Use in-memory cache

  deploymentsDir: './deployments',
  dataDir: './data'
};
```

---

## 📝 Available Scripts

```bash
# Demos
npm run demo              # Run simple complete demo (recommended!)
npm run demo:simple       # Run basic workflow
npm run demo:complete     # Run full system demo

# Testing
npm test                  # Run all tests
npm run test:watch        # Watch mode
npm run test:coverage     # Coverage report

# Development
npm run anvil             # Start local blockchain
npm run clean             # Clean build artifacts
```

---

## 🎓 Learn More

### New to Blockchain?

1. **Start with the demo**: `npm run demo`
2. **Read the output** - it explains everything!
3. **Look at the code** - it's simple and well-documented
4. **Try modifying** - change values and see what happens

### Want to Build an App?

1. **Copy `simple-complete-demo.ts`** as your starting point
2. **Use the services** - they handle all the complexity
3. **Store data** - use the database abstraction
4. **Deploy when ready** - swap mocks for real services

### Advanced Topics

- **Custom contracts?** Use `BlockchainClient` directly
- **Real database?** Implement the `Database` interface
- **Real cache?** Implement the `Cache` interface
- **Custom events?** Use `EventProcessor`

---

## 🔍 Key Concepts

### Services Hide Complexity

**Bad** (doing it yourself):
```typescript
const contract = new ethers.Contract(address, abi, wallet);
const gasEstimate = await contract.registerAsset.estimateGas(...);
const tx = await contract.registerAsset(..., { gasLimit: gasEstimate * 1.2 });
const receipt = await tx.wait();
const event = receipt.logs.find(...);
// ... lots of error handling
```

**Good** (using services):
```typescript
const result = await assetService.registerAsset(metadata, 'satellite', ...);
console.log('Asset ID:', result.assetId);
// That's it! Gas, retries, events all handled.
```

### Educational Output

Every operation logs what's happening:

```
▶ Registering asset: Satellite Alpha
  [1/4] Converting metadata to onchain format...
    ✓ Converted to 23 key-value pairs
  [2/4] Submitting registration transaction...
    ✓ Transaction confirmed: 0x1a2b3c...
    ✓ Block: 12345
    ✓ Gas used: 3245789
  [3/4] Parsing events...
    ✓ Asset ID: 1
    ✓ Token Address: 0xdef123...
  [4/4] Storing in database...
    ✓ Asset stored in database

✅ Asset registration complete!
```

### Dependency Injection

Services are composable:

```typescript
// Create dependencies
const blockchain = new BlockchainClient(config);
const database = new MockDatabase();  // or PostgresDatabase()
const cache = new Cache();            // or RedisCache()

// Inject them into services
const assetService = new AssetService(blockchain, database, cache);

// Easy to test, easy to swap implementations
```

---

## 🐛 Troubleshooting

### Anvil not running?

```bash
# Start Anvil in a separate terminal
npm run anvil

# Or manually:
anvil --port 8545
```

### Connection refused?

Make sure Anvil is running on port 8545.

### Transaction failed?

Check the educational output - it explains what went wrong.

### Out of gas?

The `BlockchainClient` automatically adds a 20% gas buffer. If you still see this, the transaction is failing for another reason.

---

## 📊 What's Different from v1.0?

### v1.0 (Old)
- Scattered test files
- Complex setup
- No clear entry point
- Minimal documentation
- Tightly coupled code

### v2.0 (New) ✨
- **Simple services** - easy to use
- **Clear architecture** - well organized
- **Great docs** - you're reading them!
- **Educational output** - learn as you go
- **Production ready** - swap mocks for real services

---

## 🎯 Philosophy

### 1. **Simple by Default**
No blockchain expertise required. Just call methods.

### 2. **Educational Always**
Every operation explains what's happening.

### 3. **Production Ready**
Start with mocks, swap to real services when ready.

### 4. **Well Documented**
Every file has clear comments and examples.

---

## 🤝 Contributing

Want to add a feature? Here's how:

1. **Services** - Add to `src/services/`
2. **Storage** - Implement interfaces in `src/storage/`
3. **Demos** - Add to `demos/`
4. **Tests** - Add to `tests/`

Keep it simple. Keep it documented. Keep it educational.

---

## 📄 License

Same as the main Asset Leasing Protocol repository.

---

## 🚀 Next Steps

1. **Run the demo**: `npm run demo`
2. **Read the code** in `demos/simple-complete-demo.ts`
3. **Try the services** - they're in `src/services/`
4. **Build something!** Use this as your foundation

---

**Questions?** Open an issue or check the inline documentation.

**Happy building!** 🎉
