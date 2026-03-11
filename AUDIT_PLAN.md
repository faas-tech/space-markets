# Space Markets — Offchain & Frontend Audit Plan

**Created:** 2026-03-11
**Author:** Daneel
**Repo:** `faas-tech/space-markets`
**Purpose:** Comprehensive dual-model audit of all offchain systems, frontend, documentation, and contract interaction points. Claude Opus performs the primary review; GPT 5.4 serves as a professional second reviewer across every phase — catching errors, filling gaps, improving code proposals, and adding what Opus missed.

---

## ⛔ OUT OF SCOPE — SMART CONTRACTS

**The Solidity smart contracts, their tests, and their deployment scripts are fully audited, frozen, and excluded from this audit. This is non-negotiable.**

The following directories and files WILL NOT be reviewed, modified, or included in any audit deliverable:

- `src/*.sol` — All Solidity source files
- `src/utils/` — Contract utilities (`BaseUpgradable.sol`)
- `src/libraries/` — Contract libraries (`Roles.sol`)
- `test/component/*.t.sol` — Component test suites
- `test/integration/*.t.sol` — Integration test suites
- `test/AssetCreationAndRegistration.t.sol` — Root-level Solidity test
- `script/*.s.sol` — Deployment scripts
- `script/config/` — Deployment configuration
- `lib/` — Git submodules (OpenZeppelin, forge-std)
- `foundry.toml` — Foundry compiler configuration

**No model, no reviewer, and no phase of this audit will read, analyze, critique, or propose changes to any on-chain contract code, Solidity test, or deployment script.**

The contracts are treated as a **fixed, opaque interface**. We audit the offchain systems that interact with them, but the contract surface itself is a closed boundary.

---

## ⛔ OUT OF SCOPE — FRONTEND DESIGN OVERHAUL

**Frontend design system improvements, visual overhaul, and UI polish are excluded from this audit.** Shaun will run the Gemini 3.1 Pro anti-gravity suite separately for a complete frontend design system upgrade. This audit reviews frontend code for **correctness, architecture, security, and performance** — not aesthetics or design language.

---

## Dual-Model Review Process

Every phase uses two models in sequence:

| Role | Model | Purpose |
|------|-------|---------|
| **Primary Reviewer** | Claude Opus | Initial deep review — architecture, security, correctness, test coverage |
| **Second Reviewer** | GPT 5.4 | Professional adversarial review — catch errors, identify missed opportunities, improve code proposals, add complements, challenge assumptions |

**GPT 5.4 is not a rubber stamp.** It receives the Opus findings plus the source code and is prompted to be highly additive: find what Opus missed, flag where Opus was wrong, strengthen weak recommendations, provide concrete code examples, and identify opportunities Opus didn't consider.

Disagreements between models are documented and escalated to Shaun with both positions.

---

## Audit Scope

| Layer | Files | LOC (approx) | In Scope |
|-------|-------|-------------|----------|
| Offchain toolkit | `test/offchain/src/` | ~3,000+ | ✅ YES |
| Offchain tests | `test/offchain/tests/` | ~1,500 | ✅ YES |
| Offchain demos | `test/offchain/demos/` | ~800 | ✅ YES |
| Frontend app | `frontend/src/` | ~14,000 | ✅ YES (code review, not design) |
| Documentation | `docs/` (9 files + subdirs) | ~150 KB | ✅ YES |
| Config/meta | `AGENTS.md`, `README.md`, `package.json` | ~500 | ✅ YES |
| Solidity contracts | `src/*.sol` | ~1,010 | ⛔ NO |
| Solidity tests | `test/component/` + `test/integration/` | ~3,750 | ⛔ NO |
| Deployment scripts | `script/*.s.sol` | ~400 | ⛔ NO |
| Foundry libs | `lib/` | N/A | ⛔ NO |

---

## Phase 1: Inventory & Baseline (~2 hours)

**Goal:** Establish ground truth about what exists, what works, and what's broken across all in-scope systems.

**Primary:** Opus | **Second Review:** GPT 5.4

### Step 1.1: Dependency Audit
- [ ] Run `cd test/offchain && npm install && npm test` — how many tests pass?
- [ ] Run `cd frontend && npm install && npm run build` — does it build cleanly?
- [ ] Check for outdated/vulnerable dependencies:
  - `cd test/offchain && npm audit`
  - `cd frontend && npm audit`
  - Check `@coinbase/x402` version against latest release
- [ ] Review `package.json` in both `test/offchain/` and `frontend/` — pinned vs. range versions

### Step 1.2: Test Baseline
- [ ] Run full offchain test suite: `cd test/offchain && npx vitest run 2>&1 | tee /tmp/vitest-output.txt`
  - Document pass/fail counts per suite
- [ ] Run offchain demos to verify they complete without errors
- [ ] Attempt frontend dev server startup and verify all pages load
- [ ] Attempt frontend production build — any warnings or errors?

### Step 1.3: Repo Hygiene
- [ ] Check for leftover debug/temp files (`test-hash.ts` in root, `frontend/frontend/frontend/` nesting)
- [ ] Check for files that shouldn't be tracked (`.DS_Store`, `cache/`)
- [ ] Verify `.gitignore` covers all build artifacts
- [ ] Check for hardcoded addresses, keys, or secrets in offchain/frontend source
- [ ] Check `test/offchain/config.example.json` for completeness

**GPT 5.4 Second Review:** Receives baseline results. Checks for missed dependency risks, additional hygiene issues, and validates that test failures are correctly classified.

**Deliverable:** `AUDIT_BASELINE.md` — build status, test results, dependency versions, hygiene issues (includes GPT 5.4 additions).

---

## Phase 2: Offchain Toolkit Review (~6 hours)

**Goal:** Deep review of the TypeScript backend — services, API, x402 integration, testing.

**Primary:** Opus | **Second Review:** GPT 5.4

### Step 2.1: Architecture & Code Quality
- [ ] Review service class design patterns — are they consistent?
- [ ] Check error handling: Does `errors.ts` hierarchy cover all failure modes?
- [ ] Check TypeScript strictness: Any `any` types in production code?
- [ ] Review `BlockchainClient` and `ContractManager` — connection handling, retry logic, error recovery
- [ ] Review `AnvilManager` — process lifecycle, port conflicts, cleanup
- [ ] Check for hardcoded values that should be config (ports, addresses, chain IDs)

### Step 2.2: Service Layer
- [ ] **AssetService** — asset registration flow, type schema validation, metadata hashing
- [ ] **LeaseService** — lease creation, EIP-712 intent signing, NFT minting orchestration
- [ ] **MarketplaceService** — offer/bid matching, escrow management, signature verification
- [ ] **RevenueService** — revenue round creation, distribution calculation, claim flow
- [ ] Cross-service: Are there race conditions? Proper transaction ordering? Error propagation?

### Step 2.3: X402 Integration
- [ ] Review `X402PaymentService` — payment calculation, header construction
- [ ] Review `X402FacilitatorClient` — facilitator communication, error handling
- [ ] Compare implementation against x402 V2 spec (CAIP-2 chain IDs, `Payment-Signature` header)
- [ ] Check `amounts.ts` and `constants.ts` for correctness
- [ ] Review streaming payment modes (`per-second` vs `batch-5s`) — are they correctly implemented?
- [ ] Verify x402 test coverage is adequate

### Step 2.4: API Server
- [ ] Review Express server setup — CORS, security headers, rate limiting
- [ ] Review route handlers — input validation (Zod schemas), error responses
- [ ] Check x402 payment gating on protected endpoints
- [ ] API spec (`docs/API_SPECIFICATION.md`) vs. actual implementation — any drift?

### Step 2.5: Storage Layer
- [ ] Review `Database` interface — is it complete enough for production?
- [ ] Review `MockDatabase` — does it faithfully simulate real DB behavior?
- [ ] Review `Cache` — invalidation strategy, memory growth
- [ ] Gap analysis: What's missing for PostgreSQL migration?

### Step 2.6: EIP-712 & Crypto Utilities
- [ ] Review manual `AbiCoder.encode()` implementation in `crypto.ts`
- [ ] Verify the offchain EIP-712 encoding produces hashes that the contracts accept (test evidence only — we do not read the contracts)
- [ ] Check `eip712.ts` — domain separator construction, type hashes
- [ ] Review the crypto-hash test suite for coverage gaps

### Step 2.7: Test Quality
- [ ] Review each Vitest suite for coverage completeness
- [ ] Identify untested code paths (especially error/edge cases)
- [ ] Check test isolation — do tests depend on execution order?
- [ ] Review mock services — do they accurately simulate production behavior?

**GPT 5.4 Second Review:** Receives all Opus offchain findings plus source code. Prompted to: find logic errors Opus missed, identify race conditions or edge cases not flagged, strengthen weak recommendations with concrete code examples, and challenge any assumptions.

**Deliverable:** `AUDIT_OFFCHAIN.md` — code quality findings, security issues, x402 compliance, test coverage gaps, architecture recommendations (includes GPT 5.4 additions, disagreements flagged).

---

## Phase 3: Frontend Review (~5 hours)

**Goal:** Review Next.js frontend for code correctness, architecture, security, and performance. Design system aesthetics are out of scope (handled separately via Gemini 3.1 Pro anti-gravity suite).

**Primary:** Opus | **Second Review:** GPT 5.4

### Step 3.1: Architecture & Patterns
- [ ] Next.js 14 App Router usage — server vs. client components, proper boundaries
- [ ] Data fetching patterns — any misuse of `useEffect` for data that should be server-fetched?
- [ ] State management — React context usage, prop drilling, unnecessary re-renders
- [ ] Component organization — are components appropriately decomposed?
- [ ] Is `wallet-providers.tsx` properly configured for Base network?

### Step 3.2: Protocol Demo (/protocol-demo)
- [ ] Walk through all 12 demo steps — do they accurately represent the protocol?
- [ ] Review animations (starfield, payment-pulse, orbital-path, etc.) — performance impact
- [ ] Check `demo-provider.tsx` and `demo-controller.tsx` — state management correctness
- [ ] Verify `demo-data.ts` and `step-config.ts` — are values realistic?
- [ ] Check preset selector — do all presets work correctly?

### Step 3.3: Market & Asset Pages
- [ ] Review spot market and futures market components
- [ ] Check `bid-form.tsx` — validation, UX, error handling
- [ ] Review `asset-registration-form.tsx` — field validation, submission flow
- [ ] Check `accept-bid-button.tsx` — transaction handling, loading states
- [ ] Review `my-orders.tsx` — data fetching, empty states

### Step 3.4: Layout & Navigation
- [ ] Navbar — active link highlighting (was fixed in recent commit — verify)
- [ ] Responsive design — mobile viewport testing
- [ ] Ticker strip — data source, update frequency

### Step 3.5: Wallet Integration
- [ ] Review `useWallet.ts` hook — connection flow, error handling, chain switching
- [ ] Check `ethers-adapter.ts` — wagmi-to-ethers bridge correctness
- [ ] Verify network configuration — Base Sepolia + Mainnet
- [ ] Test disconnection/reconnection flows

### Step 3.6: X402 Payment UI
- [ ] Review `streaming-payment-panel.tsx` — real-time payment display
- [ ] Check x402 payment-gated API route (`api/leases/[id]/access/route.ts`)
- [ ] Verify payment flow UX — is it clear to the user what's happening?

### Step 3.7: Security & Performance
- [ ] Check for XSS vectors (dangerouslySetInnerHTML, unescaped user input)
- [ ] Review CSP and security headers in Next.js config
- [ ] Check for secrets/keys in client-side code
- [ ] Bundle size analysis — are heavy dependencies tree-shaken properly?
- [ ] Image optimization — using Next.js `<Image>` component?

**GPT 5.4 Second Review:** Receives Opus frontend findings plus source code. Prompted to: identify React anti-patterns Opus missed, flag accessibility issues, find performance bottlenecks, provide concrete refactoring examples.

**Deliverable:** `AUDIT_FRONTEND.md` — architecture issues, security findings, performance recommendations (includes GPT 5.4 additions).

---

## Phase 4: Documentation Review (~3 hours)

**Goal:** Verify all documentation is accurate, complete, and useful.

**Primary:** Opus | **Second Review:** GPT 5.4

### Step 4.1: Documentation Accuracy
For each doc file, check:
- [ ] `AGENTS.md` — Does repo map match actual file structure? Are commands correct?
- [ ] `README.md` — Quick start instructions work? Architecture diagram accurate?
- [ ] `docs/offchain-systems.md` (82 KB) — Service APIs match implementation? Data flows correct?
- [ ] `docs/API_SPECIFICATION.md` — Endpoints match actual routes? Request/response formats correct?
- [ ] `docs/FRONTEND_DESIGN.md` — Design system matches current components?
- [ ] `docs/FRONTEND_INTEGRATION_GUIDE.md` — Code examples work? Dependencies current?
- [ ] `docs/DATABASE_MIGRATION_GUIDE.md` — Migration path still valid? Schema correct?
- [ ] `docs/PRODUCTION_DEPLOYMENT_GUIDE.md` — Deployment steps accurate for Base?
- [ ] `docs/DEMO_PRESENTATION_GUIDE.md` — Speaker notes match current demo?
- [ ] `docs/x402-implementation/` — x402 docs match v2 spec and implementation?

### Step 4.2: Documentation Gaps
- [ ] Missing: Architecture Decision Records (ADRs)?
- [ ] Missing: Contribution/development workflow guide?
- [ ] Missing: Environment setup guide (beyond quick start)?
- [ ] Missing: Troubleshooting / FAQ?
- [ ] Missing: Changelog / version history?
- [ ] Missing: API versioning strategy?
- [ ] Missing: Security model / threat model documentation?

### Step 4.3: Documentation Quality
- [ ] Internal consistency — do docs reference each other correctly?
- [ ] Code examples — are they copy-pasteable and correct?
- [ ] Glossary (`AGENTS.md` Domain Glossary) — complete and accurate?
- [ ] Diagrams — accurate, readable, up-to-date?

**GPT 5.4 Second Review:** Receives Opus doc findings. Checks for additional stale references, missing docs Opus didn't flag, and validates that proposed documentation additions would actually be useful.

**Deliverable:** `AUDIT_DOCS.md` — accuracy issues, gaps, recommended additions (includes GPT 5.4 additions).

---

## Phase 5: Cross-Cutting Concerns (~4 hours)

**Goal:** Review system-level concerns that span offchain toolkit, frontend, and the contract interaction boundary.

**Primary:** Opus | **Second Review:** GPT 5.4

### Step 5.1: Contract Interaction Boundary
The contracts are out of scope, but the offchain code that **talks to** them is in scope. We audit:
- [ ] Verify the offchain EIP-712 signing produces signatures the contracts accept (via existing test evidence)
- [ ] Compare TypeScript type definitions with what the contracts expect (ABI-level, not source-level)
- [ ] Verify all contract events have corresponding offchain event handlers
- [ ] Check ABI compatibility — is the offchain using generated ABIs or hardcoded?
- [ ] Verify error handling matches contract revert reasons (from ABI, not source)

### Step 5.2: X402 End-to-End Flow
- [ ] Trace: Client request → 402 response → payment construction → payment submission → access granted
- [ ] Verify facilitator integration is correctly configured
- [ ] Check: What happens on payment failure? Timeout? Double-payment?
- [ ] Review per-second vs batch payment modes end-to-end

### Step 5.3: Deployment & Operations
- [ ] Check environment configuration — are all required env vars documented?
- [ ] Verify Base Sepolia configuration is correct (chain ID, RPC URLs, contract addresses)
- [ ] Check: Is there a monitoring/alerting strategy?
- [ ] Check: Is there a rollback strategy for offchain upgrades?

### Step 5.4: Security Posture
- [ ] Dependency supply chain — are lock files committed? Pinned versions?
- [ ] Secret management — no secrets in source, proper env var usage
- [ ] Input validation — every user input validated before use
- [ ] Rate limiting — API endpoints protected
- [ ] CORS configuration — appropriate origins allowed
- [ ] Private key handling — never logged, properly secured

**GPT 5.4 Second Review:** Receives Opus cross-cutting findings. Specifically prompted to: find missed interaction boundary issues, identify security gaps, challenge deployment readiness assessment, and provide concrete mitigation code for any security findings.

**Deliverable:** `AUDIT_CROSSCUTTING.md` — contract interaction boundary analysis, x402 flow audit, deployment readiness, security posture (includes GPT 5.4 additions).

---

## Phase 6: Prioritized Fix List & Roadmap (~2 hours)

**Goal:** Synthesize all findings into an actionable, prioritized list.

**Primary:** Opus | **Second Review:** GPT 5.4

### Step 6.1: Severity Classification

| Level | Definition | Action |
|-------|-----------|--------|
| 🔴 **Critical** | Security vulnerability, data loss risk, or broken core functionality | Fix before any other work |
| 🟠 **High** | Significant bug, major UX issue, or compliance gap | Fix in current sprint |
| 🟡 **Medium** | Code quality issue, minor bug, or documentation gap | Fix when touching related code |
| 🟢 **Low** | Nice-to-have improvement, optimization, or cosmetic issue | Backlog |
| ℹ️ **Info** | Observation, design consideration, or future planning note | Document for reference |

### Step 6.2: Fix Grouping
Group fixes by work stream:
1. **Security fixes** — anything that could be exploited
2. **Correctness fixes** — bugs that produce wrong results
3. **Reliability fixes** — error handling, edge cases, resilience
4. **Documentation fixes** — accuracy, completeness, freshness
5. **Code quality** — refactoring, consistency, maintainability
6. **Performance** — frontend speed, API latency, bundle size
7. **Feature gaps** — missing functionality for production readiness
8. **DevEx** — developer experience, tooling, CI/CD

### Step 6.3: Effort Estimation
For each fix:
- T-shirt size: XS (<1h), S (1-4h), M (4-8h), L (1-2d), XL (2-5d)
- Dependencies: Does this block or depend on other fixes?
- Risk: Could this fix introduce regressions?

**GPT 5.4 Second Review:** Receives the complete fix list. Prompted to: re-prioritize if Opus got severity wrong, add concrete code examples for top fixes, identify missed improvement opportunities from the full audit, and suggest implementation order optimizations.

**Deliverable:** `AUDIT_FIXES.md` — severity-sorted fix list with effort estimates, code examples, dependencies, and suggested implementation order (includes GPT 5.4 improvements).

---

## Execution Notes

### Repo Hygiene Issues to Fix Immediately
These were spotted during planning and should be fixed before the audit proper:
1. **`frontend/frontend/frontend/`** — nested empty directories (likely accidental)
2. **`test-hash.ts`** in repo root — debug artifact
3. **`.DS_Store`** tracked in git

### Context Window Management
The in-scope codebase is ~18K LOC (frontend + offchain + docs). To keep reviews focused:
- Send each model only the files relevant to its current review phase
- Include AGENTS.md as universal context (it has the full repo map)
- For cross-cutting reviews, prepare curated file bundles rather than entire directories
- Never send Solidity source files to any model as part of this audit

### Branch Strategy
1. Create `audit/full-review-2026-03` branch from `main`
2. Commit audit deliverables to this branch
3. Code fixes go in separate PRs branched from the audit branch
4. Merge audit branch to `main` when review is complete

### Post-Audit: Frontend Design Overhaul (Separate)
After this audit completes, Shaun will run the **Gemini 3.1 Pro anti-gravity suite** for a complete frontend design system overhaul. The audit's frontend findings (architecture, security, performance) will inform that work, but the design pass is a separate process.

### Time Budget
| Phase | Estimated Hours | Models |
|-------|----------------|--------|
| 1. Inventory & Baseline | 2h | Opus → GPT 5.4 |
| 2. Offchain Review | 6h | Opus → GPT 5.4 |
| 3. Frontend Review | 5h | Opus → GPT 5.4 |
| 4. Documentation Review | 3h | Opus → GPT 5.4 |
| 5. Cross-Cutting Concerns | 4h | Opus → GPT 5.4 |
| 6. Fix List & Roadmap | 2h | Opus → GPT 5.4 |
| **Total** | **~22 hours** | |

---

## Deliverables Summary

| # | Deliverable | Phase | Content |
|---|-------------|-------|---------|
| 1 | `AUDIT_BASELINE.md` | 1 | Build status, test results, dependency versions, hygiene |
| 2 | `AUDIT_OFFCHAIN.md` | 2 | Service review, x402 compliance, test coverage |
| 3 | `AUDIT_FRONTEND.md` | 3 | Architecture, security, performance (not design aesthetics) |
| 4 | `AUDIT_DOCS.md` | 4 | Documentation accuracy, gaps, additions |
| 5 | `AUDIT_CROSSCUTTING.md` | 5 | Contract interaction boundary, x402 flow, deployment readiness |
| 6 | `AUDIT_FIXES.md` | 6 | Prioritized fix list with code examples and effort estimates |

All deliverables include both Opus and GPT 5.4 findings, with disagreements clearly marked. Saved to repo root, committed to audit branch.

---

*Plan authored by Daneel. Ready to execute on Shaun's go.*
