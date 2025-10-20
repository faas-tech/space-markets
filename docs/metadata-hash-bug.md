# LeaseFactory Metadata Hash Bug

## Executive Summary

The `LeaseFactory` contract has an inconsistency in its EIP-712 signature implementation where the `LEASE_TYPEHASH` string declares a `metadataHash` field that is neither present in the struct definition nor included in the digest encoding. This prevents standard EIP-712 signing tools from generating valid signatures and requires offchain workarounds.

Additionally, the `mintLease()` function has an access control bug that requires granting excessive permissions to the Marketplace contract.

---

## Technical Description

### Bug 1: EIP-712 TYPEHASH and Encoding Mismatch

#### The Problem

The `LeaseFactory` contract's EIP-712 implementation has three components that don't align:

1. **TYPEHASH String** (Line 50-52) - Declares 12 fields including `metadataHash`
2. **Lease Struct** (Line 30-43) - Has 13 fields but NO `metadataHash` field, only `Metadata[] metadata` array
3. **_digest() Encoding** (Line 71-87) - Encodes only 11 fields, skipping `metadataHash`

#### Code Evidence

**File: `src/LeaseFactory.sol`**

```solidity
// Lines 30-43: Struct Definition
struct Lease {
    address lessor;
    address lessee;
    uint256 assetId;
    address paymentToken;
    uint256 rentAmount;
    uint256 rentPeriod;
    uint256 securityDeposit;
    uint64 startTime;
    uint64 endTime;
    bytes32 legalDocHash;
    uint16 termsVersion;
    Metadata[] metadata;  // ← ARRAY, not bytes32 metadataHash
}

// Lines 50-52: TYPEHASH declares metadataHash
bytes32 private constant LEASE_TYPEHASH = keccak256(
    "Lease(address lessor,address lessee,uint256 assetId,address paymentToken,uint256 rentAmount,uint256 rentPeriod,uint256 securityDeposit,uint64 startTime,uint64 endTime,bytes32 metadataHash,bytes32 legalDocHash,uint16 termsVersion)"
    //                                                                                                                                                               ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑
);

// Lines 72-86: Encoding skips metadataHash
bytes32 leaseHash = keccak256(
    abi.encode(
        LEASE_TYPEHASH,
        L.lease.lessor,
        L.lease.lessee,
        L.lease.assetId,
        L.lease.paymentToken,
        L.lease.rentAmount,
        L.lease.rentPeriod,
        L.lease.securityDeposit,
        L.lease.startTime,
        L.lease.endTime,
        L.lease.legalDocHash,  // ← metadataHash SKIPPED
        L.lease.termsVersion
    )
);
```

#### Impact

**Standard EIP-712 signing fails:**

```typescript
// This DOES NOT WORK with current contract
const types = {
  Lease: [
    { name: 'lessor', type: 'address' },
    // ... other fields ...
    { name: 'metadataHash', type: 'bytes32' },  // Ethers will encode this
    { name: 'legalDocHash', type: 'bytes32' },
    { name: 'termsVersion', type: 'uint16' },
  ]
};

const signature = await signer.signTypedData(domain, types, leaseIntent);
// ❌ Signature will be INVALID - ethers encodes 12 fields, contract expects 11
```

**Current Workaround Required:**

```typescript
// Must use contract's helper to get the actual digest it will verify
const digest = await leaseFactory.hashLeaseIntent(leaseIntentFull);

// Sign raw digest instead of using standard EIP-712
const signingKey = new ethers.SigningKey(signer.privateKey);
const sig = signingKey.sign(digest);
const signature = ethers.Signature.from(sig).serialized;
// ✓ Works but bypasses EIP-712 standard tooling
```

#### Why This Happened

The contract appears to be in transition between two designs:
- **Old design**: Had `bytes32 metadataHash` as a struct field (evident in TYPEHASH)
- **New design**: Uses `Metadata[] metadata` array for flexible storage
- **Bug**: TYPEHASH wasn't updated to match the new struct

---

### Bug 2: Access Control in mintLease()

#### The Problem

The `mintLease()` function calls the public `setMetadata()` which has `onlyRole(DEFAULT_ADMIN_ROLE)` access control, but `mintLease()` itself is public and should be callable by anyone with valid signatures.

#### Code Evidence

**File: `src/LeaseFactory.sol`**

```solidity
// Line 123: mintLease() calls public setMetadata()
function mintLease(LeaseIntent calldata L, bytes calldata sigLessor, bytes calldata sigLessee)
    external  // ← Anyone can call
    returns (uint256 tokenId)
{
    // ... signature verification ...

    setMetadata(keccak256(abi.encodePacked(tokenId)), L.lease.metadata);
    //          ↑↑↑↑↑↑↑↑↑↑↑
    // This function has onlyRole(DEFAULT_ADMIN_ROLE) - will revert!
}

// Line 150: setMetadata requires admin role
function setMetadata(uint256 tokenId, Metadata[] calldata metadata_)
    external
    onlyRole(DEFAULT_ADMIN_ROLE)  // ← Requires admin
{
    require(_ownerOf(tokenId) != address(0), "token not minted");
    super.setMetadata(getTokenIdHash(tokenId), metadata_);
}
```

**File: `src/MetadataStorage.sol`**

```solidity
// Line 44: Internal version exists without access control
function _setMetadata(bytes32 hash, Metadata[] memory metadata_) internal {
    // ... implementation ...
}

// Line 64: Public version has access control
function setMetadata(bytes32 hash, Metadata[] memory metadata_)
    public
    onlyRole(DEFAULT_ADMIN_ROLE)
{
    _setMetadata(hash, metadata_);
}
```

#### Impact

When `Marketplace.acceptLeaseBid()` calls `LeaseFactory.mintLease()`, it fails with:
```
AccessControlUnauthorizedAccount(0x...marketplace, 0x0000...0000)
```

**Current Workaround Required:**

```typescript
// Must grant marketplace contract admin role on LeaseFactory
const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
await leaseFactory.grantRole(DEFAULT_ADMIN_ROLE, marketplaceAddr);
```

This is a security concern as it grants excessive permissions to the marketplace contract.

---

## Example: Current vs Expected Behavior

### Current Broken Behavior

```typescript
// ❌ FAILS - Standard EIP-712 signing produces invalid signature
const signature = await lessor.signTypedData(domain, types, {
  deadline: deadline,
  assetTypeSchemaHash: schemaHash,
  lease: {
    lessor: lessor.address,
    lessee: lessee.address,
    // ... other fields ...
    metadataHash: metadataHash,  // Ethers includes this in encoding
    legalDocHash: legalDocHash,
    termsVersion: 1,
  }
});

await marketplace.acceptLeaseBid(offerId, bidIndex, signature);
// Reverts: "lessor sig invalid"
```

### Expected Behavior After Fix

```typescript
// ✅ WORKS - Standard EIP-712 signing produces valid signature
const signature = await lessor.signTypedData(domain, types, leaseIntent);

await marketplace.acceptLeaseBid(offerId, bidIndex, signature);
// Success: Lease NFT minted and transferred
```

---

## Recommended Solutions

We have two viable approaches to fix these bugs. Both require smart contract modifications.

---

## Option A: Remove `metadataHash` from Signature (Simpler)

### Philosophy
Metadata is stored onchain and can be verified after signing. It doesn't need to be part of the cryptographic commitment.

### Contract Changes Required

#### 1. Fix TYPEHASH (Line 50-52)

**Remove `bytes32 metadataHash,` from the type string:**

```solidity
// Before:
bytes32 private constant LEASE_TYPEHASH = keccak256(
    "Lease(address lessor,address lessee,uint256 assetId,address paymentToken,uint256 rentAmount,uint256 rentPeriod,uint256 securityDeposit,uint64 startTime,uint64 endTime,bytes32 metadataHash,bytes32 legalDocHash,uint16 termsVersion)"
);

// After:
bytes32 private constant LEASE_TYPEHASH = keccak256(
    "Lease(address lessor,address lessee,uint256 assetId,address paymentToken,uint256 rentAmount,uint256 rentPeriod,uint256 securityDeposit,uint64 startTime,uint64 endTime,bytes32 legalDocHash,uint16 termsVersion)"
);
```

#### 2. Fix Access Control (Line 123)

**Use internal `_setMetadata()` instead of public `setMetadata()`:**

```solidity
// Before:
setMetadata(keccak256(abi.encodePacked(tokenId)), L.lease.metadata);

// After:
_setMetadata(keccak256(abi.encodePacked(tokenId)), L.lease.metadata);
```

### Offchain Changes Required

#### Remove Workarounds

```typescript
// Remove manual digest computation
// Remove SigningKey direct signing
// Remove marketplace admin role grant
```

#### Use Standard EIP-712 Signing

```typescript
const types = {
  LeaseIntent: [
    { name: 'deadline', type: 'uint64' },
    { name: 'assetTypeSchemaHash', type: 'bytes32' },
    { name: 'lease', type: 'Lease' },
  ],
  Lease: [
    { name: 'lessor', type: 'address' },
    { name: 'lessee', type: 'address' },
    { name: 'assetId', type: 'uint256' },
    { name: 'paymentToken', type: 'address' },
    { name: 'rentAmount', type: 'uint256' },
    { name: 'rentPeriod', type: 'uint256' },
    { name: 'securityDeposit', type: 'uint256' },
    { name: 'startTime', type: 'uint64' },
    { name: 'endTime', type: 'uint64' },
    // metadataHash REMOVED
    { name: 'legalDocHash', type: 'bytes32' },
    { name: 'termsVersion', type: 'uint16' },
  ],
};

// Lease intent for signing (no metadata)
const leaseIntentToSign = {
  deadline: deadline,
  assetTypeSchemaHash: schemaHash,
  lease: {
    lessor: lessorAddress,
    lessee: lesseeAddress,
    assetId: assetId,
    paymentToken: paymentToken,
    rentAmount: rentAmount,
    rentPeriod: rentPeriod,
    securityDeposit: securityDeposit,
    startTime: startTime,
    endTime: endTime,
    // NO metadataHash
    legalDocHash: legalDocHash,
    termsVersion: termsVersion,
  },
};

// Standard signing works!
const signature = await signer.signTypedData(domain, types, leaseIntentToSign);

// Contract call includes metadata array (not signed)
const leaseIntentForContract = {
  ...leaseIntentToSign,
  lease: {
    ...leaseIntentToSign.lease,
    metadata: [  // Added for storage
      { key: 'compute_allocation_cores', value: '32' },
      { key: 'memory_allocation_gb', value: '256' },
    ],
  },
};

await leaseFactory.mintLease(leaseIntentForContract, signature1, signature2);
```

### Pros

✅ **Simpler implementation** - Fewer fields to manage
✅ **Standard EIP-712** - Works with all standard tooling
✅ **Cleaner separation** - Signature commits to core terms, metadata stored separately
✅ **Flexible** - Metadata can potentially be updated without re-signing (if needed)
✅ **Smaller payloads** - Don't need to compute and transmit hash

### Cons

⚠️ **Less cryptographic binding** - Metadata not committed in signature
⚠️ **Trust required** - Must trust metadata won't be changed maliciously
⚠️ **Potential disputes** - No proof that both parties agreed to specific metadata values

### When to Choose Option A

- Metadata is **informational** rather than critical to agreement
- You have **governance mechanisms** to handle metadata disputes
- You want **maximum simplicity** in integration
- You might need to **update metadata** post-signing in some scenarios

---

## Option B: Include `metadataHash` in Signature (More Secure)

### Philosophy
Metadata contains critical lease terms (CPU cores, storage allocation, etc.). Both parties should cryptographically commit to these values.

### Contract Changes Required

#### 1. Add `metadataHash` Field to Struct (After Line 39)

```solidity
// Before:
struct Lease {
    address lessor;
    address lessee;
    uint256 assetId;
    address paymentToken;
    uint256 rentAmount;
    uint256 rentPeriod;
    uint256 securityDeposit;
    uint64 startTime;
    uint64 endTime;
    bytes32 legalDocHash;
    uint16 termsVersion;
    Metadata[] metadata;
}

// After:
struct Lease {
    address lessor;
    address lessee;
    uint256 assetId;
    address paymentToken;
    uint256 rentAmount;
    uint256 rentPeriod;
    uint256 securityDeposit;
    uint64 startTime;
    uint64 endTime;
    bytes32 metadataHash;  // ← ADD THIS
    bytes32 legalDocHash;
    uint16 termsVersion;
    Metadata[] metadata;   // Stored, verified against hash
}
```

#### 2. Include `metadataHash` in Encoding (After Line 83)

```solidity
// Before:
bytes32 leaseHash = keccak256(
    abi.encode(
        LEASE_TYPEHASH,
        L.lease.lessor,
        L.lease.lessee,
        L.lease.assetId,
        L.lease.paymentToken,
        L.lease.rentAmount,
        L.lease.rentPeriod,
        L.lease.securityDeposit,
        L.lease.startTime,
        L.lease.endTime,
        L.lease.legalDocHash,
        L.lease.termsVersion
    )
);

// After:
bytes32 leaseHash = keccak256(
    abi.encode(
        LEASE_TYPEHASH,
        L.lease.lessor,
        L.lease.lessee,
        L.lease.assetId,
        L.lease.paymentToken,
        L.lease.rentAmount,
        L.lease.rentPeriod,
        L.lease.securityDeposit,
        L.lease.startTime,
        L.lease.endTime,
        L.lease.metadataHash,  // ← ADD THIS
        L.lease.legalDocHash,
        L.lease.termsVersion
    )
);
```

#### 3. Verify Metadata Hash (After Line 109)

```solidity
function mintLease(LeaseIntent calldata L, bytes calldata sigLessor, bytes calldata sigLessee)
    external
    returns (uint256 tokenId)
{
    require(block.timestamp <= L.deadline, "expired");
    require(L.lease.startTime < L.lease.endTime, "startTime > endTime");
    require(REGISTRY.assetExists(L.lease.assetId), "asset !exists");

    // ADD THIS: Verify metadata hash matches array
    bytes32 computedHash = keccak256(abi.encode(L.lease.metadata));
    require(computedHash == L.lease.metadataHash, "metadata hash mismatch");

    // verify both signatures
    bytes32 d = _digest(L);
    require(ECDSA.recover(d, sigLessor) == L.lease.lessor, "lessor sig invalid");
    require(ECDSA.recover(d, sigLessee) == L.lease.lessee, "lessee sig invalid");

    // ... rest of function
}
```

#### 4. Fix Access Control (Line 123)

Same as Option A:

```solidity
_setMetadata(keccak256(abi.encodePacked(tokenId)), L.lease.metadata);
```

### Offchain Changes Required

#### Compute Metadata Hash Before Signing

```typescript
// Metadata for the lease
const leaseMetadata = [
  { key: 'compute_allocation_cores', value: '32' },
  { key: 'memory_allocation_gb', value: '256' },
  { key: 'storage_allocation_tb', value: '50' },
];

// Compute hash (MUST match contract's computation)
const metadataHash = ethers.keccak256(
  ethers.AbiCoder.defaultAbiCoder().encode(
    ['tuple(string key, string value)[]'],
    [leaseMetadata]
  )
);
```

#### Use Standard EIP-712 Signing with Hash

```typescript
const types = {
  LeaseIntent: [
    { name: 'deadline', type: 'uint64' },
    { name: 'assetTypeSchemaHash', type: 'bytes32' },
    { name: 'lease', type: 'Lease' },
  ],
  Lease: [
    { name: 'lessor', type: 'address' },
    { name: 'lessee', type: 'address' },
    { name: 'assetId', type: 'uint256' },
    { name: 'paymentToken', type: 'address' },
    { name: 'rentAmount', type: 'uint256' },
    { name: 'rentPeriod', type: 'uint256' },
    { name: 'securityDeposit', type: 'uint256' },
    { name: 'startTime', type: 'uint64' },
    { name: 'endTime', type: 'uint64' },
    { name: 'metadataHash', type: 'bytes32' },  // ← INCLUDED
    { name: 'legalDocHash', type: 'bytes32' },
    { name: 'termsVersion', type: 'uint16' },
  ],
};

// Lease intent for signing (includes hash, not array)
const leaseIntentToSign = {
  deadline: deadline,
  assetTypeSchemaHash: schemaHash,
  lease: {
    lessor: lessorAddress,
    lessee: lesseeAddress,
    assetId: assetId,
    paymentToken: paymentToken,
    rentAmount: rentAmount,
    rentPeriod: rentPeriod,
    securityDeposit: securityDeposit,
    startTime: startTime,
    endTime: endTime,
    metadataHash: metadataHash,  // ← Hash in signature
    legalDocHash: legalDocHash,
    termsVersion: termsVersion,
  },
};

// Standard signing works!
const signature = await signer.signTypedData(domain, types, leaseIntentToSign);

// Contract call includes both hash and array
const leaseIntentForContract = {
  ...leaseIntentToSign,
  lease: {
    ...leaseIntentToSign.lease,
    metadata: leaseMetadata,  // ← Array verified against hash
  },
};

await leaseFactory.mintLease(leaseIntentForContract, signature1, signature2);
```

### Pros

✅ **Cryptographic commitment** - Both parties explicitly agree to metadata
✅ **Immutable** - Can't change metadata without invalidating signatures
✅ **Security** - Prevents metadata manipulation disputes
✅ **Standard EIP-712** - Still works with standard tooling
✅ **Contract verification** - Hash is validated against array onchain
✅ **Maintains TYPEHASH** - Already declared, just needs to be used correctly

### Cons

⚠️ **More complex** - Must compute hash correctly before signing
⚠️ **Larger payloads** - Both hash and array transmitted
⚠️ **Less flexible** - Can't update metadata without re-signing
⚠️ **Hash computation must match** - Offchain and onchain must use identical encoding

### When to Choose Option B

- Metadata contains **critical lease terms** (resource allocations, service levels)
- You need **cryptographic proof** of what both parties agreed to
- You want to **prevent disputes** about metadata values
- **Security and immutability** are more important than flexibility

---

## Recommendation

**We recommend Option B (Include metadataHash)** for the following reasons:

1. **Metadata is critical** - Resource allocations (CPU cores, storage, bandwidth) are fundamental lease terms, not optional metadata
2. **Prevents disputes** - Both parties have cryptographic proof of exactly what was agreed
3. **Security first** - Better to require re-signing than allow silent metadata changes
4. **Already designed** - The TYPEHASH already includes metadataHash, we just need to implement it correctly
5. **Standard compliance** - Still uses standard EIP-712 with proper tooling support

The additional complexity of computing the metadata hash is minimal compared to the security benefits of having both parties cryptographically commit to all lease terms.

---

## Implementation Checklist

### For Option A (Simple)

- [ ] Update `LEASE_TYPEHASH` to remove `metadataHash`
- [ ] Change `mintLease()` to call `_setMetadata()` instead of `setMetadata()`
- [ ] Update offchain signing to use standard EIP-712 without metadataHash
- [ ] Remove marketplace admin role grant from deployment scripts
- [ ] Update tests to match new signature format
- [ ] Update documentation

### For Option B (Recommended)

- [ ] Add `bytes32 metadataHash` field to `Lease` struct
- [ ] Update `_digest()` to encode `metadataHash`
- [ ] Add metadata hash verification in `mintLease()`
- [ ] Change `mintLease()` to call `_setMetadata()` instead of `setMetadata()`
- [ ] Update offchain code to compute metadata hash before signing
- [ ] Update offchain signing to include metadataHash in EIP-712 types
- [ ] Remove marketplace admin role grant from deployment scripts
- [ ] Update tests to compute and verify metadata hashes
- [ ] Update documentation with hash computation examples

---

## Testing Plan

Regardless of which option is chosen:

1. **Unit Tests**
   - Verify signature validation with correct format
   - Verify signature rejection with incorrect format
   - Test metadata storage and retrieval
   - Test access control (no admin grant needed)

2. **Integration Tests**
   - Test full marketplace flow with real signatures
   - Test with multiple bidders
   - Test signature expiry
   - Test invalid signature rejection

3. **Gas Analysis**
   - Measure gas cost changes
   - Compare Option A vs Option B costs

4. **Security Review**
   - Verify signature validation logic
   - Check for replay attack vectors
   - Validate metadata integrity (Option B only)

---

## Migration Strategy

If deploying to production:

1. **Deploy new LeaseFactory** with chosen fix
2. **Deploy new Marketplace** pointing to new LeaseFactory
3. **Update AssetRegistry** to recognize new LeaseFactory
4. **Migrate existing leases** (if any) or mark old factory as deprecated
5. **Update all offchain systems** with new signing logic
6. **Document breaking changes** for integrators
7. **Deprecate old contracts** after migration period

---

## Questions for Review

1. **Metadata Criticality**: Are the metadata values (CPU cores, storage, etc.) critical enough to require cryptographic commitment? (Affects Option A vs B choice)

2. **Update Scenarios**: Are there any legitimate scenarios where metadata should be updateable after signing? (Favors Option A)

3. **Gas Costs**: Is the additional gas cost of hash verification (Option B) acceptable? (Approximately +2-3k gas per mint)

4. **Integration Complexity**: How many integrators exist and what is their tolerance for migration complexity?

5. **Security vs Flexibility**: Which is more important for this protocol - maximum security or operational flexibility?

---

## Files to Modify

### Smart Contracts

- `src/LeaseFactory.sol` - Both bugs fixed here
- `test/*.t.sol` - Update all test files with new signature format

### Offchain Systems

- `test/offchain/src/enhanced-demo.ts` - Remove workarounds, use standard signing
- Any production integration code using signatures

### Documentation

- API documentation for signature generation
- Integration guides for dApp developers
- Contract deployment scripts

---

## Contact

For questions or discussion about this bug and proposed solutions, please contact the development team.
