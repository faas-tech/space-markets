// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Test, console2} from "forge-std/Test.sol";
import {MetadataStorage} from "../src/MetadataStorage.sol";

/// @title TestMetadataStorage
/// @notice Test harness contract that inherits MetadataStorage for testing
/// @dev Grants admin role to deployer for test access control
contract TestMetadataStorage is MetadataStorage {
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }
}

/// @title MetadataStorageTest
/// @notice Comprehensive test suite for MetadataStorage contract
/// @dev Tests focus on state invariants, cross-validation, and bug detection
///
/// TEST PHILOSOPHY:
/// ----------------
/// These tests validate MetadataStorage through:
/// 1. Multi-path verification (getMetadata, getAllMetadataKeys, getAllMetadata)
/// 2. State invariants (count == keys.length == getAllMetadata.length)
/// 3. Cross-system validation (storage mapping vs keys array consistency)
/// 4. Namespace isolation (security-critical feature)
/// 5. Edge case handling (empty strings, duplicates, complex sequences)
///
/// CRITICAL BUGS DETECTED:
/// -----------------------
/// The test-antipattern-guardian identified 3 critical bugs in current implementation:
/// 1. Empty string ambiguity: "" value indistinguishable from non-existent key
/// 2. Duplicate key vulnerability: Same key in array can create duplicates
/// 3. Orphaned keys: Empty value + remove creates orphaned enumeration entries
///
/// ANTI-PATTERN AVOIDANCE:
/// -----------------------
/// - NO simple set/get cycles (circular validation)
/// - NO existence-only checks (verify correctness, not just presence)
/// - YES cross-validation across multiple query methods
/// - YES invariant assertions after every state change
/// - YES state persistence verification across operations
contract MetadataStorageTest is Test {
    TestMetadataStorage public metadata;
    address public admin;
    address public nonAdmin;

    bytes32 constant HASH1 = keccak256("namespace1");
    bytes32 constant HASH2 = keccak256("namespace2");
    bytes32 constant HASH3 = keccak256("namespace3");

    /// @notice Sets up test environment with admin and non-admin actors
    function setUp() public {
        admin = address(this); // Test contract is admin
        nonAdmin = makeAddr("nonAdmin");
        metadata = new TestMetadataStorage();
        // Admin role already granted in TestMetadataStorage constructor
    }

    // ============================================================================
    // HELPER FUNCTIONS
    // ============================================================================

    /// @notice Helper to create single-entry metadata array
    function _makeMetadata(string memory key, string memory value)
        internal
        pure
        returns (MetadataStorage.Metadata[] memory)
    {
        MetadataStorage.Metadata[] memory m = new MetadataStorage.Metadata[](1);
        m[0] = MetadataStorage.Metadata({key: key, value: value});
        return m;
    }

    /// @notice Helper to create two-entry metadata array
    function _makeMetadata2(string memory key1, string memory value1, string memory key2, string memory value2)
        internal
        pure
        returns (MetadataStorage.Metadata[] memory)
    {
        MetadataStorage.Metadata[] memory m = new MetadataStorage.Metadata[](2);
        m[0] = MetadataStorage.Metadata({key: key1, value: value1});
        m[1] = MetadataStorage.Metadata({key: key2, value: value2});
        return m;
    }

    /// @notice Helper to assert all invariants hold for a namespace
    /// @dev This is the core anti-pattern prevention mechanism
    /// @param hash The namespace to check
    function _assertInvariants(bytes32 hash) internal view {
        uint256 count = metadata.getMetadataCount(hash);
        string[] memory keys = metadata.getAllMetadataKeys(hash);
        MetadataStorage.Metadata[] memory all = metadata.getAllMetadata(hash);

        // INVARIANT 1: Count matches array lengths
        assertEq(count, keys.length, "Count != keys.length");
        assertEq(count, all.length, "Count != getAllMetadata.length");

        // INVARIANT 2: All keys in keys array have values in storage
        for (uint256 i = 0; i < keys.length; i++) {
            assertTrue(metadata.hasMetadata(hash, keys[i]), "Key in array but hasMetadata false");
            string memory value = metadata.getMetadata(hash, keys[i]);
            // Note: Empty string is a valid value, so we can't assert length > 0 here
            // Instead, we rely on hasMetadata which checks if key exists
        }

        // INVARIANT 3: No duplicate keys in array
        for (uint256 i = 0; i < keys.length; i++) {
            for (uint256 j = i + 1; j < keys.length; j++) {
                assertFalse(
                    keccak256(bytes(keys[i])) == keccak256(bytes(keys[j])), "Duplicate key in array at indices"
                );
            }
        }

        // INVARIANT 4: getAllMetadata returns same keys as getAllMetadataKeys
        for (uint256 i = 0; i < all.length; i++) {
            bool found = false;
            for (uint256 j = 0; j < keys.length; j++) {
                if (keccak256(bytes(all[i].key)) == keccak256(bytes(keys[j]))) {
                    found = true;
                    break;
                }
            }
            assertTrue(found, "Key in getAllMetadata not in getAllMetadataKeys");
        }
    }

    // ============================================================================
    // PRIORITY 1: CRITICAL BUG DETECTION (5 tests)
    // ============================================================================

    /// @notice Test 01: Empty string value should exist and be removable
    /// @dev CATCHES BUG #1: Empty string ambiguity
    /// This test verifies that setting a key to empty string "" is different
    /// from a non-existent key, and that such keys can be properly removed.
    function test_01_EmptyStringValue_ExistsAndCanBeRemoved() public {
        console2.log("\n=== TEST 01: Empty String Value Handling ===");

        // Set metadata with empty value
        MetadataStorage.Metadata[] memory meta = _makeMetadata("emptyKey", "");
        metadata.setMetadata(HASH1, meta);

        // CRITICAL CHECK: Empty value should be distinguishable from non-existent
        assertTrue(metadata.hasMetadata(HASH1, "emptyKey"), "Empty value should exist");
        assertEq(metadata.getMetadataCount(HASH1), 1, "Count should be 1");

        // CRITICAL CHECK: Key should appear in enumeration
        string[] memory keys = metadata.getAllMetadataKeys(HASH1);
        assertEq(keys.length, 1, "Key should be in array");
        assertEq(keys[0], "emptyKey", "Wrong key in array");

        // CRITICAL CHECK: Should be able to remove empty value
        metadata.removeMetadata(HASH1, "emptyKey");
        assertFalse(metadata.hasMetadata(HASH1, "emptyKey"), "Key should be removed");
        assertEq(metadata.getMetadataCount(HASH1), 0, "Count should be 0 after removal");

        console2.log("[PASS] Empty string values handled correctly");
    }

    /// @notice Test 02: Duplicate keys in same call - last value wins, no array duplication
    /// @dev CATCHES BUG #2: Duplicate key vulnerability
    /// If the same key appears multiple times in the input array, only the last
    /// value should be stored, and the key should appear only ONCE in the keys array.
    function test_02_DuplicateKeysInArray_LastValueWins() public {
        console2.log("\n=== TEST 02: Duplicate Keys in Same Call ===");

        // Create array with duplicate key
        MetadataStorage.Metadata[] memory meta = new MetadataStorage.Metadata[](3);
        meta[0] = MetadataStorage.Metadata({key: "dupKey", value: "first"});
        meta[1] = MetadataStorage.Metadata({key: "other", value: "value"});
        meta[2] = MetadataStorage.Metadata({key: "dupKey", value: "last"});

        metadata.setMetadata(HASH1, meta);

        // CRITICAL CHECK: Last value should win
        assertEq(metadata.getMetadata(HASH1, "dupKey"), "last", "Last value should win");

        // CRITICAL CHECK: Key should appear only ONCE in keys array
        string[] memory keys = metadata.getAllMetadataKeys(HASH1);
        uint256 dupCount = 0;
        for (uint256 i = 0; i < keys.length; i++) {
            if (keccak256(bytes(keys[i])) == keccak256("dupKey")) {
                dupCount++;
            }
        }
        assertEq(dupCount, 1, "Duplicate key appears multiple times in array");

        // CRITICAL CHECK: Should have 2 unique keys, not 3
        assertEq(metadata.getMetadataCount(HASH1), 2, "Should have 2 unique keys");
        assertEq(keys.length, 2, "Keys array should have 2 entries");

        // Verify invariants
        _assertInvariants(HASH1);

        console2.log("[PASS] Duplicate keys handled correctly");
    }

    /// @notice Test 03: Updating existing key should not duplicate in array
    /// @dev CATCHES: Key tracking bugs when updating existing entries
    function test_03_UpdateExisting_NoKeyDuplication() public {
        console2.log("\n=== TEST 03: Update Existing Key ===");

        // Set initial metadata
        metadata.setMetadata(HASH1, _makeMetadata("key", "value1"));

        // Update same key with new value
        metadata.setMetadata(HASH1, _makeMetadata("key", "value2"));

        // CRITICAL CHECK: Value should update
        assertEq(metadata.getMetadata(HASH1, "key"), "value2", "Value should update");

        // CRITICAL CHECK: Count should stay at 1, not become 2
        assertEq(metadata.getMetadataCount(HASH1), 1, "Count should remain 1");

        string[] memory keys = metadata.getAllMetadataKeys(HASH1);
        assertEq(keys.length, 1, "Keys array should have 1 entry");
        assertEq(keys[0], "key", "Wrong key in array");

        // Verify invariants
        _assertInvariants(HASH1);

        console2.log("[PASS] Update does not duplicate keys");
    }

    /// @notice Test 04: Removing from middle of array preserves all other keys
    /// @dev CATCHES: Swap-and-pop implementation bugs
    function test_04_RemoveFromMiddle_PreservesOtherKeys() public {
        console2.log("\n=== TEST 04: Remove from Middle of Array ===");

        // Set 5 keys
        MetadataStorage.Metadata[] memory meta = new MetadataStorage.Metadata[](5);
        meta[0] = MetadataStorage.Metadata({key: "a", value: "1"});
        meta[1] = MetadataStorage.Metadata({key: "b", value: "2"});
        meta[2] = MetadataStorage.Metadata({key: "c", value: "3"});
        meta[3] = MetadataStorage.Metadata({key: "d", value: "4"});
        meta[4] = MetadataStorage.Metadata({key: "e", value: "5"});
        metadata.setMetadata(HASH1, meta);

        // Remove middle key "c"
        metadata.removeMetadata(HASH1, "c");

        // Verify count
        assertEq(metadata.getMetadataCount(HASH1), 4, "Count should be 4");

        // CRITICAL CHECK: Removed key is gone
        assertFalse(metadata.hasMetadata(HASH1, "c"), "Removed key should not exist");
        assertEq(metadata.getMetadata(HASH1, "c"), "", "Removed key should return empty");

        // CRITICAL CHECK: ALL other keys still accessible with correct values
        assertEq(metadata.getMetadata(HASH1, "a"), "1", "Key 'a' should remain");
        assertEq(metadata.getMetadata(HASH1, "b"), "2", "Key 'b' should remain");
        assertEq(metadata.getMetadata(HASH1, "d"), "4", "Key 'd' should remain");
        assertEq(metadata.getMetadata(HASH1, "e"), "5", "Key 'e' should remain");

        // CRITICAL CHECK: Enumeration contains exactly these 4 keys
        string[] memory keys = metadata.getAllMetadataKeys(HASH1);
        assertEq(keys.length, 4, "Keys array should have 4 entries");

        // Verify all expected keys present and no duplicates
        bool foundA = false;
        bool foundB = false;
        bool foundD = false;
        bool foundE = false;
        for (uint256 i = 0; i < keys.length; i++) {
            bytes32 keyHash = keccak256(bytes(keys[i]));
            if (keyHash == keccak256("a")) {
                assertFalse(foundA, "Duplicate 'a'");
                foundA = true;
            } else if (keyHash == keccak256("b")) {
                assertFalse(foundB, "Duplicate 'b'");
                foundB = true;
            } else if (keyHash == keccak256("d")) {
                assertFalse(foundD, "Duplicate 'd'");
                foundD = true;
            } else if (keyHash == keccak256("e")) {
                assertFalse(foundE, "Duplicate 'e'");
                foundE = true;
            } else {
                revert("Unexpected key in array");
            }
        }
        assertTrue(foundA && foundB && foundD && foundE, "Missing expected keys");

        // Verify invariants
        _assertInvariants(HASH1);

        console2.log("[PASS] Remove from middle preserves other keys");
    }

    /// @notice Test 05: Setting empty then non-empty for same key
    /// @dev CATCHES: Bug #1 + Bug #2 interaction
    function test_05_SetEmptyThenNonEmpty_SameKey() public {
        console2.log("\n=== TEST 05: Empty Then Non-Empty Same Key ===");

        // Set key with empty value
        metadata.setMetadata(HASH1, _makeMetadata("key", ""));

        // Update same key with non-empty value
        metadata.setMetadata(HASH1, _makeMetadata("key", "value"));

        // CRITICAL CHECK: No duplicate keys in array
        string[] memory keys = metadata.getAllMetadataKeys(HASH1);
        assertEq(keys.length, 1, "Should have 1 key");

        uint256 keyCount = 0;
        for (uint256 i = 0; i < keys.length; i++) {
            if (keccak256(bytes(keys[i])) == keccak256("key")) {
                keyCount++;
            }
        }
        assertEq(keyCount, 1, "Key should appear only once");

        // CRITICAL CHECK: Final value is correct
        assertEq(metadata.getMetadata(HASH1, "key"), "value", "Final value should be 'value'");
        assertEq(metadata.getMetadataCount(HASH1), 1, "Count should be 1");

        // Verify invariants
        _assertInvariants(HASH1);

        console2.log("[PASS] Empty to non-empty transition handled correctly");
    }

    // ============================================================================
    // PRIORITY 2: INVARIANT TESTING (5 tests)
    // ============================================================================

    /// @notice Test 06: Consistent state across all query methods
    /// @dev Multi-path verification - core anti-pattern prevention
    function test_06_ConsistentStateAcrossQueryMethods() public {
        console2.log("\n=== TEST 06: Consistent State Across Query Methods ===");

        // Set multiple metadata entries
        MetadataStorage.Metadata[] memory meta = new MetadataStorage.Metadata[](3);
        meta[0] = MetadataStorage.Metadata({key: "name", value: "Asset1"});
        meta[1] = MetadataStorage.Metadata({key: "type", value: "Satellite"});
        meta[2] = MetadataStorage.Metadata({key: "altitude", value: "550km"});
        metadata.setMetadata(HASH1, meta);

        // Query via 3 independent paths
        string memory directName = metadata.getMetadata(HASH1, "name");
        string[] memory keys = metadata.getAllMetadataKeys(HASH1);
        MetadataStorage.Metadata[] memory all = metadata.getAllMetadata(HASH1);

        // Cross-validate: Direct query
        assertEq(directName, "Asset1", "Direct query failed");
        assertEq(metadata.getMetadata(HASH1, "type"), "Satellite", "Direct query failed");
        assertEq(metadata.getMetadata(HASH1, "altitude"), "550km", "Direct query failed");

        // Cross-validate: Keys array
        assertEq(keys.length, 3, "Wrong number of keys");

        // Cross-validate: getAllMetadata
        assertEq(all.length, 3, "Wrong number of metadata entries");

        // Verify each entry in getAllMetadata matches direct query
        for (uint256 i = 0; i < all.length; i++) {
            string memory value = metadata.getMetadata(HASH1, all[i].key);
            assertEq(all[i].value, value, "getAllMetadata value mismatch");
        }

        // Verify invariants
        _assertInvariants(HASH1);

        console2.log("[PASS] All query methods return consistent data");
    }

    /// @notice Test 07: Namespace isolation - operations don't interfere
    /// @dev Security-critical feature test
    function test_07_NamespaceIsolation_IndependentState() public {
        console2.log("\n=== TEST 07: Namespace Isolation ===");

        // Set metadata in hash1
        metadata.setMetadata(HASH1, _makeMetadata2("key1", "value1", "key2", "value2"));

        // Set metadata in hash2 (same keys, different values)
        metadata.setMetadata(HASH2, _makeMetadata2("key1", "different1", "key2", "different2"));

        // Verify initial state
        assertEq(metadata.getMetadata(HASH1, "key1"), "value1", "Hash1 initial state wrong");
        assertEq(metadata.getMetadata(HASH2, "key1"), "different1", "Hash2 initial state wrong");

        // Perform operations on hash1: update and remove
        metadata.setMetadata(HASH1, _makeMetadata("key1", "updated"));
        metadata.removeMetadata(HASH1, "key2");

        // CRITICAL CHECK: Hash2 state completely unchanged
        assertEq(metadata.getMetadata(HASH2, "key1"), "different1", "Hash2 affected by Hash1 operations");
        assertEq(metadata.getMetadata(HASH2, "key2"), "different2", "Hash2 affected by Hash1 operations");
        assertEq(metadata.getMetadataCount(HASH2), 2, "Hash2 count affected");

        // Verify hash1 changes applied correctly
        assertEq(metadata.getMetadata(HASH1, "key1"), "updated", "Hash1 update failed");
        assertFalse(metadata.hasMetadata(HASH1, "key2"), "Hash1 remove failed");
        assertEq(metadata.getMetadataCount(HASH1), 1, "Hash1 count wrong");

        // Verify invariants for both namespaces independently
        _assertInvariants(HASH1);
        _assertInvariants(HASH2);

        console2.log("[PASS] Namespaces are completely isolated");
    }

    /// @notice Test 08: Count matches array lengths after every operation
    /// @dev Fundamental invariant verification
    function test_08_CountMatchesKeysLength_Always() public {
        console2.log("\n=== TEST 08: Count Invariant After Operations ===");

        // Initial: Set 3 keys
        MetadataStorage.Metadata[] memory meta = new MetadataStorage.Metadata[](3);
        meta[0] = MetadataStorage.Metadata({key: "a", value: "1"});
        meta[1] = MetadataStorage.Metadata({key: "b", value: "2"});
        meta[2] = MetadataStorage.Metadata({key: "c", value: "3"});
        metadata.setMetadata(HASH1, meta);
        _assertInvariants(HASH1);

        // Operation 1: Update one key
        metadata.setMetadata(HASH1, _makeMetadata("a", "updated"));
        _assertInvariants(HASH1);

        // Operation 2: Add 2 more keys
        MetadataStorage.Metadata[] memory meta2 = new MetadataStorage.Metadata[](2);
        meta2[0] = MetadataStorage.Metadata({key: "d", value: "4"});
        meta2[1] = MetadataStorage.Metadata({key: "e", value: "5"});
        metadata.setMetadata(HASH1, meta2);
        _assertInvariants(HASH1);

        // Operation 3: Remove 1 key
        metadata.removeMetadata(HASH1, "c");
        _assertInvariants(HASH1);

        // Final verification
        assertEq(metadata.getMetadataCount(HASH1), 4, "Final count should be 4");

        console2.log("[PASS] Count invariant holds after all operations");
    }

    /// @notice Test 09: All keys in array have values in storage
    /// @dev Catches orphaned key bugs
    function test_09_AllKeysInArrayHaveValues() public {
        console2.log("\n=== TEST 09: No Orphaned Keys ===");

        // Set multiple entries
        MetadataStorage.Metadata[] memory meta = new MetadataStorage.Metadata[](4);
        meta[0] = MetadataStorage.Metadata({key: "key1", value: "val1"});
        meta[1] = MetadataStorage.Metadata({key: "key2", value: "val2"});
        meta[2] = MetadataStorage.Metadata({key: "key3", value: "val3"});
        meta[3] = MetadataStorage.Metadata({key: "key4", value: "val4"});
        metadata.setMetadata(HASH1, meta);

        // CRITICAL CHECK: Every key in array has a value
        string[] memory keys = metadata.getAllMetadataKeys(HASH1);
        for (uint256 i = 0; i < keys.length; i++) {
            assertTrue(metadata.hasMetadata(HASH1, keys[i]), "Key in array but hasMetadata false");

            string memory value = metadata.getMetadata(HASH1, keys[i]);
            // Note: We check hasMetadata, not value length, because empty string is valid
            assertTrue(metadata.hasMetadata(HASH1, keys[i]), "Key in array but no value");
        }

        console2.log("[PASS] All keys in array have values");
    }

    /// @notice Test 10: No orphaned keys remain after remove operations
    /// @dev Comprehensive orphaned key detection
    function test_10_NoOrphanedKeysAfterRemove() public {
        console2.log("\n=== TEST 10: No Orphaned Keys After Remove ===");

        // Set 5 keys
        MetadataStorage.Metadata[] memory meta = new MetadataStorage.Metadata[](5);
        meta[0] = MetadataStorage.Metadata({key: "first", value: "1"});
        meta[1] = MetadataStorage.Metadata({key: "second", value: "2"});
        meta[2] = MetadataStorage.Metadata({key: "third", value: "3"});
        meta[3] = MetadataStorage.Metadata({key: "fourth", value: "4"});
        meta[4] = MetadataStorage.Metadata({key: "fifth", value: "5"});
        metadata.setMetadata(HASH1, meta);

        // Remove 3 keys in various positions (first, middle, last)
        metadata.removeMetadata(HASH1, "first"); // Remove first
        metadata.removeMetadata(HASH1, "third"); // Remove middle
        metadata.removeMetadata(HASH1, "fifth"); // Remove last

        // Verify remaining 2 keys
        assertEq(metadata.getMetadataCount(HASH1), 2, "Should have 2 keys remaining");

        // CRITICAL CHECK: Remaining keys all have values
        string[] memory keys = metadata.getAllMetadataKeys(HASH1);
        assertEq(keys.length, 2, "Keys array should have 2 entries");

        for (uint256 i = 0; i < keys.length; i++) {
            assertTrue(metadata.hasMetadata(HASH1, keys[i]), "Remaining key should have value");
        }

        // CRITICAL CHECK: Removed keys not in array
        for (uint256 i = 0; i < keys.length; i++) {
            bytes32 keyHash = keccak256(bytes(keys[i]));
            assertFalse(keyHash == keccak256("first"), "Removed key 'first' still in array");
            assertFalse(keyHash == keccak256("third"), "Removed key 'third' still in array");
            assertFalse(keyHash == keccak256("fifth"), "Removed key 'fifth' still in array");
        }

        // Verify remaining keys are correct
        assertTrue(
            metadata.hasMetadata(HASH1, "second") && metadata.hasMetadata(HASH1, "fourth"), "Wrong keys remaining"
        );

        // Verify invariants
        _assertInvariants(HASH1);

        console2.log("[PASS] No orphaned keys after removals");
    }

    // ============================================================================
    // PRIORITY 3: ACCESS CONTROL & EVENTS (4 tests)
    // ============================================================================

    /// @notice Test 11: Only admin can set metadata
    /// @dev Access control enforcement
    function test_11_OnlyAdminCanSetMetadata() public {
        console2.log("\n=== TEST 11: Access Control - Set Metadata ===");

        MetadataStorage.Metadata[] memory meta = _makeMetadata("key", "value");

        // Non-admin should not be able to set metadata
        vm.prank(nonAdmin);
        vm.expectRevert();
        metadata.setMetadata(HASH1, meta);

        // Admin should be able to set metadata
        vm.prank(admin);
        metadata.setMetadata(HASH1, meta);
        assertEq(metadata.getMetadata(HASH1, "key"), "value", "Admin should be able to set");

        console2.log("[PASS] Only admin can set metadata");
    }

    /// @notice Test 12: Only admin can remove metadata
    /// @dev Access control enforcement
    function test_12_OnlyAdminCanRemoveMetadata() public {
        console2.log("\n=== TEST 12: Access Control - Remove Metadata ===");

        // Admin sets metadata
        vm.prank(admin);
        metadata.setMetadata(HASH1, _makeMetadata("key", "value"));

        // Non-admin should not be able to remove
        vm.prank(nonAdmin);
        vm.expectRevert();
        metadata.removeMetadata(HASH1, "key");

        // Verify key still exists
        assertTrue(metadata.hasMetadata(HASH1, "key"), "Key should still exist");

        // Admin should be able to remove
        vm.prank(admin);
        metadata.removeMetadata(HASH1, "key");
        assertFalse(metadata.hasMetadata(HASH1, "key"), "Admin should be able to remove");

        console2.log("[PASS] Only admin can remove metadata");
    }

    /// @notice Test 13: MetadataUpdated event emitted correctly
    /// @dev Event verification
    function test_13_MetadataUpdatedEvent_EmittedCorrectly() public {
        console2.log("\n=== TEST 13: MetadataUpdated Event ===");

        // Test single entry
        vm.expectEmit(true, false, false, true);
        emit MetadataStorage.MetadataUpdated(HASH1, "key1", "value1");
        metadata.setMetadata(HASH1, _makeMetadata("key1", "value1"));

        // Test multiple entries (should emit event for each)
        MetadataStorage.Metadata[] memory meta = new MetadataStorage.Metadata[](2);
        meta[0] = MetadataStorage.Metadata({key: "key2", value: "value2"});
        meta[1] = MetadataStorage.Metadata({key: "key3", value: "value3"});

        vm.expectEmit(true, false, false, true);
        emit MetadataStorage.MetadataUpdated(HASH1, "key2", "value2");
        vm.expectEmit(true, false, false, true);
        emit MetadataStorage.MetadataUpdated(HASH1, "key3", "value3");
        metadata.setMetadata(HASH1, meta);

        console2.log("[PASS] MetadataUpdated events emitted correctly");
    }

    /// @notice Test 14: MetadataRemoved event emitted correctly
    /// @dev Event verification
    function test_14_MetadataRemovedEvent_EmittedCorrectly() public {
        console2.log("\n=== TEST 14: MetadataRemoved Event ===");

        // Set metadata first
        metadata.setMetadata(HASH1, _makeMetadata("key", "value"));

        // Test remove event
        vm.expectEmit(true, false, false, true);
        emit MetadataStorage.MetadataRemoved(HASH1, "key");
        metadata.removeMetadata(HASH1, "key");

        console2.log("[PASS] MetadataRemoved event emitted correctly");
    }

    // ============================================================================
    // PRIORITY 4: EDGE CASES (4 tests)
    // ============================================================================

    /// @notice Test 15: Empty metadata array causes no changes
    /// @dev Edge case handling
    function test_15_EmptyMetadataArray_NoChanges() public {
        console2.log("\n=== TEST 15: Empty Metadata Array ===");

        // Set some initial metadata
        metadata.setMetadata(HASH1, _makeMetadata("key", "value"));
        uint256 initialCount = metadata.getMetadataCount(HASH1);

        // Call setMetadata with empty array
        MetadataStorage.Metadata[] memory empty = new MetadataStorage.Metadata[](0);
        metadata.setMetadata(HASH1, empty);

        // Verify state unchanged
        assertEq(metadata.getMetadataCount(HASH1), initialCount, "Count should not change");
        assertEq(metadata.getMetadata(HASH1, "key"), "value", "Existing data should remain");

        console2.log("[PASS] Empty array causes no changes");
    }

    /// @notice Test 16: Removing non-existent key reverts
    /// @dev Error handling
    function test_16_RemoveNonexistentKey_Reverts() public {
        console2.log("\n=== TEST 16: Remove Non-Existent Key ===");

        // Try to remove key that was never set
        vm.expectRevert("Key does not exist");
        metadata.removeMetadata(HASH1, "nonexistent");

        console2.log("[PASS] Removing non-existent key reverts");
    }

    /// @notice Test 17: Remove all keys then add new ones - clean state
    /// @dev State reset testing
    function test_17_RemoveAll_ThenAddAgain_CleanState() public {
        console2.log("\n=== TEST 17: Remove All Then Add New ===");

        // Set 3 keys
        MetadataStorage.Metadata[] memory meta = new MetadataStorage.Metadata[](3);
        meta[0] = MetadataStorage.Metadata({key: "a", value: "1"});
        meta[1] = MetadataStorage.Metadata({key: "b", value: "2"});
        meta[2] = MetadataStorage.Metadata({key: "c", value: "3"});
        metadata.setMetadata(HASH1, meta);

        // Remove all 3
        metadata.removeMetadata(HASH1, "a");
        metadata.removeMetadata(HASH1, "b");
        metadata.removeMetadata(HASH1, "c");

        // Verify empty state
        assertEq(metadata.getMetadataCount(HASH1), 0, "Count should be 0");
        string[] memory keys = metadata.getAllMetadataKeys(HASH1);
        assertEq(keys.length, 0, "Keys array should be empty");

        // Add new metadata
        MetadataStorage.Metadata[] memory newMeta = new MetadataStorage.Metadata[](2);
        newMeta[0] = MetadataStorage.Metadata({key: "x", value: "10"});
        newMeta[1] = MetadataStorage.Metadata({key: "y", value: "20"});
        metadata.setMetadata(HASH1, newMeta);

        // Verify clean state with new data
        assertEq(metadata.getMetadataCount(HASH1), 2, "Should have 2 new keys");
        assertEq(metadata.getMetadata(HASH1, "x"), "10", "New key 'x' should exist");
        assertEq(metadata.getMetadata(HASH1, "y"), "20", "New key 'y' should exist");

        // Verify old keys don't exist
        assertFalse(metadata.hasMetadata(HASH1, "a"), "Old key 'a' should not exist");
        assertFalse(metadata.hasMetadata(HASH1, "b"), "Old key 'b' should not exist");
        assertFalse(metadata.hasMetadata(HASH1, "c"), "Old key 'c' should not exist");

        // Verify invariants
        _assertInvariants(HASH1);

        console2.log("[PASS] Clean state after remove all and add new");
    }

    /// @notice Test 18: Very long strings stored correctly
    /// @dev Storage limits testing
    function test_18_VeryLongStrings_StoredCorrectly() public {
        console2.log("\n=== TEST 18: Very Long Strings ===");

        // Create very long strings
        string memory longKey = "k";
        string memory longValue = "v";
        for (uint256 i = 0; i < 7; i++) {
            // 2^7 = 128 chars
            longKey = string(abi.encodePacked(longKey, longKey));
            longValue = string(abi.encodePacked(longValue, longValue));
        }

        // Set metadata with long strings
        metadata.setMetadata(HASH1, _makeMetadata(longKey, longValue));

        // Verify retrieval returns exact strings
        string memory retrieved = metadata.getMetadata(HASH1, longKey);
        assertEq(retrieved, longValue, "Long value should match");

        // Verify enumeration works
        string[] memory keys = metadata.getAllMetadataKeys(HASH1);
        assertEq(keys.length, 1, "Should have 1 key");
        assertEq(keys[0], longKey, "Long key in array should match");

        // Verify invariants
        _assertInvariants(HASH1);

        console2.log("[PASS] Very long strings handled correctly");
    }

    // ============================================================================
    // PRIORITY 5: REAL-WORLD WORKFLOWS (2 tests)
    // ============================================================================

    /// @notice Test 19: Realistic workflow - set, update, add, remove, query
    /// @dev Simulates real AssetRegistry usage
    function test_19_RealisticWorkflow_SetUpdateRemoveQuery() public {
        console2.log("\n=== TEST 19: Realistic Workflow ===");

        // Simulate AssetRegistry creating asset type
        MetadataStorage.Metadata[] memory assetType = new MetadataStorage.Metadata[](3);
        assetType[0] = MetadataStorage.Metadata({key: "schemaURI", value: "ipfs://Qm..."});
        assetType[1] = MetadataStorage.Metadata({key: "description", value: "Satellite asset type"});
        assetType[2] = MetadataStorage.Metadata({key: "version", value: "1.0"});
        metadata.setMetadata(HASH1, assetType);
        _assertInvariants(HASH1);

        // Update description
        metadata.setMetadata(HASH1, _makeMetadata("description", "Updated satellite description"));
        assertEq(metadata.getMetadata(HASH1, "description"), "Updated satellite description", "Update failed");
        _assertInvariants(HASH1);

        // Add more metadata
        MetadataStorage.Metadata[] memory additional = new MetadataStorage.Metadata[](2);
        additional[0] = MetadataStorage.Metadata({key: "category", value: "LEO"});
        additional[1] = MetadataStorage.Metadata({key: "status", value: "active"});
        metadata.setMetadata(HASH1, additional);
        assertEq(metadata.getMetadataCount(HASH1), 5, "Should have 5 keys total");
        _assertInvariants(HASH1);

        // Remove version
        metadata.removeMetadata(HASH1, "version");
        assertEq(metadata.getMetadataCount(HASH1), 4, "Should have 4 keys after removal");
        _assertInvariants(HASH1);

        // Query all metadata
        MetadataStorage.Metadata[] memory all = metadata.getAllMetadata(HASH1);
        assertEq(all.length, 4, "Should retrieve 4 metadata entries");

        // Verify specific values
        assertEq(metadata.getMetadata(HASH1, "schemaURI"), "ipfs://Qm...", "schemaURI should remain");
        assertEq(
            metadata.getMetadata(HASH1, "description"),
            "Updated satellite description",
            "Description should be updated"
        );
        assertEq(metadata.getMetadata(HASH1, "category"), "LEO", "Category should exist");
        assertEq(metadata.getMetadata(HASH1, "status"), "active", "Status should exist");
        assertFalse(metadata.hasMetadata(HASH1, "version"), "Version should be removed");

        console2.log("[PASS] Realistic workflow completed successfully");
    }

    /// @notice Test 20: Multiple namespaces with no interference
    /// @dev Real protocol usage with multiple assets
    function test_20_MultipleNamespaces_NoInterference() public {
        console2.log("\n=== TEST 20: Multiple Namespaces ===");

        // Simulate 3 different assets with different metadata
        metadata.setMetadata(HASH1, _makeMetadata2("name", "Asset1", "type", "TypeA"));
        metadata.setMetadata(HASH2, _makeMetadata2("name", "Asset2", "type", "TypeB"));
        metadata.setMetadata(HASH3, _makeMetadata2("name", "Asset3", "type", "TypeC"));

        // Perform different operations on each
        metadata.setMetadata(HASH1, _makeMetadata("status", "active")); // Add to hash1
        metadata.removeMetadata(HASH2, "type"); // Remove from hash2
        metadata.setMetadata(HASH3, _makeMetadata("name", "UpdatedAsset3")); // Update hash3

        // Verify complete independence
        assertEq(metadata.getMetadataCount(HASH1), 3, "Hash1 should have 3 keys");
        assertEq(metadata.getMetadataCount(HASH2), 1, "Hash2 should have 1 key");
        assertEq(metadata.getMetadataCount(HASH3), 2, "Hash3 should have 2 keys");

        // Verify specific values
        assertEq(metadata.getMetadata(HASH1, "name"), "Asset1", "Hash1 name unchanged");
        assertEq(metadata.getMetadata(HASH1, "status"), "active", "Hash1 status added");

        assertEq(metadata.getMetadata(HASH2, "name"), "Asset2", "Hash2 name unchanged");
        assertFalse(metadata.hasMetadata(HASH2, "type"), "Hash2 type removed");

        assertEq(metadata.getMetadata(HASH3, "name"), "UpdatedAsset3", "Hash3 name updated");
        assertEq(metadata.getMetadata(HASH3, "type"), "TypeC", "Hash3 type unchanged");

        // Assert invariants for all namespaces
        _assertInvariants(HASH1);
        _assertInvariants(HASH2);
        _assertInvariants(HASH3);

        console2.log("[PASS] Multiple namespaces operate independently");
    }
}