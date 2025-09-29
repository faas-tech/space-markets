# Asset Leasing Protocol Off-Chain Test Suite

A simple, educational test system that demonstrates how the Asset Leasing Protocol integrates blockchain smart contracts with off-chain services.

## What This Test Suite Does

This test suite validates the complete workflow of orbital asset leasing:

1. **Starts a local blockchain** (Anvil) for testing
2. **Deploys smart contracts** (AssetRegistry, Marketplace, LeaseFactory)
3. **Runs an API server** that communicates with the blockchain
4. **Tests the complete flow**: Asset registration → Token creation → Lease offers
5. **Monitors blockchain events** to ensure everything works correctly

## Quick Start

### Prerequisites

You'll need these installed on your machine:

- **Node.js** (version 18+)
- **Foundry** (for Anvil blockchain and contract compilation)

### Installation

1. **Install Foundry** (if you haven't already):
   ```bash
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   ```

2. **Compile the smart contracts** (from the project root):
   ```bash
   cd ../../  # Go to project root
   forge build
   cd test/offchain  # Return to test directory
   ```

3. **Install Node.js dependencies**:
   ```bash
   npm install
   ```

### Run the Complete Test Suite

To run all tests and see the entire system in action:

```bash
npm test
```

This single command will:
- ✅ Start Anvil blockchain
- ✅ Deploy all smart contracts
- ✅ Start the API server
- ✅ Test the complete asset leasing workflow
- ✅ Verify error handling
- ✅ Clean up everything when done

Expected output:
```
🚀 Asset Leasing Protocol Integration Test Suite
This test validates the complete on-chain to off-chain workflow

🚀 Setting up test environment...
✅ Test environment ready

🧪 Running test: Start Anvil blockchain
   📡 RPC URL: http://127.0.0.1:8546
   🔗 Chain ID: 31337
   💰 Test accounts: 10
✅ PASSED: Start Anvil blockchain (87ms)

🧪 Running test: Deploy smart contracts
   💰 MockStablecoin: 0x5FbDB2315678afecb367f032d93F642f64180aa3
   📋 AssetRegistry: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
   🏭 LeaseFactory: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
   🏪 Marketplace: 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
✅ PASSED: Deploy smart contracts (16582ms)

🧪 Running test: Start API server
   🌐 API server running on port 3001
   ❤️  Health check: Asset Leasing Protocol API is running
✅ PASSED: Start API server (1013ms)

🧪 Running test: API blockchain integration
   🚀 Contracts deployed via API
   📋 Contract info retrieved via API
✅ PASSED: API blockchain integration (16654ms)

🧪 Running test: Complete asset leasing workflow
   ✅ Asset type registered: Orbital Satellite Alpha
   ✅ Asset token created: SAT001
   ✅ Lease offer created for asset: satellite-001
   ✅ Found 5 blockchain events
   ✅ System status verified - all components operational
✅ PASSED: Complete asset leasing workflow (14408ms)

🧪 Running test: Error handling and edge cases
   ✅ Bad request handled correctly
   ✅ 404 error handled correctly
   ✅ Invalid contract name handled correctly
✅ PASSED: Error handling and edge cases (4ms)

============================================================
🏁 TEST RESULTS
============================================================
Total Tests:  6
Passed:       6 ✅
Failed:       0 ✅
Pass Rate:    100%
Duration:     48749ms
============================================================
🎉 ALL TESTS PASSED! The Asset Leasing Protocol is working correctly.
```

### Run Just the API Server

To start only the API server for manual testing:

```bash
npm start
```

Then visit `http://localhost:3001/health` to verify it's running.

## Understanding the Code

The test suite consists of three main files, each focused on a specific concern:

### 1. `src/blockchain.js` - Blockchain Connection
**What it does**: Manages the Anvil blockchain and smart contract interactions.

Key functions:
- `startAnvil()` - Starts a local blockchain for testing
- `deployAllContracts()` - Deploys the complete contract system
- `getContract()` - Creates contract instances for interaction
- `listenForEvents()` - Monitors blockchain events

**Why this design**: Simple functions with clear purposes make it easy to understand what's happening on the blockchain.

### 2. `src/api.js` - HTTP API Server
**What it does**: Provides HTTP endpoints that interact with the blockchain contracts.

Key endpoints:
- `POST /api/deploy` - Deploy contracts to blockchain
- `POST /api/assets/register-type` - Register a new asset type
- `POST /api/assets/create-token` - Create ERC-20 tokens for an asset
- `POST /api/leases/create-offer` - Create a lease offer on the marketplace
- `GET /api/events/:contractName` - Get blockchain events

**Why this design**: RESTful API with clear, descriptive endpoints makes it easy for frontends to integrate.

### 3. `src/test.js` - Integration Test Runner
**What it does**: Tests the complete system end-to-end in a realistic scenario.

Test flow:
1. **Blockchain Setup**: Start Anvil and deploy contracts
2. **API Integration**: Start API server and test endpoints
3. **Asset Workflow**: Complete asset registration and leasing flow
4. **Event Monitoring**: Verify blockchain events are emitted correctly
5. **Error Handling**: Test that errors are handled gracefully

**Why this design**: One script that tests everything makes it easy to verify the entire system works.

## Step-by-Step Local Testing Guide

### Manual Testing with curl

Once you've run `npm test` or `npm start`, you can manually test the API:

1. **Check system health**:
   ```bash
   curl http://localhost:3001/health
   ```

2. **Deploy contracts**:
   ```bash
   curl -X POST http://localhost:3001/api/deploy
   ```

3. **Register an asset type**:
   ```bash
   curl -X POST http://localhost:3001/api/assets/register-type \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Test Satellite",
       "assetType": "satellite",
       "schemaUrl": "https://example.com/schema.json"
     }'
   ```

4. **Create an asset token**:
   ```bash
   curl -X POST http://localhost:3001/api/assets/create-token \
     -H "Content-Type: application/json" \
     -d '{
       "assetId": "sat-001",
       "name": "Test Satellite Token",
       "symbol": "TST001",
       "totalSupply": "1000"
     }'
   ```

5. **Create a lease offer**:
   ```bash
   curl -X POST http://localhost:3001/api/leases/create-offer \
     -H "Content-Type: application/json" \
     -d '{
       "assetId": "sat-001",
       "pricePerDay": "100",
       "maxLeaseDuration": "365",
       "terms": "Standard test lease terms"
     }'
   ```

6. **Check blockchain events**:
   ```bash
   curl http://localhost:3001/api/events/assetRegistry
   ```

### Using with Frontend Applications

The API is designed to work with frontend applications. It includes CORS headers and returns consistent JSON responses:

```javascript
// Example frontend code
const response = await fetch('http://localhost:3001/api/assets/register-type', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Orbital Relay Station',
    assetType: 'orbital_relay',
    schemaUrl: 'https://mycompany.com/relay-schema.json'
  })
});

const result = await response.json();
if (result.success) {
  console.log('Asset registered!', result.data);
} else {
  console.error('Registration failed:', result.error);
}
```

## Troubleshooting

### Common Issues

**Problem**: "Anvil command not found"
**Solution**: Install Foundry: `curl -L https://foundry.paradigm.xyz | bash && foundryup`

**Problem**: "Contract ABI not found"
**Solution**: Run `forge build` from the project root to compile contracts

**Problem**: "Port already in use"
**Solution**: Kill any existing Anvil processes: `pkill anvil`

**Problem**: Tests fail with timeout
**Solution**: Make sure no other services are using ports 8545 (Anvil) or 3001 (API)

### Debug Mode

To see detailed logs during testing:

1. **View Anvil logs**: Anvil output is displayed during the test
2. **View API logs**: API requests and responses are logged to console
3. **Check blockchain events**: The test fetches and displays all contract events

### Test Files Location

After running tests, you'll find:
- `./test-output/` - Test results and logs
- `./deployments/` - Contract deployment information
- `./test-data/` - Any test data generated

## How Blockchain Integrates with Off-Chain Systems

This test suite demonstrates several key integration patterns:

### 1. Contract Deployment Pattern
```javascript
// Deploy contract to blockchain
const deployment = await blockchain.deployAllContracts();

// Store deployment info for API to use
// (In production, this would be in a database)
deploymentInfo = deployment;
```

### 2. Transaction Pattern
```javascript
// API receives HTTP request
app.post('/api/assets/register-type', async (req, res) => {
  // Extract data from request
  const { name, assetType, schemaUrl } = req.body;

  // Call smart contract method
  const tx = await contracts.assetRegistry.registerAssetType(name, assetType, schemaUrl);

  // Wait for blockchain confirmation
  const receipt = await tx.wait();

  // Return result to client
  res.json({
    success: true,
    transactionHash: receipt.hash,
    blockNumber: receipt.blockNumber
  });
});
```

### 3. Event Monitoring Pattern
```javascript
// Listen for blockchain events
blockchain.listenForEvents(contract, 'AssetRegistered', (event, ...args) => {
  console.log('New asset registered:', args);

  // In production, you would:
  // - Update your database
  // - Send notifications
  // - Trigger other processes
});
```

### 4. State Synchronization Pattern
```javascript
// Query blockchain state
const events = await contract.queryFilter('*', fromBlock, toBlock);

// Process events to build off-chain state
for (const event of events) {
  // Update local database/cache based on blockchain events
  await updateOffChainState(event);
}
```

## Architecture Decisions

### Why This Simple Approach?

1. **Educational Value**: Easy to understand how blockchain and off-chain systems work together
2. **Debugging**: Simple code is easier to debug when things go wrong
3. **Testing**: Straightforward to test individual components
4. **Maintenance**: Fewer abstractions mean fewer things that can break

### What's Missing (On Purpose)

This test suite intentionally omits:
- **Database persistence** (uses in-memory storage for simplicity)
- **Authentication/authorization** (focuses on core blockchain integration)
- **Production scalability features** (connection pooling, rate limiting, etc.)
- **Complex error recovery** (keeps error handling simple and clear)

### Production Considerations

When adapting this code for production:

1. **Add a real database** (PostgreSQL, MongoDB) instead of in-memory storage
2. **Implement proper authentication** for API endpoints
3. **Add comprehensive error handling** and retry logic
4. **Use environment variables** for configuration
5. **Add monitoring and alerting** for system health
6. **Implement proper logging** with log levels and structured data
7. **Add rate limiting** to prevent API abuse
8. **Use connection pooling** for blockchain RPC calls

## Contributing

This test suite is designed to be simple and educational. When making changes:

1. **Keep it simple** - Prefer obvious solutions over clever ones
2. **Document why** - Explain the reasoning behind design decisions
3. **Test thoroughly** - Make sure the complete workflow still works
4. **Update this README** - Keep the documentation current

## License

This code is part of the Asset Leasing Protocol project and follows the same license terms.