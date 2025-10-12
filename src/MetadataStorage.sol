// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {AccessControl} from "openzeppelin-contracts/access/AccessControl.sol";

/// @title MetadataStorage
/// @notice Provides unstructured onchain metadata storage functionality
/// @dev This contract can be inherited to add metadata capabilities to any contract
abstract contract MetadataStorage is AccessControl {
    struct Metadata {
        /// @notice The metadata key.
        string key;
        /// @notice The metadata value.
        string value;
    }

    /// @notice Metadata storage per hash (hash => metadata)
    mapping(bytes32 => mapping(string => string)) private _metadata;

    /// @notice Array of all metadata keys for enumeration per hash.
    mapping(bytes32 => string[]) private _metadataKeys;

    /// @notice Emitted when metadata is updated.
    event MetadataUpdated(bytes32 indexed hash, string key, string value);

    /// @notice Emitted when metadata is removed.
    event MetadataRemoved(bytes32 indexed hash, string key);

    /// @notice Get a metadata value by key for a specific hash.
    /// @param hash The hash value to identify the metadata namespace.
    /// @param key The metadata key.
    /// @return value The metadata value.
    function getMetadata(bytes32 hash, string memory key) public view returns (string memory value) {
        return _metadata[hash][key];
    }

    // SM: Split into internal _setMetadata (no access control) and public setMetadata (access controlled).
    // This allows constructors to set initial metadata before access control is fully initialized.
    // Without this, AssetERC20 constructor fails because msg.sender (AssetRegistry) lacks DEFAULT_ADMIN_ROLE.

    /// @notice Internal function to set metadata without access control (for use in constructors).
    /// @param hash The hash value to identify the metadata namespace.
    /// @param metadata_ Array of metadata key-value pairs.
    function _setMetadata(bytes32 hash, Metadata[] memory metadata_) internal {
        for (uint256 i = 0; i < metadata_.length; i++) {
            // Check if this is a new key
            bool isNewKey = bytes(_metadata[hash][metadata_[i].key]).length == 0;

            // Set the metadata
            _metadata[hash][metadata_[i].key] = metadata_[i].value;

            // Add to keys array if it's a new key
            if (isNewKey) {
                _metadataKeys[hash].push(metadata_[i].key);
            }

            emit MetadataUpdated(hash, metadata_[i].key, metadata_[i].value);
        }
    }

    /// @notice Set multiple metadata key-value pairs for a specific hash (admin only).
    /// @param hash The hash value to identify the metadata namespace.
    /// @param metadata_ Array of metadata key-value pairs.
    function setMetadata(bytes32 hash, Metadata[] memory metadata_) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _setMetadata(hash, metadata_);
    }

    /// @notice Remove a metadata key for a specific hash (admin only).
    /// @param hash The hash value to identify the metadata namespace.
    /// @param key The metadata key to remove.
    function removeMetadata(bytes32 hash, string calldata key) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(bytes(_metadata[hash][key]).length > 0, "Key does not exist");
        delete _metadata[hash][key];

        // Remove from keys array
        string[] storage keys = _metadataKeys[hash];
        for (uint256 i = 0; i < keys.length; i++) {
            if (keccak256(bytes(keys[i])) == keccak256(bytes(key))) {
                keys[i] = keys[keys.length - 1];
                keys.pop();
                break;
            }
        }

        emit MetadataRemoved(hash, key);
    }

    /// @notice Get all metadata keys for a specific hash.
    /// @param hash The hash value to identify the metadata namespace.
    /// @return keys Array of all metadata keys for this hash.
    function getAllMetadataKeys(bytes32 hash) public view returns (string[] memory keys) {
        return _metadataKeys[hash];
    }

    /// @notice Get all metadata as key-value pairs for a specific hash.
    /// @param hash The hash value to identify the metadata namespace.
    /// @return metadata Array of metadata key-value pairs.
    function getAllMetadata(bytes32 hash) public view returns (Metadata[] memory metadata) {
        string[] storage hashKeys = _metadataKeys[hash];
        metadata = new Metadata[](hashKeys.length);

        for (uint256 i = 0; i < hashKeys.length; i++) {
            metadata[i] = Metadata({key: hashKeys[i], value: _metadata[hash][hashKeys[i]]});
        }
    }

    /// @notice Check if a metadata key exists for a specific hash.
    /// @param hash The hash value to identify the metadata namespace.
    /// @param key The metadata key to check.
    /// @return exists True if the key exists.
    function hasMetadata(bytes32 hash, string calldata key) public view returns (bool exists) {
        return bytes(_metadata[hash][key]).length > 0;
    }

    /// @notice Get the number of metadata entries for a specific hash.
    /// @param hash The hash value to identify the metadata namespace.
    /// @return count The number of metadata entries for this hash.
    function getMetadataCount(bytes32 hash) public view returns (uint256 count) {
        return _metadataKeys[hash].length;
    }
}
