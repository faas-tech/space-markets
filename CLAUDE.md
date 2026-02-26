## CRITICAL CONSTRAINT: SMART CONTRACTS ARE LOCKED
NEVER modify any file in: src/*.sol, test/component/, test/integration/, script/*.s.sol
These contracts are audited and frozen.

---

- Critical Testing Philosophy & Anti-Patterns

  Testing Philosophy:
  - Focus on genuine validation over false confidence
  - Happy path testing for business logic, rigorous edge cases for security
  - Tests must actually verify functionality, not just pass by design
  - Current status: 51/55 Solidity tests passing (93%), 4 non-critical edge cases

  Anti-Patterns to Avoid:
  1. Self-satisfying tests: Tests that succeed by design rather than validation
  2. Circular validation: Using same system to set and verify state
  3. Existence-only validation: Testing data exists without verifying correctness

  Current Failing Tests (Priority):
  - 3 ERC20Votes checkpoint edge cases (test/ERC20SnapshotMigration.t.sol)
  - 1 critical security bug: unauthorized revenue claims (test/MarketplaceFlow.t.sol)

  Architecture Overview

  Three-Tier Onchain Testing:
  1. Tier 1 - Component: AssetERC20Simple.t.sol - Individual contract validation
  2. Tier 2 - Integration: AssetFlow.t.sol - Multi-contract interactions
  3. Tier 3 - System: MarketplaceFlow.t.sol - Complete end-to-end workflows

  Offchain Testing System:
  - Anvil blockchain management (automated local chain)
  - Event processing with reorg protection
  - Mock services (database, API, storage)
  - Integration test suite for complete workflows

  Key Testing Patterns

  Anvil/Foundry Features:
  vm.prank(user);              // Impersonate user
  vm.roll(block.number + 1);   // Advance blocks (critical for ERC20Votes)
  vm.sign(privateKey, digest); // Generate signatures

  Critical Pattern for Checkpoints:
  // ALWAYS advance blocks after transfers for ERC20Votes
  token.transfer(bob, amount);
  vm.roll(block.number + 1);  // Required!
  uint256 snapshot = token.snapshot();

  Offchain System Components

  Core Services (actual TypeScript class names):
  - AssetService: Asset registration and metadata management
  - LeaseService: Lease creation and management
  - MarketplaceService: Bidding, offer acceptance with EIP-712 signatures
  - RevenueService: Revenue distribution via Marketplace
  - BlockchainClient: Smart contract integration and transaction submission
  - EventProcessor: Real-time blockchain event monitoring
  - X402PaymentService: Streaming payment calculation (hourly to per-second/batch)
  - X402FacilitatorClient: Coinbase facilitator integration

  Storage:
  - MockDatabase: In-memory implementation of Database interface
  - Cache: In-memory cache with TTL (replaceable with Redis)
  - Target: PostgreSQL with assets, leases, events, x402_payments tables

  API Endpoints (AssetLeasingApiServer):
  - GET  /health - Health check
  - GET  /api/assets - List all assets
  - GET  /api/assets/:assetId - Get specific asset
  - POST /api/assets - Register new asset
  - GET  /api/leases - List all leases
  - GET  /api/leases/:leaseId - Get specific lease
  - POST /api/leases - Create lease offer
  - POST /api/leases/:leaseId/access - X402 payment-gated access
  - POST /api/leases/:leaseId/prefund - Prefund lessee with USDC
  - GET  /api/leases/:leaseId/x402/requirements - Get X402 payment requirements
  - GET  /api/blockchain/network - Network info
  - GET  /api/blockchain/contracts - Deployed contracts
  - POST /api/blockchain/deploy - Deploy contracts
  - GET  /api/system/status - System status
  - POST /api/system/reset - Reset system (dev only)

  Quick Commands

  Onchain Testing:
  forge test                                    # Run all tests
  forge test --match-path test/AssetFlow.t.sol # Specific suite
  forge test -vvvv                             # Maximum verbosity
  forge coverage                               # Coverage report

  Offchain Testing (from test/offchain/):
  npm test                                     # Run all tests
  npx vitest run tests/enhanced-flow.test.ts   # Enhanced flows
  npx vitest run tests/api-integration.test.ts # API integration
  npx vitest run tests/x402-streaming.test.ts  # X402 streaming
  npm run demo:complete                        # Complete 12-step demo
  npm run demo:x402                            # X402 demo
  npm run demo:simple                          # Simple workflow demo

  Test Quality Gates

  Before considering any test "complete":
  1. Sabotage Test: Break implementation - does test fail?
  2. Data Verification: Verify actual correctness, not just existence
  3. Independent Validation: Avoid circular validation patterns
  4. Business Logic: Validate intended protocol behavior
