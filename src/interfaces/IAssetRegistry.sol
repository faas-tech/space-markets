// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IAssetRegistry
/// @notice Minimal read-only interface for the Asset Registry used by other contracts.
/// @dev This interface exposes asset types and assets with schema and metadata anchors.
interface IAssetRegistry {
    /// @notice Describes a class of assets (e.g., Satellite, SpaceStation).
    /// @dev `schemaHash` is the keccak256 of a canonical JSON Schema (e.g., JCS-serialized);
    ///      `requiredLeaseKeys` are keccak256 hashes of human-readable field IDs present in lease metadata;
    ///      `schemaURI` is optional for UX (IPFS/HTTPS).
    struct AssetType {
        string name;
        bytes32 schemaHash;
        bytes32[] requiredLeaseKeys;
        string schemaURI;
        bool exists;
    }

    /// @notice Describes a concrete asset instance registered in the protocol.
    /// @dev `metadataHash` anchors the canonical JSON for the specific asset instance;
    ///      `dataURI` points to the human-readable JSON (IPFS/HTTPS);
    ///      `tokenAddress` is the ERC-20 contract representing fractional ownership.
    struct Asset {
        uint256 typeId;
        address issuer;
        bytes32 metadataHash;
        string dataURI;
        address tokenAddress;
        bool exists;
    }

    /// @notice Returns an asset type by id.
    function getType(uint256 typeId) external view returns (AssetType memory);

    /// @notice Returns an asset by id.
    function getAsset(uint256 assetId) external view returns (Asset memory);

    /// @notice Returns true if an asset id exists.
    function assetExists(uint256 assetId) external view returns (bool);
}
