# Offchain Testing System - Refactored Protocol

This directory contains the offchain testing infrastructure for the Asset Leasing Protocol after the major refactor.

## Status

✅ **Phase 1 Complete**: Core utilities and deployment scripts
🔄 **Phase 2-5**: Pending implementation

See [REFACTOR-STATUS.md](./REFACTOR-STATUS.md) for detailed progress.

## Quick Start - Use Foundry Tests (Recommended)

The Foundry tests work perfectly and demonstrate the full protocol:

```bash
# From project root
forge test --match-path test/AssetCreationAndRegistration.t.sol -vv
```

This shows you asset type creation, instance registration, metadata storage, and token deployment - all 8 tests passing!

## Core Files Created

✅ `src/utils/schema-hash.ts` - Schema hashing utilities  
✅ `src/utils/metadata-converter.ts` - JSON ↔ Metadata[] conversion  
✅ `src/integration/blockchain-refactored.ts` - Blockchain service  
✅ `src/test-refactored.js` - End-to-end test script  
✅ `scripts/deploy-refactored.ts` - Deployment script  
✅ `scripts/test-register-asset.ts` - Asset registration test  

See REFACTOR-STATUS.md for complete details and next steps.
