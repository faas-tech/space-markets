# Asset Leasing Protocol - Off-Chain Test System

A comprehensive off-chain test system for the Asset Leasing Protocol using TypeScript, JSON files, and local validation. This system provides a minimal but complete implementation to test smart contract integration without requiring databases or complex infrastructure.

## 🚀 Features

- **Type-Safe Data Management**: Complete TypeScript types and Zod schemas for all protocol data
- **Local JSON Storage**: Simple file-based storage for rapid testing and iteration
- **Comprehensive Validation**: Runtime validation with detailed error reporting
- **Blockchain Integration**: Direct integration with deployed smart contracts
- **Sample Data Generation**: Realistic test data for orbital assets (satellites, compute stations, relay stations)
- **Hash Verification**: Cryptographic hash generation matching smart contract expectations
- **Deployment Sync**: Scripts to sync off-chain data with on-chain contracts

## 📁 Directory Structure

```
test/offchain/
├── src/
│   ├── types/           # TypeScript type definitions
│   ├── schemas/         # Zod validation schemas
│   ├── utils/           # Utility functions (crypto, validation, storage)
│   └── integration/     # Blockchain integration utilities
├── scripts/             # CLI tools and automation scripts
├── data/                # JSON data files
│   ├── assets/          # Asset metadata files
│   ├── leases/          # Lease agreement files
│   └── revenue/         # Revenue distribution files
├── tests/               # Test files (when implemented)
└── config.example.json  # Example configuration file
```

## 🛠️ Setup

### Prerequisites

- Node.js 18+ with npm or yarn
- Running blockchain node (Anvil, Hardhat, or testnet)
- Deployed Asset Leasing Protocol contracts

### Installation

1. **Install Dependencies**
   ```bash
   cd test/offchain
   npm install
   ```

2. **Build TypeScript**
   ```bash
   npm run build
   ```

3. **Create Configuration**
   ```bash
   cp config.example.json config.json
   # Edit config.json with your contract addresses and RPC URL
   ```

4. **Verify Setup**
   ```bash
   npm run validate-schemas
   ```

## 📋 Configuration

Create a `config.json` file based on `config.example.json`:

```json
{
  "network": "anvil",
  "rpcUrl": "http://localhost:8545",
  "privateKey": "0x...",
  "contracts": {
    "assetRegistry": "0x...",
    "marketplace": "0x...",
    "leaseFactory": "0x..."
  },
  "dataDir": "./data"
}
```

### Configuration Options

- **network**: Target network (`anvil`, `sepolia`, `mainnet`)
- **rpcUrl**: RPC endpoint URL
- **privateKey**: Private key for transaction signing
- **contracts**: Deployed contract addresses
- **dataDir**: Directory containing JSON data files

## 🎯 Quick Start

### 1. Generate Sample Data

Create realistic test assets and leases:

```bash
# Generate 10 assets and 5 leases
npm run generate-samples

# Custom generation
tsx scripts/generate-sample-data.ts --assets 20 --leases 10
```

### 2. Validate All Data

Ensure all JSON files conform to schemas:

```bash
# Basic validation
npm run validate-schemas

# Verbose validation with detailed output
tsx scripts/validate-schemas.ts --verbose --exit-on-error
```

### 3. Generate Metadata Hashes

Create cryptographic hashes for all metadata:

```bash
# Generate hashes for all files
npm run hash-metadata

# Generate with verification and save report
tsx scripts/hash-metadata.ts --verify --output hash-report.json
```

### 4. Sync with Blockchain

Deploy off-chain data to smart contracts:

```bash
# Dry run to see what would happen
tsx scripts/sync-deployment.ts --dry-run

# Deploy to blockchain
tsx scripts/sync-deployment.ts --config config.json --verbose
```

## 📊 Sample Data

The system includes realistic sample data for three types of orbital assets:

### 🛰️ Satellites
- **SAT-ALPHA-1**: GEO communications satellite
- **SAT-BETA-2**: LEO Earth observation satellite

### 🖥️ Orbital Compute Stations
- **OCS-PRIMARY**: High-performance orbital computing platform

### 📡 Orbital Relay Stations
- **ORS-GATEWAY**: MEO communication relay hub

Each asset includes:
- Complete technical specifications
- Document references with cryptographic hashes
- Realistic operational parameters
- Associated lease agreements

## 🔧 CLI Tools

### Generate Sample Data
```bash
tsx scripts/generate-sample-data.ts [options]

Options:
  --output-dir <dir>    Output directory (default: ./data)
  --assets <count>      Number of assets to generate (default: 10)
  --leases <count>      Number of leases to generate (default: 5)
```

### Validate Schemas
```bash
tsx scripts/validate-schemas.ts [options]

Options:
  --data-dir <dir>      Data directory to validate (default: ./data)
  --verbose, -v         Show detailed validation results
  --exit-on-error       Exit with error code if validation fails
  --no-report           Don't generate validation report file
```

### Hash Metadata
```bash
tsx scripts/hash-metadata.ts [options]

Options:
  --data-dir <dir>      Data directory to process (default: ./data)
  --output <file>       Save hash report to file
  --verify              Verify existing hashes
  --verbose, -v         Show detailed hash information
```

### Sync Deployment
```bash
tsx scripts/sync-deployment.ts [options]

Options:
  --data-dir <dir>      Data directory with assets/leases (default: ./data)
  --config <file>       Configuration file path (default: ./config.json)
  --dry-run             Show what would be done without executing
  --skip-asset-types    Skip asset type creation
  --skip-assets         Skip asset registration
  --skip-leases         Skip lease offer creation
  --verbose, -v         Show detailed output
```

## 🔗 Programmatic Usage

### Basic Usage

```typescript
import { AssetLeasingTestSystem } from './src/index.js';

// Create test system
const testSystem = new AssetLeasingTestSystem({
  dataDir: './data',
  blockchainConfig: {
    network: 'anvil',
    rpcUrl: 'http://localhost:8545',
    privateKey: '0x...',
    contracts: { /* contract addresses */ }
  }
});

// Initialize and validate
await testSystem.initialize();
const validation = await testSystem.validateAllData();
console.log(`Validation: ${validation.valid ? 'PASS' : 'FAIL'}`);

// Test integration workflow
const workflow = await testSystem.testIntegrationWorkflow();
console.log(`Integration test: ${workflow.success ? 'PASS' : 'FAIL'}`);
```

### Working with Individual Components

```typescript
import { storage, validation, crypto, blockchain } from './src/index.js';

// Load and validate an asset
const asset = await storage.quickLoadAsset('SAT-ALPHA-1');
const validationResult = await validation.validateAssetMetadata(asset);

// Generate and verify hash
const hash = crypto.generateMetadataHash(asset);
const verified = crypto.verifyHash(asset, hash.hash);

// Connect to blockchain
const integration = blockchain.createBlockchainIntegration(config);
const networkInfo = await integration.getNetworkInfo();
```

## 📝 Data Schemas

### Asset Metadata Schema

Assets follow this structure:

```typescript
interface AssetMetadata {
  assetId: string;
  name: string;
  description: string;
  assetType: 'satellite' | 'orbital_compute' | 'orbital_relay';
  specifications: AssetSpecifications;
  documents: DocumentReference[];
  metadata: {
    createdAt: string;
    updatedAt: string;
    version: string;
  };
}
```

### Lease Agreement Schema

Leases include asset-specific terms:

```typescript
interface LeaseAgreement {
  leaseId: string;
  assetId: string;
  lessorAddress: string;
  lesseeAddress: string;
  terms: LeaseTerms;
  legalDocument: DocumentReference;
  metadataHash: string;
  status: LeaseStatus;
  metadata: {
    createdAt: string;
    updatedAt: string;
    version: string;
  };
}
```

## 🧪 Testing Workflows

### End-to-End Testing

1. **Data Validation**: Ensure all JSON files are valid
2. **Hash Generation**: Create consistent metadata hashes
3. **Blockchain Connection**: Verify smart contract connectivity
4. **Asset Type Creation**: Deploy asset types to registry
5. **Asset Registration**: Register assets with metadata hashes
6. **Lease Creation**: Create marketplace lease offers
7. **Verification**: Confirm on-chain/off-chain consistency

### Local Development Workflow

```bash
# 1. Generate fresh test data
npm run generate-samples -- --assets 5 --leases 3

# 2. Validate all data
npm run validate-schemas --verbose

# 3. Test blockchain integration (dry run)
tsx scripts/sync-deployment.ts --dry-run --verbose

# 4. Deploy to local Anvil chain
tsx scripts/sync-deployment.ts --config anvil-config.json
```

### Testnet Integration

```bash
# 1. Configure for testnet
cp config.example.json sepolia-config.json
# Edit with Sepolia RPC and contract addresses

# 2. Validate before deployment
npm run validate-schemas --exit-on-error

# 3. Deploy with gas price limit
tsx scripts/sync-deployment.ts \
  --config sepolia-config.json \
  --max-gas-price 20000000000 \
  --verbose
```

## 🔍 Troubleshooting

### Common Issues

**Validation Errors**
- Check JSON syntax in data files
- Verify asset IDs are unique
- Ensure dates are in ISO 8601 format
- Validate Ethereum addresses format

**Blockchain Connection Issues**
- Verify RPC URL is accessible
- Check private key format (0x prefix)
- Ensure sufficient ETH balance for gas
- Confirm contract addresses are correct

**Hash Mismatches**
- Ensure consistent JSON formatting
- Check for extra whitespace or encoding issues
- Verify schemas match contract expectations

### Debug Mode

Enable verbose logging for detailed information:

```bash
# Validation with full error details
tsx scripts/validate-schemas.ts --verbose --data-dir ./data

# Deployment with transaction details
tsx scripts/sync-deployment.ts --verbose --config config.json

# Hash generation with verification
tsx scripts/hash-metadata.ts --verbose --verify
```

## 🤝 Integration with Main Protocol

This off-chain system is designed to work seamlessly with the main Asset Leasing Protocol:

1. **Contract Compatibility**: Metadata hashes match smart contract expectations
2. **Event Synchronization**: Can listen to and process blockchain events
3. **Data Consistency**: Validates off-chain data against on-chain state
4. **Deployment Integration**: Works with existing deployment scripts

### Using with Forge Scripts

The deployment sync script can work alongside Forge deployment:

```bash
# 1. Deploy contracts with Forge
forge script script/Deploy.s.sol --rpc-url $RPC_URL --broadcast

# 2. Create test assets with Forge
forge script script/CreateTestAssets.s.sol --rpc-url $RPC_URL --broadcast

# 3. Sync off-chain data
tsx scripts/sync-deployment.ts --skip-asset-types --config config.json
```

## 📈 Performance Considerations

### File-Based Storage Limitations

- **Scale**: Suitable for testing with hundreds of assets
- **Concurrency**: No built-in locking mechanisms
- **Search**: Linear search through files
- **Production**: Consider database migration for production use

### Optimization Tips

- Use `--skip-*` flags to avoid redundant operations
- Batch operations when possible
- Cache validation results during development
- Use dry-run mode for testing deployment scripts

## 🔮 Future Enhancements

- **Database Integration**: PostgreSQL/SQLite adapter
- **Event Monitoring**: Real-time blockchain event processing
- **API Server**: REST API for web interfaces
- **Advanced Validation**: Cross-asset consistency checks
- **Performance Metrics**: Gas estimation and optimization
- **Multi-Network**: Simultaneous deployment across networks

## 📄 License

This off-chain test system is part of the Asset Leasing Protocol project and follows the same license terms.