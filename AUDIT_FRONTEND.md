# Audit: Frontend — Space Markets

**Date:** 2026-03-11
**Branch:** `202603-audit`
**Reviewer:** Daneel (Claude Opus)
**Scope:** `frontend/src/` — Next.js 15 App Router, React 19, Tailwind v4, RainbowKit/wagmi

---

## 1. Architecture & Patterns

### 1.1 Overall Assessment
The frontend is a Next.js 15 App Router application with RainbowKit for wallet connection, wagmi/viem for chain interaction, and ethers.js via an adapter for signing. The protocol demo (`/protocol-demo`) is the most sophisticated part — 12 animated step pages with a demo state machine. The market pages use hardcoded sample data.

### 1.2 Findings

| # | Finding | Severity | Location |
|---|---------|----------|----------|
| F1 | **wagmi configured for Foundry chain only** | 🔴 Critical | `wagmi.ts` — only `foundry` (chainId 31337). No Base Sepolia, no Base Mainnet. |
| F2 | **Hardcoded Anvil addresses in x402 API route** | 🔴 Critical | `api/leases/[id]/access/route.ts` — `payTo: 0xf39Fd6...`, `asset: 0xB7f8BC...` |
| F3 | **X402 payment verification is fully mocked** | 🔴 Critical | `api/leases/[id]/access/route.ts` — parses base64 JSON, no signature verification |
| F4 | **X402StreamingClient uses mock transaction hashes** | 🟠 High | `streamingPayment.ts:107` — `generateMockTxHash()` in production code path |
| F5 | **No error boundaries** | 🟠 High | No React error boundaries in component tree |
| F6 | **Homepage uses hardcoded sample data** | 🟠 High | `page.tsx` — `sampleAssets` array, not fetched from API |
| F7 | **No security headers in Next.js config** | 🟠 High | `next.config.mjs` — no CSP, HSTS, X-Frame-Options, etc. |
| F8 | **Custom events for cross-component communication** | 🟡 Medium | `page.tsx` — `window.addEventListener('switchTab')` instead of React state |
| F9 | **WalletConnect projectId is placeholder** | 🟡 Medium | `wagmi.ts` — `'00000000000000000000000000000000'` |
| F10 | **`connect()` always uses first connector** | 🟡 Medium | `useWallet.ts:8` — `connectors[0]` without checking availability |
| F11 | **No loading states for wallet operations** | 🟡 Medium | `useWallet.ts` — no `isConnecting`, `isPending` exposed |
| F12 | **QueryClient instantiated at module level** | 🟢 Low | `wallet-providers.tsx:11` — works for CSR but not ideal for SSR |
| F13 | **No Suspense boundaries for async operations** | 🟡 Medium | No loading fallbacks for data fetching |
| F14 | **`ethers-adapter.ts` lacks error handling** | 🟡 Medium | `clientToSigner()` assumes all properties exist on client |

---

## 2. Protocol Demo (`/protocol-demo`)

### 2.1 Assessment
The 12-step demo is impressive — cinematic animations (starfield, particle bursts, orbital paths, payment pulses) with a full protocol walkthrough. The state machine (`demo-provider.tsx`, `demo-controller.tsx`) manages step progression, presets, and auto-play.

### 2.2 Findings
- **~6,300 lines of demo code** — the largest section of the frontend
- Each step component (step-01 through step-12) is self-contained with its own animations
- `demo-data.ts` and `step-config.ts` provide realistic values for space assets
- Preset selector allows switching between asset types
- Share button generates shareable URLs
- **Concern:** Animation performance — 10 simultaneous canvas/CSS animations could impact lower-powered devices. No `prefers-reduced-motion` support.
- **Concern:** Step components average 500+ lines each — could benefit from extraction of animation logic into shared hooks

---

## 3. Market & Asset Pages

### 3.1 Homepage (`/`)
- Hardcoded `sampleAssets` array with 3 items
- "Showing 3 of 156 assets" text is static/misleading
- "Load More Assets" button does nothing
- Tabs (Auctions, Spot, Futures, My Orders) work via state
- Hash-based navigation (`#futures`) for direct linking — good

### 3.2 Asset Registration (`/assets/register`)
- Form component at 161 lines, reasonable
- **Gap:** No form validation beyond HTML5 defaults
- **Gap:** No submission feedback (loading state, success/error messages)

### 3.3 Bid Form
- 57 lines, minimal
- **Gap:** No amount validation, no balance check

### 3.4 Spot & Futures Markets
- 450-470 lines each with detailed mock data
- Well-structured table layouts
- **Gap:** All data is hardcoded — no API integration

### 3.5 My Orders
- 261 lines, mock order data
- Tab-based filtering (Active, History, All)
- **Gap:** No wallet-based filtering (shows same orders for everyone)

---

## 4. Wallet Integration

### 4.1 Configuration Issues
- **🔴 F1:** `wagmi.ts` only configures `foundry` chain. This means:
  - Users on Base Sepolia cannot connect
  - Users on Base Mainnet cannot connect
  - Production deployment is non-functional for any real network
  - Should configure `baseSepolia` for testnet and `base` for production with chain switching

### 4.2 Adapter
- `ethers-adapter.ts` converts wagmi/viem client to ethers.js Signer
- Implementation follows the standard wagmi-to-ethers pattern
- **Gap (F14):** No null checks — if `client.account` or `client.chain` is undefined, it throws

### 4.3 useWallet Hook
- Simple wrapper around wagmi hooks
- **Gap (F10):** `connect()` blindly uses `connectors[0]` — if no connectors available, this crashes
- **Gap (F11):** Doesn't expose `isConnecting` or error states

---

## 5. X402 Payment UI

### 5.1 StreamingPaymentPanel
- Clean real-time payment display with status indicator, total paid, and payment log
- Mode selector (per-second vs batch-5s) — good UX
- Error display with rose-colored alert — good
- Payment log capped at 100 entries — good memory management
- **Gap:** No reconnection logic if stream fails
- **Gap:** No confirmation before starting stream (could accidentally incur costs)

### 5.2 X402 API Route (Frontend)
- **🔴 F2/F3:** The `api/leases/[id]/access/route.ts` is a fully mocked endpoint:
  - `payTo` is hardcoded to Anvil account #0
  - USDC address is hardcoded to local deployment
  - Payment "verification" just parses base64 JSON — no signature check, no on-chain verification
  - This must be completely rewritten for production

### 5.3 X402StreamingClient
- **🟠 F4:** `generateMockTxHash()` is called in the main payment flow — not behind a test flag. In production, this would submit fake transaction hashes that the facilitator would reject.

---

## 6. Security & Performance

### 6.1 Security
- **No XSS vectors found** — React's default escaping handles user input
- **No `dangerouslySetInnerHTML` usage** ✅
- **No secrets in client-side code** ✅ (Anvil addresses are public, not secrets)
- **No CSP headers (F7)** — `next.config.mjs` has no security headers at all
- **NEXT_PUBLIC_ env vars** used appropriately for client-side values

### 6.2 Performance
- **Dynamic import** for WalletProviders (`ssr: false`) — good, avoids hydration mismatch
- **Font optimization** — Next.js font module for Inter and Roboto Mono ✅
- **No Image component usage** — not applicable (no images in current build)
- **Bundle concerns:**
  - `ethers` is a heavy dependency (~400KB). Currently imported in multiple places. Could benefit from tree-shaking or `ethers/utils` imports.
  - Demo step components are not lazy-loaded — all 6,300 lines load on `/protocol-demo` regardless of which step is active

---

## 7. Recommendations (Priority Order)

1. **Configure real chains in wagmi** — Add `baseSepolia` and `base` chains. This is blocking for any non-local deployment.
2. **Rewrite x402 API route** — Replace mock verification with real facilitator integration. Move hardcoded addresses to env vars.
3. **Add error boundaries** — At minimum around the demo, market pages, and wallet connection.
4. **Add security headers** — CSP, HSTS, X-Frame-Options, X-Content-Type-Options in Next.js config.
5. **Replace hardcoded data** — Connect market pages to API endpoints (even if mocked initially).
6. **Add form validation** — Asset registration, bid form, lease offer form.
7. **Lazy-load demo steps** — Dynamic imports for step components to reduce initial bundle.
8. **Add `prefers-reduced-motion` support** — Disable/reduce animations for accessibility.
9. **Fix wallet connection** — Add connector selection, loading states, error handling.
10. **Replace window events** — Use React context or Zustand for cross-component state.

---

*Frontend review complete. Proceeding to Phase 4 (Documentation Review).*
