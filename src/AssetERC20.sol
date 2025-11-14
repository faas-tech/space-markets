// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

// Protocol Contracts
import {BaseUpgradable} from "./utils/BaseUpgradable.sol";
import {MetadataStorage} from "./MetadataStorage.sol";
import {Roles} from "./libraries/Roles.sol";

// OpenZeppelin Contracts
import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {EIP712Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

/// @title AssetERC20
/// @notice ERC-20 token representing full and fractional ownership of a single registered asset.
/// @dev One instance of this contract is deployed per asset by the AssetRegistry.
///      It includes OpenZeppelin's ERC20Snapshot to support snapshot-based revenue sharing.
contract AssetERC20 is BaseUpgradable, ERC20Upgradeable, EIP712Upgradeable, MetadataStorage {
    using EnumerableSet for EnumerableSet.AddressSet;
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        Data / Storage                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice The id of the asset in the registry that this ERC-20 represents.
    uint256 private _assetId;

    /// @notice The set of addresses that are allowed to transfer the asset.
    EnumerableSet.AddressSet private _holders;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                Constructor / Initializer                   */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Initializes the contract.
    /// @param name ERC-20 name.
    /// @param symbol ERC-20 symbol.
    /// @param totalSupply Total supply to mint on deployment (represents 100% of the asset).
    /// @param assetId Id assigned to the asset in the registry contract.
    /// @param admin Address that receives DEFAULT_ADMIN_ROLE (typically the registry/owner).
    /// @param upgrader Address that receives UPGRADER_ROLE.
    /// @param tokenRecipient Address that receives the full initial supply.
    /// @param metadata Array of metadata key-value pairs to initialize.
    function initialize(
        string memory name,
        string memory symbol,
        uint256 totalSupply,
        uint256 assetId,
        address admin,
        address upgrader,
        address tokenRecipient,
        Metadata[] memory metadata
    ) public initializer {
        __ERC20_init(name, symbol);
        __EIP712_init(name, "1");
        _assetId = assetId;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(Roles.UPGRADER_ROLE, upgrader);
        _mint(tokenRecipient, totalSupply);
        _setMetadata(keccak256(abi.encodePacked(_assetId)), metadata);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    Metadata Functions                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Get the asset ID hash used for metadata storage.
    /// @return hash The keccak256 hash of the asset ID.
    function _getAssetIdHash() internal view returns (bytes32 hash) {
        return keccak256(abi.encodePacked(_assetId));
    }

    /// @notice Set multiple metadata key-value pairs for this asset (admin only).
    /// @param metadata_ Array of metadata key-value pairs.
    function setMetadata(Metadata[] calldata metadata_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setMetadata(_getAssetIdHash(), metadata_);
    }

    /// @notice Remove a metadata key for this asset (admin only).
    /// @param key The metadata key to remove.
    function removeMetadata(string calldata key) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _removeMetadata(_getAssetIdHash(), key);
    }

    /// @notice Get a metadata value by key for this asset.
    /// @param key The metadata key.
    /// @return value The metadata value.
    function getMetadata(string calldata key) external view returns (string memory value) {
        return super.getMetadata(_getAssetIdHash(), key);
    }

    /// @notice Get all metadata keys for this asset.
    /// @return keys Array of all metadata keys.
    function getAllMetadataKeys() external view returns (string[] memory keys) {
        return super.getAllMetadataKeys(_getAssetIdHash());
    }

    /// @notice Get all metadata as key-value pairs for this asset.
    /// @return metadata Array of metadata key-value pairs.
    function getAllMetadata() external view returns (Metadata[] memory metadata) {
        return super.getAllMetadata(_getAssetIdHash());
    }

    /// @notice Check if a metadata key exists for this asset.
    /// @param key The metadata key to check.
    /// @return exists True if the key exists.
    function hasMetadata(string calldata key) external view returns (bool exists) {
        return super.hasMetadata(_getAssetIdHash(), key);
    }

    /// @notice Get the number of metadata entries for this asset.
    /// @return count The number of metadata entries.
    function getMetadataCount() external view returns (uint256 count) {
        return super.getMetadataCount(_getAssetIdHash());
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                     ERC20 Overrides                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _update(address from, address to, uint256 value) internal override {
        super._update(from, to, value);
        if (from != address(0)) {
            if (balanceOf(from) == 0) {
                _holders.remove(from);
            }
        }
        if (to != address(0)) {
            _holders.add(to);
        }
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    Holders Functions                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

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
