// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Test} from "forge-std/Test.sol";
import {AssetERC20} from "../src/AssetERC20.sol";

/// @title ERC20SnapshotMigrationTest
/// @notice Simple workflow tests to verify ERC20Snapshot to ERC20Votes migration
/// @dev Tests basic functionality to ensure the migration maintains interface compatibility
contract ERC20SnapshotMigrationTest is Test {
    AssetERC20 public assetToken;

    address public admin = makeAddr("admin");
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    address public charlie = makeAddr("charlie");

    uint256 public constant TOTAL_SUPPLY = 1000 * 1e18;
    uint256 public constant ASSET_ID = 1;

    function setUp() public {
        // Deploy AssetERC20 with the new ERC20Votes implementation
        assetToken = new AssetERC20(
            "Test Asset Token",
            "TAT",
            ASSET_ID,
            admin,
            alice, // initial owner
            TOTAL_SUPPLY
        );

        // Give some tokens to other users for testing
        vm.prank(alice);
        assetToken.transfer(bob, 300 * 1e18);

        vm.prank(alice);
        assetToken.transfer(charlie, 200 * 1e18);
    }

    function test_InitialSetup() public {
        // Verify basic deployment
        assertEq(assetToken.name(), "Test Asset Token");
        assertEq(assetToken.symbol(), "TAT");
        assertEq(assetToken.assetId(), ASSET_ID);
        assertEq(assetToken.totalSupply(), TOTAL_SUPPLY);

        // Verify initial balances
        assertEq(assetToken.balanceOf(alice), 500 * 1e18);
        assertEq(assetToken.balanceOf(bob), 300 * 1e18);
        assertEq(assetToken.balanceOf(charlie), 200 * 1e18);

        // Verify no snapshots exist initially
        assertEq(assetToken.getCurrentSnapshotId(), 0);
    }

    function test_AutoDelegation() public {
        // Verify auto-delegation happened during initial setup
        assertEq(assetToken.delegates(alice), alice);
        assertEq(assetToken.delegates(bob), bob);
        assertEq(assetToken.delegates(charlie), charlie);

        // Verify voting power equals token balance
        assertEq(assetToken.getVotes(alice), 500 * 1e18);
        assertEq(assetToken.getVotes(bob), 300 * 1e18);
        assertEq(assetToken.getVotes(charlie), 200 * 1e18);
    }

    function test_SnapshotCreation() public {
        // Only admin should be able to create snapshots
        vm.expectRevert();
        vm.prank(alice);
        assetToken.snapshot();

        // Admin can create snapshot
        vm.prank(admin);
        uint256 snapshotId = assetToken.snapshot();

        assertEq(snapshotId, 1);
        assertEq(assetToken.getCurrentSnapshotId(), 1);
    }

    function test_BalanceOfAtSnapshot() public {
        // Advance to next block to ensure voting checkpoints are established
        vm.roll(block.number + 1);

        // Create first snapshot
        vm.prank(admin);
        uint256 snapshot1 = assetToken.snapshot();

        // Advance to next block after snapshot
        vm.roll(block.number + 1);

        // Transfer some tokens after snapshot
        vm.prank(alice);
        assetToken.transfer(bob, 100 * 1e18);

        // Current balances should be different
        assertEq(assetToken.balanceOf(alice), 400 * 1e18);
        assertEq(assetToken.balanceOf(bob), 400 * 1e18);

        // Snapshot balances should reflect old values
        assertEq(assetToken.balanceOfAt(alice, snapshot1), 500 * 1e18);
        assertEq(assetToken.balanceOfAt(bob, snapshot1), 300 * 1e18);
        assertEq(assetToken.balanceOfAt(charlie, snapshot1), 200 * 1e18);
    }

    function test_TotalSupplyAtSnapshot() public {
        // Create snapshot
        vm.prank(admin);
        uint256 snapshotId = assetToken.snapshot();

        // Total supply should be captured correctly
        assertEq(assetToken.totalSupplyAt(snapshotId), TOTAL_SUPPLY);

        // Total supply should remain constant (no minting/burning in this test)
        assertEq(assetToken.totalSupply(), TOTAL_SUPPLY);
    }

    function test_MultipleSnapshots() public {
        // Advance to next block to ensure voting checkpoints are established
        vm.roll(block.number + 1);

        // Create first snapshot
        vm.prank(admin);
        uint256 snapshot1 = assetToken.snapshot();

        // Advance to next block after snapshot
        vm.roll(block.number + 1);

        // Make some transfers
        vm.prank(alice);
        assetToken.transfer(bob, 100 * 1e18);

        // Advance block to establish new checkpoint
        vm.roll(block.number + 1);

        // Create second snapshot
        vm.prank(admin);
        uint256 snapshot2 = assetToken.snapshot();

        // Advance to next block after snapshot
        vm.roll(block.number + 1);

        // Make more transfers
        vm.prank(bob);
        assetToken.transfer(charlie, 50 * 1e18);

        // Verify different snapshots capture different states
        assertEq(assetToken.balanceOfAt(alice, snapshot1), 500 * 1e18);
        assertEq(assetToken.balanceOfAt(alice, snapshot2), 400 * 1e18);

        assertEq(assetToken.balanceOfAt(bob, snapshot1), 300 * 1e18);
        assertEq(assetToken.balanceOfAt(bob, snapshot2), 400 * 1e18);

        // Current balance should be latest
        assertEq(assetToken.balanceOf(bob), 350 * 1e18);
    }

    function test_AutoDelegationForNewUsers() public {
        address newUser = makeAddr("newUser");

        // New user should not have delegation initially
        assertEq(assetToken.delegates(newUser), address(0));
        assertEq(assetToken.getVotes(newUser), 0);

        // Transfer tokens to new user
        vm.prank(alice);
        assetToken.transfer(newUser, 50 * 1e18);

        // Auto-delegation should happen
        assertEq(assetToken.delegates(newUser), newUser);
        assertEq(assetToken.getVotes(newUser), 50 * 1e18);
    }

    function test_InvalidSnapshotQueries() public {
        // Should revert for nonexistent snapshot
        vm.expectRevert("ERC20Snapshot: nonexistent snapshot");
        assetToken.balanceOfAt(alice, 1);

        vm.expectRevert("ERC20Snapshot: nonexistent snapshot");
        assetToken.totalSupplyAt(1);

        // Create a snapshot
        vm.prank(admin);
        assetToken.snapshot();

        // Should revert for snapshot 0 (invalid)
        vm.expectRevert("ERC20Snapshot: nonexistent snapshot");
        assetToken.balanceOfAt(alice, 0);

        // Should revert for future snapshot
        vm.expectRevert("ERC20Snapshot: nonexistent snapshot");
        assetToken.balanceOfAt(alice, 2);
    }

    function test_SnapshotEventEmission() public {
        // Expect Snapshot event to be emitted
        vm.expectEmit(true, true, true, true);
        emit AssetERC20.Snapshot(1);

        vm.prank(admin);
        assetToken.snapshot();
    }

    function test_InterfaceCompatibility() public {
        // Verify all expected functions exist and return correct types
        vm.prank(admin);
        uint256 snapshotId = assetToken.snapshot();

        // These should compile and execute without errors
        uint256 balance = assetToken.balanceOfAt(alice, snapshotId);
        uint256 supply = assetToken.totalSupplyAt(snapshotId);
        uint256 currentId = assetToken.getCurrentSnapshotId();

        // Basic sanity checks
        assertTrue(balance > 0);
        assertTrue(supply > 0);
        assertEq(currentId, snapshotId);
    }
}