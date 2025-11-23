# Asset Leasing Protocol

This repository contains the smart contracts and supporting tooling for registering assets, creating leases, and distributing lease revenue to token holders. The on-chain layer focuses on asset and lease data, while heavier metadata and documents are handled off chain.

The repository is split into two main parts:
- Solidity contracts and Foundry tests under `src/` and `test/`.
- A TypeScript offchain toolkit under `test/offchain/` that provides an API server, mock database, demos, and tests, including X402 streaming payments.

## 1. Smart Contract Layer

### 1.1 Contracts

- `AssetRegistry.sol`  
  Registers asset types and individual assets. Each asset type is identified by a schema hash. Registering an asset deploys a dedicated ERC‑20 token contract and stores hashes for metadata and document references.

- `AssetERC20.sol`  
  ERC‑20 token implementation used per asset. Integrates with ERC20Votes so revenue distribution can rely on checkpointed balances.

- `LeaseFactory.sol`  
  Mints ERC‑721 Lease NFTs from an EIP‑712 `LeaseIntent` signed by both lessor and lessee. Stores compact lease terms on chain and emits events for offchain indexing.

- `Marketplace.sol`  
  Handles sale offers and lease offers. For leases, it stores `LeaseFactory.LeaseIntent`, accepts funded bids, and calls `LeaseFactory.mintLease` when a bid is accepted. It also manages revenue claims for token holders.

- `MetadataStorage.sol`  
  Provides a simple key/value metadata mechanism that other contracts use to attach additional data by hash.

Key design points:
- Contracts store hashes and references, not full documents.
- Ownership and lease state are visible on chain through ERC‑20 balances and Lease NFTs.
- Events are emitted for all state changes to support indexing and offchain mirrors.

### 1.2 Building and Testing Contracts

Requirements:
- Foundry (`forge`, `cast`, `anvil`)
- Solidity 0.8.30 toolchain (handled by Foundry)

Build:
```bash
forge build
```

Run tests:
```bash
# All Solidity tests
forge test

# With verbose output
forge test -vvv

# Single contract suite
forge test --match-path test/component/AssetRegistry.t.sol
```

Coverage:
```bash
forge coverage
```

The Foundry tests cover component-level behavior for each contract (`test/component`) and end‑to‑end flows (`test/integration`), including asset registration, lease minting, and revenue claims.

## 2. Offchain Toolkit (TypeScript)

The `test/offchain/` directory contains a Node/TypeScript toolkit for working with the protocol from typical Web2 applications. It is intended for local development, demos, and integration tests rather than production deployment.

Core ideas (see `docs/offchain-systems.md` for full detail):
- Use a simple REST API and services instead of direct contract calls.
- Store asset and lease metadata in a database, with SHA‑256 hashes mirrored on chain.
- Keep all infrastructure pieces replaceable: start with in‑memory mocks, swap to Postgres/Redis later.

### 2.1 Layout

At a high level:

```text
test/offchain/
├── src/
│   ├── core/        # blockchain client, Anvil and deployment helpers
│   ├── api/         # Express-based API server
│   ├── storage/     # MockDatabase, cache abstractions
│   ├── x402/        # X402 payment service and facilitator client
│   └── utils/       # CLI output, crypto helpers, test data
├── demos/           # CLI demos and walkthrough scripts
├── tests/           # Vitest suites (integration and narrative tests)
└── package.json
```

### 2.2 Installing and Running Offchain Code

From the `test/offchain/` directory:

```bash
cd test/offchain
npm install
```

Run the main Vitest suites:

```bash
# Enhanced flows: asset + lease + X402
NODE_OPTIONS=--dns-result-order=ipv4first npx vitest run tests/enhanced-flow.test.ts

# X402 streaming narration
npx vitest run tests/x402-streaming.test.ts

# REST API integration tests (starts/stops API server)
npx vitest run tests/api-integration.test.ts
```

The offchain tests use Anvil for local chains, the `MockDatabase` for in‑memory storage, and the same contract artifacts as the Foundry tests.

### 2.3 API Server

`test/offchain/src/api/server.ts` defines `AssetLeasingApiServer`, an Express application that exposes endpoints for:
- Asset listing and registration: `GET /api/assets`, `POST /api/assets`
- Lease listing and creation: `GET /api/leases`, `POST /api/leases`
- X402 access endpoints: `POST /api/leases/:leaseId/access`, plus helper routes under `/api/leases/:leaseId/x402/…`
- System and blockchain information: `/api/blockchain/*`, `/api/system/*`, `/health`

The server is normally started inside tests or demos. For ad‑hoc use you can create a small entrypoint that constructs:
- a `ContractDeployer` (for connecting to Anvil or another JSON‑RPC endpoint)
- a `MockOffChainServices` or similar services object
and passes them into `new AssetLeasingApiServer(config, { offChainServices, contractDeployer })`.

## 3. X402 Streaming Payments

The repository includes a prototype integration of Coinbase’s X402 HTTP‑402 payment flow for streaming lease payments.

Implementation pieces:
- `test/offchain/src/x402/payment-service.ts` – computes per‑interval payment requirements (per‑second or batch) based on stored lease terms and network configuration.
- `test/offchain/src/x402/facilitator-client.ts` – wraps the facilitator API (mocked in tests) for verification and settlement.
- `AssetLeasingApiServer` – exposes `/api/leases/:leaseId/x402/requirements` and `/api/leases/:leaseId/access` to drive HTTP 402 challenge/response using an `X-PAYMENT` header.
- `MockDatabase` – persists each X402 interval payment with lease id, amount, mode, and facilitator transaction hash.

How it is exercised:
- `tests/enhanced-flow.test.ts`  
  Deploys upgradeable contracts, registers assets, posts lease offers, accepts bids, mints a Lease NFT, and then runs two X402 streaming intervals using the same lease data.
- `tests/api-integration.test.ts`  
  Boots the API server against `MockDatabase` and a deployer stub, then walks through asset registration, lease offer creation, X402 requirements, 402 challenge, and access with a valid `X-PAYMENT` header.
- `tests/x402-streaming.test.ts`  
  Shows a CLI‑style narration around `X402PaymentService` and the facilitator client, storing results in `MockDatabase`.

For a focused explanation of this part of the system, see:
- `docs/x402-implementation/x402-explainer.md`
- `docs/x402-implementation/x402-executive-summary.md`

## 4. Repository Overview

```text
src/                     # Solidity contracts
  AssetRegistry.sol
  AssetERC20.sol
  LeaseFactory.sol
  Marketplace.sol
  MetadataStorage.sol

test/                    # Foundry tests and related docs
  component/             # Contract-level tests
  integration/           # Multi-contract flows
  offchain/              # Node/TypeScript toolkit and tests

docs/
  contract-specific/     # Per-contract reference material
  offchain-systems.md    # Offchain architecture and design
  x402-implementation/   # X402 explainer and executive summary
```

## 5. Notes and Dependencies

- Contracts target Solidity 0.8.30 and use OpenZeppelin upgradeable libraries.
- Local development assumes Foundry and Node.js (v18+ recommended).
- Offchain tests use Anvil for local chains and `ethers` v6 for JSON‑RPC interaction.

For deeper design details, see `docs/offchain-systems.md` and the contract‑specific docs in `docs/contract-specific/`.
