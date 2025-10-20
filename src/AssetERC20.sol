// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {ERC20} from "openzeppelin-contracts/token/ERC20/ERC20.sol";
import {EnumerableSet} from "openzeppelin-contracts/utils/structs/EnumerableSet.sol";
import {EIP712} from "openzeppelin-contracts/utils/cryptography/EIP712.sol";
import {MetadataStorage} from "./MetadataStorage.sol";

struct AddressSet {
    address[] holders;
}

/// @title AssetERC20
/// @notice ERC-20 token representing full and fractional ownership of a single registered asset.
/// @dev One instance of this contract is deployed per asset by the AssetRegistry.
///      It includes OpenZeppelin's ERC20Snapshot to support snapshot-based revenue sharing.
contract AssetERC20 is ERC20, EIP712, MetadataStorage {
    /// @notice The id of the asset in the registry that this ERC-20 represents.
    uint256 public immutable ASSET_ID;

    /// @notice The set of addresses that are allowed to transfer the asset.
    EnumerableSet.AddressSet private _holders;

    /// @param name ERC-20 name.
    /// @param symbol ERC-20 symbol.
    /// @param totalSupply Total supply to mint on deployment (represents 100% of the asset).
    /// @param assetId Registry asset id.
    /// @param admin Address that receives DEFAULT_ADMIN_ROLE (typically the registry/owner).
    /// @param tokenRecipient Address that receives the full initial supply.
    /// @param metadata Array of metadata key-value pairs to initialize.
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
        _mint(tokenRecipient, totalSupply);
        setMetadata(keccak256(abi.encodePacked(ASSET_ID)), metadata);
    }

    // ---------------------------------------------------------------------
    //                      Overridden Metadata Functions
    // ---------------------------------------------------------------------

    /// @notice Get the asset ID hash used for metadata storage.
    /// @return hash The keccak256 hash of the asset ID.
    function getAssetIdHash() public view returns (bytes32 hash) {
        return keccak256(abi.encodePacked(ASSET_ID));
    }

    /// @notice Get a metadata value by key for this asset.
    /// @param key The metadata key.
    /// @return value The metadata value.
    function getMetadata(string calldata key) external view returns (string memory value) {
        return super.getMetadata(getAssetIdHash(), key);
    }

    /// @notice Set multiple metadata key-value pairs for this asset (admin only).
    /// @param metadata_ Array of metadata key-value pairs.
    function setMetadata(Metadata[] calldata metadata_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        super.setMetadata(getAssetIdHash(), metadata_);
    }

    /// @notice Remove a metadata key for this asset (admin only).
    /// @param key The metadata key to remove.
    function removeMetadata(string calldata key) external onlyRole(DEFAULT_ADMIN_ROLE) {
        super.removeMetadata(getAssetIdHash(), key);
    }

    /// @notice Get all metadata keys for this asset.
    /// @return keys Array of all metadata keys.
    function getAllMetadataKeys() external view returns (string[] memory keys) {
        return super.getAllMetadataKeys(getAssetIdHash());
    }

    /// @notice Get all metadata as key-value pairs for this asset.
    /// @return metadata Array of metadata key-value pairs.
    function getAllMetadata() external view returns (Metadata[] memory metadata) {
        return super.getAllMetadata(getAssetIdHash());
    }

    /// @notice Check if a metadata key exists for this asset.
    /// @param key The metadata key to check.
    /// @return exists True if the key exists.
    function hasMetadata(string calldata key) external view returns (bool exists) {
        return super.hasMetadata(getAssetIdHash(), key);
    }

    /// @notice Get the number of metadata entries for this asset.
    /// @return count The number of metadata entries.
    function getMetadataCount() external view returns (uint256 count) {
        return super.getMetadataCount(getAssetIdHash());
    }

    // ---------------------------------------------------------------------
    //            Legacy URI functions (for backward compatibility)
    // ---------------------------------------------------------------------

    function tokenURI() public view returns (string memory) {
        // Try to get tokenURI from metadata first
        string memory uri = getMetadata(getAssetIdHash(), "tokenURI");

        // If no custom URI is set, return empty string
        if (bytes(uri).length == 0) {
            return "";
        }

        return uri;
    }

    // ---------------------------------------------------------------------
    //                      Holders functions
    // ---------------------------------------------------------------------

    function getHolders() external view returns (address[] memory holders, uint256[] memory balances) {
        uint256 length = EnumerableSet.length(_holders);
        holders = new address[](length);
        balances = new uint256[](length);

        for (uint256 i = 0; i < length; i++) {
            address holder = EnumerableSet.at(_holders, i);
            holders[i] = holder;
            balances[i] = balanceOf(holder);
        }
        return (holders, balances);
    }
}
