# Asset Leasing Protocol - Web2 Developer Toolkit

> **Make blockchain as easy as Express.js**

Simple, well-documented infrastructure for building Web2 applications on top of the Asset Leasing Protocol. No blockchain expertise required!

**Version 2.0** with X402 streaming payments integration.

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

- **X402 Streaming Payments** - HTTP 402-based micropayments:
  - Per-second payment streaming
  - Batch payment modes
  - Mock facilitator for local development

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
│  REST API     │   │  CLI Demos    │
│  (Express)    │   │  (Scripts)    │
└───────────────┘   └───────────────┘
        │                   │
    ┌───┴───┬───────┬──────┴──┬──────┐
    ▼       ▼       ▼         ▼      ▼
┌────────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐
│Services││X402││DB  ││Cache││Blockchain│
└────────┘ └────┘ └────┘ └────┘ └────┘
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

## 💳 X402 Streaming Payments (New!)

### What is X402?

X402 is an HTTP 402 Payment Required-based protocol for streaming micropayments. Perfect for pay-per-use access to leased assets.

### Payment Modes

- **`second`** - Pay per second of access (default)
- **`batch-5s`** - Batched payments every 5 seconds (more efficient)

### How It Works

```
┌──────────┐                ┌──────────┐                ┌────────────┐
│  Client  │                │ API Server│                │Facilitator │
└──────────┘                └──────────┘                └────────────┘
      │                           │                            │
      │ 1. POST /api/leases/:id/access                        │
      ├──────────────────────────>│                            │
      │                           │                            │
      │ 2. 402 Payment Required   │                            │
      │<──────────────────────────┤                            │
      │   {paymentRequirements}   │                            │
      │                           │                            │
      │ 3. POST with X-PAYMENT header                         │
      ├──────────────────────────>│                            │
      │                           │ 4. Verify Payment          │
      │                           ├───────────────────────────>│
      │                           │                            │
      │                           │ 5. Verification Response   │
      │                           │<───────────────────────────┤
      │                           │                            │
      │                           │ 6. Settle Payment          │
      │                           ├───────────────────────────>│
      │                           │                            │
      │ 7. 200 OK + Access Granted│                            │
      │<──────────────────────────┤                            │
```

### X402 Service Usage

```typescript
import { X402PaymentService } from './src/x402/payment-service.js';

const x402Service = new X402PaymentService(config);

// Build payment requirements
const requirements = x402Service.buildPaymentRequirements(
  leaseId,
  'second',  // or 'batch-5s'
  leaseTerms
);

// Client encodes payment header
const header = encodePaymentHeader({
  payer: '0x...',
  amount: requirements.maxAmountRequired,
  txHash: '0x...',
  issuedAt: new Date().toISOString()
});

// Server verifies payment
const result = await facilitatorClient.verifyPayment(payment);
```

### Configuration

```typescript
// src/config/index.ts
export const defaultConfig = {
  // ... other config
  x402: {
    enabled: true,
    facilitatorUrl: 'https://api.x402.xyz/facilitator',
    network: 'base-sepolia',  // or 'base-mainnet'
    usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bda02913',
    usdcDecimals: 6,
    verifyOptimistically: true,
    paymentModes: ['second', 'batch-5s'],
    defaultPaymentMode: 'second',
    useMockFacilitator: true  // Use mock for local development
  }
};
```

### Environment Variables

```bash
X402_FACILITATOR_URL=https://api.x402.xyz/facilitator
X402_NETWORK=base-sepolia
X402_USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bda02913
X402_USE_MOCK=false
```

---

## 🌐 REST API Server

### Starting the API Server

```bash
# Full system (Anvil + Contracts + API)
cd test/offchain
npm run anvil  # Terminal 1
tsx scripts/start-full-system.ts --keep-running  # Terminal 2
```

Or standalone (mock data only):

```bash
tsx src/api/standalone-server.ts --port 3000
```

### Available Endpoints

#### Asset Endpoints
- `GET /api/assets` - List all assets
- `GET /api/assets/:assetId` - Get specific asset
- `POST /api/assets` - Register new asset

#### Lease Endpoints
- `GET /api/leases` - List all leases
- `GET /api/leases/:leaseId` - Get specific lease
- `POST /api/leases` - Create lease offer
- `POST /api/leases/:leaseId/access` - **X402 streaming payment endpoint**
- `POST /api/leases/:leaseId/prefund` - **Prefund wallet for X402**
- `GET /api/leases/:leaseId/x402/requirements` - **Get payment requirements**

#### Blockchain Endpoints
- `GET /api/blockchain/network` - Network information
- `GET /api/blockchain/contracts` - Deployed contract addresses
- `POST /api/blockchain/deploy` - Deploy contracts

#### System Endpoints
- `GET /api/system/status` - System health and status
- `POST /api/system/reset` - Reset system state (dev only)

### Example API Usage

```bash
# Health check
curl http://localhost:3000/health

# Get all assets
curl http://localhost:3000/api/assets

# Get payment requirements
curl http://localhost:3000/api/leases/LEASE-001/x402/requirements?mode=second

# Access with X402 payment
curl -X POST http://localhost:3000/api/leases/LEASE-001/access \
  -H "X-PAYMENT: eyJwYXllciI6IjB4Li4uIiwiYW1vdW50IjoiMTAwMCJ9"
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

### X402 Payment Stream

```typescript
// Client-side streaming payment
const leaseId = 'LEASE-DEMO-001';
const durationSeconds = 60;
const intervalMs = 1000;  // Per second

for (let i = 0; i < durationSeconds; i++) {
  // Get payment requirements
  const unpaidResponse = await fetch(
    `${apiBase}/api/leases/${leaseId}/access?mode=second`,
    { method: 'POST' }
  );

  if (unpaidResponse.status === 402) {
    const { paymentRequirements } = await unpaidResponse.json();

    // Encode payment
    const header = encodePaymentHeader({
      payer: '0x...',
      amount: paymentRequirements.maxAmountRequired,
      txHash: generateTxHash(),
      issuedAt: new Date().toISOString()
    });

    // Retry with payment
    const paidResponse = await fetch(
      `${apiBase}/api/leases/${leaseId}/access?mode=second`,
      {
        method: 'POST',
        headers: { 'X-PAYMENT': header }
      }
    );

    console.log('Payment accepted:', await paidResponse.json());
  }

  await delay(intervalMs);
}
```

---

## 🗂️ Project Structure

```
test/offchain/
├── README.md                    # You are here!
├── package.json                 # Dependencies & scripts
├── tsconfig.json                # TypeScript configuration
├── vitest.config.ts            # Test runner configuration
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
│   ├── x402/                    # X402 streaming payments (NEW!)
│   │   ├── payment-service.ts   # Build payment quotes
│   │   ├── facilitator-client.ts # Verify & settle payments
│   │   ├── amounts.ts           # Amount calculations
│   │   └── constants.ts         # X402 protocol constants
│   │
│   ├── api/                     # REST API server
│   │   ├── server.ts            # Express server with all routes
│   │   └── standalone-server.ts # Standalone server script
│   │
│   ├── testing/                 # Test infrastructure
│   │   ├── contract-deployer.ts # Deploy contracts for tests
│   │   ├── integration-test-suite.ts # Full-stack tests
│   │   ├── event-listener.ts    # Event monitoring
│   │   ├── mock-services.ts     # Mock services
│   │   └── test-runner.ts       # Test utilities
│   │
│   ├── storage/                 # Data storage abstractions
│   │   ├── database.ts          # Database interface + MockDatabase
│   │   └── cache.ts             # In-memory cache with TTL
│   │
│   ├── utils/                   # Utility functions
│   │   ├── schema-hash.ts       # Schema hashing
│   │   ├── metadata-converter.ts # JSON ↔ onchain format
│   │   ├── validation.ts        # Data validation
│   │   ├── crypto.ts            # Cryptographic utilities
│   │   ├── file-storage.ts      # Document storage
│   │   ├── cli-output.ts        # Pretty console output
│   │   └── test-data-factory.ts # Generate test data
│   │
│   ├── types/                   # TypeScript types
│   │   ├── index.ts             # Core type definitions
│   │   └── x402.ts              # X402-specific types
│   │
│   └── config/                  # Configuration
│       └── index.ts             # App configuration with X402
│
├── demos/                       # Educational demos
│   ├── simple-complete-demo.ts  # Complete workflow (START HERE!)
│   ├── 01-simple-workflow.ts    # Basic asset registration
│   ├── 05-complete-system.ts    # Full end-to-end demo
│   └── x402-second-stream.ts    # X402 streaming payment demo (NEW!)
│
├── scripts/                     # Utility scripts
│   ├── start-full-system.ts     # Start complete system
│   ├── deploy-refactored.ts     # Contract deployment
│   ├── generate-sample-data.ts  # Create test data
│   ├── hash-metadata.ts         # Generate metadata hashes
│   ├── sync-deployment.ts       # Sync deployment state
│   ├── test-register-asset.ts   # Asset registration test
│   ├── validate-schemas.ts      # Schema validation
│   └── demo-workflow.ts         # Workflow demonstration
│
├── tests/                       # Test suites (Vitest)
│   ├── integration.test.ts      # Full blockchain integration
│   ├── enhanced-flow.test.ts    # Enhanced workflow tests
│   ├── simple.test.ts           # Basic smoke tests
│   ├── api-integration.test.ts  # API endpoint tests
│   ├── crypto-hash.test.ts      # Hash validation tests
│   └── x402-streaming.test.ts   # X402 payment tests (NEW!)
│
├── data/                        # Sample data
│   ├── assets/                  # Asset metadata samples
│   │   ├── ocs-primary.json     # Orbital Compute Station
│   │   ├── ors-gateway.json     # Orbital Relay Station
│   │   ├── satellite-alpha-1.json
│   │   └── satellite-beta-2.json
│   ├── leases/                  # Lease samples
│   └── revenue/                 # Revenue distribution samples
│
└── archived/                    # Deprecated code (reference only)
```

---

## 🔧 Configuration

Edit `src/config/index.ts` or set environment variables:

```typescript
export const defaultConfig = {
  // Network configuration
  rpcUrl: 'http://localhost:8545',  // Anvil default
  chainId: 31337,                    // Anvil default
  privateKey: '0xac0974...',         // Anvil account #0

  // Service configuration
  useMockDatabase: true,             // Use in-memory database
  useMockCache: true,                // Use in-memory cache

  // API configuration
  apiPort: 3000,                     // API server port
  apiHost: 'localhost',              // API server host

  // File paths
  deploymentsDir: './deployments',
  dataDir: './data',

  // X402 Streaming Payments (NEW!)
  x402: {
    enabled: true,
    facilitatorUrl: 'https://api.x402.xyz/facilitator',
    network: 'base-sepolia',         // or 'base-mainnet'
    usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bda02913',
    usdcDecimals: 6,
    verifyOptimistically: true,
    paymentModes: ['second', 'batch-5s'],
    defaultPaymentMode: 'second',
    useMockFacilitator: true         // Use mock for local dev
  }
};
```

---

## 📝 Available Scripts

```bash
# Demos
npm run demo              # Run simple complete demo (recommended!)
npm run demo:simple       # Run basic workflow
npm run demo:complete     # Run full system demo (with marketplace)
npm run demo:x402         # X402 streaming payment demo (NEW!)

# Testing
npm test                  # Run all tests
npm run test:watch        # Watch mode for development
npm run test:coverage     # Generate coverage report

# Development
npm run anvil             # Start local blockchain (Anvil)
npm run clean             # Clean build artifacts and output
```

---

## 🧪 Running Tests

### Quick Test

```bash
# Run all tests once
npm test
```

### Test Development

```bash
# Watch mode (re-runs on file changes)
npm run test:watch

# Coverage report
npm run test:coverage
```

### Full System Integration Test

```bash
# Terminal 1: Start Anvil
npm run anvil

# Terminal 2: Run integration tests
npm test tests/integration.test.ts
```

### X402 Payment Tests

```bash
# Terminal 1: Start Anvil
npm run anvil

# Terminal 2: Start full system
tsx scripts/start-full-system.ts --keep-running

# Terminal 3: Run X402 tests
npm test tests/x402-streaming.test.ts

# Or run the X402 demo
npm run demo:x402
```

### Test Structure

All test files are in `tests/`:
- **integration.test.ts** - Full blockchain workflow tests
- **enhanced-flow.test.ts** - Complex multi-step scenarios
- **simple.test.ts** - Basic smoke tests
- **api-integration.test.ts** - REST API endpoint tests
- **crypto-hash.test.ts** - Hash and crypto utilities
- **x402-streaming.test.ts** - X402 payment protocol tests

---

## 🚀 Complete System Startup Guide

### Option 1: Full System (Recommended for X402 Testing)

```bash
# Terminal 1: Start Anvil blockchain
cd test/offchain
npm run anvil

# Terminal 2: Start full system (API + contracts + event listeners)
cd test/offchain
tsx scripts/start-full-system.ts --keep-running

# System will be ready at:
# - Blockchain: http://localhost:8545
# - API Server: http://localhost:3001
# - Mock Database: In-memory

# Terminal 3: Run X402 streaming demo
cd test/offchain
npm run demo:x402
```

### Option 2: Simple Demo (No API Server)

```bash
# Terminal 1: Start Anvil
cd test/offchain
npm run anvil

# Terminal 2: Run demo
cd test/offchain
npm run demo
# or
npm run demo:complete
```

### Option 3: Standalone API Server (No Blockchain)

```bash
# Run API with mock data only
tsx src/api/standalone-server.ts --port 3000

# Useful for frontend development
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

### Want X402 Streaming Payments?

1. **Run the demo**: `npm run demo:x402`
2. **Study the flow**: Check `demos/x402-second-stream.ts`
3. **Read API docs**: See REST API section above
4. **Configure**: Set up X402 config for your network
5. **Integrate**: Use `X402PaymentService` in your app

### Advanced Topics

- **Custom contracts?** Use `BlockchainClient` directly
- **Real database?** Implement the `Database` interface
- **Real cache?** Implement the `Cache` interface
- **Custom events?** Use `EventProcessor`
- **Production X402?** Set `useMockFacilitator: false` and configure real facilitator

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

### X402 Payment Flow

```typescript
// 1. Server defines payment requirements
const requirements = x402Service.buildPaymentRequirements(
  leaseId, 'second', leaseTerms
);

// 2. Client receives 402 Payment Required
// Response: { paymentRequirements: { maxAmountRequired: "1000" } }

// 3. Client encodes payment header
const header = encodePaymentHeader({
  payer: '0x...',
  amount: '1000',
  txHash: '0x...',
  issuedAt: new Date().toISOString()
});

// 4. Client retries with X-PAYMENT header
// 5. Server verifies with facilitator
// 6. Server settles payment on-chain
// 7. Server grants access with 200 OK
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

### X402 payment failing?

Check:
1. Anvil is running (Terminal 1)
2. Full system is started (Terminal 2)
3. API server is accessible at http://localhost:3001
4. `useMockFacilitator: true` for local development

### API server not responding?

```bash
# Check if server is running
curl http://localhost:3001/health

# Restart full system
tsx scripts/start-full-system.ts --keep-running
```

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
- **X402 integration** - streaming payment protocol
- **REST API** - full Express server with all endpoints
- **Test suite** - comprehensive Vitest tests

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

### 5. **Modern Payments**
X402 streaming payments built-in for pay-per-use models.

---

## 🤝 Contributing

Want to add a feature? Here's how:

1. **Services** - Add to `src/services/`
2. **Storage** - Implement interfaces in `src/storage/`
3. **Demos** - Add to `demos/`
4. **Tests** - Add to `tests/`
5. **API Routes** - Extend `src/api/server.ts`

Keep it simple. Keep it documented. Keep it educational.

---

## 📄 License

Same as the main Asset Leasing Protocol repository.

---

## 🚀 Next Steps

1. **Run the demo**: `npm run demo`
2. **Read the code** in `demos/simple-complete-demo.ts`
3. **Try X402 payments**: `npm run demo:x402` (after starting full system)
4. **Explore the API**: `curl http://localhost:3001/api/assets`
5. **Run the tests**: `npm test`
6. **Build something!** Use this as your foundation

---

**Questions?** Open an issue or check the inline documentation.

**Happy building!** 🎉
