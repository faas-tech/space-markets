// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {MetadataStorage} from "../../src/MetadataStorage.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

/// @title TestMetadataStorage
/// @notice Concrete implementation of MetadataStorage for testing
contract TestMetadataStorage is MetadataStorage {
    function initialize(address admin) public initializer {
        __AccessControl_init();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    // Expose internal functions for testing
    function setMetadataPublic(bytes32 hash, Metadata[] memory metadata_) public {
        _setMetadata(hash, metadata_);
    }

    function removeMetadataPublic(bytes32 hash, string calldata key) public {
        _removeMetadata(hash, key);
    }
}

/// @title MetadataStorageTest
/// @notice Comprehensive test suite for MetadataStorage functionality
contract MetadataStorageTest is Test {
    TestMetadataStorage public metadataContract;
    address public admin = address(0x1);
    address public user = address(0x2);

    bytes32 public hash1 = keccak256("entity1");
    bytes32 public hash2 = keccak256("entity2");

    event MetadataUpdated(bytes32 indexed hash, string key, string value);
    event MetadataRemoved(bytes32 indexed hash, string key);

    function setUp() public {
        metadataContract = new TestMetadataStorage();
        metadataContract.initialize(admin);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                   BASIC CRUD OPERATIONS                    */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_SetAndGetSingleMetadata() public {
        // Create metadata
        MetadataStorage.Metadata[] memory metadata = new MetadataStorage.Metadata[](1);
        metadata[0] = MetadataStorage.Metadata({key: "name", value: "Test Asset"});

        vm.prank(admin);
        metadataContract.setMetadataPublic(hash1, metadata);

        // Verify retrieval
        string memory value = metadataContract.getMetadata(hash1, "name");
        assertEq(value, "Test Asset", "Value should match");
    }

    function test_SetAndGetMultipleMetadata() public {
        // Create multiple metadata entries
        MetadataStorage.Metadata[] memory metadata = new MetadataStorage.Metadata[](3);
        metadata[0] = MetadataStorage.Metadata({key: "name", value: "Test Asset"});
        metadata[1] = MetadataStorage.Metadata({key: "description", value: "A test description"});
        metadata[2] = MetadataStorage.Metadata({key: "category", value: "Electronics"});

        vm.prank(admin);
        metadataContract.setMetadataPublic(hash1, metadata);

        // Verify all values
        assertEq(metadataContract.getMetadata(hash1, "name"), "Test Asset");
        assertEq(metadataContract.getMetadata(hash1, "description"), "A test description");
        assertEq(metadataContract.getMetadata(hash1, "category"), "Electronics");
    }

    function test_GetAllMetadata() public {
        // Set metadata
        MetadataStorage.Metadata[] memory metadata = new MetadataStorage.Metadata[](2);
        metadata[0] = MetadataStorage.Metadata({key: "key1", value: "value1"});
        metadata[1] = MetadataStorage.Metadata({key: "key2", value: "value2"});

        vm.prank(admin);
        metadataContract.setMetadataPublic(hash1, metadata);

        // Get all metadata
        MetadataStorage.Metadata[] memory allMetadata = metadataContract.getAllMetadata(hash1);

        assertEq(allMetadata.length, 2, "Should have 2 metadata entries");
        assertEq(allMetadata[0].key, "key1");
        assertEq(allMetadata[0].value, "value1");
        assertEq(allMetadata[1].key, "key2");
        assertEq(allMetadata[1].value, "value2");
    }

    function test_GetAllMetadataKeys() public {
        // Set metadata
        MetadataStorage.Metadata[] memory metadata = new MetadataStorage.Metadata[](3);
        metadata[0] = MetadataStorage.Metadata({key: "alpha", value: "1"});
        metadata[1] = MetadataStorage.Metadata({key: "beta", value: "2"});
        metadata[2] = MetadataStorage.Metadata({key: "gamma", value: "3"});

        vm.prank(admin);
        metadataContract.setMetadataPublic(hash1, metadata);

        // Get all keys
        string[] memory keys = metadataContract.getAllMetadataKeys(hash1);

        assertEq(keys.length, 3, "Should have 3 keys");
        assertEq(keys[0], "alpha");
        assertEq(keys[1], "beta");
        assertEq(keys[2], "gamma");
    }

    function test_GetMetadataCount() public {
        assertEq(metadataContract.getMetadataCount(hash1), 0, "Initial count should be 0");

        // Add metadata
        MetadataStorage.Metadata[] memory metadata = new MetadataStorage.Metadata[](2);
        metadata[0] = MetadataStorage.Metadata({key: "key1", value: "value1"});
        metadata[1] = MetadataStorage.Metadata({key: "key2", value: "value2"});

        vm.prank(admin);
        metadataContract.setMetadataPublic(hash1, metadata);

        assertEq(metadataContract.getMetadataCount(hash1), 2, "Count should be 2");
    }

    function test_HasMetadata() public {
        assertFalse(metadataContract.hasMetadata(hash1, "name"), "Should not have metadata initially");

        // Add metadata
        MetadataStorage.Metadata[] memory metadata = new MetadataStorage.Metadata[](1);
        metadata[0] = MetadataStorage.Metadata({key: "name", value: "Test"});

        vm.prank(admin);
        metadataContract.setMetadataPublic(hash1, metadata);

        assertTrue(metadataContract.hasMetadata(hash1, "name"), "Should have metadata after set");
        assertFalse(metadataContract.hasMetadata(hash1, "nonexistent"), "Should not have nonexistent key");
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                  DUPLICATE KEY HANDLING                    */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_UpdateExistingKey() public {
        // Set initial metadata
        MetadataStorage.Metadata[] memory metadata1 = new MetadataStorage.Metadata[](1);
        metadata1[0] = MetadataStorage.Metadata({key: "version", value: "1.0"});

        vm.prank(admin);
        metadataContract.setMetadataPublic(hash1, metadata1);

        assertEq(metadataContract.getMetadata(hash1, "version"), "1.0");
        assertEq(metadataContract.getMetadataCount(hash1), 1);

        // Update same key
        MetadataStorage.Metadata[] memory metadata2 = new MetadataStorage.Metadata[](1);
        metadata2[0] = MetadataStorage.Metadata({key: "version", value: "2.0"});

        vm.prank(admin);
        metadataContract.setMetadataPublic(hash1, metadata2);

        assertEq(metadataContract.getMetadata(hash1, "version"), "2.0", "Value should be updated");
        assertEq(metadataContract.getMetadataCount(hash1), 1, "Count should remain 1");
    }

    function test_SetMultipleWithDuplicates() public {
        // Set metadata with duplicate keys in same call
        MetadataStorage.Metadata[] memory metadata = new MetadataStorage.Metadata[](3);
        metadata[0] = MetadataStorage.Metadata({key: "name", value: "First"});
        metadata[1] = MetadataStorage.Metadata({key: "description", value: "Desc"});
        metadata[2] = MetadataStorage.Metadata({key: "name", value: "Second"});

        vm.prank(admin);
        metadataContract.setMetadataPublic(hash1, metadata);

        // Last value should win
        assertEq(metadataContract.getMetadata(hash1, "name"), "Second");
        assertEq(metadataContract.getMetadataCount(hash1), 2, "Should only have 2 unique keys");
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    REMOVAL OPERATIONS                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_RemoveMetadata() public {
        // Set metadata
        MetadataStorage.Metadata[] memory metadata = new MetadataStorage.Metadata[](2);
        metadata[0] = MetadataStorage.Metadata({key: "key1", value: "value1"});
        metadata[1] = MetadataStorage.Metadata({key: "key2", value: "value2"});

        vm.prank(admin);
        metadataContract.setMetadataPublic(hash1, metadata);

        assertEq(metadataContract.getMetadataCount(hash1), 2);

        // Remove one key
        vm.prank(admin);
        metadataContract.removeMetadataPublic(hash1, "key1");

        assertEq(metadataContract.getMetadataCount(hash1), 1, "Count should decrease");
        assertFalse(metadataContract.hasMetadata(hash1, "key1"), "Key1 should be removed");
        assertTrue(metadataContract.hasMetadata(hash1, "key2"), "Key2 should still exist");
    }

    function test_RemoveAllMetadata() public {
        // Set metadata
        MetadataStorage.Metadata[] memory metadata = new MetadataStorage.Metadata[](3);
        metadata[0] = MetadataStorage.Metadata({key: "a", value: "1"});
        metadata[1] = MetadataStorage.Metadata({key: "b", value: "2"});
        metadata[2] = MetadataStorage.Metadata({key: "c", value: "3"});

        vm.prank(admin);
        metadataContract.setMetadataPublic(hash1, metadata);

        // Remove all keys one by one
        vm.prank(admin);
        metadataContract.removeMetadataPublic(hash1, "a");
        vm.prank(admin);
        metadataContract.removeMetadataPublic(hash1, "b");
        vm.prank(admin);
        metadataContract.removeMetadataPublic(hash1, "c");

        assertEq(metadataContract.getMetadataCount(hash1), 0, "All metadata should be removed");
    }

    function test_RevertWhen_RemovingNonexistentKey() public {
        vm.prank(admin);
        vm.expectRevert("Key does not exist");
        metadataContract.removeMetadataPublic(hash1, "nonexistent");
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                     HASH ISOLATION                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_HashIsolation() public {
        // Set metadata for hash1
        MetadataStorage.Metadata[] memory metadata1 = new MetadataStorage.Metadata[](1);
        metadata1[0] = MetadataStorage.Metadata({key: "name", value: "Entity1"});

        vm.prank(admin);
        metadataContract.setMetadataPublic(hash1, metadata1);

        // Set metadata for hash2 with same key
        MetadataStorage.Metadata[] memory metadata2 = new MetadataStorage.Metadata[](1);
        metadata2[0] = MetadataStorage.Metadata({key: "name", value: "Entity2"});

        vm.prank(admin);
        metadataContract.setMetadataPublic(hash2, metadata2);

        // Verify isolation
        assertEq(metadataContract.getMetadata(hash1, "name"), "Entity1");
        assertEq(metadataContract.getMetadata(hash2, "name"), "Entity2");
        assertEq(metadataContract.getMetadataCount(hash1), 1);
        assertEq(metadataContract.getMetadataCount(hash2), 1);
    }

    function test_RemovalDoesNotAffectOtherHashes() public {
        // Set metadata for both hashes
        MetadataStorage.Metadata[] memory metadata = new MetadataStorage.Metadata[](1);
        metadata[0] = MetadataStorage.Metadata({key: "shared", value: "value1"});

        vm.prank(admin);
        metadataContract.setMetadataPublic(hash1, metadata);

        metadata[0].value = "value2";
        vm.prank(admin);
        metadataContract.setMetadataPublic(hash2, metadata);

        // Remove from hash1
        vm.prank(admin);
        metadataContract.removeMetadataPublic(hash1, "shared");

        // Verify hash2 unaffected
        assertTrue(metadataContract.hasMetadata(hash2, "shared"));
        assertFalse(metadataContract.hasMetadata(hash1, "shared"));
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                   EMPTY STRING HANDLING                    */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_EmptyValueString() public {
        MetadataStorage.Metadata[] memory metadata = new MetadataStorage.Metadata[](1);
        metadata[0] = MetadataStorage.Metadata({key: "emptyValue", value: ""});

        vm.prank(admin);
        metadataContract.setMetadataPublic(hash1, metadata);

        // Empty value is treated as nonexistent by the contract (length check returns false)
        string memory value = metadataContract.getMetadata(hash1, "emptyValue");
        assertEq(value, "", "Empty value should return empty string");
        assertFalse(metadataContract.hasMetadata(hash1, "emptyValue"), "Key with empty value is treated as nonexistent");
    }

    function test_EmptyKeyString() public {
        MetadataStorage.Metadata[] memory metadata = new MetadataStorage.Metadata[](1);
        metadata[0] = MetadataStorage.Metadata({key: "", value: "someValue"});

        vm.prank(admin);
        metadataContract.setMetadataPublic(hash1, metadata);

        // Empty key is technically allowed by the contract
        string memory value = metadataContract.getMetadata(hash1, "");
        assertEq(value, "someValue");
    }

    function test_NonexistentKeyReturnsEmptyString() public {
        string memory value = metadataContract.getMetadata(hash1, "nonexistent");
        assertEq(value, "", "Nonexistent key should return empty string");
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      EVENT EMISSIONS                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_EmitMetadataUpdatedEvent() public {
        MetadataStorage.Metadata[] memory metadata = new MetadataStorage.Metadata[](1);
        metadata[0] = MetadataStorage.Metadata({key: "eventTest", value: "eventValue"});

        vm.expectEmit(true, false, false, true);
        emit MetadataUpdated(hash1, "eventTest", "eventValue");

        vm.prank(admin);
        metadataContract.setMetadataPublic(hash1, metadata);
    }

    function test_EmitMultipleMetadataUpdatedEvents() public {
        MetadataStorage.Metadata[] memory metadata = new MetadataStorage.Metadata[](2);
        metadata[0] = MetadataStorage.Metadata({key: "key1", value: "value1"});
        metadata[1] = MetadataStorage.Metadata({key: "key2", value: "value2"});

        // Expect first event
        vm.expectEmit(true, false, false, true);
        emit MetadataUpdated(hash1, "key1", "value1");
        // Expect second event
        vm.expectEmit(true, false, false, true);
        emit MetadataUpdated(hash1, "key2", "value2");

        vm.prank(admin);
        metadataContract.setMetadataPublic(hash1, metadata);
    }

    function test_EmitMetadataRemovedEvent() public {
        // First set metadata
        MetadataStorage.Metadata[] memory metadata = new MetadataStorage.Metadata[](1);
        metadata[0] = MetadataStorage.Metadata({key: "toRemove", value: "value"});

        vm.prank(admin);
        metadataContract.setMetadataPublic(hash1, metadata);

        // Now remove and check event
        vm.expectEmit(true, false, false, true);
        emit MetadataRemoved(hash1, "toRemove");

        vm.prank(admin);
        metadataContract.removeMetadataPublic(hash1, "toRemove");
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    EDGE CASES & STRESS                     */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_LargeNumberOfKeys() public {
        // Test with 50 keys
        MetadataStorage.Metadata[] memory metadata = new MetadataStorage.Metadata[](50);
        for (uint256 i = 0; i < 50; i++) {
            metadata[i] = MetadataStorage.Metadata({
                key: string(abi.encodePacked("key", vm.toString(i))),
                value: string(abi.encodePacked("value", vm.toString(i)))
            });
        }

        vm.prank(admin);
        metadataContract.setMetadataPublic(hash1, metadata);

        assertEq(metadataContract.getMetadataCount(hash1), 50);

        // Verify a few random entries
        assertEq(metadataContract.getMetadata(hash1, "key0"), "value0");
        assertEq(metadataContract.getMetadata(hash1, "key25"), "value25");
        assertEq(metadataContract.getMetadata(hash1, "key49"), "value49");
    }

    function test_LongStrings() public {
        // Create long strings (1000 characters)
        string memory longKey = "key";
        string memory longValue = "";
        for (uint256 i = 0; i < 100; i++) {
            longValue = string(abi.encodePacked(longValue, "0123456789"));
        }

        MetadataStorage.Metadata[] memory metadata = new MetadataStorage.Metadata[](1);
        metadata[0] = MetadataStorage.Metadata({key: longKey, value: longValue});

        vm.prank(admin);
        metadataContract.setMetadataPublic(hash1, metadata);

        string memory retrieved = metadataContract.getMetadata(hash1, longKey);
        assertEq(retrieved, longValue, "Long value should be stored correctly");
    }

    function test_SpecialCharactersInMetadata() public {
        MetadataStorage.Metadata[] memory metadata = new MetadataStorage.Metadata[](3);
        metadata[0] = MetadataStorage.Metadata({key: "unicode", value: unicode"Hello 世界 🌍"});
        metadata[1] = MetadataStorage.Metadata({key: "special", value: "!@#$%^&*()_+-=[]{}|;:',.<>?"});
        metadata[2] = MetadataStorage.Metadata({key: "newlines", value: "Line1\nLine2\nLine3"});

        vm.prank(admin);
        metadataContract.setMetadataPublic(hash1, metadata);

        assertEq(metadataContract.getMetadata(hash1, "unicode"), unicode"Hello 世界 🌍");
        assertEq(metadataContract.getMetadata(hash1, "special"), "!@#$%^&*()_+-=[]{}|;:',.<>?");
        assertEq(metadataContract.getMetadata(hash1, "newlines"), "Line1\nLine2\nLine3");
    }

    function test_KeyOrderingAfterRemoval() public {
        // Set 5 keys
        MetadataStorage.Metadata[] memory metadata = new MetadataStorage.Metadata[](5);
        metadata[0] = MetadataStorage.Metadata({key: "a", value: "1"});
        metadata[1] = MetadataStorage.Metadata({key: "b", value: "2"});
        metadata[2] = MetadataStorage.Metadata({key: "c", value: "3"});
        metadata[3] = MetadataStorage.Metadata({key: "d", value: "4"});
        metadata[4] = MetadataStorage.Metadata({key: "e", value: "5"});

        vm.prank(admin);
        metadataContract.setMetadataPublic(hash1, metadata);

        // Remove middle key
        vm.prank(admin);
        metadataContract.removeMetadataPublic(hash1, "c");

        // Keys array uses swap-and-pop, so order may change
        string[] memory keys = metadataContract.getAllMetadataKeys(hash1);
        assertEq(keys.length, 4, "Should have 4 keys after removal");

        // All remaining keys should still be accessible
        assertTrue(metadataContract.hasMetadata(hash1, "a"));
        assertTrue(metadataContract.hasMetadata(hash1, "b"));
        assertTrue(metadataContract.hasMetadata(hash1, "d"));
        assertTrue(metadataContract.hasMetadata(hash1, "e"));
        assertFalse(metadataContract.hasMetadata(hash1, "c"));
    }

    function test_EmptyMetadataArray() public {
        MetadataStorage.Metadata[] memory metadata = new MetadataStorage.Metadata[](0);

        vm.prank(admin);
        metadataContract.setMetadataPublic(hash1, metadata);

        assertEq(metadataContract.getMetadataCount(hash1), 0);
    }

    function test_MultipleOperationsSequence() public {
        // Set initial metadata
        MetadataStorage.Metadata[] memory metadata1 = new MetadataStorage.Metadata[](2);
        metadata1[0] = MetadataStorage.Metadata({key: "a", value: "1"});
        metadata1[1] = MetadataStorage.Metadata({key: "b", value: "2"});

        vm.prank(admin);
        metadataContract.setMetadataPublic(hash1, metadata1);

        // Update one, add one
        MetadataStorage.Metadata[] memory metadata2 = new MetadataStorage.Metadata[](2);
        metadata2[0] = MetadataStorage.Metadata({key: "a", value: "updated"});
        metadata2[1] = MetadataStorage.Metadata({key: "c", value: "3"});

        vm.prank(admin);
        metadataContract.setMetadataPublic(hash1, metadata2);

        // Remove one
        vm.prank(admin);
        metadataContract.removeMetadataPublic(hash1, "b");

        // Verify final state
        assertEq(metadataContract.getMetadata(hash1, "a"), "updated");
        assertFalse(metadataContract.hasMetadata(hash1, "b"));
        assertEq(metadataContract.getMetadata(hash1, "c"), "3");
        assertEq(metadataContract.getMetadataCount(hash1), 2);
    }
}
