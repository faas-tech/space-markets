// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

// Protocol Contracts
import {BaseUpgradable} from "./utils/BaseUpgradable.sol";
import {MetadataStorage} from "./MetadataStorage.sol";
import {Roles} from "./libraries/Roles.sol";
import {AssetRegistry} from "./AssetRegistry.sol";

// OpenZeppelin Contracts
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {EIP712Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/// @title LeaseFactory
/// @notice Mints ERC-721 Lease NFTs when both lessor and lessee sign an EIP-712 lease intent.
/// @dev Stores minimal lease data onchain; heavy metadata/legal docs are referenced by hashes and URIs.
contract LeaseFactory is BaseUpgradable, ERC721Upgradeable, EIP712Upgradeable, MetadataStorage {
    using ECDSA for bytes32;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        Data / Storage                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Typed lease intent signed by lessor and lessee (EIP-712).
    struct LeaseIntent {
        uint64 deadline; // signature expiry
        bytes32 assetTypeSchemaHash; // binds intent to asset type schema
        Lease lease;
    }

    /// @notice Typed lease payload signed by lessor and lessee (EIP-712).
    struct Lease {
        address lessor;
        address lessee; // set to bidder in marketplace flow
        uint256 assetId; // must exist in registry
        address paymentToken; // stablecoin address for payments
        uint256 rentAmount; // per period
        uint256 rentPeriod; // seconds per rent period
        uint256 securityDeposit; // upfront deposit
        uint64 startTime;
        uint64 endTime;
        bytes32 legalDocHash; // hash of signed legal document
        uint16 termsVersion; // schema version bump
        Metadata[] metadata;
    }

    /// @notice The id of the next lease to be minted.
    uint256 public leaseId;

    /// @notice External asset registry used for schema/asset checks.
    AssetRegistry public registry;

    /// @dev EIP-712 typehash for LeaseIntent.
    bytes32 private constant LEASEINTENT_TYPEHASH =
        keccak256("LeaseIntent(uint64 deadline,bytes32 assetTypeSchemaHash,Lease lease)");

    /// @dev EIP-712 typehash for Lease.
    bytes32 private constant LEASE_TYPEHASH = keccak256(
        "Lease(address lessor,address lessee,uint256 assetId,address paymentToken,uint256 rentAmount,uint256 rentPeriod,uint256 securityDeposit,uint64 startTime,uint64 endTime,bytes32 metadataHash,bytes32 legalDocHash,uint16 termsVersion)"
    );

    /// @notice tokenId => lease data.
    mapping(uint256 => Lease) public leases;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           Events                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Emitted when a Lease NFT is minted.
    event LeaseMinted(uint256 indexed tokenId, address indexed lessor, address indexed lessee, uint256 assetId);

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    Constructor / Initializer               */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @param admin Address receiving admin roles.
    /// @param upgrader Address receiving UPGRADER_ROLE.
    /// @param assetRegistry Address of the AssetRegistry.
    function initialize(address admin, address upgrader, address assetRegistry) public initializer {
        registry = AssetRegistry(assetRegistry);
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(Roles.UPGRADER_ROLE, upgrader);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    Lease Functions                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Verifies signatures and mints a Lease NFT to the lessee.
    /// @param L The lease intent payload.
    /// @param sigLessor EIP-712 signature from the lessor.
    /// @param sigLessee EIP-712 signature from the lessee.
    /// @return tokenId The newly minted Lease NFT id.
    function mintLease(LeaseIntent calldata L, bytes calldata sigLessor, bytes calldata sigLessee)
        external
        returns (uint256 tokenId)
    {
        require(block.timestamp <= L.deadline, "expired");
        require(L.lease.startTime < L.lease.endTime, "bad times");
        require(registry.assetExists(L.lease.assetId), "asset !exists");

        // verify both signatures
        bytes32 d = _digest(L);
        require(ECDSA.recover(d, sigLessor) == L.lease.lessor, "lessor sig invalid");
        require(ECDSA.recover(d, sigLessee) == L.lease.lessee, "lessee sig invalid");

        tokenId = leaseId++;

        _safeMint(L.lease.lessee, tokenId);

        // Store lease data
        leases[tokenId] = L.lease;

        setMetadata(keccak256(abi.encodePacked(tokenId)), L.lease.metadata);

        emit LeaseMinted(tokenId, L.lease.lessor, L.lease.lessee, L.lease.assetId);
    }

    /// @notice Helper for clients/tests to compute the exact digest to sign.
    /// @dev Avoids domain/type hash drift in offchain code.
    function hashLeaseIntent(LeaseIntent calldata L) external view returns (bytes32) {
        return _digest(L);
    }

    /// @dev EIP-712 digest for a LeaseIntent (domain separator + struct hash).
    function _digest(LeaseIntent calldata L) internal view returns (bytes32) {
        bytes32 leaseHash = keccak256(
            abi.encode(
                LEASE_TYPEHASH,
                L.lease.lessor,
                L.lease.lessee,
                L.lease.assetId,
                L.lease.paymentToken,
                L.lease.rentAmount,
                L.lease.rentPeriod,
                L.lease.securityDeposit,
                L.lease.startTime,
                L.lease.endTime,
                L.lease.legalDocHash,
                L.lease.termsVersion
            )
        );
        bytes32 structHash = keccak256(abi.encode(LEASEINTENT_TYPEHASH, L.deadline, L.assetTypeSchemaHash, leaseHash));
        return _hashTypedDataV4(structHash);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    Metadata Functions                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Get the token ID hash used for metadata storage.
    /// @param tokenId The token ID.
    /// @return hash The keccak256 hash of the token ID.
    function getTokenIdHash(uint256 tokenId) public pure returns (bytes32 hash) {
        return keccak256(abi.encodePacked(tokenId));
    }

    /// @notice Get a metadata value by key for a specific lease token.
    /// @param tokenId The lease token ID.
    /// @param key The metadata key.
    /// @return value The metadata value.
    function getMetadata(uint256 tokenId, string calldata key) external view returns (string memory value) {
        return super.getMetadata(getTokenIdHash(tokenId), key);
    }

    /// @notice Set multiple metadata key-value pairs for a specific lease token (admin only).
    /// @param tokenId The lease token ID.
    /// @param metadata_ Array of metadata key-value pairs.
    function setMetadata(uint256 tokenId, Metadata[] calldata metadata_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_ownerOf(tokenId) != address(0), "token not minted");
        super.setMetadata(getTokenIdHash(tokenId), metadata_);
    }

    /// @notice Remove a metadata key for a specific lease token (admin only).
    /// @param tokenId The lease token ID.
    /// @param key The metadata key to remove.
    function removeMetadata(uint256 tokenId, string calldata key) external onlyRole(DEFAULT_ADMIN_ROLE) {
        super.removeMetadata(getTokenIdHash(tokenId), key);
    }

    /// @notice Get all metadata keys for a specific lease token.
    /// @param tokenId The lease token ID.
    /// @return keys Array of all metadata keys for this token.
    function getMetadataKeys(uint256 tokenId) external view returns (string[] memory keys) {
        return super.getAllMetadataKeys(getTokenIdHash(tokenId));
    }

    /// @notice Get all metadata as key-value pairs for a specific lease token.
    /// @param tokenId The lease token ID.
    /// @return metadata Array of metadata key-value pairs.
    function getAllMetadata(uint256 tokenId) external view returns (Metadata[] memory metadata) {
        return super.getAllMetadata(getTokenIdHash(tokenId));
    }

    /// @notice Check if a metadata key exists for a specific lease token.
    /// @param tokenId The lease token ID.
    /// @param key The metadata key to check.
    /// @return exists True if the key exists.
    function hasMetadata(uint256 tokenId, string calldata key) external view returns (bool exists) {
        return super.hasMetadata(getTokenIdHash(tokenId), key);
    }

    /// @notice Get the number of metadata entries for a specific lease token.
    /// @param tokenId The lease token ID.
    /// @return count The number of metadata entries for this token.
    function getMetadataCount(uint256 tokenId) external view returns (uint256 count) {
        return super.getMetadataCount(getTokenIdHash(tokenId));
    }

    /// @inheritdoc ERC721Upgradeable
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "not minted");

        // Try to get uri from metadata first
        string memory uri = getMetadata(getTokenIdHash(tokenId), "uri");

        // If no custom URI is set, return empty string
        if (bytes(uri).length == 0) {
            return "";
        }

        return (string.concat(uri, Strings.toString(tokenId)));
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                            EIP-165                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721Upgradeable, AccessControlUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
