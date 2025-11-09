// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {LeaseFactory} from "../../src/LeaseFactory.sol";
import {AssetRegistry} from "../../src/AssetRegistry.sol";
import {AssetERC20} from "../../src/AssetERC20.sol";
import {MetadataStorage} from "../../src/MetadataStorage.sol";
import {Roles} from "../../src/libraries/Roles.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/// @title LeaseFactoryTest
/// @notice Comprehensive test suite for LeaseFactory NFT and metadata functionality
contract LeaseFactoryTest is Test {
    LeaseFactory public leaseFactory;
    AssetRegistry public registry;

    address public admin = address(0x1);
    address public upgrader = address(0x2);
    address public registrar = address(0x3);
    address public lessor = address(0x4);
    address public lessee = address(0x5);
    address public user = address(0x6);

    uint256 public pkLessor = 0xA11CE;
    uint256 public pkLessee = 0xB0B;

    address public assetERC20Implementation;
    uint256 public assetId;
    bytes32 public assetType;

    event LeaseMinted(uint256 indexed tokenId, address indexed lessor, address indexed lessee, uint256 assetId);
    event MetadataUpdated(bytes32 indexed hash, string key, string value);
    event MetadataRemoved(bytes32 indexed hash, string key);

    function setUp() public {
        // Derive addresses from private keys
        lessor = vm.addr(pkLessor);
        lessee = vm.addr(pkLessee);

        // Deploy AssetERC20 implementation
        assetERC20Implementation = address(new AssetERC20());

        // Deploy and initialize AssetRegistry
        AssetRegistry registryImpl = new AssetRegistry();
        ERC1967Proxy registryProxy = new ERC1967Proxy(
            address(registryImpl),
            abi.encodeCall(AssetRegistry.initialize, (admin, upgrader, registrar, assetERC20Implementation))
        );
        registry = AssetRegistry(address(registryProxy));

        // Deploy and initialize LeaseFactory
        LeaseFactory leaseImpl = new LeaseFactory();
        ERC1967Proxy leaseProxy = new ERC1967Proxy(
            address(leaseImpl),
            abi.encodeCall(LeaseFactory.initialize, (admin, upgrader, address(registry)))
        );
        leaseFactory = LeaseFactory(address(leaseProxy));

        // Create asset type and register asset for testing
        assetType = keccak256("test-asset-type");
        bytes32[] memory emptyKeys = new bytes32[](0);
        MetadataStorage.Metadata[] memory emptyMeta = new MetadataStorage.Metadata[](0);

        vm.prank(admin);
        registry.createAssetType("TestType", assetType, emptyKeys, emptyMeta);

        vm.prank(registrar);
        (assetId,) = registry.registerAsset(
            assetType,
            "Test Asset",
            "TST",
            1000e18,
            admin,
            upgrader,
            lessor,
            emptyMeta
        );
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    INITIALIZATION                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_Initialization() public {
        assertEq(leaseFactory.name(), "Lease");
        assertEq(leaseFactory.symbol(), "LEASE");
        assertEq(address(leaseFactory.registry()), address(registry));
        assertTrue(leaseFactory.hasRole(leaseFactory.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(leaseFactory.hasRole(Roles.UPGRADER_ROLE, upgrader));
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    LEASE MINTING                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_MintLease() public {
        // Create lease with metadata
        MetadataStorage.Metadata[] memory metadata = new MetadataStorage.Metadata[](2);
        metadata[0] = MetadataStorage.Metadata({key: "location", value: "Building A"});
        metadata[1] = MetadataStorage.Metadata({key: "purpose", value: "Commercial"});

        LeaseFactory.LeaseIntent memory leaseIntent = LeaseFactory.LeaseIntent({
            deadline: uint64(block.timestamp + 1 days),
            assetType: assetType,
            lease: LeaseFactory.Lease({
                lessor: lessor,
                lessee: lessee,
                assetId: assetId,
                paymentToken: address(0),
                rentAmount: 1000e6,
                rentPeriod: 30 days,
                securityDeposit: 5000e6,
                startTime: uint64(block.timestamp + 1 days),
                endTime: uint64(block.timestamp + 365 days),
                legalDocHash: keccak256("legal-doc"),
                termsVersion: 1,
                metadata: metadata
            })
        });

        // Generate signatures
        bytes32 digest = leaseFactory.hashLeaseIntent(leaseIntent);
        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(pkLessor, digest);
        bytes memory sigLessor = abi.encodePacked(r1, s1, v1);
        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(pkLessee, digest);
        bytes memory sigLessee = abi.encodePacked(r2, s2, v2);

        // Mint lease
        vm.expectEmit(true, true, true, true);
        emit LeaseMinted(0, lessor, lessee, assetId);

        uint256 tokenId = leaseFactory.mintLease(leaseIntent, sigLessor, sigLessee);

        // Verify lease was created
        assertEq(tokenId, 0);
        assertEq(leaseFactory.ownerOf(tokenId), lessee);
        assertEq(leaseFactory.leaseId(), 1);
    }

    function test_MintLeaseStoresData() public {
        MetadataStorage.Metadata[] memory metadata = new MetadataStorage.Metadata[](1);
        metadata[0] = MetadataStorage.Metadata({key: "test", value: "value"});

        LeaseFactory.LeaseIntent memory leaseIntent = LeaseFactory.LeaseIntent({
            deadline: uint64(block.timestamp + 1 days),
            assetType: assetType,
            lease: LeaseFactory.Lease({
                lessor: lessor,
                lessee: lessee,
                assetId: assetId,
                paymentToken: address(0x123),
                rentAmount: 2000e6,
                rentPeriod: 15 days,
                securityDeposit: 10000e6,
                startTime: uint64(block.timestamp + 2 days),
                endTime: uint64(block.timestamp + 180 days),
                legalDocHash: keccak256("legal"),
                termsVersion: 2,
                metadata: metadata
            })
        });

        bytes32 digest = leaseFactory.hashLeaseIntent(leaseIntent);
        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(pkLessor, digest);
        bytes memory sigLessor = abi.encodePacked(r1, s1, v1);
        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(pkLessee, digest);
        bytes memory sigLessee = abi.encodePacked(r2, s2, v2);

        uint256 tokenId = leaseFactory.mintLease(leaseIntent, sigLessor, sigLessee);

        // Verify stored lease data (access individual fields since Lease contains dynamic array)
        (
            address storedLessor,
            address storedLessee,
            uint256 storedAssetId,
            address storedPaymentToken,
            uint256 storedRentAmount,
            uint256 storedRentPeriod,
            uint256 storedSecurityDeposit,
            uint64 storedStartTime,
            uint64 storedEndTime,
            bytes32 storedLegalDocHash,
            uint16 storedTermsVersion
        ) = leaseFactory.leases(tokenId);

        assertEq(storedLessor, lessor);
        assertEq(storedLessee, lessee);
        assertEq(storedAssetId, assetId);
        assertEq(storedPaymentToken, address(0x123));
        assertEq(storedRentAmount, 2000e6);
        assertEq(storedRentPeriod, 15 days);
        assertEq(storedSecurityDeposit, 10000e6);
        assertEq(storedStartTime, uint64(block.timestamp + 2 days));
        assertEq(storedEndTime, uint64(block.timestamp + 180 days));
        assertEq(storedLegalDocHash, keccak256("legal"));
        assertEq(storedTermsVersion, 2);
    }

    function test_MintMultipleLeases() public {
        MetadataStorage.Metadata[] memory emptyMeta = new MetadataStorage.Metadata[](0);

        // Create first lease
        LeaseFactory.LeaseIntent memory lease1 = _createLeaseIntent(
            uint64(block.timestamp + 1 days),
            uint64(block.timestamp + 2 days),
            uint64(block.timestamp + 365 days),
            emptyMeta
        );

        bytes32 digest1 = leaseFactory.hashLeaseIntent(lease1);
        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(pkLessor, digest1);
        bytes memory sig1Lessor = abi.encodePacked(r1, s1, v1);
        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(pkLessee, digest1);
        bytes memory sig1Lessee = abi.encodePacked(r2, s2, v2);

        uint256 tokenId1 = leaseFactory.mintLease(lease1, sig1Lessor, sig1Lessee);

        // Create second lease
        LeaseFactory.LeaseIntent memory lease2 = _createLeaseIntent(
            uint64(block.timestamp + 2 days),
            uint64(block.timestamp + 3 days),
            uint64(block.timestamp + 400 days),
            emptyMeta
        );

        bytes32 digest2 = leaseFactory.hashLeaseIntent(lease2);
        (uint8 v3, bytes32 r3, bytes32 s3) = vm.sign(pkLessor, digest2);
        bytes memory sig2Lessor = abi.encodePacked(r3, s3, v3);
        (uint8 v4, bytes32 r4, bytes32 s4) = vm.sign(pkLessee, digest2);
        bytes memory sig2Lessee = abi.encodePacked(r4, s4, v4);

        uint256 tokenId2 = leaseFactory.mintLease(lease2, sig2Lessor, sig2Lessee);

        assertEq(tokenId1, 0);
        assertEq(tokenId2, 1);
        assertEq(leaseFactory.ownerOf(tokenId1), lessee);
        assertEq(leaseFactory.ownerOf(tokenId2), lessee);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                   SIGNATURE VALIDATION                     */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_RevertWhen_InvalidLessorSignature() public {
        MetadataStorage.Metadata[] memory emptyMeta = new MetadataStorage.Metadata[](0);
        LeaseFactory.LeaseIntent memory leaseIntent = _createLeaseIntent(
            uint64(block.timestamp + 1 days),
            uint64(block.timestamp + 2 days),
            uint64(block.timestamp + 365 days),
            emptyMeta
        );

        bytes32 digest = leaseFactory.hashLeaseIntent(leaseIntent);

        // Invalid lessor signature (signed by wrong key)
        uint256 wrongKey = 0xDEAD;
        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(wrongKey, digest);
        bytes memory invalidSig = abi.encodePacked(r1, s1, v1);

        // Valid lessee signature
        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(pkLessee, digest);
        bytes memory validSig = abi.encodePacked(r2, s2, v2);

        vm.expectRevert("lessor sig invalid");
        leaseFactory.mintLease(leaseIntent, invalidSig, validSig);
    }

    function test_RevertWhen_InvalidLesseeSignature() public {
        MetadataStorage.Metadata[] memory emptyMeta = new MetadataStorage.Metadata[](0);
        LeaseFactory.LeaseIntent memory leaseIntent = _createLeaseIntent(
            uint64(block.timestamp + 1 days),
            uint64(block.timestamp + 2 days),
            uint64(block.timestamp + 365 days),
            emptyMeta
        );

        bytes32 digest = leaseFactory.hashLeaseIntent(leaseIntent);

        // Valid lessor signature
        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(pkLessor, digest);
        bytes memory validSig = abi.encodePacked(r1, s1, v1);

        // Invalid lessee signature
        uint256 wrongKey = 0xDEAD;
        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(wrongKey, digest);
        bytes memory invalidSig = abi.encodePacked(r2, s2, v2);

        vm.expectRevert("lessee sig invalid");
        leaseFactory.mintLease(leaseIntent, validSig, invalidSig);
    }

    function test_RevertWhen_ExpiredDeadline() public {
        MetadataStorage.Metadata[] memory emptyMeta = new MetadataStorage.Metadata[](0);

        // Create lease with short deadline
        LeaseFactory.LeaseIntent memory leaseIntent = _createLeaseIntent(
            uint64(block.timestamp + 10), // Short deadline
            uint64(block.timestamp + 1 days),
            uint64(block.timestamp + 365 days),
            emptyMeta
        );

        bytes32 digest = leaseFactory.hashLeaseIntent(leaseIntent);
        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(pkLessor, digest);
        bytes memory sigLessor = abi.encodePacked(r1, s1, v1);
        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(pkLessee, digest);
        bytes memory sigLessee = abi.encodePacked(r2, s2, v2);

        // Advance time past deadline
        vm.warp(block.timestamp + 100);

        vm.expectRevert("expired");
        leaseFactory.mintLease(leaseIntent, sigLessor, sigLessee);
    }

    function test_RevertWhen_InvalidTimingStartAfterEnd() public {
        MetadataStorage.Metadata[] memory emptyMeta = new MetadataStorage.Metadata[](0);

        // Create lease with start time after end time
        LeaseFactory.LeaseIntent memory leaseIntent = _createLeaseIntent(
            uint64(block.timestamp + 1 days),
            uint64(block.timestamp + 365 days), // Start
            uint64(block.timestamp + 2 days),   // End (before start!)
            emptyMeta
        );

        bytes32 digest = leaseFactory.hashLeaseIntent(leaseIntent);
        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(pkLessor, digest);
        bytes memory sigLessor = abi.encodePacked(r1, s1, v1);
        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(pkLessee, digest);
        bytes memory sigLessee = abi.encodePacked(r2, s2, v2);

        vm.expectRevert("bad times");
        leaseFactory.mintLease(leaseIntent, sigLessor, sigLessee);
    }

    function test_RevertWhen_NonexistentAsset() public {
        MetadataStorage.Metadata[] memory emptyMeta = new MetadataStorage.Metadata[](0);

        LeaseFactory.LeaseIntent memory leaseIntent = LeaseFactory.LeaseIntent({
            deadline: uint64(block.timestamp + 1 days),
            assetType: assetType,
            lease: LeaseFactory.Lease({
                lessor: lessor,
                lessee: lessee,
                assetId: 999, // Nonexistent asset
                paymentToken: address(0),
                rentAmount: 1000e6,
                rentPeriod: 30 days,
                securityDeposit: 5000e6,
                startTime: uint64(block.timestamp + 1 days),
                endTime: uint64(block.timestamp + 365 days),
                legalDocHash: keccak256("legal"),
                termsVersion: 1,
                metadata: emptyMeta
            })
        });

        bytes32 digest = leaseFactory.hashLeaseIntent(leaseIntent);
        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(pkLessor, digest);
        bytes memory sigLessor = abi.encodePacked(r1, s1, v1);
        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(pkLessee, digest);
        bytes memory sigLessee = abi.encodePacked(r2, s2, v2);

        vm.expectRevert("asset !exists");
        leaseFactory.mintLease(leaseIntent, sigLessor, sigLessee);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                  METADATA OPERATIONS                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_LeaseMetadataInitialization() public {
        MetadataStorage.Metadata[] memory metadata = new MetadataStorage.Metadata[](3);
        metadata[0] = MetadataStorage.Metadata({key: "location", value: "NYC"});
        metadata[1] = MetadataStorage.Metadata({key: "type", value: "commercial"});
        metadata[2] = MetadataStorage.Metadata({key: "floor", value: "5"});

        LeaseFactory.LeaseIntent memory leaseIntent = _createLeaseIntent(
            uint64(block.timestamp + 1 days),
            uint64(block.timestamp + 2 days),
            uint64(block.timestamp + 365 days),
            metadata
        );

        bytes32 digest = leaseFactory.hashLeaseIntent(leaseIntent);
        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(pkLessor, digest);
        bytes memory sigLessor = abi.encodePacked(r1, s1, v1);
        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(pkLessee, digest);
        bytes memory sigLessee = abi.encodePacked(r2, s2, v2);

        uint256 tokenId = leaseFactory.mintLease(leaseIntent, sigLessor, sigLessee);

        // Verify metadata was stored
        assertEq(leaseFactory.getMetadata(tokenId, "location"), "NYC");
        assertEq(leaseFactory.getMetadata(tokenId, "type"), "commercial");
        assertEq(leaseFactory.getMetadata(tokenId, "floor"), "5");
        assertEq(leaseFactory.getMetadataCount(tokenId), 3);
    }

    function test_SetLeaseMetadata() public {
        MetadataStorage.Metadata[] memory initialMeta = new MetadataStorage.Metadata[](1);
        initialMeta[0] = MetadataStorage.Metadata({key: "initial", value: "value"});

        LeaseFactory.LeaseIntent memory leaseIntent = _createLeaseIntent(
            uint64(block.timestamp + 1 days),
            uint64(block.timestamp + 2 days),
            uint64(block.timestamp + 365 days),
            initialMeta
        );

        bytes32 digest = leaseFactory.hashLeaseIntent(leaseIntent);
        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(pkLessor, digest);
        bytes memory sigLessor = abi.encodePacked(r1, s1, v1);
        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(pkLessee, digest);
        bytes memory sigLessee = abi.encodePacked(r2, s2, v2);

        uint256 tokenId = leaseFactory.mintLease(leaseIntent, sigLessor, sigLessee);

        // Add more metadata
        MetadataStorage.Metadata[] memory newMeta = new MetadataStorage.Metadata[](2);
        newMeta[0] = MetadataStorage.Metadata({key: "additional1", value: "value1"});
        newMeta[1] = MetadataStorage.Metadata({key: "additional2", value: "value2"});

        vm.prank(admin);
        leaseFactory.setMetadata(tokenId, newMeta);

        assertEq(leaseFactory.getMetadata(tokenId, "additional1"), "value1");
        assertEq(leaseFactory.getMetadata(tokenId, "additional2"), "value2");
        assertEq(leaseFactory.getMetadataCount(tokenId), 3);
    }

    function test_GetAllLeaseMetadata() public {
        MetadataStorage.Metadata[] memory metadata = new MetadataStorage.Metadata[](2);
        metadata[0] = MetadataStorage.Metadata({key: "key1", value: "value1"});
        metadata[1] = MetadataStorage.Metadata({key: "key2", value: "value2"});

        LeaseFactory.LeaseIntent memory leaseIntent = _createLeaseIntent(
            uint64(block.timestamp + 1 days),
            uint64(block.timestamp + 2 days),
            uint64(block.timestamp + 365 days),
            metadata
        );

        bytes32 digest = leaseFactory.hashLeaseIntent(leaseIntent);
        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(pkLessor, digest);
        bytes memory sigLessor = abi.encodePacked(r1, s1, v1);
        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(pkLessee, digest);
        bytes memory sigLessee = abi.encodePacked(r2, s2, v2);

        uint256 tokenId = leaseFactory.mintLease(leaseIntent, sigLessor, sigLessee);

        MetadataStorage.Metadata[] memory allMeta = leaseFactory.getAllMetadata(tokenId);
        assertEq(allMeta.length, 2);
        assertEq(allMeta[0].key, "key1");
        assertEq(allMeta[0].value, "value1");
        assertEq(allMeta[1].key, "key2");
        assertEq(allMeta[1].value, "value2");
    }

    function test_GetMetadataKeys() public {
        MetadataStorage.Metadata[] memory metadata = new MetadataStorage.Metadata[](3);
        metadata[0] = MetadataStorage.Metadata({key: "alpha", value: "1"});
        metadata[1] = MetadataStorage.Metadata({key: "beta", value: "2"});
        metadata[2] = MetadataStorage.Metadata({key: "gamma", value: "3"});

        LeaseFactory.LeaseIntent memory leaseIntent = _createLeaseIntent(
            uint64(block.timestamp + 1 days),
            uint64(block.timestamp + 2 days),
            uint64(block.timestamp + 365 days),
            metadata
        );

        bytes32 digest = leaseFactory.hashLeaseIntent(leaseIntent);
        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(pkLessor, digest);
        bytes memory sigLessor = abi.encodePacked(r1, s1, v1);
        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(pkLessee, digest);
        bytes memory sigLessee = abi.encodePacked(r2, s2, v2);

        uint256 tokenId = leaseFactory.mintLease(leaseIntent, sigLessor, sigLessee);

        string[] memory keys = leaseFactory.getMetadataKeys(tokenId);
        assertEq(keys.length, 3);
        assertEq(keys[0], "alpha");
        assertEq(keys[1], "beta");
        assertEq(keys[2], "gamma");
    }

    function test_HasLeaseMetadata() public {
        MetadataStorage.Metadata[] memory metadata = new MetadataStorage.Metadata[](1);
        metadata[0] = MetadataStorage.Metadata({key: "exists", value: "yes"});

        LeaseFactory.LeaseIntent memory leaseIntent = _createLeaseIntent(
            uint64(block.timestamp + 1 days),
            uint64(block.timestamp + 2 days),
            uint64(block.timestamp + 365 days),
            metadata
        );

        bytes32 digest = leaseFactory.hashLeaseIntent(leaseIntent);
        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(pkLessor, digest);
        bytes memory sigLessor = abi.encodePacked(r1, s1, v1);
        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(pkLessee, digest);
        bytes memory sigLessee = abi.encodePacked(r2, s2, v2);

        uint256 tokenId = leaseFactory.mintLease(leaseIntent, sigLessor, sigLessee);

        assertTrue(leaseFactory.hasMetadata(tokenId, "exists"));
        assertFalse(leaseFactory.hasMetadata(tokenId, "nonexistent"));
    }

    function test_RemoveLeaseMetadata() public {
        MetadataStorage.Metadata[] memory metadata = new MetadataStorage.Metadata[](2);
        metadata[0] = MetadataStorage.Metadata({key: "keep", value: "value1"});
        metadata[1] = MetadataStorage.Metadata({key: "remove", value: "value2"});

        LeaseFactory.LeaseIntent memory leaseIntent = _createLeaseIntent(
            uint64(block.timestamp + 1 days),
            uint64(block.timestamp + 2 days),
            uint64(block.timestamp + 365 days),
            metadata
        );

        bytes32 digest = leaseFactory.hashLeaseIntent(leaseIntent);
        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(pkLessor, digest);
        bytes memory sigLessor = abi.encodePacked(r1, s1, v1);
        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(pkLessee, digest);
        bytes memory sigLessee = abi.encodePacked(r2, s2, v2);

        uint256 tokenId = leaseFactory.mintLease(leaseIntent, sigLessor, sigLessee);

        vm.prank(admin);
        leaseFactory.removeMetadata(tokenId, "remove");

        assertTrue(leaseFactory.hasMetadata(tokenId, "keep"));
        assertFalse(leaseFactory.hasMetadata(tokenId, "remove"));
        assertEq(leaseFactory.getMetadataCount(tokenId), 1);
    }

    function test_RevertWhen_UnauthorizedSetMetadata() public {
        MetadataStorage.Metadata[] memory emptyMeta = new MetadataStorage.Metadata[](0);
        LeaseFactory.LeaseIntent memory leaseIntent = _createLeaseIntent(
            uint64(block.timestamp + 1 days),
            uint64(block.timestamp + 2 days),
            uint64(block.timestamp + 365 days),
            emptyMeta
        );

        bytes32 digest = leaseFactory.hashLeaseIntent(leaseIntent);
        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(pkLessor, digest);
        bytes memory sigLessor = abi.encodePacked(r1, s1, v1);
        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(pkLessee, digest);
        bytes memory sigLessee = abi.encodePacked(r2, s2, v2);

        uint256 tokenId = leaseFactory.mintLease(leaseIntent, sigLessor, sigLessee);

        MetadataStorage.Metadata[] memory newMeta = new MetadataStorage.Metadata[](1);
        newMeta[0] = MetadataStorage.Metadata({key: "unauthorized", value: "value"});

        vm.prank(user);
        vm.expectRevert();
        leaseFactory.setMetadata(tokenId, newMeta);
    }

    function test_RevertWhen_UnauthorizedRemoveMetadata() public {
        MetadataStorage.Metadata[] memory metadata = new MetadataStorage.Metadata[](1);
        metadata[0] = MetadataStorage.Metadata({key: "test", value: "value"});

        LeaseFactory.LeaseIntent memory leaseIntent = _createLeaseIntent(
            uint64(block.timestamp + 1 days),
            uint64(block.timestamp + 2 days),
            uint64(block.timestamp + 365 days),
            metadata
        );

        bytes32 digest = leaseFactory.hashLeaseIntent(leaseIntent);
        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(pkLessor, digest);
        bytes memory sigLessor = abi.encodePacked(r1, s1, v1);
        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(pkLessee, digest);
        bytes memory sigLessee = abi.encodePacked(r2, s2, v2);

        uint256 tokenId = leaseFactory.mintLease(leaseIntent, sigLessor, sigLessee);

        vm.prank(user);
        vm.expectRevert();
        leaseFactory.removeMetadata(tokenId, "test");
    }

    function test_RevertWhen_SetMetadataOnNonexistentToken() public {
        MetadataStorage.Metadata[] memory metadata = new MetadataStorage.Metadata[](1);
        metadata[0] = MetadataStorage.Metadata({key: "test", value: "value"});

        vm.prank(admin);
        vm.expectRevert("token not minted");
        leaseFactory.setMetadata(999, metadata);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                METADATA HASH ISOLATION                     */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_MetadataIsolationBetweenLeases() public {
        // Create first lease with metadata
        MetadataStorage.Metadata[] memory meta1 = new MetadataStorage.Metadata[](1);
        meta1[0] = MetadataStorage.Metadata({key: "type", value: "residential"});

        LeaseFactory.LeaseIntent memory lease1 = _createLeaseIntent(
            uint64(block.timestamp + 1 days),
            uint64(block.timestamp + 2 days),
            uint64(block.timestamp + 365 days),
            meta1
        );

        bytes32 digest1 = leaseFactory.hashLeaseIntent(lease1);
        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(pkLessor, digest1);
        bytes memory sig1Lessor = abi.encodePacked(r1, s1, v1);
        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(pkLessee, digest1);
        bytes memory sig1Lessee = abi.encodePacked(r2, s2, v2);

        uint256 tokenId1 = leaseFactory.mintLease(lease1, sig1Lessor, sig1Lessee);

        // Create second lease with different metadata
        MetadataStorage.Metadata[] memory meta2 = new MetadataStorage.Metadata[](1);
        meta2[0] = MetadataStorage.Metadata({key: "type", value: "commercial"});

        LeaseFactory.LeaseIntent memory lease2 = _createLeaseIntent(
            uint64(block.timestamp + 2 days),
            uint64(block.timestamp + 3 days),
            uint64(block.timestamp + 400 days),
            meta2
        );

        bytes32 digest2 = leaseFactory.hashLeaseIntent(lease2);
        (uint8 v3, bytes32 r3, bytes32 s3) = vm.sign(pkLessor, digest2);
        bytes memory sig2Lessor = abi.encodePacked(r3, s3, v3);
        (uint8 v4, bytes32 r4, bytes32 s4) = vm.sign(pkLessee, digest2);
        bytes memory sig2Lessee = abi.encodePacked(r4, s4, v4);

        uint256 tokenId2 = leaseFactory.mintLease(lease2, sig2Lessor, sig2Lessee);

        // Verify metadata is isolated
        assertEq(leaseFactory.getMetadata(tokenId1, "type"), "residential");
        assertEq(leaseFactory.getMetadata(tokenId2, "type"), "commercial");
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      TOKEN URI                             */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_TokenURIWithCustomMetadata() public {
        // Create lease with URI metadata
        MetadataStorage.Metadata[] memory metadata = new MetadataStorage.Metadata[](1);
        metadata[0] = MetadataStorage.Metadata({key: "uri", value: "ipfs://Qm"});

        LeaseFactory.LeaseIntent memory leaseIntent = _createLeaseIntent(
            uint64(block.timestamp + 1 days),
            uint64(block.timestamp + 2 days),
            uint64(block.timestamp + 365 days),
            metadata
        );

        bytes32 digest = leaseFactory.hashLeaseIntent(leaseIntent);
        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(pkLessor, digest);
        bytes memory sigLessor = abi.encodePacked(r1, s1, v1);
        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(pkLessee, digest);
        bytes memory sigLessee = abi.encodePacked(r2, s2, v2);

        uint256 tokenId = leaseFactory.mintLease(leaseIntent, sigLessor, sigLessee);

        string memory uri = leaseFactory.tokenURI(tokenId);
        assertEq(uri, string.concat("ipfs://Qm", vm.toString(tokenId)));
    }

    function test_TokenURIWithoutCustomMetadata() public {
        MetadataStorage.Metadata[] memory emptyMeta = new MetadataStorage.Metadata[](0);

        LeaseFactory.LeaseIntent memory leaseIntent = _createLeaseIntent(
            uint64(block.timestamp + 1 days),
            uint64(block.timestamp + 2 days),
            uint64(block.timestamp + 365 days),
            emptyMeta
        );

        bytes32 digest = leaseFactory.hashLeaseIntent(leaseIntent);
        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(pkLessor, digest);
        bytes memory sigLessor = abi.encodePacked(r1, s1, v1);
        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(pkLessee, digest);
        bytes memory sigLessee = abi.encodePacked(r2, s2, v2);

        uint256 tokenId = leaseFactory.mintLease(leaseIntent, sigLessor, sigLessee);

        string memory uri = leaseFactory.tokenURI(tokenId);
        assertEq(uri, "");
    }

    function test_RevertWhen_TokenURIForNonexistentToken() public {
        vm.expectRevert("not minted");
        leaseFactory.tokenURI(999);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                   EIP-712 HASH TESTING                     */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_HashLeaseIntent() public {
        MetadataStorage.Metadata[] memory metadata = new MetadataStorage.Metadata[](1);
        metadata[0] = MetadataStorage.Metadata({key: "test", value: "value"});

        LeaseFactory.LeaseIntent memory leaseIntent = _createLeaseIntent(
            uint64(block.timestamp + 1 days),
            uint64(block.timestamp + 2 days),
            uint64(block.timestamp + 365 days),
            metadata
        );

        bytes32 hash = leaseFactory.hashLeaseIntent(leaseIntent);
        assertTrue(hash != bytes32(0));
    }

    function test_DifferentLeasesProduceDifferentHashes() public {
        MetadataStorage.Metadata[] memory emptyMeta = new MetadataStorage.Metadata[](0);

        LeaseFactory.LeaseIntent memory lease1 = _createLeaseIntent(
            uint64(block.timestamp + 1 days),
            uint64(block.timestamp + 2 days),
            uint64(block.timestamp + 365 days),
            emptyMeta
        );

        LeaseFactory.LeaseIntent memory lease2 = _createLeaseIntent(
            uint64(block.timestamp + 1 days),
            uint64(block.timestamp + 2 days),
            uint64(block.timestamp + 366 days), // Different end time
            emptyMeta
        );

        bytes32 hash1 = leaseFactory.hashLeaseIntent(lease1);
        bytes32 hash2 = leaseFactory.hashLeaseIntent(lease2);

        assertTrue(hash1 != hash2);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      EDGE CASES                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_LeaseWithEmptyMetadata() public {
        MetadataStorage.Metadata[] memory emptyMeta = new MetadataStorage.Metadata[](0);

        LeaseFactory.LeaseIntent memory leaseIntent = _createLeaseIntent(
            uint64(block.timestamp + 1 days),
            uint64(block.timestamp + 2 days),
            uint64(block.timestamp + 365 days),
            emptyMeta
        );

        bytes32 digest = leaseFactory.hashLeaseIntent(leaseIntent);
        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(pkLessor, digest);
        bytes memory sigLessor = abi.encodePacked(r1, s1, v1);
        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(pkLessee, digest);
        bytes memory sigLessee = abi.encodePacked(r2, s2, v2);

        uint256 tokenId = leaseFactory.mintLease(leaseIntent, sigLessor, sigLessee);

        assertEq(leaseFactory.getMetadataCount(tokenId), 0);
    }

    function test_LeaseWithManyMetadataKeys() public {
        MetadataStorage.Metadata[] memory metadata = new MetadataStorage.Metadata[](30);
        for (uint256 i = 0; i < 30; i++) {
            metadata[i] = MetadataStorage.Metadata({
                key: string(abi.encodePacked("key", vm.toString(i))),
                value: string(abi.encodePacked("value", vm.toString(i)))
            });
        }

        LeaseFactory.LeaseIntent memory leaseIntent = _createLeaseIntent(
            uint64(block.timestamp + 1 days),
            uint64(block.timestamp + 2 days),
            uint64(block.timestamp + 365 days),
            metadata
        );

        bytes32 digest = leaseFactory.hashLeaseIntent(leaseIntent);
        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(pkLessor, digest);
        bytes memory sigLessor = abi.encodePacked(r1, s1, v1);
        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(pkLessee, digest);
        bytes memory sigLessee = abi.encodePacked(r2, s2, v2);

        uint256 tokenId = leaseFactory.mintLease(leaseIntent, sigLessor, sigLessee);

        assertEq(leaseFactory.getMetadataCount(tokenId), 30);
        assertEq(leaseFactory.getMetadata(tokenId, "key0"), "value0");
        assertEq(leaseFactory.getMetadata(tokenId, "key29"), "value29");
    }

    function test_LeaseWithSameStartAndEndTime() public {
        MetadataStorage.Metadata[] memory emptyMeta = new MetadataStorage.Metadata[](0);
        uint64 sameTime = uint64(block.timestamp + 1 days);

        LeaseFactory.LeaseIntent memory leaseIntent = _createLeaseIntent(
            uint64(block.timestamp + 1 days),
            sameTime,
            sameTime,
            emptyMeta
        );

        bytes32 digest = leaseFactory.hashLeaseIntent(leaseIntent);
        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(pkLessor, digest);
        bytes memory sigLessor = abi.encodePacked(r1, s1, v1);
        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(pkLessee, digest);
        bytes memory sigLessee = abi.encodePacked(r2, s2, v2);

        // Start == End should fail
        vm.expectRevert("bad times");
        leaseFactory.mintLease(leaseIntent, sigLessor, sigLessee);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      HELPER FUNCTIONS                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _createLeaseIntent(
        uint64 deadline,
        uint64 startTime,
        uint64 endTime,
        MetadataStorage.Metadata[] memory metadata
    ) internal view returns (LeaseFactory.LeaseIntent memory) {
        return LeaseFactory.LeaseIntent({
            deadline: deadline,
            assetType: assetType,
            lease: LeaseFactory.Lease({
                lessor: lessor,
                lessee: lessee,
                assetId: assetId,
                paymentToken: address(0),
                rentAmount: 1000e6,
                rentPeriod: 30 days,
                securityDeposit: 5000e6,
                startTime: startTime,
                endTime: endTime,
                legalDocHash: keccak256("legal-doc"),
                termsVersion: 1,
                metadata: metadata
            })
        });
    }
}

