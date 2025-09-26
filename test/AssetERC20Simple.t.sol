// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Test} from "forge-std/Test.sol";
import {AssetERC20} from "../src/AssetERC20.sol";

/// @title AssetERC20SimpleTest
/// @notice Isolated test for AssetERC20 migration verification
contract AssetERC20SimpleTest is Test {
    AssetERC20 public token;

    address public admin = address(0x1);
    address public alice = address(0x2);
    address public bob = address(0x3);

    function setUp() public {
        token = new AssetERC20(
            "Test Token",
            "TEST",
            1, // assetId
            admin,
            alice, // initial owner gets all supply
            1000e18 // total supply
        );
    }

    function test_BasicSnapshot() public {
        // Check initial state
        assertEq(token.getCurrentSnapshotId(), 0);

        // Only admin can create snapshot
        vm.prank(admin);
        uint256 snapshotId = token.snapshot();

        assertEq(snapshotId, 1);
        assertEq(token.getCurrentSnapshotId(), 1);
    }

    function test_SnapshotBalances() public {
        // Transfer some tokens to bob
        vm.prank(alice);
        token.transfer(bob, 300e18);

        // Advance to next block to ensure voting checkpoints are established
        vm.roll(block.number + 1);

        // Create snapshot
        vm.prank(admin);
        uint256 snapshotId = token.snapshot();

        // Advance to next block after snapshot
        vm.roll(block.number + 1);

        // Transfer more tokens after snapshot
        vm.prank(alice);
        token.transfer(bob, 200e18);

        // Check current balances
        assertEq(token.balanceOf(alice), 500e18);
        assertEq(token.balanceOf(bob), 500e18);

        // Check snapshot balances
        assertEq(token.balanceOfAt(alice, snapshotId), 700e18);
        assertEq(token.balanceOfAt(bob, snapshotId), 300e18);

        // Check total supply at snapshot
        assertEq(token.totalSupplyAt(snapshotId), 1000e18);
    }

    function test_AutoDelegation() public {
        // Alice should be auto-delegated from constructor
        assertEq(token.delegates(alice), alice);
        assertEq(token.getVotes(alice), 1000e18);

        // Bob should get auto-delegated when receiving tokens
        vm.prank(alice);
        token.transfer(bob, 100e18);

        assertEq(token.delegates(bob), bob);
        assertEq(token.getVotes(bob), 100e18);
        assertEq(token.getVotes(alice), 900e18);
    }
}