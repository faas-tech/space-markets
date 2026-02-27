# X402 V1-to-V2 Migration Research

**Date:** 2026-02-25
**Branch:** `main`
**Status:** Complete

---

## 1. X402 V2 Overview

X402 V2 was released in January 2026 with significant architectural improvements over V1. The key changes include:

- **Modular plugin architecture:** The monolithic `@coinbase/x402` package is now complemented by focused sub-packages (`@x402/fetch`, `@x402/paywall`, `@x402/core`, `@x402/evm`).
- **Wallet sessions:** Optional, opt-in wallet-based sessions that allow clients to skip per-request payment verification for a configurable duration.
- **Multi-chain support:** Network identifiers now use CAIP-2 format (e.g., `eip155:84532`) instead of string names (e.g., `base-sepolia`).
- **Header modernization:** HTTP headers have been renamed to follow standard conventions without the `X-` prefix.
- **Protocol versioning:** Explicit `x402Version: 2` field in request bodies.
- **Backward compatibility:** V1 headers and formats are still accepted as fallback.

---

## 2. Header Changes

| Purpose | V1 Header | V2 Header |
|---------|-----------|-----------|
| Payment from client | `X-PAYMENT` | `Payment-Signature` |
| Requirements from server (402) | `X-PAYMENT-REQUIRED` | `Payment-Required` |
| Response confirmation | (none) | `Payment-Response` |

V2 servers should accept both V1 and V2 headers for backward compatibility. V2 clients should send the new header names.

---

## 3. Network Identifier Changes

| Network | V1 Format | V2 Format (CAIP-2) |
|---------|-----------|---------------------|
| Base Sepolia | `base-sepolia` | `eip155:84532` |
| Base Mainnet | `base-mainnet` | `eip155:8453` |

The V2 format follows the [CAIP-2](https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-2.md) chain identification standard, enabling multi-chain support.

---

## 4. NPM Package Changes

| Purpose | V1 Package | V2 Package |
|---------|-----------|-----------|
| Core SDK | `@coinbase/x402` (various) | `@coinbase/x402` ^2.1.0 |
| Fetch wrapper | (built-in) | `@x402/fetch` |
| Paywall middleware | (built-in) | `@x402/paywall` |
| Core types/utils | (built-in) | `@x402/core` |
| EVM chain support | (built-in) | `@x402/evm` |

For this repo, we add `@coinbase/x402` ^2.1.0 as the primary dependency. The sub-packages are optional and can be adopted incrementally.

---

## 5. Protocol Version Field

```typescript
// V1
const body = {
  x402Version: 1,
  paymentHeader: encodedPayment,
  paymentRequirements: requirements
};

// V2
const body = {
  x402Version: 2,
  paymentPayload: encodedPayment,     // renamed from paymentHeader
  paymentRequirements: requirements
};
```

---

## 6. Request Body Changes

| Field | V1 Name | V2 Name |
|-------|---------|---------|
| Payment data | `paymentHeader` | `paymentPayload` |
| Version | `x402Version: 1` | `x402Version: 2` |

The `paymentRequirements` field name remains unchanged.

---

## 7. Payment Requirements Changes

V2 adds optional fields to `X402PaymentRequirements`:

```typescript
interface X402PaymentRequirements {
  scheme: 'exact' | 'tiered' | 'subscription';  // V2: expanded scheme types
  network: string;          // kept for backward compat
  chainId?: string;         // V2: CAIP-2 format (e.g., 'eip155:84532')
  version?: 2;              // V2: protocol version marker
  sessionId?: string;       // V2: wallet session reference
  asset: string;
  maxAmountRequired: string;
  payTo: string;
  resource: string;
  description?: string;
  extra?: Record<string, any>;
}
```

---

## 8. Wallet Sessions

V2 introduces optional wallet-based sessions:

```typescript
interface X402Session {
  sessionId: string;
  walletAddress: string;
  chainId: string;          // CAIP-2 format
  maxAmount: string;        // session spending limit
  expiresAt: string;        // ISO 8601 timestamp
  createdAt: string;
  isActive: boolean;
}
```

Sessions are opt-in via `enableSessions: true` in config. When a session exists and is valid, the server can skip per-request payment verification, reducing overhead for streaming payments.

---

## 9. Backward Compatibility

V2 maintains full backward compatibility:

- V1 `X-PAYMENT` header is still accepted (servers check both `Payment-Signature` and `X-PAYMENT`)
- V1 `paymentHeader` field in request bodies is accepted alongside `paymentPayload`
- V1 `x402Version: 1` continues to work
- V1 network string names (`base-sepolia`) remain valid
- The `network` field is preserved; `chainId` (CAIP-2) is additive

---

## 10. Migration Mapping: This Repo's Codebase

### Types (`test/offchain/src/types/x402.ts`)

| Change | Detail |
|--------|--------|
| Add `X402PaymentScheme` type | `'exact' \| 'tiered' \| 'subscription'` |
| Add `version?: 2` to `X402PaymentRequirements` | Protocol version marker |
| Add `sessionId?: string` to `X402PaymentRequirements` | Session reference |
| Add `chainId?: string` to `X402PaymentRequirements` | CAIP-2 identifier |
| Add `FacilitatorRequestBodyV2` interface | Uses `paymentPayload` instead of `paymentHeader` |
| Add `X402Session` interface | Wallet session support |
| Keep all V1 types | Backward compatibility |

### Config (`test/offchain/src/config/index.ts`)

| Change | Detail |
|--------|--------|
| Add `networkCAIP: string` to `X402Config` | Default `'eip155:84532'` |
| Add `x402Version: number` to `X402Config` | Default `2` |
| Add `enableSessions: boolean` to `X402Config` | Default `false` |
| Keep `network: 'base-sepolia'` | Backward compatibility |

### Facilitator Client (`test/offchain/src/x402/facilitator-client.ts`)

| Change | Detail |
|--------|--------|
| `x402Version: 1` -> `x402Version: 2` | Protocol version bump |
| `paymentHeader` -> `paymentPayload` in request body | V2 field naming |
| Add `FacilitatorRequestBodyV2` type usage | Renamed interface |
| Add `networkId` using CAIP format in requests | Multi-chain support |
| Add `createSession()` method | Gated by `enableSessions` |
| Add `getSession()` method | Gated by `enableSessions` |
| Mock facilitator behavior unchanged | Still returns success + mock tx hash |

### Payment Service (`test/offchain/src/x402/payment-service.ts`)

| Change | Detail |
|--------|--------|
| Add `version: 2` to requirements output | V2 marker |
| Add optional `chainId` (CAIP-2) to requirements | Multi-chain |
| Session-aware quote building | Skip payment if valid session exists |
| Keep `amounts.ts` and `constants.ts` unchanged | No changes needed |

### API Server (`test/offchain/src/api/server.ts`)

| Change | Detail |
|--------|--------|
| Accept `Payment-Signature` header (V2) with `X-PAYMENT` fallback (V1) | Dual header support |
| Set `Payment-Required` response header (was `X-PAYMENT-REQUIRED`) | V2 response |
| Add `Payment-Response` header on success | V2 response confirmation |
| Update `parsePaymentHeader` error message | Reflect V2 naming |

### Lease Routes (`test/offchain/src/api/routes/leases.ts`)

| Change | Detail |
|--------|--------|
| Accept `payment-signature` header with `x-payment` fallback | Dual header support |
| Update 402 response message | Reflect V2 naming |
| Add `Payment-Response` header on success | V2 response confirmation |

### Demos

| File | Change |
|------|--------|
| `demos/05-complete-system.ts` | Update console output: `X-PAYMENT` -> `Payment-Signature`, add V2 version reference |
| `demos/x402-second-stream.ts` | Header key: `'X-PAYMENT'` -> `'Payment-Signature'` |
| `demos/01-simple-workflow.ts` | No X402 references; no changes needed |
| `demos/simple-complete-demo.ts` | No X402 references; no changes needed |

### Tests

| File | Change |
|------|--------|
| `tests/api-integration.test.ts` | `'X-PAYMENT': paymentHeader` -> `'Payment-Signature': paymentHeader` |
| `tests/enhanced-flow.test.ts` | No direct header usage (uses service layer); no header changes needed |
| `tests/x402-streaming.test.ts` | No direct header usage (uses service layer); no header changes needed |

### Frontend

| File | Change |
|------|--------|
| `frontend/src/lib/x402/streamingPayment.ts` | `'X-PAYMENT'` -> `'Payment-Signature'` in fetch headers |
| `frontend/src/app/api/leases/[id]/access/route.ts` | Accept `payment-signature` header with `x-payment` fallback |

---

## 11. Implementation Notes

1. **Mock facilitator remains unchanged:** The mock always returns `{ isValid: true }` for verify and `{ success: true, txHash: '0xmock...' }` for settle. V2 changes only affect the request body format sent to real facilitators.

2. **Sessions are off by default:** The `enableSessions` config flag defaults to `false`. Session methods exist but are no-ops unless explicitly enabled.

3. **CAIP-2 is additive:** The `chainId` field is added alongside the existing `network` field. Both are sent in requirements; the V1 `network` field is never removed.

4. **No breaking changes:** All V1 clients continue to work. The upgrade is fully backward compatible.

---

## 12. References

- X402 Protocol Specification: https://www.x402.org/
- CAIP-2 Chain ID Standard: https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-2.md
- NPM `@coinbase/x402`: https://www.npmjs.com/package/@coinbase/x402
