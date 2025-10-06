# Developer Handbook

## Table of Contents

1. [Getting Started](#getting-started)
2. [Repository Structure](#repository-structure)
3. [Smart Contracts](#smart-contracts)
4. [Offchain Systems](#offchain-systems)
5. [Testing](#testing)
6. [Common Development Tasks](#common-development-tasks)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

---

## Getting Started

Welcome to the Asset Leasing Protocol development team. This handbook provides everything you need to understand, develop, test, and deploy the protocol.

### Prerequisites Installation

#### 1. Install Node.js (v18+)

**macOS/Linux**:
```bash
# Using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

**Windows**:
Download from [nodejs.org](https://nodejs.org/) or use WSL2 with Linux instructions.

#### 2. Install Foundry

Foundry provides the smart contract development framework:

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash

# Update PATH (add to ~/.bashrc or ~/.zshrc)
export PATH="$HOME/.foundry/bin:$PATH"

# Verify installation
foundryup  # Updates to latest version
forge --version
anvil --version
cast --version
```

#### 3. Install Git

```bash
# macOS
brew install git

# Ubuntu/Debian
sudo apt-get install git

# Verify
git --version
```

### Initial Setup

1. **Clone the Repository**:
```bash
git clone https://github.com/your-org/asset-leasing-protocol.git
cd asset-leasing-protocol
```

2. **Install Dependencies**:
```bash
# Install root dependencies
npm install

# Install offchain test dependencies
cd test/offchain
npm install
cd ../..
```

3. **Compile Smart Contracts**:
```bash
forge build
```

4. **Run Tests to Verify Setup**:
```bash
# On-chain tests
forge test

# Off-chain tests
cd test/offchain
npm test
```

If all tests pass, your development environment is ready.

---

## Repository Structure

Understanding the project structure helps navigate and contribute effectively:

```
asset-leasing-protocol/
│
├── src/                      # Smart contract source code
│   ├── interfaces/           # Contract interfaces
│   │   └── IAssetRegistry.sol
│   ├── AssetRegistry.sol     # Central asset registry
│   ├── AssetERC20.sol        # Fractional ownership tokens
│   ├── LeaseFactory.sol      # Lease NFT creation
│   └── Marketplace.sol       # Trading and revenue distribution
│
├── test/                     # Test suites
│   ├── mocks/                # Mock contracts for testing
│   │   └── MockStablecoin.sol
│   ├── docs/                 # Testing documentation
│   │   ├── testing-package.md
│   │   ├── complete-system-overview.md
│   │   ├── integration-testing-guide.md
│   │   ├── developer-handbook.md
│   │   └── api-reference.md
│   ├── offchain/             # Off-chain integration tests
│   │   ├── src/              # Test source code
│   │   │   ├── blockchain.js
│   │   │   ├── api.js
│   │   │   └── test.js
│   │   ├── package.json
│   │   └── README.md
│   ├── AssetERC20Simple.t.sol    # Token unit tests
│   ├── AssetFlow.t.sol           # Integration tests
│   ├── MarketplaceFlow.t.sol     # System tests
│   └── ERC20SnapshotMigration.t.sol  # Migration tests
│
├── script/                   # Deployment scripts
│   └── Deploy.s.sol          # Main deployment script
│
├── docs/                     # Project documentation
│   ├── technical-walkthrough.md
│   └── offchain-systems.md
│
├── lib/                      # External dependencies (Foundry)
│   └── openzeppelin-contracts/
│
├── out/                      # Compiled contracts (generated)
│
├── foundry.toml              # Foundry configuration
├── package.json              # Node.js dependencies
└── README.md                 # Project overview
```

### Key Directories Explained

- **`src/`**: Core smart contracts implementing the protocol
- **`test/`**: Comprehensive test coverage (55 onchain + 6 offchain tests)
- **`test/offchain/`**: Integration testing framework
- **`script/`**: Deployment and interaction scripts
- **`docs/`**: Technical documentation and guides
- **`lib/`**: Third-party libraries managed by Foundry

---

## Smart Contracts

### Contract Architecture

The protocol consists of four main contracts that work together:

```
┌──────────────────────────────────────────────────┐
│                  AssetRegistry                   │
│  - Creates asset types                          │
│  - Registers individual assets                  │
│  - Deploys AssetERC20 tokens                   │
└──────────────────────────────────────────────────┘
                        │
                        │ deploys
                        ▼
┌──────────────────────────────────────────────────┐
│                   AssetERC20                     │
│  - ERC-20 token for fractional ownership        │
│  - ERC20Votes for governance                    │
│  - Snapshot mechanism for revenue               │
└──────────────────────────────────────────────────┘
                        │
                        │ interacts
                        ▼
┌──────────────────────────────────────────────────┐
│                  LeaseFactory                    │
│  - Creates lease agreements as NFTs             │
│  - EIP-712 signature verification               │
│  - Dual-signature requirement                   │
└──────────────────────────────────────────────────┘
                        │
                        │ coordinates
                        ▼
┌──────────────────────────────────────────────────┐
│                   Marketplace                    │
│  - Token sales and bidding                      │
│  - Lease offer management                       │
│  - Revenue distribution                         │
│  - Escrow handling                              │
└──────────────────────────────────────────────────┘
```

### Key Functions by Contract

#### AssetRegistry

```solidity
// Create a new asset type category
function createAssetType(
    string memory name,
    bytes32 schemaHash,
    string memory schemaURI
) external returns (uint256);

// Register a specific asset and deploy its token
function registerAsset(
    uint256 assetTypeId,
    address initialOwner,
    bytes32 metadataHash,
    string memory dataURI,
    string memory tokenName,
    string memory tokenSymbol,
    uint256 initialSupply
) external returns (uint256, address);

// Query functions
function getAssetToken(uint256 assetId) external view returns (address);
function getAssetInfo(uint256 assetId) external view returns (AssetInfo memory);
```

#### AssetERC20

```solidity
// Standard ERC-20 functions
function transfer(address to, uint256 amount) external returns (bool);
function approve(address spender, uint256 amount) external returns (bool);
function balanceOf(address account) external view returns (uint256);

// Snapshot functions for revenue distribution
function snapshot() external returns (uint256);
function balanceOfAt(address account, uint256 snapshotId) external view returns (uint256);
function totalSupplyAt(uint256 snapshotId) external view returns (uint256);

// Auto-delegation for voting power
function delegates(address account) external view returns (address);
function getVotes(address account) external view returns (uint256);
```

#### LeaseFactory

```solidity
// Create lease with dual signatures
function mintLease(
    LeaseIntent calldata intent,
    bytes calldata signatureLessor,
    bytes calldata signatureLessee,
    string calldata leaseURI
) external returns (uint256);

// Verify signatures
function verifySignatures(
    LeaseIntent calldata intent,
    bytes calldata signatureLessor,
    bytes calldata signatureLessee
) external view returns (bool, bool);

// Query lease details
function getLeaseDetails(uint256 leaseId) external view returns (LeaseIntent memory);
```

#### Marketplace

```solidity
// Token sales
function postSale(address token, uint256 amount, uint256 minPrice) external returns (uint256);
function placeSaleBid(uint256 saleId, uint256 amount, uint256 price) external returns (uint256);
function acceptSaleBid(uint256 saleId, uint256 bidId) external;

// Lease management
function postLeaseOffer(LeaseOfferParams calldata params) external returns (uint256);
function placeLeaseBid(uint256 offerId, LeaseBidParams calldata params) external returns (uint256);
function acceptLeaseBid(uint256 offerId, uint256 bidIdx, bytes calldata sig, string calldata uri)
    external returns (uint256, uint256);

// Revenue distribution
function claimRevenue(uint256 roundId) external;
```

### Deployment Process

#### Local Deployment (Anvil)

1. **Start Anvil**:
```bash
anvil --port 8545 --chain-id 31337
```

2. **Deploy Contracts**:
```bash
forge script script/Deploy.s.sol:Deploy \
  --rpc-url http://localhost:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --broadcast
```

3. **Verify Deployment**:
```bash
# Check deployed addresses
cat broadcast/Deploy.s.sol/31337/run-latest.json | jq '.receipts[].contractAddress'
```

#### Testnet Deployment

1. **Configure Environment**:
```bash
# .env file
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
PRIVATE_KEY=your_private_key
ETHERSCAN_API_KEY=your_etherscan_key
```

2. **Deploy to Sepolia**:
```bash
forge script script/Deploy.s.sol:Deploy \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify
```

---

## Offchain Systems

### API Server Architecture

The offchain API provides HTTP endpoints for blockchain interaction:

```javascript
// Core server setup (src/api.js)
import express from 'express';
import { ethers } from 'ethers';

const app = express();
app.use(express.json());
app.use(cors());

// Connect to blockchain
const provider = new ethers.JsonRpcProvider(RPC_URL);
const signer = new ethers.Wallet(PRIVATE_KEY, provider);

// Contract instances
const assetRegistry = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, signer);
const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);
```

### Key API Endpoints

#### Asset Management
```javascript
app.post('/api/assets/register-type', async (req, res) => {
  const { name, schemaUrl } = req.body;

  const tx = await assetRegistry.createAssetType(
    name,
    ethers.keccak256(ethers.toUtf8Bytes(schemaUrl)),
    schemaUrl
  );

  const receipt = await tx.wait();
  res.json({ success: true, typeId: receipt.logs[0].args[0] });
});
```

#### Token Creation
```javascript
app.post('/api/assets/create-token', async (req, res) => {
  const { assetId, name, symbol, supply } = req.body;

  const tx = await assetRegistry.registerAsset(
    assetId,
    signer.address,
    ethers.keccak256(ethers.toUtf8Bytes(name)),
    'ipfs://metadata',
    name,
    symbol,
    ethers.parseEther(supply.toString())
  );

  const receipt = await tx.wait();
  const tokenAddress = receipt.logs[1].args[1];
  res.json({ success: true, tokenAddress });
});
```

### Blockchain Integration

#### Event Listening
```javascript
// Listen for blockchain events
assetRegistry.on('AssetRegistered', async (assetId, owner, tokenAddress) => {
  console.log(`New asset registered: ${assetId}`);

  // Update database
  await db.assets.create({
    id: assetId.toString(),
    owner,
    tokenAddress,
    timestamp: new Date()
  });

  // Notify websocket clients
  io.emit('assetRegistered', { assetId, owner, tokenAddress });
});
```

#### Transaction Management
```javascript
async function sendTransaction(contract, method, params) {
  try {
    // Estimate gas
    const estimatedGas = await contract[method].estimateGas(...params);

    // Add 10% buffer
    const gasLimit = estimatedGas * 110n / 100n;

    // Send transaction
    const tx = await contract[method](...params, { gasLimit });

    // Wait for confirmation
    const receipt = await tx.wait();

    return { success: true, receipt };
  } catch (error) {
    console.error(`Transaction failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}
```

### Event Processing

#### Event Processor Pattern
```javascript
class EventProcessor {
  constructor(contract, db) {
    this.contract = contract;
    this.db = db;
    this.lastBlock = 0;
  }

  async start() {
    // Process historical events
    await this.processHistoricalEvents();

    // Listen for new events
    this.listenForEvents();

    // Periodic reconciliation
    setInterval(() => this.reconcile(), 60000);
  }

  async processHistoricalEvents() {
    const currentBlock = await this.contract.provider.getBlockNumber();
    const events = await this.contract.queryFilter('*', this.lastBlock, currentBlock);

    for (const event of events) {
      await this.processEvent(event);
    }

    this.lastBlock = currentBlock;
  }

  listenForEvents() {
    this.contract.on('*', async (event) => {
      await this.processEvent(event);
    });
  }

  async processEvent(event) {
    const { eventName, args, blockNumber, transactionHash } = event;

    // Store event
    await this.db.events.create({
      eventName,
      args: JSON.stringify(args),
      blockNumber,
      transactionHash
    });

    // Process based on event type
    switch (eventName) {
      case 'AssetRegistered':
        await this.handleAssetRegistered(args);
        break;
      case 'LeaseCreated':
        await this.handleLeaseCreated(args);
        break;
      // ... other events
    }
  }
}
```

---

## Testing

### Test-Driven Development Workflow

Follow TDD principles for all new features:

1. **Write Failing Test First**:
```solidity
function test_NewFeature() public {
    // Arrange
    uint256 expectedValue = 100;

    // Act
    uint256 actualValue = contract.newFeature();

    // Assert
    assertEq(actualValue, expectedValue, "Feature should return 100");
}
```

2. **Implement Minimal Code to Pass**:
```solidity
function newFeature() public pure returns (uint256) {
    return 100;
}
```

3. **Refactor and Optimize**:
```solidity
function newFeature() public view returns (uint256) {
    // Improved implementation
    return calculateValue();
}
```

### Onchain Tests (Foundry)

#### Running Tests
```bash
# Run all tests
forge test

# Run specific test file
forge test --match-path test/AssetFlow.t.sol

# Run specific test function
forge test --match-test test_SnapshotBalances

# Run with verbosity levels
forge test -v    # Basic
forge test -vv   # More details
forge test -vvv  # Full stack traces
forge test -vvvv # All logs

# Generate gas report
forge test --gas-report

# Generate coverage report
forge coverage
forge coverage --report lcov
```

#### Writing Effective Tests
```solidity
contract AssetFlowTest is Test {
    AssetRegistry registry;
    address admin = address(0x1);
    address user = address(0x2);

    function setUp() public {
        // Deploy contracts
        registry = new AssetRegistry(admin);

        // Fund test accounts
        vm.deal(user, 10 ether);

        // Label addresses for better traces
        vm.label(admin, "Admin");
        vm.label(user, "User");
    }

    function test_AssetRegistration() public {
        // Use vm.prank to impersonate users
        vm.prank(admin);
        uint256 typeId = registry.createAssetType("Test", keccak256("schema"), "uri");

        // Verify state changes
        assertEq(registry.getAssetType(typeId).name, "Test");

        // Test events
        vm.expectEmit(true, true, false, true);
        emit AssetTypeCreated(typeId, "Test");
    }

    function test_RevertWhen_Unauthorized() public {
        // Test access control
        vm.prank(user);  // Not admin
        vm.expectRevert("Unauthorized");
        registry.createAssetType("Test", keccak256("schema"), "uri");
    }
}
```

### Offchain Tests (Node.js)

#### Running Integration Tests
```bash
cd test/offchain

# Run all tests
npm test

# Run with debug output
DEBUG=* npm test

# Run specific test
npm test -- --grep "API server"
```

#### Writing Integration Tests
```javascript
// test/offchain/src/test.js
async function testCompleteWorkflow(test) {
  // Start test
  test.startTest('Complete asset workflow');

  // Register asset type
  const typeResponse = await fetch('http://localhost:3001/api/assets/register-type', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Satellite',
      schemaUrl: 'https://example.com/schema'
    })
  });

  test.assertEqual(typeResponse.status, 200, 'Should register asset type');

  // Verify on blockchain
  const typeData = await typeResponse.json();
  const contract = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, provider);
  const assetType = await contract.getAssetType(typeData.typeId);

  test.assertEqual(assetType.name, 'Satellite', 'Asset type should exist onchain');
}
```

### Integration Tests

#### Complete System Testing
```bash
# Start full system test
cd test/offchain
npm test

# Expected output:
# ✅ Anvil blockchain started
# ✅ Contracts deployed
# ✅ API server running
# ✅ Complete workflow tested
# ✅ Error handling verified
# Total: 6/6 tests passed
```

### Test-Driven Development Best Practices

1. **Red-Green-Refactor Cycle**:
   - Red: Write failing test
   - Green: Make test pass with minimal code
   - Refactor: Improve code quality

2. **One Assertion Per Test**:
```solidity
// Good - Single responsibility
function test_TransferUpdatesBalances() public {
    token.transfer(recipient, 100);
    assertEq(token.balanceOf(recipient), 100);
}

function test_TransferEmitsEvent() public {
    vm.expectEmit(true, true, false, true);
    emit Transfer(sender, recipient, 100);
    token.transfer(recipient, 100);
}

// Bad - Multiple assertions
function test_Transfer() public {
    token.transfer(recipient, 100);
    assertEq(token.balanceOf(recipient), 100);
    assertEq(token.balanceOf(sender), 900);
    // Too many things tested at once
}
```

3. **Descriptive Test Names**:
```solidity
// Good
function test_RevertWhen_TransferExceedsBalance() public { }
function test_SnapshotCapturesCurrentBalances() public { }

// Bad
function testTransfer() public { }
function test1() public { }
```

---

## Common Development Tasks

### Adding New Asset Types

1. **Define Asset Type Schema**:
```javascript
const assetTypeSchema = {
  name: "Computing Cluster",
  attributes: {
    gpuCount: "number",
    ramGB: "number",
    location: "string"
  },
  validationRules: {
    gpuCount: { min: 1, max: 1000 },
    ramGB: { min: 16, max: 4096 }
  }
};
```

2. **Register via Smart Contract**:
```javascript
const schemaHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(assetTypeSchema)));
const tx = await assetRegistry.createAssetType(
  assetTypeSchema.name,
  schemaHash,
  'ipfs://QmSchema...'
);
```

3. **Create Specific Asset**:
```javascript
const assetData = {
  typeId: 1,
  owner: '0x...',
  metadata: {
    gpuCount: 100,
    ramGB: 2048,
    location: "US-East"
  }
};

const tx = await assetRegistry.registerAsset(
  assetData.typeId,
  assetData.owner,
  ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(assetData.metadata))),
  'ipfs://QmAsset...',
  'Computing Cluster Alpha',
  'CCA',
  ethers.parseEther('1000000')
);
```

### Creating Lease Offers

1. **Prepare Lease Terms**:
```javascript
const leaseTerms = {
  assetId: 1,
  duration: 30 * 24 * 60 * 60, // 30 days in seconds
  rentAmount: ethers.parseEther('1000'), // 1000 tokens per period
  securityDeposit: ethers.parseEther('5000'),
  paymentToken: USDC_ADDRESS,
  startTime: Math.floor(Date.now() / 1000) + 86400, // Start tomorrow
  endTime: Math.floor(Date.now() / 1000) + (365 * 86400) // One year
};
```

2. **Create Signed Lease Intent**:
```javascript
// Create lease intent structure
const leaseIntent = {
  lessor: lessorAddress,
  lessee: lesseeAddress,
  assetId: leaseTerms.assetId,
  paymentToken: leaseTerms.paymentToken,
  rentAmount: leaseTerms.rentAmount,
  rentPeriod: 30 * 24 * 60 * 60,
  securityDeposit: leaseTerms.securityDeposit,
  startTime: leaseTerms.startTime,
  endTime: leaseTerms.endTime,
  metadataHash: ethers.keccak256(ethers.toUtf8Bytes('lease metadata')),
  legalDocHash: ethers.keccak256(ethers.toUtf8Bytes('legal document')),
  nonce: Date.now(),
  deadline: Math.floor(Date.now() / 1000) + 86400,
  termsVersion: 1,
  assetTypeSchemaHash: schemaHash
};

// Sign with EIP-712
const domain = {
  name: 'LeaseFactory',
  version: '1',
  chainId: 31337,
  verifyingContract: LEASE_FACTORY_ADDRESS
};

const types = {
  LeaseIntent: [
    { name: 'lessor', type: 'address' },
    { name: 'lessee', type: 'address' },
    { name: 'assetId', type: 'uint256' },
    // ... other fields
  ]
};

const signature = await lessorSigner._signTypedData(domain, types, leaseIntent);
```

3. **Submit to Marketplace**:
```javascript
const tx = await marketplace.postLeaseOffer({
  token: assetTokenAddress,
  amount: ethers.parseEther('100'), // 100 tokens
  minRentPerPeriod: ethers.parseEther('1000'),
  maxDuration: 365 * 24 * 60 * 60, // One year
  securityDepositRatio: 5000 // 50%
});

const receipt = await tx.wait();
const offerId = receipt.logs[0].args[0];
```

### Processing Revenue Distributions

1. **Create Snapshot When Lease Starts**:
```javascript
// In Marketplace contract
function acceptLeaseBid(uint256 offerId, uint256 bidId) external {
  // ... validate and transfer tokens

  // Create snapshot for revenue distribution
  uint256 snapshotId = AssetERC20(offer.token).snapshot();

  // Store revenue round
  revenueRounds[roundId] = RevenueRound({
    token: offer.token,
    snapshotId: snapshotId,
    totalAmount: bid.totalPayment,
    claimedAmount: 0,
    timestamp: block.timestamp
  });
}
```

2. **Calculate Individual Shares**:
```javascript
function calculateRevenue(address holder, uint256 roundId) public view returns (uint256) {
  RevenueRound memory round = revenueRounds[roundId];

  uint256 holderBalance = AssetERC20(round.token).balanceOfAt(holder, round.snapshotId);
  uint256 totalSupply = AssetERC20(round.token).totalSupplyAt(round.snapshotId);

  if (totalSupply == 0) return 0;

  return (round.totalAmount * holderBalance) / totalSupply;
}
```

3. **Claim Revenue**:
```javascript
async function claimRevenue(roundId) {
  // Call smart contract
  const tx = await marketplace.claimRevenue(roundId);
  const receipt = await tx.wait();

  // Parse events
  const claimEvent = receipt.logs.find(log =>
    log.topics[0] === ethers.id('RevenueClaimed(address,uint256,uint256)')
  );

  const amount = ethers.formatEther(claimEvent.args[2]);
  console.log(`Claimed ${amount} tokens from round ${roundId}`);
}
```

### Debugging Issues

#### Smart Contract Debugging

1. **Use Console Logging**:
```solidity
import "forge-std/console.sol";

function debugFunction() public {
  console.log("Value:", someValue);
  console.log("Address:", someAddress);
  console.logBytes32(someHash);
}
```

2. **Forge Debug Command**:
```bash
# Debug specific transaction
forge debug --debug <TX_HASH>

# Debug with fork
forge debug --fork-url <RPC_URL> --debug <TX_HASH>
```

3. **Stack Traces**:
```bash
# Get detailed stack trace
forge test --match-test test_FailingFunction -vvvv
```

#### API Debugging

1. **Enable Debug Logging**:
```javascript
// Set DEBUG environment variable
DEBUG=* npm start

// Or in code
if (process.env.DEBUG) {
  console.log('Debug:', data);
}
```

2. **Use Breakpoints**:
```javascript
// Add debugger statement
debugger; // Execution will pause here when debugging

// Run with inspector
node --inspect src/api.js
```

3. **Monitor Network Requests**:
```bash
# Use curl with verbose output
curl -v http://localhost:3001/api/health

# Monitor with tcpdump
sudo tcpdump -i lo0 -A -s 0 'port 3001'
```

---

## Best Practices

### Code Style Guidelines

#### Solidity Best Practices

1. **Follow Solidity Style Guide**:
```solidity
// Good
contract AssetRegistry {
    uint256 private constant MAX_SUPPLY = 1000000;

    mapping(uint256 => Asset) private assets;

    event AssetCreated(uint256 indexed assetId, address indexed owner);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Unauthorized");
        _;
    }

    function createAsset(string memory name) external onlyAdmin returns (uint256) {
        // Implementation
    }
}

// Bad
contract assetregistry {
    uint256 MAXSUPPLY = 1000000;
    mapping(uint256=>Asset) Assets;
    function CreateAsset(string memory Name) public {
        // Poor naming and visibility
    }
}
```

2. **Use Explicit Visibility**:
```solidity
// Good
function internalHelper() internal pure returns (uint256) { }
function publicMethod() public view returns (uint256) { }
uint256 private constant VALUE = 100;

// Bad
function helper() returns (uint256) { } // No visibility specified
uint256 VALUE = 100; // No visibility or mutability
```

3. **Check-Effects-Interactions Pattern**:
```solidity
// Good
function withdraw(uint256 amount) external {
    // Checks
    require(balances[msg.sender] >= amount, "Insufficient balance");

    // Effects
    balances[msg.sender] -= amount;

    // Interactions
    (bool success, ) = msg.sender.call{value: amount}("");
    require(success, "Transfer failed");
}
```

#### JavaScript/TypeScript Best Practices

1. **Use Async/Await**:
```javascript
// Good
async function fetchData() {
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Fetch failed:', error);
    throw error;
  }
}

// Bad
function fetchData() {
  return fetch(url)
    .then(response => response.json())
    .then(data => data)
    .catch(error => {
      console.error(error);
      throw error;
    });
}
```

2. **Proper Error Handling**:
```javascript
// Good
class APIError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

async function handleRequest(req, res) {
  try {
    const result = await processRequest(req);
    res.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof APIError) {
      res.status(error.statusCode).json({
        success: false,
        error: error.message
      });
    } else {
      console.error('Unexpected error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}
```

### Testing Requirements

All code must meet these testing requirements:

1. **Minimum Coverage**:
   - Smart contracts: 95% line coverage
   - Critical functions: 100% branch coverage
   - Off-chain code: 80% coverage

2. **Test Categories Required**:
   - Unit tests for all public functions
   - Integration tests for contract interactions
   - Error condition tests
   - Edge case tests
   - Gas optimization tests for expensive operations

3. **Test Quality Standards**:
   - Must pass the "sabotage test" (breaking implementation fails test)
   - No self-satisfying tests
   - Independent validation
   - Clear test documentation

### Documentation Standards

1. **Code Comments**:
```solidity
/**
 * @title AssetRegistry
 * @notice Central registry for all protocol assets
 * @dev Implements IAssetRegistry interface
 */
contract AssetRegistry {
    /**
     * @notice Register a new asset and deploy its token
     * @param typeId The asset type identifier
     * @param owner Initial owner address
     * @return assetId Unique identifier for the asset
     * @return tokenAddress Deployed ERC-20 token address
     */
    function registerAsset(
        uint256 typeId,
        address owner
    ) external returns (uint256 assetId, address tokenAddress) {
        // Implementation
    }
}
```

2. **README Files**:
   - Every major directory needs a README
   - Explain purpose and structure
   - Include setup instructions
   - Document common tasks

3. **API Documentation**:
```javascript
/**
 * @api {post} /api/assets/register-type Register Asset Type
 * @apiName RegisterAssetType
 * @apiGroup Assets
 *
 * @apiParam {String} name Asset type name
 * @apiParam {String} schemaUrl URL to validation schema
 *
 * @apiSuccess {Boolean} success Operation result
 * @apiSuccess {Number} typeId Created type identifier
 *
 * @apiError {String} error Error message
 */
```

### Security Considerations

1. **Access Control**:
```solidity
// Use role-based access control
bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

modifier onlyRole(bytes32 role) {
    require(hasRole(role, msg.sender), "Unauthorized");
    _;
}
```

2. **Input Validation**:
```solidity
function setParameter(uint256 value) external onlyAdmin {
    require(value > 0 && value <= MAX_VALUE, "Invalid value");
    require(value != currentValue, "Value unchanged");

    emit ParameterUpdated(currentValue, value);
    currentValue = value;
}
```

3. **Reentrancy Protection**:
```solidity
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract SecureContract is ReentrancyGuard {
    function withdraw() external nonReentrant {
        // Protected against reentrancy
    }
}
```

4. **Safe Math Operations**:
```solidity
// Solidity 0.8+ has built-in overflow protection
// For older versions, use SafeMath

// Check for division by zero
require(denominator != 0, "Division by zero");
uint256 result = numerator / denominator;
```

---

## Troubleshooting

### Common Build Issues

#### Issue: Compilation Fails
```bash
Error: Source "src/Contract.sol" not found
```

**Solution**:
```bash
# Clean and rebuild
forge clean
forge build

# Check remappings
cat remappings.txt
```

#### Issue: Import Not Found
```bash
Error: Source "@openzeppelin/contracts/token/ERC20/ERC20.sol" not found
```

**Solution**:
```bash
# Install dependencies
forge install openzeppelin/openzeppelin-contracts

# Update remappings
forge remappings > remappings.txt
```

### Test Failures

#### Issue: Test Timeout
```bash
Error: Test exceeded timeout of 120000ms
```

**Solution**:
```bash
# Increase timeout
forge test --timeout 300000

# Or in foundry.toml
[profile.default]
test_timeout = 300000
```

#### Issue: Insufficient Balance
```bash
Error: Insufficient funds for gas * price + value
```

**Solution**:
```solidity
function setUp() public {
    // Fund test accounts
    vm.deal(testAccount, 100 ether);
}
```

### Deployment Issues

#### Issue: Gas Estimation Failed
```bash
Error: gas required exceeds allowance
```

**Solution**:
```javascript
// Manually set gas limit
const tx = await contract.method(params, {
  gasLimit: 1000000
});
```

#### Issue: Nonce Too Low
```bash
Error: nonce too low
```

**Solution**:
```javascript
// Reset nonce
const nonce = await provider.getTransactionCount(signer.address, 'pending');
const tx = await contract.method(params, { nonce });
```

### API Issues

#### Issue: CORS Errors
```
Access to fetch at 'http://localhost:3001' from origin 'http://localhost:3000' has been blocked by CORS policy
```

**Solution**:
```javascript
// Enable CORS in API
app.use(cors({
  origin: '*', // Or specific origins
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

#### Issue: Connection Refused
```
Error: connect ECONNREFUSED 127.0.0.1:3001
```

**Solution**:
```bash
# Check if server is running
lsof -i :3001

# Start server
npm start

# Check logs
tail -f logs/api.log
```

---

## Conclusion

This handbook provides comprehensive guidance for developing, testing, and deploying the Asset Leasing Protocol. Key takeaways:

1. **Development Environment**: Properly configured Foundry and Node.js setup is essential
2. **Architecture**: Understanding the four-contract system and their interactions
3. **Testing**: Comprehensive test coverage with both onchain and offchain tests
4. **Best Practices**: Following established patterns for security and maintainability
5. **Documentation**: Keeping documentation current with code changes

### Quick Reference Commands

```bash
# Development
forge build                  # Compile contracts
forge test                   # Run tests
forge coverage              # Check coverage
npm test                    # Run integration tests

# Deployment
anvil                       # Start local blockchain
forge script                # Deploy contracts
npm start                   # Start API server

# Debugging
forge test -vvvv           # Verbose test output
forge debug                # Interactive debugger
DEBUG=* npm start          # Debug API server
```

### Getting Help

- **Documentation**: Check `/test/docs/` for detailed guides
- **Tests**: Review test files for usage examples
- **Issues**: Submit GitHub issues with reproducible examples
- **Community**: Join Discord for real-time help

Remember: The protocol is production-ready with 100% test coverage. Your contributions should maintain this standard.

---

*Last Updated: January 2025*
*Version: 1.0.0*