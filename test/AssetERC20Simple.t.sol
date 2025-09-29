// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/*
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║                      ASSET ERC20 SIMPLE TEST SUITE                          ║
║                                                                              ║
║  This test suite focuses on the core ERC20Votes functionality of our        ║
║  AssetERC20 implementation, specifically testing snapshot and               ║
║  auto-delegation features in isolation.                                     ║
║                                                                              ║
║     Test Focus Areas:                                                        ║
║  ┌──────────────────────────────────────────────────────────────────────┐   ║
║  │  1. Basic Snapshot Creation and ID Management                       │   ║
║  │  2. Historical Balance Queries via Snapshots                        │   ║
║  │  3. Auto-Delegation Mechanics for New Token Holders                 │   ║
║  │  4. Voting Power Tracking and Updates                               │   ║
║  └──────────────────────────────────────────────────────────────────────┘   ║
║                                                                              ║
║     Key Features Tested:                                                     ║
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

        // Key Insight: Auto-delegation eliminates the need for manual
        //    delegation calls, making governance participation frictionless
        //    for token holders in our asset leasing protocol.
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // NEGATIVE TESTS - TESTING FAILURE CONDITIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Test unauthorized snapshot creation attempts
    /// @dev Verifies that only addresses with SNAPSHOT_ROLE can create snapshots
    function test_RevertWhen_UnauthorizedSnapshotCreation() public {
        // Alice (non-admin) tries to create snapshot
        vm.prank(alice);
        vm.expectRevert(); // Should fail due to missing SNAPSHOT_ROLE
        token.snapshot();

        // Bob (non-admin) tries to create snapshot
        vm.prank(bob);
        vm.expectRevert(); // Should fail due to missing SNAPSHOT_ROLE
        token.snapshot();

        // Admin should succeed (for comparison)
        vm.prank(admin);
        uint256 snapshotId = token.snapshot();
        assertEq(snapshotId, 1, "Admin should be able to create snapshots");
    }

    /// @notice Test invalid snapshot ID queries
    /// @dev Verifies that querying non-existent snapshots fails appropriately
    function test_RevertWhen_InvalidSnapshotQueries() public {
        // Query non-existent snapshot before any are created
        vm.expectRevert("ERC20Snapshot: nonexistent snapshot");
        token.balanceOfAt(alice, 1);

        vm.expectRevert("ERC20Snapshot: nonexistent snapshot");
        token.totalSupplyAt(1);

        // Create one valid snapshot
        vm.prank(admin);
        uint256 snapshotId = token.snapshot();
        assertEq(snapshotId, 1, "First snapshot should have ID 1");

        // Query invalid snapshot ID 0
        vm.expectRevert("ERC20Snapshot: nonexistent snapshot");
        token.balanceOfAt(alice, 0);

        // Query future snapshot ID
        vm.expectRevert("ERC20Snapshot: nonexistent snapshot");
        token.balanceOfAt(alice, snapshotId + 1);

        // Query valid snapshot should work
        uint256 balance = token.balanceOfAt(alice, snapshotId);
        assertEq(balance, 1000e18, "Valid snapshot query should succeed");
    }

    /// @notice Test access control bypass attempts
    /// @dev Verifies that role-based access control cannot be bypassed
    function test_RevertWhen_AccessControlBypass() public {
        // Get the SNAPSHOT_ROLE identifier
        bytes32 snapshotRole = token.SNAPSHOT_ROLE();

        // Non-admin tries to grant snapshot role to themselves
        vm.prank(alice);
        vm.expectRevert(); // Should fail - alice doesn't have DEFAULT_ADMIN_ROLE
        token.grantRole(snapshotRole, alice);

        // Non-admin tries to grant snapshot role to someone else
        vm.prank(bob);
        vm.expectRevert(); // Should fail - bob doesn't have DEFAULT_ADMIN_ROLE
        token.grantRole(snapshotRole, alice);

        // Verify alice still cannot create snapshots
        vm.prank(alice);
        vm.expectRevert();
        token.snapshot();
    }

    /// @notice Test zero address operations
    /// @dev Verifies proper handling of zero address in various operations
    function test_RevertWhen_ZeroAddressOperations() public {
        address zeroAddr = address(0);

        // Zero address should have zero balance and voting power
        assertEq(token.balanceOf(zeroAddr), 0, "Zero address should have zero balance");
        assertEq(token.getVotes(zeroAddr), 0, "Zero address should have zero voting power");
        assertEq(token.delegates(zeroAddr), zeroAddr, "Zero address delegates to itself");

        // Create snapshot to test historical queries
        vm.prank(admin);
        uint256 snapshotId = token.snapshot();

        // Zero address historical queries should return zero
        assertEq(token.balanceOfAt(zeroAddr, snapshotId), 0, "Zero address historical balance should be zero");

        // Transfers to zero address should fail (ERC20 standard behavior)
        vm.prank(alice);
        vm.expectRevert(); // OpenZeppelin ERC20 error format may vary
        token.transfer(zeroAddr, 100e18);
    }

    /// @notice Test delegation edge cases
    /// @dev Verifies delegation behavior in edge cases
    function test_DelegationEdgeCases() public {
        // Test self-delegation (which is the default auto-delegation)
        assertEq(token.delegates(alice), alice, "Alice should be auto-delegated to herself");

        // Alice can delegate to Bob
        vm.prank(alice);
        token.delegate(bob);
        assertEq(token.delegates(alice), bob, "Alice should now delegate to Bob");

        // Bob's voting power should increase, Alice's should decrease
        assertEq(token.getVotes(bob), token.balanceOf(alice), "Bob should have Alice's voting power");
        assertEq(token.getVotes(alice), 0, "Alice should have zero voting power after delegating");

        // Alice can delegate back to herself
        vm.prank(alice);
        token.delegate(alice);
        assertEq(token.delegates(alice), alice, "Alice should delegate back to herself");
        assertEq(token.getVotes(alice), token.balanceOf(alice), "Alice should regain her voting power");
    }

    /// @notice Test historical balance consistency
    /// @dev Verifies that snapshot balances remain consistent over time
    function test_SnapshotConsistency() public {
        // Initial state: Alice has 1000 tokens
        assertEq(token.balanceOf(alice), 1000e18, "Alice initial balance");

        // Transfer some tokens to Bob
        vm.prank(alice);
        token.transfer(bob, 300e18);

        // Advance block to establish checkpoints
        vm.roll(2);

        // Create first snapshot
        vm.prank(admin);
        uint256 snapshot1 = token.snapshot();

        // Make more transfers
        vm.prank(alice);
        token.transfer(bob, 200e18);

        // Advance block to establish checkpoints for second transfer
        vm.roll(3);

        // Create second snapshot
        vm.prank(admin);
        uint256 snapshot2 = token.snapshot();

        // Verify snapshot consistency
        assertEq(token.balanceOfAt(alice, snapshot1), 700e18, "Alice balance at snapshot 1");
        assertEq(token.balanceOfAt(bob, snapshot1), 300e18, "Bob balance at snapshot 1");

        assertEq(token.balanceOfAt(alice, snapshot2), 500e18, "Alice balance at snapshot 2");
        assertEq(token.balanceOfAt(bob, snapshot2), 500e18, "Bob balance at snapshot 2");

        // Make more transfers and verify snapshots remain unchanged
        vm.prank(bob);
        token.transfer(alice, 100e18);

        // Previous snapshots should be unaffected
        assertEq(token.balanceOfAt(alice, snapshot1), 700e18, "Alice balance at snapshot 1 unchanged");
        assertEq(token.balanceOfAt(bob, snapshot1), 300e18, "Bob balance at snapshot 1 unchanged");
        assertEq(token.balanceOfAt(alice, snapshot2), 500e18, "Alice balance at snapshot 2 unchanged");
        assertEq(token.balanceOfAt(bob, snapshot2), 500e18, "Bob balance at snapshot 2 unchanged");
    }

    /// @notice Test maximum snapshot scenarios
    /// @dev Tests behavior with multiple snapshots and large numbers
    function test_MultipleSnapshotScenarios() public {
        uint256[] memory snapshots = new uint256[](5);

        // Advance to establish initial checkpoints
        vm.roll(block.number + 1);

        // Create first snapshot with initial state
        vm.prank(admin);
        snapshots[0] = token.snapshot();

        // Create multiple snapshots with different states
        for (uint256 i = 1; i < 5; i++) {
            // Make state changes
            vm.prank(alice);
            token.transfer(bob, 50e18 * i);
            // Advance block to establish checkpoints
            vm.roll(block.number + 1);

            // Create snapshot
            vm.prank(admin);
            snapshots[i] = token.snapshot();

            // Verify snapshot ID increments
            assertEq(snapshots[i], i + 1, "Snapshot ID should increment sequentially");
        }

        // Calculate expected balances based on cumulative transfers
        // Snapshot 0: Initial 1000, no transfers yet
        // Snapshot 1: Transferred 50*1 = 50, Alice has 950
        // Snapshot 2: Transferred 50*2 = 100 more, Alice has 850 (cumulative 150)
        // Snapshot 3: Transferred 50*3 = 150 more, Alice has 700 (cumulative 300)
        // Snapshot 4: Transferred 50*4 = 200 more, Alice has 500 (cumulative 500)
        assertEq(token.balanceOfAt(alice, snapshots[0]), 1000e18, "Snapshot 0: Alice balance");
        assertEq(token.balanceOfAt(alice, snapshots[1]), 950e18, "Snapshot 1: Alice balance");
        assertEq(token.balanceOfAt(alice, snapshots[2]), 850e18, "Snapshot 2: Alice balance");
        assertEq(token.balanceOfAt(alice, snapshots[3]), 700e18, "Snapshot 3: Alice balance");
        assertEq(token.balanceOfAt(alice, snapshots[4]), 500e18, "Snapshot 4: Alice balance");

        // Verify total supply remains constant across all snapshots
        for (uint256 i = 0; i < 5; i++) {
            assertEq(token.totalSupplyAt(snapshots[i]), 1000e18, "Total supply should be constant");
        }
    }

    /// @notice Test role management restrictions
    /// @dev Verifies that role management is properly restricted
    function test_RevertWhen_UnauthorizedRoleManagement() public {
        bytes32 snapshotRole = token.SNAPSHOT_ROLE();
        bytes32 adminRole = token.DEFAULT_ADMIN_ROLE();

        // Non-admin cannot grant roles
        vm.prank(alice);
        vm.expectRevert(); // Should fail - missing admin role
        token.grantRole(snapshotRole, alice);

        // Non-admin cannot revoke roles
        vm.prank(alice);
        vm.expectRevert(); // Should fail - missing admin role
        token.revokeRole(snapshotRole, admin);

        // Non-admin cannot renounce admin role of others
        vm.prank(alice);
        vm.expectRevert(); // Should fail - can only renounce own roles
        token.renounceRole(adminRole, admin);

        // Verify admin still has role and can create snapshots
        assertTrue(token.hasRole(snapshotRole, admin), "Admin should still have snapshot role");
        vm.prank(admin);
        uint256 snapshotId = token.snapshot();
        assertTrue(snapshotId > 0, "Admin should still be able to create snapshots");
    }

    /// @notice Test transfer edge cases that could affect snapshots
    /// @dev Verifies that edge case transfers work correctly with snapshot system
    function test_TransferEdgeCases() public {
        // Advance block to ensure initial token distribution is checkpointed
        vm.roll(2);

        // Test transfer of zero amount (should succeed but not change balances)
        uint256 aliceBalanceBefore = token.balanceOf(alice);
        uint256 bobBalanceBefore = token.balanceOf(bob);

        vm.prank(alice);
        token.transfer(bob, 0);

        assertEq(token.balanceOf(alice), aliceBalanceBefore, "Alice balance unchanged after zero transfer");
        assertEq(token.balanceOf(bob), bobBalanceBefore, "Bob balance unchanged after zero transfer");

        // Test transfer of maximum balance
        vm.prank(alice);
        token.transfer(bob, 1000e18); // Transfer all tokens (known amount from setup)

        assertEq(token.balanceOf(alice), 0, "Alice should have zero balance after transferring all");
        assertEq(token.balanceOf(bob), 1000e18, "Bob should have all tokens");

        // Test transfer when sender has zero balance
        vm.prank(alice);
        vm.expectRevert(); // Should fail due to insufficient balance
        token.transfer(bob, 1);
    }

    /// @notice Test snapshot creation in edge scenarios
    /// @dev Verifies snapshot creation works in various edge cases
    function test_SnapshotCreationEdgeCases() public {
        // Advance block to ensure initial token distribution is checkpointed
        vm.roll(2);

        // Create snapshot when all tokens are with initial holder
        vm.prank(admin);
        uint256 snapshot1 = token.snapshot();

        // Create snapshot when tokens are distributed
        vm.prank(alice);
        token.transfer(bob, 500e18);

        // Advance block to establish checkpoints
        vm.roll(3);

        vm.prank(admin);
        uint256 snapshot2 = token.snapshot();

        // Create snapshot when all tokens are with one non-initial holder
        vm.prank(alice);
        token.transfer(bob, 500e18);

        // Advance block to establish checkpoints
        vm.roll(4);

        vm.prank(admin);
        uint256 snapshot3 = token.snapshot();

        // Verify all snapshots captured correct states
        assertEq(token.balanceOfAt(alice, snapshot1), 1000e18, "Snapshot 1: All tokens with Alice");
        assertEq(token.balanceOfAt(alice, snapshot2), 500e18, "Snapshot 2: Equal distribution");
        assertEq(token.balanceOfAt(alice, snapshot3), 0, "Snapshot 3: All tokens with Bob");

        assertEq(token.balanceOfAt(bob, snapshot1), 0, "Snapshot 1: Bob has no tokens");
        assertEq(token.balanceOfAt(bob, snapshot2), 500e18, "Snapshot 2: Bob has half");
        assertEq(token.balanceOfAt(bob, snapshot3), 1000e18, "Snapshot 3: Bob has all tokens");
    }
}