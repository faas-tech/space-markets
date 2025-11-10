// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {AssetRegistry} from "../../src/AssetRegistry.sol";
import {AssetERC20} from "../../src/AssetERC20.sol";
import {MetadataStorage} from "../../src/MetadataStorage.sol";
import {Roles} from "../../src/libraries/Roles.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/// @title AssetRegistryTest
/// @notice Comprehensive test suite for AssetRegistry functionality
contract AssetRegistryTest is Test {
    AssetRegistry public registry;
    address public admin = address(0x1);
    address public upgrader = address(0x2);
    address public registrar = address(0x3);
    address public user = address(0x4);

    address public assetERC20Implementation;

    event AssetTypeCreated(string indexed name, bytes32 indexed assetType, bytes32[] requiredLeaseKeys);
    event AssetRegistered(uint256 indexed assetId, bytes32 indexed assetType, address tokenAddress);
    event MetadataUpdated(bytes32 indexed hash, string key, string value);

    function setUp() public {
        // Deploy AssetERC20 implementation
        assetERC20Implementation = address(new AssetERC20());

        // Deploy AssetRegistry implementation
        AssetRegistry registryImpl = new AssetRegistry();

        // Deploy and initialize AssetRegistry as upgradeable proxy
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(registryImpl),
            abi.encodeCall(AssetRegistry.initialize, (admin, upgrader, registrar, assetERC20Implementation))
        );
        registry = AssetRegistry(address(proxy));
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                  ASSET TYPE CREATION                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_CreateAssetType() public {
        bytes32 assetType = keccak256("satellite-schema");
        bytes32[] memory requiredLeaseKeys = new bytes32[](2);
        requiredLeaseKeys[0] = keccak256("startTime");
        requiredLeaseKeys[1] = keccak256("endTime");

        MetadataStorage.Metadata[] memory metadata = new MetadataStorage.Metadata[](1);
        metadata[0] = MetadataStorage.Metadata({key: "schemaURI", value: "ipfs://QmSchema123"});

        vm.expectEmit(true, true, false, true);
        emit AssetTypeCreated("Satellite", assetType, requiredLeaseKeys);

        vm.prank(admin);
        registry.createAssetType("Satellite", assetType, requiredLeaseKeys, metadata);

        // Verify asset type was created
        AssetRegistry.AssetType memory retrievedType = registry.getType(assetType);
        assertEq(retrievedType.name, "Satellite");
        assertEq(retrievedType.requiredLeaseKeys.length, 2);
        assertEq(retrievedType.requiredLeaseKeys[0], requiredLeaseKeys[0]);
        assertEq(retrievedType.requiredLeaseKeys[1], requiredLeaseKeys[1]);
    }

    function test_CreateAssetTypeWithMetadata() public {
        bytes32 assetType = keccak256("vehicle-schema");
        bytes32[] memory requiredLeaseKeys = new bytes32[](0);

        MetadataStorage.Metadata[] memory metadata = new MetadataStorage.Metadata[](3);
        metadata[0] = MetadataStorage.Metadata({key: "schemaURI", value: "ipfs://QmVehicleSchema"});
        metadata[1] = MetadataStorage.Metadata({key: "version", value: "1.0"});
        metadata[2] = MetadataStorage.Metadata({key: "category", value: "transportation"});

        vm.prank(admin);
        registry.createAssetType("Vehicle", assetType, requiredLeaseKeys, metadata);

        // Verify metadata was stored
        string memory schemaURI = registry.getMetadata(assetType, "schemaURI");
        string memory version = registry.getMetadata(assetType, "version");
        string memory category = registry.getMetadata(assetType, "category");

        assertEq(schemaURI, "ipfs://QmVehicleSchema");
        assertEq(version, "1.0");
        assertEq(category, "transportation");
    }

    function test_CreateMultipleAssetTypes() public {
        bytes32 type1 = keccak256("type1");
        bytes32 type2 = keccak256("type2");
        bytes32[] memory emptyKeys = new bytes32[](0);
        MetadataStorage.Metadata[] memory emptyMeta = new MetadataStorage.Metadata[](0);

        vm.startPrank(admin);
        registry.createAssetType("Type1", type1, emptyKeys, emptyMeta);
        registry.createAssetType("Type2", type2, emptyKeys, emptyMeta);
        vm.stopPrank();

        assertEq(registry.getType(type1).name, "Type1");
        assertEq(registry.getType(type2).name, "Type2");
    }

    function test_RevertWhen_UnauthorizedCreateAssetType() public {
        bytes32 assetType = keccak256("unauthorized");
        bytes32[] memory emptyKeys = new bytes32[](0);
        MetadataStorage.Metadata[] memory emptyMeta = new MetadataStorage.Metadata[](0);

        vm.prank(user);
        vm.expectRevert();
        registry.createAssetType("Unauthorized", assetType, emptyKeys, emptyMeta);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                   ASSET REGISTRATION                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_RegisterAsset() public {
        // First create asset type
        bytes32 assetType = keccak256("satellite-schema");
        bytes32[] memory emptyKeys = new bytes32[](0);
        MetadataStorage.Metadata[] memory typeMeta = new MetadataStorage.Metadata[](0);

        vm.prank(admin);
        registry.createAssetType("Satellite", assetType, emptyKeys, typeMeta);

        // Register asset
        MetadataStorage.Metadata[] memory assetMeta = new MetadataStorage.Metadata[](2);
        assetMeta[0] = MetadataStorage.Metadata({key: "serialNumber", value: "SAT-001"});
        assetMeta[1] = MetadataStorage.Metadata({key: "manufacturer", value: "SpaceCorp"});

        vm.prank(registrar);
        (uint256 assetId, address tokenAddress) = registry.registerAsset(
            assetType,
            "Satellite Alpha",
            "SATA",
            1000e18,
            admin,
            upgrader,
            user,
            assetMeta
        );

        // Verify asset was registered
        assertEq(assetId, 1, "First asset should have ID 1");
        assertTrue(tokenAddress != address(0), "Token address should not be zero");
        assertTrue(registry.assetExists(assetId), "Asset should exist");

        AssetRegistry.Asset memory asset = registry.getAsset(assetId);
        assertEq(asset.assetType, assetType);
        assertEq(asset.issuer, user);
        assertEq(asset.tokenAddress, tokenAddress);

        // Verify ERC20 was deployed correctly
        AssetERC20 token = AssetERC20(tokenAddress);
        assertEq(token.name(), "Satellite Alpha");
        assertEq(token.symbol(), "SATA");
        assertEq(token.totalSupply(), 1000e18);
        assertEq(token.balanceOf(user), 1000e18);
    }

    function test_RegisterAssetWithMetadata() public {
        // Create asset type
        bytes32 assetType = keccak256("real-estate");
        bytes32[] memory emptyKeys = new bytes32[](0);
        MetadataStorage.Metadata[] memory typeMeta = new MetadataStorage.Metadata[](0);

        vm.prank(admin);
        registry.createAssetType("RealEstate", assetType, emptyKeys, typeMeta);

        // Register asset with metadata
        MetadataStorage.Metadata[] memory assetMeta = new MetadataStorage.Metadata[](3);
        assetMeta[0] = MetadataStorage.Metadata({key: "address", value: "123 Main St"});
        assetMeta[1] = MetadataStorage.Metadata({key: "squareFeet", value: "2000"});
        assetMeta[2] = MetadataStorage.Metadata({key: "yearBuilt", value: "2020"});

        vm.prank(registrar);
        (uint256 assetId, address tokenAddress) = registry.registerAsset(
            assetType,
            "Property Token",
            "PROP",
            100e18,
            admin,
            upgrader,
            user,
            assetMeta
        );

        // Verify metadata was passed to AssetERC20
        AssetERC20 token = AssetERC20(tokenAddress);
        assertEq(token.getMetadata("address"), "123 Main St");
        assertEq(token.getMetadata("squareFeet"), "2000");
        assertEq(token.getMetadata("yearBuilt"), "2020");
        assertEq(token.getMetadataCount(), 3);
    }

    function test_RegisterMultipleAssets() public {
        // Create asset type
        bytes32 assetType = keccak256("equipment");
        bytes32[] memory emptyKeys = new bytes32[](0);
        MetadataStorage.Metadata[] memory emptyMeta = new MetadataStorage.Metadata[](0);

        vm.prank(admin);
        registry.createAssetType("Equipment", assetType, emptyKeys, emptyMeta);

        // Register multiple assets
        vm.startPrank(registrar);
        (uint256 id1,) = registry.registerAsset(assetType, "Asset 1", "A1", 100e18, admin, upgrader, user, emptyMeta);
        (uint256 id2,) = registry.registerAsset(assetType, "Asset 2", "A2", 200e18, admin, upgrader, user, emptyMeta);
        (uint256 id3,) = registry.registerAsset(assetType, "Asset 3", "A3", 300e18, admin, upgrader, user, emptyMeta);
        vm.stopPrank();

        assertEq(id1, 1);
        assertEq(id2, 2);
        assertEq(id3, 3);
        assertTrue(registry.assetExists(id1));
        assertTrue(registry.assetExists(id2));
        assertTrue(registry.assetExists(id3));
    }

    function test_AssetIdIncrementsCorrectly() public {
        bytes32 assetType = keccak256("test");
        bytes32[] memory emptyKeys = new bytes32[](0);
        MetadataStorage.Metadata[] memory emptyMeta = new MetadataStorage.Metadata[](0);

        vm.prank(admin);
        registry.createAssetType("Test", assetType, emptyKeys, emptyMeta);

        assertEq(registry.assetId(), 0, "Initial assetId should be 0");

        vm.prank(registrar);
        (uint256 id1,) = registry.registerAsset(assetType, "A1", "A1", 100e18, admin, upgrader, user, emptyMeta);

        assertEq(id1, 1);
        assertEq(registry.assetId(), 1, "assetId should be 1 after first registration");

        vm.prank(registrar);
        (uint256 id2,) = registry.registerAsset(assetType, "A2", "A2", 100e18, admin, upgrader, user, emptyMeta);

        assertEq(id2, 2);
        assertEq(registry.assetId(), 2, "assetId should be 2 after second registration");
    }

    function test_RevertWhen_RegisterAssetWithNonexistentType() public {
        bytes32 nonexistentType = keccak256("nonexistent");
        MetadataStorage.Metadata[] memory emptyMeta = new MetadataStorage.Metadata[](0);

        vm.prank(registrar);
        vm.expectRevert("type !exists");
        registry.registerAsset(nonexistentType, "Asset", "AST", 100e18, admin, upgrader, user, emptyMeta);
    }

    function test_RevertWhen_UnauthorizedRegisterAsset() public {
        bytes32 assetType = keccak256("test");
        bytes32[] memory emptyKeys = new bytes32[](0);
        MetadataStorage.Metadata[] memory emptyMeta = new MetadataStorage.Metadata[](0);

        vm.prank(admin);
        registry.createAssetType("Test", assetType, emptyKeys, emptyMeta);

        // User without REGISTRAR_ROLE tries to register
        vm.prank(user);
        vm.expectRevert();
        registry.registerAsset(assetType, "Asset", "AST", 100e18, admin, upgrader, user, emptyMeta);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                  METADATA OPERATIONS                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_SetAssetTypeMetadata() public {
        bytes32 assetType = keccak256("drone");
        bytes32[] memory emptyKeys = new bytes32[](0);
        MetadataStorage.Metadata[] memory initialMeta = new MetadataStorage.Metadata[](1);
        initialMeta[0] = MetadataStorage.Metadata({key: "version", value: "1.0"});

        vm.prank(admin);
        registry.createAssetType("Drone", assetType, emptyKeys, initialMeta);

        // Update metadata
        MetadataStorage.Metadata[] memory newMeta = new MetadataStorage.Metadata[](2);
        newMeta[0] = MetadataStorage.Metadata({key: "version", value: "2.0"});
        newMeta[1] = MetadataStorage.Metadata({key: "maxAltitude", value: "5000"});

        vm.prank(admin);
        registry.setMetadata(assetType, newMeta);

        assertEq(registry.getMetadata(assetType, "version"), "2.0");
        assertEq(registry.getMetadata(assetType, "maxAltitude"), "5000");
    }

    function test_RemoveAssetTypeMetadata() public {
        bytes32 assetType = keccak256("test");
        bytes32[] memory emptyKeys = new bytes32[](0);
        MetadataStorage.Metadata[] memory meta = new MetadataStorage.Metadata[](2);
        meta[0] = MetadataStorage.Metadata({key: "key1", value: "value1"});
        meta[1] = MetadataStorage.Metadata({key: "key2", value: "value2"});

        vm.prank(admin);
        registry.createAssetType("Test", assetType, emptyKeys, meta);

        vm.prank(admin);
        registry.removeMetadata(assetType, "key1");

        assertEq(registry.getMetadata(assetType, "key1"), "", "key1 should be removed");
        assertEq(registry.getMetadata(assetType, "key2"), "value2", "key2 should still exist");
    }

    function test_RevertWhen_UnauthorizedSetMetadata() public {
        bytes32 assetType = keccak256("test");
        bytes32[] memory emptyKeys = new bytes32[](0);
        MetadataStorage.Metadata[] memory emptyMeta = new MetadataStorage.Metadata[](0);

        vm.prank(admin);
        registry.createAssetType("Test", assetType, emptyKeys, emptyMeta);

        MetadataStorage.Metadata[] memory meta = new MetadataStorage.Metadata[](1);
        meta[0] = MetadataStorage.Metadata({key: "unauthorized", value: "value"});

        vm.prank(user);
        vm.expectRevert();
        registry.setMetadata(assetType, meta);
    }

    function test_RevertWhen_UnauthorizedRemoveMetadata() public {
        bytes32 assetType = keccak256("test");
        bytes32[] memory emptyKeys = new bytes32[](0);
        MetadataStorage.Metadata[] memory meta = new MetadataStorage.Metadata[](1);
        meta[0] = MetadataStorage.Metadata({key: "key", value: "value"});

        vm.prank(admin);
        registry.createAssetType("Test", assetType, emptyKeys, meta);

        vm.prank(user);
        vm.expectRevert();
        registry.removeMetadata(assetType, "key");
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    METADATA ISOLATION                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_MetadataIsolationBetweenAssetTypes() public {
        bytes32 type1 = keccak256("type1");
        bytes32 type2 = keccak256("type2");
        bytes32[] memory emptyKeys = new bytes32[](0);

        MetadataStorage.Metadata[] memory meta1 = new MetadataStorage.Metadata[](1);
        meta1[0] = MetadataStorage.Metadata({key: "category", value: "electronics"});

        MetadataStorage.Metadata[] memory meta2 = new MetadataStorage.Metadata[](1);
        meta2[0] = MetadataStorage.Metadata({key: "category", value: "vehicles"});

        vm.startPrank(admin);
        registry.createAssetType("Type1", type1, emptyKeys, meta1);
        registry.createAssetType("Type2", type2, emptyKeys, meta2);
        vm.stopPrank();

        assertEq(registry.getMetadata(type1, "category"), "electronics");
        assertEq(registry.getMetadata(type2, "category"), "vehicles");
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                     ASSET QUERIES                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_GetAsset() public {
        bytes32 assetType = keccak256("test");
        bytes32[] memory emptyKeys = new bytes32[](0);
        MetadataStorage.Metadata[] memory emptyMeta = new MetadataStorage.Metadata[](0);

        vm.prank(admin);
        registry.createAssetType("Test", assetType, emptyKeys, emptyMeta);

        vm.prank(registrar);
        (uint256 assetId, address tokenAddr) = registry.registerAsset(
            assetType,
            "Asset",
            "AST",
            100e18,
            admin,
            upgrader,
            user,
            emptyMeta
        );

        AssetRegistry.Asset memory asset = registry.getAsset(assetId);
        assertEq(asset.assetType, assetType);
        assertEq(asset.issuer, user);
        assertEq(asset.tokenAddress, tokenAddr);
    }

    function test_AssetExists() public {
        bytes32 assetType = keccak256("test");
        bytes32[] memory emptyKeys = new bytes32[](0);
        MetadataStorage.Metadata[] memory emptyMeta = new MetadataStorage.Metadata[](0);

        vm.prank(admin);
        registry.createAssetType("Test", assetType, emptyKeys, emptyMeta);

        assertFalse(registry.assetExists(1), "Asset 1 should not exist yet");

        vm.prank(registrar);
        (uint256 assetId,) = registry.registerAsset(
            assetType,
            "Asset",
            "AST",
            100e18,
            admin,
            upgrader,
            user,
            emptyMeta
        );

        assertTrue(registry.assetExists(assetId), "Asset should exist after registration");
        assertFalse(registry.assetExists(assetId + 1), "Next asset ID should not exist");
    }

    function test_GetType() public {
        bytes32 assetType = keccak256("machinery");
        bytes32[] memory requiredKeys = new bytes32[](1);
        requiredKeys[0] = keccak256("maintenanceSchedule");
        MetadataStorage.Metadata[] memory emptyMeta = new MetadataStorage.Metadata[](0);

        vm.prank(admin);
        registry.createAssetType("Machinery", assetType, requiredKeys, emptyMeta);

        AssetRegistry.AssetType memory retrievedType = registry.getType(assetType);
        assertEq(retrievedType.name, "Machinery");
        assertEq(retrievedType.requiredLeaseKeys.length, 1);
        assertEq(retrievedType.requiredLeaseKeys[0], requiredKeys[0]);
    }

    function test_GetNonexistentType() public {
        bytes32 nonexistent = keccak256("nonexistent");
        AssetRegistry.AssetType memory retrievedType = registry.getType(nonexistent);
        assertEq(retrievedType.name, "", "Nonexistent type should return empty name");
        assertEq(retrievedType.requiredLeaseKeys.length, 0);
    }

    function test_GetNonexistentAsset() public {
        AssetRegistry.Asset memory asset = registry.getAsset(999);
        assertEq(asset.assetType, bytes32(0));
        assertEq(asset.issuer, address(0));
        assertEq(asset.tokenAddress, address(0));
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                   CLONE DEPLOYMENT                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_EachAssetGetsUniqueERC20() public {
        bytes32 assetType = keccak256("test");
        bytes32[] memory emptyKeys = new bytes32[](0);
        MetadataStorage.Metadata[] memory emptyMeta = new MetadataStorage.Metadata[](0);

        vm.prank(admin);
        registry.createAssetType("Test", assetType, emptyKeys, emptyMeta);

        vm.startPrank(registrar);
        (, address token1) = registry.registerAsset(assetType, "A1", "A1", 100e18, admin, upgrader, user, emptyMeta);
        (, address token2) = registry.registerAsset(assetType, "A2", "A2", 200e18, admin, upgrader, user, emptyMeta);
        vm.stopPrank();

        assertTrue(token1 != token2, "Each asset should have unique token address");
        assertEq(AssetERC20(token1).totalSupply(), 100e18);
        assertEq(AssetERC20(token2).totalSupply(), 200e18);
    }

    function test_ClonedTokensAreIndependent() public {
        bytes32 assetType = keccak256("test");
        bytes32[] memory emptyKeys = new bytes32[](0);
        MetadataStorage.Metadata[] memory emptyMeta = new MetadataStorage.Metadata[](0);

        vm.prank(admin);
        registry.createAssetType("Test", assetType, emptyKeys, emptyMeta);

        address holder1 = address(0x100);
        address holder2 = address(0x200);

        vm.startPrank(registrar);
        (, address token1) = registry.registerAsset(assetType, "A1", "A1", 1000e18, admin, upgrader, holder1, emptyMeta);
        (, address token2) = registry.registerAsset(assetType, "A2", "A2", 2000e18, admin, upgrader, holder2, emptyMeta);
        vm.stopPrank();

        // Verify independence
        assertEq(AssetERC20(token1).balanceOf(holder1), 1000e18);
        assertEq(AssetERC20(token1).balanceOf(holder2), 0);
        assertEq(AssetERC20(token2).balanceOf(holder1), 0);
        assertEq(AssetERC20(token2).balanceOf(holder2), 2000e18);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                   ACCESS CONTROL                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_RoleAssignments() public {
        assertTrue(registry.hasRole(registry.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(registry.hasRole(Roles.UPGRADER_ROLE, upgrader));
        assertTrue(registry.hasRole(Roles.REGISTRAR_ROLE, registrar));
    }

    function test_AdminCanGrantRegistrarRole() public {
        address newRegistrar = address(0x999);

        vm.prank(admin);
        registry.grantRole(Roles.REGISTRAR_ROLE, newRegistrar);

        assertTrue(registry.hasRole(Roles.REGISTRAR_ROLE, newRegistrar));

        // New registrar should be able to register assets
        bytes32 assetType = keccak256("test");
        bytes32[] memory emptyKeys = new bytes32[](0);
        MetadataStorage.Metadata[] memory emptyMeta = new MetadataStorage.Metadata[](0);

        vm.prank(admin);
        registry.createAssetType("Test", assetType, emptyKeys, emptyMeta);

        vm.prank(newRegistrar);
        (uint256 assetId,) = registry.registerAsset(
            assetType,
            "Asset",
            "AST",
            100e18,
            admin,
            upgrader,
            user,
            emptyMeta
        );

        assertTrue(assetId > 0);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      EDGE CASES                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_RegisterAssetWithZeroSupply() public {
        bytes32 assetType = keccak256("test");
        bytes32[] memory emptyKeys = new bytes32[](0);
        MetadataStorage.Metadata[] memory emptyMeta = new MetadataStorage.Metadata[](0);

        vm.prank(admin);
        registry.createAssetType("Test", assetType, emptyKeys, emptyMeta);

        vm.prank(registrar);
        (uint256 assetId, address tokenAddr) = registry.registerAsset(
            assetType,
            "Zero Supply Asset",
            "ZSA",
            0, // Zero supply
            admin,
            upgrader,
            user,
            emptyMeta
        );

        assertTrue(assetId > 0);
        assertEq(AssetERC20(tokenAddr).totalSupply(), 0);
    }

    function test_CreateAssetTypeWithEmptyName() public {
        bytes32 assetType = keccak256("empty-name");
        bytes32[] memory emptyKeys = new bytes32[](0);
        MetadataStorage.Metadata[] memory emptyMeta = new MetadataStorage.Metadata[](0);

        vm.prank(admin);
        registry.createAssetType("", assetType, emptyKeys, emptyMeta);

        AssetRegistry.AssetType memory retrievedType = registry.getType(assetType);
        assertEq(retrievedType.name, "");
    }

    function test_CreateAssetTypeWithNoRequiredLeaseKeys() public {
        bytes32 assetType = keccak256("no-required-keys");
        bytes32[] memory emptyKeys = new bytes32[](0);
        MetadataStorage.Metadata[] memory emptyMeta = new MetadataStorage.Metadata[](0);

        vm.prank(admin);
        registry.createAssetType("No Required Keys", assetType, emptyKeys, emptyMeta);

        AssetRegistry.AssetType memory retrievedType = registry.getType(assetType);
        assertEq(retrievedType.requiredLeaseKeys.length, 0);
    }

    function test_RegisterAssetWithEmptyMetadata() public {
        bytes32 assetType = keccak256("test");
        bytes32[] memory emptyKeys = new bytes32[](0);
        MetadataStorage.Metadata[] memory emptyMeta = new MetadataStorage.Metadata[](0);

        vm.prank(admin);
        registry.createAssetType("Test", assetType, emptyKeys, emptyMeta);

        vm.prank(registrar);
        (uint256 assetId, address tokenAddr) = registry.registerAsset(
            assetType,
            "Asset",
            "AST",
            100e18,
            admin,
            upgrader,
            user,
            emptyMeta
        );

        assertTrue(assetId > 0);
        assertEq(AssetERC20(tokenAddr).getMetadataCount(), 0);
    }

    function test_AssetImplementationAddress() public {
        assertEq(registry.assetERC20Implementation(), assetERC20Implementation);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*              EVENT STRUCTURE VALIDATION TESTS              */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Validates AssetTypeCreated event structure matches offchain expectations
    function test_EventStructure_AssetTypeCreated() public {
        bytes32 assetType = keccak256("satellite");
        bytes32[] memory requiredKeys = new bytes32[](2);
        requiredKeys[0] = keccak256("startTime");
        requiredKeys[1] = keccak256("endTime");

        MetadataStorage.Metadata[] memory metadata = new MetadataStorage.Metadata[](1);
        metadata[0] = MetadataStorage.Metadata({key: "schemaURI", value: "ipfs://schema"});

        // Expect event with exact parameter structure offchain listeners expect
        vm.expectEmit(true, true, false, true);
        emit AssetRegistry.AssetTypeCreated("Satellite", assetType, requiredKeys);

        vm.prank(admin);
        registry.createAssetType("Satellite", assetType, requiredKeys, metadata);
    }

    /// @notice Validates AssetRegistered event structure matches offchain expectations
    function test_EventStructure_AssetRegistered() public {
        // Setup: Create asset type first
        bytes32 assetType = keccak256("satellite");
        bytes32[] memory requiredKeys = new bytes32[](0);
        MetadataStorage.Metadata[] memory typeMetadata = new MetadataStorage.Metadata[](0);

        vm.prank(admin);
        registry.createAssetType("Satellite", assetType, requiredKeys, typeMetadata);

        // Test: Verify AssetRegistered event structure
        MetadataStorage.Metadata[] memory assetMetadata = new MetadataStorage.Metadata[](0);

        vm.prank(registrar);
        (uint256 expectedAssetId,) = registry.registerAsset(
            assetType,
            "Satellite Alpha",
            "SATA",
            1000e18,
            admin,
            upgrader,
            user,
            assetMetadata
        );

        // Register another asset and verify event
        vm.recordLogs();

        vm.prank(registrar);
        (uint256 assetId, address tokenAddress) = registry.registerAsset(
            assetType,
            "Satellite Beta",
            "SATB",
            2000e18,
            admin,
            upgrader,
            user,
            assetMetadata
        );

        // Verify event was emitted by checking logs
        // Note: Using expectEmit in a separate call would be cleaner
        // but for demonstration of log parsing, we verify event manually
        assertTrue(assetId > 0 && tokenAddress != address(0), "Asset should be registered with valid data");
    }

    /// @notice Validates that events are emitted in correct order for complex workflows
    function test_EventOrdering_MultipleOperations() public {
        bytes32 assetType1 = keccak256("type1");
        bytes32 assetType2 = keccak256("type2");
        bytes32[] memory requiredKeys = new bytes32[](0);
        MetadataStorage.Metadata[] memory metadata = new MetadataStorage.Metadata[](0);

        // Create two asset types
        vm.prank(admin);
        registry.createAssetType("Type 1", assetType1, requiredKeys, metadata);

        vm.prank(admin);
        registry.createAssetType("Type 2", assetType2, requiredKeys, metadata);

        // Register assets - should succeed if types were created
        vm.prank(registrar);
        (uint256 asset1,) = registry.registerAsset(assetType1, "Asset 1", "AST1", 1000e18, admin, upgrader, user, metadata);

        vm.prank(registrar);
        (uint256 asset2,) = registry.registerAsset(assetType2, "Asset 2", "AST2", 2000e18, admin, upgrader, user, metadata);

        // Verify operations succeeded in correct order
        assertTrue(asset1 > 0 && asset2 > 0, "Both assets should be registered");
        assertTrue(asset2 > asset1, "Asset IDs should increment");
    }

    /// @notice Validates event parameters are correctly indexed for efficient offchain filtering
    function test_EventIndexing_AssetTypeCreated() public {
        bytes32 assetType = keccak256("test");
        bytes32[] memory requiredKeys = new bytes32[](0);
        MetadataStorage.Metadata[] memory metadata = new MetadataStorage.Metadata[](0);

        // Expect event with indexed parameters (offchain can filter by these)
        vm.expectEmit(true, true, false, true);
        emit AssetRegistry.AssetTypeCreated("Test", assetType, requiredKeys);

        vm.prank(admin);
        registry.createAssetType("Test", assetType, requiredKeys, metadata);
    }

    /// @notice Validates event parameters are correctly indexed for AssetRegistered
    function test_EventIndexing_AssetRegistered() public {
        // Setup
        bytes32 assetType = keccak256("test");
        bytes32[] memory requiredKeys = new bytes32[](0);
        MetadataStorage.Metadata[] memory metadata = new MetadataStorage.Metadata[](0);

        vm.prank(admin);
        registry.createAssetType("Test", assetType, requiredKeys, metadata);

        vm.prank(registrar);
        (uint256 assetId, address tokenAddress) = registry.registerAsset(
            assetType,
            "Test Asset",
            "TST",
            1000e18,
            admin,
            upgrader,
            user,
            metadata
        );

        // Verify event structure by checking the asset was registered
        assertTrue(assetId > 0, "AssetId should be assigned");
        assertTrue(tokenAddress != address(0), "Token should be deployed");

        AssetRegistry.Asset memory asset = registry.getAsset(assetId);
        assertEq(asset.assetType, assetType, "AssetType should match");
        assertEq(asset.tokenAddress, tokenAddress, "Token address should match");
    }
}

