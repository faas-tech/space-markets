# Space Markets

Tokenized asset leasing protocol for orbital infrastructure and real-world assets. Register assets on-chain, create lease agreements through a trustless marketplace, stream payments per-second via the X402 protocol, and distribute revenue automatically to fractional token holders.

Built on Base (EVM) with Solidity smart contracts, a TypeScript offchain toolkit, and a Next.js frontend with an interactive 12-step protocol demo.

## Quick Start

### Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation) (forge, cast, anvil)
- Node.js 18+
- npm

### Build and Test Smart Contracts

```bash
forge build
forge test
forge test --match-path "test/component/*.sol"   # Component tests only
forge test --match-path "test/integration/*.sol"  # Integration tests only
forge coverage
```

### Run Offchain Toolkit

```bash
cd test/offchain
npm install
npm test                  # All Vitest suites
npm run demo:complete     # Full 12-step protocol demo (~30s)
npm run demo:x402         # X402 streaming payments demo
npm run demo:simple       # Simple asset + lease workflow
```

### Run Frontend

```bash
cd frontend
npm install
npm run dev               # Development server at localhost:3000
npm run build             # Production build
```

## Architecture

```
                  ┌──────────────────────────────────────────┐
                  │          Frontend (Next.js 14)            │
                  │   /protocol-demo  /market  /assets        │
                  └──────────────┬───────────────────────────┘
                                 │
                  ┌──────────────▼───────────────────────────┐
                  │      Offchain API Server (Express)        │
                  │   REST endpoints, X402 gating, services   │
                  └──────────────┬───────────────────────────┘
                                 │
          ┌──────────────────────▼──────────────────────────┐
          │           Smart Contracts (Solidity 0.8.30)      │
          │  AssetRegistry · Marketplace · LeaseFactory      │
          │  AssetERC20 · MetadataStorage                    │
          │  UUPS Upgradeable · EIP-712 Signatures           │
          └──────────────────────────────────────────────────┘
```

## Repository Structure

```
src/                          # Solidity smart contracts (5 core + utilities)
├── AssetRegistry.sol         #   Asset type schemas and instance registration
├── AssetERC20.sol            #   Per-asset ERC-20 token with ERC20Votes
├── LeaseFactory.sol          #   Lease NFT minting with EIP-712 verification
├── Marketplace.sol           #   Offer/bid matching, escrow, revenue claims
├── MetadataStorage.sol       #   Key-value metadata storage by hash
├── utils/BaseUpgradable.sol  #   UUPS proxy base
└── libraries/Roles.sol       #   Role constants

test/
├── component/                # Per-contract Foundry test suites (6 files)
├── integration/              # Multi-contract workflow tests (2 files)
└── offchain/                 # TypeScript toolkit
    ├── src/
    │   ├── core/             #   AnvilManager, BlockchainClient, ContractManager, EventProcessor
    │   ├── services/         #   AssetService, LeaseService, MarketplaceService, RevenueService
    │   ├── api/              #   Express REST server and route handlers
    │   ├── x402/             #   X402 V2 payment service and facilitator client
    │   ├── storage/          #   Database interface and MockDatabase
    │   └── utils/            #   Crypto, EIP-712, CLI output, metadata conversion
    ├── demos/                #   CLI demo scripts (4 scripts)
    └── tests/                #   Vitest integration and narrative tests (7 files)

frontend/                     # Next.js 14 + React 18 + Tailwind
├── src/app/
│   ├── protocol-demo/        #   Interactive 12-step protocol walkthrough
│   ├── market/               #   Spot and futures marketplace
│   ├── assets/               #   Asset registration and listing
│   └── api/                  #   API routes (X402 access gating)
└── src/components/
    ├── demo/                 #   Demo step components and animations (28 files)
    ├── market/               #   Marketplace UI components
    ├── forms/                #   Asset registration and bid forms
    └── streaming/            #   X402 streaming payment panel

docs/                         # Documentation
├── contract-specific/        #   Per-contract reference (6 files)
├── x402-implementation/      #   X402 protocol explainer, executive summary, v1-to-v2 research
├── API_SPECIFICATION.md      #   REST API endpoint documentation
├── FRONTEND_DESIGN.md        #   Design system and component library
├── FRONTEND_INTEGRATION_GUIDE.md
├── DATABASE_MIGRATION_GUIDE.md
├── PRODUCTION_DEPLOYMENT_GUIDE.md
├── DEMO_PRESENTATION_GUIDE.md
└── offchain-systems.md       #   Complete offchain architecture guide

script/                       # Foundry deployment scripts
lib/                          # Git submodules (OpenZeppelin, Foundry)
deployments/                  # Contract deployment records
```

## Smart Contracts

Five core contracts deployed as UUPS upgradeable proxies:

| Contract | Purpose |
|----------|---------|
| **AssetRegistry** | Register asset types (schemas) and instances; deploys per-asset ERC-20 tokens |
| **AssetERC20** | Fractional ownership token with ERC20Votes for checkpointed revenue distribution |
| **LeaseFactory** | Mint ERC-721 Lease NFTs from EIP-712 signed LeaseIntent structs |
| **Marketplace** | Post offers, accept funded bids, manage escrow, distribute revenue to token holders |
| **MetadataStorage** | Key-value metadata storage; content-addressed hashes on-chain, full data off-chain |

**Test status:** 51/55 Solidity tests passing (93%). Component and integration suites cover asset registration, EIP-712 marketplace bidding, lease NFT minting, and revenue distribution.

## Offchain Services

The TypeScript toolkit in `test/offchain/` provides a complete Web2 integration layer:

| Service | Responsibility |
|---------|---------------|
| **AssetService** | Asset registration, metadata management, token holder queries |
| **LeaseService** | Lease offer creation and retrieval |
| **MarketplaceService** | EIP-712 bidding, offer acceptance, NFT minting |
| **RevenueService** | Proportional revenue distribution to token holders |
| **BlockchainClient** | ethers.js v6 wrapper for contract interaction |
| **EventProcessor** | Real-time blockchain event monitoring with reorg protection |
| **X402PaymentService** | Per-second/batch payment calculation from hourly rates |
| **X402FacilitatorClient** | Coinbase X402 V2 facilitator integration |

**API Server:** Express-based REST API with 15+ endpoints for assets, leases, X402 payments, blockchain info, and system management. See `docs/API_SPECIFICATION.md`.

## X402 Streaming Payments

Integrates Coinbase's [X402 protocol](https://www.x402.org/) (V2) for HTTP 402-based streaming lease payments:

- Per-second USDC micropayments with no billing infrastructure
- `Payment-Signature` header (V2) with legacy `X-PAYMENT` fallback
- CAIP-2 chain identifiers (`eip155:84532` Base Sepolia, `eip155:8453` Base Mainnet)
- Mock facilitator for local development; production facilitator for mainnet

## Interactive Demo

The `/protocol-demo` page provides a 12-step animated walkthrough of the complete protocol lifecycle:

1. Deploy UUPS proxy contracts
2. Create asset type schema
3. Register asset instance with ERC-20 token
4. Verify on-chain metadata
5. Post lease offer to marketplace
6. Submit funded bid with EIP-712 signature
7. Lessor accepts bid
8. Mint Lease NFT
9. X402 payment requirements
10. Stream per-second USDC payments
11. Revenue distribution to token holders
12. Protocol summary

Supports auto-play and manual step-through modes, with 4 asset class presets (orbital, renewable energy, spectrum rights, compute capacity) and shareable URLs.

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Smart Contracts | Solidity 0.8.30, OpenZeppelin Upgradeable, UUPS, EIP-712 |
| Build & Test | Foundry (forge, cast, anvil), Cancun EVM, via_ir optimization |
| Offchain | TypeScript, Node.js 18+, ethers.js v6, Express, Vitest |
| Frontend | Next.js 14, React 18, Tailwind CSS, wagmi v2, RainbowKit, viem |
| Payments | Coinbase X402 V2, `@coinbase/x402` ^2.1.0 |
| Target Chain | Base Sepolia (testnet) / Base Mainnet (production) |

## Documentation

| Document | Description |
|----------|-------------|
| [AGENTS.md](./AGENTS.md) | Agent navigation guide for AI coding contributors |
| [CLAUDE.md](./CLAUDE.md) | Claude Code-specific instructions and constraints |
| [API Specification](./docs/API_SPECIFICATION.md) | REST API endpoints and request/response formats |
| [Offchain Systems](./docs/offchain-systems.md) | Complete offchain architecture and design |
| [Frontend Design](./docs/FRONTEND_DESIGN.md) | Design system, components, and visual language |
| [Frontend Integration](./docs/FRONTEND_INTEGRATION_GUIDE.md) | Frontend development guide with code examples |
| [X402 Explainer](./docs/x402-implementation/x402-explainer.md) | X402 V2 protocol technical details |
| [X402 Executive Summary](./docs/x402-implementation/x402-executive-summary.md) | X402 business overview |
| [Production Deployment](./docs/PRODUCTION_DEPLOYMENT_GUIDE.md) | Base Sepolia/Mainnet deployment guide |
| [Database Migration](./docs/DATABASE_MIGRATION_GUIDE.md) | MockDatabase to PostgreSQL migration |
| [Demo Presentation](./docs/DEMO_PRESENTATION_GUIDE.md) | 12-step demo speaker notes and audience guides |
| [Contract Docs](./docs/contract-specific/) | Per-contract reference (6 files) |

## License

FAAS Technologies Inc. All rights reserved.
