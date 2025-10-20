# Offchain Code Compatibility with 1-refactor Smart Contracts

## Executive Summary

✅ **YES - We can make our offchain code work cleanly with the new contracts**

The issue is simple: We need to pass the **AssetRegistry contract address** as the `admin` parameter when calling `registerAsset()`, instead of passing the deployer's address.

This is not a workaround - it's the correct usage pattern for the current contract design.

---

## The Problem

### Current Offchain Code

```typescript
// test/offchain/demos/05-complete-system.ts Line 346-354
tx = await assetRegistry.registerAsset(
  SCHEMA_HASHES.ORBITAL_COMPUTE,
  'OCS-Primary Token',
  'OCS1',
  ethers.parseEther('1000000'),
  deployer.address,        // ← admin parameter
  deployer.address,        // ← tokenRecipient parameter
  metadata,
  { nonce: nonce++ }
);
```

### What Happens in the Contracts

```solidity
// AssetRegistry.registerAsset() - Line 87
AssetERC20 token = new AssetERC20(
    tokenName,
    tokenSymbol,
    totalSupply,
    newAssetId,
    admin,              // ← From function parameter
    tokenRecipient,
    metadata
);

// Inside AssetERC20 constructor - Lines 40-43
ASSET_ID = assetId;
_grantRole(DEFAULT_ADMIN_ROLE, admin);      // ← Grants to 'admin' parameter
_mint(tokenRecipient, totalSupply);
setMetadata(..., metadata);                  // ← Requires DEFAULT_ADMIN_ROLE
```

**The Issue:**
- `msg.sender` in constructor = AssetRegistry contract (0x123...)
- `admin` parameter = deployer.address (0xabc...)
- Role granted to deployer (0xabc...)
- `setMetadata()` checks if `msg.sender` (0x123...) has role
- AssetRegistry doesn't have role → **REVERT**

---

## The Solution

### Simple Fix: Pass AssetRegistry Address as Admin

```typescript
// Get AssetRegistry address after deployment
const assetRegistryAddr = await assetRegistry.getAddress();

// Use AssetRegistry as admin so it has permission during construction
tx = await assetRegistry.registerAsset(
  SCHEMA_HASHES.ORBITAL_COMPUTE,
  'OCS-Primary Token',
  'OCS1',
  ethers.parseEther('1000000'),
  assetRegistryAddr,       // ← Changed: AssetRegistry is admin
  deployer.address,        // ← Unchanged: deployer gets tokens
  metadata,
  { nonce: nonce++ }
);
```

### Why This Works

```solidity
// Inside AssetERC20 constructor
_grantRole(DEFAULT_ADMIN_ROLE, admin);  // Now grants to AssetRegistry (msg.sender)
_mint(tokenRecipient, totalSupply);     // Deployer still gets tokens
setMetadata(..., metadata);             // msg.sender (AssetRegistry) has role ✓
```

### After Construction

Once the AssetERC20 is deployed:
- AssetRegistry has DEFAULT_ADMIN_ROLE on the token
- Deployer has 100% of token supply
- Metadata is set correctly

If we want the deployer to have admin role too, we can grant it separately:

```typescript
// After registration
const assetToken = new ethers.Contract(tokenAddress, AssetERC20ABI, deployer);
const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;

// AssetRegistry grants role to deployer
await assetRegistry.grantTokenRole(
  tokenAddress,
  DEFAULT_ADMIN_ROLE,
  deployer.address
);
// OR if AssetRegistry doesn't have this helper:
await assetToken.connect(assetRegistry).grantRole(DEFAULT_ADMIN_ROLE, deployer.address);
```

But actually, we need to check if AssetRegistry can even call this... Let me think about the role management more carefully.

---

## Deeper Analysis: Role Management Strategy

### Option A: AssetRegistry as Permanent Admin (Recommended)

**Approach:** AssetRegistry keeps admin role on all asset tokens

```typescript
const assetRegistryAddr = await assetRegistry.getAddress();

tx = await assetRegistry.registerAsset(
  schemaHash,
  'Token Name',
  'SYMBOL',
  totalSupply,
  assetRegistryAddr,    // AssetRegistry is admin
  deployer.address,     // Deployer gets tokens
  metadata
);
```

**Pros:**
- ✅ Works immediately with current contracts
- ✅ Clean, no extra transactions needed
- ✅ AssetRegistry can manage all asset tokens centrally
- ✅ Makes sense architecturally - registry manages assets

**Cons:**
- ⚠️ Asset owners don't have admin role on their tokens
- ⚠️ Can't update metadata without going through AssetRegistry

**When to use:** If metadata is meant to be immutable after registration, or if AssetRegistry should be the central authority.

---

### Option B: Transfer Admin Role After Registration

**Approach:** AssetRegistry creates token, then transfers admin role to asset owner

This requires adding a helper function to AssetRegistry:

```solidity
// Add to AssetRegistry.sol
function transferAssetAdmin(uint256 assetId, address newAdmin)
    external
    onlyRole(REGISTRAR_ROLE)
{
    Asset storage asset = _assets[assetId];
    require(asset.tokenAddress != address(0), "asset !exists");

    AssetERC20 token = AssetERC20(asset.tokenAddress);
    bytes32 ADMIN_ROLE = 0x0000000000000000000000000000000000000000000000000000000000000000;

    // Grant new admin
    token.grantRole(ADMIN_ROLE, newAdmin);
    // Revoke from AssetRegistry
    token.revokeRole(ADMIN_ROLE, address(this));
}
```

Then in offchain code:

```typescript
// Step 1: Register with AssetRegistry as admin
const assetRegistryAddr = await assetRegistry.getAddress();
tx = await assetRegistry.registerAsset(
  schemaHash,
  'Token Name',
  'SYMBOL',
  totalSupply,
  assetRegistryAddr,    // AssetRegistry is temporary admin
  deployer.address,
  metadata
);
const receipt = await tx.wait();
const assetId = parseAssetIdFromReceipt(receipt);

// Step 2: Transfer admin to actual owner
await assetRegistry.transferAssetAdmin(assetId, deployer.address);
```

**Pros:**
- ✅ Works with current contracts
- ✅ Asset owners get full control
- ✅ Clean role transition

**Cons:**
- ⚠️ Requires adding function to AssetRegistry (contract modification)
- ⚠️ Extra transaction and gas cost
- ⚠️ Two-step process

**When to use:** If asset owners need admin control over their tokens.

---

### Option C: Custom Role for Metadata Management

**Approach:** Create a METADATA_MANAGER_ROLE that doesn't require full admin

This requires modifying MetadataStorage:

```solidity
// In MetadataStorage.sol
bytes32 public constant METADATA_MANAGER_ROLE = keccak256("METADATA_MANAGER_ROLE");

function setMetadata(bytes32 hash, Metadata[] memory metadata_)
    public
    onlyRole(METADATA_MANAGER_ROLE)  // Changed from DEFAULT_ADMIN_ROLE
{
    // ... implementation
}
```

And AssetERC20:

```solidity
constructor(...) {
    ASSET_ID = assetId;
    _grantRole(DEFAULT_ADMIN_ROLE, admin);
    _grantRole(METADATA_MANAGER_ROLE, msg.sender);  // Grant to deployer (AssetRegistry)
    _mint(tokenRecipient, totalSupply);
    setMetadata(..., metadata);  // Now checks METADATA_MANAGER_ROLE
}
```

**Pros:**
- ✅ Separation of concerns
- ✅ AssetRegistry can set metadata without full admin
- ✅ Asset owner gets admin role from start

**Cons:**
- ⚠️ Requires contract modifications
- ⚠️ More complex role management
- ⚠️ Need to consider who should have metadata manager role long-term

**When to use:** If you want fine-grained permission management.

---

## Recommended Approach: Option A

**Use AssetRegistry as the admin for all asset tokens.**

### Implementation

#### 1. Update Demo Script

```typescript
// test/offchain/demos/05-complete-system.ts

// After AssetRegistry deployment (around line 140)
const assetRegistryAddr = await assetRegistry.getAddress();

// Store for later use
explanation('AssetRegistry will be admin of all asset tokens', 1);
detail('Registry Address', assetRegistryAddr, 1);

// Later in asset registration (around line 346)
tx = await assetRegistry.registerAsset(
  SCHEMA_HASHES.ORBITAL_COMPUTE,
  'OCS-Primary Token',
  'OCS1',
  ethers.parseEther('1000000'),
  assetRegistryAddr,        // ← Changed: Registry is admin
  deployer.address,         // ← Unchanged: Deployer gets tokens
  metadata,
  { nonce: nonce++ }
);

explanation('AssetRegistry has admin role on token contract', 1);
explanation('Deployer owns 100% of token supply', 1);
explanation('This allows registry to manage metadata centrally', 1);
```

#### 2. Update Other Files

Search for all `registerAsset` calls and update the `admin` parameter:

```bash
# Files to check and update:
test/offchain/demos/05-complete-system.ts
test/offchain/demos/01-simple-workflow.ts
test/offchain/scripts/test-register-asset.ts
test/offchain/scripts/demo-workflow.ts
test/offchain/src/core/blockchain-client.ts
test/offchain/src/integration/blockchain-refactored.ts
# ... and any others found
```

Pattern to change:
```typescript
// Before:
deployer.address,  // admin parameter
deployer.address,  // tokenRecipient parameter

// After:
assetRegistryAddr, // admin parameter
deployer.address,  // tokenRecipient parameter
```

---

## Testing the Fix

### 1. Compile Contracts

```bash
forge build
# Should compile successfully
```

### 2. Run Foundry Tests

```bash
forge test --match-path test/AssetCreationAndRegistration.t.sol -vv
```

**Expected:** Tests will still fail because Foundry tests likely have the same issue.

### 3. Update Foundry Test

```solidity
// test/AssetCreationAndRegistration.t.sol

function test_04_RegisterOCSPrimaryInstance() public {
    // ... setup ...

    vm.prank(registrar);
    (uint256 assetId, address tokenAddr) = assetRegistry.registerAsset(
        computeSchemaHash,
        "OCS-Primary Token",
        "OCS1",
        1_000_000 * 1e18,
        address(assetRegistry),  // ← Changed: Registry is admin
        owner,                    // ← Owner gets tokens
        metadata
    );

    // ... assertions ...
}
```

### 4. Run Offchain Demo

```bash
# Start Anvil
anvil

# In another terminal
cd test/offchain
npx tsx demos/05-complete-system.ts
```

**Expected:** Should run successfully end-to-end.

---

## Why This is NOT a Workaround

This is the **correct** usage pattern because:

1. **AssetRegistry deploys the token** - It's `msg.sender` in the constructor
2. **AssetRegistry needs the role** - To call `setMetadata()` during construction
3. **Architecturally sound** - Registry managing registered assets makes sense
4. **No special cases** - Just using the role system as designed

The previous code (passing `deployer.address` as admin) only worked because there was an internal `_setMetadata()` function that bypassed access control. With that removed, we must use the access control system properly.

---

## Alternative: If Asset Owners MUST Have Admin Role

If the business logic requires asset owners to have admin control from the start, then:

### Contract Change Needed

Modify `AssetERC20.sol` constructor:

```solidity
constructor(
    string memory name,
    string memory symbol,
    uint256 totalSupply,
    uint256 assetId,
    address admin,
    address tokenRecipient,
    Metadata[] memory metadata
) ERC20(name, symbol) EIP712(name, "1") {
    ASSET_ID = assetId;
    _grantRole(DEFAULT_ADMIN_ROLE, admin);
    _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);  // ← ADD THIS: Grant to deployer too
    _mint(tokenRecipient, totalSupply);
    setMetadata(keccak256(abi.encodePacked(ASSET_ID)), metadata);
    _revokeRole(DEFAULT_ADMIN_ROLE, msg.sender);  // ← ADD THIS: Remove deployer's role
}
```

**What this does:**
1. Grants admin to the `admin` parameter (asset owner)
2. Temporarily grants admin to `msg.sender` (AssetRegistry) for constructor
3. Calls `setMetadata()` - AssetRegistry has role ✓
4. Revokes AssetRegistry's role before constructor ends

**Result:**
- Only the asset owner has admin role
- Metadata is set during construction
- No role management needed in offchain code

### Offchain Code

```typescript
// Can use deployer.address as admin again
tx = await assetRegistry.registerAsset(
  schemaHash,
  'Token Name',
  'SYMBOL',
  totalSupply,
  deployer.address,   // Owner gets admin role
  deployer.address,   // Owner gets tokens
  metadata
);
```

**This requires modifying the smart contract** - but it's a clean solution that gives asset owners full control while allowing metadata to be set during construction.

---

## Recommendation Summary

### Best Approach (No Contract Changes)

**Use Option A:** Pass AssetRegistry address as admin parameter

- ✅ Works immediately
- ✅ No contract modifications
- ✅ Clean architecture
- ✅ Simple offchain code changes

### If Asset Owners Need Admin (Requires Contract Change)

**Add temporary role grant in constructor:**

```solidity
_grantRole(DEFAULT_ADMIN_ROLE, msg.sender);  // Temp grant
setMetadata(...);
_revokeRole(DEFAULT_ADMIN_ROLE, msg.sender);  // Remove
```

---

## Implementation Checklist

### Immediate (Option A - No Contract Changes)

- [ ] Update `test/offchain/demos/05-complete-system.ts` - Change admin parameter
- [ ] Update `test/offchain/demos/01-simple-workflow.ts` - Change admin parameter
- [ ] Update all other offchain files calling `registerAsset()`
- [ ] Update Foundry tests to use `address(assetRegistry)` as admin
- [ ] Test: Run `forge test`
- [ ] Test: Run offchain demo
- [ ] Document: Add explanation in demo about role management
- [ ] Verify: All tests pass

### If Needed (Asset Owner Admin - Requires Contract Change)

- [ ] Modify `src/AssetERC20.sol` constructor (temp role grant/revoke)
- [ ] Test contract changes in Foundry
- [ ] Coordinate with colleague to include in `1-refactor` branch
- [ ] Keep offchain code using `deployer.address` as admin

---

## Conclusion

✅ **We can absolutely make the offchain code work cleanly with these contracts.**

The fix is simple and architecturally sound: Pass the AssetRegistry contract address as the `admin` parameter instead of the deployer's address. This is not a workaround - it's the correct usage pattern for how the contracts now work.

No internal functions needed, no complex role management, just using the access control system as designed.
