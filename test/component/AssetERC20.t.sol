// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {AssetERC20} from "../../src/AssetERC20.sol";
import {MetadataStorage} from "../../src/MetadataStorage.sol";
import {Roles} from "../../src/libraries/Roles.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/// @title AssetERC20Test
/// @notice Comprehensive test suite for AssetERC20 token and metadata functionality
contract AssetERC20Test is Test {
    AssetERC20 public token;
    address public admin = address(0x1);
    address public upgrader = address(0x2);
    address public holder1 = address(0x3);
    address public holder2 = address(0x4);
    address public user = address(0x5);

    uint256 constant ASSET_ID = 123;
    uint256 constant TOTAL_SUPPLY = 1000e18;

    event MetadataUpdated(bytes32 indexed hash, string key, string value);
    event MetadataRemoved(bytes32 indexed hash, string key);

    function setUp() public {
        // Create initial metadata
        MetadataStorage.Metadata[] memory metadata = new MetadataStorage.Metadata[](3);
        metadata[0] = MetadataStorage.Metadata({key: "name", value: "Test Asset"});
        metadata[1] = MetadataStorage.Metadata({key: "description", value: "A test asset"});
        metadata[2] = MetadataStorage.Metadata({key: "category", value: "Electronics"});

        // Deploy implementation
        AssetERC20 tokenImpl = new AssetERC20();

        // Deploy and initialize as upgradeable proxy
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(tokenImpl),
            abi.encodeCall(
                AssetERC20.initialize,
                ("Asset Token", "AST", TOTAL_SUPPLY, ASSET_ID, admin, upgrader, holder1, metadata)
            )
        );
        token = AssetERC20(address(proxy));
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    INITIALIZATION                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_Initialization() public {
        assertEq(token.name(), "Asset Token");
        assertEq(token.symbol(), "AST");
        assertEq(token.totalSupply(), TOTAL_SUPPLY);
        assertEq(token.balanceOf(holder1), TOTAL_SUPPLY);
    }

    function test_InitialMetadata() public {
        assertEq(token.getMetadata("name"), "Test Asset");
        assertEq(token.getMetadata("description"), "A test asset");
        assertEq(token.getMetadata("category"), "Electronics");
        assertEq(token.getMetadataCount(), 3);
    }

    function test_InitialRoles() public {
        assertTrue(token.hasRole(token.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(token.hasRole(Roles.UPGRADER_ROLE, upgrader));
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                  METADATA OPERATIONS                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_SetMetadata() public {
        MetadataStorage.Metadata[] memory newMetadata = new MetadataStorage.Metadata[](2);
        newMetadata[0] = MetadataStorage.Metadata({key: "location", value: "Building A"});
        newMetadata[1] = MetadataStorage.Metadata({key: "value", value: "1000000"});

        vm.prank(admin);
        token.setMetadata(newMetadata);

        assertEq(token.getMetadata("location"), "Building A");
        assertEq(token.getMetadata("value"), "1000000");
        assertEq(token.getMetadataCount(), 5); // 3 initial + 2 new
    }

    function test_UpdateExistingMetadata() public {
        MetadataStorage.Metadata[] memory updateMetadata = new MetadataStorage.Metadata[](1);
        updateMetadata[0] = MetadataStorage.Metadata({key: "category", value: "Vehicles"});

        vm.prank(admin);
        token.setMetadata(updateMetadata);

        assertEq(token.getMetadata("category"), "Vehicles");
        assertEq(token.getMetadataCount(), 3); // Count should not increase
    }

    function test_GetAllMetadata() public {
        MetadataStorage.Metadata[] memory allMetadata = token.getAllMetadata();

        assertEq(allMetadata.length, 3);
        assertEq(allMetadata[0].key, "name");
        assertEq(allMetadata[0].value, "Test Asset");
        assertEq(allMetadata[1].key, "description");
        assertEq(allMetadata[1].value, "A test asset");
        assertEq(allMetadata[2].key, "category");
        assertEq(allMetadata[2].value, "Electronics");
    }

    function test_GetAllMetadataKeys() public {
        string[] memory keys = token.getAllMetadataKeys();

        assertEq(keys.length, 3);
        assertEq(keys[0], "name");
        assertEq(keys[1], "description");
        assertEq(keys[2], "category");
    }

    function test_HasMetadata() public {
        assertTrue(token.hasMetadata("name"));
        assertTrue(token.hasMetadata("description"));
        assertFalse(token.hasMetadata("nonexistent"));
    }

    function test_RemoveMetadata() public {
        vm.prank(admin);
        token.removeMetadata("category");

        assertFalse(token.hasMetadata("category"));
        assertEq(token.getMetadata("category"), "");
        assertEq(token.getMetadataCount(), 2);
    }

    function test_RevertWhen_UnauthorizedSetMetadata() public {
        MetadataStorage.Metadata[] memory metadata = new MetadataStorage.Metadata[](1);
        metadata[0] = MetadataStorage.Metadata({key: "unauthorized", value: "value"});

        vm.prank(user);
        vm.expectRevert();
        token.setMetadata(metadata);
    }

    function test_RevertWhen_UnauthorizedRemoveMetadata() public {
        vm.prank(user);
        vm.expectRevert();
        token.removeMetadata("name");
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                METADATA HASH ISOLATION                     */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_MetadataIsolationByAssetId() public {
        // Create another AssetERC20 with different asset ID
        MetadataStorage.Metadata[] memory metadata2 = new MetadataStorage.Metadata[](1);
        metadata2[0] = MetadataStorage.Metadata({key: "name", value: "Different Asset"});

        AssetERC20 tokenImpl2 = new AssetERC20();
        ERC1967Proxy proxy2 = new ERC1967Proxy(
            address(tokenImpl2),
            abi.encodeCall(
                AssetERC20.initialize,
                ("Asset Token 2", "AST2", 500e18, 456, admin, upgrader, holder2, metadata2)
            )
        );
        AssetERC20 token2 = AssetERC20(address(proxy2));

        // Verify metadata is isolated
        assertEq(token.getMetadata("name"), "Test Asset");
        assertEq(token2.getMetadata("name"), "Different Asset");

        // Update one shouldn't affect the other
        MetadataStorage.Metadata[] memory update = new MetadataStorage.Metadata[](1);
        update[0] = MetadataStorage.Metadata({key: "name", value: "Updated Asset"});

        vm.prank(admin);
        token.setMetadata(update);

        assertEq(token.getMetadata("name"), "Updated Asset");
        assertEq(token2.getMetadata("name"), "Different Asset");
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                 METADATA PERSISTENCE                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_MetadataPersistsAfterTransfer() public {
        // Verify initial metadata
        assertEq(token.getMetadata("name"), "Test Asset");

        // Perform transfer
        vm.prank(holder1);
        token.transfer(holder2, 100e18);

        // Metadata should still be accessible
        assertEq(token.getMetadata("name"), "Test Asset");
        assertEq(token.getMetadata("description"), "A test asset");
        assertEq(token.getMetadataCount(), 3);
    }

    function test_MetadataIndependentOfBalance() public {
        // Transfer all tokens away from holder1
        vm.prank(holder1);
        token.transfer(holder2, TOTAL_SUPPLY);

        assertEq(token.balanceOf(holder1), 0);

        // Metadata should still be accessible
        assertEq(token.getMetadata("name"), "Test Asset");
        assertEq(token.getMetadataCount(), 3);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                   HOLDER TRACKING                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_InitialHolder() public {
        (address[] memory holders, uint256[] memory balances) = token.getHolders();

        assertEq(holders.length, 1);
        assertEq(holders[0], holder1);
        assertEq(balances[0], TOTAL_SUPPLY);
    }

    function test_HolderTrackingAfterTransfer() public {
        vm.prank(holder1);
        token.transfer(holder2, 300e18);

        (address[] memory holders, uint256[] memory balances) = token.getHolders();

        assertEq(holders.length, 2);

        // Find holder1 and holder2 in the array
        bool found1 = false;
        bool found2 = false;
        for (uint256 i = 0; i < holders.length; i++) {
            if (holders[i] == holder1) {
                assertEq(balances[i], 700e18);
                found1 = true;
            }
            if (holders[i] == holder2) {
                assertEq(balances[i], 300e18);
                found2 = true;
            }
        }
        assertTrue(found1, "holder1 should be in holders array");
        assertTrue(found2, "holder2 should be in holders array");
    }

    function test_HolderRemovedWhenBalanceZero() public {
        // Transfer all tokens from holder1 to holder2
        vm.prank(holder1);
        token.transfer(holder2, TOTAL_SUPPLY);

        (address[] memory holders, uint256[] memory balances) = token.getHolders();

        // holder1 should be removed since balance is zero
        assertEq(holders.length, 1);
        assertEq(holders[0], holder2);
        assertEq(balances[0], TOTAL_SUPPLY);
    }

    function test_MultipleHolders() public {
        address holder3 = address(0x6);
        address holder4 = address(0x7);

        // Distribute tokens to multiple holders
        vm.startPrank(holder1);
        token.transfer(holder2, 250e18);
        token.transfer(holder3, 250e18);
        token.transfer(holder4, 250e18);
        vm.stopPrank();

        (address[] memory holders, uint256[] memory balances) = token.getHolders();

        assertEq(holders.length, 4);

        // Verify all balances add up to total supply
        uint256 totalBalance = 0;
        for (uint256 i = 0; i < balances.length; i++) {
            totalBalance += balances[i];
        }
        assertEq(totalBalance, TOTAL_SUPPLY);
    }

    function test_HolderReaddedAfterReceivingTokens() public {
        // Transfer all tokens away from holder1
        vm.prank(holder1);
        token.transfer(holder2, TOTAL_SUPPLY);

        (address[] memory holders1,) = token.getHolders();
        assertEq(holders1.length, 1);

        // Transfer some back to holder1
        vm.prank(holder2);
        token.transfer(holder1, 100e18);

        (address[] memory holders2, uint256[] memory balances2) = token.getHolders();
        assertEq(holders2.length, 2);

        // Verify holder1 is back in the set
        bool found = false;
        for (uint256 i = 0; i < holders2.length; i++) {
            if (holders2[i] == holder1) {
                assertEq(balances2[i], 100e18);
                found = true;
            }
        }
        assertTrue(found, "holder1 should be back in holders array");
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                   ERC20 FUNCTIONALITY                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_BasicTransfer() public {
        vm.prank(holder1);
        bool success = token.transfer(holder2, 100e18);

        assertTrue(success);
        assertEq(token.balanceOf(holder1), 900e18);
        assertEq(token.balanceOf(holder2), 100e18);
    }

    function test_TransferAll() public {
        vm.prank(holder1);
        token.transfer(holder2, TOTAL_SUPPLY);

        assertEq(token.balanceOf(holder1), 0);
        assertEq(token.balanceOf(holder2), TOTAL_SUPPLY);
    }

    function test_Approve() public {
        vm.prank(holder1);
        token.approve(user, 500e18);

        assertEq(token.allowance(holder1, user), 500e18);
    }

    function test_TransferFrom() public {
        vm.prank(holder1);
        token.approve(user, 500e18);

        vm.prank(user);
        token.transferFrom(holder1, holder2, 300e18);

        assertEq(token.balanceOf(holder1), 700e18);
        assertEq(token.balanceOf(holder2), 300e18);
        assertEq(token.allowance(holder1, user), 200e18);
    }

    function test_RevertWhen_TransferExceedsBalance() public {
        vm.prank(holder1);
        vm.expectRevert();
        token.transfer(holder2, TOTAL_SUPPLY + 1);
    }

    function test_RevertWhen_TransferFromExceedsAllowance() public {
        vm.prank(holder1);
        token.approve(user, 100e18);

        vm.prank(user);
        vm.expectRevert();
        token.transferFrom(holder1, holder2, 200e18);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       EVENT TESTING                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_MetadataUpdatedEvent() public {
        MetadataStorage.Metadata[] memory metadata = new MetadataStorage.Metadata[](1);
        metadata[0] = MetadataStorage.Metadata({key: "eventTest", value: "eventValue"});

        bytes32 expectedHash = keccak256(abi.encodePacked(ASSET_ID));

        vm.expectEmit(true, false, false, true);
        emit MetadataUpdated(expectedHash, "eventTest", "eventValue");

        vm.prank(admin);
        token.setMetadata(metadata);
    }

    function test_MetadataRemovedEvent() public {
        bytes32 expectedHash = keccak256(abi.encodePacked(ASSET_ID));

        vm.expectEmit(true, false, false, true);
        emit MetadataRemoved(expectedHash, "category");

        vm.prank(admin);
        token.removeMetadata("category");
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                      EDGE CASES                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.•°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_EmptyMetadataValue() public {
        MetadataStorage.Metadata[] memory metadata = new MetadataStorage.Metadata[](1);
        metadata[0] = MetadataStorage.Metadata({key: "emptyValue", value: ""});

        vm.prank(admin);
        token.setMetadata(metadata);

        // Empty values are treated as nonexistent by the contract
        assertEq(token.getMetadata("emptyValue"), "");
        assertFalse(token.hasMetadata("emptyValue"));
    }

    function test_LongMetadataStrings() public {
        string memory longValue = "";
        for (uint256 i = 0; i < 100; i++) {
            longValue = string(abi.encodePacked(longValue, "0123456789"));
        }

        MetadataStorage.Metadata[] memory metadata = new MetadataStorage.Metadata[](1);
        metadata[0] = MetadataStorage.Metadata({key: "longString", value: longValue});

        vm.prank(admin);
        token.setMetadata(metadata);

        assertEq(token.getMetadata("longString"), longValue);
    }

    function test_ManyMetadataKeys() public {
        MetadataStorage.Metadata[] memory metadata = new MetadataStorage.Metadata[](50);
        for (uint256 i = 0; i < 50; i++) {
            metadata[i] = MetadataStorage.Metadata({
                key: string(abi.encodePacked("key", vm.toString(i))),
                value: string(abi.encodePacked("value", vm.toString(i)))
            });
        }

        vm.prank(admin);
        token.setMetadata(metadata);

        assertEq(token.getMetadataCount(), 53); // 3 initial + 50 new
        assertEq(token.getMetadata("key0"), "value0");
        assertEq(token.getMetadata("key49"), "value49");
    }

    function test_TransferToSelf() public {
        uint256 balanceBefore = token.balanceOf(holder1);

        vm.prank(holder1);
        token.transfer(holder1, 100e18);

        assertEq(token.balanceOf(holder1), balanceBefore);

        // Holder should still be in the holders set
        (address[] memory holders,) = token.getHolders();
        assertEq(holders.length, 1);
        assertEq(holders[0], holder1);
    }

    function test_ZeroTransfer() public {
        vm.prank(holder1);
        token.transfer(holder2, 0);

        assertEq(token.balanceOf(holder1), TOTAL_SUPPLY);
        assertEq(token.balanceOf(holder2), 0);
    }

    function test_SpecialCharactersInMetadata() public {
        MetadataStorage.Metadata[] memory metadata = new MetadataStorage.Metadata[](2);
        metadata[0] = MetadataStorage.Metadata({key: "unicode", value: unicode"Hello 世界 🌍"});
        metadata[1] = MetadataStorage.Metadata({key: "special", value: "!@#$%^&*()"});

        vm.prank(admin);
        token.setMetadata(metadata);

        assertEq(token.getMetadata("unicode"), unicode"Hello 世界 🌍");
        assertEq(token.getMetadata("special"), "!@#$%^&*()");
    }

    function test_MetadataOperationsSequence() public {
        // Add metadata
        MetadataStorage.Metadata[] memory meta1 = new MetadataStorage.Metadata[](1);
        meta1[0] = MetadataStorage.Metadata({key: "new", value: "value"});
        vm.prank(admin);
        token.setMetadata(meta1);

        // Update it
        MetadataStorage.Metadata[] memory meta2 = new MetadataStorage.Metadata[](1);
        meta2[0] = MetadataStorage.Metadata({key: "new", value: "updated"});
        vm.prank(admin);
        token.setMetadata(meta2);

        // Remove it
        vm.prank(admin);
        token.removeMetadata("new");

        // Add it again with different value
        MetadataStorage.Metadata[] memory meta3 = new MetadataStorage.Metadata[](1);
        meta3[0] = MetadataStorage.Metadata({key: "new", value: "final"});
        vm.prank(admin);
        token.setMetadata(meta3);

        assertEq(token.getMetadata("new"), "final");
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    ACCESS CONTROL                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function test_AdminCanGrantRoles() public {
        address newUser = address(0x999);
        bytes32 upgraderRole = Roles.UPGRADER_ROLE;

        // Admin should be able to grant UPGRADER_ROLE to a new user
        vm.prank(admin);
        token.grantRole(upgraderRole, newUser);

        // Verify newUser has the upgrader role
        assertTrue(token.hasRole(upgraderRole, newUser));
    }

    function test_NonAdminCannotGrantRoles() public {
        // User (non-admin) tries to grant themselves admin role
        bytes32 adminRole = token.DEFAULT_ADMIN_ROLE();

        vm.prank(user);
        vm.expectRevert(
            abi.encodeWithSelector(
                bytes4(keccak256("AccessControlUnauthorizedAccount(address,bytes32)")),
                user,
                adminRole
            )
        );
        token.grantRole(adminRole, user);
    }

    function test_OnlyAdminCanSetMetadata() public {
        MetadataStorage.Metadata[] memory metadata = new MetadataStorage.Metadata[](1);
        metadata[0] = MetadataStorage.Metadata({key: "test", value: "value"});

        // Holder cannot set metadata
        vm.prank(holder1);
        vm.expectRevert();
        token.setMetadata(metadata);

        // Upgrader cannot set metadata
        vm.prank(upgrader);
        vm.expectRevert();
        token.setMetadata(metadata);

        // Admin can set metadata
        vm.prank(admin);
        token.setMetadata(metadata);

        assertEq(token.getMetadata("test"), "value");
    }

    function test_InitializationWithZeroSupply() public {
        MetadataStorage.Metadata[] memory emptyMeta = new MetadataStorage.Metadata[](0);

        AssetERC20 zeroTokenImpl = new AssetERC20();
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(zeroTokenImpl),
            abi.encodeCall(
                AssetERC20.initialize,
                ("Zero Supply Token", "ZST", 0, 999, admin, upgrader, holder1, emptyMeta)
            )
        );
        AssetERC20 zeroToken = AssetERC20(address(proxy));

        assertEq(zeroToken.totalSupply(), 0);
        assertEq(zeroToken.balanceOf(holder1), 0);

        // When balance is 0, holder is not added to the set
        (address[] memory holders,) = zeroToken.getHolders();
        // Note: holder1 gets minted 0 tokens, so _update is called with value=0
        // The _update function adds holders when `to != address(0)` regardless of amount
        // So holder1 will be in the holders set even with 0 balance
        assertEq(holders.length, 1);
        assertEq(holders[0], holder1);
    }
}

