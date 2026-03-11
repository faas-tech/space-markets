# Audit: Offchain Toolkit — Space Markets

**Date:** 2026-03-11
**Branch:** `202603-audit`
**Reviewer:** Daneel (Claude Opus)
**Scope:** `test/offchain/src/` — services, API, x402, storage, crypto, core

---

## 1. Architecture & Code Quality

### 1.1 Overall Assessment
The offchain toolkit is well-structured with clear separation of concerns: core (blockchain interaction), services (business logic), storage (data layer), x402 (payment protocol), and utils (crypto/EIP-712). Code is heavily documented with JSDoc and usage examples. TypeScript strictness is generally good.

### 1.2 Findings

| # | Finding | Severity | Location |
|---|---------|----------|----------|
| O1 | **USDC decimal mismatch — `formatEther` used for USDC amounts** | 🔴 Critical | `revenue-service.ts:47`, `lease-service.ts:72,75` |
| O2 | **No input validation on API endpoints** | 🔴 Critical | `server.ts` — all routes accept arbitrary JSON |
| O3 | **No authentication on API server** | 🟠 High | `server.ts` — entire API is open |
| O4 | **No rate limiting** | 🟠 High | `server.ts` — no request throttling |
| O5 | **CORS hardcoded to localhost** | 🟠 High | `server.ts:110` — only `localhost:3000` and `:5173` |
| O6 | **getBids() uses unbounded while(true) loop** | 🟠 High | `marketplace-service.ts:218-234` — relies on exception for termination |
| O7 | **X402 sessions stored in-memory** | 🟠 High | `facilitator-client.ts:61` — sessions lost on restart |
| O8 | **LeaseAgreement type used inconsistently** | 🟡 Medium | Different shapes in `types/index.ts` vs `types/lease.ts` vs test fixtures |
| O9 | **Error hierarchy underutilized** | 🟡 Medium | `errors.ts` defines rich hierarchy; services mostly throw generic Error |
| O10 | **Console.log throughout production code** | 🟡 Medium | All services use `console.log` for operational output |
| O11 | **No graceful shutdown in API server** | 🟡 Medium | `server.ts` — no signal handling, no connection draining |
| O12 | **`getOffers()` returns empty array** | 🟡 Medium | `marketplace-service.ts:205` — placeholder with TODO comment |
| O13 | **`weiToUsdcMinorUnits` assumes 1:1 value parity** | 🟡 Medium | `amounts.ts:8-10` — converts by decimal factor only, no price oracle |
| O14 | **AnvilManager has no port conflict detection** | 🟢 Low | `anvil-manager.ts` — starts on specified port, doesn't check availability |
| O15 | **`generateDocumentId` uses Math.random()** | 🟢 Low | `crypto.ts:103` — not cryptographically random for ID generation |

---

## 2. Service Layer Deep Dive

### 2.1 AssetService
- Clean implementation, proper metadata hash generation
- Registers assets on-chain via `BlockchainClient.submitTransaction()`
- Stores results in database after successful chain transaction
- **Gap:** No validation that asset types exist before registration attempt

### 2.2 LeaseService
- **🔴 Critical (O1):** Uses `ethers.formatEther()` (18 decimals) for USDC amounts that should use `ethers.formatUnits(amount, 6)` (6 decimals). This means all stored lease amounts are wrong by a factor of 10^12.
  - `lease-service.ts:72` — `rentAmount: ethers.formatEther(rentAmount)`
  - `lease-service.ts:75` — `securityDeposit: ethers.formatEther(securityDeposit)`
  - `activateLease()` correctly uses `formatUnits(x, 6)` — inconsistency within the same service
- **Gap:** No lease expiration monitoring or auto-termination

### 2.3 MarketplaceService
- EIP-712 signature flow is well-implemented
- Proper address validation (lessee/lessor match check)
- `setLeaseService()` pattern avoids circular dependency — good
- **Issue (O6):** `getBids()` uses `while(true)` with bare `catch {}` to enumerate bids. This silently swallows all errors (including network failures) and treats them as "no more bids." Should use a bounded loop or query bid count first.
- **Issue (O12):** `getOffers()` returns `[]` — dead code

### 2.4 RevenueService
- **🔴 Critical (O1):** `claimRevenue()` at line 47 uses `ethers.formatEther(claimEvent.args.share)` for what is presumably a USDC amount. If the contract returns USDC (6 decimals), this gives the wrong display value.
- Minimal implementation — only claim + query, no distribution tracking

---

## 3. X402 Integration

### 3.1 X402PaymentService
- Quote building is well-structured with proper CAIP-2 chain IDs
- Remainder calculation for non-divisible hourly rates is handled correctly
- Warning generated when remainder exists — good UX
- **Issue (O13):** `weiToUsdcMinorUnits()` does a pure decimal conversion (`weiAmount * 10^6 / 10^18`). This treats 1 wei of payment token as equivalent to 1 micro-USDC in value. This is only correct if the payment token IS USDC stored in wei format. If the contract uses a different payment token (ETH, WETH), this calculation is wrong.

### 3.2 X402FacilitatorClient
- Mock facilitator path works correctly for testing
- V2 request body format (`x402Version: 2`) is correct
- Session management (V2 feature) implemented but:
  - **Issue (O7):** Sessions stored in-memory `Map<string, X402Session>`. On process restart, all sessions vanish. Production needs persistent storage.
  - No session invalidation endpoint
  - No session usage tracking / spending limits enforcement

### 3.3 Amounts & Constants
- `perSecondAmount()` and `perFiveSecondAmount()` are mathematically correct
- `formatUsdcMinorUnits()` handles negative values and trailing zeros
- `USDC_DECIMAL_FACTOR` correctly set to `10^6`
- **Note:** The function that calls these (`getHourlyMinorUnits`) references `lease.agreement.terms.paymentAmount` which doesn't exist on the `LeaseAgreement` type defined in `types/index.ts`. This works only because TypeScript treats it as `any` or the test fixtures use a different shape.

### 3.4 X402 V2 Compliance
- Uses `Payment-Signature` header (V2) with `X-PAYMENT` fallback (V1 compat) ✅
- Request body includes `x402Version: 2` ✅
- `paymentRequirements` includes `version: 2` and `chainId` (CAIP-2) ✅
- Missing: `Payment-Signature` header should be the EIP-191/EIP-712 signed payload per x402 V2 spec, but current implementation is base64-encoded JSON — not cryptographically signed

---

## 4. API Server

### 4.1 Security Issues

| # | Issue | Severity | Detail |
|---|-------|----------|--------|
| O2 | No input validation | 🔴 Critical | `POST /api/assets` accepts any JSON body and passes it directly to `saveAsset()`. No Zod schemas, no sanitization. |
| O3 | No authentication | 🟠 High | All endpoints are public. No API keys, no JWT, no session auth. |
| O4 | No rate limiting | 🟠 High | No `express-rate-limit` or equivalent. Any client can flood the API. |
| O5 | CORS too restrictive for production | 🟠 High | Hardcoded to `localhost:3000` and `localhost:5173`. Won't work in any deployed environment. |

### 4.2 API ↔ Spec Drift
The `docs/API_SPECIFICATION.md` describes endpoints that generally match the implementation, but:
- Some response field names differ (spec shows `count`, implementation uses `count` — matches ✅)
- X402 access endpoint spec matches frontend implementation, not offchain server
- No versioning in URL paths (no `/v1/` prefix)
- Error response format inconsistent — some routes return `{ error: "..." }`, others return `{ success: false, error: "..." }`

### 4.3 DatabaseLike Interface Smell
The `server.ts` defines its own `DatabaseLike` interface with optional methods (`getAllAssets?`, `getDatabaseAssets?`, etc.) to accommodate multiple database interface shapes. This suggests the `Database` interface has evolved without updating all consumers. The adapter pattern should be formalized.

---

## 5. Storage Layer

### 5.1 MockDatabase Assessment
- Implements full `Database` interface — good parity for testing
- In-memory Maps provide correct key-value semantics
- **Gap:** No uniqueness constraints — `saveLease()` with duplicate `leaseId` silently overwrites
- **Gap:** No foreign key validation — can save a lease for a non-existent asset
- **Gap:** `clear()` resets `nextId` to 1 — could cause ID collisions in tests that don't fully reset

### 5.2 PostgreSQL Migration Readiness
The `Database` interface is clean enough for PostgreSQL implementation. Missing:
- Transaction support (atomic multi-table operations)
- Pagination (all `getAll*` methods return everything)
- Indexes specification (which fields need indexes)
- Migration versioning strategy
- Connection pooling configuration

---

## 6. EIP-712 & Crypto

### 6.1 EIP-712 Implementation
- **Manual encoding is correct and well-documented.** The comment block explains exactly why manual encoding is needed (ethers.js TypedDataEncoder handles nested structs differently than Solidity's `abi.encode`).
- Type hashes match Solidity definitions
- Domain separator construction is standard
- `signLeaseIntent()` correctly uses `wallet.signingKey.sign(digest)` instead of `signMessage()` (which would add the Ethereum prefix)
- `calculateLeaseIntentDigest()` correctly prepends `\x19\x01`

### 6.2 Crypto Utilities
- SHA-256 hashing with deterministic key sorting — **correctly fixed** (tests verify this)
- Merkle root implementation is simplistic but functional
- `generateRequiredLeaseKeys()` uses SHA-256 but contracts likely expect keccak256 — **potential mismatch** (would need contract source to verify, out of scope)
- `isValidHash()` and `isValidEthereumAddress()` regex validators are correct

### 6.3 Test Coverage
- `crypto-hash.test.ts` — 7 tests, all pass, good coverage of determinism edge cases
- `x402-streaming.test.ts` — 1 test, passes, covers full payment flow with mock facilitator
- **Gap:** No negative test cases (malformed inputs, invalid hashes, wrong signatures)
- **Gap:** No boundary tests (empty objects, very large objects, special characters)
- **Gap:** EIP-712 digest calculation not verified against known test vectors

---

## 7. Test Quality Assessment

| Metric | Status | Notes |
|--------|--------|-------|
| Isolation | ⚠️ Partial | Tests sharing Anvil instances may have ordering dependencies |
| Coverage | ⚠️ Low | 76% of tests require Anvil; only crypto + x402 unit tests run without it |
| Negative cases | ❌ Missing | No tests for invalid inputs, error paths, or edge cases |
| Mock fidelity | ⚠️ Partial | MockDatabase lacks constraints that real DB would enforce |
| Flakiness | ✅ Good | Passing tests are deterministic |
| Documentation | ✅ Good | Tests have clear descriptions and step-by-step narration |

---

## 8. Recommendations (Priority Order)

1. **Fix USDC decimal handling** — Replace all `formatEther` with `formatUnits(x, 6)` for USDC amounts. This is a data corruption issue.
2. **Add API input validation** — Implement Zod schemas for all POST/PUT endpoints.
3. **Add API authentication** — At minimum, API key auth for non-public endpoints.
4. **Add rate limiting** — `express-rate-limit` with sensible defaults.
5. **Make CORS configurable** — Move to environment variable or config file.
6. **Fix getBids() enumeration** — Replace unbounded `while(true)` with contract query for bid count.
7. **Resolve LeaseAgreement type inconsistency** — Single canonical type, used everywhere.
8. **Replace console.log with structured logger** — `pino` or `winston` with log levels.
9. **Add graceful shutdown** — SIGTERM/SIGINT handling with connection draining.
10. **Persist X402 sessions** — Move from in-memory Map to database.

---

*Offchain review complete. Proceeding to Phase 3 (Frontend Review).*
