# USDC Decimal Handling Audit - Space Markets

**Date:** 2025-01-13
**Severity:** CRITICAL
**Reviewer:** Daneel (GPT-5.4)

---

## Executive Summary

Found **4 critical bugs** related to USDC decimal handling and type safety. The payment system is **completely broken** — all payment quotes return $0 due to incorrect `terms` field structure and mixed use of `formatEther` (18 decimals) vs `formatUnits(..., 6)` (6 decimals for USDC).

---

## 1. Lifecycle Trace & Precision Loss

### Flow: Contract → Database → Payment → Display

| Stage | File | Operation | Issue |
|-------|------|-----------|-------|
| **1. Create Offer** | lease-service.ts | `createLeaseOffer(rentAmount: bigint)` | Receives wei (18 decimals) |
| **2. Store** | lease-service.ts | `ethers.formatEther(rentAmount)` | ❌ **WRONG**: uses 18 decimals but contract uses USDC (6) |
| **3. Activate** | lease-service.ts | `ethers.formatUnits(..., 6)` | ✅ Correct |
| **4. Payment Calc** | payment-service.ts | `terms.paymentAmount` | ❌ **CRASH**: `terms` is a string, not an object |
| **5. Display** | amounts.ts | `formatUsdcMinorUnits()` | Works if input correct |

### Where Precision Breaks

**In `createLeaseOffer()`:**
```typescript
// WRONG - formats as ETH (18 decimals) but USDC is 6 decimals
agreement: {
  rentAmount: ethers.formatEther(rentAmount),  // 18 decimals!
  // ...
  terms: 'Standard lease terms',  // String, not object!
}
```

**In `activateLease()` (correct):**
```typescript
// CORRECT - formats as USDC (6 decimals)
agreement: {
  rentAmount: ethers.formatUnits(leaseData.rentAmount, 6),  // ✅
```

---

## 2. The `terms.paymentAmount` Bug — CONFIRMED: ALL PAYMENTS ARE $0

### Root Cause

In `lease-service.ts` `createLeaseOffer()`:
```typescript
const agreement: LeaseAgreement = {
  // ...
  terms: 'Standard lease terms',  // ← STRING!
};
```

In `payment-service.ts` `getHourlyMinorUnits()`:
```typescript
private getHourlyMinorUnits(lease: StoredLease): bigint {
  const weiAmount = BigInt(lease.agreement.terms.paymentAmount || '0');
  //              ^^^^^^^^^^^^^^^^^^^^^^^^
  //              STRING has no .paymentAmount property → returns undefined
  return weiToUsdcMinorUnits(weiAmount);
}
```

**Result:** `lease.agreement.terms.paymentAmount` is always `undefined` → `'0'` → payment is **0 USDC**.

---

## 3. Other Type Mismatches

| Location | Current Code | Should Be | Impact |
|----------|-------------|-----------|--------|
| `lease-service.ts:122` | `ethers.formatEther(rentAmount)` | `ethers.formatUnits(rentAmount, 6)` | Stored as wrong precision |
| `lease-service.ts:127` | `ethers.formatEther(securityDeposit)` | `ethers.formatUnits(securityDeposit, 6)` | Stored as wrong precision |
| `revenue-service.ts:47` | `ethers.formatEther(claimEvent.args.share)` | `ethers.formatUnits(..., 6)` | Display shows wrong amount |
| `revenue-service.ts:60` | `ethers.formatEther(amount)` | `ethers.formatUnits(amount, 6)` | Returns wrong value |
| `types/lease.ts:10` | `rentAmount: bigint \| string \| number` | `bigint \| string` | `number` cannot safely hold uint256 |

---

## 4. `weiToUsdcMinorUnits` Analysis

### Code
```typescript
const WEI_DECIMAL_FACTOR = BigInt(10) ** BigInt(18);

export function weiToUsdcMinorUnits(weiAmount: bigint): bigint {
  if (weiAmount === 0n) return 0n;
  return (weiAmount * USDC_DECIMAL_FACTOR) / WEI_DECIMAL_FACTOR;
}
```

### Math Check
- **Input:** wei (18 decimals), e.g., `1_000_000_000_000_000_000` = 1 ETH
- **Output:** USDC minor units (6 decimals)
- **Formula:** `(weiAmount × 10^6) / 10^18 = weiAmount / 10^12`

**Example:** `1_000_000_000_000_000_000` wei → `1_000_000` USDC (correct for 1 USDC wei equivalent)

### Name Issue
The function name is **misleading but not wrong**:
- "Wei" implies 18 decimal (ETH)
- The math correctly converts any 18-decimal value to 6-decimal
- Could be renamed to `convert18DecimalsTo6Decimals` for clarity, but current name is acceptable

---

## 5. Concrete Fixes

### Fix 1: lease-service.ts — Store correct USDC precision

**File:** `src/services/lease-service.ts`

In `createLeaseOffer()`, change lines 118-127:

```typescript
// BEFORE (WRONG):
const agreement: LeaseAgreement = {
  rentAmount: ethers.formatEther(rentAmount),
  rentPeriod: rentPeriod.toString(),
  securityDeposit: ethers.formatEther(securityDeposit),
  startTime: new Date(startTime * 1000).toISOString(),
  endTime: new Date(endTime * 1000).toISOString(),
  terms: 'Standard lease terms',  // String!
  conditions: []
};

// AFTER (CORRECT):
const agreement: LeaseAgreement = {
  rentAmount: ethers.formatUnits(rentAmount, 6),  // USDC = 6 decimals
  rentPeriod: rentPeriod.toString(),
  securityDeposit: ethers.formatUnits(securityDeposit, 6),
  startTime: new Date(startTime * 1000).toISOString(),
  endTime: new Date(endTime * 1000).toISOString(),
  terms: {
    paymentAmount: rentAmount.toString(),  // Store as object with paymentAmount
  },
  conditions: []
};
```

### Fix 2: payment-service.ts — Fix terms access

**File:** `src/services/payment-service.ts`

Change `getHourlyMinorUnits()` (lines 50-53):

```typescript
// BEFORE (BROKEN):
private getHourlyMinorUnits(lease: StoredLease): bigint {
  const weiAmount = BigInt(lease.agreement.terms.paymentAmount || '0');
  return weiToUsdcMinorUnits(weiAmount);
}

// AFTER (FIXED):
private getHourlyMinorUnits(lease: StoredLease): bigint {
  // Terms is now an object: { paymentAmount: string }
  const terms = typeof lease.agreement.terms === 'string' 
    ? JSON.parse(lease.agreement.terms) 
    : lease.agreement.terms;
  
  const paymentAmount = terms?.paymentAmount || '0';
  return BigInt(paymentAmount);  // Already in minor units, no conversion needed
}
```

### Fix 3: revenue-service.ts — Fix USDC formatting

**File:** `src/services/revenue-service.ts`

In `claimRevenue()` (line 47):

```typescript
// BEFORE:
const amount = claimEvent ? ethers.formatEther(claimEvent.args.share) : '0';

// AFTER:
const amount = claimEvent ? ethers.formatUnits(claimEvent.args.share, 6) : '0';
```

In `getClaimableAmount()` (line 60):

```typescript
// BEFORE:
return ethers.formatEther(amount);

// AFTER:
return ethers.formatUnits(amount, 6);
```

### Fix 4: types/lease.ts — Remove unsafe number type

**File:** `src/types/lease.ts`

```typescript
// BEFORE:
export interface LeaseData {
  rentAmount: bigint | string | number;  // number is unsafe for uint256
  // ...
}

// AFTER:
export interface LeaseData {
  rentAmount: bigint | string;  // Remove number
  // ...
}
```

---

## Summary of Issues

| # | Issue | Severity | Fix Location |
|---|-------|----------|--------------|
| 1 | `terms` is string, not object | **CRITICAL** | lease-service.ts + payment-service.ts |
| 2 | `formatEther` instead of `formatUnits(6)` | **HIGH** | lease-service.ts, revenue-service.ts |
| 3 | `number` type for uint256 | **MEDIUM** | types/lease.ts |
| 4 | Missing `paymentAmount` in stored terms | **CRITICAL** | lease-service.ts |

---

## Recommended Actions

1. **Immediate:** Deploy fixes #1 and #2 — payment system is broken
2. **Testing:** Add unit tests validating decimal conversion at each layer
3. **Type Safety:** Consider using `neverthrow` or `zod` for runtime validation
4. **Monitoring:** Add alerts for zero-amount payments (should never happen)