// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/*
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║                      🏪 MARKETPLACE FLOW TEST SUITE                         ║
║                                                                              ║
║  This test suite demonstrates the complete marketplace functionality         ║
║  including sales, leases, and revenue distribution mechanisms.              ║
║                                                                              ║
║  📋 Test Flow Overview:                                                      ║
║  ┌──────────────────────────────────────────────────────────────────────┐   ║
║  │  1. Deploy Asset & Setup Marketplace Permissions                    │   ║
║  │  2. Conduct Token Sales with Multiple Bidders                       │   ║
║  │  3. Execute Lease Creation with Escrow                               │   ║
║  │  4. Process Revenue Distribution via Snapshots                      │   ║
║  │  5. Verify Pro-Rata Claims by Token Holders                         │   ║
║  └──────────────────────────────────────────────────────────────────────┘   ║
║                                                                              ║
║  🎯 Key Features Tested:                                                     ║
║  • Fractional asset sales with competitive bidding                          ║
║  • Lease creation with dual signatures and escrow                           ║
║  • Automatic balance snapshots at lease execution                           ║
║  • Pro-rata revenue distribution based on ownership percentages             ║
║  • Multiple currency support (stablecoin payments)                          ║
║  • Marketplace permission and role management                               ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
*/

import "forge-std/Test.sol";
import "../src/AssetRegistry.sol";
import "../src/AssetERC20.sol";
import "../src/LeaseFactory.sol";
import "../src/Marketplace.sol";
import "../test/mocks/MockStablecoin.sol";
import "../src/interfaces/IAssetRegistry.sol";

contract MarketplaceFlowTest is Test {
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════

    AssetRegistry registry;          // Core registry for asset management
    LeaseFactory leaseFactory;       // Factory for creating lease NFTs
    Marketplace market;              // Central marketplace for sales and leases
    MockStablecoin mUSD;            // Test stablecoin for payments (6 decimals)

    // Test account private keys (for EIP-712 signature generation)
    uint256 pkAdmin  = 0xA11CE;     // Admin controls all contracts
    uint256 pkSeller = 0xB0B;       // Asset seller/lessor
    uint256 pkA      = 0xC01;       // First buyer/bidder
    uint256 pkB      = 0xC02;       // Second buyer/bidder

    // Corresponding addresses derived from private keys
    address admin;
    address seller;
    address addrA;
    address addrB;

    // ═══════════════════════════════════════════════════════════════════════════
    // SETUP FUNCTION
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Initializes the complete marketplace test environment
    /// @dev Deploys all protocol contracts with proper interconnections
    function setUp() public {
        // Convert private keys to addresses for test accounts
        admin  = vm.addr(pkAdmin);
        seller = vm.addr(pkSeller);
        addrA  = vm.addr(pkA);
        addrB  = vm.addr(pkB);

        // Deploy all protocol contracts as admin
        vm.startPrank(admin);
        registry     = new AssetRegistry(admin);
        leaseFactory = new LeaseFactory(admin, address(registry));
        mUSD         = new MockStablecoin();                              // 6-decimal stablecoin
        market       = new Marketplace(admin, address(mUSD), address(leaseFactory));
        vm.stopPrank();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // HELPER FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Helper function to deploy a test asset with marketplace permissions
    /// @dev Creates a satellite asset type, registers an instance, and grants snapshot role
    /// @return assetId The unique identifier for the created asset
    /// @return tokenAddr The address of the deployed ERC20 token contract
    /// @return schemaHash The hash of the asset type schema
    function _deployAsset() internal returns (uint256 assetId, address tokenAddr, bytes32 schemaHash) {
        vm.startPrank(admin);

        // Create asset type with schema and required lease fields
        schemaHash = keccak256("schema");
        bytes32[] memory reqKeys = new bytes32[](1);
        reqKeys[0] = keccak256("lease.start_time");     // Require start time for leases
        uint256 typeId = registry.createAssetType("Satellite", schemaHash, reqKeys, "ipfs://schema");

        // Register specific asset instance (deploys dedicated ERC20)
        (assetId, tokenAddr) = registry.registerAsset(
            typeId,              // Links to satellite asset type
            seller,              // Initial owner receives all tokens
            keccak256("meta"),   // Asset metadata hash
            "ipfs://sat",        // Asset metadata URI
            "SatelliteOne",      // ERC20 token name
            "SAT1",              // ERC20 token symbol
            1e18                // Total supply (1 token, 18 decimals)
        );

        // 🔑 CRITICAL: Grant marketplace the snapshot role for revenue distribution
        // Without this, the marketplace cannot create snapshots for pro-rata calculations
        AssetERC20(tokenAddr).grantRole(AssetERC20(tokenAddr).SNAPSHOT_ROLE(), address(market));

        vm.stopPrank();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // MAIN TEST FUNCTION
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Complete end-to-end test of marketplace sales, leases, and revenue distribution
    /// @dev Tests the full workflow: Asset Sales → Lease Creation → Revenue Claims
    function test_Sales_Leases_RevenueFlow() public {
        // Deploy our test asset and get the token contract
        (uint256 assetId, address tokenAddr, bytes32 schemaHash) = _deployAsset();
        AssetERC20 sat = AssetERC20(tokenAddr);

        // ┌─────────────────────────────────────────────────────────────────────┐
        // │                           PHASE 1: TOKEN SALES                     │
        // │                                                                     │
        // │ Demonstrate fractional asset sales through the marketplace.        │
        // │ Multiple buyers compete for asset tokens through a bidding system. │
        // └─────────────────────────────────────────────────────────────────────┘

        // 💰 Fund potential buyers with stablecoin for purchases
        // Note: mUSD uses 6 decimals, so we need enough to cover token costs
        mUSD.mint(addrA, 1e24);  // Give addrA plenty of mUSD
        mUSD.mint(addrB, 1e24);  // Give addrB plenty of mUSD

        // 📝 Seller posts a sale offering 0.5 tokens (50% of the asset)
        vm.prank(seller);
        uint256 saleId = market.postSale(
            tokenAddr,   // Which token to sell
            5e17,        // Amount: 0.5 tokens (50% of 1e18 total supply)
            1_000_000    // Asking price: 1.0 mUSD per full token (1M micro-mUSD)
        );

        // 🏷️ Buyer A places bid for 0.2 tokens at competitive price
        vm.startPrank(addrA);
        mUSD.approve(address(market), type(uint256).max);  // Approve marketplace to spend
        uint256 bidA = market.placeSaleBid(
            saleId,  // Which sale to bid on
            2e17,    // Amount: 0.2 tokens (20% ownership)
            500_000  // Price: 0.5 mUSD per full token (500K micro-mUSD)
        );
        vm.stopPrank();

        // 🏷️ Buyer B places higher bid for 0.3 tokens
        vm.startPrank(addrB);
        mUSD.approve(address(market), type(uint256).max);  // Approve marketplace to spend
        uint256 bidB = market.placeSaleBid(
            saleId,  // Same sale
            3e17,    // Amount: 0.3 tokens (30% ownership)
            800_000  // Price: 0.8 mUSD per full token (800K micro-mUSD)
        );
        vm.stopPrank();

        // ✅ Seller accepts the higher bid from buyer B
        vm.prank(seller);
        sat.approve(address(market), 5e17);  // Approve marketplace to transfer tokens

        vm.prank(seller);
        market.acceptSaleBid(saleId, bidB);  // Accept bid B (higher price)

        // Verify the sale completed correctly
        assertEq(sat.balanceOf(addrB), 3e17, "Buyer B should receive 0.3 tokens");
        // Note: Buyer A is automatically refunded their escrowed funds

        // ┌─────────────────────────────────────────────────────────────────────┐
        // │                         PHASE 2: LEASE CREATION                    │
        // │                                                                     │
        // │ Create a lease agreement using dual signatures and escrow the      │
        // │ lease payment. This triggers a snapshot for revenue distribution.  │
        // └─────────────────────────────────────────────────────────────────────┘

        // Retrieve asset metadata for lease validation
        AssetRegistry.Asset memory A = registry.getAsset(assetId);
        AssetRegistry.AssetType memory T = registry.getType(A.typeId);

        // 📋 Construct the lease intent with all terms
        LeaseFactory.LeaseIntent memory L = LeaseFactory.LeaseIntent({
            lessor: seller,                               // Asset owner leasing out
            lessee: addrA,                               // Buyer A becomes the lessee
            assetId: assetId,                            // Which asset to lease
            paymentToken: address(mUSD),                 // Payment in stablecoin
            rentAmount: 100,                             // 100 micro-mUSD rent
            rentPeriod: 30 days,                         // Monthly payments
            securityDeposit: 500,                        // 500 micro-mUSD deposit
            startTime: uint64(block.timestamp + 1 days), // Lease starts tomorrow
            endTime: uint64(block.timestamp + 90 days),  // 3-month lease
            metadataHash: keccak256("leaseMeta"),        // Lease metadata hash
            legalDocHash: keccak256("leaseDoc"),         // Legal documents hash
            nonce: 77,                                   // Unique nonce
            deadline: uint64(block.timestamp + 3 days),  // Signature expiry
            termsVersion: uint16(1),                     // Terms version
            assetTypeSchemaHash: T.schemaHash           // Links to asset schema
        });

        // 📝 Post lease offer (lessor creates offer with lessee TBD)
        LeaseFactory.LeaseIntent memory LO = L;
        LO.lessee = address(0);  // Lessee will be filled in when bid is accepted

        vm.prank(seller);
        uint256 offerId = market.postLeaseOffer(LO);

        // 💰 Fund lessee A with additional mUSD for lease payments
        mUSD.mint(addrA, 50_000_000);  // Additional 50 mUSD for lease costs
        vm.startPrank(addrA);
        mUSD.approve(address(market), type(uint256).max);

        // 🖊️ Create final lease intent that matches marketplace validation
        // The marketplace will take the stored offer (with lessee = address(0)) and set lessee = bidder
        // So we need to sign a LeaseIntent that matches this final structure
        LeaseFactory.LeaseIntent memory finalL = L;
        finalL.lessee = addrA;  // This will match what marketplace sets as b.bidder

        // Generate signatures for the final LeaseIntent structure that will be validated
        bytes32 digest = leaseFactory.hashLeaseIntent(finalL);

        // Lessee A signs the final lease intent
        (uint8 vA, bytes32 rA, bytes32 sA) = vm.sign(pkA, digest);
        bytes memory sigLessee = abi.encodePacked(rA, sA, vA);

        uint256 bidIdx = market.placeLeaseBid(
            offerId,      // Which lease offer
            sigLessee,    // Lessee's signature
            10_000_000    // Escrow amount: 10 mUSD (covers rent + deposit)
        );
        vm.stopPrank();

        // 🖊️ Lessor signs the same final lease intent to complete the agreement
        (uint8 vL, bytes32 rL, bytes32 sL) = vm.sign(pkSeller, digest);
        bytes memory sigLessor = abi.encodePacked(rL, sL, vL);

        // ✅ Accept the lease bid, creating the lease NFT and triggering snapshot
        vm.prank(seller);
        (uint256 leaseId, uint256 roundId) = market.acceptLeaseBid(
            offerId,        // Which offer to accept
            bidIdx,         // Which bid to accept
            sigLessor,      // Lessor's signature
            "ipfs://lease"  // Lease NFT metadata
        );

        // Verify lease was created successfully
        (,,,,,,,,,,,,, bool exists) = leaseFactory.leases(leaseId);
        assertTrue(exists, "Lease should exist in storage");

        // ┌─────────────────────────────────────────────────────────────────────┐
        // │                       PHASE 3: REVENUE DISTRIBUTION                │
        // │                                                                     │
        // │ Process pro-rata revenue claims based on token ownership at the    │
        // │ snapshot moment. Revenue is distributed proportionally to all      │
        // │ token holders based on their ownership percentage.                 │
        // └─────────────────────────────────────────────────────────────────────┘

        // 📊 Calculate expected distribution based on ownership at snapshot:
        // At snapshot time (when lease was accepted):
        // - Seller: Started with 1e18, sold 3e17 → 7e17 remaining (70%)
        // - AddrB: Bought 3e17 → 3e17 holdings (30%)
        // - AddrA: Bought 0 tokens → 0 holdings (0%)
        // Total supply: 1e18 (100%)
        //
        // Revenue to distribute: 10_000_000 micro-mUSD
        // - Seller gets: 10M × (7e17/1e18) = 7_000_000 micro-mUSD
        // - AddrB gets: 10M × (3e17/1e18) = 3_000_000 micro-mUSD
        // - AddrA gets: 10M × (0/1e18) = 0 micro-mUSD

        // Record balances before revenue claims to verify the deltas
        uint256 sellerBalanceBefore = mUSD.balanceOf(seller);
        uint256 buyerBBalanceBefore = mUSD.balanceOf(addrB);

        // 💰 Seller claims their pro-rata share of lease revenue
        vm.prank(seller);
        market.claimRevenue(roundId);

        // 💰 Buyer B claims their pro-rata share of lease revenue
        vm.prank(addrB);
        market.claimRevenue(roundId);

        // ✅ Verify revenue distribution matches ownership percentages
        uint256 sellerRevenue = mUSD.balanceOf(seller) - sellerBalanceBefore;
        uint256 buyerBRevenue = mUSD.balanceOf(addrB) - buyerBBalanceBefore;

        assertEq(sellerRevenue, 7_000_000, "Seller should receive 70% of revenue (7M micro-mUSD)");
        assertEq(buyerBRevenue, 3_000_000, "Buyer B should receive 30% of revenue (3M micro-mUSD)");

        // 🎉 SUCCESS! We've demonstrated the complete marketplace flow:
        //    ✅ Fractional asset sales with competitive bidding
        //    ✅ Lease creation with dual signatures and escrow
        //    ✅ Automatic balance snapshots at lease execution
        //    ✅ Pro-rata revenue distribution to all token holders
        //    ✅ Seamless integration between sales and lease mechanisms
    }
}
