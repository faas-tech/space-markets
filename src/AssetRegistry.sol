// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "openzeppelin-contracts/access/AccessControl.sol";
import {AssetERC20} from "./AssetERC20.sol";
import {IAssetRegistry} from "./interfaces/IAssetRegistry.sol";

/// @title AssetRegistry
/// @notice Canonical registry of asset types and assets. Deploys a per-asset ERC-20 on registration.
/// @dev Stores only hashes on-chain for metadata/schema; full JSON documents live off-chain (e.g., IPFS).
contract AssetRegistry is AccessControl {
    /// @notice Admins manage asset types and roles.
    bytes32 public constant ADMIN_ROLE     = keccak256("ADMIN_ROLE");
    /// @notice Registrars can register new assets.
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");

    /// @inheritdoc IAssetRegistry
    struct AssetType {
        string name;
        bytes32 schemaHash;
        bytes32[] requiredLeaseKeys;
        string schemaURI;
        bool exists;
    }

    /// @inheritdoc IAssetRegistry
    struct Asset {
        uint256 typeId;
        address issuer;
        bytes32 metadataHash;
        string dataURI;
        address tokenAddress;
        bool exists;
    }

    uint256 public nextTypeId = 1;
    uint256 public nextAssetId = 1;

    mapping(uint256 => AssetType) private _types;
    mapping(uint256 => Asset) private _assets;

    /// @notice Emitted when a new asset type is created.
    event AssetTypeCreated(uint256 indexed typeId, string name, bytes32 schemaHash, bytes32[] requiredLeaseKeys, string schemaURI);
    /// @notice Emitted when an asset is registered and its ERC-20 deployed.
    event AssetRegistered(uint256 indexed assetId, uint256 indexed typeId, address tokenAddress);

    /// @param admin Address that receives admin roles.
    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(REGISTRAR_ROLE, admin);
    }

    /// @notice Creates a new asset type with a canonical schema anchor.
    /// @param name Human-readable name (e.g., "Satellite").
    /// @param schemaHash keccak256 hash of the canonical JSON Schema (e.g., JCS-serialized).
    /// @param requiredLeaseKeys Hashes of lease metadata keys required for this type.
    /// @param schemaURI Optional pointer to the schema JSON (IPFS/HTTPS) for UX.
    /// @return typeId The new asset type id.
    function createAssetType(
        string calldata name,
        bytes32 schemaHash,
        bytes32[] calldata requiredLeaseKeys,
        string calldata schemaURI
    ) external onlyRole(ADMIN_ROLE) returns (uint256 typeId) {
        typeId = nextTypeId++;
        _types[typeId] = AssetType(name, schemaHash, requiredLeaseKeys, schemaURI, true);
        emit AssetTypeCreated(typeId, name, schemaHash, requiredLeaseKeys, schemaURI);
    }

    /// @notice Registers an asset instance, deploys its ERC-20, and mints full supply to the owner.
    /// @param typeId Asset type id previously created.
    /// @param owner Initial token holder (receives 100% supply).
    /// @param metadataHash keccak256 hash of the asset's canonical JSON metadata.
    /// @param dataURI Pointer to human-readable JSON (IPFS/HTTPS).
    /// @param tokenName ERC-20 name.
    /// @param tokenSymbol ERC-20 symbol.
    /// @param totalSupply Total supply representing 100% ownership.
    /// @return assetId The new asset id.
    /// @return tokenAddress The deployed ERC-20 address.
    function registerAsset(
        uint256 typeId,
        address owner,
        bytes32 metadataHash,
        string calldata dataURI,
        string calldata tokenName,
        string calldata tokenSymbol,
        uint256 totalSupply
    ) external onlyRole(REGISTRAR_ROLE) returns (uint256 assetId, address tokenAddress) {
        require(_types[typeId].exists, "type !exists");
        assetId = nextAssetId++;

        AssetERC20 token = new AssetERC20(tokenName, tokenSymbol, assetId, msg.sender, owner, totalSupply);
        tokenAddress = address(token);

        _assets[assetId] = Asset({
            typeId: typeId,
            issuer: msg.sender,
            metadataHash: metadataHash,
            dataURI: dataURI,
            tokenAddress: tokenAddress,
            exists: true
        });

        emit AssetRegistered(assetId, typeId, tokenAddress);
    }

    /// @notice Returns an asset type by id.
    function getType(uint256 typeId) external view returns (AssetType memory) { return _types[typeId]; }

    /// @notice Returns an asset by id.
    function getAsset(uint256 assetId) external view returns (Asset memory) { return _assets[assetId]; }

    /// @notice True if an assetId exists.
    function assetExists(uint256 assetId) external view returns (bool) { return _assets[assetId].exists; }

    /// @notice Utility to compute a field key id from a human-readable string (e.g., "lease.start_time").
    function computeKeyId(string memory key) external pure returns (bytes32) { return keccak256(bytes(key)); }
}
