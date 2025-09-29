# Asset Leasing Protocol - Local Testing Guide

This guide provides comprehensive instructions for setting up and running the complete off-chain testing infrastructure for the Asset Leasing Protocol.

## Overview

The Asset Leasing Protocol testing infrastructure provides:

- **Anvil Blockchain Management**: Automated local blockchain setup with state management
- **Smart Contract Deployment**: Automated deployment and configuration
- **Event Processing**: Real-time blockchain event monitoring and processing
- **Off-Chain Services**: Mock databases, APIs, and storage systems
- **Integration Testing**: End-to-end workflow validation
- **Performance Testing**: Event processing latency and throughput testing

## Quick Start

### 1. Install Dependencies

```bash
cd test/offchain
npm install
```

### 2. Run Basic Integration Tests

```bash
# Run all integration tests with default settings
npm run test:integration

# Run with verbose logging
npm run test:integration:verbose

# Run full test suite including API and database tests
npm run test:integration:full
```

### 3. Manual Testing Setup

```bash
# Start Anvil blockchain for manual testing
npm run anvil:start

# In another terminal, deploy contracts
npm run deploy:local

# Run specific test components
npm run test
```

## Architecture Overview

### Core Components

1. **AnvilManager** (`src/testing/anvil-manager.ts`)
   - Manages Anvil blockchain instances
   - Handles state snapshots and time manipulation
   - Provides deterministic account generation

2. **ContractDeployer** (`src/testing/contract-deployer.ts`)
   - Deploys smart contracts in correct order
   - Manages contract interactions
   - Handles gas estimation and transaction management

3. **AssetLeasingEventListener** (`src/testing/event-listener.ts`)
   - Monitors blockchain events with reorg protection
   - Provides event filtering and processing
   - Handles network failures and retries

4. **MockOffChainServices** (`src/testing/mock-services.ts`)
   - Simulates databases, caches, and APIs
   - Provides data consistency testing
   - Handles transaction rollback scenarios

5. **IntegrationTestSuite** (`src/testing/integration-test-suite.ts`)
   - Orchestrates end-to-end test scenarios
   - Validates data flow between on-chain and off-chain
   - Tests event processing resilience

6. **AssetLeasingTestRunner** (`src/testing/test-runner.ts`)
   - Main test orchestrator with CLI interface
   - Generates comprehensive test reports
   - Manages test environment lifecycle

## Detailed Testing Scenarios

### 1. Asset Registration Flow

Tests the complete asset registration process:

```typescript
// Creates off-chain metadata
const assetMetadata: AssetMetadata = {
  assetId: 'sat-alpha-1',
  name: 'Alpha Satellite',
  assetType: 'satellite',
  // ... other metadata
};

// Stores in off-chain system
await mockServices.storeAssetMetadata(assetMetadata);

// Registers asset type on-chain
await contractDeployer.registerAssetType('Satellite', ...);

// Registers asset instance
await contractDeployer.registerAsset(assetMetadata, typeId, ...);

// Verifies event processing and data consistency
```

### 2. Lease Marketplace Flow

Tests the lease offer and acceptance workflow:

```typescript
// Creates lease agreement off-chain
const leaseAgreement: LeaseAgreement = {
  leaseId: 'lease-sat-alpha-1-001',
  assetId: 'sat-alpha-1',
  terms: { /* lease terms */ }
};

// Posts lease offer on marketplace
await contractDeployer.postLeaseOffer(assetId, leaseAgreement);

// Places bid from different account
await contractDeployer.placeLeaseBid(offerId, lesseePrivateKey, funds);

// Accepts bid and creates lease NFT
await contractDeployer.acceptLeaseBid(offerId, bidIndex, lessorPrivateKey);
```

### 3. Event Processing Resilience

Tests event system reliability:

- Rapid contract interactions (stress testing)
- Blockchain reorganization handling
- Network failure recovery
- Event ordering and consistency

### 4. Data Flow Validation

Ensures data consistency between on-chain and off-chain:

- Metadata hash verification
- Event-driven database updates
- Cache invalidation patterns
- Referential integrity checks

## Configuration Options

### Test Runner Configuration

```typescript
interface TestRunnerConfig {
  // Blockchain settings
  anvilPort?: number;          // Default: 8545
  anvilChainId?: number;       // Default: 31337
  anvilBlockTime?: number;     // Default: 1 second

  // Test settings
  enableIntegrationTests?: boolean;  // Default: true
  enableEventTests?: boolean;        // Default: true
  enableApiTests?: boolean;          // Default: false
  enableDatabaseTests?: boolean;     // Default: false

  // Timeouts
  setupTimeoutMs?: number;     // Default: 60000
  testTimeoutMs?: number;      // Default: 300000

  // Logging
  verbose?: boolean;           // Default: false
}
```

### Environment Variables

```bash
# Blockchain settings
ANVIL_PORT=8545
ANVIL_CHAIN_ID=31337

# Test configuration
ENABLE_API_TESTS=false
ENABLE_DATABASE_TESTS=false
TEST_TIMEOUT_MS=300000

# Logging
VERBOSE_LOGGING=false
LOG_FILE=test-runner.log
```

## CLI Commands

### Test Runner Commands

```bash
# Run complete test suite
npx asset-leasing-test run

# Run with custom configuration
npx asset-leasing-test run \
  --port 8546 \
  --chain-id 31338 \
  --enable-api \
  --enable-database \
  --verbose \
  --timeout 600000

# Start Anvil for manual testing
npx asset-leasing-test anvil --port 8545
```

### NPM Scripts

```bash
# Core testing
npm run test                    # Run unit tests with Vitest
npm run test:coverage          # Run with coverage report
npm run test:integration       # Run integration tests
npm run test:integration:verbose  # Run with detailed logging
npm run test:integration:full  # Run all tests including API/DB

# Development
npm run anvil:start            # Start Anvil on default port
npm run anvil:start:custom     # Start Anvil on custom port
npm run deploy:local           # Deploy contracts to local Anvil
npm run deploy:test           # Deploy with test configuration

# Utilities
npm run generate-samples       # Generate sample test data
npm run validate-schemas       # Validate JSON schemas
npm run hash-metadata         # Generate metadata hashes
npm run sync-with-deployment  # Sync with deployed contracts

# Maintenance
npm run clean                 # Clean all build/test artifacts
npm run setup:test-env       # Full environment setup
npm run lint                 # Run ESLint
npm run type-check          # TypeScript type checking
```

## Test Output and Reporting

### Test Results Structure

```typescript
interface TestResults {
  success: boolean;
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    skippedTests: number;
    duration: number;
  };
  details: Array<{
    testName: string;
    status: 'passed' | 'failed' | 'skipped';
    duration: number;
    error?: string;
  }>;
  environment: {
    anvilInstance?: any;
    deployment?: any;
    services?: any;
  };
}
```

### Generated Reports

1. **test-results.json**: Machine-readable test results
2. **test-report.md**: Human-readable markdown report
3. **test-runner.log**: Detailed execution logs
4. **deployment.json**: Contract deployment information
5. **test-config.json**: Test environment configuration

## Advanced Testing Patterns

### 1. Blockchain State Management

```typescript
// Take snapshot before test
const snapshot = await anvilManager.takeSnapshot('test-instance');

// Run test that modifies state
await runTest();

// Revert to clean state
await anvilManager.revertToSnapshot('test-instance', snapshot);
```

### 2. Time-Based Testing

```typescript
// Advance blockchain time
await anvilManager.increaseTime('test-instance', 86400); // 1 day

// Mine specific number of blocks
await anvilManager.mineBlocks('test-instance', 10);
```

### 3. Event Waiting Patterns

```typescript
// Wait for specific event
const event = await eventListener.waitForEvent(
  'AssetRegistered',
  event => event.args.assetId === expectedAssetId,
  30000 // 30 second timeout
);

// Wait for transaction events
const events = await eventListener.waitForTransactionEvents(txHash);
```

### 4. Service Failure Simulation

```typescript
// Simulate network latency
await mockServices.simulateNetworkLatency(100, 500);

// Simulate service failures
await mockServices.simulateServiceFailure(0.1); // 10% failure rate
```

## Troubleshooting

### Common Issues

1. **Anvil fails to start**
   - Check if port is already in use: `lsof -i :8545`
   - Verify Anvil is installed: `anvil --version`

2. **Contract deployment fails**
   - Check account has sufficient balance
   - Verify contract bytecode is available
   - Check gas limits and pricing

3. **Event listener not receiving events**
   - Verify contract addresses are correct
   - Check network connectivity
   - Ensure events are being emitted

4. **Tests timeout**
   - Increase timeout values in configuration
   - Check for deadlocks in test logic
   - Verify Anvil is responding

### Debug Mode

```bash
# Run with maximum verbosity
npm run test:integration:verbose

# Check specific component logs
tail -f test-output/test-runner.log

# Verify contract deployment
cat deployments/deployment.json
```

### Performance Monitoring

```typescript
// Get event listener status
const status = eventListener.getStatus();
console.log(`Processed block: ${status.lastProcessedBlock}`);
console.log(`Buffered events: ${status.bufferedEvents}`);

// Get service statistics
const stats = mockServices.getStats();
console.log(`Assets stored: ${stats.assetsStored}`);
console.log(`Events processed: ${stats.eventsProcessed}`);
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Integration Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install Foundry
        uses: foundry-rs/foundry-toolchain@v1

      - name: Install dependencies
        run: |
          cd test/offchain
          npm install

      - name: Run integration tests
        run: |
          cd test/offchain
          npm run test:integration:verbose

      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: test-results
          path: test/offchain/test-output/
```

## Production Deployment Considerations

When adapting this testing infrastructure for production:

1. **Replace Mock Services**: Implement actual database, cache, and API services
2. **Add Authentication**: Implement proper API authentication and authorization
3. **Error Handling**: Add comprehensive error handling and retry logic
4. **Monitoring**: Add metrics collection and alerting
5. **Scaling**: Consider horizontal scaling for event processing
6. **Security**: Implement proper security measures for production data

## Contributing

When adding new tests or functionality:

1. Follow the existing code patterns and TypeScript interfaces
2. Add comprehensive error handling and logging
3. Include unit tests for new components
4. Update this documentation for new features
5. Ensure all tests pass in CI/CD pipeline

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review existing GitHub issues
3. Create a new issue with detailed reproduction steps
4. Include test logs and configuration details