<!-- See AGENTS.md for full project context, repository map, and domain glossary -->

# CLAUDE.md — Space Markets

## Critical Constraint: Smart Contracts Are Locked

**NEVER modify any file in these paths:**
- `src/*.sol` — all Solidity contracts
- `test/component/` — Solidity component tests
- `test/integration/` — Solidity integration tests
- `script/*.s.sol` — deployment scripts

These contracts are audited and frozen. All active development happens in `test/offchain/` and `frontend/`.

## Quick Commands

```bash
# Solidity (from repo root)
forge build
forge test
forge test --match-path "test/component/*.sol"
forge coverage

# Offchain (from test/offchain/)
npm test
npm run demo:complete          # Full 12-step protocol demo
npm run demo:x402              # X402 streaming demo
npm run demo:simple            # Simple workflow

# Frontend (from frontend/)
npm run dev                    # Dev server
npm run build                  # Production build
```

## Architecture at a Glance

**Three layers:**
1. **Smart Contracts** (Solidity 0.8.30) — UUPS upgradeable, EIP-712 signatures, on-chain state
2. **Offchain Toolkit** (TypeScript) — Express API, services, MockDatabase, X402 payments
3. **Frontend** (Next.js 14) — React 18, Tailwind, wagmi v2, RainbowKit, protocol demo

**Key services** (TypeScript classes in `test/offchain/src/`):
- `AssetService` — asset registration and metadata
- `LeaseService` — lease offer creation
- `MarketplaceService` — EIP-712 bidding and offer acceptance
- `RevenueService` — proportional revenue distribution
- `BlockchainClient` — ethers.js v6 contract interaction
- `EventProcessor` — real-time event monitoring with reorg protection
- `X402PaymentService` — per-second/batch payment calculation
- `X402FacilitatorClient` — Coinbase facilitator integration

## Code Quality Rules

- **Zero `any`** in production TypeScript code. Use proper types or `unknown`.
- **Always add tests** for new functionality. Offchain uses Vitest; frontend uses Next.js conventions.
- **Use existing patterns.** New services should follow the structure in `test/offchain/src/services/`.
- **Use the error hierarchy** in `test/offchain/src/errors.ts` for custom errors.
- **Run tests before finishing.** Both `forge test` and `cd test/offchain && npm test`.

## Gotchas

### EIP-712 Nested Struct Encoding
ethers.js `TypedDataEncoder` produces invalid signatures for Solidity's nested struct encoding (LeaseIntent contains a nested Lease struct). The codebase uses manual `AbiCoder.encode()` in `test/offchain/src/utils/crypto.ts`. **Do not refactor this to use the ethers.js built-in encoder** — it will silently break on-chain signature verification.

### ERC20Votes Checkpoint Timing
After token transfers, you must advance the block before querying checkpointed balances:
```solidity
token.transfer(bob, amount);
vm.roll(block.number + 1);  // Required before checkpoint queries
```

### X402 V2 Headers
The protocol uses `Payment-Signature` header (V2), not the deprecated `X-PAYMENT`. Chain IDs are CAIP-2 format: `eip155:84532` (Base Sepolia), `eip155:8453` (Base Mainnet). The `@coinbase/x402` package must be ^2.1.0.

### Frontend SSR
RainbowKit/wagmi require `localStorage` which is unavailable during SSR. The `providers.tsx` file handles this with dynamic imports. If adding new Web3 providers, follow the same pattern.

## Testing Philosophy

- **Genuine validation over false confidence.** Tests must verify actual correctness, not just that code runs.
- **Sabotage test:** Break the implementation — does the test fail? If not, it's not testing anything.
- **No circular validation:** Don't use the same system to both set and verify state.
- **No existence-only checks:** Verify data correctness, not just that a response was returned.

### Test Quality Gates

Before marking any test as complete:
1. Sabotage the implementation — does the test catch it?
2. Verify actual data values, not just response shapes
3. Confirm no circular validation patterns
4. Validate business logic, not framework behavior

## Documentation

When modifying functionality, check if these docs need updating:

| What changed | Update this doc |
|-------------|----------------|
| API endpoints | `docs/API_SPECIFICATION.md` |
| Service behavior | `docs/offchain-systems.md` |
| Frontend components | `docs/FRONTEND_DESIGN.md` |
| X402 payment flow | `docs/x402-implementation/x402-explainer.md` |
| Database schema | `docs/DATABASE_MIGRATION_GUIDE.md` |
| Deployment process | `docs/PRODUCTION_DEPLOYMENT_GUIDE.md` |

## Git Workflow

- Branch from `main` with descriptive names: `feat/`, `fix/`, `refactor/`, `docs/`
- Conventional commit messages: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`
- Run tests before committing
- Never force push to `main`
