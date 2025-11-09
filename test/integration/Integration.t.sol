// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {AssetRegistry} from "../../src/AssetRegistry.sol";
import {AssetERC20} from "../../src/AssetERC20.sol";
import {LeaseFactory} from "../../src/LeaseFactory.sol";
import {MetadataStorage} from "../../src/MetadataStorage.sol";
import {Roles} from "../../src/libraries/Roles.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/// @title IntegrationTest
/// @notice End-to-end integration tests for the entire protocol
contract IntegrationTest is Test {
    AssetRegistry public registry;
    LeaseFactory public leaseFactory;

    address public admin = address(0x1);
    address public upgrader = address(0x2);
    address public registrar = address(0x3);
    address public assetOwner = address(0x4);
    address public tokenHolder = address(0x5);
    address public lessor = address(0x6);
    address public lessee = address(0x7);

    uint256 public pkLessor = 0xA11CE;
    uint256 public pkLessee = 0xB0B;

    address public assetERC20Implementation;

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
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*              COMPLETE WORKFLOW TESTING                     */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_CompleteAssetToLeaseWorkflow() public {
        // STEP 1: Create Asset Type with metadata
        bytes32 assetType = keccak256("satellite-schema");
        bytes32[] memory requiredLeaseKeys = new bytes32[](2);
        requiredLeaseKeys[0] = keccak256("startTime");
        requiredLeaseKeys[1] = keccak256("endTime");

        MetadataStorage.Metadata[] memory typeMetadata = new MetadataStorage.Metadata[](2);
        typeMetadata[0] = MetadataStorage.Metadata({key: "schemaURI", value: "ipfs://QmSatelliteSchema"});
        typeMetadata[1] = MetadataStorage.Metadata({key: "version", value: "1.0"});

        vm.prank(admin);
        registry.createAssetType("Satellite", assetType, requiredLeaseKeys, typeMetadata);

        // Verify asset type metadata
        assertEq(registry.getMetadata(assetType, "schemaURI"), "ipfs://QmSatelliteSchema");
        assertEq(registry.getMetadata(assetType, "version"), "1.0");

        // STEP 2: Register Asset with metadata
        MetadataStorage.Metadata[] memory assetMetadata = new MetadataStorage.Metadata[](3);
        assetMetadata[0] = MetadataStorage.Metadata({key: "serialNumber", value: "SAT-001"});
        assetMetadata[1] = MetadataStorage.Metadata({key: "manufacturer", value: "SpaceCorp"});
        assetMetadata[2] = MetadataStorage.Metadata({key: "launchDate", value: "2024-01-01"});

        vm.prank(registrar);
        (uint256 assetId, address tokenAddress) = registry.registerAsset(
            assetType,
            "Satellite Alpha",
            "SATA",
            1000e18,
            admin,
            upgrader,
            lessor,
            assetMetadata
        );

        // Verify asset registration
        assertTrue(registry.assetExists(assetId));
        AssetRegistry.Asset memory asset = registry.getAsset(assetId);
        assertEq(asset.assetType, assetType);
        assertEq(asset.issuer, lessor);
        assertEq(asset.tokenAddress, tokenAddress);

        // STEP 3: Verify AssetERC20 and its metadata
        AssetERC20 token = AssetERC20(tokenAddress);
        assertEq(token.name(), "Satellite Alpha");
        assertEq(token.symbol(), "SATA");
        assertEq(token.totalSupply(), 1000e18);
        assertEq(token.balanceOf(lessor), 1000e18);

        // Verify asset token metadata
        assertEq(token.getMetadata("serialNumber"), "SAT-001");
        assertEq(token.getMetadata("manufacturer"), "SpaceCorp");
        assertEq(token.getMetadata("launchDate"), "2024-01-01");
        assertEq(token.getMetadataCount(), 3);

        // STEP 4: Transfer some tokens
        vm.prank(lessor);
        token.transfer(tokenHolder, 200e18);

        assertEq(token.balanceOf(lessor), 800e18);
        assertEq(token.balanceOf(tokenHolder), 200e18);

        // STEP 5: Create Lease with metadata
        MetadataStorage.Metadata[] memory leaseMetadata = new MetadataStorage.Metadata[](2);
        leaseMetadata[0] = MetadataStorage.Metadata({key: "purpose", value: "Commercial Use"});
        leaseMetadata[1] = MetadataStorage.Metadata({key: "restrictions", value: "No military use"});

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
                legalDocHash: keccak256("legal-document"),
                termsVersion: 1,
                metadata: leaseMetadata
            })
        });

        // Generate dual signatures
        bytes32 digest = leaseFactory.hashLeaseIntent(leaseIntent);
        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(pkLessor, digest);
        bytes memory sigLessor = abi.encodePacked(r1, s1, v1);
        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(pkLessee, digest);
        bytes memory sigLessee = abi.encodePacked(r2, s2, v2);

        // Mint lease
        uint256 leaseId = leaseFactory.mintLease(leaseIntent, sigLessor, sigLessee);

        // STEP 6: Verify Lease NFT and metadata
        assertEq(leaseFactory.ownerOf(leaseId), lessee);

        // Access individual lease fields (dynamic array in struct means public getter returns individual fields)
        (
            address storedLessor,
            address storedLessee,
            uint256 storedAssetId,
            ,  // paymentToken
            uint256 storedRentAmount,
            ,  // rentPeriod
            ,  // securityDeposit
            ,  // startTime
            ,  // endTime
            ,  // legalDocHash
               // termsVersion - last field before dynamic array
        ) = leaseFactory.leases(leaseId);

        assertEq(storedLessor, lessor);
        assertEq(storedLessee, lessee);
        assertEq(storedAssetId, assetId);
        assertEq(storedRentAmount, 1000e6);

        // Verify lease metadata
        assertEq(leaseFactory.getMetadata(leaseId, "purpose"), "Commercial Use");
        assertEq(leaseFactory.getMetadata(leaseId, "restrictions"), "No military use");
        assertEq(leaseFactory.getMetadataCount(leaseId), 2);

        // STEP 7: Verify metadata independence
        // Asset token metadata should be unaffected
        assertEq(token.getMetadata("serialNumber"), "SAT-001");
        assertEq(token.getMetadataCount(), 3);

        // Asset type metadata should be unaffected
        assertEq(registry.getMetadata(assetType, "schemaURI"), "ipfs://QmSatelliteSchema");
    }

    function test_MultipleAssetsWithIndependentMetadata() public {
        // Create asset type
        bytes32 assetType = keccak256("equipment");
        bytes32[] memory emptyKeys = new bytes32[](0);
        MetadataStorage.Metadata[] memory emptyMeta = new MetadataStorage.Metadata[](0);

        vm.prank(admin);
        registry.createAssetType("Equipment", assetType, emptyKeys, emptyMeta);

        // Register first asset with metadata
        MetadataStorage.Metadata[] memory meta1 = new MetadataStorage.Metadata[](2);
        meta1[0] = MetadataStorage.Metadata({key: "type", value: "excavator"});
        meta1[1] = MetadataStorage.Metadata({key: "condition", value: "new"});

        vm.prank(registrar);
        (uint256 asset1Id, address token1Addr) = registry.registerAsset(
            assetType,
            "Equipment 1",
            "EQ1",
            100e18,
            admin,
            upgrader,
            assetOwner,
            meta1
        );

        // Register second asset with different metadata
        MetadataStorage.Metadata[] memory meta2 = new MetadataStorage.Metadata[](2);
        meta2[0] = MetadataStorage.Metadata({key: "type", value: "bulldozer"});
        meta2[1] = MetadataStorage.Metadata({key: "condition", value: "used"});

        vm.prank(registrar);
        (uint256 asset2Id, address token2Addr) = registry.registerAsset(
            assetType,
            "Equipment 2",
            "EQ2",
            200e18,
            admin,
            upgrader,
            assetOwner,
            meta2
        );

        // Verify metadata isolation
        AssetERC20 token1 = AssetERC20(token1Addr);
        AssetERC20 token2 = AssetERC20(token2Addr);

        assertEq(token1.getMetadata("type"), "excavator");
        assertEq(token1.getMetadata("condition"), "new");

        assertEq(token2.getMetadata("type"), "bulldozer");
        assertEq(token2.getMetadata("condition"), "used");

        // Update one shouldn't affect the other
        MetadataStorage.Metadata[] memory update = new MetadataStorage.Metadata[](1);
        update[0] = MetadataStorage.Metadata({key: "condition", value: "excellent"});

        vm.prank(admin);
        token1.setMetadata(update);

        assertEq(token1.getMetadata("condition"), "excellent");
        assertEq(token2.getMetadata("condition"), "used"); // Should be unchanged
    }

    function test_MultipleLeasesWithIndependentMetadata() public {
        // Setup: Create asset type and asset
        bytes32 assetType = keccak256("real-estate");
        bytes32[] memory emptyKeys = new bytes32[](0);
        MetadataStorage.Metadata[] memory emptyMeta = new MetadataStorage.Metadata[](0);

        vm.prank(admin);
        registry.createAssetType("RealEstate", assetType, emptyKeys, emptyMeta);

        vm.prank(registrar);
        (uint256 assetId,) = registry.registerAsset(
            assetType,
            "Property Token",
            "PROP",
            1000e18,
            admin,
            upgrader,
            lessor,
            emptyMeta
        );

        // Create first lease with metadata
        MetadataStorage.Metadata[] memory lease1Meta = new MetadataStorage.Metadata[](1);
        lease1Meta[0] = MetadataStorage.Metadata({key: "floor", value: "1"});

        LeaseFactory.LeaseIntent memory lease1 = _createLeaseIntent(
            assetType,
            assetId,
            uint64(block.timestamp + 1 days),
            uint64(block.timestamp + 2 days),
            uint64(block.timestamp + 365 days),
            lease1Meta
        );

        bytes32 digest1 = leaseFactory.hashLeaseIntent(lease1);
        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(pkLessor, digest1);
        bytes memory sig1Lessor = abi.encodePacked(r1, s1, v1);
        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(pkLessee, digest1);
        bytes memory sig1Lessee = abi.encodePacked(r2, s2, v2);

        uint256 lease1Id = leaseFactory.mintLease(lease1, sig1Lessor, sig1Lessee);

        // Create second lease with different metadata
        MetadataStorage.Metadata[] memory lease2Meta = new MetadataStorage.Metadata[](1);
        lease2Meta[0] = MetadataStorage.Metadata({key: "floor", value: "5"});

        LeaseFactory.LeaseIntent memory lease2 = _createLeaseIntent(
            assetType,
            assetId,
            uint64(block.timestamp + 2 days),
            uint64(block.timestamp + 3 days),
            uint64(block.timestamp + 400 days),
            lease2Meta
        );

        bytes32 digest2 = leaseFactory.hashLeaseIntent(lease2);
        (uint8 v3, bytes32 r3, bytes32 s3) = vm.sign(pkLessor, digest2);
        bytes memory sig2Lessor = abi.encodePacked(r3, s3, v3);
        (uint8 v4, bytes32 r4, bytes32 s4) = vm.sign(pkLessee, digest2);
        bytes memory sig2Lessee = abi.encodePacked(r4, s4, v4);

        uint256 lease2Id = leaseFactory.mintLease(lease2, sig2Lessor, sig2Lessee);

        // Verify metadata isolation
        assertEq(leaseFactory.getMetadata(lease1Id, "floor"), "1");
        assertEq(leaseFactory.getMetadata(lease2Id, "floor"), "5");

        // Update one shouldn't affect the other
        MetadataStorage.Metadata[] memory update = new MetadataStorage.Metadata[](1);
        update[0] = MetadataStorage.Metadata({key: "floor", value: "10"});

        vm.prank(admin);
        leaseFactory.setMetadata(lease1Id, update);

        assertEq(leaseFactory.getMetadata(lease1Id, "floor"), "10");
        assertEq(leaseFactory.getMetadata(lease2Id, "floor"), "5"); // Should be unchanged
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*           METADATA PROPAGATION & UPDATES                   */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_AssetTypeMetadataUpdates() public {
        bytes32 assetType = keccak256("vehicle");
        bytes32[] memory emptyKeys = new bytes32[](0);

        MetadataStorage.Metadata[] memory initialMeta = new MetadataStorage.Metadata[](1);
        initialMeta[0] = MetadataStorage.Metadata({key: "version", value: "1.0"});

        vm.prank(admin);
        registry.createAssetType("Vehicle", assetType, emptyKeys, initialMeta);

        // Register asset
        MetadataStorage.Metadata[] memory emptyMeta = new MetadataStorage.Metadata[](0);
        vm.prank(registrar);
        (uint256 assetId,) = registry.registerAsset(
            assetType,
            "Vehicle Token",
            "VEH",
            100e18,
            admin,
            upgrader,
            assetOwner,
            emptyMeta
        );

        // Update asset type metadata
        MetadataStorage.Metadata[] memory update = new MetadataStorage.Metadata[](2);
        update[0] = MetadataStorage.Metadata({key: "version", value: "2.0"});
        update[1] = MetadataStorage.Metadata({key: "category", value: "transportation"});

        vm.prank(admin);
        registry.setMetadata(assetType, update);

        // Verify updates
        assertEq(registry.getMetadata(assetType, "version"), "2.0");
        assertEq(registry.getMetadata(assetType, "category"), "transportation");

        // Asset should still exist and be queryable
        assertTrue(registry.assetExists(assetId));
    }

    function test_CrossContractMetadataIsolation() public {
        // Create asset type with metadata
        bytes32 assetType = keccak256("test");
        bytes32[] memory emptyKeys = new bytes32[](0);

        MetadataStorage.Metadata[] memory typeMeta = new MetadataStorage.Metadata[](1);
        typeMeta[0] = MetadataStorage.Metadata({key: "level", value: "type"});

        vm.prank(admin);
        registry.createAssetType("Test", assetType, emptyKeys, typeMeta);

        // Register asset with metadata
        MetadataStorage.Metadata[] memory assetMeta = new MetadataStorage.Metadata[](1);
        assetMeta[0] = MetadataStorage.Metadata({key: "level", value: "asset"});

        vm.prank(registrar);
        (uint256 assetId, address tokenAddr) = registry.registerAsset(
            assetType,
            "Test Token",
            "TST",
            100e18,
            admin,
            upgrader,
            lessor,
            assetMeta
        );

        // Create lease with metadata
        MetadataStorage.Metadata[] memory leaseMeta = new MetadataStorage.Metadata[](1);
        leaseMeta[0] = MetadataStorage.Metadata({key: "level", value: "lease"});

        LeaseFactory.LeaseIntent memory leaseIntent = _createLeaseIntent(
            assetType,
            assetId,
            uint64(block.timestamp + 1 days),
            uint64(block.timestamp + 2 days),
            uint64(block.timestamp + 365 days),
            leaseMeta
        );

        bytes32 digest = leaseFactory.hashLeaseIntent(leaseIntent);
        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(pkLessor, digest);
        bytes memory sigLessor = abi.encodePacked(r1, s1, v1);
        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(pkLessee, digest);
        bytes memory sigLessee = abi.encodePacked(r2, s2, v2);

        uint256 leaseId = leaseFactory.mintLease(leaseIntent, sigLessor, sigLessee);

        // Verify all three levels maintain independent metadata
        assertEq(registry.getMetadata(assetType, "level"), "type");
        assertEq(AssetERC20(tokenAddr).getMetadata("level"), "asset");
        assertEq(leaseFactory.getMetadata(leaseId, "level"), "lease");
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                 TOKEN TRANSFER SCENARIOS                   */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_MetadataPersistsAcrossTokenTransfers() public {
        // Setup asset
        bytes32 assetType = keccak256("art");
        bytes32[] memory emptyKeys = new bytes32[](0);
        MetadataStorage.Metadata[] memory emptyMeta = new MetadataStorage.Metadata[](0);

        vm.prank(admin);
        registry.createAssetType("Art", assetType, emptyKeys, emptyMeta);

        MetadataStorage.Metadata[] memory assetMeta = new MetadataStorage.Metadata[](2);
        assetMeta[0] = MetadataStorage.Metadata({key: "artist", value: "Picasso"});
        assetMeta[1] = MetadataStorage.Metadata({key: "year", value: "1937"});

        vm.prank(registrar);
        (, address tokenAddr) = registry.registerAsset(
            assetType,
            "Artwork Token",
            "ART",
            100e18,
            admin,
            upgrader,
            assetOwner,
            assetMeta
        );

        AssetERC20 token = AssetERC20(tokenAddr);

        // Transfer tokens multiple times
        vm.prank(assetOwner);
        token.transfer(tokenHolder, 50e18);

        vm.prank(tokenHolder);
        token.transfer(lessor, 25e18);

        // Metadata should persist
        assertEq(token.getMetadata("artist"), "Picasso");
        assertEq(token.getMetadata("year"), "1937");
        assertEq(token.getMetadataCount(), 2);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    ACCESS CONTROL                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_OnlyAdminCanUpdateAssetTypeMetadata() public {
        bytes32 assetType = keccak256("test");
        bytes32[] memory emptyKeys = new bytes32[](0);
        MetadataStorage.Metadata[] memory emptyMeta = new MetadataStorage.Metadata[](0);

        vm.prank(admin);
        registry.createAssetType("Test", assetType, emptyKeys, emptyMeta);

        MetadataStorage.Metadata[] memory update = new MetadataStorage.Metadata[](1);
        update[0] = MetadataStorage.Metadata({key: "test", value: "value"});

        // Registrar cannot update asset type metadata
        vm.prank(registrar);
        vm.expectRevert();
        registry.setMetadata(assetType, update);

        // Admin can update
        vm.prank(admin);
        registry.setMetadata(assetType, update);

        assertEq(registry.getMetadata(assetType, "test"), "value");
    }

    function test_OnlyAdminCanUpdateAssetTokenMetadata() public {
        bytes32 assetType = keccak256("test");
        bytes32[] memory emptyKeys = new bytes32[](0);
        MetadataStorage.Metadata[] memory emptyMeta = new MetadataStorage.Metadata[](0);

        vm.prank(admin);
        registry.createAssetType("Test", assetType, emptyKeys, emptyMeta);

        vm.prank(registrar);
        (, address tokenAddr) = registry.registerAsset(
            assetType,
            "Test",
            "TST",
            100e18,
            admin,
            upgrader,
            assetOwner,
            emptyMeta
        );

        AssetERC20 token = AssetERC20(tokenAddr);

        MetadataStorage.Metadata[] memory update = new MetadataStorage.Metadata[](1);
        update[0] = MetadataStorage.Metadata({key: "test", value: "value"});

        // Token holder cannot update metadata
        vm.prank(assetOwner);
        vm.expectRevert();
        token.setMetadata(update);

        // Admin can update
        vm.prank(admin);
        token.setMetadata(update);

        assertEq(token.getMetadata("test"), "value");
    }

    function test_OnlyAdminCanUpdateLeaseMetadata() public {
        // Setup
        bytes32 assetType = keccak256("test");
        bytes32[] memory emptyKeys = new bytes32[](0);
        MetadataStorage.Metadata[] memory emptyMeta = new MetadataStorage.Metadata[](0);

        vm.prank(admin);
        registry.createAssetType("Test", assetType, emptyKeys, emptyMeta);

        vm.prank(registrar);
        (uint256 assetId,) = registry.registerAsset(
            assetType,
            "Test",
            "TST",
            100e18,
            admin,
            upgrader,
            lessor,
            emptyMeta
        );

        // Create lease
        LeaseFactory.LeaseIntent memory leaseIntent = _createLeaseIntent(
            assetType,
            assetId,
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

        uint256 leaseId = leaseFactory.mintLease(leaseIntent, sigLessor, sigLessee);

        MetadataStorage.Metadata[] memory update = new MetadataStorage.Metadata[](1);
        update[0] = MetadataStorage.Metadata({key: "test", value: "value"});

        // Lessee (NFT owner) cannot update metadata
        vm.prank(lessee);
        vm.expectRevert();
        leaseFactory.setMetadata(leaseId, update);

        // Lessor cannot update metadata
        vm.prank(lessor);
        vm.expectRevert();
        leaseFactory.setMetadata(leaseId, update);

        // Admin can update
        vm.prank(admin);
        leaseFactory.setMetadata(leaseId, update);

        assertEq(leaseFactory.getMetadata(leaseId, "test"), "value");
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                   COMPLEX SCENARIOS                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_MultipleAssetTypesAndAssets() public {
        // Create two asset types
        bytes32 type1 = keccak256("satellites");
        bytes32 type2 = keccak256("vehicles");
        bytes32[] memory emptyKeys = new bytes32[](0);
        MetadataStorage.Metadata[] memory emptyMeta = new MetadataStorage.Metadata[](0);

        vm.startPrank(admin);
        registry.createAssetType("Satellites", type1, emptyKeys, emptyMeta);
        registry.createAssetType("Vehicles", type2, emptyKeys, emptyMeta);
        vm.stopPrank();

        // Register multiple assets of different types
        vm.startPrank(registrar);
        (uint256 sat1,) = registry.registerAsset(type1, "Sat1", "SAT1", 100e18, admin, upgrader, lessor, emptyMeta);
        (uint256 sat2,) = registry.registerAsset(type1, "Sat2", "SAT2", 200e18, admin, upgrader, lessor, emptyMeta);
        (uint256 veh1,) = registry.registerAsset(type2, "Veh1", "VEH1", 300e18, admin, upgrader, lessor, emptyMeta);
        vm.stopPrank();

        // Verify all assets exist
        assertTrue(registry.assetExists(sat1));
        assertTrue(registry.assetExists(sat2));
        assertTrue(registry.assetExists(veh1));

        // Verify asset types are correct
        assertEq(registry.getAsset(sat1).assetType, type1);
        assertEq(registry.getAsset(sat2).assetType, type1);
        assertEq(registry.getAsset(veh1).assetType, type2);
    }

    function test_CompleteLifecycleWithMetadataUpdates() public {
        // 1. Create asset type
        bytes32 assetType = keccak256("building");
        bytes32[] memory emptyKeys = new bytes32[](0);
        MetadataStorage.Metadata[] memory typeMeta = new MetadataStorage.Metadata[](1);
        typeMeta[0] = MetadataStorage.Metadata({key: "category", value: "real-estate"});

        vm.prank(admin);
        registry.createAssetType("Building", assetType, emptyKeys, typeMeta);

        // 2. Register asset
        MetadataStorage.Metadata[] memory assetMeta = new MetadataStorage.Metadata[](1);
        assetMeta[0] = MetadataStorage.Metadata({key: "address", value: "123 Main St"});

        vm.prank(registrar);
        (uint256 assetId, address tokenAddr) = registry.registerAsset(
            assetType,
            "Building Token",
            "BLD",
            1000e18,
            admin,
            upgrader,
            lessor,
            assetMeta
        );

        AssetERC20 token = AssetERC20(tokenAddr);

        // 3. Update asset metadata
        MetadataStorage.Metadata[] memory assetUpdate = new MetadataStorage.Metadata[](1);
        assetUpdate[0] = MetadataStorage.Metadata({key: "renovated", value: "2024"});

        vm.prank(admin);
        token.setMetadata(assetUpdate);

        // 4. Create lease
        MetadataStorage.Metadata[] memory leaseMeta = new MetadataStorage.Metadata[](1);
        leaseMeta[0] = MetadataStorage.Metadata({key: "tenant", value: "Company A"});

        LeaseFactory.LeaseIntent memory leaseIntent = _createLeaseIntent(
            assetType,
            assetId,
            uint64(block.timestamp + 1 days),
            uint64(block.timestamp + 2 days),
            uint64(block.timestamp + 365 days),
            leaseMeta
        );

        bytes32 digest = leaseFactory.hashLeaseIntent(leaseIntent);
        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(pkLessor, digest);
        bytes memory sigLessor = abi.encodePacked(r1, s1, v1);
        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(pkLessee, digest);
        bytes memory sigLessee = abi.encodePacked(r2, s2, v2);

        uint256 leaseId = leaseFactory.mintLease(leaseIntent, sigLessor, sigLessee);

        // 5. Update lease metadata
        MetadataStorage.Metadata[] memory leaseUpdate = new MetadataStorage.Metadata[](1);
        leaseUpdate[0] = MetadataStorage.Metadata({key: "status", value: "active"});

        vm.prank(admin);
        leaseFactory.setMetadata(leaseId, leaseUpdate);

        // 6. Verify all metadata is correct
        assertEq(registry.getMetadata(assetType, "category"), "real-estate");
        assertEq(token.getMetadata("address"), "123 Main St");
        assertEq(token.getMetadata("renovated"), "2024");
        assertEq(leaseFactory.getMetadata(leaseId, "tenant"), "Company A");
        assertEq(leaseFactory.getMetadata(leaseId, "status"), "active");
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      HELPER FUNCTIONS                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _createLeaseIntent(
        bytes32 assetType,
        uint256 assetId,
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

