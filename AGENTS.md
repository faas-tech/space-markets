# AGENTS.md — Space Markets

> Universal agent briefing for AI coding contributors (Claude Code, Copilot, Cursor, OpenHands, Devin, Codex, etc.)

## Project Overview

Space Markets is a tokenized asset leasing protocol for orbital infrastructure and real-world assets. It combines Solidity smart contracts (UUPS upgradeable, EIP-712 signatures) with a TypeScript offchain toolkit (Express API, services, X402 streaming payments) and a Next.js 14 frontend.

**Stack:** Solidity 0.8.30 · Foundry · TypeScript · Node.js 18+ · ethers.js v6 · Express · Next.js 14 · React 18 · Tailwind CSS · wagmi v2 · Coinbase X402 V2
**Target chain:** Base (EVM) — Sepolia for testnet, Mainnet for production
**Repo:** `faas-tech/space-markets`

## Commands

```bash
# Smart contracts
forge build                                      # Compile contracts
forge test                                       # Run all Solidity tests
forge test --match-path "test/component/*.sol"   # Component tests only
forge test --match-path "test/integration/*.sol" # Integration tests only
forge test -vvv                                  # Verbose output
forge coverage                                   # Coverage report

# Offchain toolkit (run from test/offchain/)
cd test/offchain && npm install
npm test                                         # All Vitest suites
npm run demo:complete                            # Full 12-step protocol demo
npm run demo:x402                                # X402 streaming payments demo
npm run demo:simple                              # Simple workflow demo
npx vitest run tests/enhanced-flow.test.ts       # Enhanced flow tests (~23s)
npx vitest run tests/api-integration.test.ts     # API integration tests
npx vitest run tests/x402-streaming.test.ts      # X402 streaming tests

# Frontend (run from frontend/)
cd frontend && npm install
npm run dev                                      # Dev server at localhost:3000
npm run build                                    # Production build
```

## Repository Map

```
src/                              # Solidity smart contracts (LOCKED — do not modify)
├── AssetRegistry.sol             #   Asset type schemas + instance registration
├── AssetERC20.sol                #   Per-asset ERC-20 with ERC20Votes
├── LeaseFactory.sol              #   Lease NFT minting via EIP-712
├── Marketplace.sol               #   Offer/bid matching, escrow, revenue claims
├── MetadataStorage.sol           #   Key-value metadata by hash
├── utils/BaseUpgradable.sol      #   UUPS proxy base class
└── libraries/Roles.sol           #   Role constants

test/
├── component/                    # Per-contract Foundry tests (LOCKED)
├── integration/                  # Multi-contract Foundry tests (LOCKED)
└── offchain/                     # TypeScript offchain toolkit (ACTIVE — work here)
    ├── src/
    │   ├── core/                 #   AnvilManager, BlockchainClient, ContractManager, EventProcessor
    │   ├── services/             #   AssetService, LeaseService, MarketplaceService, RevenueService
    │   ├── api/                  #   Express REST server (AssetLeasingApiServer) + route handlers
    │   ├── x402/                 #   X402PaymentService, X402FacilitatorClient
    │   ├── storage/              #   Database interface, MockDatabase, Cache
    │   ├── types/                #   TypeScript interfaces (x402.ts, etc.)
    │   ├── schemas/              #   Zod validation schemas
    │   ├── utils/                #   Crypto, EIP-712, CLI output, metadata conversion
    │   ├── testing/              #   Mock services and event listener utilities
    │   └── errors.ts             #   Error class hierarchy
    ├── demos/                    #   CLI demo scripts (01-simple, 05-complete, x402-second-stream)
    ├── tests/                    #   Vitest suites (7 files)
    └── package.json              #   Dependencies: ethers v6, express, @coinbase/x402 ^2.1.0

frontend/                         # Next.js 14 + React 18 + Tailwind (ACTIVE — work here)
├── src/app/
│   ├── protocol-demo/            #   12-step interactive protocol walkthrough
│   ├── market/                   #   Spot and futures marketplace views
│   ├── assets/                   #   Asset registration and listing
│   ├── dashboard/                #   User dashboard
│   └── api/leases/[id]/access/   #   X402 payment-gated API route
├── src/components/
│   ├── demo/                     #   Demo steps (12) + animations (6) + controller/provider
│   ├── market/                   #   AssetRow, FuturesMarket components
│   ├── forms/                    #   AssetRegistrationForm, BidForm
│   ├── layout/                   #   Navbar
│   ├── streaming/                #   StreamingPaymentPanel
│   └── ui/                       #   Reusable UI primitives
├── src/lib/                      #   Utilities (crypto, x402, validation, demo data)
└── src/hooks/                    #   React hooks

docs/                             # Documentation (reference, do not modify without purpose)
├── contract-specific/            #   Per-contract reference docs (6 files)
├── x402-implementation/          #   X402 V2 explainer, executive summary, v1-to-v2 research
├── API_SPECIFICATION.md          #   REST API endpoints
├── offchain-systems.md           #   Complete offchain architecture (82 KB)
├── FRONTEND_DESIGN.md            #   Design system, visual language
├── FRONTEND_INTEGRATION_GUIDE.md #   Frontend dev guide with code examples
├── DATABASE_MIGRATION_GUIDE.md   #   MockDatabase → PostgreSQL
├── PRODUCTION_DEPLOYMENT_GUIDE.md#   Base Sepolia/Mainnet deployment
└── DEMO_PRESENTATION_GUIDE.md    #   12-step demo speaker notes

script/                           # Foundry deployment scripts (LOCKED)
lib/                              # Git submodules: OpenZeppelin, Foundry stdlib
```

## Boundaries

### Always (safe, no approval needed)
- Run `forge test` and `npm test` before proposing changes
- Add tests for new functionality
- Use existing service class patterns when adding features
- Follow existing TypeScript strict-mode conventions (no `any` in production code)
- Use the existing error class hierarchy in `test/offchain/src/errors.ts`

### Ask First (need human review)
- Adding new npm dependencies
- Changing the database schema or storage interface
- Modifying API endpoint signatures or adding new endpoints
- Changing the frontend routing structure
- Modifying CI/CD or deployment configuration
- Refactoring across more than 5 files

### Never (hard stops)
- Modify files in `src/*.sol` — contracts are audited and frozen
- Modify files in `test/component/` or `test/integration/` — Solidity tests are locked
- Modify files in `script/*.s.sol` — deployment scripts are locked
- Commit secrets, API keys, or private keys
- Force push to `main`
- Delete migration files or deployment records in `deployments/`

## Code Style and Conventions

**Solidity** (read-only reference):
- Solidity 0.8.30, Cancun EVM, via_ir optimization
- UUPS upgradeable pattern (OpenZeppelin)
- EIP-712 typed data for all signature verification
- Events emitted for every state change

**TypeScript** (offchain + frontend):
- Strict mode, zero `any` in production code
- ES modules (`"type": "module"` in offchain package)
- ethers.js v6 for all blockchain interaction
- Express for API server; Zod for input validation
- Vitest for testing; tsx for script execution

**Frontend**:
- Next.js 14 App Router
- React 18 with functional components and hooks
- Tailwind CSS with dark-mode-first design (slate-950 backgrounds)
- wagmi v2 + RainbowKit for wallet connection
- shadcn/ui component patterns

**Naming:**
- Files: `kebab-case.ts` for TypeScript, `PascalCase.sol` for Solidity
- Classes: `PascalCase` (e.g., `AssetService`, `BlockchainClient`)
- Functions/methods: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- React components: `PascalCase` files and exports

## Key Architecture Decisions

**EIP-712 Nested Structs:** ethers.js `TypedDataEncoder` produces invalid signatures for Solidity's nested struct encoding. The offchain toolkit uses manual `AbiCoder.encode()` in `test/offchain/src/utils/crypto.ts`. Do not refactor this to use the ethers.js built-in encoder — it will break signature verification on-chain.

**ERC20Votes Checkpoints:** After any token transfer, blocks must be advanced (`vm.roll(block.number + 1)` in Foundry tests) before querying checkpointed balances. This is required for revenue distribution to work correctly.

**Storage Abstraction:** `test/offchain/src/storage/database.ts` defines a `Database` interface. `MockDatabase` is the current in-memory implementation. Production target is PostgreSQL (see `docs/DATABASE_MIGRATION_GUIDE.md`). All services depend on the interface, not the implementation.

**X402 V2 Protocol:** Uses `Payment-Signature` header (not the deprecated `X-PAYMENT`). Chain IDs use CAIP-2 format (`eip155:84532`). The `@coinbase/x402` package version must be ^2.1.0.

## Domain Glossary

| Term | Meaning |
|------|---------|
| **Asset Type** | A schema definition (e.g., "LEO Satellite") registered on AssetRegistry |
| **Asset Instance** | A specific asset registered under a type; deploys a dedicated ERC-20 token |
| **Lease NFT** | ERC-721 token minted by LeaseFactory representing an active lease agreement |
| **LeaseIntent** | EIP-712 typed struct signed by both lessor and lessee to authorize a lease |
| **Fractional Token** | AssetERC20 token representing proportional ownership of an asset |
| **Revenue Round** | A distribution event where lease revenue is split among token holders |
| **X402** | HTTP 402-based payment protocol by Coinbase for per-request micropayments |
| **Facilitator** | X402 third-party service that verifies and settles payment signatures |
| **CAIP-2** | Chain Agnostic Improvement Proposal for chain identification (e.g., `eip155:8453`) |
| **UUPS** | Universal Upgradeable Proxy Standard — upgrade pattern used by all contracts |

## Testing

| Suite | Location | Runner | What it covers |
|-------|----------|--------|----------------|
| Component | `test/component/*.t.sol` | `forge test` | Individual contract behavior (6 files) |
| Integration | `test/integration/*.t.sol` | `forge test` | Multi-contract workflows (2 files) |
| Enhanced Flow | `test/offchain/tests/enhanced-flow.test.ts` | Vitest | Full asset → lease → X402 pipeline |
| API Integration | `test/offchain/tests/api-integration.test.ts` | Vitest | REST API server endpoints |
| X402 Streaming | `test/offchain/tests/x402-streaming.test.ts` | Vitest | Payment calculation and facilitator |
| Crypto/EIP-712 | `test/offchain/tests/crypto-hash.test.ts` | Vitest | Hash and signature utilities |

**Current status:** 51/55 Solidity tests passing (93%). All offchain Vitest suites pass. 4 non-critical ERC20Votes checkpoint edge cases remain in Solidity tests.

## Documentation Index

For detailed implementation guidance, consult these docs in order of relevance:

1. **[offchain-systems.md](docs/offchain-systems.md)** — Complete offchain architecture, service APIs, data flows (82 KB, start here for backend work)
2. **[API_SPECIFICATION.md](docs/API_SPECIFICATION.md)** — REST endpoint reference with request/response formats
3. **[FRONTEND_DESIGN.md](docs/FRONTEND_DESIGN.md)** — Design system, component library, visual patterns
4. **[FRONTEND_INTEGRATION_GUIDE.md](docs/FRONTEND_INTEGRATION_GUIDE.md)** — Frontend development guide
5. **[x402-explainer.md](docs/x402-implementation/x402-explainer.md)** — X402 V2 protocol technical details
6. **[DATABASE_MIGRATION_GUIDE.md](docs/DATABASE_MIGRATION_GUIDE.md)** — MockDatabase → PostgreSQL migration
7. **[PRODUCTION_DEPLOYMENT_GUIDE.md](docs/PRODUCTION_DEPLOYMENT_GUIDE.md)** — Deployment to Base Sepolia/Mainnet
8. **[contract-specific/](docs/contract-specific/)** — Per-contract reference (AssetRegistry, LeaseFactory, Marketplace, etc.)
