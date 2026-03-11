# Audit Baseline — Space Markets

**Date:** 2026-03-11
**Branch:** `202603-audit`
**Reviewer:** Daneel (Claude Opus)

---

## 1. Build Status

### Offchain Toolkit (`test/offchain/`)
- **`npm install`**: ✅ Clean install, 0 vulnerabilities
- **`npm audit`**: 0 vulnerabilities found
- **`npx vitest run`**: ⚠️ Partial — 10 tests pass, 1 fails, 35 skipped

### Frontend (`frontend/`)
- **`npm install`**: ✅ Clean install
- **`npm audit`**: ⚠️ 12 moderate vulnerabilities (all traced to `next@15.2.0`)
- **`npm run build`**: ✅ Build succeeds
  - 12 pages compiled
  - Next.js 15 dynamic API warnings (non-blocking)

---

## 2. Test Results

### Offchain Vitest Results

| Suite | Tests | Pass | Fail | Skip | Notes |
|-------|-------|------|------|------|-------|
| `crypto-hash.test.ts` | 7 | 7 | 0 | 0 | All determinism tests pass |
| `x402-streaming.test.ts` | 1 | 1 | 0 | 0 | Mock facilitator flow works |
| `api-integration.test.ts` | 2 | 0 | 1 | 1 | `url.clone is not a function` — ethers.js compat issue |
| `enhanced-flow.test.ts` | 12 | 0 | 0 | 12 | Requires Anvil (not installed) |
| `integration.test.ts` | 12 | 0 | 0 | 12 | Requires Anvil (not installed) |
| `simple.test.ts` | 12 | 0 | 0 | 12 | Requires Anvil (not installed) |
| **Total** | **46** | **10** | **1** | **35** | |

**Key Issue:** 35 tests (76%) require Anvil (Foundry) which is not installed on this host. The `api-integration.test.ts` failure is a runtime compatibility issue, not a logic error.

### Frontend Build
- All 12 pages compile successfully
- No TypeScript errors
- Dynamic API warnings from Next.js 15 (params now async — cosmetic)

---

## 3. Dependency Versions

### Offchain (`test/offchain/package.json`)

| Package | Version | Latest | Status |
|---------|---------|--------|--------|
| `@coinbase/x402` | `^2.1.0` | Needs check | Range-pinned |
| `ethers` | `^6.13.5` | Current | Range-pinned |
| `express` | `^4.21.2` | Current | Range-pinned |
| `cors` | `^2.8.5` | Current | Range-pinned |
| `node-fetch` | `^3.3.2` | Current | Range-pinned |
| `vitest` | `^3.0.5` | Current | Dev dep |

### Frontend (`frontend/package.json`)

| Package | Version | Notes |
|---------|---------|-------|
| `next` | `15.2.0` | 12 moderate vulns from npm audit |
| `react` / `react-dom` | `19.0.0` | Current |
| `wagmi` | Needs check | Via RainbowKit |
| `@rainbow-me/rainbowkit` | Needs check | Wallet connection |
| `ethers` | `^6.x` | For signer adapter |
| `tailwindcss` | `^4.0.5` | Tailwind v4 |

---

## 4. Repo Hygiene Issues

| # | Issue | Severity | Location |
|---|-------|----------|----------|
| H1 | **Debug artifact tracked in git** | 🟡 Medium | `test-hash.ts` in repo root — hardcoded Anvil address, test script |
| H2 | **Nested empty directories** | 🟢 Low | `frontend/frontend/frontend/package-lock.json` — accidental create-next-app |
| H3 | **`.DS_Store` tracked** | 🟢 Low | Root `.DS_Store` in git |
| H4 | **Hardcoded Anvil private key** | ℹ️ Info | `anvil-manager.ts:278` — standard Anvil account #0 key, not a real secret |
| H5 | **Placeholder WalletConnect projectId** | 🟡 Medium | `wagmi.ts` — `'00000000000000000000000000000000'` fallback |
| H6 | **Hardcoded Anvil addresses in frontend API** | 🟠 High | `api/leases/[id]/access/route.ts` — hardcoded `0xf39Fd6...` and local USDC address |
| H7 | **`eip712-verification.ts` not a test** | 🟢 Low | In `tests/` dir but has no test runner integration |

---

## 5. Secret Scan

- No real private keys found in source (Anvil #0 key is public/well-known)
- No API keys in source
- `.env` files properly gitignored
- `script/.env.example` exists with placeholder format

---

*Baseline complete. Proceeding to Phase 2 (Offchain Review).*
