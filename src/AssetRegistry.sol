// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AssetERC20} from "./AssetERC20.sol";
import {AccessControl} from "openzeppelin-contracts/access/AccessControl.sol";
import {MetadataStorage} from "./MetadataStorage.sol";

/// @title AssetRegistry
/// @notice Canonical registry of asset types and assets. Deploys a per-asset ERC-20 on registration.
/// @dev Stores only hashes onchain for metadata/schema; full JSON documents live offchain (e.g., IPFS).
contract AssetRegistry is AccessControl, MetadataStorage {
    /// @notice Registrars can register new assets.
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");

    /// @notice Describes an asset type registered in the protocol.
    struct AssetType {
        string name;
        bytes32[] requiredLeaseKeys;
    }

    /// @notice Describes an asset instance registered in the protocol.
    struct Asset {
        bytes32 schemaHash;
        address issuer;
        address tokenAddress;
    }

    uint256 public assetId;

    mapping(bytes32 schemaHash => AssetType) private _assetTypes;
    mapping(uint256 => Asset) private _assets;

    /// @notice Emitted when a new asset type is created.
    event AssetTypeCreated(string indexed name, bytes32 indexed schemaHash, bytes32[] requiredLeaseKeys);
    /// @notice Emitted when an asset is registered and its ERC-20 deployed.
    event AssetRegistered(uint256 indexed assetId, bytes32 indexed schemaHash, address tokenAddress);

    /// @param admin Address that receives admin roles.
    /// @param registrar Address that receives registrar role.
    constructor(address admin, address registrar) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(REGISTRAR_ROLE, registrar);
    }

    /// @notice Creates a new asset type with a canonical schema anchor.
    /// @param name Human-readable name (e.g., "Satellite").
    /// @param schemaHash keccak256 hash of the canonical JSON Schema (e.g., JCS-serialized).
    /// @param requiredLeaseKeys Hashes of lease metadata keys required for this type.
    /// @param metadata Array of metadata key-value pairs including schemaURI
    function createAsset(
        string calldata name,
        bytes32 schemaHash,
        bytes32[] calldata requiredLeaseKeys,
        Metadata[] calldata metadata
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _assetTypes[schemaHash] = AssetType(name, requiredLeaseKeys);

        // Store metadata including schemaURI
        setMetadata(schemaHash, metadata);

        emit AssetTypeCreated(name, schemaHash, requiredLeaseKeys);
    }

    /// @notice Registers an asset instance, deploys its ERC-20, and mints full supply to the owner.
    /// @param schemaHash Asset type schema hash previously created.
    /// @param tokenName ERC-20 name.
    /// @param tokenSymbol ERC-20 symbol.
    /// @param totalSupply Total supply representing 100% ownership.
    /// @return newAssetId The new asset id.
    /// @param admin Initial token holder (receives 100% supply).
    /// @param tokenRecipient Initial token recipient (receives 100% supply).
    /// @param metadata Array of metadata key-value pairs for the asset.
    /// @return tokenAddress The deployed ERC-20 address.
    function registerAsset(
        bytes32 schemaHash,
        string calldata tokenName,
        string calldata tokenSymbol,
        uint256 totalSupply,
        address admin,
        address tokenRecipient,
        Metadata[] calldata metadata
    ) external onlyRole(REGISTRAR_ROLE) returns (uint256 newAssetId, address tokenAddress) {
        require(bytes(_assetTypes[schemaHash].name).length > 0, "type !exists");
        newAssetId = ++assetId;

        AssetERC20 token =
            new AssetERC20(tokenName, tokenSymbol, totalSupply, newAssetId, admin, tokenRecipient, metadata);
        tokenAddress = address(token);

        _assets[newAssetId] = Asset({schemaHash: schemaHash, issuer: tokenRecipient, tokenAddress: address(token)});

        emit AssetRegistered(newAssetId, schemaHash, address(token));
    }

    function tokenURI(bytes32 schemaHash) public view returns (string memory) {
        // Try to get tokenURI from metadata first
        string memory uri = getMetadata(schemaHash, "tokenURI");

        // If no custom URI is set, return empty string
        if (bytes(uri).length == 0) {
            return "";
        }

        return uri;
    }

    /// @notice Returns an asset type by schema hash.
    function getType(bytes32 schemaHash) external view returns (AssetType memory) {
        return _assetTypes[schemaHash];
    }

    /// @notice Returns an asset by id.
    function getAsset(uint256 id) external view returns (Asset memory) {
        return _assets[id];
    }

    /// @notice True if an assetId exists.
    function assetExists(uint256 id) external view returns (bool) {
        return _assets[id].tokenAddress != address(0) ? true : false;
    }
}
