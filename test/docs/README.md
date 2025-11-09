# Asset Leasing Protocol - Test Documentation

## Quick Navigation

This directory contains comprehensive documentation for the Asset Leasing Protocol testing framework.

### Core Documentation

- **[Developer Handbook](developer-handbook.md)** - Complete onboarding guide for new developers
  - Repository structure and development workflow
  - Testing philosophy and anti-patterns to avoid
  - Quick commands and common tasks

- **[Testing Package](testing-package.md)** - Comprehensive testing framework guide
  - Three-tier testing architecture (Component, Integration, System)
  - Test quality gates and validation strategies
  - Anti-pattern reference and best practices

- **[API Reference](api-reference.md)** - REST API documentation
  - Complete endpoint specifications
  - Request/response schemas
  - Authentication and error handling

- **[Integration Testing Guide](integration-testing.md)** - Offchain integration testing
  - Anvil blockchain management
  - Event processing and database integration
  - Mock services and test workflows

## Test Structure

```
test/
├── component/          # Tier 1: Single contract tests
│   ├── AssetERC20.t.sol
│   ├── AssetRegistry.t.sol
│   ├── LeaseFactory.t.sol
│   └── MetadataStorage.t.sol
├── integration/        # Tier 2-3: Multi-contract and system tests
│   ├── DeploymentInit.t.sol
│   └── Integration.t.sol
├── helpers/            # Test support files
├── mocks/              # Mock contracts
└── docs/               # This directory
```

## Quick Start

### Run All Tests
```bash
forge test
```

### Run Component Tests
```bash
forge test --match-path "test/component/**/*.sol"
```

### Run Integration Tests
```bash
forge test --match-path "test/integration/**/*.sol"
```

### Run Specific Test File
```bash
forge test --match-path test/component/AssetERC20.t.sol
```

### Verbose Output
```bash
forge test -vvvv
```

### Coverage Report
```bash
forge coverage
```

## Testing Philosophy

**Focus on genuine validation over false confidence**
- Happy path testing for business logic
- Rigorous edge cases for security
- Tests must actually verify functionality, not just pass by design

**Anti-Patterns to Avoid:**
1. Self-satisfying tests that succeed by design
2. Circular validation using same system to set and verify
3. Existence-only validation without correctness checks

See [Testing Package](testing-package.md) for complete anti-pattern reference.

## Current Test Status

All tests passing. See individual test files for detailed coverage.

## Additional Resources

- [Foundry Documentation](https://book.getfoundry.sh/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [Solidity Documentation](https://docs.soliditylang.org/)
