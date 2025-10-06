# Enhanced CLI Output for Integration Tests

This document describes the enhanced CLI output system that visualizes the complete data flow from offchain schemas through cryptographic hashing to onchain smart contract creation.

## Overview

The enhanced output system provides rich, color-coded terminal output that shows:

1. **Offchain Metadata Schemas** - Complete data structures for assets and leases
2. **Cryptographic Hashing Process** - Input data, algorithm, and hash output
3. **Onchain Parameters** - Transaction details, contract addresses, and gas usage
4. **Data Flow Verification** - End-to-end consistency checks

## Quick Start

### Run the Demonstration

```bash
# Standalone demonstration (no blockchain required)
node demo-enhanced-output.js
```

### Run Enhanced Tests

```bash
# Full integration tests with enhanced output
npm run test:enhanced
```

## Components

### 1. CLI Output Utilities (`src/utils/cli-output.ts`)

Provides formatted output functions:

- `header()` - Section headers with different levels
- `keyValue()` - Formatted key-value pairs
- `displayAssetMetadata()` - Complete asset metadata display
- `displayLeaseAgreement()` - Complete lease agreement display
- `displayHashingProcess()` - Hash generation with breakdown
- `displayAssetRegistration()` - On-chain asset creation summary
- `displayLeaseCreation()` - On-chain lease creation summary
- `displayFlowSummary()` - Step-by-step progress tracker

### 2. Test Data Factory (`src/utils/test-data-factory.ts`)

Generates realistic test data:

- `createSatelliteAsset()` - Satellite metadata with specs and documents
- `createOrbitalComputeAsset()` - Compute platform metadata
- `createOrbitalRelayAsset()` - Communication relay metadata
- `createSatelliteLease()` - Satellite lease agreement
- `createOrbitalComputeLease()` - Compute lease agreement
- `createOrbitalRelayLease()` - Relay lease agreement

### 3. Enhanced Flow Tests (`tests/enhanced-flow.test.ts`)

Integration tests demonstrating complete flows:

- Complete satellite asset creation
- Complete lease creation and marketplace posting
- Orbital compute asset creation
- Data consistency verification

## Example Output

### Asset Creation Flow

```
════════════════════════════════════════════════════════════════════════════════
  PART 1: ASSET CREATION FLOW
════════════════════════════════════════════════════════════════════════════════

────────────────────────────────────────────────────────────────────────────────
▶ Offchain Asset Metadata Schema
────────────────────────────────────────────────────────────────────────────────

Asset Identity:
  Asset ID: SAT-1728090000-ABC123
  Name: Alpha-1 Earth Observation Satellite
  Type: satellite

Orbital Parameters:
  Type: LEO
  Altitude: 550 km
  Inclination: 97.4°
  Period: 1.58 hours

Physical Characteristics:
  Mass: 500 kg
  Power: 300 W
  Design Life: 5 years
  Dimensions: 2.5m × 1.2m × 1.8m

Imaging Capabilities:
  Resolution: 0.5 meters
  Swath Width: 50 km
  Spectral Bands: RGB, NIR, SWIR
  Revisit Time: 12 hours

────────────────────────────────────────────────────────────────────────────────
▶ Hashing Process: Asset Metadata
────────────────────────────────────────────────────────────────────────────────

Input Data (JSON):
{"assetId":"SAT-1728090000-ABC123","assetType":"satellite",...}

Input Size: 474 bytes
Algorithm: SHA-256
Encoding: UTF-8

Hash Output:
  Raw Hash (hex): 567f14bad844e9b7939f48385ca01001597d1d1af675568730493fdd72375750
  Ethereum Format: 0x567f14bad844e9b7939f48385ca01001597d1d1af675568730493fdd72375750
  Hash Length: 64 chars (32 bytes)

Hash Breakdown:
  First 8 chars: 567f14ba (useful for short IDs)
  Bytes32 (first 32 chars): 567f14bad844e9b7939f48385ca01001 (for onchain storage)
  Full hash: 567f14bad844e9b7939f48385ca01001597d1d1af675568730493fdd72375750

✓ Metadata hash generated successfully!

────────────────────────────────────────────────────────────────────────────────
▶ Onchain Asset Registration Parameters
────────────────────────────────────────────────────────────────────────────────

Asset Details:
  Asset Type ID: 1
  Metadata Hash (bytes32): 0x567f14bad844e9b7939f48385ca01001
  Data URI: ipfs://QmAssetMetadata/SAT-1728090000-ABC123

Token Parameters:
  Token Name: Alpha-1 Satellite Shares
  Token Symbol: ALPHA-SAT
  Total Supply: 1,000,000 tokens
  Issuer Address: 0x1234567890123456789012345678901234567890

Simulated Transaction Result:
  Asset ID: 42
  Token Address: 0xABCDEF1234567890ABCDEF1234567890ABCDEF12
  Transaction Hash: 0x123abc456def789...
  Block Number: 12345
  Gas Used: 2,847,392

✓ Asset successfully registered on blockchain!
```

### Lease Creation Flow

```
════════════════════════════════════════════════════════════════════════════════
  PART 2: LEASE CREATION FLOW
════════════════════════════════════════════════════════════════════════════════

────────────────────────────────────────────────────────────────────────────────
▶ Offchain Lease Agreement Schema
────────────────────────────────────────────────────────────────────────────────

Lease Identity:
  Lease ID: LEASE-ABC123
  Asset ID: SAT-1728090000-ABC123
  Status: pending_signatures

Parties:
  Lessor: 0x1234567890123456789012345678901234567890
  Lessee: 0x0987654321098765432109876543210987654321

Terms:
  Start Date: 2024-11-01T00:00:00Z
  End Date: 2024-11-30T23:59:59Z
  Duration: 30 days
  Payment Amount: 1,000 USDC
  Payment Schedule: monthly

Satellite-Specific Terms:
  Orbital Period: 1.58 hours
  Communication Frequency: 8.4 GHz
  Coverage Area: 2.5 million km²
  Imaging Resolution: 0.5 meters
  Data Download Rights: Granted

Restrictions:
  • No military applications
  • Environmental monitoring only
  • Data sharing restrictions apply

────────────────────────────────────────────────────────────────────────────────
▶ Hashing Process: Lease Terms
────────────────────────────────────────────────────────────────────────────────

Input: Lease Terms JSON
{"currency":"USDC","endDate":"2024-11-30T23:59:59Z",...}

Algorithm: SHA-256
Terms Hash: 0xd8e6f63ceaef4b8337e44fc4db70601067b2aba6fd2b126723ec4742c1798b8c
Bytes32 Format: 0xd8e6f63ceaef4b8337e44fc4db706010

✓ Lease terms hash generated successfully!
```

## Data Flow Architecture

### Asset Creation Flow

```
┌─────────────────────────────────────┐
│   OFFCHAIN METADATA SCHEMA         │
│                                     │
│   {                                 │
│     assetId: "SAT-...",            │
│     specifications: {...},          │
│     documents: [...]                │
│   }                                 │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   CRYPTOGRAPHIC HASHING             │
│                                     │
│   SHA-256(JSON.stringify(metadata)) │
│   → 0x567f14ba...                   │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   ONCHAIN PARAMETERS               │
│                                     │
│   registerAsset(                    │
│     typeId,                         │
│     metadataHash,  ← hash           │
│     dataURI,                        │
│     tokenName,                      │
│     tokenSymbol,                    │
│     totalSupply                     │
│   )                                 │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   BLOCKCHAIN TRANSACTION            │
│                                     │
│   ✓ Asset ID: 42                   │
│   ✓ Token Address: 0xABCD...       │
│   ✓ Transaction Hash: 0x123...     │
└─────────────────────────────────────┘
```

### Lease Creation Flow

```
┌─────────────────────────────────────┐
│   OFFCHAIN LEASE AGREEMENT         │
│                                     │
│   {                                 │
│     leaseId: "LEASE-...",          │
│     terms: {...},                   │
│     specificTerms: {...}            │
│   }                                 │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   CRYPTOGRAPHIC HASHING             │
│                                     │
│   SHA-256(JSON.stringify(terms))    │
│   → 0xd8e6f63c...                   │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   ONCHAIN LEASE OFFER              │
│                                     │
│   postLeaseOffer(                   │
│     assetId,                        │
│     paymentAmount,                  │
│     startTime,                      │
│     endTime,                        │
│     termsHash  ← hash               │
│   )                                 │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   BLOCKCHAIN TRANSACTION            │
│                                     │
│   ✓ Offer ID: 7                    │
│   ✓ Transaction Hash: 0x789...     │
└─────────────────────────────────────┘
```

## Hashing Details

### Metadata Hash Generation

1. **Input Preparation**
   - Serialize metadata to deterministic JSON
   - Sort object keys alphabetically
   - UTF-8 encoding

2. **Hash Calculation**
   - Algorithm: SHA-256
   - Output: 64 hex characters (32 bytes)
   - Format: `0x` prefix for Ethereum compatibility

3. **Onchain Storage**
   - Stored as `bytes32` (first 32 characters)
   - Used for verification and data integrity

### Hash Verification

Off-chain systems can independently verify data by:
1. Fetching metadata from offchain storage
2. Reconstructing hash using same algorithm
3. Comparing with onchain hash
4. Validating data integrity

## Integration with Tests

### Using Enhanced Output in Tests

```typescript
import {
  header,
  displayAssetMetadata,
  displayHashingProcess,
  displayAssetRegistration
} from '../src/utils/cli-output';
import { createSatelliteAsset } from '../src/utils/test-data-factory';
import { generateMetadataHash } from '../src/utils/crypto';

// Create test data
const asset = createSatelliteAsset({ name: 'Test Satellite' });

// Display metadata
displayAssetMetadata(asset);

// Show hashing process
const hashResult = displayHashingProcess(asset, 'Asset Metadata');

// Register onchain and display results
const result = await deployer.registerAsset(...);
displayAssetRegistration({
  assetId: result.assetId,
  // ... other params
});
```

## Color Scheme

- **Cyan**: Major section headers
- **Blue**: Subsection headers and info messages
- **Green**: Success messages, values, and completed steps
- **Yellow**: Warnings, restrictions, and pending steps
- **Dim**: Labels and descriptive text
- **Red**: Errors (in error scenarios)

## Future Enhancements

1. **Export to HTML** - Generate HTML reports with the same formatting
2. **JSON Output** - Machine-readable output for CI/CD pipelines
3. **Diff Visualization** - Show changes between versions
4. **Performance Metrics** - Add timing and gas cost comparisons
5. **Interactive Mode** - Step through flows interactively

## Files Created

1. `src/utils/cli-output.ts` - CLI formatting utilities
2. `src/utils/test-data-factory.ts` - Test data generation
3. `tests/enhanced-flow.test.ts` - Integration tests with enhanced output
4. `demo-enhanced-output.js` - Standalone demonstration script
5. `CLI-OUTPUT-README.md` - This documentation

## Usage Recommendations

- **Development**: Use `demo-enhanced-output.js` for quick visualization
- **Testing**: Use `npm run test:enhanced` for full integration tests
- **CI/CD**: Tests can be run with standard output for automated pipelines
- **Documentation**: Output examples can be copied to documentation
