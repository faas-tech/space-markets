# Integration Testing Guide

## Overview

The Asset Leasing Protocol's integration testing framework validates the complete interaction between blockchain smart contracts and offchain services. This guide covers both onchain (Foundry) and offchain (Node.js) integration testing.

## Test Results Summary

```
Onchain Tests:  55/55 passing ✅
Offchain Tests: 6/6 passing ✅
Pass Rate:      100%
```

---

## Why Integration Testing Matters

While unit tests verify individual components work correctly in isolation, integration tests ensure the entire system functions cohesively. For blockchain applications, this is particularly critical because:

1. **Cross-Layer Validation**: Verifies communication between onchain and offchain components
2. **Real-World Scenarios**: Tests actual workflows users will perform
3. **Event Synchronization**: Ensures blockchain events are properly processed
4. **Error Propagation**: Validates error handling across system boundaries
5. **Performance Verification**: Confirms the system meets performance requirements

---

## Onchain Integration Tests

### Test Structure

Onchain tests are organized in a three-tier architecture:

```
test/
├── component/          # Tier 1: Single contract tests
│   ├── AssetERC20.t.sol
│   ├── AssetRegistry.t.sol
│   ├── LeaseFactory.t.sol
│   └── MetadataStorage.t.sol
└── integration/        # Tier 2-3: Multi-contract tests
    ├── DeploymentInit.t.sol
    └── Integration.t.sol
```

### Tier 1: Component Tests
- **Purpose**: Validate individual contracts in isolation
- **Focus**: Contract-specific business logic and edge cases
- **Examples**: AssetERC20.t.sol tests token minting, transfers, metadata

### Tier 2-3: Integration Tests
- **Purpose**: Validate multi-contract interactions and complete workflows
- **Focus**: Cross-contract communication and end-to-end user flows
- **Examples**: Integration.t.sol tests full asset registration → tokenization → leasing flow

### Running Onchain Tests

```bash
# Run all tests
forge test

# Run component tests only
forge test --match-path "test/component/**/*.sol"

# Run integration tests only
forge test --match-path "test/integration/**/*.sol"

# Run with verbose output
forge test -vvvv

# Generate coverage report
forge coverage
```

---

## Offchain Integration Tests

### System Architecture

The offchain test suite validates three interconnected layers:

```
┌─────────────────────────────────────────────────────────────┐
│                    Test Runner (test.js)                     │
│  Orchestrates the complete test lifecycle and reporting      │
└──────────────────┬──────────────────────────────────────────┘
                   │
    ┌──────────────┼──────────────┐
    │              │              │
    ▼              ▼              ▼
┌───────────┐  ┌─────────┐  ┌──────────┐
│  Anvil    │  │ Solidity│  │  REST    │
│ Blockchain│◄─┤ Contracts│◄─┤   API    │
│  (Layer 1)│  │(Layer 2)│  │(Layer 3) │
└───────────┘  └─────────┘  └──────────┘
```

### What the Offchain Tests Validate

1. **Blockchain Infrastructure**: Local Anvil blockchain starts and operates correctly
2. **Contract Deployment**: All smart contracts deploy and initialize properly
3. **API Server**: REST endpoints function and communicate with contracts
4. **Blockchain Integration**: API successfully interacts with deployed contracts
5. **Complete Workflows**: End-to-end asset registration and leasing processes work
6. **Error Handling**: System gracefully handles invalid inputs and edge cases

### Test Breakdown

#### Test 1: Anvil Blockchain Startup ✅
**Duration:** ~0.1s

**Purpose:** Validates that a local Ethereum-compatible blockchain can be started and is ready to accept transactions.

**What It Proves:**
- Anvil installation is correct and accessible
- Network port 8546 is available and can be bound
- The blockchain responds to JSON-RPC calls
- 10 test accounts are created with ETH balances

**Validation:**
- Process starts without errors
- RPC endpoint is responsive
- Chain ID is accessible via `eth_chainId`

#### Test 2: Smart Contract Deployment ✅
**Duration:** ~16.6s

**Purpose:** Validates that all protocol smart contracts can be deployed to the local blockchain.

**Contracts Deployed:**
- **MockStablecoin**: Test payment token (USDC equivalent)
- **AssetRegistry**: Core protocol registry for assets
- **LeaseFactory**: NFT factory for lease agreements
- **Marketplace**: Trading hub for asset leases

**What It Proves:**
- Foundry is installed and `forge create` works
- Contracts compile without errors
- Constructors execute successfully
- Contract addresses are valid and queryable

#### Test 3: API Server Startup ✅
**Duration:** ~1.0s

**Purpose:** Validates that the REST API server starts and exposes endpoints correctly.

**What It Proves:**
- Node.js server binds to port 3001
- Express routes are registered
- Health check endpoint responds
- Server is ready to accept HTTP requests

**Endpoints Registered:**
- `POST /deploy` - Deploy contracts
- `GET /network-info` - Query blockchain info
- `POST /register-asset` - Register new assets
- `POST /create-lease` - Create lease agreements
- And more...

#### Test 4: API-Blockchain Integration ✅
**Duration:** ~16.6s

**Purpose:** Validates that the API can interact with the blockchain and deploy contracts via HTTP requests.

**What It Proves:**
- API can send transactions to Anvil
- Contract deployment via API succeeds
- API returns correct contract addresses
- Network information is queryable via REST

**Flow:**
1. API receives POST request to deploy contracts
2. API uses ethers.js to interact with Anvil
3. Contracts are deployed on local blockchain
4. API returns deployment confirmation
5. Contract addresses are verified via `eth_call`

#### Test 5: Complete Asset Leasing Workflow ✅
**Duration:** ~14.4s

**Purpose:** Validates the complete end-to-end workflow of registering an asset, creating a token, and listing it for lease.

**Workflow Steps:**
1. Register asset type ("Orbital Satellite Alpha")
2. Create ERC20 token for the asset (symbol: SAT001)
3. Post lease offer on marketplace
4. Verify blockchain events were emitted
5. Query system status

**What It Proves:**
- Asset registration works through API
- ERC20 tokens are minted correctly
- Marketplace accepts lease listings
- Events are emitted and capturable
- Complete user workflow is functional

**Events Captured:**
- `AssetRegistered`
- `TokenCreated`
- `LeaseOffered`
- `Transfer` (ERC20)
- `Approval` (ERC20)

#### Test 6: Error Handling ✅
**Duration:** ~0.004s

**Purpose:** Validates that the system correctly handles invalid inputs and error conditions.

**What It Proves:**
- Invalid requests return 400 status codes
- Missing required fields are detected
- 404 errors for non-existent resources
- Invalid contract names are caught
- System remains stable after errors

**Test Cases:**
- POST request with missing required fields
- GET request to non-existent endpoint
- Invalid JSON payloads
- Malformed contract addresses

### Running Offchain Tests

```bash
# Navigate to offchain test directory
cd test/offchain

# Install dependencies (first time only)
npm install

# Run complete test suite
npm run test

# Run full system demo
npm run start:full-system

# Generate sample data
npm run generate-samples
```

---

## Testing Philosophy

### Core Principles

**Focus on genuine validation over false confidence**
- Happy path testing for business logic
- Rigorous edge cases for security
- Tests must actually verify functionality, not just pass by design

### Anti-Patterns to Avoid

#### 1. Self-Satisfying Tests
**Bad Example:**
```javascript
// Test that just echoes back what was sent
const result = await api.registerAsset(assetData);
assert(result.assetData === assetData); // This proves nothing!
```

**Good Example:**
```javascript
// Test that verifies blockchain state changed
const result = await api.registerAsset(assetData);
const onchainAsset = await registry.getAsset(result.assetId);
assert(onchainAsset.name === assetData.name); // Independent verification
```

#### 2. Circular Validation
**Bad Example:**
```solidity
// Using same system to set and verify
token.mint(user, 100);
assertEq(token.balanceOf(user), 100); // Only proves mint didn't revert
```

**Good Example:**
```solidity
// Verify actual token behavior
token.mint(user, 100);
vm.prank(user);
token.transfer(recipient, 50); // Try using the tokens
assertEq(token.balanceOf(recipient), 50); // Verify transfer worked
```

#### 3. Existence-Only Validation
**Bad Example:**
```javascript
// Just checking data exists
const events = await getEvents();
assert(events.length > 0); // Could be any events!
```

**Good Example:**
```javascript
// Verify specific correct data
const events = await getEvents();
assert(events[0].name === 'AssetRegistered');
assert(events[0].args.assetId === expectedAssetId);
assert(events[0].blockNumber > deploymentBlock);
```

### Test Quality Gates

Before considering any test "complete":

1. **Sabotage Test**: Break the implementation - does the test fail?
2. **Data Verification**: Verify actual correctness, not just existence
3. **Independent Validation**: Avoid circular validation patterns
4. **Business Logic**: Validate intended protocol behavior

---

## Key Testing Patterns

### Foundry/Anvil Features

```solidity
// Impersonate users
vm.prank(user);
token.transfer(recipient, amount);

// Advance blocks (critical for ERC20Votes checkpoints)
vm.roll(block.number + 1);

// Generate signatures
(uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, digest);

// Expect events
vm.expectEmit(true, true, true, true);
emit AssetRegistered(assetId, owner);

// Expect reverts
vm.expectRevert("Unauthorized");
registry.registerAsset(invalidData);
```

### Critical Pattern for Checkpoints

```solidity
// ALWAYS advance blocks after transfers for ERC20Votes
token.transfer(bob, amount);
vm.roll(block.number + 1);  // Required!
uint256 snapshot = token.snapshot();
```

### Event Processing with Reorg Protection

```javascript
// Wait for block confirmations before processing events
const CONFIRMATION_BLOCKS = 3;
const events = await contract.queryFilter(filter, fromBlock, toBlock);

for (const event of events) {
  const currentBlock = await provider.getBlockNumber();
  if (currentBlock - event.blockNumber >= CONFIRMATION_BLOCKS) {
    await processEvent(event);
  }
}
```

---

## Performance Metrics

### Onchain Tests
- **Total Duration**: ~5-10 seconds for full suite
- **Test Count**: 55 tests across all tiers
- **Coverage**: >90% line coverage
- **Gas Reports**: Available via `forge test --gas-report`

### Offchain Tests
- **Total Duration**: ~48.7 seconds for full suite
- **Test Count**: 6 integration tests
- **HTTP Requests**: 8+ successful transactions
- **Blockchain Events**: 5+ captured and verified

---

## Continuous Integration

### GitHub Actions Setup

```yaml
name: Test

on: [push, pull_request]

jobs:
  onchain-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install Foundry
        uses: foundry-rs/foundry-toolchain@v1
      - name: Run tests
        run: forge test

  offchain-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - name: Install dependencies
        run: cd test/offchain && npm install
      - name: Run tests
        run: cd test/offchain && npm run test
```

---

## Troubleshooting

### Common Issues

**Onchain Tests:**
- **Issue**: Tests fail with "EvmError: Revert"
  - **Solution**: Run with `-vvvv` flag to see revert reason

- **Issue**: "No files changed" when running specific test
  - **Solution**: Check that path matches actual file location

**Offchain Tests:**
- **Issue**: "Port 8546 already in use"
  - **Solution**: Kill existing Anvil process: `pkill -f anvil`

- **Issue**: Contract deployment fails
  - **Solution**: Ensure Foundry is installed: `foundryup`

- **Issue**: API server won't start
  - **Solution**: Check port 3001 availability, install dependencies

---

## Additional Resources

- [Foundry Book](https://book.getfoundry.sh/)
- [Foundry Cheatcodes](https://book.getfoundry.sh/cheatcodes/)
- [OpenZeppelin Test Helpers](https://docs.openzeppelin.com/test-helpers/)
- [Testing Package Documentation](testing-package.md)
- [Developer Handbook](developer-handbook.md)

---

**Status**: ✅ **All Systems Operational**
**Last Updated**: 2025-11-09
