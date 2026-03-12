# Frontend Architecture Audit - GPT54 V2

**Review Date:** 2025-01-13  
**Reviewer:** Daneel (Subagent)  
**Scope:** Production-readiness review of frontend architecture  

---

## Executive Summary

| Issue | Severity | Category |
|-------|----------|----------|
| Only Foundry chain configured | 🔴 HIGH | Chain Configuration |
| Missing security headers | 🔴 HIGH | Security |
| useWallet connectors[0] unsafe access | 🟡 MEDIUM | Error Handling |
| window.addEventListener pattern | 🟢 LOW | Code Style |
| QueryClient module-level instantiation | 🟢 LOW (theoretical) | SSR |

---

## 1. Chain Configuration (wagmi.ts)

**Finding:** Only `foundry` chain is configured.

```typescript
chains: [
  foundry,  // Chain ID 31337 - Local development only
],
```

**Impact for Real Users:**
- 🔴 **SEVERITY: HIGH**
- Users cannot connect to any real EVM networks (Base Mainnet, Base Sepolia, Ethereum)
- The app is effectively unusable in production - wallet connections will fail
- `foundry` is a local dev chain (anvil), not accessible on mainnet/testnets

**Recommendation:**
```typescript
import { base, baseSepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'Space Markets',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '...',
  chains: [
    baseSepolia,  // For testing
    base,         // For production
  ],
  ssr: true,
});
```

---

## 2. QueryClient SSR Data Leakage

**Finding:** QueryClient is instantiated at module level in wallet-providers.tsx:

```typescript
const queryClient = new QueryClient();  // Module-level

export function WalletProviders({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
```

**Analysis:**
- 🟢 **SEVERITY: LOW (theoretical, not actual issue)**
- The component has `'use client'` directive, so it **only renders on the client**
- Module-level instantiation runs on client only - no SSR execution
- In Next.js 15 + React 19, this pattern works correctly because client components don't run on server

**Verdict:** This is NOT causing SSR data leakage. The `'use client'` directive ensures this code only runs in the browser.

---

## 3. window.addEventListener('switchTab') Pattern

**Finding in page.tsx:**

```typescript
const handleSwitchTab = (event: CustomEvent) => {
  setActiveTab(event.detail);
};

window.addEventListener('switchTab', handleSwitchTab as EventListener);
```

**Analysis:**
- 🟢 **SEVERITY: LOW**
- Not broken - CustomEvent works correctly in browsers
- The `as EventListener` cast is a bit unusual but functional

**Issues:**
- Non-idiomatic for React apps (should use React context or callbacks)
- Tightly couples components via global event namespace
- No type safety on the event detail

**Better approach:**
```typescript
// Use a shared hook or context
import { useTabNavigation } from '@/hooks/useTabNavigation';
const { activeTab, setActiveTab } = useTabNavigation();
```

---

## 4. Missing Security Headers (next.config.mjs)

**Finding:** No security headers configured.

**Missing headers:**
| Header | Purpose | Severity |
|--------|---------|----------|
| `Content-Security-Policy` | XSS prevention, resource loading control | 🔴 HIGH |
| `X-Content-Type-Options` | MIME type sniffing prevention | 🟡 MEDIUM |
| `X-Frame-Options` / `frame-ancestors` | Clickjacking protection | 🟡 MEDIUM |
| `Referrer-Policy` | Referrer info control | 🟡 MEDIUM |
| `Permissions-Policy` | Browser feature control | 🟡 MEDIUM |

**Recommended next.config.mjs:**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Adjust for wagmi/rainbowkit
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "connect-src 'self' https://*.base.org https://api.pancakeswap.com wss://*.walletconnect.org",
              "frame-ancestors 'none'",
            ].join('; '),
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
  
  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@react-native-async-storage/async-storage': false,
      'pino-pretty': false,
    };
    
    config.externals = config.externals || [];
    if (!isServer) {
      config.externals.push({
        '@react-native-async-storage/async-storage': 'commonjs @react-native-async-storage/async-storage',
        'pino-pretty': 'commonjs pino-pretty',
      });
    }
    
    return config;
  },
};

export default nextConfig;
```

---

## 5. React 19 / Next.js 15 Compatibility

**Findings:**
- ✅ No breaking changes from React 19 detected
- ✅ `'use client'` directive properly used
- ✅ Client-side hooks (`useEffect`, `useState`, `useMemo`) used correctly
- ✅ No class components or legacy React patterns

**Minor considerations:**
- The `as EventListener` type cast is React 19 safe but unusual
- ethers v6 is compatible with React 19

---

## 6. Additional Issues Missed by Prior Reviewers

### 🟡 Issue: Unsafe Array Access in useWallet.ts

```typescript
connect: () => connect({ connector: connectors[0] }),
```

**Problem:** If `connectors` array is empty, this throws `TypeError: Cannot read property '0' of undefined`.

**Recommendation:**
```typescript
connect: () => {
  if (connectors.length === 0) {
    throw new Error('No wallet connectors available');
  }
  connect({ connector: connectors[0] });
},
```

### ✅ ethers-adapter.ts: Correct Implementation

The ethers v6 adapter correctly uses:
- `BrowserProvider` (ethers v6 replacement for `Web3Provider`)
- `JsonRpcSigner` (ethers v6)
- Proper viem → ethers conversion via `useConnectorClient`

### ✅ imports: Correct

All imports are valid and the module structure is correct.

---

## Summary & Priority Actions

| Priority | Action Item |
|----------|-------------|
| 🔴 **P0** | Add Base Sepolia + Base Mainnet chains to wagmi.ts |
| 🔴 **P0** | Add security headers to next.config.mjs |
| 🟡 **P1** | Fix unsafe `connectors[0]` access in useWallet.ts |
| 🟢 **P2** | Consider replacing CustomEvent pattern with React context |

---

*Audit complete. Ready for implementation.*
