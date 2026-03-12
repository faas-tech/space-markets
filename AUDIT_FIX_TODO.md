# Space Markets Audit Fixes - TODO List

**Branch:** `202603-audit-fixes`
**Started:** 2026-03-11

---

## PHASE 1: Critical Fixes (Payment System Broken)

### TODO-1: Fix `terms` field type mismatch — payments are $0
- [ ] **Location:** `test/offchain/src/services/lease-service.ts`
- **Issue:** `terms: 'Standard lease terms'` (string) but `payment-service.ts` accesses `terms.paymentAmount` (object)
- **Fix:** Change to `terms: { paymentAmount: rentAmount.toString() }`
- **Status:** ⏳ PENDING

### TODO-2: Fix USDC decimal handling in `createLeaseOffer()`
- [ ] **Location:** `test/offchain/src/services/lease-service.ts`
- **Issue:** `ethers.formatEther()` (18 decimals) instead of `ethers.formatUnits(..., 6)` (6 decimals for USDC)
- **Fix:** Change lines using formatEther to formatUnits(rentAmount, 6)
- **Status:** ⏳ PENDING

### TODO-3: Fix USDC decimal handling in `revenue-service.ts`
- [ ] **Location:** `test/offchain/src/services/revenue-service.ts`
- **Issue:** `ethers.formatEther()` used in `claimRevenue()` and `getClaimableAmount()`
- **Fix:** Change to `ethers.formatUnits(..., 6)`
- **Status:** ⏳ PENDING

### TODO-4: Fix `payment-service.ts` to handle new terms structure
- [ ] **Location:** `test/offchain/src/x402/payment-service.ts`
- **Issue:** `getHourlyMinorUnits()` assumes `terms.paymentAmount` exists
- **Fix:** Handle both old string format (for backward compat) and new object format
- **Status:** ⏳ PENDING

---

## PHASE 2: Configuration & Security

### TODO-5: Fix config to disable mock facilitator by default
- [ ] **Location:** `test/offchain/src/config/index.ts`
- **Issue:** `useMockFacilitator: true` by default (production footgun)
- **Fix:** Change to `false` as default, only enable in dev
- **Status:** ⏳ PENDING

### TODO-6: Add production config validation to getConfig()
- [ ] **Location:** `test/offchain/src/config/index.ts`
- **Issue:** No validation that production has required env vars
- **Fix:** Add env var validation, throw if PRIVATE_KEY is Anvil default in production
- **Status:** ⏳ PENDING

### TODO-7: Add fetch timeouts to facilitator client
- [ ] **Location:** `test/offchain/src/x402/facilitator-client.ts`
- **Issue:** No timeout on fetch calls — DoS vector
- **Fix:** Add AbortController with 15s timeout
- **Status:** ⏳ PENDING

### TODO-8: Fix LeaseData type to remove unsafe `number` type
- [ ] **Location:** `test/offchain/src/types/lease.ts`
- **Issue:** `rentAmount: bigint | string | number` — number can't hold uint256 safely
- **Fix:** Remove `number` from union type
- **Status:** ⏳ PENDING

---

## PHASE 3: Frontend Fixes

### TODO-9: Add Base Sepolia and Base Mainnet to wagmi config
- [ ] **Location:** `frontend/src/wagmi.ts`
- **Issue:** Only `foundry` chain configured — real users can't connect
- **Fix:** Add `baseSepolia`, `base`, and conditionally `foundry` for dev
- **Status:** ⏳ PENDING

### TODO-10: Add security headers to next.config.mjs
- [ ] **Location:** `frontend/next.config.mjs`
- **Issue:** No CSP, X-Frame-Options, etc.
- **Fix:** Add complete security headers config
- **Status:** ⏳ PENDING

### TODO-11: Fix unsafe connectors[0] access in useWallet.ts
- [ ] **Location:** `frontend/src/hooks/useWallet.ts`
- **Issue:** `connectors[0]` crashes if empty
- **Fix:** Add length check with error handling
- **Status:** ⏳ PENDING

### TODO-12: Fix hardcoded addresses in frontend x402 route
- [ ] **Location:** `frontend/src/app/api/leases/[id]/access/route.ts`
- **Issue:** Hardcoded Anvil addresses
- **Fix:** Read from environment variables
- **Status:** ⏳ PENDING

---

## PHASE 4: API Server Fixes

### TODO-13: Add input validation to API routes
- [ ] **Location:** `test/offchain/src/api/server.ts` or route files
- **Issue:** No input validation — accepts arbitrary JSON
- **Fix:** Add Zod schema validation
- **Status:** ⏳ PENDING

### TODO-14: Fix CORS configuration
- [ ] **Location:** `test/offchain/src/api/server.ts`
- **Issue:** Hardcoded to localhost
- **Fix:** Make CORS configurable via env var
- **Status:** ⏳ PENDING

---

## PHASE 5: Repository Cleanup

### TODO-15: Remove nested frontend package-lock.json
- [ ] **Location:** `frontend/frontend/frontend/package-lock.json`
- **Issue:** Nested duplicate directory
- **Fix:** Remove the entire nested directory
- **Status:** ⏳ PENDING

### TODO-16: Remove debug artifact test-hash.ts
- [ ] **Location:** `test-hash.ts` in repo root
- **Issue:** Debug artifact
- **Fix:** Remove file
- **Status:** ⏳ PENDING

---

## PHASE 6: Testing & Validation

### TODO-17: Run offchain tests
- [ ] **Command:** `cd test/offchain && npm test` or `pnpm test`
- **Expected:** Tests pass (excluding Solidity contract tests)
- **Status:** ⏳ PENDING

### TODO-18: Run demo scripts
- [ ] **Command:** `cd test/offchain && pnpm demo` or similar
- **Expected:** Demo scripts execute without errors
- **Status:** ⏳ PENDING

### TODO-19: Build frontend
- [ ] **Command:** `cd frontend && pnpm build`
- **Expected:** Build succeeds
- **Status:** ⏳ PENDING

---

## Completion Checklist

- [ ] All TODO items completed
- [ ] Tests pass
- [ ] Demo scripts run
- [ ] Frontend builds
- [ ] Executive summary sent

---

## Notes

- **No Solidity changes** — contracts are out of scope, managed externally
- **Scope:** Offchain toolkit + Frontend only
- **Validation:** All changes tested iteratively