// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";

/// @title HashCompatibilityTest
/// @notice Tests hash format compatibility between offchain (SHA-256) and onchain (bytes32) systems
/// @dev Validates that offchain hash generation (0x + 64 hex chars) is compatible with Solidity bytes32 storage
contract HashCompatibilityTest is Test {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                  Hash Format Validation Tests               */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Test that bytes32 correctly stores a hash generated offchain
    /// @dev Offchain: SHA-256 generates 0x + 64 hex chars (32 bytes)
    ///      Onchain: bytes32 is 32 bytes
    function test_Bytes32HashStorage() public {
        // Simulate offchain SHA-256 hash (0x + 64 hex characters = 32 bytes)
        bytes32 offchainHash = 0x7d865e959b2466918c9863afca942d0fb89d7c9ac0c99bafc3749504ded97730;

        // Verify it's exactly 32 bytes
        assertTrue(offchainHash.length == 32, "Hash should be exactly 32 bytes");

        // Store and retrieve (simulating onchain storage)
        bytes32 storedHash = offchainHash;
        assertEq(storedHash, offchainHash, "Hash should match exactly after storage");
    }

    /// @notice Test hash round-trip: store and retrieve
    function test_HashRoundtrip() public {
        bytes32 originalHash = keccak256("test metadata");

        // Simulate storage
        bytes32 stored = originalHash;

        // Retrieve
        bytes32 retrieved = stored;

        // Verify exact match
        assertEq(retrieved, originalHash, "Round-trip should preserve hash exactly");
    }

    /// @notice Test that different metadata produces different hashes
    function test_DifferentMetadataProducesDifferentHashes() public {
        bytes32 hash1 = keccak256(abi.encode("metadata1"));
        bytes32 hash2 = keccak256(abi.encode("metadata2"));

        assertTrue(hash1 != hash2, "Different metadata should produce different hashes");
    }

    /// @notice Test deterministic hashing (same input → same hash)
    function test_DeterministicHashing() public {
        string memory input = "deterministic test data";
        bytes32 hash1 = keccak256(bytes(input));
        bytes32 hash2 = keccak256(bytes(input));

        assertEq(hash1, hash2, "Same input should always produce same hash");
    }

    /// @notice Test zero hash handling
    function test_ZeroHashStorage() public {
        bytes32 zeroHash = bytes32(0);

        // Verify storage works
        bytes32 stored = zeroHash;
        assertEq(stored, zeroHash, "Should store zero hash correctly");
    }

    /// @notice Test maximum bytes32 value (all 0xFF)
    function test_MaxBytes32Value() public {
        bytes32 maxHash = bytes32(type(uint256).max);

        // Verify storage works
        bytes32 stored = maxHash;
        assertEq(stored, maxHash, "Should store max bytes32 value correctly");
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*              Hash Format Conversion Tests                   */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Test conversion from hex string to bytes32 (simulating offchain → onchain)
    function test_HexStringToBytes32Conversion() public {
        // Simulate offchain hex string (what SHA-256 produces)
        string memory hexString = "7d865e959b2466918c9863afca942d0fb89d7c9ac0c99bafc3749504ded97730";

        // Convert to bytes32 (what would happen in Solidity)
        bytes32 expectedHash = 0x7d865e959b2466918c9863afca942d0fb89d7c9ac0c99bafc3749504ded97730;

        // Verify conversion via keccak256 of the hex string representation
        bytes32 derivedHash = bytes32(vm.parseBytes(string.concat("0x", hexString)));

        assertEq(derivedHash, expectedHash, "Hex string should convert to correct bytes32");
    }

    /// @notice Test that bytes32 can be converted back to hex string format
    function test_Bytes32ToHexStringConversion() public view {
        bytes32 hash = 0x7d865e959b2466918c9863afca942d0fb89d7c9ac0c99bafc3749504ded97730;

        // Convert to hex string (simulating onchain → offchain)
        string memory hexString = vm.toString(hash);

        // Verify it has 0x prefix and 66 characters total (0x + 64 hex chars)
        assertTrue(bytes(hexString).length == 66, "Hex string should be 66 chars (0x + 64 hex)");
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*              General Hash Property Tests                    */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Test hash collision resistance (different inputs must produce different hashes)
    function test_HashCollisionResistance() public {
        bytes32 hash1 = keccak256(abi.encodePacked("data1"));
        bytes32 hash2 = keccak256(abi.encodePacked("data2"));
        bytes32 hash3 = keccak256(abi.encodePacked("data3"));

        assertTrue(hash1 != hash2, "Hash 1 and 2 should differ");
        assertTrue(hash1 != hash3, "Hash 1 and 3 should differ");
        assertTrue(hash2 != hash3, "Hash 2 and 3 should differ");
    }

    /// @notice Test that order of data affects hash (important for offchain JSON key ordering)
    function test_HashOrderSensitivity() public {
        // Simulates the importance of sorted keys in offchain JSON
        bytes32 hash1 = keccak256(abi.encodePacked("key1", "value1", "key2", "value2"));
        bytes32 hash2 = keccak256(abi.encodePacked("key2", "value2", "key1", "value1"));

        assertTrue(hash1 != hash2, "Order should affect hash (JSON key sorting matters)");
    }

    /// @notice Test that legal document hash matches expected format
    function test_LeaseTermsHashFormat() public {
        // Simulate lease terms hash from offchain
        bytes32 termsHash = keccak256(
            abi.encode(
                "lessor_address",
                "lessee_address",
                "asset_id",
                "payment_amount",
                "start_time",
                "end_time"
            )
        );

        // Verify hash is valid bytes32
        assertTrue(termsHash != bytes32(0), "Terms hash should not be zero");
        assertTrue(uint256(termsHash) > 0, "Terms hash should have non-zero value");
    }

    /// @notice Test multiple hash types can coexist
    function test_MultipleHashTypes() public {
        bytes32 schemaHash = keccak256("schema");
        bytes32 metadataHash = keccak256("metadata");
        bytes32 legalDocHash = keccak256("legal document");

        // All three different hash types
        assertTrue(schemaHash != legalDocHash, "Schema and legal doc hashes should differ");
        assertTrue(metadataHash != schemaHash, "Metadata and schema hashes should differ");
        assertTrue(metadataHash != legalDocHash, "Metadata and legal doc hashes should differ");
    }

    /// @notice Test nested object hashing (simulating complex JSON structures)
    function test_NestedObjectHashing() public {
        // Simulate nested JSON object hashing
        bytes32 innerHash1 = keccak256(abi.encode("key1", "value1"));
        bytes32 innerHash2 = keccak256(abi.encode("key2", "value2"));
        bytes32 outerHash = keccak256(abi.encode(innerHash1, innerHash2));

        // Verify different structure produces different hash
        bytes32 flatHash = keccak256(abi.encode("key1", "value1", "key2", "value2"));

        assertTrue(outerHash != flatHash, "Nested and flat structures should produce different hashes");
    }
}
