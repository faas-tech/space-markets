# Audit: Cross-Cutting Concerns — Space Markets

**Date:** 2026-03-11
**Branch:** `202603-audit`
**Reviewer:** Daneel (Claude Opus)
**Scope:** Contract interaction boundary, x402 end-to-end, deployment readiness, security posture

---

## 1. Contract Interaction Boundary

### 1.1 ABI Usage
- Offchain `ContractManager` reads ABI artifacts from `out/` (Foundry build output)
- ABIs are loaded at runtime via `readFileSync` — not hardcoded ✅
- **Risk:** If `forge build` output changes (compiler version, optimizer settings), ABIs could drift from deployed contracts. No ABI versioning or checksum verification.

### 1.2 Type Parity

| Concern | Status | Detail |
|---------|--------|--------|
| EIP-712 struct encoding | ✅ Correct | Manual `abi.encode` matches Solidity patterns (verified by crypto-hash tests) |
| LeaseAgreement type | ⚠️ Inconsistent | TypeScript type in `types/index.ts` doesn't match `types/lease.ts` `LeaseIntentData` struct |
| Event parsing | ✅ Standard | Uses ethers.js `Interface.parseLog()` with ABI — standard and reliable |
| Error handling | ⚠️ Partial | Contract revert reasons are caught but not mapped to typed errors |

### 1.3 EIP-712 Signature Chain

The signature flow is the most security-critical cross-cutting concern:

```
TypeScript (eip712.ts)                    Solidity (LeaseFactory.sol)
─────────────────────                     ──────────────────────────
1. Build LEASE_TYPEHASH (keccak256)   →   Must match LEASE_TYPEHASH constant
2. Encode lease struct (abi.encode)   →   Must match abi.encode layout
3. Hash to leaseHash (keccak256)      →   Must match leaseHash
4. Build LEASEINTENT_TYPEHASH         →   Must match LEASEINTENT_TYPEHASH
5. Encode intent + leaseHash          →   Must match struct hash
6. Build domain separator             →   Must match domain separator
7. Final: keccak256(0x1901 ‖ DS ‖ SH) →   Must match _digest()
8. Sign with wallet.signingKey.sign() →   ecrecover in Solidity
```

**Assessment:** The TypeScript implementation is **well-documented and appears correct** based on:
- Type hash strings match what the Solidity contract comments describe
- `AbiCoder.defaultAbiCoder().encode()` produces the same encoding as Solidity's `abi.encode`
- `0x1901` prefix is correctly applied
- `signingKey.sign()` (not `signMessage()`) avoids the Ethereum message prefix

**Gap:** There is no automated end-to-end test that verifies a TypeScript-signed message is accepted by the deployed contract. The `eip712-verification.ts` file exists in `tests/` but is not a Vitest test and is not run as part of the test suite. This is the single most important missing test.

---

## 2. X402 End-to-End Flow

### 2.1 Two Separate X402 Implementations

There are **two independent x402 implementations** that do not share code:

| Layer | Location | Purpose | Maturity |
|-------|----------|---------|----------|
| Offchain toolkit | `test/offchain/src/x402/` | Full x402 V2 with facilitator integration | 🟡 Solid for testing |
| Frontend API route | `frontend/src/app/api/leases/[id]/access/route.ts` | Next.js API endpoint | 🔴 Fully mocked |

**These two implementations will diverge** as the product matures. The frontend API route needs to either:
1. Call the offchain x402 service as a backend, or
2. Be rewritten to use `@x402/paywall` middleware directly

### 2.2 Payment Verification Gap

The critical path for x402 payment is:

```
Client sends Payment-Signature header
→ Server receives and decodes
→ Server calls facilitator.verify()
→ Facilitator checks on-chain payment
→ Server grants access
```

**Current state:**
- Offchain server: Calls `facilitator.verify()` and `facilitator.settle()` ✅ (mock in dev, real in prod)
- Frontend API route: Just parses base64 JSON ❌ — no verification at all

**Risk:** If the frontend route is deployed as-is, any client can forge a payment header and get free access.

### 2.3 Payment Header Format

The x402 V2 spec expects `Payment-Signature` to contain a **cryptographically signed payment proof** (EIP-191 or EIP-712 signature over payment details). Current implementation uses **base64-encoded JSON** — not cryptographically signed.

This works with the mock facilitator but will fail with the real Coinbase facilitator.

### 2.4 Failure Modes Not Handled

| Failure | Expected Behavior | Current Behavior |
|---------|-------------------|------------------|
| Facilitator unreachable | Retry with backoff, then fail gracefully | Throws unhandled error |
| Payment insufficient | Return 402 with updated requirements | Not implemented |
| Double payment | Idempotency check | No deduplication |
| Session expired mid-stream | Re-authenticate | Stream continues with stale session |
| Network switch during stream | Detect and stop | Stream continues on wrong network |

---

## 3. Deployment Readiness

### 3.1 Environment Configuration

| Requirement | Status | Notes |
|-------------|--------|-------|
| Env vars documented | ✅ | `PRODUCTION_DEPLOYMENT_GUIDE.md` has comprehensive list |
| Config loader exists | ✅ | `config/index.ts` with defaults |
| Secret management | ⚠️ | Private keys loaded from env vars — no vault integration |
| Chain-specific config | ⚠️ | Base Sepolia chain ID (84532) hardcoded in some places, env var in others |
| USDC address | ❌ | Hardcoded in frontend, env var in offchain — inconsistent |

### 3.2 Production Blockers

| # | Blocker | Category | Effort |
|---|---------|----------|--------|
| PB1 | wagmi only configured for Foundry chain | Frontend | S (1-2h) |
| PB2 | X402 API route fully mocked | Frontend | M (4-8h) |
| PB3 | No PostgreSQL implementation of Database interface | Backend | L (1-2d) |
| PB4 | No Redis implementation of Cache | Backend | M (4-8h) |
| PB5 | No real X402 facilitator integration tested | Integration | M (4-8h) |
| PB6 | USDC decimal bug in lease/revenue services | Backend | S (1-2h) |
| PB7 | No authentication on API | Backend | M (4-8h) |
| PB8 | No monitoring/alerting | Operations | L (1-2d) |

### 3.3 Monitoring & Operations
- No health check beyond basic `/health` endpoint
- No structured logging (only console.log)
- No metrics collection (Prometheus, DataDog, etc.)
- No error tracking (Sentry, etc.)
- No deployment pipeline (CI/CD)
- No rollback strategy documented

---

## 4. Security Posture

### 4.1 Supply Chain

| Check | Status |
|-------|--------|
| Lock files committed | ✅ `package-lock.json` in both packages |
| No known critical vulnerabilities | ⚠️ 12 moderate in frontend (next@15.2.0) |
| Dependencies from trusted sources | ✅ All from npm registry |
| Submodules pinned to commits | ✅ OpenZeppelin and forge-std pinned |

### 4.2 Secret Management

| Check | Status |
|-------|--------|
| No real secrets in source | ✅ Only Anvil default keys (public) |
| `.env` gitignored | ✅ |
| `.env.example` exists | ✅ |
| Private key logging | ⚠️ `BlockchainClient.connect()` logs address but not key — safe |
| API responses don't leak internals | ⚠️ Error handler returns generic message but `console.error` logs full stack |

### 4.3 Input Validation

| Surface | Validated | Risk |
|---------|-----------|------|
| API POST /api/assets | ❌ No | Arbitrary data stored |
| API POST /api/leases | ❌ No | Arbitrary data stored |
| API POST /api/leases/:id/access | ⚠️ Partial | Payment header parsed but not verified |
| Frontend forms | ⚠️ HTML5 only | No server-side validation |

### 4.4 Access Control

| Surface | Auth | Risk |
|---------|------|------|
| Offchain API (all endpoints) | ❌ None | Full API open to anyone on network |
| Frontend API routes | ❌ None | Only x402 payment gating on access endpoint |
| Database | N/A | Mock — no auth surface |
| Blockchain | ✅ | Wallet signatures required for all on-chain operations |

---

## 5. Recommendations

### Critical (Fix Before Deployment)
1. **Unify x402 implementation** — single payment verification path shared between offchain and frontend
2. **Fix USDC decimal handling** — `formatEther` → `formatUnits(x, 6)` everywhere
3. **Add real chain configuration** — wagmi + offchain config for Base Sepolia
4. **Implement PostgreSQL Database** — replace MockDatabase for any persistent deployment
5. **Add API authentication** — API keys at minimum

### High Priority
6. **Implement real payment header signing** — base64 JSON → EIP-191/712 signed payload
7. **Add input validation** — Zod schemas on all API endpoints
8. **Add structured logging** — Replace console.log with pino
9. **Add error tracking** — Sentry or equivalent

### Medium Priority
10. **Add EIP-712 end-to-end verification test** — TypeScript signature → contract recovery
11. **Handle x402 failure modes** — retry, deduplication, session management
12. **Add monitoring** — health checks, metrics, alerting
13. **Resolve LeaseAgreement type inconsistency** — single canonical type

---

*Cross-cutting review complete. Proceeding to Phase 6 (Fix List & Roadmap).*
