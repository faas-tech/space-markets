# Security Audit: x402 Payment Implementation & EIP-712 Signing

**Audit Date**: 2025-01-27  
**Scope**: x402 payment flow, EIP-712 signing, config management  
**Severity**: CRITICAL issues found

---

## Executive Summary

This audit identified **5 critical/high security vulnerabilities** in the x402 payment implementation and EIP-712 signing code. The most severe issue is that the system **fails open by default** with mock facilitator enabled, completely bypassing payment verification in production.

---

## 1. EIP-712 LEASEINTENT_TYPEHASH Analysis

### Finding: Potential Type Hash Mismatch

**File**: `eip712.ts`

```typescript
const LEASEINTENT_TYPEHASH = ethers.keccak256(
  ethers.toUtf8Bytes(
    'LeaseIntent(uint64 deadline,bytes32 assetTypeSchemaHash,Lease lease)'
  )
);
```

**Issue**: Per EIP-712 spec, when using nested structs, the full type definition should be included. The current implementation references `Lease` as a nested type but doesn't include its full definition in the type string.

**However**, this may actually work correctly because:
1. Solidity computes `leaseHash` separately via `keccak256(abi.encode(LEASE_TYPEHASH, ...))`
2. The computed hash is passed as a `bytes32` to the parent struct

This is a valid pattern but is **non-standard** and could cause compatibility issues with different EIP-712 implementations.

**Field Name Concern**: The type uses `assetTypeSchemaHash` but the code in `payment-service.ts` uses:
```typescript
assetType: ethers.keccak256(ethers.toUtf8Bytes(assetType))
```

This appears to use a simple keccak hash, not a type hash. Need to verify this matches the Solidity `assetTypeSchemaHash` field exactly.

**Recommendation**: Add integration test comparing TypeScript-generated signature with Solidity's `nonces` mapping to verify compatibility.

---

## 2. Replay Attack Vectors

### Finding: CRITICAL - No Replay Protection

**Files**: `facilitator-client.ts`, `streamingPayment.ts`

**Vulnerabilities**:

1. **No chainId validation**: Payment payloads can be replayed across different chains
   ```typescript
   // facilitator-client.ts - verify()
   // No chainId check anywhere
   const body: FacilitatorRequestBodyV2 = {
     x402Version: 2,
     paymentPayload,  // Can be replayed on any chain
     paymentRequirements
   };
   ```

2. **No nonce or unique identifier**: The same payment can be resubmitted
   ```typescript
   // streamingPayment.ts - X402PaymentHeader
   interface X402PaymentHeader {
     payer: string;
     amount: string;
     txHash: string;      // Mock hash, easily reproducible
     issuedAt: string;    // Not validated
   }
   ```

3. **No expiration/validity window**: Old payments can be replayed indefinitely

**Attack Scenario**:
1. Attacker initiates legitimate lease payment
2. Attacker captures the payment header
3. Attacker replays same header indefinitely to drain lessor's funds (simulated)

**Fix**:
```typescript
interface X402PaymentHeader {
  payer: string;
  amount: string;
  txHash: string;
  issuedAt: string;
  chainId: number;           // ADD: Chain identifier
  nonce: string;             // ADD: Unique per-session
  validUntil: number;        // ADD: Expiration
}

// In verify():
const payload = JSON.parse(atob(paymentPayload));
if (payload.chainId !== expectedChainId) {
  return { isValid: false, invalidReason: 'chain mismatch' };
}
if (Date.now() > payload.validUntil * 1000) {
  return { isValid: false, invalidReason: 'expired' };
}
```

---

## 3. Facilitator Unavailability - Fail Open vs Fail Safe

### Finding: CRITICAL - System Fails OPEN

**File**: `facilitator-client.ts`

```typescript
async verify(paymentPayload: string, requirements: X402PaymentRequirements): Promise<FacilitatorVerifyResult> {
  if (this.config.useMockFacilitator) {
    return { isValid: true };  // ⚠️ COMPLETE BYPASS
  }
  // ...
}

async settle(paymentPayload: string, requirements: X402PaymentRequirements): Promise<FacilitatorSettleResult> {
  if (this.config.useMockFacilitator) {
    return {
      success: true,
      txHash: `0xmock${crypto.randomBytes(12).toString('hex')}`,
      // ...
    };
  }
  // ...
}
```

**Config default** (config/index.ts):
```typescript
useMockFacilitator: process.env.X402_USE_MOCK ? process.env.X402_USE_MOCK === 'true' : true,
//                                                                      ^^^ DEFAULT TRUE!
```

**Problem**: 
- Default is `useMockFacilitator: true`
- When true, **ALL verification is bypassed** - payments accepted without any actual checks
- This is dangerous for production deployments

**Impact**: In production, if `X402_USE_MOCK` env var is not set (or any misconfiguration), the system accepts all payments without verification.

**Fix**:
```typescript
// config/index.ts
useMockFacilitator: process.env.X402_USE_MOCK === 'true',  // Default: false (undefined !== 'true' === false)
```

Or better, fail-safe design:
```typescript
if (this.config.useMockFacilitator && process.env.NODE_ENV === 'development') {
  return { isValid: true };
}
// In production, never bypass
```

---

## 4. Top 5 Security Risks with Fixes

### Risk #1: Mock Facilitator Enabled by Default (CRITICAL)

**Severity**: 🔴 CRITICAL  
**File**: `config/index.ts`, `facilitator-client.ts`

**Problem**: Payment verification bypassed by default

**Fix**:
```typescript
// config/index.ts - Change default
useMockFacilitator: process.env.X402_USE_MOCK === 'true',  // Default false
```

### Risk #2: No Replay Attack Protection (CRITICAL)

**Severity**: 🔴 CRITICAL  
**Files**: `facilitator-client.ts`, `streamingPayment.ts`

**Problem**: Payments can be replayed across chains/time

**Fix**: Add chainId, nonce, and expiration to payment header (see Section 2)

### Risk #3: Frontend Route Never Verifies On-Chain (CRITICAL)

**Severity**: 🔴 CRITICAL  
**File**: `api/leases/[id]/access/route.ts`

**Problem**: The route accepts payment headers but only does JSON.parse validation:
```typescript
const payment = JSON.parse(Buffer.from(paymentHeader, 'base64').toString());
// No signature verification, no on-chain check
```

**Fix**: Call facilitator.verify() or validate on-chain:
```typescript
const facilitator = new X402FacilitatorClient(config.x402);
const result = await facilitator.verify(paymentHeader, requirements);
if (!result.isValid) {
  return NextResponse.json({ error: result.invalidReason }, { status: 402 });
}
```

### Risk #4: Hardcoded Private Key in Config (HIGH)

**Severity**: 🟠 HIGH  
**File**: `config/index.ts`

**Problem**:
```typescript
privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', // Anvil account #0
```

**Fix**: Require env var, throw if missing in production:
```typescript
privateKey: process.env.PRIVATE_KEY || (process.env.NODE_ENV === 'development' 
  ? '0xac09...' 
  : (() => { throw new Error('PRIVATE_KEY required'); })()),
```

### Risk #5: No Deadline Enforcement in Payment Flow (HIGH)

**Severity**: 🟠 HIGH  
**Files**: `eip712.ts`, `lease-service.ts`

**Problem**: LeaseIntent has a `deadline` field but it's never validated in the payment flow

**Fix**:
```typescript
// In payment verification
const now = Math.floor(Date.now() / 1000);
if (leaseIntent.deadline < now) {
  return { isValid: false, invalidReason: 'deadline expired' };
}
```

---

## 5. getConfig() Function Analysis

### Finding: Not Broken, But Inflexible

```typescript
export function getConfig(): AppConfig {
  const env = process.env.NODE_ENV || 'development';
  // For now, we only have development config
  return defaultConfig;
}
```

**What it does**:
- Returns `defaultConfig` always
- Environment variables ARE read: `process.env.X402_FACILITATOR_URL`, `X402_USDC_ADDRESS`, etc.
- So config IS overridden by env vars

**What it doesn't do**:
- No separate production config object
- No validation of required env vars
- No error if critical vars missing in production

**Verdict**: Works but lacks robustness. Not "broken" in the sense that it always returns defaults - it does read env vars. But it should validate in production:

```typescript
export function getConfig(): AppConfig {
  const env = process.env.NODE_ENV || 'development';
  const config = env === 'production' ? productionConfig : defaultConfig;
  
  // Validate required vars
  if (env === 'production' && !process.env.PRIVATE_KEY) {
    throw new Error('PRIVATE_KEY required in production');
  }
  return config;
}
```

---

## Recommendations Summary

| Priority | Action |
|----------|--------|
| P0 | Set `useMockFacilitator: false` as default |
| P0 | Add chainId + nonce + expiration to payment header |
| P1 | Implement on-chain verification in API route |
| P1 | Remove hardcoded private key, require env var |
| P1 | Add deadline validation in payment flow |
| P2 | Add separate production config with validation |
| P2 | Add EIP-712 integration tests vs Solidity |

---

## Conclusion

The implementation has **critical security flaws** that would allow payment bypass in production. The combination of:
1. Default mock facilitator enabled
2. No replay protection  
3. Missing on-chain verification

Means an attacker could access resources without paying. **Do not deploy to production** without addressing Risks #1-3.

