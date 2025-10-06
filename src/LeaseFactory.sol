// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {ERC721} from "openzeppelin-contracts/token/ERC721/ERC721.sol";
import {EIP712} from "openzeppelin-contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "openzeppelin-contracts/utils/cryptography/ECDSA.sol";
import {AccessControl} from "openzeppelin-contracts/access/AccessControl.sol";
import {IAssetRegistry} from "./interfaces/IAssetRegistry.sol";

/// @title LeaseFactory
/// @notice Mints ERC-721 Lease NFTs when both lessor and lessee sign an EIP-712 lease intent.
/// @dev Stores minimal lease data onchain; heavy metadata/legal docs are referenced by hashes and URIs.
contract LeaseFactory is ERC721, EIP712, AccessControl {
    using ECDSA for bytes32;

    /// @notice Role for admin operations.
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    /// @notice External asset registry used for schema/asset checks.
    IAssetRegistry public immutable registry;

    /// @notice Typed lease payload signed by lessor and lessee (EIP-712).
    struct LeaseIntent {
        address lessor;
        address lessee;          // set to bidder in marketplace flow
        uint256 assetId;         // must exist in registry
        address paymentToken;    // stablecoin address for payments
        uint256 rentAmount;      // per period
        uint256 rentPeriod;      // seconds per rent period
        uint256 securityDeposit; // upfront deposit
        uint64  startTime;
        uint64  endTime;
        bytes32 metadataHash;    // canonical lease JSON hash
        bytes32 legalDocHash;    // hash of signed legal document
        uint256 nonce;           // anti-replay
        uint64  deadline;        // signature expiry
        uint16  termsVersion;    // schema version bump
        bytes32 assetTypeSchemaHash; // binds intent to asset type schema
    }

    /// @dev EIP-712 typehash for LeaseIntent.
    bytes32 private constant LEASEINTENT_TYPEHASH = keccak256(
        "LeaseIntent(address lessor,address lessee,uint256 assetId,address paymentToken,uint256 rentAmount,uint256 rentPeriod,uint256 securityDeposit,uint64 startTime,uint64 endTime,bytes32 metadataHash,bytes32 legalDocHash,uint256 nonce,uint64 deadline,uint16 termsVersion,bytes32 assetTypeSchemaHash)"
    );

    /// @notice Stored lease payload for each minted Lease NFT.
    struct LeaseData {
        address lessor;
        address lessee;
        uint256 assetId;
        address paymentToken;
        uint256 rentAmount;
        uint256 rentPeriod;
        uint256 securityDeposit;
        uint64  startTime;
        uint64  endTime;
        bytes32 metadataHash;
        bytes32 legalDocHash;
        uint16  termsVersion;
        string  tokenURIOverride;
        bool    exists;
    }

    /// @notice tokenId => lease data.
    mapping(uint256 => LeaseData) public leases;
    /// @notice simple global nonce consumption (can be refined to per-signer map).
    mapping(uint256 => bool) public consumedNonce;

    /// @notice Emitted when a Lease NFT is minted.
    event LeaseMinted(uint256 indexed tokenId, address indexed lessor, address indexed lessee, uint256 assetId);

    /// @param admin Address receiving admin roles.
    /// @param assetRegistry Address of the AssetRegistry.
    constructor(address admin, address assetRegistry)
        ERC721("Lease Agreement", "LEASE")
        EIP712("AssetLeasingProtocol", "1")
    {
        registry = IAssetRegistry(assetRegistry);
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
    }

    /// @notice Computes a deterministic Lease token id from key fields (excludes nonce/deadline).
    function computeLeaseTokenId(LeaseIntent calldata L) public pure returns (uint256) {
        return uint256(keccak256(abi.encode(
            L.lessor, L.lessee, L.assetId, L.paymentToken,
            L.rentAmount, L.rentPeriod, L.securityDeposit,
            L.startTime, L.endTime, L.metadataHash, L.legalDocHash, L.termsVersion
        )));
    }

    /// @dev EIP-712 digest for a LeaseIntent (domain separator + struct hash).
    function _digest(LeaseIntent calldata L) internal view returns (bytes32) {
        bytes32 structHash = keccak256(abi.encode(
            LEASEINTENT_TYPEHASH,
            L.lessor, L.lessee, L.assetId, L.paymentToken,
            L.rentAmount, L.rentPeriod, L.securityDeposit,
            L.startTime, L.endTime,
            L.metadataHash, L.legalDocHash,
            L.nonce, L.deadline, L.termsVersion,
            L.assetTypeSchemaHash
        ));
        return _hashTypedDataV4(structHash);
    }

    /// @notice Helper for clients/tests to compute the exact digest to sign.
    /// @dev Avoids domain/type hash drift in offchain code.
    function hashLeaseIntent(LeaseIntent calldata L) external view returns (bytes32) {
        return _digest(L);
    }

    /// @notice Verifies signatures and mints a Lease NFT to the lessee.
    /// @param L The lease intent payload.
    /// @param sigLessor EIP-712 signature from the lessor.
    /// @param sigLessee EIP-712 signature from the lessee.
    /// @param tokenUri_ Optional offchain metadata URI for the Lease NFT.
    /// @return tokenId The newly minted Lease NFT id.
    function mintLease(
        LeaseIntent calldata L,
        bytes calldata sigLessor,
        bytes calldata sigLessee,
        string calldata tokenUri_
    ) external returns (uint256 tokenId) {
        require(block.timestamp <= L.deadline, "expired");
        require(L.startTime < L.endTime, "bad times");
        require(!consumedNonce[L.nonce], "nonce used");
        require(registry.assetExists(L.assetId), "asset !exists");

        // schema anchor: ensure the lease intent matches the asset type schema
        IAssetRegistry.Asset memory a = registry.getAsset(L.assetId);
        IAssetRegistry.AssetType memory t = registry.getType(a.typeId);
        require(L.assetTypeSchemaHash == t.schemaHash, "schema mismatch");

        // verify both signatures
        bytes32 d = _digest(L);
        require(ECDSA.recover(d, sigLessor) == L.lessor, "lessor sig invalid");
        require(ECDSA.recover(d, sigLessee) == L.lessee, "lessee sig invalid");
        consumedNonce[L.nonce] = true;

        tokenId = computeLeaseTokenId(L);
        require(!leases[tokenId].exists, "lease exists");

        _safeMint(L.lessee, tokenId);
        leases[tokenId] = LeaseData(
            L.lessor, L.lessee, L.assetId, L.paymentToken,
            L.rentAmount, L.rentPeriod, L.securityDeposit,
            L.startTime, L.endTime, L.metadataHash, L.legalDocHash,
            L.termsVersion, tokenUri_, true
        );

        emit LeaseMinted(tokenId, L.lessor, L.lessee, L.assetId);
    }

    /// @inheritdoc ERC721
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(leases[tokenId].exists, "not minted");
        return leases[tokenId].tokenURIOverride;
    }

    /// @dev See {IERC165-supportsInterface}.
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
