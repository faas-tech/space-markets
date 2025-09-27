// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/*
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║                    🔗 ASSET ERC20 SIMPLE TEST SUITE                         ║
║                                                                              ║
║  This test suite focuses on the core ERC20Votes functionality of our        ║
║  AssetERC20 implementation, specifically testing snapshot and               ║
║  auto-delegation features in isolation.                                     ║
║                                                                              ║
║  📋 Test Focus Areas:                                                        ║
║  ┌──────────────────────────────────────────────────────────────────────┐   ║
║  │  1. Basic Snapshot Creation and ID Management                       │   ║
║  │  2. Historical Balance Queries via Snapshots                        │   ║
║  │  3. Auto-Delegation Mechanics for New Token Holders                 │   ║
║  │  4. Voting Power Tracking and Updates                               │   ║
║  └──────────────────────────────────────────────────────────────────────┘   ║
║                                                                              ║
║  🎯 Key Features Tested:                                                     ║
║  • ERC20Votes checkpoint-based snapshots                                    ║
║  • Automatic delegation upon token receipt                                   ║
║  • Historical balance queries for revenue distribution                       ║
║  • Voting power calculation and delegation tracking                          ║
║  • Block-based checkpoint synchronization                                    ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
*/

import {Test} from "forge-std/Test.sol";
import {AssetERC20} from "../src/AssetERC20.sol";

/// @title AssetERC20SimpleTest
/// @notice Isolated test for AssetERC20 migration verification
contract AssetERC20SimpleTest is Test {
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════

    AssetERC20 public token;         // Our test asset token contract

    // Test accounts with simple addresses for clarity
    address public admin = address(0x1);  // Admin with snapshot permissions
    address public alice = address(0x2);  // Initial token holder
    address public bob = address(0x3);    // Secondary token receiver

    // ═══════════════════════════════════════════════════════════════════════════
    // SETUP FUNCTION
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Deploy a test AssetERC20 token with initial allocation to Alice
    /// @dev Creates token with auto-delegation enabled for seamless governance
    function setUp() public {
        token = new AssetERC20(
            "Test Token",    // Human-readable token name
            "TEST",          // Token symbol
            1,               // Unique asset ID
            admin,           // Admin controls snapshots and roles
            alice,           // Initial owner receives entire supply
            1000e18          // Total supply: 1,000 tokens with 18 decimals
        );
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // TEST FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Test basic snapshot creation and ID management
    /// @dev Verifies snapshot permissions and sequential ID assignment
    function test_BasicSnapshot() public {
        // ┌─────────────────────────────────────────────────────────────────────┐
        // │                         VERIFY INITIAL STATE                       │
        // │                                                                     │
        // │ Before any snapshots are created, the current snapshot ID should   │
        // │ be 0, indicating no snapshots exist yet.                           │
        // └─────────────────────────────────────────────────────────────────────┘

        assertEq(token.getCurrentSnapshotId(), 0, "Initial snapshot ID should be 0");

        // ┌─────────────────────────────────────────────────────────────────────┐
        // │                       CREATE FIRST SNAPSHOT                        │
        // │                                                                     │
        // │ Only addresses with SNAPSHOT_ROLE can create snapshots. In our     │
        // │ case, only the admin has this permission for controlled access.    │
        // └─────────────────────────────────────────────────────────────────────┘

        vm.prank(admin);  // Impersonate admin account
        uint256 snapshotId = token.snapshot();  // Create snapshot

        // ┌─────────────────────────────────────────────────────────────────────┐
        // │                         VERIFY SNAPSHOT CREATED                    │
        // │                                                                     │
        // │ The first snapshot should have ID 1, and the current snapshot ID   │
        // │ should be updated to reflect this new snapshot.                    │
        // └─────────────────────────────────────────────────────────────────────┘

        assertEq(snapshotId, 1, "First snapshot should have ID 1");
        assertEq(token.getCurrentSnapshotId(), 1, "Current snapshot ID should be updated to 1");
    }

    /// @notice Test historical balance queries using snapshots
    /// @dev Demonstrates how snapshots capture balance state for revenue distribution
    function test_SnapshotBalances() public {
        // ┌─────────────────────────────────────────────────────────────────────┐
        // │                    PHASE 1: INITIAL TOKEN TRANSFER                 │
        // │                                                                     │
        // │ Transfer some tokens from Alice to Bob to create different balance │
        // │ states that we can capture in snapshots.                           │
        // └─────────────────────────────────────────────────────────────────────┘

        vm.prank(alice);
        token.transfer(bob, 300e18);  // Alice gives Bob 300 tokens
        // State after transfer: Alice = 700, Bob = 300

        // ┌─────────────────────────────────────────────────────────────────────┐
        // │                      BLOCK ADVANCEMENT FOR CHECKPOINTS             │
        // │                                                                     │
        // │ ERC20Votes uses block-based checkpoints. We need to advance blocks │
        // │ to ensure voting power checkpoints are properly established.       │
        // └─────────────────────────────────────────────────────────────────────┘

        vm.roll(block.number + 1);  // Advance block to establish checkpoints

        // ┌─────────────────────────────────────────────────────────────────────┐
        // │                         CREATE SNAPSHOT                            │
        // │                                                                     │
        // │ This captures the current balance state for future reference.      │
        // │ Snapshots are crucial for pro-rata revenue distribution.           │
        // └─────────────────────────────────────────────────────────────────────┘

        vm.prank(admin);
        uint256 snapshotId = token.snapshot();  // Capture: Alice=700, Bob=300

        // ┌─────────────────────────────────────────────────────────────────────┐
        // │                    PHASE 2: POST-SNAPSHOT TRANSFER                 │
        // │                                                                     │
        // │ Make additional transfers after the snapshot to verify that        │
        // │ historical queries return the captured state, not current state.   │
        // └─────────────────────────────────────────────────────────────────────┘

        vm.roll(block.number + 1);  // Advance block after snapshot

        vm.prank(alice);
        token.transfer(bob, 200e18);  // Alice gives Bob another 200 tokens
        // New state: Alice = 500, Bob = 500

        // ┌─────────────────────────────────────────────────────────────────────┐
        // │                        VERIFY CURRENT BALANCES                     │
        // │                                                                     │
        // │ Current balances should reflect all transfers, including the       │
        // │ post-snapshot transfer.                                             │
        // └─────────────────────────────────────────────────────────────────────┘

        assertEq(token.balanceOf(alice), 500e18, "Alice current balance should be 500");
        assertEq(token.balanceOf(bob), 500e18, "Bob current balance should be 500");

        // ┌─────────────────────────────────────────────────────────────────────┐
        // │                      VERIFY HISTORICAL BALANCES                    │
        // │                                                                     │
        // │ Snapshot balances should reflect the state at snapshot time,       │
        // │ NOT the current state. This is critical for accurate revenue       │
        // │ distribution based on historical ownership.                        │
        // └─────────────────────────────────────────────────────────────────────┘

        assertEq(token.balanceOfAt(alice, snapshotId), 700e18,
                "Alice snapshot balance should be 700 (pre-second transfer)");
        assertEq(token.balanceOfAt(bob, snapshotId), 300e18,
                "Bob snapshot balance should be 300 (pre-second transfer)");

        // ┌─────────────────────────────────────────────────────────────────────┐
        // │                       VERIFY TOTAL SUPPLY SNAPSHOT                 │
        // │                                                                     │
        // │ Total supply should remain constant (no minting/burning), but      │
        // │ the snapshot should correctly capture it for calculations.         │
        // └─────────────────────────────────────────────────────────────────────┘

        assertEq(token.totalSupplyAt(snapshotId), 1000e18,
                "Total supply at snapshot should be unchanged");
    }

    /// @notice Test automatic delegation mechanism for seamless governance
    /// @dev Verifies that token holders are automatically delegated to themselves
    function test_AutoDelegation() public {
        // ┌─────────────────────────────────────────────────────────────────────┐
        // │                      VERIFY INITIAL AUTO-DELEGATION                │
        // │                                                                     │
        // │ When tokens are initially minted to Alice in the constructor,      │
        // │ she should be automatically delegated to herself. This ensures     │
        // │ her voting power equals her token balance immediately.             │
        // └─────────────────────────────────────────────────────────────────────┘

        assertEq(token.delegates(alice), alice,
                "Alice should be auto-delegated to herself");
        assertEq(token.getVotes(alice), 1000e18,
                "Alice voting power should equal her token balance");

        // ┌─────────────────────────────────────────────────────────────────────┐
        // │                   AUTO-DELEGATION FOR NEW TOKEN HOLDERS            │
        // │                                                                     │
        // │ When Bob receives tokens via transfer, he should automatically     │
        // │ be delegated to himself. This seamless delegation ensures voting   │
        // │ power is properly tracked without manual delegation calls.         │
        // └─────────────────────────────────────────────────────────────────────┘

        vm.prank(alice);
        token.transfer(bob, 100e18);  // Alice transfers 100 tokens to Bob

        // ┌─────────────────────────────────────────────────────────────────────┐
        // │                        VERIFY AUTO-DELEGATION RESULTS              │
        // │                                                                     │
        // │ Both Alice and Bob should now be delegated to themselves, and      │
        // │ their voting power should match their respective token balances.   │
        // └─────────────────────────────────────────────────────────────────────┘

        assertEq(token.delegates(bob), bob,
                "Bob should be auto-delegated to himself upon receiving tokens");
        assertEq(token.getVotes(bob), 100e18,
                "Bob's voting power should equal his new token balance");
        assertEq(token.getVotes(alice), 900e18,
                "Alice's voting power should be reduced by transferred amount");

        // 🎯 Key Insight: Auto-delegation eliminates the need for manual
        //    delegation calls, making governance participation frictionless
        //    for token holders in our asset leasing protocol.
    }
}