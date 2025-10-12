// // SPDX-License-Identifier: MIT
// pragma solidity ^0.8.25;

// import {Test} from "forge-std/Test.sol";
// import {MetadataStorage} from "../src/MetadataStorage.sol";

// /// @title TestMetadataStorage
// /// @notice Test contract that inherits MetadataStorage for testing
// contract TestMetadataStorage is MetadataStorage {
//     constructor() {
//         _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
//     }
// }

// /// @title MetadataStorageTest
// /// @notice Test suite for MetadataStorage functionality
// contract MetadataStorageTest is Test {
//     TestMetadataStorage public metadataContract;
//     address public admin = address(0x1);

//     function setUp() public {
//         metadataContract = new TestMetadataStorage();
//         vm.prank(admin);
//         metadataContract.grantRole(metadataContract.DEFAULT_ADMIN_ROLE(), admin);
//     }

//     /// @notice Test basic metadata operations
//     function test_BasicMetadataOperations() public {
//         // Test setting single metadata
//         vm.prank(admin);
//         metadataContract.setMetadata("name", "Test Asset");

//         assertEq(metadataContract.getMetadata("name"), "Test Asset");
//         assertTrue(metadataContract.hasMetadata("name"));
//         assertEq(metadataContract.getMetadataCount(), 1);

//         // Test setting multiple metadata
//         string[] memory keys = new string[](2);
//         string[] memory values = new string[](2);
//         keys[0] = "description";
//         keys[1] = "category";
//         values[0] = "Test description";
//         values[1] = "Test category";

//         vm.prank(admin);
//         metadataContract.setMetadata(keys, values);

//         assertEq(metadataContract.getMetadata("description"), "Test description");
//         assertEq(metadataContract.getMetadata("category"), "Test category");
//         assertEq(metadataContract.getMetadataCount(), 3);

//         // Test getting all metadata
//         (string[] memory allKeys, string[] memory allValues) = metadataContract.getAllMetadata();
//         assertEq(allKeys.length, 3);
//         assertEq(allValues.length, 3);
//     }

//     /// @notice Test metadata removal
//     function test_MetadataRemoval() public {
//         // Set some metadata
//         vm.prank(admin);
//         metadataContract.setMetadata("key1", "value1");
//         vm.prank(admin);
//         metadataContract.setMetadata("key2", "value2");

//         assertEq(metadataContract.getMetadataCount(), 2);

//         // Remove metadata
//         vm.prank(admin);
//         metadataContract.removeMetadata("key1");

//         assertEq(metadataContract.getMetadataCount(), 1);
//         assertFalse(metadataContract.hasMetadata("key1"));
//         assertTrue(metadataContract.hasMetadata("key2"));
//     }

//     /// @notice Test access control
//     function test_AccessControl() public {
//         address nonAdmin = address(0x2);

//         // Non-admin should not be able to set metadata
//         vm.prank(nonAdmin);
//         vm.expectRevert();
//         metadataContract.setMetadata("key", "value");

//         // Non-admin should not be able to remove metadata
//         vm.prank(admin);
//         metadataContract.setMetadata("key", "value");

//         vm.prank(nonAdmin);
//         vm.expectRevert();
//         metadataContract.removeMetadata("key");
//     }

//     /// @notice Test events
//     function test_Events() public {
//         // Test MetadataUpdated event
//         vm.expectEmit(true, true, true, true);
//         emit MetadataUpdated("key", "value");
//         vm.prank(admin);
//         metadataContract.setMetadata("key", "value");

//         // Test MetadataRemoved event
//         vm.expectEmit(true, true, true, true);
//         emit MetadataRemoved("key");
//         vm.prank(admin);
//         metadataContract.removeMetadata("key");
//     }
// }
