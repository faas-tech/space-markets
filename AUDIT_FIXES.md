# Audit: Prioritized Fix List & Roadmap — Space Markets

**Date:** 2026-03-11
**Branch:** `202603-audit`
**Reviewer:** Daneel (Claude Opus)
**Source:** Consolidated findings from AUDIT_BASELINE, AUDIT_OFFCHAIN, AUDIT_FRONTEND, AUDIT_DOCS, AUDIT_CROSSCUTTING

---

## Severity Legend

| Level | Definition | Action |
|-------|-----------|--------|
| 🔴 **Critical** | Security vulnerability, data corruption, or broken core functionality | Fix before any other work |
| 🟠 **High** | Significant bug, major UX issue, or production blocker | Fix in current sprint |
| 🟡 **Medium** | Code quality issue, minor bug, or documentation gap | Fix when touching related code |
| 🟢 **Low** | Nice-to-have improvement, optimization, or cosmetic issue | Backlog |
| ℹ️ **Info** | Observation, design consideration, or future planning note | Document for reference |

## Effort Scale

| Size | Hours | Description |
|------|-------|-------------|
| XS | <1h | Config change, one-liner fix |
| S | 1-4h | Single file change, well-scoped |
| M | 4-8h | Multi-file change, moderate complexity |
| L | 1-2d | New feature or significant refactor |
| XL | 2-5d | Architectural change or new system |

---

## 🔴 Critical Fixes (Fix First)

| # | Finding | Source | Location | Effort | Dependencies |
|---|---------|--------|----------|--------|-------------|
| C1 | **USDC decimal mismatch** — `formatEther` (18 dec) used for USDC (6 dec). All stored lease amounts are wrong by 10^12. | O1 | `lease-service.ts:72,75`, `revenue-service.ts:47` | S | None |
| C2 | **Frontend x402 API route fully mocked** — base64 JSON parse, no signature verification, hardcoded Anvil addresses. Any client can forge access. | F2, F3 | `api/leases/[id]/access/route.ts` | M | C5 |
| C3 | **wagmi configured for Foundry chain only** — no Base Sepolia or Mainnet. Production wallet connection is broken. | F1 | `wagmi.ts` | S | None |
| C4 | **No input validation on API endpoints** — arbitrary JSON passed directly to database. Injection/corruption risk. | O2 | `server.ts` (all POST/PUT routes) | M | None |
| C5 | **Two divergent x402 implementations** — offchain toolkit and frontend API route don't share code or verification logic. | CC | `test/offchain/src/x402/` vs `frontend/src/app/api/` | L | None |

---

## 🟠 High Priority Fixes

| # | Finding | Source | Location | Effort | Dependencies |
|---|---------|--------|----------|--------|-------------|
| H1 | **No API authentication** — entire offchain API is public. | O3 | `server.ts` | M | None |
| H2 | **No rate limiting** — API can be flooded. | O4 | `server.ts` | S | None |
| H3 | **CORS hardcoded to localhost** — won't work in any deployed environment. | O5 | `server.ts:110` | XS | None |
| H4 | **X402StreamingClient uses mock tx hashes in production path** — real facilitator will reject. | F4 | `streamingPayment.ts:107` | S | C5 |
| H5 | **No React error boundaries** — unhandled errors crash entire app. | F5 | Component tree | S | None |
| H6 | **No security headers in Next.js** — no CSP, HSTS, X-Frame-Options. | F7 | `next.config.mjs` | S | None |
| H7 | **Homepage uses hardcoded sample data** — misleading "156 assets" text, dead "Load More" button. | F6 | `page.tsx` | M | API integration |
| H8 | **getBids() unbounded while(true) loop** — silently swallows all errors including network failures. | O6 | `marketplace-service.ts:218-234` | S | None |
| H9 | **X402 sessions stored in-memory only** — lost on restart. | O7 | `facilitator-client.ts:61` | M | PostgreSQL impl |
| H10 | **Hardcoded Anvil address in frontend x402 route** — `payTo` field points to Anvil account #0. | F2 | `api/leases/[id]/access/route.ts` | XS | C2 |
| H11 | **Payment header not cryptographically signed** — base64 JSON instead of EIP-191/712 signature. Works with mock, fails with real facilitator. | CC | Both x402 implementations | M | C5 |
| H12 | **No EIP-712 end-to-end verification test** — signature chain never tested against contract recovery. | CC | `tests/` | M | Anvil |

---

## 🟡 Medium Priority Fixes

| # | Finding | Source | Location | Effort | Dependencies |
|---|---------|--------|----------|--------|-------------|
| M1 | **LeaseAgreement type used inconsistently** — different shapes in `types/index.ts`, `types/lease.ts`, and test fixtures. | O8 | Multiple files | M | None |
| M2 | **Error hierarchy underutilized** — services throw generic `Error` instead of typed errors. | O9 | All service files | M | None |
| M3 | **Console.log throughout production code** — needs structured logging. | O10 | All service files | M | None |
| M4 | **No graceful shutdown in API server** — no SIGTERM/SIGINT handling. | O11 | `server.ts` | S | None |
| M5 | **Custom window events for tab switching** — should use React state. | F8 | `page.tsx` | S | None |
| M6 | **WalletConnect projectId is placeholder** — needs real project ID for production. | F9 | `wagmi.ts` | XS | WalletConnect account |
| M7 | **Wallet connect() always uses first connector** — no selection, no error handling. | F10 | `useWallet.ts` | S | None |
| M8 | **No loading states for wallet operations** — no `isConnecting`, no error display. | F11 | `useWallet.ts` | S | None |
| M9 | **ethers-adapter lacks null checks** — crashes if client properties undefined. | F14 | `ethers-adapter.ts` | XS | None |
| M10 | **No form validation** — asset registration, bid, lease offer forms. | F | Form components | M | None |
| M11 | **MockDatabase lacks uniqueness constraints** — duplicate IDs silently overwrite. | O | `database.ts` | S | None |
| M12 | **No Suspense/loading boundaries** — no fallbacks for async operations. | F13 | Component tree | S | None |
| M13 | **offchain-systems.md is 82 KB** — should be split into per-service docs. | D2 | `docs/offchain-systems.md` | M | None |
| M14 | **Missing ADRs** — no architecture decision records. | G1 | `docs/` | M | None |
| M15 | **Missing security model document** — no threat model or trust boundaries. | G4 | `docs/` | M | None |
| M16 | **`weiToUsdcMinorUnits` assumes 1:1 value parity** — only correct if payment token is USDC in wei. | O13 | `amounts.ts:8-10` | S | None |
| M17 | **No `prefers-reduced-motion` support** — animations may cause issues for some users. | F | Demo components | S | None |
| M18 | **No test for negative/boundary cases** — only happy-path tests exist. | O | `tests/` | L | None |

---

## 🟢 Low Priority Fixes

| # | Finding | Source | Location | Effort | Dependencies |
|---|---------|--------|----------|--------|-------------|
| L1 | **`test-hash.ts` debug artifact in repo root** — should be deleted. | H1 | Root | XS | None |
| L2 | **`frontend/frontend/frontend/` nested empty dirs** — accidental. | H2 | Frontend | XS | None |
| L3 | **`.DS_Store` tracked in git** — should be removed and gitignored. | H3 | Root | XS | None |
| L4 | **`getOffers()` returns empty array** — dead code placeholder. | O12 | `marketplace-service.ts:205` | XS | None |
| L5 | **`generateDocumentId` uses Math.random()** — not crypto-secure. | O15 | `crypto.ts:103` | XS | None |
| L6 | **AnvilManager has no port conflict detection** — can fail silently. | O14 | `anvil-manager.ts` | S | None |
| L7 | **`eip712-verification.ts` not integrated into test suite** — sits in tests/ but doesn't run. | H7 | `tests/` | S | None |
| L8 | **QueryClient instantiated at module level** — fine for CSR but not SSR-ideal. | F12 | `wallet-providers.tsx` | XS | None |
| L9 | **Demo step components not lazy-loaded** — all 6,300 lines load on demo page. | F | Demo components | S | None |
| L10 | **ethers.js imported as full package** — tree-shaking could reduce bundle. | F | Multiple imports | M | None |
| L11 | **Frontend npm audit: 12 moderate vulns** — all from `next@15.2.0` dependency chain. | Baseline | `frontend/package.json` | S | Next.js update |
| L12 | **Missing Changelog** — no version history. | G3 | Root | S | None |
| L13 | **Missing Contributing Guide** — no contributor workflow. | G7 | Root | S | None |
| L14 | **Docs don't cross-reference each other** — no internal links. | D | All docs | S | None |

---

## Recommended Implementation Order

### Sprint 1: Critical & Security (Est. 3-4 days)

```
C1 → Fix USDC decimals (S)
C3 → Configure real chains in wagmi (S)  
C4 → Add Zod validation to API (M)
H1 → Add API authentication (M)
H2 → Add rate limiting (S)
H3 → Fix CORS configuration (XS)
H5 → Add React error boundaries (S)
H6 → Add security headers (S)
L1-L3 → Repo hygiene cleanup (XS)
```

### Sprint 2: X402 Unification (Est. 3-4 days)

```
C5 → Unify x402 implementations (L)
C2 → Rewrite frontend x402 route (M) — depends on C5
H4 → Fix mock tx hashes (S) — depends on C5
H10 → Move addresses to env vars (XS) — depends on C2
H11 → Implement real payment signing (M) — depends on C5
```

### Sprint 3: Type System & Code Quality (Est. 2-3 days)

```
M1 → Unify LeaseAgreement type (M)
M2 → Use typed errors throughout (M)
M3 → Replace console.log with structured logger (M)
M4 → Add graceful shutdown (S)
H8 → Fix getBids() loop (S)
M16 → Fix weiToUsdcMinorUnits assumptions (S)
```

### Sprint 4: Frontend Hardening (Est. 2-3 days)

```
M5-M9 → Wallet integration improvements (S each)
M10 → Form validation (M)
M12 → Loading/Suspense boundaries (S)
M17 → prefers-reduced-motion (S)
H7 → Connect homepage to API (M)
```

### Sprint 5: Documentation & Testing (Est. 2-3 days)

```
M13 → Split offchain-systems.md (M)
M14 → Create ADR directory (M)
M15 → Security model document (M)
H12 → EIP-712 e2e verification test (M)
M18 → Add negative/boundary test cases (L)
L7 → Integrate eip712-verification into test suite (S)
```

### Post-Sprint: Gemini 3.1 Pro Frontend Design Overhaul
After Sprints 1-4, Shaun runs the Gemini 3.1 Pro anti-gravity suite for the complete frontend design system upgrade, informed by the findings in AUDIT_FRONTEND.md.

---

## Summary Statistics

| Severity | Count | Est. Total Effort |
|----------|-------|------------------|
| 🔴 Critical | 5 | ~3-4 days |
| 🟠 High | 12 | ~4-5 days |
| 🟡 Medium | 18 | ~5-6 days |
| 🟢 Low | 14 | ~2-3 days |
| **Total** | **49** | **~14-18 days** |

---

*Fix list complete. All audit deliverables written. Ready for GPT 5.4 second review and executive summary.*
