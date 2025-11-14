// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

// Protocol Contracts
import {BaseUpgradable} from "./utils/BaseUpgradable.sol";
import {Roles} from "./libraries/Roles.sol";
import {AssetERC20} from "./AssetERC20.sol";
import {MetadataStorage} from "./MetadataStorage.sol";

// OpenZeppelin Contracts
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";

/// @title AssetRegistry
/// @notice Canonical registry of asset types and assets. Deploys a per-asset ERC-20 on registration.
/// @dev Stores only hashes onchain for metadata/schema; full JSON documents live offchain (e.g., IPFS).
contract AssetRegistry is BaseUpgradable, MetadataStorage {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        Data / Storage                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Describes an asset type registered in the protocol.
    struct AssetType {
        string name;
        bytes32[] requiredLeaseKeys;
    }

    /// @notice Describes an asset instance registered in the protocol.
    struct Asset {
        bytes32 assetType;
        address issuer;
        address tokenAddress;
    }

    /// @notice The id of the next asset to be registered.
    uint256 public assetId;

    /// @notice The implementation address of the AssetERC20 contract.
    address public assetERC20Implementation;

    /// @notice Mapping of schema hashes to asset types.
    mapping(bytes32 assetType => AssetType) private _assetTypes;
    /// @notice Mapping of asset ids to assets.
    mapping(uint256 => Asset) private _assets;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                              Events                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Emitted when a new asset type is created.
    event AssetTypeCreated(string indexed name, bytes32 indexed assetType, bytes32[] requiredLeaseKeys);
    /// @notice Emitted when an asset is registered and its ERC-20 deployed.
    event AssetRegistered(uint256 indexed assetId, bytes32 indexed assetType, address tokenAddress);

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                   Constructor / Initializer                */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function initialize(address admin, address upgrader, address registrar, address _assetERC20Implementation)
        public
        initializer
    {
        assetERC20Implementation = _assetERC20Implementation;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(Roles.UPGRADER_ROLE, upgrader);
        _grantRole(Roles.REGISTRAR_ROLE, registrar);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      Asset Management                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Creates a new asset type with a canonical schema anchor.
    /// @param name Human-readable name (e.g., "Satellite").
    /// @param assetType keccak256 hash of the canonical JSON Schema (e.g., JCS-serialized).
    /// @param requiredLeaseKeys Hashes of lease metadata keys required for this type.
    /// @param metadata Array of metadata key-value pairs including schemaURI
    function createAssetType(
        string calldata name,
        bytes32 assetType,
        bytes32[] calldata requiredLeaseKeys,
        Metadata[] calldata metadata
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _assetTypes[assetType] = AssetType(name, requiredLeaseKeys);

        // Store metadata including schemaURI
        _setMetadata(assetType, metadata);

        emit AssetTypeCreated(name, assetType, requiredLeaseKeys);
    }

    /// @notice Registers an asset instance, deploys its ERC-20, and mints full supply to the owner.
    /// @param assetType Asset type schema hash previously created.
    /// @param tokenName ERC-20 name.
    /// @param tokenSymbol ERC-20 symbol.
    /// @param totalSupply Total supply representing 100% ownership.
    /// @return newAssetId The new asset id.
    /// @param admin Initial token holder (receives 100% supply).
    /// @param upgrader Address that receives UPGRADER_ROLE.
    /// @param tokenRecipient Initial token recipient (receives 100% supply).
    /// @param metadata Array of metadata key-value pairs for the asset.
    function registerAsset(
        bytes32 assetType,
        string calldata tokenName,
        string calldata tokenSymbol,
        uint256 totalSupply,
        address admin,
        address upgrader,
        address tokenRecipient,
        Metadata[] calldata metadata
    ) external onlyRole(Roles.REGISTRAR_ROLE) returns (uint256 newAssetId, address token) {
        require(bytes(_assetTypes[assetType].name).length > 0, "type !exists");
        newAssetId = ++assetId;

        token = Clones.clone(assetERC20Implementation);
        AssetERC20(token).initialize(
            tokenName, tokenSymbol, totalSupply, newAssetId, admin, upgrader, tokenRecipient, metadata
        );

        _assets[newAssetId] = Asset({assetType: assetType, issuer: tokenRecipient, tokenAddress: token});

        emit AssetRegistered(newAssetId, assetType, token);
    }

    /// @notice Returns an asset type by schema hash.
    function getType(bytes32 assetType) external view returns (AssetType memory) {
        return _assetTypes[assetType];
    }

    /// @notice Returns an asset by id.
    function getAsset(uint256 id) external view returns (Asset memory) {
        return _assets[id];
    }

    /// @notice True if an assetId exists.
    function assetExists(uint256 id) external view returns (bool) {
        return _assets[id].tokenAddress != address(0) ? true : false;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       Asset Metadata                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Set multiple metadata key-value pairs for a specific asset.
    /// @param assetType The asset type.
    /// @param metadata Array of metadata key-value pairs.
    function setMetadata(bytes32 assetType, Metadata[] calldata metadata) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setMetadata(assetType, metadata);
    }

    /// @notice Remove a metadata key for a specific asset.
    /// @param assetType The asset type.
    /// @param key The metadata key to remove.
    function removeMetadata(bytes32 assetType, string calldata key) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _removeMetadata(assetType, key);
    }
}
