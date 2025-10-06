- Critical Testing Philosophy & Anti-Patterns

  Testing Philosophy:
  - Focus on genuine validation over false confidence
  - Happy path testing for business logic, rigorous edge cases for security
  - Tests must actually verify functionality, not just pass by design
  - Current status: 51/55 tests passing (93%), 4 critical failures to fix

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

  Core Services:
  - AssetService: Asset registration and metadata management
  - DocumentStorageService: PDF upload with hash verification
  - BlockchainService: Smart contract integration
  - EventProcessor: Real-time blockchain event monitoring

  Database Schema:
  - PostgreSQL with assets, documents, leases, revenue_rounds tables
  - Cryptographic hash verification (SHA-256 with 0x prefix)
  - JSONB for flexible specifications storage

  API Endpoints:
  - POST /assets - Register assets with documents
  - POST /leases - Create lease agreements
  - GET /assets/:assetId/revenue-rounds - Query revenue distributions

  Quick Commands

  Onchain Testing:
  forge test                                    # Run all tests
  forge test --match-path test/AssetFlow.t.sol # Specific suite
  forge test -vvvv                             # Maximum verbosity
  forge coverage                               # Coverage report

  Offchain Testing:
  npm run test:integration          # Integration tests
  npm run start:full-system         # Complete system demo
  npm run generate-samples          # Create test data

  Test Quality Gates

  Before considering any test "complete":
  1. Sabotage Test: Break implementation - does test fail?
  2. Data Verification: Verify actual correctness, not just existence
  3. Independent Validation: Avoid circular validation patterns
  4. Business Logic: Validate intended protocol behavior

  Would you like me to proceed with memorizing these key concepts? This will help me quickly assist with test
  improvements, debugging failing tests, and avoiding anti-patterns in new tests.