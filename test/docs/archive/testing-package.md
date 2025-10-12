# Asset Leasing Protocol Testing Framework Guide

## Table of Contents
1. [Overview](#overview)
2. [Testing Philosophy & Anti-Pattern Prevention](#testing-philosophy--anti-pattern-prevention)
3. [Foundry & Anvil Testing Framework](#foundry--anvil-testing-framework)
4. [Onchain Testing Architecture](#onchain-testing-architecture)
5. [Offchain System Integration](#offchain-system-integration)
6. [Test Suite Health & Improvement Strategy](#test-suite-health--improvement-strategy)
7. [Local Development Workflow](#local-development-workflow)
8. [Testing Best Practices](#testing-best-practices)
9. [Troubleshooting Guide](#troubleshooting-guide)

---

## Overview

The Asset Leasing Protocol employs a comprehensive yet focused testing framework that validates both onchain smart contract functionality and offchain system integration. Our approach prioritizes **genuine validation** over false confidence, ensuring tests actually verify protocol correctness rather than simply achieving high pass rates.

### Protocol Components Under Test

**Onchain Components:**
- **AssetRegistry**: Asset type definitions and registration
- **AssetERC20**: Fractional ownership tokens with ERC20Votes checkpoint functionality
- **LeaseFactory**: EIP-712 lease creation with dual signatures
- **Marketplace**: Sales, bidding, and revenue distribution

**Offchain Components:**
- **Event Indexing**: Real-time blockchain event processing
- **Metadata Storage**: IPFS and traditional database integration
- **API Services**: REST endpoints for mobile/web applications
- **Data Consistency**: Cross-system validation and integrity

### Current Test Suite Status

- **Onchain Tests**: 55 tests across 4 test suites (100% passing) ✅
- **Offchain Integration Tests**: 6 tests (100% passing) ✅
- **Total Tests**: 61 tests (55 onchain + 6 offchain)
- **Overall Pass Rate**: 100% ✅
- **Focus Areas**: Maintaining test quality, preventing regressions, continuous validation

---

## Testing Philosophy & Anti-Pattern Prevention

### Our Testing Approach

We develop a **simple protocol with excellent documentation** that clearly explains our objectives. Testing follows these principles:

1. **Happy Path Focus for Business Logic**: We test that the intended workflows function correctly
2. **Rigorous Edge Case Testing for Core Contracts**: Smart contract edge cases that could lead to vulnerabilities must pass
3. **Genuine Validation**: Tests must actually verify functionality, not just pass by design
4. **Clear Documentation**: Every test should explain what it protects against

### Critical Anti-Patterns to Avoid

#### ❌ Self-Satisfying Tests
**Problem**: Tests that succeed by design rather than validation
```javascript
// BAD: Testing that API returns what we just told it to return
const deployResponse = await test.apiRequest('POST', '/api/deploy');
test.assertEqual(deployResponse.status, 200, 'Deploy endpoint should return 200');
```

**Solution**: Verify actual functionality and data integrity
```javascript
// GOOD: Verify contracts are actually deployed and functional
const deployResponse = await test.apiRequest('POST', '/api/deploy');
test.assertEqual(deployResponse.status, 200, 'Deploy endpoint should return 200');
// Verify actual deployment by calling contract methods
const registry = new ethers.Contract(deployResponse.data.assetRegistry.address, abi, provider);
const typeId = await registry.createAssetType("Test", hash, url);
test.assertTruthy(typeId, 'Deployed contract should be functional');
```

#### ❌ Circular Validation
**Problem**: Using the same system to set and verify state
```solidity
// BAD: Using contract to verify its own calculations
uint256 snapshot = token.snapshot();
assertEq(token.balanceOfAt(alice, snapshot), expectedBalance);
```

**Solution**: Use independent verification methods where possible
```solidity
// GOOD: Verify using external view functions and known state
uint256 aliceBalanceBefore = token.balanceOf(alice);
vm.prank(alice);
token.transfer(bob, 100e18);
vm.roll(block.number + 1);
uint256 snapshot = token.snapshot();
// Verify against independently tracked state
assertEq(token.balanceOfAt(alice, snapshot), aliceBalanceBefore - 100e18);
```

#### ❌ Existence-Only Validation
**Problem**: Testing that data exists without verifying correctness
```javascript
// BAD: Only checking that events exist
test.assert(eventsResponse.data.data.eventsCount > 0, 'Should have some events');
```

**Solution**: Validate specific event data and structure
```javascript
// GOOD: Verify specific events with correct data
const events = eventsResponse.data.data.events;
const assetRegisteredEvent = events.find(e => e.eventName === 'AssetRegistered');
test.assertTruthy(assetRegisteredEvent, 'AssetRegistered event should exist');
test.assertEqual(assetRegisteredEvent.args[0], expectedAssetId, 'Asset ID should match');
test.assertEqual(assetRegisteredEvent.args[1], expectedOwner, 'Owner should match');
```

### Test Builder Agent Integration

For complex edge case testing that requires sophisticated test patterns, we use the **test-builder-solidity** agent to:
1. **Identify Missing Edge Cases**: Analyze current failing tests to understand gaps
2. **Generate Robust Test Scenarios**: Create tests that actually validate edge conditions
3. **Validate Test Quality**: Ensure new tests avoid anti-patterns and provide genuine coverage

**Important**: The test-builder agent should focus on **fixing existing failing tests** and **validating current test quality**, not creating additional tests beyond our core requirements.

---

## Foundry & Anvil Testing Framework

### What is Anvil?

Anvil is Foundry's local Ethereum node that provides a fast, deterministic blockchain environment for testing. It enables:

- **Speed**: Tests run in milliseconds instead of minutes
- **Determinism**: Same results every time, reproducible bugs
- **Control**: Manipulate time, blocks, accounts, and network conditions
- **Cost**: Zero gas costs, unlimited transactions
- **Privacy**: No external dependencies, test sensitive features safely

### How Our Protocol Uses Anvil

#### 1. **Account Management**
```solidity
// Creating deterministic test accounts from private keys
uint256 pkAdmin = 0xA11CE;
address admin = vm.addr(pkAdmin);   // Convert private key to address

uint256 pkSeller = 0xB0B;
address seller = vm.addr(pkSeller); // Deterministic test accounts
```

**Benefits:**
- Consistent addresses across test runs
- No need to manage external wallets or funding
- Perfect for testing multi-party interactions

#### 2. **Identity Impersonation**
```solidity
vm.prank(admin);              // Next call comes from admin
token.snapshot();             // Admin creates snapshot

vm.prank(alice);              // Switch to alice
token.transfer(bob, 100e18);  // Alice transfers tokens
```

**Benefits:**
- Test access control without multiple wallet connections
- Simulate complex multi-user scenarios
- Verify permission-based operations

#### 3. **Time and Block Manipulation**
```solidity
vm.roll(block.number + 1);    // Advance block number for checkpoints
vm.warp(block.timestamp + 10); // Jump 10 seconds forward for deadlines
```

**Benefits:**
- Test time-dependent features instantly
- Simulate lease deadlines and snapshot timing
- Validate checkpoint-based systems

#### 4. **Cryptographic Signatures**
```solidity
bytes32 digest = leaseFactory.hashLeaseIntent(leaseIntent);
(uint8 v, bytes32 r, bytes32 s) = vm.sign(pkOwner, digest);
bytes memory signature = abi.encodePacked(r, s, v);
```

**Benefits:**
- Generate valid EIP-712 signatures for testing
- Test dual-signature lease workflows
- Validate signature verification logic

---

## Onchain Testing Architecture

### Test Organization Strategy

Our testing framework follows a **three-tier architecture** that builds confidence incrementally:

#### Tier 1: Component Testing (AssetERC20Simple.t.sol)
**Purpose**: Validate individual contract functionality in isolation

```solidity
function test_SnapshotBalances() public {
    // PHASE 1: Initial token transfer
    vm.prank(alice);
    token.transfer(bob, 300e18);  // Transfer 30% ownership

    // PHASE 2: Block advancement for checkpoints
    vm.roll(block.number + 1);   // Critical for ERC20Votes

    // PHASE 3: Create snapshot
    vm.prank(admin);
    uint256 snapshotId = token.snapshot();

    // PHASE 4: Verify historical accuracy
    assertEq(token.balanceOfAt(alice, snapshotId), 700e18);
    assertEq(token.balanceOfAt(bob, snapshotId), 300e18);
}
```

**Key Testing Patterns:**
- **Single Responsibility**: Each test validates one specific feature
- **State Isolation**: Tests don't interfere with each other
- **Descriptive Documentation**: ASCII art boxes explain test phases
- **Negative Testing**: Comprehensive error condition validation

#### Tier 2: Integration Testing (AssetFlow.t.sol)
**Purpose**: Validate multi-contract interactions and workflows

```solidity
function test_Type_Register_Transfer_LeaseMint() public {
    // STEP 1: Create Asset Type (Registry)
    uint256 typeId = registry.createAssetType(
        "Satellite",                    // Asset type name
        schemaHash,                     // Validation schema
        "ipfs://schema"                 // Schema metadata
    );

    // STEP 2: Register Specific Asset (Registry → ERC20 Deployment)
    uint256 assetId = registry.registerAsset(
        typeId,                         // Links to asset type
        owner,                          // Initial owner
        keccak256("metadata"),          // Asset metadata hash
        "ipfs://asset",                 // Asset metadata URI
        "SatelliteOne",                 // ERC20 token name
        "SAT1",                         // ERC20 token symbol
        1000e18                         // Total supply
    );

    // STEP 3: Transfer Fractions (ERC20)
    address tokenAddr = registry.getAssetToken(assetId);
    AssetERC20 token = AssetERC20(tokenAddr);

    vm.prank(owner);
    token.transfer(lessee, 200e18);     // 20% ownership to lessee

    // STEP 4: Create Lease (LeaseFactory with dual signatures)
    LeaseFactory.LeaseIntent memory intent = LeaseFactory.LeaseIntent({
        lessor: owner,                  // Asset owner
        lessee: lessee,                 // Asset lessee
        assetId: assetId,               // Which asset
        paymentToken: address(usdc),    // Payment currency
        rentAmount: 100e6,              // Monthly rent (USDC)
        rentPeriod: 30 days,            // Payment frequency
        securityDeposit: 300e6,         // Security deposit
        startTime: block.timestamp,     // Lease start
        endTime: block.timestamp + 365 days, // One year lease
        metadataHash: keccak256("lease"), // Lease terms hash
        legalDocHash: keccak256("legal"), // Legal document hash
        nonce: 1,                       // Unique nonce
        deadline: uint64(block.timestamp + 1 days), // Signature deadline
        termsVersion: 1,                // Terms version
        assetTypeSchemaHash: schemaHash // Asset type validation
    });

    // Generate dual signatures
    bytes32 digest = leaseFactory.hashLeaseIntent(intent);
    (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(pkOwner, digest);
    (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(pkLessee, digest);

    bytes memory sigLessor = abi.encodePacked(r1, s1, v1);
    bytes memory sigLessee = abi.encodePacked(r2, s2, v2);

    // Mint lease NFT
    uint256 leaseId = leaseFactory.mintLease(
        intent,                         // Lease terms
        sigLessor,                      // Owner signature
        sigLessee,                      // Lessee signature
        "ipfs://lease-nft"             // NFT metadata
    );

    // Verify lease creation
    assertEq(leaseFactory.ownerOf(leaseId), lessee);
    assertTrue(leaseFactory.isValidLease(leaseId));
}
```

**Key Integration Patterns:**
- **Contract Address Resolution**: Tests proper cross-contract addressing
- **State Synchronization**: Validates consistency across contracts
- **Permission Flow**: Tests role-based access across boundaries
- **Event Coordination**: Verifies proper event emission and handling

#### Tier 3: System Testing (MarketplaceFlow.t.sol)
**Purpose**: Validate complete end-to-end workflows with realistic scenarios

```solidity
function test_Sales_Leases_RevenueFlow() public {
    // PHASE 1: TOKEN SALES
    // Deploy asset and setup marketplace permissions
    (uint256 assetId, address tokenAddr, ) = _deployAsset();
    AssetERC20 sat = AssetERC20(tokenAddr);

    // Fund potential buyers
    mUSD.mint(addrA, 1e24);  // Buyer A funding
    mUSD.mint(addrB, 1e24);  // Buyer B funding

    // Seller posts sale offering 50% of asset
    vm.prank(seller);
    uint256 saleId = market.postSale(
        tokenAddr,   // Asset token to sell
        5e17,        // Amount: 0.5 tokens (50%)
        1_000_000    // Price: 1.0 mUSD per token
    );

    // Competitive bidding scenario
    vm.startPrank(addrA);
    mUSD.approve(address(market), type(uint256).max);
    uint256 bidA = market.placeSaleBid(
        saleId,  // Sale to bid on
        2e17,    // Amount: 0.2 tokens (20%)
        500_000  // Price: 0.5 mUSD per token
    );
    vm.stopPrank();

    vm.startPrank(addrB);
    mUSD.approve(address(market), type(uint256).max);
    uint256 bidB = market.placeSaleBid(
        saleId,  // Same sale
        3e17,    // Amount: 0.3 tokens (30%)
        800_000  // Higher price: 0.8 mUSD per token
    );
    vm.stopPrank();

    // Seller accepts higher bid
    vm.prank(seller);
    sat.approve(address(market), 5e17);
    market.acceptSaleBid(saleId, bidB);

    // PHASE 2: LEASE CREATION
    // Construct lease intent with all terms
    LeaseFactory.LeaseIntent memory L = LeaseFactory.LeaseIntent({
        lessor: seller,
        lessee: addrA,
        assetId: assetId,
        paymentToken: address(mUSD),
        rentAmount: 100,             // 100 micro-mUSD rent
        rentPeriod: 30 days,
        securityDeposit: 500,        // 500 micro-mUSD deposit
        startTime: block.timestamp,
        endTime: block.timestamp + 365 days,
        metadataHash: keccak256("leaseMeta"),
        legalDocHash: keccak256("leaseDoc"),
        nonce: 77,
        deadline: uint64(block.timestamp + 3 days),
        termsVersion: uint16(1),
        assetTypeSchemaHash: T.schemaHash
    });

    // Generate signatures and create lease
    bytes32 digest = leaseFactory.hashLeaseIntent(L);
    (uint8 vA, bytes32 rA, bytes32 sA) = vm.sign(pkA, digest);
    (uint8 vL, bytes32 rL, bytes32 sL) = vm.sign(pkSeller, digest);

    bytes memory sigLessee = abi.encodePacked(rA, sA, vA);
    bytes memory sigLessor = abi.encodePacked(rL, sL, vL);

    // Execute lease with escrow
    vm.prank(seller);
    (uint256 leaseId, uint256 roundId) = market.acceptLeaseBid(
        offerId,
        bidIdx,
        sigLessor,
        "ipfs://lease"
    );

    // PHASE 3: REVENUE DISTRIBUTION
    // Calculate expected pro-rata distribution
    uint256 sellerSnapshotBalance = sat.balanceOfAt(seller, roundId);
    uint256 buyerBSnapshotBalance = sat.balanceOfAt(addrB, roundId);
    uint256 totalSnapshotSupply = sat.totalSupplyAt(roundId);
    uint256 totalRevenue = 10_000_000; // Total escrow amount

    uint256 expectedSellerRevenue = totalRevenue * sellerSnapshotBalance / totalSnapshotSupply;
    uint256 expectedBuyerBRevenue = totalRevenue * buyerBSnapshotBalance / totalSnapshotSupply;

    // Execute revenue claims
    vm.prank(seller);
    market.claimRevenue(roundId);

    vm.prank(addrB);
    market.claimRevenue(roundId);

    // Verify accurate pro-rata distribution
    uint256 sellerRevenue = mUSD.balanceOf(seller) - sellerBalanceBefore;
    uint256 buyerBRevenue = mUSD.balanceOf(addrB) - buyerBBalanceBefore;

    assertEq(sellerRevenue, expectedSellerRevenue, "Seller revenue must match ownership %");
    assertEq(buyerBRevenue, expectedBuyerBRevenue, "Buyer B revenue must match ownership %");
}
```

**Key System Testing Features:**
- **Multi-Actor Scenarios**: Realistic interactions between multiple parties
- **Economic Validation**: Tests financial flows and calculations
- **Complex State Transitions**: Validates state across entire workflows
- **Real-World Simulation**: Mirrors actual protocol usage patterns

### Advanced Testing Methodologies

#### 1. **Descriptive Block Documentation**
```solidity
// ┌─────────────────────────────────────────────────────────────────────┐
// │                         VERIFY INITIAL STATE                       │
// │                                                                     │
// │ Before any snapshots are created, the current snapshot ID should   │
// │ be 0, indicating no snapshots exist yet.                           │
// └─────────────────────────────────────────────────────────────────────┘
```

**Benefits:**
- Tests serve as living documentation
- Clear intent communication for maintainers
- Easy to understand complex test logic

#### 2. **Checkpoint-Based State Management**
```solidity
// CRITICAL: Advance block after transfers for snapshot accessibility
// ERC20Votes uses checkpoints that need block advancement
vm.roll(block.number + 1);
```

**Benefits:**
- Mimics actual blockchain behavior
- Tests time-dependent functionality correctly
- Prevents test interference through proper isolation

#### 3. **Multi-Signature Validation**
```solidity
// Generate independent signatures for dual validation
bytes32 digest = leaseFactory.hashLeaseIntent(finalL);
(uint8 vA, bytes32 rA, bytes32 sA) = vm.sign(pkA, digest);
(uint8 vL, bytes32 rL, bytes32 sL) = vm.sign(pkSeller, digest);

// Test complete signature workflow
leaseFactory.mintLease(finalL, sigLessor, sigLessee, uri);
```

**Benefits:**
- Tests cryptographic signature verification
- Validates EIP-712 implementation
- Ensures signature replay protection

### Security Testing Approaches

#### 1. **Access Control Validation**
```solidity
function test_RevertWhen_UnauthorizedSnapshotCreation() public {
    // Test unauthorized user
    vm.prank(alice);
    vm.expectRevert(); // Should fail due to missing SNAPSHOT_ROLE
    token.snapshot();

    // Test admin success (for comparison)
    vm.prank(admin);
    uint256 snapshotId = token.snapshot();
    assertEq(snapshotId, 1, "Admin should be able to create snapshots");
}
```

#### 2. **Signature Replay Protection**
```solidity
function test_RevertWhen_DuplicateNonce() public {
    // Use same nonce twice
    LeaseIntent memory L1 = LeaseIntent({nonce: 1, /*...*/});
    LeaseIntent memory L2 = LeaseIntent({nonce: 1, /*...*/});

    // First use succeeds
    leaseFactory.mintLease(L1, sig1, sig2, uri1);

    // Second use fails
    vm.expectRevert("nonce used");
    leaseFactory.mintLease(L2, sig3, sig4, uri2);
}
```

#### 3. **Economic Attack Prevention**
```solidity
function test_ProRataRevenueDistribution() public {
    // Verify exact ownership percentage calculations
    uint256 expectedRevenue = totalRevenue * userBalance / totalSupply;

    market.claimRevenue(roundId);

    assertEq(actualReceived, expectedRevenue, "Revenue must match exact ownership %");
}
```

### Test Coverage Analysis

#### **Current Strengths (100% success rate)**
- **ERC20 Operations**: Token transfers, approvals, allowances
- **Snapshot Systems**: Historical balance queries, checkpoint management with edge cases
- **Auto-Delegation**: Seamless governance participation
- **Access Control**: Role-based permissions, unauthorized access prevention
- **Signature Verification**: EIP-712 implementation, replay protection
- **Edge Case Handling**: Token distribution extremes, minimal amounts, rapid operations
- **Security Validation**: Revenue claim authorization, balance verification

#### **Maintained Quality Standards**
- **Genuine Validation**: All tests verify actual protocol behavior
- **No Anti-Patterns**: Tests avoid self-satisfaction and circular validation
- **Edge Case Coverage**: Comprehensive handling of boundary conditions
- **Security Focus**: Critical access control and authorization checks

---

## Test Suite Health & Recent Improvements

### ✅ All Tests Passing - 100% Success Rate

Our test suite now has **all 55 tests passing**, representing a complete resolution of previously identified issues.

### Recently Fixed Issues (January 2025)

#### 1. **ERC20Votes Checkpoint Edge Cases** - ✅ RESOLVED
**Files**: `test/ERC20SnapshotMigration.t.sol`
- `test_ExtremeTokenDistributions`: ✅ Fixed - Handles token concentration and rounding correctly
- `test_MinimalTokenAmounts`: ✅ Fixed - Proper checkpoint timing resolved
- `test_RapidSequentialSnapshots`: ✅ Fixed - Corrected vm.prank() consumption and balance management

**Resolution**:
- Fixed checkpoint timing by removing redundant block advancements
- Handled Solidity integer division rounding (remainder calculation)
- Corrected vm.prank() usage to prevent consumption by view calls

#### 2. **Revenue Claim Authorization** - ✅ RESOLVED + SECURITY PATCH
**File**: `test/MarketplaceFlow.t.sol`
- `test_RevertWhen_UnauthorizedRevenueClaim`: ✅ Fixed - Security vulnerability patched
- `test_ZeroBalanceRevenueClaim`: ✅ Updated - Now correctly expects revert

**Resolution**:
- **Security Fix**: Added `require(bal > 0, "no balance")` to `Marketplace.claimRevenue()` (src/Marketplace.sol:277)
- Prevents unauthorized users from claiming revenue
- Prevents griefing/spam attempts with zero-balance claims
- All revenue distribution now properly validated

### Test Quality Improvements Implemented

#### ✅ Completed Improvements
1. **Security Hardening**: Fixed critical authorization vulnerability in revenue distribution
2. **Edge Case Handling**: Resolved all checkpoint timing and token distribution edge cases
3. **Test Accuracy**: Updated assertions to handle Solidity rounding behavior correctly
4. **Code Quality**: Removed redundant test setup code causing timing issues

#### 🎯 Ongoing Quality Standards
1. **Maintain Anti-Pattern Prevention**: Continue avoiding self-satisfying tests
2. **Regression Prevention**: Ensure new features don't break existing tests
3. **Documentation**: Keep test comments and documentation up-to-date
4. **Coverage Monitoring**: Track test coverage for new contract features

### Testing Quality Gates

Before considering any test "complete," it must pass these checks:

1. **The Sabotage Test**: Break the implementation - does the test fail?
2. **Data Verification Test**: Does the test verify actual data correctness?
3. **Independent Validation Test**: Can the test catch errors without relying on the same system it's testing?
4. **Business Logic Test**: Does the test validate the intended protocol behavior?

### Agent Usage Guidelines

When using the **test-builder-solidity** agent:

- ✅ **DO**: Request validation of existing test quality and anti-pattern detection
- ✅ **DO**: Have it suggest improvements to reduce circular validation
- ✅ **DO**: Ask for help with new edge cases as features are added
- ✅ **DO**: Use for security-focused test enhancements
- ❌ **DON'T**: Ask it to create extensive new test suites beyond our current scope
- ❌ **DON'T**: Request complex fuzzing or invariant testing for this version (unless specific need arises)
- ❌ **DON'T**: Use it to inflate test numbers without genuine value

---

## Offchain Testing Architecture

### Overview

The offchain testing framework validates the complete integration between blockchain smart contracts and offchain services, ensuring end-to-end functionality of the Asset Leasing Protocol. This testing layer bridges the gap between onchain logic and real-world application needs.

### Test Suite Components

#### 1. **Anvil Blockchain Manager**
Provides automated local blockchain management for consistent testing:
- Starts and stops Anvil instances programmatically
- Configures chain parameters (chain ID, gas limits, accounts)
- Manages blockchain state snapshots for test isolation
- Handles cleanup to prevent port conflicts

#### 2. **Contract Deployment System**
Deploys the complete smart contract suite to the test blockchain:
- MockStablecoin (mUSD) for payment simulation
- AssetRegistry for asset type and token management
- LeaseFactory for lease NFT creation
- Marketplace for trading and revenue distribution

#### 3. **REST API Server**
Provides HTTP endpoints that interact with deployed contracts:
- `POST /api/deploy` - Deploy contracts to blockchain
- `POST /api/assets/register-type` - Register new asset types
- `POST /api/assets/create-token` - Create ERC-20 tokens for assets
- `POST /api/leases/create-offer` - Create marketplace lease offers
- `GET /api/events/:contractName` - Query blockchain events
- `GET /api/status` - System health and deployment info

#### 4. **Integration Test Runner**
Executes comprehensive end-to-end tests:
- **Test 1**: Anvil blockchain startup and configuration
- **Test 2**: Smart contract deployment and verification
- **Test 3**: API server initialization and health check
- **Test 4**: API blockchain integration (deployment via API)
- **Test 5**: Complete asset leasing workflow validation
- **Test 6**: Error handling and edge case coverage

### Test Results and Metrics

```
Offchain Integration Test Results (January 2025):
============================================================
Total Tests:  6
Passed:       6 ✅
Failed:       0
Pass Rate:    100%
Duration:     ~48 seconds
============================================================

Test Breakdown:
1. Anvil blockchain startup         ✅ (87ms)
2. Smart contract deployment        ✅ (16.5s)
3. API server initialization         ✅ (1s)
4. API blockchain integration       ✅ (16.6s)
5. Complete workflow validation     ✅ (14.4s)
6. Error handling                   ✅ (4ms)
```

### Anti-Pattern Avoidance in Offchain Tests

The offchain tests follow the same anti-pattern prevention principles:

#### **Genuine Validation**
```javascript
// GOOD: Verify actual blockchain state, not just API response
const deployResponse = await test.apiRequest('POST', '/api/deploy');
test.assertEqual(deployResponse.status, 200, 'Deploy endpoint should return 200');

// Actually verify contracts are deployed and functional
const registry = new ethers.Contract(deployResponse.data.assetRegistry.address, abi, provider);
const typeId = await registry.createAssetType("Test", hash, url);
test.assertTruthy(typeId, 'Deployed contract should be functional');
```

#### **Independent Verification**
```javascript
// GOOD: Cross-verify between blockchain and API
const blockchainAsset = await contract.getAsset(assetId);
const apiResponse = await fetch(`/api/assets/${assetId}`);
const apiAsset = await apiResponse.json();

// Verify consistency across systems
test.assertEqual(apiAsset.tokenAddress, blockchainAsset.tokenAddress,
                'API data must match blockchain state');
```

#### **Specific Value Assertions**
```javascript
// GOOD: Verify specific event data, not just existence
const events = eventsResponse.data.data.events;
const assetRegisteredEvent = events.find(e => e.eventName === 'AssetRegistered');
test.assertTruthy(assetRegisteredEvent, 'AssetRegistered event should exist');
test.assertEqual(assetRegisteredEvent.args[0], expectedAssetId, 'Asset ID should match');
test.assertEqual(assetRegisteredEvent.args[1], expectedOwner, 'Owner should match');
```

### Running Offchain Tests

#### **Quick Start**
```bash
# From the test/offchain directory
cd test/offchain
npm install
npm test  # Runs complete test suite
```

#### **Individual Components**
```bash
# Start only Anvil
npx anvil --port 8545 --chain-id 31337

# Start only API server
npm start

# Run specific test scenarios
npm run test:blockchain
npm run test:api
npm run test:integration
```

#### **Manual Testing with curl**
```bash
# Health check
curl http://localhost:3001/health

# Deploy contracts
curl -X POST http://localhost:3001/api/deploy

# Register asset type
curl -X POST http://localhost:3001/api/assets/register-type \
  -H "Content-Type: application/json" \
  -d '{"name": "Satellite", "assetType": "orbital", "schemaUrl": "https://example.com/schema"}'
```

### Performance and Reliability

The offchain testing framework demonstrates:
- **Speed**: Complete test suite runs in ~48 seconds
- **Reliability**: 100% pass rate with consistent results
- **Isolation**: Each test runs in a clean environment
- **Coverage**: Tests all critical integration points
- **Error Handling**: Validates graceful failure scenarios

---

## Offchain System Integration

### Overview of Offchain Requirements

The Asset Leasing Protocol requires sophisticated offchain infrastructure to support:

- **Event Indexing**: Real-time blockchain event monitoring and processing
- **Metadata Management**: IPFS integration and traditional database storage
- **API Services**: REST endpoints for mobile and web applications
- **Payment Processing**: Lease payment notifications and automation
- **Analytics**: Dashboard data aggregation and reporting

### Local Testing Architecture

#### 1. **Anvil Management System**

The offchain testing framework provides automated Anvil blockchain management:

```typescript
// Automated Anvil instance management
export class AnvilManager {
    async start(config: AnvilConfig): Promise<AnvilInstance> {
        const process = spawn('anvil', [
            '--port', config.port.toString(),
            '--chain-id', config.chainId.toString(),
            '--accounts', config.accounts.toString(),
            '--balance', config.balance.toString(),
            '--gas-limit', config.gasLimit.toString()
        ]);

        // Wait for Anvil to be ready
        await this.waitForReady(config.port);

        return {
            process,
            config,
            url: `http://localhost:${config.port}`,
            chainId: config.chainId
        };
    }

    async takeSnapshot(instance: AnvilInstance): Promise<string> {
        // Create blockchain state snapshot for test isolation
        const response = await fetch(instance.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'evm_snapshot',
                params: [],
                id: 1
            })
        });

        const result = await response.json();
        return result.result;
    }

    async revertToSnapshot(instance: AnvilInstance, snapshotId: string): Promise<void> {
        // Revert blockchain state for clean test environment
        await fetch(instance.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'evm_revert',
                params: [snapshotId],
                id: 1
            })
        });
    }
}
```

**Benefits:**
- **Automated Setup**: No manual Anvil management required
- **State Isolation**: Clean environment for each test
- **Configuration Management**: Persistent settings across test runs
- **Multiple Instances**: Support for complex testing scenarios

#### 2. **Event Processing Framework**

Real-time blockchain event monitoring with resilience features:

```typescript
export class EventListener {
    private buffer: BlockchainEvent[] = [];
    private lastProcessedBlock = 0;

    async startListening(contracts: Contract[]): Promise<void> {
        // Set up event filters for all protocol contracts
        const filters = contracts.map(contract => ({
            address: contract.address,
            topics: [
                contract.interface.getEventTopic('AssetRegistered'),
                contract.interface.getEventTopic('LeaseCreated'),
                contract.interface.getEventTopic('RevenueDistributed')
            ]
        }));

        // Poll for new events with exponential backoff
        setInterval(async () => {
            try {
                const events = await this.fetchNewEvents(filters);
                this.buffer.push(...events);
                await this.processBufferedEvents();
            } catch (error) {
                console.error('Event processing error:', error);
                // Implement retry logic with exponential backoff
                await this.handleEventError(error);
            }
        }, this.config.pollInterval);
    }

    private async processBufferedEvents(): Promise<void> {
        // Process events in order with reorg protection
        const sortedEvents = this.buffer.sort((a, b) =>
            a.blockNumber - b.blockNumber || a.logIndex - b.logIndex
        );

        for (const event of sortedEvents) {
            await this.processEvent(event);
            this.lastProcessedBlock = Math.max(this.lastProcessedBlock, event.blockNumber);
        }

        // Clear processed events
        this.buffer = [];
    }

    private async processEvent(event: BlockchainEvent): Promise<void> {
        switch (event.eventName) {
            case 'AssetRegistered':
                await this.handleAssetRegistered(event);
                break;
            case 'LeaseCreated':
                await this.handleLeaseCreated(event);
                break;
            case 'RevenueDistributed':
                await this.handleRevenueDistributed(event);
                break;
        }
    }
}
```

**Key Features:**
- **Reorg Protection**: Handles blockchain reorganizations gracefully
- **Event Ordering**: Processes events in correct chronological order
- **Error Recovery**: Resilient to network failures and RPC issues
- **Performance Monitoring**: Tracks event processing latency and throughput

#### 3. **Mock Offchain Services**

Comprehensive simulation of production offchain infrastructure:

```typescript
export class MockServices {
    private database = new Map<string, any>();
    private cache = new Map<string, { value: any; expires: number }>();
    private apiEndpoints = new Map<string, (req: any) => Promise<any>>();

    // Mock database with transaction support
    async dbTransaction<T>(operations: () => Promise<T>): Promise<T> {
        const snapshot = new Map(this.database);
        try {
            const result = await operations();
            return result;
        } catch (error) {
            // Rollback on error
            this.database = snapshot;
            throw error;
        }
    }

    // Mock IPFS storage
    async ipfsStore(content: string): Promise<string> {
        const hash = this.generateIPFSHash(content);
        this.database.set(`ipfs:${hash}`, content);
        return hash;
    }

    async ipfsRetrieve(hash: string): Promise<string> {
        const content = this.database.get(`ipfs:${hash}`);
        if (!content) {
            throw new Error(`IPFS content not found: ${hash}`);
        }
        return content;
    }

    // Mock API endpoints
    setupAPIEndpoint(path: string, handler: (req: any) => Promise<any>): void {
        this.apiEndpoints.set(path, handler);
    }

    async callAPI(path: string, request: any): Promise<any> {
        const handler = this.apiEndpoints.get(path);
        if (!handler) {
            throw new Error(`API endpoint not found: ${path}`);
        }
        return await handler(request);
    }

    // Mock cache with TTL
    cacheSet(key: string, value: any, ttlSeconds: number): void {
        this.cache.set(key, {
            value,
            expires: Date.now() + (ttlSeconds * 1000)
        });
    }

    cacheGet(key: string): any | null {
        const item = this.cache.get(key);
        if (!item || Date.now() > item.expires) {
            this.cache.delete(key);
            return null;
        }
        return item.value;
    }
}
```

**Mock Services Include:**
- **In-Memory Database**: Simulates PostgreSQL/MongoDB with transactions
- **Cache Layer**: Redis-like caching with TTL support
- **IPFS Storage**: Deterministic content addressing
- **API Endpoints**: HTTP service simulation with proper error handling

#### 4. **Integration Test Suite**

End-to-end validation of the complete system:

```typescript
export class IntegrationTestSuite {
    async testCompleteAssetLifecycle(): Promise<TestResult> {
        const startTime = Date.now();

        try {
            // 1. Deploy contracts and start event listening
            const contracts = await this.contractDeployer.deployAll();
            await this.eventListener.startListening(contracts);

            // 2. Register asset type and specific asset
            const assetTypeId = await contracts.registry.createAssetType(
                "Satellite",
                "0x1234...", // schema hash
                "ipfs://schema"
            );

            const assetId = await contracts.registry.registerAsset(
                assetTypeId,
                this.testAccounts.owner,
                "0x5678...", // metadata hash
                "ipfs://metadata",
                "SatelliteOne",
                "SAT1",
                ethers.utils.parseEther("1000")
            );

            // 3. Wait for events to be processed
            await this.waitForEventProcessing();

            // 4. Verify offchain data consistency
            const dbAsset = await this.mockServices.dbGet(`asset:${assetId}`);
            assert(dbAsset, "Asset should be indexed in database");
            assert(dbAsset.tokenAddress, "Token address should be stored");

            // 5. Test marketplace operations
            const tokenContract = await ethers.getContractAt("AssetERC20", dbAsset.tokenAddress);

            // Transfer some tokens
            await tokenContract.connect(this.testAccounts.owner)
                .transfer(this.testAccounts.buyer, ethers.utils.parseEther("100"));

            // Wait for transfer event processing
            await this.waitForEventProcessing();

            // 6. Create lease with dual signatures
            const leaseIntent = {
                lessor: this.testAccounts.owner.address,
                lessee: this.testAccounts.buyer.address,
                assetId,
                paymentToken: contracts.usdc.address,
                rentAmount: 1000000, // 1 USDC (6 decimals)
                rentPeriod: 30 * 24 * 60 * 60, // 30 days
                securityDeposit: 5000000, // 5 USDC
                startTime: Math.floor(Date.now() / 1000),
                endTime: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60), // 1 year
                metadataHash: "0xabcd...",
                legalDocHash: "0xefgh...",
                nonce: 1,
                deadline: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
                termsVersion: 1,
                assetTypeSchemaHash: "0x1234..."
            };

            // Generate signatures
            const digest = await contracts.leaseFactory.hashLeaseIntent(leaseIntent);
            const lessorSig = await this.testAccounts.owner.signMessage(ethers.utils.arrayify(digest));
            const lesseeSig = await this.testAccounts.buyer.signMessage(ethers.utils.arrayify(digest));

            // Create lease
            const tx = await contracts.leaseFactory.mintLease(
                leaseIntent,
                lessorSig,
                lesseeSig,
                "ipfs://lease-metadata"
            );

            const receipt = await tx.wait();
            const leaseId = receipt.events?.find(e => e.event === 'LeaseCreated')?.args?.leaseId;

            // 7. Wait for lease creation event processing
            await this.waitForEventProcessing();

            // 8. Verify complete data consistency
            const dbLease = await this.mockServices.dbGet(`lease:${leaseId}`);
            assert(dbLease, "Lease should be indexed in database");
            assert(dbLease.lessor === leaseIntent.lessor, "Lessor should match");
            assert(dbLease.lessee === leaseIntent.lessee, "Lessee should match");

            // 9. Test API endpoints
            const assetAPI = await this.mockServices.callAPI('/api/assets/' + assetId, {});
            assert(assetAPI.tokenAddress === dbAsset.tokenAddress, "API should return correct token address");

            const leaseAPI = await this.mockServices.callAPI('/api/leases/' + leaseId, {});
            assert(leaseAPI.status === 'active', "API should show lease as active");

            return {
                success: true,
                duration: Date.now() - startTime,
                testName: 'CompleteAssetLifecycle',
                metrics: {
                    eventsProcessed: this.eventListener.getProcessedCount(),
                    dbOperations: this.mockServices.getDbOperationCount(),
                    apiCalls: this.mockServices.getApiCallCount()
                }
            };

        } catch (error) {
            return {
                success: false,
                duration: Date.now() - startTime,
                testName: 'CompleteAssetLifecycle',
                error: error.message,
                stack: error.stack
            };
        }
    }

    private async waitForEventProcessing(): Promise<void> {
        // Wait for event processing with timeout
        const timeout = 10000; // 10 seconds
        const startTime = Date.now();

        while (Date.now() - startTime < timeout) {
            if (this.eventListener.isUpToDate()) {
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        throw new Error('Event processing timeout');
    }
}
```

**Test Coverage:**
- **Asset Lifecycle**: Registration → Tokenization → Marketplace → Leasing
- **Event Processing**: Real-time monitoring and data consistency
- **API Integration**: REST endpoint validation
- **Data Integrity**: Hash verification and referential consistency
- **Performance**: Latency and throughput monitoring

### Testing Methodologies

#### 1. **Event-Driven Testing**
```typescript
// Test event processing with controlled timing
async testEventProcessingResilience(): Promise<void> {
    // 1. Generate blockchain events
    await contract.createAsset(/* params */);

    // 2. Simulate network failure during processing
    this.eventListener.simulateNetworkFailure();

    // 3. Verify graceful recovery
    await this.eventListener.recover();

    // 4. Validate all events were processed correctly
    const dbState = await this.mockServices.dbGetAll();
    assert(dbState.assets.length === 1, "Asset should be processed after recovery");
}
```

#### 2. **Data Consistency Validation**
```typescript
// Test cross-system data integrity
async testDataConsistency(): Promise<void> {
    // 1. Perform blockchain operation
    const tx = await contract.registerAsset(/* params */);
    const receipt = await tx.wait();

    // 2. Wait for offchain processing
    await this.waitForEventProcessing();

    // 3. Validate data matches across systems
    const blockchainAsset = await contract.getAsset(assetId);
    const databaseAsset = await this.mockServices.dbGet(`asset:${assetId}`);
    const cachedAsset = this.mockServices.cacheGet(`asset:${assetId}`);

    // Verify consistency
    assert(blockchainAsset.owner === databaseAsset.owner, "Owner must match");
    assert(blockchainAsset.tokenAddress === databaseAsset.tokenAddress, "Token address must match");
    assert(databaseAsset.metadataHash === cachedAsset.metadataHash, "Cache must be consistent");
}
```

#### 3. **API and Data Integrity Testing**
```typescript
// Test API endpoint behavior with proper data validation
async testAPIIntegration(): Promise<void> {
    // 1. Create asset via blockchain
    const tx = await contract.registerAsset(
        typeId, owner, metadataHash, dataURI, name, symbol, supply
    );
    const receipt = await tx.wait();
    const assetId = receipt.events.find(e => e.event === 'AssetRegistered').args.assetId;

    // 2. Wait for offchain processing
    await this.waitForEventProcessing();

    // 3. Test API data accuracy (not just existence)
    const apiResponse = await this.mockServices.callAPI(`/api/assets/${assetId}`, {});
    assert(apiResponse.success, "API should return success");

    // Verify actual data correctness, not just existence
    assert(apiResponse.data.id === assetId.toString(), "Asset ID must match blockchain");
    assert(apiResponse.data.owner === owner, "Owner must match blockchain state");
    assert(apiResponse.data.name === name, "Name must match registration");

    // 4. Cross-verify with blockchain state
    const blockchainAsset = await contract.getAsset(assetId);
    assert(apiResponse.data.tokenAddress === blockchainAsset.tokenAddress,
           "Token address must match blockchain");

    // 5. Verify database consistency
    const dbAsset = await this.mockServices.dbGet(`asset:${assetId}`);
    assert(dbAsset.metadataHash === blockchainAsset.metadataHash,
           "Database must be consistent with blockchain");
}
```

---

## Local Development Workflow

### Quick Start Guide

#### 1. **Basic Testing Setup**
```bash
# Clone the repository
git clone <repository-url>
cd asset-leasing-protocol

# Install dependencies
npm install

# Start Anvil (in background)
anvil --port 8545 --chain-id 31337 &

# Run all tests
forge test

# Run specific test suite
forge test --match-path test/AssetFlow.t.sol

# Run with detailed output
forge test -vvvv
```

#### 2. **Interactive Development**
```bash
# Terminal 1: Start Anvil with logging
anvil --port 8545 --chain-id 31337 --gas-limit 30000000

# Terminal 2: Deploy contracts locally
forge script script/Deploy.s.sol:Deploy --rpc-url http://localhost:8545 --broadcast

# Terminal 3: Run integration tests
cd test/offchain
npm install
npm run test:integration

# Terminal 4: Start mock services (optional)
npm run services:start
```

#### 3. **Advanced Testing Workflow**
```bash
# Set up test environment variables
export ANVIL_PORT=8545
export CHAIN_ID=31337
export ADMIN_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Run comprehensive test suite
npm run test:full

# Generate test coverage report
forge coverage --report lcov
genhtml lcov.info --output-directory coverage/

# Run gas optimization analysis
forge test --gas-report

# Profile specific functions
forge debug --rpc-url http://localhost:8545 <transaction-hash>
```

### Test Development Patterns

#### 1. **Test-Driven Development Cycle**
```bash
# 1. Write failing test
forge test --match-test test_NewFeature -vvvv

# 2. Implement feature
# (edit contracts)

# 3. Run test until passing
forge test --match-test test_NewFeature

# 4. Run full suite to ensure no regressions
forge test

# 5. Optimize if needed
forge test --gas-report --match-test test_NewFeature
```

#### 2. **Integration Testing Cycle**
```bash
# 1. Start fresh Anvil instance
anvil --port 8545 --chain-id 31337

# 2. Deploy contracts
forge script script/Deploy.s.sol:Deploy --rpc-url http://localhost:8545 --broadcast

# 3. Run offchain integration tests
cd test/offchain
npm run test:integration

# 4. Verify end-to-end workflows
npm run test:e2e

# 5. Check performance metrics
npm run test:performance
```

#### 3. **Debugging Workflow**
```bash
# Run with maximum verbosity
forge test --match-test test_FailingFunction -vvvv

# Debug specific transaction
forge debug --rpc-url http://localhost:8545 0x<transaction-hash>

# Check event logs
cast logs --rpc-url http://localhost:8545 --address 0x<contract-address>

# Inspect contract state
cast call 0x<contract-address> "getAsset(uint256)" 1 --rpc-url http://localhost:8545
```

### Configuration Management

#### **Foundry Configuration (foundry.toml)**
```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc = "0.8.25"              # Latest stable Solidity
evm_version = "cancun"       # Latest EVM features
optimizer = true
optimizer_runs = 200         # Balanced optimization
via_ir = true               # Enhanced optimization

# Test configuration
[profile.default.fmt]
line_length = 100
tab_width = 4

# Gas reporting
[profile.default.gas_reports]
contract = "*"

# RPC endpoints
[rpc_endpoints]
localhost = "http://localhost:8545"
sepolia = "${SEPOLIA_RPC_URL}"
```

#### **Integration Test Configuration (test/offchain/config.json)**
```json
{
  "anvil": {
    "port": 8545,
    "chainId": 31337,
    "accounts": 10,
    "balance": "10000000000000000000000",
    "gasLimit": "30000000",
    "gasPrice": "1000000000"
  },
  "contracts": {
    "deploymentTimeout": 30000,
    "confirmations": 1
  },
  "events": {
    "pollInterval": 1000,
    "maxRetries": 3,
    "batchSize": 100
  },
  "api": {
    "timeout": 5000,
    "retries": 3
  }
}
```

### Performance Monitoring

#### **Gas Optimization Tracking**
```bash
# Generate gas report
forge test --gas-report > gas-report.txt

# Track gas usage over time
forge test --gas-report --json > gas-report.json

# Identify expensive operations
grep -A 5 -B 5 "gas:" gas-report.txt | sort -k2 -nr
```

#### **Test Performance Monitoring**
```typescript
// Monitor test execution time
const testMetrics = {
    duration: Date.now() - startTime,
    gasUsed: receipt.gasUsed.toNumber(),
    eventsProcessed: eventListener.getProcessedCount(),
    dbOperations: mockServices.getDbOperationCount()
};

// Log performance metrics
console.log(`Test completed in ${testMetrics.duration}ms`);
console.log(`Gas used: ${testMetrics.gasUsed.toLocaleString()}`);
console.log(`Events processed: ${testMetrics.eventsProcessed}`);
```

---

## Testing Best Practices

### 1. **Test Organization**

#### **File Naming Conventions**
- `Contract.t.sol` - Unit tests for individual contracts
- `WorkflowName.t.sol` - Integration tests for specific workflows
- `SystemName.t.sol` - End-to-end system tests

#### **Test Function Naming**
```solidity
// Positive tests
function test_FeatureDescription() public { }

// Negative tests
function test_RevertWhen_ConditionDescription() public { }

// Fuzz tests
function testFuzz_FeatureDescription(uint256 param) public { }

// Invariant tests
function invariant_PropertyDescription() public { }
```

#### **Test Structure Pattern**
```solidity
function test_DescriptiveTestName() public {
    // ARRANGE: Set up test conditions
    vm.startPrank(testUser);
    uint256 initialBalance = token.balanceOf(testUser);

    // ACT: Execute the operation being tested
    token.transfer(recipient, transferAmount);

    // ASSERT: Verify expected outcomes
    assertEq(token.balanceOf(testUser), initialBalance - transferAmount);
    assertEq(token.balanceOf(recipient), transferAmount);

    vm.stopPrank();
}
```

### 2. **Mock and Fixture Management**

#### **Reusable Test Fixtures**
```solidity
abstract contract AssetTestFixture is Test {
    AssetRegistry registry;
    LeaseFactory leaseFactory;
    Marketplace marketplace;
    MockStablecoin usdc;

    address admin = address(0x1);
    address owner = address(0x2);
    address lessee = address(0x3);

    function setUp() public virtual {
        // Deploy core contracts
        registry = new AssetRegistry(admin);
        leaseFactory = new LeaseFactory(admin, address(registry));
        marketplace = new Marketplace(admin, address(usdc), address(leaseFactory));
        usdc = new MockStablecoin();

        // Set up initial state
        _setupPermissions();
        _distributeTokens();
    }

    function _setupPermissions() internal {
        vm.startPrank(admin);
        // Grant necessary roles
        vm.stopPrank();
    }

    function _distributeTokens() internal {
        // Distribute test tokens
        usdc.mint(owner, 1000000e6);  // 1M USDC
        usdc.mint(lessee, 1000000e6); // 1M USDC
    }
}

// Inherit from fixture in specific test contracts
contract AssetFlowTest is AssetTestFixture {
    function test_AssetRegistration() public {
        // Test implementation using inherited setup
    }
}
```

#### **Deterministic Test Data**
```solidity
// Use consistent test data across tests
uint256 constant ASSET_TYPE_ID = 1;
uint256 constant ASSET_ID = 1;
uint256 constant LEASE_ID = 1;
string constant ASSET_NAME = "TestAsset";
string constant ASSET_SYMBOL = "TEST";
uint256 constant TOTAL_SUPPLY = 1000e18;

// Private keys for signature testing (test-only keys)
uint256 constant PK_ADMIN = 0xA11CE;
uint256 constant PK_OWNER = 0xB0B;
uint256 constant PK_LESSEE = 0xD0D;
```

### 3. **Error Testing Patterns**

#### **Comprehensive Negative Testing**
```solidity
function test_RevertWhen_UnauthorizedAccess() public {
    vm.prank(unauthorizedUser);
    vm.expectRevert("AccessControl: account missing role");
    protectedContract.adminFunction();
}

function test_RevertWhen_InvalidParameters() public {
    vm.expectRevert("amount cannot be zero");
    token.transfer(recipient, 0);

    vm.expectRevert("recipient cannot be zero address");
    token.transfer(address(0), 100);
}

function test_RevertWhen_InsufficientBalance() public {
    uint256 balance = token.balanceOf(user);
    uint256 excessAmount = balance + 1;

    vm.prank(user);
    vm.expectRevert("ERC20: transfer amount exceeds balance");
    token.transfer(recipient, excessAmount);
}
```

#### **Custom Error Testing**
```solidity
// For contracts using custom errors
error InsufficientBalance(uint256 balance, uint256 requested);

function test_RevertWhen_InsufficientBalance() public {
    uint256 balance = token.balanceOf(user);
    uint256 requested = balance + 1;

    vm.prank(user);
    vm.expectRevert(abi.encodeWithSelector(
        InsufficientBalance.selector,
        balance,
        requested
    ));
    token.transfer(recipient, requested);
}
```

### 4. **State Management**

#### **Test Isolation**
```solidity
contract StateIsolationTest is Test {
    uint256 snapshotId;

    function setUp() public {
        // Set up initial state
        _deployContracts();
        _configureInitialState();

        // Take snapshot for test isolation
        snapshotId = vm.snapshot();
    }

    function tearDown() public {
        // Revert to clean state
        vm.revertTo(snapshotId);
    }

    function test_FirstOperation() public {
        // Test implementation
        // State changes don't affect other tests
    }

    function test_SecondOperation() public {
        // Starts with clean state
        // Independent of test_FirstOperation
    }
}
```

#### **Block and Time Management**
```solidity
function test_TimeBasedOperations() public {
    uint256 initialTime = block.timestamp;

    // Test operation at initial time
    contract.timeBasedFunction();

    // Advance time
    vm.warp(block.timestamp + 1 days);

    // Test operation after time advancement
    contract.timeBasedFunction();

    // Advance blocks for checkpoint systems
    vm.roll(block.number + 10);

    // Test checkpoint-dependent functionality
    contract.checkpointFunction();
}
```

### 5. **Documentation and Readability**

#### **Self-Documenting Tests**
```solidity
function test_RevenueDistribution_ProRata() public {
    /*
     * SCENARIO: Test pro-rata revenue distribution
     *
     * GIVEN:
     *   - Alice owns 70% of asset (700 tokens)
     *   - Bob owns 30% of asset (300 tokens)
     *   - Total revenue available: 1000 mUSD
     *
     * WHEN:
     *   - Revenue distribution is triggered
     *
     * THEN:
     *   - Alice should receive 700 mUSD (70%)
     *   - Bob should receive 300 mUSD (30%)
     *   - Total distributed should equal total available
     */

    // ARRANGE
    uint256 aliceBalance = 700e18;  // 70% ownership
    uint256 bobBalance = 300e18;    // 30% ownership
    uint256 totalRevenue = 1000e6;  // 1000 mUSD

    // Set up token balances
    vm.prank(initialOwner);
    token.transfer(alice, aliceBalance);
    vm.prank(initialOwner);
    token.transfer(bob, bobBalance);

    // Take snapshot for revenue calculation
    vm.prank(admin);
    uint256 snapshotId = token.snapshot();

    // Fund revenue pool
    usdc.mint(address(marketplace), totalRevenue);

    // ACT
    vm.prank(alice);
    marketplace.claimRevenue(snapshotId);

    vm.prank(bob);
    marketplace.claimRevenue(snapshotId);

    // ASSERT
    uint256 expectedAliceRevenue = (totalRevenue * aliceBalance) / token.totalSupply();
    uint256 expectedBobRevenue = (totalRevenue * bobBalance) / token.totalSupply();

    assertEq(usdc.balanceOf(alice), expectedAliceRevenue, "Alice should receive proportional revenue");
    assertEq(usdc.balanceOf(bob), expectedBobRevenue, "Bob should receive proportional revenue");
    assertEq(usdc.balanceOf(alice) + usdc.balanceOf(bob), totalRevenue, "All revenue should be distributed");
}
```

#### **Descriptive Assertions**
```solidity
// Use descriptive messages for all assertions
assertEq(actualValue, expectedValue, "Clear description of what should be true");
assertTrue(condition, "Explanation of why condition should be true");
assertGt(actualValue, threshold, "Description of minimum expected value");

// For complex assertions, show the calculation
uint256 expectedBalance = initialBalance - transferAmount + interestEarned;
assertEq(
    actualBalance,
    expectedBalance,
    string.concat(
        "Balance should be initial (", vm.toString(initialBalance),
        ") minus transfer (", vm.toString(transferAmount),
        ") plus interest (", vm.toString(interestEarned), ")"
    )
);
```

### 6. **Performance and Gas Testing**

#### **Gas Optimization Validation**
```solidity
function test_GasOptimization_BatchOperations() public {
    uint256 gasBefore = gasleft();

    // Perform operation
    contract.batchFunction(inputs);

    uint256 gasUsed = gasBefore - gasleft();

    // Verify gas efficiency
    assertLt(gasUsed, MAX_EXPECTED_GAS, "Operation should be gas efficient");

    // Log for regression tracking
    console.log("Gas used for batch operation:", gasUsed);
}
```

#### **Performance Benchmarking**
```solidity
function test_Performance_SnapshotCreation() public {
    uint256 iterations = 10;
    uint256 totalGas = 0;

    for (uint256 i = 0; i < iterations; i++) {
        uint256 gasBefore = gasleft();

        vm.prank(admin);
        token.snapshot();

        totalGas += gasBefore - gasleft();

        // Advance block for next snapshot
        vm.roll(block.number + 1);
    }

    uint256 averageGas = totalGas / iterations;

    console.log("Average gas per snapshot:", averageGas);
    assertLt(averageGas, 100000, "Snapshot creation should be under 100k gas on average");
}
```

---

## Troubleshooting Guide

### Common Issues and Solutions

#### 1. **Compilation Errors**

**Problem**: Unicode character errors in strings
```
Error (8936): Invalid character in string. Use unicode"..." string literal.
```

**Solution**: Remove or replace Unicode characters
```solidity
// ❌ Problematic
console.log("✓ Success");

// ✅ Fixed
console.log("Success");
```

**Problem**: Address checksum errors
```
Error (9429): Invalid checksum. Correct address: 0xa0B86a...
```

**Solution**: Use correct checksummed addresses
```solidity
// ❌ Incorrect checksum
address constant USDC = 0xa0b86a33e6441b8e947e072ed7dfa5c6c79f2c40;

// ✅ Correct checksum
address constant USDC = 0xa0B86a33E6441B8e947E072ED7dfa5c6C79f2c40;
```

#### 2. **Test Failures**

**Problem**: Tests failing due to block advancement issues
```
AssertionError: Snapshot balance should be 700: 0 != 700
```

**Solution**: Advance blocks after state changes for checkpoint systems
```solidity
// ❌ Missing block advancement
vm.prank(alice);
token.transfer(bob, 300e18);
uint256 snapshot = token.snapshot(); // May not capture transfer

// ✅ Proper block advancement
vm.prank(alice);
token.transfer(bob, 300e18);
vm.roll(block.number + 1);  // Advance block for ERC20Votes
uint256 snapshot = token.snapshot();
```

**Problem**: Signature verification failures
```
Error: Invalid signature
```

**Solution**: Ensure correct digest calculation and signing
```solidity
// ✅ Correct signature generation
bytes32 digest = leaseFactory.hashLeaseIntent(intent);
(uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, digest);
bytes memory signature = abi.encodePacked(r, s, v); // Note order: r, s, v
```

#### 3. **Anvil Connection Issues**

**Problem**: Cannot connect to Anvil
```
Error: Could not connect to http://localhost:8545
```

**Solution**: Verify Anvil is running and accessible
```bash
# Check if Anvil is running
lsof -i :8545

# Start Anvil if not running
anvil --port 8545 --chain-id 31337

# Test connection
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  http://localhost:8545
```

**Problem**: Anvil process hanging
```
Anvil process not responding
```

**Solution**: Reset Anvil state or restart
```bash
# Kill existing Anvil processes
pkill -f anvil

# Restart with fresh state
anvil --port 8545 --chain-id 31337
```

#### 4. **Gas and Performance Issues**

**Problem**: Tests failing due to gas limits
```
Error: Transaction reverted: out of gas
```

**Solution**: Increase gas limits or optimize contracts
```bash
# Increase Anvil gas limit
anvil --gas-limit 30000000

# Check gas usage
forge test --gas-report
```

**Problem**: Slow test execution
```
Tests taking too long to complete
```

**Solution**: Optimize test structure and use snapshots
```solidity
contract OptimizedTest is Test {
    uint256 snapshotId;

    function setUp() public {
        // Expensive setup once
        _deployAllContracts();
        snapshotId = vm.snapshot();
    }

    function test_Feature1() public {
        // Test implementation
        vm.revertTo(snapshotId); // Reset state quickly
    }

    function test_Feature2() public {
        // Starts with clean state
    }
}
```

#### 5. **Event Processing Issues**

**Problem**: Events not being captured in offchain tests
```
Error: Expected event not found
```

**Solution**: Ensure proper event filtering and timing
```typescript
// ✅ Proper event listening setup
const filter = {
    address: contract.address,
    topics: [contract.interface.getEventTopic('EventName')]
};

// Wait for event processing
await new Promise(resolve => setTimeout(resolve, 1000));
```

**Problem**: Event ordering issues
```
Events processed out of order
```

**Solution**: Implement proper event ordering
```typescript
// ✅ Sort events by block and log index
const sortedEvents = events.sort((a, b) =>
    a.blockNumber - b.blockNumber || a.logIndex - b.logIndex
);
```

### Debugging Techniques

#### 1. **Console Logging**
```solidity
import "forge-std/console.sol";

function test_DebuggingExample() public {
    console.log("Current block number:", block.number);
    console.log("User balance:", token.balanceOf(user));
    console.logBytes32(digest);
    console.logAddress(calculatedAddress);
}
```

#### 2. **State Inspection**
```bash
# Check contract state
cast call $CONTRACT_ADDRESS "balanceOf(address)" $USER_ADDRESS --rpc-url http://localhost:8545

# Check transaction details
cast tx $TX_HASH --rpc-url http://localhost:8545

# Check event logs
cast logs --address $CONTRACT_ADDRESS --rpc-url http://localhost:8545
```

#### 3. **Step-by-Step Debugging**
```solidity
function test_StepByStepDebugging() public {
    // 1. Check initial state
    uint256 initialBalance = token.balanceOf(alice);
    console.log("Initial balance:", initialBalance);

    // 2. Perform operation
    vm.prank(alice);
    token.transfer(bob, 100e18);

    // 3. Check intermediate state
    uint256 afterTransferBalance = token.balanceOf(alice);
    console.log("After transfer balance:", afterTransferBalance);

    // 4. Verify expected change
    assertEq(afterTransferBalance, initialBalance - 100e18);
}
```

### Performance Optimization

#### 1. **Test Execution Speed**
```bash
# Run tests in parallel
forge test --jobs 4

# Run only modified tests
forge test --changed

# Use compilation cache
forge build --use-cache
```

#### 2. **Memory Management**
```solidity
// Use memory for temporary data
function test_MemoryOptimized() public {
    uint256[] memory amounts = new uint256[](10);
    // Process in memory, then commit to storage
}

// Avoid unnecessary storage reads
function test_CacheStorageReads() public {
    uint256 cachedValue = contract.expensiveStorageRead();
    // Use cachedValue multiple times instead of re-reading
}
```

---

## Conclusion

The Asset Leasing Protocol's testing framework prioritizes **genuine validation** over false confidence, focusing on what matters most for a simple, well-documented protocol.

### **Our Focused Approach**
- **Core Functionality First**: 93% test success rate with focus on fixing the critical 4 failing tests
- **Happy Path Business Logic**: Validate intended workflows work correctly
- **Rigorous Edge Case Testing**: Smart contract vulnerabilities must be caught and fixed
- **Anti-Pattern Elimination**: Avoid self-satisfying and circular validation tests

### **Current Status & Priorities**
- **Completed**: ✅ All 55 tests passing (100% success rate)
- **Completed**: ✅ Fixed critical revenue authorization security bug
- **Completed**: ✅ Resolved all ERC20Votes checkpoint edge cases
- **Ongoing**: Maintain test quality and prevent regressions
- **Future**: Expand coverage for new features as they're added

### **Development Philosophy**
- **Simple Protocol**: Focus on clear, understandable functionality
- **Excellent Documentation**: Every test explains what it protects against
- **Genuine Testing**: Tests must actually validate behavior, not just pass
- **Quality Over Quantity**: Better to have fewer, high-quality tests than many ineffective ones

### **Test Builder Agent Integration**
With all tests now passing, use the **test-builder-solidity** agent for:
1. Validating test quality and detecting potential anti-patterns
2. Reviewing new tests for proper edge case coverage
3. Ensuring security-focused testing for new features
4. Maintaining high test quality standards

This focused testing approach ensures we build confidence in our protocol's correctness while avoiding the false security that comes from extensive but ineffective test suites.

**Remember**: A test that always passes is not a test—it's dangerous documentation that lies about your system's safety. Our 100% pass rate comes from fixing real issues, not lowering standards.